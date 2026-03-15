"""
St. Gabriel Finance Service

Handles detailed business logic for the Envelope Budgeting system.
"""

import json
from typing import List, Optional, Dict, Any
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import delete, select, func, and_, desc
from sqlalchemy.orm import selectinload
from uuid import UUID
from datetime import date, datetime, timedelta
import calendar

from app.models.finance import (
    BankAccount,
    BankConnection,
    BankImportedTransaction,
    BudgetCategory,
    BudgetEnvelope,
    Transaction,
    WiseGoldWallet,
    RitualBondNFT,
    LivingWill,
    SovereignCovenant,
    WiseGoldLedgerEntry,
    WiseGoldPolicyState,
)
from app.core.config import settings
from app.services.plaid_service import PlaidAPIError, PlaidConfigurationError, PlaidService
from app.services.social_reputation_service import social_reputation_service
from app.services.wisegold_policy_service import WiseGoldPolicyService

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

    def _normalize_plaid_amount(self, plaid_amount: float) -> float:
        # Plaid transaction amounts are positive for outflow and negative for inflow.
        # EverAfter stores negative values for spending and positive values for income.
        return -float(plaid_amount)

    def _parse_transaction_date(self, value: Optional[str]) -> date:
        if not value:
            return datetime.utcnow().date()
        return datetime.strptime(value, "%Y-%m-%d").date()

    def _plaid_payee(self, payload: Dict[str, Any]) -> str:
        return (
            payload.get("merchant_name")
            or payload.get("name")
            or payload.get("authorized_merchant_name")
            or "Imported transaction"
        )

    def _plaid_description(self, payload: Dict[str, Any]) -> Optional[str]:
        category = payload.get("personal_finance_category") or {}
        detailed = category.get("detailed")
        name = payload.get("name")
        merchant_name = payload.get("merchant_name")
        if detailed and merchant_name and name and merchant_name != name:
            return f"{name} • {detailed}"
        return detailed or name

    async def _guess_category_id(self, user_id: str, payload: Dict[str, Any]) -> Optional[UUID]:
        categories = await self.get_categories(user_id)
        if not categories:
            return None

        category_map = {category.name.lower(): category.id for category in categories}
        category_text = " ".join(
            filter(
                None,
                [
                    payload.get("merchant_name"),
                    payload.get("name"),
                    (payload.get("personal_finance_category") or {}).get("primary"),
                    (payload.get("personal_finance_category") or {}).get("detailed"),
                ],
            )
        ).lower()

        matching_rules = [
            (["grocery", "supermarket"], "groceries"),
            (["restaurant", "coffee", "food and drink"], "dining out"),
            (["rent", "mortgage"], "rent/mortgage"),
            (["utility", "electric", "water", "internet", "phone"], "utilities"),
            (["maintenance", "repair"], "maintenance"),
            (["gas", "fuel"], "gas"),
            (["insurance"], "car insurance"),
            (["transit", "taxi", "rideshare", "public transportation"], "public transit"),
            (["movie", "streaming", "music", "entertainment"], "entertainment"),
            (["clothing", "apparel"], "clothing"),
            (["personal care", "salon", "barber", "pharmacy"], "personal care"),
            (["investment", "brokerage"], "investments"),
            (["vacation", "travel", "airline", "hotel"], "vacation"),
            (["credit card"], "credit card payments"),
            (["student loan", "loan"], "student loans"),
            (["emergency"], "emergency fund"),
        ]

        for needles, category_name in matching_rules:
            if any(needle in category_text for needle in needles):
                return category_map.get(category_name)

        return None

    async def _upsert_bank_account(self, connection: BankConnection, payload: Dict[str, Any]) -> BankAccount:
        stmt = select(BankAccount).where(BankAccount.provider_account_id == payload["account_id"])
        bank_account = (await self.session.execute(stmt)).scalar_one_or_none()

        balances = payload.get("balances") or {}
        if not bank_account:
            bank_account = BankAccount(
                connection_id=connection.id,
                provider_account_id=payload["account_id"],
            )
            self.session.add(bank_account)

        bank_account.connection_id = connection.id
        bank_account.name = payload.get("name") or payload.get("official_name") or "Linked account"
        bank_account.official_name = payload.get("official_name")
        bank_account.mask = payload.get("mask")
        bank_account.type = payload.get("type")
        bank_account.subtype = payload.get("subtype")
        bank_account.iso_currency_code = balances.get("iso_currency_code")
        bank_account.current_balance = balances.get("current")
        bank_account.available_balance = balances.get("available")
        await self.session.flush()
        return bank_account

    async def _apply_added_bank_transaction(
        self,
        *,
        user_id: str,
        connection: BankConnection,
        bank_accounts: Dict[str, BankAccount],
        payload: Dict[str, Any],
    ) -> bool:
        existing = (
            await self.session.execute(
                select(BankImportedTransaction).where(
                    BankImportedTransaction.provider_transaction_id == payload["transaction_id"]
                )
            )
        ).scalar_one_or_none()
        if existing:
            return False

        category_id = await self._guess_category_id(user_id, payload)
        account = bank_accounts.get(payload.get("account_id"))

        transaction = Transaction(
            user_id=user_id,
            date=self._parse_transaction_date(payload.get("authorized_date") or payload.get("date")),
            payee=self._plaid_payee(payload),
            amount=self._normalize_plaid_amount(float(payload.get("amount") or 0.0)),
            category_id=category_id,
            description=self._plaid_description(payload),
            is_cleared=not bool(payload.get("pending")),
        )
        self.session.add(transaction)
        await self.session.flush()

        imported = BankImportedTransaction(
            user_id=user_id,
            connection_id=connection.id,
            bank_account_id=account.id if account else None,
            finance_transaction_id=transaction.id,
            provider=connection.provider,
            provider_transaction_id=payload["transaction_id"],
            pending=bool(payload.get("pending")),
            raw_json=json.dumps(payload),
        )
        self.session.add(imported)
        await self.session.flush()
        return True

    async def _apply_modified_bank_transaction(
        self,
        *,
        user_id: str,
        bank_accounts: Dict[str, BankAccount],
        payload: Dict[str, Any],
    ) -> bool:
        imported = (
            await self.session.execute(
                select(BankImportedTransaction).where(
                    BankImportedTransaction.provider_transaction_id == payload["transaction_id"]
                )
            )
        ).scalar_one_or_none()
        if not imported:
            return False

        transaction = await self.session.get(Transaction, imported.finance_transaction_id)
        if transaction:
            transaction.date = self._parse_transaction_date(payload.get("authorized_date") or payload.get("date"))
            transaction.payee = self._plaid_payee(payload)
            transaction.amount = self._normalize_plaid_amount(float(payload.get("amount") or 0.0))
            transaction.description = transaction.description or self._plaid_description(payload)
            transaction.is_cleared = not bool(payload.get("pending"))
            if transaction.category_id is None:
                transaction.category_id = await self._guess_category_id(user_id, payload)

        account = bank_accounts.get(payload.get("account_id"))
        imported.bank_account_id = account.id if account else imported.bank_account_id
        imported.pending = bool(payload.get("pending"))
        imported.raw_json = json.dumps(payload)
        await self.session.flush()
        return True

    async def _apply_removed_bank_transaction(self, provider_transaction_id: str) -> bool:
        imported = (
            await self.session.execute(
                select(BankImportedTransaction).where(
                    BankImportedTransaction.provider_transaction_id == provider_transaction_id
                )
            )
        ).scalar_one_or_none()
        if not imported:
            return False

        if imported.finance_transaction_id:
            await self.session.execute(delete(Transaction).where(Transaction.id == imported.finance_transaction_id))
        await self.session.delete(imported)
        await self.session.flush()
        return True

    async def get_bank_connection_status(self, user_id: str) -> Dict[str, Any]:
        stmt = (
            select(BankConnection)
            .where(and_(BankConnection.user_id == user_id, BankConnection.status == "ACTIVE"))
            .options(selectinload(BankConnection.accounts))
            .order_by(desc(BankConnection.created_at))
        )
        connections = (await self.session.execute(stmt)).scalars().all()

        items: List[Dict[str, Any]] = []
        sync_recommended = False
        for connection in connections:
            imported_count = (
                await self.session.execute(
                    select(func.count(BankImportedTransaction.id)).where(
                        BankImportedTransaction.connection_id == connection.id
                    )
                )
            ).scalar() or 0
            if not connection.last_synced_at or datetime.utcnow() - connection.last_synced_at >= timedelta(hours=6):
                sync_recommended = True
            items.append({
                "id": str(connection.id),
                "provider": connection.provider,
                "institution_name": connection.institution_name,
                "institution_id": connection.institution_id,
                "last_synced_at": connection.last_synced_at.isoformat() if connection.last_synced_at else None,
                "imported_transactions": int(imported_count),
                "accounts": [
                    {
                        "id": str(account.id),
                        "name": account.name,
                        "official_name": account.official_name,
                        "mask": account.mask,
                        "type": account.type,
                        "subtype": account.subtype,
                        "current_balance": account.current_balance,
                        "available_balance": account.available_balance,
                        "iso_currency_code": account.iso_currency_code,
                    }
                    for account in connection.accounts
                ],
            })

        return {
            "provider": "plaid",
            "configured": PlaidService.is_configured(),
            "connected": bool(items),
            "sync_recommended": sync_recommended,
            "connections": items,
        }

    async def create_bank_link_token(self, user_id: str) -> Dict[str, Any]:
        plaid = PlaidService()
        response = await plaid.create_link_token(user_id)
        return {
            "link_token": response["link_token"],
            "expiration": response.get("expiration"),
            "request_id": response.get("request_id"),
        }

    async def exchange_bank_public_token(
        self,
        user_id: str,
        *,
        public_token: str,
        institution_id: Optional[str] = None,
        institution_name: Optional[str] = None,
    ) -> Dict[str, Any]:
        plaid = PlaidService()
        exchange = await plaid.exchange_public_token(public_token)

        stmt = select(BankConnection).where(BankConnection.item_id == exchange["item_id"])
        connection = (await self.session.execute(stmt)).scalar_one_or_none()
        if not connection:
            connection = BankConnection(
                user_id=user_id,
                provider="plaid",
                item_id=exchange["item_id"],
                institution_id=institution_id,
                institution_name=institution_name,
                access_token_encrypted=plaid.encrypt_access_token(exchange["access_token"]),
                status="ACTIVE",
            )
            self.session.add(connection)
        else:
            connection.user_id = user_id
            connection.provider = "plaid"
            connection.institution_id = institution_id or connection.institution_id
            connection.institution_name = institution_name or connection.institution_name
            connection.access_token_encrypted = plaid.encrypt_access_token(exchange["access_token"])
            connection.status = "ACTIVE"
        await self.session.flush()

        accounts_response = await plaid.get_accounts(exchange["access_token"])
        for account_payload in accounts_response.get("accounts", []):
            await self._upsert_bank_account(connection, account_payload)

        sync_summary = await self.sync_bank_connections(user_id, connection_id=connection.id)
        await self.session.commit()
        return {
            "success": True,
            "connection_id": str(connection.id),
            "institution_name": connection.institution_name,
            "imported": sync_summary["imported_count"],
            "modified": sync_summary["modified_count"],
            "removed": sync_summary["removed_count"],
        }

    async def sync_bank_connections(
        self,
        user_id: str,
        *,
        connection_id: Optional[UUID] = None,
    ) -> Dict[str, Any]:
        plaid = PlaidService()
        stmt = (
            select(BankConnection)
            .where(and_(BankConnection.user_id == user_id, BankConnection.status == "ACTIVE"))
            .options(selectinload(BankConnection.accounts))
            .order_by(desc(BankConnection.created_at))
        )
        if connection_id:
            stmt = stmt.where(BankConnection.id == connection_id)
        connections = (await self.session.execute(stmt)).scalars().all()

        if not connections:
            return {"synced_connections": 0, "imported_count": 0, "modified_count": 0, "removed_count": 0}

        imported_count = 0
        modified_count = 0
        removed_count = 0

        for connection in connections:
            access_token = plaid.decrypt_access_token(connection.access_token_encrypted)
            accounts_response = await plaid.get_accounts(access_token)
            for account_payload in accounts_response.get("accounts", []):
                await self._upsert_bank_account(connection, account_payload)

            bank_accounts = {
                account.provider_account_id: account
                for account in (
                    await self.session.execute(
                        select(BankAccount).where(BankAccount.connection_id == connection.id)
                    )
                ).scalars().all()
            }

            cursor = connection.sync_cursor
            has_more = True
            while has_more:
                response = await plaid.transactions_sync(access_token, cursor=cursor)
                for payload in response.get("added", []):
                    if await self._apply_added_bank_transaction(
                        user_id=user_id,
                        connection=connection,
                        bank_accounts=bank_accounts,
                        payload=payload,
                    ):
                        imported_count += 1
                for payload in response.get("modified", []):
                    if await self._apply_modified_bank_transaction(
                        user_id=user_id,
                        bank_accounts=bank_accounts,
                        payload=payload,
                    ):
                        modified_count += 1
                for payload in response.get("removed", []):
                    if await self._apply_removed_bank_transaction(payload.get("transaction_id")):
                        removed_count += 1

                cursor = response.get("next_cursor")
                has_more = bool(response.get("has_more"))

            connection.sync_cursor = cursor
            connection.last_synced_at = datetime.utcnow()

        await self.session.commit()
        return {
            "synced_connections": len(connections),
            "imported_count": imported_count,
            "modified_count": modified_count,
            "removed_count": removed_count,
        }

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

    async def get_transactions(self, user_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent transactions with bank-import metadata when present."""
        stmt = (
            select(
                Transaction,
                BudgetCategory,
                BankImportedTransaction,
                BankAccount,
                BankConnection,
            )
            .outerjoin(BudgetCategory, BudgetCategory.id == Transaction.category_id)
            .outerjoin(BankImportedTransaction, BankImportedTransaction.finance_transaction_id == Transaction.id)
            .outerjoin(BankAccount, BankAccount.id == BankImportedTransaction.bank_account_id)
            .outerjoin(BankConnection, BankConnection.id == BankImportedTransaction.connection_id)
            .where(Transaction.user_id == user_id)
            .order_by(Transaction.date.desc(), Transaction.created_at.desc())
            .limit(limit)
        )

        rows = (await self.session.execute(stmt)).all()
        transactions: List[Dict[str, Any]] = []
        for transaction, category, imported, bank_account, connection in rows:
            transactions.append({
                "id": transaction.id,
                "date": transaction.date,
                "payee": transaction.payee,
                "amount": transaction.amount,
                "category_id": transaction.category_id,
                "description": transaction.description,
                "is_cleared": transaction.is_cleared,
                "created_at": transaction.created_at,
                "category": (
                    {
                        "name": category.name,
                        "group": category.group,
                    }
                    if category
                    else None
                ),
                "source": "bank" if imported else "manual",
                "account_name": bank_account.name if bank_account else None,
                "account_mask": bank_account.mask if bank_account else None,
                "institution_name": connection.institution_name if connection else None,
                "pending": imported.pending if imported else False,
            })
        return transactions

    # ══════════════════════════════════════════════════════════════════════════════
    # WiseGold Sovereign 3.0 Methods
    # ══════════════════════════════════════════════════════════════════════════════
    
    def _build_covenant_members(self, user_id: str, total_members: int, role: str) -> str:
        members = [{
            "user_id": user_id,
            "display_name": "You",
            "role": role,
            "status": "ACTIVE",
        }]
        for index in range(total_members - 1):
            members.append({
                "user_id": f"{role}-member-{index + 1}",
                "display_name": f"{role.title()} Member {index + 1}",
                "role": "member",
                "status": "ACTIVE",
            })
        return json.dumps(members)

    def _parse_members(self, members_json: Optional[str]) -> List[Dict[str, Any]]:
        if not members_json:
            return []
        try:
            parsed = json.loads(members_json)
            return parsed if isinstance(parsed, list) else []
        except json.JSONDecodeError:
            return []

    async def _record_wisegold_entry(
        self,
        *,
        user_id: str,
        wallet: Optional[WiseGoldWallet],
        entry_type: str,
        direction: str,
        amount: float,
        description: str,
        covenant: Optional[SovereignCovenant] = None,
        balance_after: Optional[float] = None,
        status: str = "COMPLETED",
        metadata: Optional[Dict[str, Any]] = None,
    ) -> WiseGoldLedgerEntry:
        entry = WiseGoldLedgerEntry(
            user_id=user_id,
            wallet_id=wallet.id if wallet else None,
            covenant_id=covenant.id if covenant else None,
            entry_type=entry_type,
            direction=direction,
            amount=amount,
            balance_after=balance_after,
            status=status,
            description=description,
            metadata_json=json.dumps(metadata or {}),
        )
        self.session.add(entry)
        await self.session.flush()
        return entry

    async def _get_policy_row(self) -> WiseGoldPolicyState:
        stmt = select(WiseGoldPolicyState).where(WiseGoldPolicyState.id == 1)
        policy = (await self.session.execute(stmt)).scalar_one_or_none()
        if not policy:
            policy = WiseGoldPolicyState(id=1)
            self.session.add(policy)
            await self.session.flush()
        return policy

    async def _ensure_default_covenants(self, user_id: str) -> None:
        stmt = select(SovereignCovenant)
        covenants = (await self.session.execute(stmt)).scalars().all()
        has_user_covenant = False
        for covenant in covenants:
            members = self._parse_members(covenant.members)
            if any(member.get("user_id") == user_id for member in members):
                has_user_covenant = True
                break

        if has_user_covenant:
            return

        defaults = [
            SovereignCovenant(
                name="St. Joseph Family Vault",
                total_vault=12500.0,
                members=self._build_covenant_members(user_id, total_members=5, role="family"),
            ),
            SovereignCovenant(
                name="Founders Covenant",
                total_vault=50000.0,
                members=self._build_covenant_members(user_id, total_members=12, role="founder"),
            ),
        ]
        self.session.add_all(defaults)
        await self.session.flush()

    async def _ensure_wisegold_wallet_entities(self, user_id: str) -> tuple[WiseGoldWallet, RitualBondNFT, LivingWill]:
        stmt = select(WiseGoldWallet).where(WiseGoldWallet.user_id == user_id)
        wallet = (await self.session.execute(stmt)).scalar_one_or_none()

        created = False
        if not wallet:
            created = True
            wallet = WiseGoldWallet(user_id=user_id, balance=10.0)
            self.session.add(wallet)
            await self.session.flush()

        bond = (await self.session.execute(
            select(RitualBondNFT).where(RitualBondNFT.wallet_id == wallet.id)
        )).scalar_one_or_none()
        if not bond:
            bond = RitualBondNFT(wallet_id=wallet.id, tier="Seed", ritual_score=0.1, multiplier=1.0)
            self.session.add(bond)

        will = (await self.session.execute(
            select(LivingWill).where(LivingWill.wallet_id == wallet.id)
        )).scalar_one_or_none()
        if not will:
            will = LivingWill(wallet_id=wallet.id, status="ACTIVE", heirs="[]")
            self.session.add(will)

        await self._get_policy_row()
        await self._ensure_default_covenants(user_id)
        await self.session.flush()

        if created:
            await self._record_wisegold_entry(
                user_id=user_id,
                wallet=wallet,
                entry_type="SIGNUP_BONUS",
                direction="credit",
                amount=10.0,
                balance_after=wallet.balance,
                description="Initial WiseGold signup bonus credited to wallet.",
            )

        await self.session.commit()
        await self.session.refresh(wallet)
        return wallet, bond, will

    async def get_wisegold_wallet(self, user_id: str) -> Dict[str, Any]:
        """Fetch the user's WGOLD wallet, bond, will, and live policy state."""
        wallet, bond, will = await self._ensure_wisegold_wallet_entities(user_id)
        policy = await self._get_policy_row()
        policy_service = WiseGoldPolicyService(self.session)
        social_standing = await social_reputation_service.calculate_user_reputation(
            self.session,
            user_id,
            persist=True,
            wallet_address=wallet.solana_pubkey,
        )
        policy_summary = await policy_service.get_policy_summary(user_id, wallet.solana_pubkey)
        await self.session.commit()

        return {
            "wallet": {
                "id": str(wallet.id),
                "balance": float(wallet.balance or 0.0),
                "solana_pubkey": wallet.solana_pubkey,
                "last_manna_claim": wallet.last_manna_claim.isoformat() if wallet.last_manna_claim else None,
            },
            "ritual_bond": {
                "tier": bond.tier,
                "ritual_score": float(bond.ritual_score or 0.0),
                "multiplier": float(bond.multiplier or 1.0),
            },
            "living_will": {
                "status": will.status,
                "last_heartbeat": will.last_heartbeat.isoformat() if will.last_heartbeat else None,
                "heirs": will.heirs or "[]",
            },
            "policy": {
                "current_tax_rate": float(policy.current_tax_rate or 0.0),
                "current_base_manna": float(policy.current_base_manna or 0.0),
                "daily_manna_pool": float(policy.daily_manna_pool or 0.0),
                "total_circulating": float(policy.total_circulating or 0.0),
                "last_gold_price": float(policy.last_gold_price or 0.0),
                "stress_level": float(policy.stress_level or 0.0),
                "last_tick_velocity": float(policy.last_tick_velocity or 0.0),
                "last_gold_delta": float(policy.last_gold_delta or 0.0),
                "last_tick_at": policy.last_tick_at.isoformat() if policy.last_tick_at else None,
            },
            "social_standing": social_standing,
            "onchain": {
                "token_contract": settings.WGOLD_TOKEN_CONTRACT or None,
                "reputation_oracle_contract": settings.WGOLD_REPUTATION_ORACLE_CONTRACT or None,
                "policy_controller_contract": settings.WGOLD_POLICY_CONTROLLER_CONTRACT or None,
                "covenant_verifier_contract": settings.WGOLD_COVENANT_VERIFIER_CONTRACT or None,
                "functions_router": settings.WISEGOLD_CHAINLINK_ROUTER or None,
                "don_id": settings.WISEGOLD_CHAINLINK_DON_ID or None,
            },
            "policy_summary": policy_summary,
        }

    async def get_wisegold_social_standing(self, user_id: str, wallet_address: Optional[str] = None) -> Dict[str, Any]:
        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        return await social_reputation_service.calculate_user_reputation(
            self.session,
            user_id,
            persist=True,
            wallet_address=wallet_address or wallet.solana_pubkey,
        )

    async def get_wisegold_covenants(self, user_id: str) -> List[Dict[str, Any]]:
        """Fetch real Sovereign Covenants for the authenticated member."""
        await self._ensure_default_covenants(user_id)
        stmt = select(SovereignCovenant)
        covenants = (await self.session.execute(stmt)).scalars().all()

        pending_entries = (await self.session.execute(
            select(WiseGoldLedgerEntry).where(
                WiseGoldLedgerEntry.entry_type == "COVENANT_WITHDRAWAL",
                WiseGoldLedgerEntry.status == "PENDING_QUORUM",
            )
        )).scalars().all()
        pending_by_covenant: Dict[str, int] = {}
        for entry in pending_entries:
            if entry.covenant_id:
                key = str(entry.covenant_id)
                pending_by_covenant[key] = pending_by_covenant.get(key, 0) + 1

        out: List[Dict[str, Any]] = []
        for covenant in covenants:
            members = self._parse_members(covenant.members)
            if not any(member.get("user_id") == user_id for member in members):
                continue
            out.append({
                "id": str(covenant.id),
                "name": covenant.name,
                "total_vault": float(covenant.total_vault or 0.0),
                "members": len(members),
                "quorum": max(1, (len(members) + 1) // 2),
                "pending_withdrawals": pending_by_covenant.get(str(covenant.id), 0),
            })

        return out

    async def get_recent_wisegold_ledger(self, user_id: str, limit: int = 12) -> List[Dict[str, Any]]:
        await self._ensure_wisegold_wallet_entities(user_id)
        stmt = (
            select(WiseGoldLedgerEntry, SovereignCovenant.name)
            .outerjoin(SovereignCovenant, SovereignCovenant.id == WiseGoldLedgerEntry.covenant_id)
            .where(WiseGoldLedgerEntry.user_id == user_id)
            .order_by(desc(WiseGoldLedgerEntry.created_at))
            .limit(limit)
        )
        rows = (await self.session.execute(stmt)).all()

        entries: List[Dict[str, Any]] = []
        for entry, covenant_name in rows:
            entries.append({
                "id": str(entry.id),
                "entry_type": entry.entry_type,
                "direction": entry.direction,
                "amount": float(entry.amount or 0.0),
                "balance_after": float(entry.balance_after) if entry.balance_after is not None else None,
                "status": entry.status,
                "description": entry.description,
                "covenant_name": covenant_name,
                "created_at": entry.created_at.isoformat() if entry.created_at else None,
                "metadata": json.loads(entry.metadata_json or "{}"),
            })
        return entries

    async def record_heartbeat(self, user_id: str) -> bool:
        """Update Proof-of-Life heartbeat for Living Will."""
        wallet, _, will = await self._ensure_wisegold_wallet_entities(user_id)
        will.last_heartbeat = datetime.utcnow()
        will.status = "ACTIVE"
        await self._record_wisegold_entry(
            user_id=user_id,
            wallet=wallet,
            entry_type="HEARTBEAT",
            direction="info",
            amount=0.0,
            balance_after=float(wallet.balance or 0.0),
            description="Proof-of-life heartbeat synchronized.",
        )
        await self.session.commit()
        return True

    async def get_wisegold_attestations(self, user_id: str) -> List[Dict[str, Any]]:
        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        policy_service = WiseGoldPolicyService(self.session)
        attestations = await policy_service.get_user_attestations(user_id, wallet.solana_pubkey)
        await self.session.commit()
        return attestations

    async def get_wisegold_policy_summary(self, user_id: str) -> Dict[str, Any]:
        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        policy_service = WiseGoldPolicyService(self.session)
        summary = await policy_service.get_policy_summary(user_id, wallet.solana_pubkey)
        await self.session.commit()
        return summary

    async def get_wisegold_global_policy(self) -> Dict[str, Any]:
        policy = await self._get_policy_row()
        await self.session.commit()
        return {
            "current_tax_rate": float(policy.current_tax_rate or 0.0),
            "current_base_manna": float(policy.current_base_manna or 0.0),
            "daily_manna_pool": float(policy.daily_manna_pool or 0.0),
            "total_circulating": float(policy.total_circulating or 0.0),
            "last_gold_price": float(policy.last_gold_price or 0.0),
            "stress_level": float(policy.stress_level or 0.0),
            "last_tick_velocity": float(policy.last_tick_velocity or 0.0),
            "last_gold_delta": float(policy.last_gold_delta or 0.0),
            "last_tick_at": policy.last_tick_at.isoformat() if policy.last_tick_at else None,
        }

    async def evaluate_wisegold_policy(
        self,
        user_id: str,
        *,
        action: str,
        amount: float,
        covenant_id: Optional[UUID] = None,
        destination_chain: Optional[str] = None,
    ) -> Dict[str, Any]:
        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        policy_service = WiseGoldPolicyService(self.session)
        evaluation = await policy_service.evaluate_action(
            user_id=user_id,
            action=action,
            amount=amount,
            covenant_id=covenant_id,
            destination_chain=destination_chain,
            wallet_address=wallet.solana_pubkey,
        )
        await self.session.commit()
        return evaluation

    async def deposit_into_covenant(self, user_id: str, covenant_id: UUID, amount: float) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Deposit amount must be positive")

        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        covenant = await self.session.get(SovereignCovenant, covenant_id)
        if not covenant:
            raise ValueError("Covenant not found")

        members = self._parse_members(covenant.members)
        if not any(member.get("user_id") == user_id for member in members):
            raise ValueError("You are not a member of this covenant")

        if float(wallet.balance or 0.0) < amount:
            raise ValueError("Insufficient WGOLD balance")

        wallet.balance = float(wallet.balance or 0.0) - amount
        covenant.total_vault = float(covenant.total_vault or 0.0) + amount

        await self._record_wisegold_entry(
            user_id=user_id,
            wallet=wallet,
            covenant=covenant,
            entry_type="COVENANT_DEPOSIT",
            direction="debit",
            amount=amount,
            balance_after=float(wallet.balance or 0.0),
            description=f"Deposited {amount:.2f} WGOLD into {covenant.name}.",
        )
        await self.session.commit()
        return {
            "success": True,
            "status": "COMPLETED",
            "wallet_balance": float(wallet.balance or 0.0),
            "covenant_total": float(covenant.total_vault or 0.0),
        }

    async def withdraw_from_covenant(self, user_id: str, covenant_id: UUID, amount: float) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Withdrawal amount must be positive")

        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        policy_service = WiseGoldPolicyService(self.session)
        covenant = await self.session.get(SovereignCovenant, covenant_id)
        if not covenant:
            raise ValueError("Covenant not found")

        members = self._parse_members(covenant.members)
        if not any(member.get("user_id") == user_id for member in members):
            raise ValueError("You are not a member of this covenant")

        if float(covenant.total_vault or 0.0) < amount:
            raise ValueError("Covenant vault does not have enough WGOLD")

        evaluation = await policy_service.evaluate_action(
            user_id=user_id,
            action="withdraw",
            amount=amount,
            covenant_id=covenant_id,
            wallet_address=wallet.solana_pubkey,
        )
        if not evaluation["allowed"]:
            await policy_service.record_policy_decision(
                user_id=user_id,
                action="withdraw",
                allowed=False,
                amount=amount,
                reason=evaluation["reason"],
                metadata={
                    "covenant_id": str(covenant_id),
                    "reason_code": evaluation["reason_code"],
                },
            )
            raise ValueError(evaluation["reason"])

        status = "PENDING_QUORUM"
        description = f"Withdrawal request for {amount:.2f} WGOLD submitted to {covenant.name}."
        if len(members) <= 1:
            covenant.total_vault = float(covenant.total_vault or 0.0) - amount
            wallet.balance = float(wallet.balance or 0.0) + amount
            status = "COMPLETED"
            description = f"Withdrew {amount:.2f} WGOLD from {covenant.name}."

        await self._record_wisegold_entry(
            user_id=user_id,
            wallet=wallet,
            covenant=covenant,
            entry_type="COVENANT_WITHDRAWAL",
            direction="credit",
            amount=amount,
            balance_after=float(wallet.balance or 0.0),
            status=status,
            description=description,
            metadata={"quorum_required": max(1, (len(members) + 1) // 2)},
        )
        await self.session.commit()
        await policy_service.record_policy_decision(
            user_id=user_id,
            action="withdraw",
            allowed=True,
            amount=amount,
            reason=evaluation["reason"],
            metadata={
                "covenant_id": str(covenant_id),
                "status": status,
                "effective_limit": evaluation["effective_limit"],
            },
        )
        return {
            "success": True,
            "status": status,
            "wallet_balance": float(wallet.balance or 0.0),
            "covenant_total": float(covenant.total_vault or 0.0),
        }

    async def get_wisegold_velocity_24h(self) -> float:
        since = datetime.utcnow() - timedelta(hours=24)
        stmt = select(WiseGoldLedgerEntry).where(
            WiseGoldLedgerEntry.created_at >= since,
            WiseGoldLedgerEntry.status == "COMPLETED",
        )
        entries = (await self.session.execute(stmt)).scalars().all()
        return sum(abs(float(entry.amount or 0.0)) for entry in entries)

    async def record_bridge_transfer(
        self,
        user_id: str,
        *,
        amount: float,
        destination_chain: str,
        destination_address: str,
    ) -> Dict[str, Any]:
        if amount <= 0:
            raise ValueError("Bridge amount must be positive")

        wallet, _, _ = await self._ensure_wisegold_wallet_entities(user_id)
        policy_service = WiseGoldPolicyService(self.session)
        if float(wallet.balance or 0.0) < amount:
            raise ValueError("Insufficient WGOLD balance")

        evaluation = await policy_service.evaluate_action(
            user_id=user_id,
            action="bridge",
            amount=amount,
            destination_chain=destination_chain,
            wallet_address=wallet.solana_pubkey,
        )
        if not evaluation["allowed"]:
            await policy_service.record_policy_decision(
                user_id=user_id,
                action="bridge",
                allowed=False,
                amount=amount,
                reason=evaluation["reason"],
                metadata={
                    "destination_chain": destination_chain,
                    "destination_address": destination_address,
                    "reason_code": evaluation["reason_code"],
                },
            )
            raise ValueError(evaluation["reason"])

        wallet.balance = float(wallet.balance or 0.0) - amount
        await self._record_wisegold_entry(
            user_id=user_id,
            wallet=wallet,
            entry_type="BRIDGE_TRANSFER",
            direction="debit",
            amount=amount,
            balance_after=float(wallet.balance or 0.0),
            description=f"Bridged {amount:.2f} WGOLD to {destination_chain}.",
            metadata={
                "destination_chain": destination_chain,
                "destination_address": destination_address,
            },
        )
        await self.session.commit()
        await policy_service.record_policy_decision(
            user_id=user_id,
            action="bridge",
            allowed=True,
            amount=amount,
            reason=evaluation["reason"],
            metadata={
                "destination_chain": destination_chain,
                "destination_address": destination_address,
                "effective_limit": evaluation["effective_limit"],
            },
        )
        return {
            "wallet_balance": float(wallet.balance or 0.0),
            "effective_limit": evaluation["effective_limit"],
        }

    async def run_wisegold_tick(self) -> Dict[str, Any]:
        from app.services.chainlink_service import ChainlinkService
        from app.services.wisegold_engine import GoldenSovereignEngine

        latest_gold_price = await ChainlinkService.get_latest_xau_usd_price()
        velocity_24h = await self.get_wisegold_velocity_24h()

        engine = GoldenSovereignEngine(self.session)
        return await engine.system_tick(
            velocity_24h=velocity_24h,
            latest_gold_price=latest_gold_price,
        )

finance_service = None  # dependency injection placeholder
