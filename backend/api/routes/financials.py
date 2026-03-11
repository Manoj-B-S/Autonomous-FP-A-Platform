from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from core.database import get_db
from models.financial import FinancialRecord, DepartmentBudget

router = APIRouter()


@router.get("/{company_id}/history")
async def get_financial_history(
    company_id: str,
    metric: Optional[str] = Query(None),
    periods: int = Query(36),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(FinancialRecord)
        .where(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.period.desc())
        .limit(periods * 20 if not metric else periods)
    )
    if metric:
        query = query.where(FinancialRecord.metric == metric)

    result = await db.execute(query)
    records = result.scalars().all()

    # Group by period
    by_period: dict = {}
    for r in records:
        if r.period not in by_period:
            by_period[r.period] = {"period": r.period}
        by_period[r.period][r.metric] = r.value

    sorted_periods = sorted(by_period.values(), key=lambda x: x["period"])
    return sorted_periods


@router.get("/{company_id}/summary")
async def get_financial_summary(company_id: str, db: AsyncSession = Depends(get_db)):
    """Latest month financial snapshot."""
    result = await db.execute(
        select(FinancialRecord)
        .where(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.period.desc())
        .limit(100)
    )
    records = result.scalars().all()

    if not records:
        return {}

    latest_period = records[0].period
    latest = {r.metric: r.value for r in records if r.period == latest_period}

    # Prior period for YoY
    prior_records = [r for r in records if r.period < latest_period]
    prior_period = prior_records[0].period if prior_records else None
    prior = {r.metric: r.value for r in prior_records if r.period == prior_period}

    def pct_change(curr, prev):
        if prev and prev != 0:
            return (curr - prev) / abs(prev)
        return 0

    return {
        "period": latest_period,
        "revenue": latest.get("revenue", 0),
        "gross_profit": latest.get("gross_profit", 0),
        "ebitda": latest.get("ebitda", 0),
        "net_income": latest.get("net_income", 0),
        "gross_margin": latest.get("gross_profit", 0) / max(latest.get("revenue", 1), 1),
        "ebitda_margin": latest.get("ebitda", 0) / max(latest.get("revenue", 1), 1),
        "revenue_mom_change": pct_change(
            latest.get("revenue", 0), prior.get("revenue", 0)
        ),
        "ebitda_mom_change": pct_change(
            latest.get("ebitda", 0), prior.get("ebitda", 0)
        ),
        "cash": latest.get("cash", 0),
        "total_assets": latest.get("total_assets", 0),
        "accounts_receivable": latest.get("accounts_receivable", 0),
    }


@router.get("/{company_id}/budget")
async def get_department_budgets(company_id: str, year: int = 2026, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(DepartmentBudget)
        .where(
            DepartmentBudget.company_id == company_id,
            DepartmentBudget.year == year,
        )
        .order_by(DepartmentBudget.department, DepartmentBudget.month)
    )
    budgets = result.scalars().all()

    # Aggregate by department
    by_dept: dict = {}
    for b in budgets:
        if b.department not in by_dept:
            by_dept[b.department] = {"department": b.department, "categories": {}, "total": 0}
        if b.category not in by_dept[b.department]["categories"]:
            by_dept[b.department]["categories"][b.category] = 0
        by_dept[b.department]["categories"][b.category] += b.amount
        by_dept[b.department]["total"] += b.amount

    return list(by_dept.values())
