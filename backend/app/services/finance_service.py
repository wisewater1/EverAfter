"""
St. Gabriel Finance Service

Handles detailed business logic for the Envelope Budgeting system.
"""

from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func, and_
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import datetime
import calendar

from app.models.finance import BudgetCategory, BudgetEnvelope, Transaction

class FinanceService:
    def __init__(self, session: AsyncSession):
        self.session = session

    async def create_category(self, user_id: str, name: str, group: str) -> BudgetCategory:
        """Create a new budget category."""
        category = BudgetCategory(user_id=user_id, name=name, group=group)
        self.session.add(category)
        await self.session.commit()
        await self.session.refresh(category)
        return category

    async def update_category(self, user_id: str, category_id: UUID, data: dict) -> BudgetCategory:
        """Update an existing category."""
        stmt = select(BudgetCategory).where(
            and_(
                BudgetCategory.id == category_id,
                BudgetCategory.user_id == user_id
            )
        )
        result = await self.session.execute(stmt)
        category = result.scalar_one_or_none()
        
        if not category:
            raise ValueError("Category not found")
            
        for key, value in data.items():
            setattr(category, key, value)
            
        await self.session.commit()
        await self.session.refresh(category)
        return category

    async def get_categories(self, user_id: str) -> List[BudgetCategory]:
        """Fetch all visible budget categories for the user."""
        stmt = select(BudgetCategory).where(
            and_(
                BudgetCategory.user_id == user_id,
                BudgetCategory.is_hidden == False
            )
        )
        result = await self.session.execute(stmt)
        return result.scalars().all()

    async def get_budget_summary(self, user_id: str, month: str = None) -> List[Dict[str, Any]]:
        """
        Get the full budget summary for a specific month.
        Calculates activity dynamically from transactions.
        """
        if not month:
            month = datetime.utcnow().strftime("%Y-%m")

        # 1. Get Categories
        categories = await self.get_categories(user_id)
        if not categories:
            # Seed default categories if none exist
            await self._seed_default_categories(user_id)
            categories = await self.get_categories(user_id)

        # 2. Get Envelopes for this month
        stmt_env = select(BudgetEnvelope).where(
            BudgetEnvelope.month == month
        )
        result_env = await self.session.execute(stmt_env)
        envelopes = {e.category_id: e for e in result_env.scalars().all()}

        # 3. Get Transactions for this month (summed by category)
        # Parse month string to get start/end dates
        year, m = map(int, month.split('-'))
        start_date = datetime(year, m, 1)
        _, last_day = calendar.monthrange(year, m)
        end_date = datetime(year, m, last_day)

        stmt_tx = select(
            Transaction.category_id,
            func.sum(Transaction.amount).label("total_activity")
        ).where(
            and_(
                Transaction.user_id == user_id,
                Transaction.date >= start_date,
                Transaction.date <= end_date
            )
        ).group_by(Transaction.category_id)
        
        result_tx = await self.session.execute(stmt_tx)
        activity_map = {row.category_id: row.total_activity for row in result_tx.all()}

        # 4. Build Summary
        summary = []
        for cat in categories:
            env = envelopes.get(cat.id)
            
            # Auto-create envelope if missing
            if not env:
                env = BudgetEnvelope(
                    category_id=cat.id,
                    month=month,
                    assigned=0.0
                )
                self.session.add(env)
                # We defer commit to the caller ideally, but for read-heavy endpoint we might need to flush
                # For now, just construct the object representation without saving if not needed, 
                # but saving ensures persistence. Let's save.
                await self.session.flush()

            assigned = env.assigned
            activity = activity_map.get(cat.id, 0.0)
            available = assigned + activity  # Activity is typically negative for spending

            summary.append({
                "id": str(env.id),
                "category_id": str(cat.id),
                "category_name": cat.name,
                "group": cat.group,
                "month": month,
                "assigned": assigned,
                "activity": activity,
                "available": available
            })

        await self.session.commit()
        return summary

    async def _seed_default_categories(self, user_id: str):
        """Seed default categories for a new user."""
        defaults = [
            ("Housing", ["Rent/Mortgage", "Utilities", "Maintenance"]),
            ("Food", ["Groceries", "Dining Out"]),
            ("Transportation", ["Gas", "Car Insurance", "Public Transit"]),
            ("Lifestyle", ["Entertainment", "Clothing", "Personal Care"]),
            ("Savings", ["Emergency Fund", "Investments", "Vacation"]),
            ("Debt", ["Credit Card Payments", "Student Loans"])
        ]
        
        for group, names in defaults:
            for name in names:
                cat = BudgetCategory(user_id=user_id, group=group, name=name)
                self.session.add(cat)
        
        await self.session.commit()

    async def add_transaction(self, user_id: str, data: dict) -> Transaction:
        """Record a new transaction."""
        # Convert date string to python date if needed
        date_val = data['date']
        if isinstance(date_val, str):
            date_val = datetime.strptime(date_val, "%Y-%m-%d").date()

        tx = Transaction(
            user_id=user_id,
            date=date_val,
            payee=data['payee'],
            amount=float(data['amount']),
            category_id=UUID(data['category_id']) if data.get('category_id') else None,
            description=data.get('description'),
            is_cleared=data.get('is_cleared', False)
        )
        self.session.add(tx)
        await self.session.commit()
        await self.session.refresh(tx)
        
        # Emit Significant Financial Event to Neural Graph
        if abs(tx.amount) >= 500:
            from app.services.saint_runtime.memory.stream import MemoryStream
            from app.services.saint_runtime.memory.types import MemoryObject
            stream = MemoryStream()
            
            action = "spent" if tx.amount < 0 else "received"
            desc = f"St. Gabriel recorded a significant financial event: {action} ${abs(tx.amount)} at {tx.payee}."
            if tx.description:
                desc += f" Note: {tx.description}"
                
            mem = MemoryObject(
                description=desc,
                type="finance_event",
                importance=8.0,
                saint_id="gabriel",
                related_entities=["finance", "transaction", tx.payee]
            )
            stream.add_memory(mem)

        return tx

    async def transfer_funds(self, user_id: str, from_cat_id: UUID, to_cat_id: UUID, amount: float, month: str):
        """Move assigned money from one envelope to another."""
        # Get envelopes
        stmt = select(BudgetEnvelope).join(BudgetCategory).where(
            and_(
                BudgetEnvelope.month == month,
                BudgetCategory.user_id == user_id,
                BudgetEnvelope.category_id.in_([from_cat_id, to_cat_id])
            )
        )
        result = await self.session.execute(stmt)
        envelopes = {e.category_id: e for e in result.scalars().all()}
        
        from_env = envelopes.get(from_cat_id)
        to_env = envelopes.get(to_cat_id)

        if not from_env or not to_env:
            raise ValueError(" envelopes not found for transfer")

        from_env.assigned -= amount
        to_env.assigned += amount
        
        await self.session.commit()
        return {"success": True, "message": f"Transferred ${amount}"}

    async def update_envelope(self, user_id: str, envelope_id: UUID, assigned_amount: float) -> BudgetEnvelope:
        """Update the assigned amount for a specific envelope."""
        stmt = select(BudgetEnvelope).join(BudgetCategory).where(
            and_(
                BudgetEnvelope.id == envelope_id,
                BudgetCategory.user_id == user_id
            )
        )
        result = await self.session.execute(stmt)
        envelope = result.scalar_one_or_none()
        
        if not envelope:
            raise ValueError("Envelope not found")
            
        envelope.assigned = assigned_amount
        await self.session.commit()
        await self.session.refresh(envelope)
        return envelope

    async def get_transactions(self, user_id: str, limit: int = 50) -> List[Transaction]:
        """Get recent transactions."""
        stmt = select(Transaction).where(
            Transaction.user_id == user_id
        ).order_by(Transaction.date.desc()).limit(limit).options(selectinload(Transaction.category))
        
        result = await self.session.execute(stmt)
        return result.scalars().all()

finance_service = None  # dependency injection placeholder
