from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from typing import Optional
from core.database import get_db
from models.financial import KPIRecord, Scenario, EmailLog, Initiative

router = APIRouter()


@router.get("/{company_id}")
async def get_kpis(
    company_id: str,
    periods: int = Query(12),
    db: AsyncSession = Depends(get_db)
):
    result = await db.execute(
        select(KPIRecord)
        .where(KPIRecord.company_id == company_id)
        .order_by(KPIRecord.period.desc())
        .limit(periods * 10)
    )
    records = result.scalars().all()

    # Group by KPI name
    by_kpi: dict = {}
    for r in records:
        if r.kpi_name not in by_kpi:
            by_kpi[r.kpi_name] = []
        by_kpi[r.kpi_name].append({
            "period": r.period,
            "value": r.value,
            "target": r.target,
            "status": _kpi_status(r.value, r.target),
        })

    return [{"kpi_name": k, "data": sorted(v, key=lambda x: x["period"])}
            for k, v in by_kpi.items()]


@router.get("/{company_id}/latest")
async def get_latest_kpis(company_id: str, db: AsyncSession = Depends(get_db)):
    """Get most recent KPI values with status."""
    result = await db.execute(
        select(KPIRecord)
        .where(KPIRecord.company_id == company_id)
        .order_by(KPIRecord.period.desc())
        .limit(200)
    )
    records = result.scalars().all()

    # Get latest per KPI
    seen = {}
    for r in records:
        if r.kpi_name not in seen:
            seen[r.kpi_name] = r

    return [
        {
            "kpi_name": r.kpi_name,
            "period": r.period,
            "value": r.value,
            "target": r.target,
            "status": _kpi_status(r.value, r.target),
            "variance_pct": ((r.value - r.target) / abs(r.target) * 100) if r.target else 0,
        }
        for r in seen.values()
    ]


def _kpi_status(value: float, target: Optional[float]) -> str:
    if target is None or target == 0:
        return "gray"
    variance_pct = (value - target) / abs(target)
    if variance_pct >= -0.05:
        return "green"
    elif variance_pct >= -0.15:
        return "yellow"
    return "red"
