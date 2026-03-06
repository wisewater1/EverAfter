from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.finance_service import FinanceService
from app.services.chainlink_service import ChainlinkService

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])

# Pydantic Schemas
class CCIPBridgeRequest(BaseModel):
    destination_chain: str
    destination_address: str
    amount: float

class TransactionCreate(BaseModel):
    date: date
    payee: str
    amount: float
    category_id: UUID
    description: str = None
    is_cleared: bool = False

class TransactionResponse(TransactionCreate):
    id: UUID
    created_at: datetime
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

# Endpoints

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

@router.get("/wisegold/price")
async def get_wisegold_price():
    """Get the live XAU/USD price from Chainlink Data Feeds"""
    price = await ChainlinkService.get_latest_xau_usd_price()
    return {"xau_usd_price": price, "timestamp": datetime.utcnow().isoformat()}

@router.post("/wisegold/bridge/ccip")
async def bridge_wisegold_ccip(
    request: CCIPBridgeRequest,
    current_user: dict = Depends(get_current_user)
):
    """Initiate a Cross-Chain transfer of WGOLD using Chainlink CCIP"""
    user_id = str(current_user.get("sub"))
    
    # In a full implementation, this step would first check the user's WGOLD balance
    # and lock/burn tokens on Solana before initiating the CCIP message.
    
    result = await ChainlinkService.initiate_ccip_transfer(
        user_id=user_id,
        amount=request.amount,
        destination_chain=request.destination_chain,
        destination_address=request.destination_address
    )
    
    return result


