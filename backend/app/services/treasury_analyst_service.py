from __future__ import annotations

import statistics
from collections import Counter
from datetime import date, datetime, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.finance import Transaction, WiseGoldPolicyState, WiseGoldSocialStanding, WiseGoldWallet
from app.services.finance_service import FinanceService


class TreasuryAnalystService:
    def __init__(self, session: AsyncSession):
        self.session = session
        self.finance_service = FinanceService(session)

    async def build_snapshot(self, user_id: str, months: int = 3) -> Dict[str, Any]:
        months = max(1, min(months, 6))
        current_month = datetime.utcnow().strftime("%Y-%m")
        budget = await self.finance_service.get_budget_summary(user_id, current_month)
        transactions = await self._get_recent_transactions(user_id, days=120)
        wallet = await self._get_wallet(user_id)
        policy = await self._get_policy()
        standing = await self._get_social_standing(user_id)

        monthly_cash_flow = self._summarize_monthly_cash_flow(transactions, months)
        current_month_flow = monthly_cash_flow[-1] if monthly_cash_flow else {
            "month": current_month,
            "inflow": 0.0,
            "outflow": 0.0,
            "net": 0.0,
        }

        overspending = self._detect_overspending(budget)
        anomalies = self._detect_anomalies(transactions)
        top_spend = self._top_spending_categories(budget)
        runway = self._forecast_runway(
            budget=budget,
            wallet=wallet,
            policy=policy,
            monthly_cash_flow=monthly_cash_flow,
        )
        policy_summary = self._summarize_policy(policy, standing)
        recommendations = self._build_recommendations(
            current_month_flow=current_month_flow,
            overspending=overspending,
            anomalies=anomalies,
            runway=runway,
            policy_summary=policy_summary,
        )

        return {
            "generated_at": datetime.utcnow().isoformat(),
            "cash_flow": {
                "current_month": current_month_flow,
                "trend": monthly_cash_flow,
            },
            "overspending": overspending,
            "anomalies": anomalies,
            "runway": runway,
            "wgold_policy": policy_summary,
            "top_spending_categories": top_spend,
            "recommendations": recommendations,
        }

    async def build_prompt_context(self, user_id: str, months: int = 3) -> str:
        snapshot = await self.build_snapshot(user_id, months=months)
        current_flow = snapshot["cash_flow"]["current_month"]
        runway = snapshot["runway"]
        overspending = snapshot["overspending"]
        anomalies = snapshot["anomalies"]
        policy = snapshot["wgold_policy"]
        spending = snapshot["top_spending_categories"]

        lines = [
            "--- TREASURY ANALYST REPORT ---",
            f"Generated At: {snapshot['generated_at']}",
            "",
            "[CASH FLOW]",
            f"- Current month inflow: ${current_flow['inflow']:.2f}",
            f"- Current month outflow: ${current_flow['outflow']:.2f}",
            f"- Current month net cash flow: ${current_flow['net']:.2f}",
            f"- Monthly burn rate: ${runway['monthly_burn_rate']:.2f}",
            f"- Liquid reserves: ${runway['liquid_reserves_usd']:.2f}",
            f"- Estimated runway: {runway['runway_months_label']}",
            "",
            "[TOP SPENDING CATEGORIES]",
        ]

        if spending:
            for item in spending:
                lines.append(
                    f"- {item['category_name']}: spent ${item['spent']:.2f} against ${item['assigned']:.2f} assigned"
                )
        else:
            lines.append("- No spending categories recorded yet.")

        lines.extend(["", "[OVERSPENDING WATCH]"])
        if overspending:
            for item in overspending:
                lines.append(
                    f"- {item['category_name']}: over by ${item['over_amount']:.2f} ({item['utilization_pct']:.0f}% utilized)"
                )
        else:
            lines.append("- No categories are overspent this month.")

        lines.extend(["", "[ANOMALIES]"])
        if anomalies:
            for item in anomalies:
                lines.append(f"- {item['title']}: {item['detail']}")
        else:
            lines.append("- No material anomalies detected in recent transactions.")

        lines.extend(
            [
                "",
                "[WGOLD POLICY]",
                f"- Current tax rate: {policy['current_tax_rate_pct']:.2f}%",
                f"- Base manna/day: {policy['current_base_manna']:.2f} WGOLD",
                f"- Treasury stress level: {policy['stress_level']:.2f}",
                f"- 24h treasury velocity: {policy['last_tick_velocity']:.2f}",
                f"- Gold delta vs prior tick: {policy['last_gold_delta']:.2f}%",
                f"- Social standing tier: {policy['social_tier']}",
                f"- Emission multiplier: {policy['social_multiplier_label']}",
                "- Policy explanation:",
            ]
        )
        for point in policy["explanation_points"]:
            lines.append(f"  - {point}")

        lines.extend(["", "[RECOMMENDED TALKING POINTS]"])
        for item in snapshot["recommendations"]:
            lines.append(f"- {item}")

        lines.append("--- END TREASURY ANALYST REPORT ---")
        return "\n".join(lines)

    async def _get_recent_transactions(self, user_id: str, days: int) -> List[Transaction]:
        since = date.today() - timedelta(days=days)
        stmt = (
            select(Transaction)
            .where(
                and_(
                    Transaction.user_id == user_id,
                    Transaction.date >= since,
                )
            )
            .options(selectinload(Transaction.category))
            .order_by(Transaction.date.desc())
        )
        return list((await self.session.execute(stmt)).scalars().all())

    async def _get_wallet(self, user_id: str) -> Optional[WiseGoldWallet]:
        stmt = select(WiseGoldWallet).where(WiseGoldWallet.user_id == user_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def _get_policy(self) -> Optional[WiseGoldPolicyState]:
        stmt = select(WiseGoldPolicyState).where(WiseGoldPolicyState.id == 1)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    async def _get_social_standing(self, user_id: str) -> Optional[WiseGoldSocialStanding]:
        stmt = select(WiseGoldSocialStanding).where(WiseGoldSocialStanding.user_id == user_id)
        return (await self.session.execute(stmt)).scalar_one_or_none()

    def _summarize_monthly_cash_flow(self, transactions: List[Transaction], months: int) -> List[Dict[str, Any]]:
        month_keys = [self._month_key(month_offset) for month_offset in range(months - 1, -1, -1)]
        out: List[Dict[str, Any]] = []
        for month_key in month_keys:
            inflow = 0.0
            outflow = 0.0
            for tx in transactions:
                if tx.date.strftime("%Y-%m") != month_key:
                    continue
                if float(tx.amount) >= 0:
                    inflow += float(tx.amount)
                else:
                    outflow += abs(float(tx.amount))
            out.append({
                "month": month_key,
                "inflow": inflow,
                "outflow": outflow,
                "net": inflow - outflow,
            })
        return out

    def _detect_overspending(self, budget: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        overspending: List[Dict[str, Any]] = []
        for item in budget:
            assigned = float(item.get("assigned") or 0.0)
            activity = abs(float(item.get("activity") or 0.0))
            available = float(item.get("available") or 0.0)
            if available >= 0 and not (assigned == 0 and activity > 0):
                continue

            over_amount = abs(available) if available < 0 else activity
            utilization_pct = (activity / assigned * 100.0) if assigned > 0 else 100.0
            overspending.append({
                "category_name": item["category_name"],
                "assigned": assigned,
                "activity": activity,
                "available": available,
                "over_amount": over_amount,
                "utilization_pct": utilization_pct,
            })

        overspending.sort(key=lambda item: item["over_amount"], reverse=True)
        return overspending[:5]

    def _detect_anomalies(self, transactions: List[Transaction]) -> List[Dict[str, Any]]:
        recent = [tx for tx in transactions if tx.date >= date.today() - timedelta(days=45)]
        expenses = [abs(float(tx.amount)) for tx in recent if float(tx.amount) < 0]
        median_expense = statistics.median(expenses) if expenses else 0.0
        anomalies: List[Dict[str, Any]] = []

        for tx in recent:
            amount = float(tx.amount)
            if amount >= 0:
                continue
            abs_amount = abs(amount)
            threshold = max(150.0, median_expense * 2.5 if median_expense else 150.0)
            if abs_amount >= threshold:
                anomalies.append({
                    "title": "Large outflow",
                    "detail": f"{tx.payee} posted ${abs_amount:.2f} on {tx.date.isoformat()}",
                    "amount": abs_amount,
                })

            if tx.category_id is None:
                anomalies.append({
                    "title": "Uncategorized spend",
                    "detail": f"{tx.payee} posted ${abs_amount:.2f} without a category",
                    "amount": abs_amount,
                })

        payee_counts = Counter(tx.payee for tx in recent if float(tx.amount) < 0)
        payee_totals: Dict[str, float] = {}
        for tx in recent:
            if float(tx.amount) < 0:
                payee_totals[tx.payee] = payee_totals.get(tx.payee, 0.0) + abs(float(tx.amount))

        for payee, count in payee_counts.items():
            if count >= 3 and payee_totals.get(payee, 0.0) >= 75:
                anomalies.append({
                    "title": "Recurring drain",
                    "detail": f"{payee} hit {count} times over the last 45 days for ${payee_totals[payee]:.2f}",
                    "amount": payee_totals[payee],
                })

        deduped: List[Dict[str, Any]] = []
        seen = set()
        for anomaly in sorted(anomalies, key=lambda item: item.get("amount", 0.0), reverse=True):
            key = (anomaly["title"], anomaly["detail"])
            if key in seen:
                continue
            seen.add(key)
            deduped.append(anomaly)
        return deduped[:5]

    def _top_spending_categories(self, budget: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        categories = []
        for item in budget:
            spent = abs(float(item.get("activity") or 0.0))
            if spent <= 0:
                continue
            categories.append({
                "category_name": item["category_name"],
                "spent": spent,
                "assigned": float(item.get("assigned") or 0.0),
                "available": float(item.get("available") or 0.0),
            })
        categories.sort(key=lambda item: item["spent"], reverse=True)
        return categories[:5]

    def _forecast_runway(
        self,
        *,
        budget: List[Dict[str, Any]],
        wallet: Optional[WiseGoldWallet],
        policy: Optional[WiseGoldPolicyState],
        monthly_cash_flow: List[Dict[str, Any]],
    ) -> Dict[str, Any]:
        positive_available = sum(max(float(item.get("available") or 0.0), 0.0) for item in budget)
        wgold_price = float(policy.last_gold_price or 0.0) if policy else 0.0
        wgold_balance = float(wallet.balance or 0.0) if wallet else 0.0
        liquid_reserves = positive_available + (wgold_balance * wgold_price)

        burn_values = [month["outflow"] for month in monthly_cash_flow if month["outflow"] > 0]
        monthly_burn_rate = sum(burn_values) / len(burn_values) if burn_values else 0.0
        runway_months = (liquid_reserves / monthly_burn_rate) if monthly_burn_rate > 0 else None

        if runway_months is None:
            runway_label = "Not enough spending history to estimate runway"
        elif runway_months >= 12:
            runway_label = f"{runway_months:.1f} months (strong)"
        elif runway_months >= 6:
            runway_label = f"{runway_months:.1f} months (stable)"
        elif runway_months >= 3:
            runway_label = f"{runway_months:.1f} months (watch closely)"
        else:
            runway_label = f"{runway_months:.1f} months (tight)"

        return {
            "liquid_reserves_usd": liquid_reserves,
            "wgold_balance": wgold_balance,
            "wgold_reference_price_usd": wgold_price,
            "monthly_burn_rate": monthly_burn_rate,
            "runway_months": runway_months,
            "runway_months_label": runway_label,
        }

    def _summarize_policy(
        self,
        policy: Optional[WiseGoldPolicyState],
        standing: Optional[WiseGoldSocialStanding],
    ) -> Dict[str, Any]:
        current_tax_rate = float(policy.current_tax_rate or 0.0) if policy else 0.0
        current_base_manna = float(policy.current_base_manna or 0.0) if policy else 0.0
        stress_level = float(policy.stress_level or 0.0) if policy else 0.0
        last_tick_velocity = float(policy.last_tick_velocity or 0.0) if policy else 0.0
        last_gold_delta = float(policy.last_gold_delta or 0.0) if policy else 0.0

        explanation_points: List[str] = []
        if stress_level >= 0.7:
            explanation_points.append("Treasury stress is elevated, so policy is favoring preservation over emissions.")
        elif stress_level >= 0.4:
            explanation_points.append("Treasury stress is moderate; policy is balancing growth with reserve protection.")
        else:
            explanation_points.append("Treasury stress is contained, so policy can remain supportive of emissions.")

        if last_tick_velocity >= 5000:
            explanation_points.append("Recent WGOLD velocity is high, which supports a tighter policy stance.")
        elif last_tick_velocity > 0:
            explanation_points.append("Recent WGOLD velocity is moderate, so policy is using a neutral stance.")
        else:
            explanation_points.append("Velocity is light, so policy changes are being driven mainly by reserves and gold price.")

        if last_gold_delta > 1:
            explanation_points.append("Gold moved up versus the prior tick, which supports stronger backing.")
        elif last_gold_delta < -1:
            explanation_points.append("Gold moved down versus the prior tick, so the treasury is compensating conservatively.")
        else:
            explanation_points.append("Gold price movement is relatively flat, so no large backing shock is present.")

        multiplier_bps = int(standing.daily_manna_multiplier_bps) if standing else 10000
        social_tier = self._standing_tier_label(standing.reputation_bps if standing else 5000)

        return {
            "current_tax_rate_pct": current_tax_rate * 100.0,
            "current_base_manna": current_base_manna,
            "stress_level": stress_level,
            "last_tick_velocity": last_tick_velocity,
            "last_gold_delta": last_gold_delta,
            "social_tier": social_tier,
            "social_multiplier_bps": multiplier_bps,
            "social_multiplier_label": f"{multiplier_bps / 10000:.2f}x",
            "explanation_points": explanation_points,
        }

    def _build_recommendations(
        self,
        *,
        current_month_flow: Dict[str, Any],
        overspending: List[Dict[str, Any]],
        anomalies: List[Dict[str, Any]],
        runway: Dict[str, Any],
        policy_summary: Dict[str, Any],
    ) -> List[str]:
        recommendations: List[str] = []
        if current_month_flow["net"] < 0:
            recommendations.append(
                f"Close the month-to-date cash gap of ${abs(current_month_flow['net']):.2f} before adding discretionary spend."
            )
        if overspending:
            top = overspending[0]
            recommendations.append(
                f"Reassign or cut {top['category_name']}; it is over by ${top['over_amount']:.2f}."
            )
        if anomalies:
            recommendations.append("Review the flagged anomalies before making new commitments or transfers.")

        runway_months = runway.get("runway_months")
        if runway_months is not None and runway_months < 6:
            recommendations.append("Build liquid reserves until runway clears six months of burn.")

        if policy_summary["stress_level"] >= 0.7:
            recommendations.append("Treat WGOLD policy as defensive right now; prioritize resilience over aggressive expansion.")
        elif not recommendations:
            recommendations.append("Treasury is stable. Focus on steady category discipline and consistent WGOLD heartbeat activity.")

        return recommendations[:5]

    def _month_key(self, months_ago: int) -> str:
        anchor = datetime.utcnow().replace(day=1)
        year = anchor.year
        month = anchor.month - months_ago
        while month <= 0:
            month += 12
            year -= 1
        return f"{year:04d}-{month:02d}"

    def _standing_tier_label(self, reputation_bps: int) -> str:
        if reputation_bps >= 8500:
            return "Radiant"
        if reputation_bps >= 7000:
            return "Trusted"
        if reputation_bps >= 5500:
            return "Stable"
        if reputation_bps >= 4000:
            return "Watch"
        return "Fragile"
