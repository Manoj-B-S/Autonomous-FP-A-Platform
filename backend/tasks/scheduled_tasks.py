"""
Autonomous scheduled tasks - run without user intervention
"""
import asyncio
import json
import logging
from datetime import datetime

from tasks.celery_app import celery_app
from core.config import settings

logger = logging.getLogger(__name__)

COMPANIES = [
    {"id": "cloudcrm_inc", "name": "CloudCRM Inc", "industry": "SaaS",
     "annual_revenue": 35_000_000, "growth_rate": 0.45, "gross_margin": 0.72, "headcount": 145},
    {"id": "manufacturetech_co", "name": "ManufactureTech Co", "industry": "Manufacturing",
     "annual_revenue": 95_000_000, "growth_rate": 0.08, "gross_margin": 0.35, "headcount": 380},
    {"id": "healthcaretech", "name": "HealthcareTech Solutions", "industry": "Healthcare IT",
     "annual_revenue": 55_000_000, "growth_rate": 0.25, "gross_margin": 0.55, "headcount": 220},
    {"id": "ecommerce_logistics", "name": "E-commerce Logistics", "industry": "Logistics",
     "annual_revenue": 140_000_000, "growth_rate": 0.15, "gross_margin": 0.22, "headcount": 620},
    {"id": "fintech_payments", "name": "FinTech Payments", "industry": "FinTech",
     "annual_revenue": 28_000_000, "growth_rate": 0.85, "gross_margin": 0.65, "headcount": 110},
    {"id": "industrial_services", "name": "Industrial Services Group", "industry": "Services",
     "annual_revenue": 180_000_000, "growth_rate": 0.05, "gross_margin": 0.28, "headcount": 1200},
]


def run_async(coro):
    """Helper to run coroutines in sync context."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@celery_app.task(name="tasks.scheduled_tasks.run_kpi_monitoring", bind=True, max_retries=3)
def run_kpi_monitoring(self):
    """Daily autonomous KPI monitoring - sends alerts if thresholds breached."""
    logger.info(f"[{datetime.utcnow().isoformat()}] Running autonomous KPI monitoring...")

    async def _run():
        from core.database import AsyncSessionLocal
        from agents.fpa_agents import KPITrackingAgent
        from services.email_service import send_kpi_alert_email
        from sqlalchemy import select
        from models.financial import KPIRecord

        agent = KPITrackingAgent()
        all_alerts = []

        async with AsyncSessionLocal() as session:
            for company in COMPANIES:
                # Get recent KPIs
                result = await session.execute(
                    select(KPIRecord)
                    .where(KPIRecord.company_id == company["id"])
                    .order_by(KPIRecord.period.desc())
                    .limit(30)
                )
                kpis = result.scalars().all()
                kpi_data = [{"kpi_name": k.kpi_name, "value": k.value, "target": k.target,
                              "period": k.period} for k in kpis]

                analysis = await agent.analyze_kpis(session, company, kpi_data)

                for alert in analysis.get("alerts", []):
                    if alert.get("severity") in ("critical", "warning"):
                        all_alerts.append({
                            "company_name": company["name"],
                            "company_id": company["id"],
                            **alert,
                        })

        if all_alerts:
            logger.warning(f"KPI Monitoring: {len(all_alerts)} alerts found")
            await send_kpi_alert_email(all_alerts)
        else:
            logger.info("KPI Monitoring: All KPIs within acceptable ranges")

        return {"alerts_sent": len(all_alerts), "companies_checked": len(COMPANIES)}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(f"KPI monitoring failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="tasks.scheduled_tasks.run_monthly_reforecast", bind=True, max_retries=2)
def run_monthly_reforecast(self):
    """Monthly autonomous reforecast for all portfolio companies."""
    logger.info(f"[{datetime.utcnow().isoformat()}] Running monthly reforecast...")

    async def _run():
        from core.database import AsyncSessionLocal
        from agents.fpa_agents import RevenueForecastingAgent, ExpenseForecastingAgent
        from services.email_service import send_reforecast_summary_email

        rev_agent = RevenueForecastingAgent()
        exp_agent = ExpenseForecastingAgent()
        results = []

        async with AsyncSessionLocal() as session:
            for company in COMPANIES:
                rev = await rev_agent.generate_forecast(session, company)
                exp = await exp_agent.generate_forecast(session, company)
                results.append({
                    "company": company["name"],
                    "annual_forecast": rev.get("annual_forecast", 0),
                    "yoy_growth": rev.get("yoy_growth_rate", 0),
                    "total_opex": exp.get("total_opex", 0),
                })

        await send_reforecast_summary_email(results)
        logger.info(f"Monthly reforecast complete for {len(COMPANIES)} companies")
        return {"companies_reforecasted": len(COMPANIES)}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(f"Monthly reforecast failed: {exc}")
        raise self.retry(exc=exc, countdown=600)


@celery_app.task(name="tasks.scheduled_tasks.send_weekly_portfolio_summary", bind=True, max_retries=2)
def send_weekly_portfolio_summary(self):
    """Weekly portfolio summary email to PE partners and CFOs."""
    logger.info(f"[{datetime.utcnow().isoformat()}] Sending weekly portfolio summary...")

    async def _run():
        from core.database import AsyncSessionLocal
        from agents.fpa_agents import ReportingInsightsAgent
        from services.email_service import send_weekly_summary_email

        agent = ReportingInsightsAgent()
        portfolio_data = [{"company": c} for c in COMPANIES]

        async with AsyncSessionLocal() as session:
            insights = await agent.generate_portfolio_insights(session, portfolio_data)

        await send_weekly_summary_email(insights)
        logger.info("Weekly portfolio summary sent")
        return {"status": "sent", "insights_length": len(insights)}

    try:
        return run_async(_run())
    except Exception as exc:
        logger.error(f"Weekly summary failed: {exc}")
        raise self.retry(exc=exc, countdown=300)


@celery_app.task(name="tasks.scheduled_tasks.run_planning_cycle")
def run_full_planning_cycle():
    """Trigger a full annual planning cycle - can be triggered by event."""

    async def _run():
        from core.database import AsyncSessionLocal
        from agents.fpa_agents import StrategicOrchestratorAgent

        orchestrator = StrategicOrchestratorAgent()
        async with AsyncSessionLocal() as session:
            result = await orchestrator.run_planning_cycle(session, COMPANIES)
        return result

    return run_async(_run())
