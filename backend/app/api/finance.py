from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from typing import List, Dict, Any
from pydantic import BaseModel
from datetime import date, datetime
from uuid import UUID

from app.db.session import get_async_session
from app.auth.dependencies import get_current_user
from app.services.finance_service import FinanceService

router = APIRouter(prefix="/api/v1/finance", tags=["finance"])

# Pydantic Schemas
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

