from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from typing import Optional
from core.database import get_db
from models.company import Company
from models.financial import AgentActivity, FinancialRecord, KPIRecord, Initiative

router = APIRouter()

COMPANY_META = {
    "cloudcrm_inc": {"id": "cloudcrm_inc", "name": "CloudCRM Inc", "industry": "SaaS",
                     "annual_revenue": 35_000_000, "growth_rate": 0.45, "gross_margin": 0.72, "headcount": 145},
    "manufacturetech_co": {"id": "manufacturetech_co", "name": "ManufactureTech Co", "industry": "Manufacturing",
                           "annual_revenue": 95_000_000, "growth_rate": 0.08, "gross_margin": 0.35, "headcount": 380},
    "healthcaretech": {"id": "healthcaretech", "name": "HealthcareTech Solutions", "industry": "Healthcare IT",
                       "annual_revenue": 55_000_000, "growth_rate": 0.25, "gross_margin": 0.55, "headcount": 220},
    "ecommerce_logistics": {"id": "ecommerce_logistics", "name": "E-commerce Logistics", "industry": "Logistics",
                            "annual_revenue": 140_000_000, "growth_rate": 0.15, "gross_margin": 0.22, "headcount": 620},
    "fintech_payments": {"id": "fintech_payments", "name": "FinTech Payments", "industry": "FinTech",
                         "annual_revenue": 28_000_000, "growth_rate": 0.85, "gross_margin": 0.65, "headcount": 110},
    "industrial_services": {"id": "industrial_services", "name": "Industrial Services Group", "industry": "Services",
                            "annual_revenue": 180_000_000, "growth_rate": 0.05, "gross_margin": 0.28, "headcount": 1200},
}


@router.get("/activity")
async def get_agent_activity(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AgentActivity).order_by(AgentActivity.created_at.desc()).limit(limit)
    )
    activities = result.scalars().all()
    return [
        {
            "id": a.id,
            "agent_name": a.agent_name,
            "company_id": a.company_id,
            "action": a.action,
            "status": a.status,
            "created_at": a.created_at.isoformat(),
        }
        for a in activities
    ]


@router.post("/run/forecast/{company_id}")
async def run_revenue_forecast(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get historical data
    result = await db.execute(
        select(FinancialRecord)
        .where(FinancialRecord.company_id == company_id, FinancialRecord.metric == "revenue")
        .order_by(FinancialRecord.period.desc())
        .limit(12)
    )
    hist = [{"period": r.period, "revenue": r.value} for r in result.scalars().all()]

    from agents.fpa_agents import RevenueForecastingAgent
    agent = RevenueForecastingAgent()
    result = await agent.generate_forecast(db, company, hist)
    return result


@router.post("/run/scenarios/{company_id}")
async def run_scenario_modeling(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    from agents.fpa_agents import ScenarioModelingAgent
    agent = ScenarioModelingAgent()
    result = await agent.create_scenarios(db, company)
    return result


@router.post("/run/kpis/{company_id}")
async def run_kpi_analysis(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    kpi_result = await db.execute(
        select(KPIRecord)
        .where(KPIRecord.company_id == company_id)
        .order_by(KPIRecord.period.desc())
        .limit(30)
    )
    kpi_data = [{"kpi_name": r.kpi_name, "value": r.value, "target": r.target,
                  "period": r.period} for r in kpi_result.scalars().all()]

    from agents.fpa_agents import KPITrackingAgent
    agent = KPITrackingAgent()
    result = await agent.analyze_kpis(db, company, kpi_data)
    return result


@router.post("/run/variance/{company_id}")
async def run_variance_analysis(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get last 2 months for variance
    result = await db.execute(
        select(FinancialRecord)
        .where(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.period.desc())
        .limit(40)
    )
    records = result.scalars().all()
    by_period: dict = {}
    for r in records:
        if r.period not in by_period:
            by_period[r.period] = {}
        by_period[r.period][r.metric] = r.value

    periods_sorted = sorted(by_period.keys(), reverse=True)
    actuals = by_period[periods_sorted[0]] if periods_sorted else {}
    forecast = by_period[periods_sorted[1]] if len(periods_sorted) > 1 else {}

    from agents.fpa_agents import VarianceExplanationAgent
    agent = VarianceExplanationAgent()
    result = await agent.explain_variances(db, company, actuals, forecast)
    return result


@router.post("/run/report/{company_id}")
async def run_monthly_report(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    # Get financial summary
    result = await db.execute(
        select(FinancialRecord)
        .where(FinancialRecord.company_id == company_id)
        .order_by(FinancialRecord.period.desc())
        .limit(40)
    )
    records = result.scalars().all()
    by_period: dict = {}
    for r in records:
        if r.period not in by_period:
            by_period[r.period] = {}
        by_period[r.period][r.metric] = r.value

    latest = next(iter(sorted(by_period.values(), key=lambda x: x.get("period", ""), reverse=True)), {})

    from agents.fpa_agents import ReportingInsightsAgent
    agent = ReportingInsightsAgent()
    result = await agent.generate_monthly_report(db, company, latest)
    return result


@router.post("/run/initiatives/{company_id}")
async def run_initiative_tracking(company_id: str, db: AsyncSession = Depends(get_db)):
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(Initiative).where(Initiative.company_id == company_id)
    )
    initiatives = [
        {"initiative_id": i.id, "name": i.name, "category": i.category,
         "investment": i.investment, "irr": i.irr, "status": i.status}
        for i in result.scalars().all()
    ]

    from agents.fpa_agents import StrategicInitiativeTrackerAgent
    agent = StrategicInitiativeTrackerAgent()
    result = await agent.track_initiatives(db, company, initiatives)
    return result


@router.post("/run/planning-cycle")
async def trigger_planning_cycle(db: AsyncSession = Depends(get_db)):
    """Trigger full autonomous planning cycle."""
    from tasks.scheduled_tasks import run_full_planning_cycle
    task = run_full_planning_cycle.delay()
    return {"task_id": task.id, "status": "started", "message": "Full planning cycle initiated for all 6 companies"}


@router.post("/run/budget/{company_id}")
async def run_budget_validation(company_id: str, db: AsyncSession = Depends(get_db)):
    from models.financial import DepartmentBudget
    company = COMPANY_META.get(company_id)
    if not company:
        raise HTTPException(status_code=404, detail="Company not found")

    result = await db.execute(
        select(DepartmentBudget)
        .where(DepartmentBudget.company_id == company_id)
        .limit(20)
    )
    budgets = [
        {"department": b.department, "category": b.category, "month": b.month, "amount": b.amount}
        for b in result.scalars().all()
    ]

    from agents.fpa_agents import BudgetBuilderAgent
    agent = BudgetBuilderAgent()
    result = await agent.validate_and_build_budget(db, company, budgets)
    return result
