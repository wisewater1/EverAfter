from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any, Optional
from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.finance_service import FinanceService
from app.services.chainlink_service import ChainlinkService
from app.services.treasury_analyst_service import TreasuryAnalystService
from app.core.config import settings

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])

# Pydantic Schemas
class CCIPBridgeRequest(BaseModel):
    destination_chain: str
    destination_address: str
    amount: float

class TransactionCategoryResponse(BaseModel):
    name: str
    group: str


class TransactionBase(BaseModel):
    date: date
    payee: str
    amount: float
    category_id: Optional[UUID] = None
    description: Optional[str] = None
    is_cleared: bool = False


class TransactionCreate(TransactionBase):
    pass


class TransactionResponse(TransactionBase):
    id: UUID
    created_at: datetime
    category: Optional[TransactionCategoryResponse] = None
    source: str = "manual"
    account_name: Optional[str] = None
    account_mask: Optional[str] = None
    institution_name: Optional[str] = None
    pending: bool = False

    class Config:
        from_attributes = True


class TransferRequest(BaseModel):
    from_category_id: UUID
    to_category_id: UUID
    amount: float
    month: str  # YYYY-MM

class EnvelopeSummary(BaseModel):
    id: UUID
    category_id: UUID
    category_name: str
    group: str
    month: str
    assigned: float
    activity: float
    available: float


class CovenantAmountRequest(BaseModel):
    amount: float


class WiseGoldPolicyEvaluateRequest(BaseModel):
    action: str
    amount: float = 0.0
    covenant_id: Optional[UUID] = None
    destination_chain: Optional[str] = None


class BankPublicTokenExchangeRequest(BaseModel):
    public_token: str
    institution_id: Optional[str] = None
    institution_name: Optional[str] = None


def _require_oracle_key(x_wisegold_oracle_key: Optional[str]) -> None:
    configured_key = settings.WISEGOLD_ORACLE_API_KEY.strip()
    if not configured_key:
        raise HTTPException(status_code=503, detail="WISEGOLD_ORACLE_API_KEY is not configured")
    if not x_wisegold_oracle_key or x_wisegold_oracle_key != configured_key:
        raise HTTPException(status_code=401, detail="Invalid oracle credentials")

# Endpoints


@router.get("/bank/status")
async def get_bank_connection_status(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_bank_connection_status(user_id)


@router.post("/bank/link-token")
async def create_bank_link_token(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        return await service.create_bank_link_token(user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/bank/exchange")
async def exchange_bank_public_token(
    request: BankPublicTokenExchangeRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        return await service.exchange_bank_public_token(
            user_id,
            public_token=request.public_token,
            institution_id=request.institution_id,
            institution_name=request.institution_name,
        )
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))


@router.post("/bank/sync")
async def sync_bank_transactions(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        return await service.sync_bank_connections(user_id)
    except Exception as exc:
        raise HTTPException(status_code=400, detail=str(exc))

@router.get("/budget", response_model=List[EnvelopeSummary])
async def get_budget(
    month: str = None,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """
    Get the full envelope budget summary for a request month.
    Defaults to current month if not specified.
    """
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    
    summary = await service.get_budget_summary(user_id, month)
    
    # Transform dicts to Pydantic models (or let FastAPI do it if shape matches)
    # The service returns dicts that match the schema
    return summary

@router.post("/transactions", response_model=TransactionResponse)
async def create_transaction(
    tx_data: TransactionCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Record a new transaction"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    
    # Convert Pydantic model to dict
    tx = await service.add_transaction(user_id, tx_data.dict())
    return tx


@router.get("/transactions", response_model=List[TransactionResponse])
async def list_transactions(
    limit: int = 50,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """List recent transactions"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_transactions(user_id, limit)


@router.get("/treasury/summary")
async def get_treasury_summary(
    months: int = 3,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session),
):
    """Get St. Gabriel treasury analysis grounded in the user's real finance data."""
    user_id = str(current_user.get("sub"))
    service = TreasuryAnalystService(session)
    return await service.build_snapshot(user_id, months=months)

@router.post("/budget/transfer")
async def transfer_funds(
    transfer: TransferRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Move funds between budget envelopes"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    
    try:
        await service.transfer_funds(
            user_id, 
            transfer.from_category_id, 
            transfer.to_category_id, 
            transfer.amount,
            transfer.month
        )
        return {"success": True}
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


class EnvelopeUpdate(BaseModel):
    assigned: float

@router.patch("/budget/envelopes/{envelope_id}")
async def update_envelope(
    envelope_id: UUID,
    update_data: EnvelopeUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update budget envelope assigned amount"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    
    try:
        updated_envelope = await service.update_envelope(user_id, envelope_id, update_data.assigned)
        return updated_envelope
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))


class CategoryCreate(BaseModel):
    name: str
    group: str

class CategoryUpdate(BaseModel):
    name: str = None
    is_hidden: bool = None

@router.post("/budget/categories")
async def create_category(
    category_data: CategoryCreate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Create a new budget category"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.create_category(user_id, category_data.name, category_data.group)

@router.patch("/budget/categories/{category_id}")
async def update_category(
    category_id: UUID,
    category_data: CategoryUpdate,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Update a budget category (rename or hide)"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.update_category(user_id, category_id, category_data.dict(exclude_unset=True))

# ══════════════════════════════════════════════════════════════════════════════
# WiseGold Sovereign 3.0 Endpoints
# ══════════════════════════════════════════════════════════════════════════════

@router.get("/wisegold/wallet")
async def get_wisegold_wallet_info(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all core WiseGold wallet info (Balance, NFT, Living Will)"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_wisegold_wallet(user_id)
    
@router.get("/wisegold/covenants")
async def get_wisegold_covenants(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get all Sovereign Covenants the user is part of"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_wisegold_covenants(user_id)


@router.get("/wisegold/ledger")
async def get_wisegold_ledger(
    limit: int = 12,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get recent WiseGold ledger activity for the authenticated wallet."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_recent_wisegold_ledger(user_id, limit)


@router.get("/wisegold/social-standing")
async def get_wisegold_social_standing(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get the authenticated user's current social standing for WiseGold emissions."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_wisegold_social_standing(user_id)


@router.get("/wisegold/attestations")
async def get_wisegold_attestations(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get active and historical covenant attestations for the authenticated member."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_wisegold_attestations(user_id)


@router.post("/wisegold/attestations/sync")
async def sync_wisegold_attestations(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Refresh backend-issued covenant attestations from covenant membership state."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    attestations = await service.get_wisegold_attestations(user_id)
    return {"success": True, "count": len(attestations), "attestations": attestations}


@router.get("/wisegold/policy/summary")
async def get_wisegold_policy_summary(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Get Gabriel-facing WiseGold policy state, limits, and allow/deny explanations."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.get_wisegold_policy_summary(user_id)


@router.post("/wisegold/policy/evaluate")
async def evaluate_wisegold_policy(
    request: WiseGoldPolicyEvaluateRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Evaluate a prospective WGOLD action against current attestation and treasury policy."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    return await service.evaluate_wisegold_policy(
        user_id,
        action=request.action,
        amount=request.amount,
        covenant_id=request.covenant_id,
        destination_chain=request.destination_chain,
    )


@router.get("/wisegold/oracle/reputation/{user_id}")
async def get_wisegold_oracle_reputation(
    user_id: str,
    wallet_address: Optional[str] = None,
    x_wisegold_oracle_key: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    """
    Chainlink Functions-safe reputation endpoint.
    Protect it with a backend oracle key rather than end-user auth.
    """
    _require_oracle_key(x_wisegold_oracle_key)
    service = FinanceService(session)
    snapshot = await service.get_wisegold_social_standing(user_id, wallet_address=wallet_address)
    return {
        "user_id": user_id,
        "wallet_address": wallet_address,
        "reputation_bps": snapshot["reputation_bps"],
        "daily_manna_multiplier_bps": snapshot["daily_manna_multiplier_bps"],
        "governance_weight_bps": snapshot["governance_weight_bps"],
        "tier": snapshot["tier"],
        "last_calculated_at": snapshot["last_calculated_at"],
    }


@router.get("/wisegold/oracle/policy-global")
async def get_wisegold_oracle_global_policy(
    x_wisegold_oracle_key: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    """Chainlink-safe treasury policy snapshot used for onchain controller sync."""
    _require_oracle_key(x_wisegold_oracle_key)
    service = FinanceService(session)
    return await service.get_wisegold_global_policy()


@router.get("/wisegold/oracle/policy/{user_id}")
async def get_wisegold_oracle_policy(
    user_id: str,
    x_wisegold_oracle_key: Optional[str] = Header(default=None),
    session: AsyncSession = Depends(get_async_session),
):
    """Chainlink Functions-safe policy endpoint for action limits and attestation state."""
    _require_oracle_key(x_wisegold_oracle_key)
    service = FinanceService(session)
    return await service.get_wisegold_policy_summary(user_id)
    
@router.post("/wisegold/heartbeat")
async def register_heartbeat(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Register a proof-of-life heartbeat"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    success = await service.record_heartbeat(user_id)
    return {"success": success}


@router.post("/wisegold/tick")
async def run_wisegold_tick(
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Manually run the WiseGold engine tick in non-production environments."""
    if settings.is_production:
        raise HTTPException(status_code=403, detail="Manual WiseGold tick is disabled in production")

    service = FinanceService(session)
    return await service.run_wisegold_tick()

@router.get("/wisegold/price")
async def get_wisegold_price():
    """Get the live XAU/USD price from Chainlink Data Feeds"""
    price = await ChainlinkService.get_latest_xau_usd_price()
    return {"xau_usd_price": price, "timestamp": datetime.utcnow().isoformat()}

@router.post("/wisegold/bridge/ccip")
async def bridge_wisegold_ccip(
    request: CCIPBridgeRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Initiate a Cross-Chain transfer of WGOLD using Chainlink CCIP"""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        await service.record_bridge_transfer(
            user_id,
            amount=request.amount,
            destination_chain=request.destination_chain,
            destination_address=request.destination_address,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    result = await ChainlinkService.initiate_ccip_transfer(
        user_id=user_id,
        amount=request.amount,
        destination_chain=request.destination_chain,
        destination_address=request.destination_address
    )

    return {
        **result,
        "status": result.get("status", "submitted"),
    }


@router.post("/wisegold/covenants/{covenant_id}/deposit")
async def deposit_into_covenant(
    covenant_id: UUID,
    request: CovenantAmountRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Deposit WGOLD into a covenant vault."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        return await service.deposit_into_covenant(user_id, covenant_id, request.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/wisegold/covenants/{covenant_id}/withdraw")
async def withdraw_from_covenant(
    covenant_id: UUID,
    request: CovenantAmountRequest,
    current_user: dict = Depends(get_current_user),
    session: AsyncSession = Depends(get_async_session)
):
    """Withdraw or request withdrawal from a covenant vault."""
    user_id = str(current_user.get("sub"))
    service = FinanceService(session)
    try:
        return await service.withdraw_from_covenant(user_id, covenant_id, request.amount)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


