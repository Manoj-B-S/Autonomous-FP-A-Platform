"""
Summit Growth Partners - Autonomous FP&A Platform
FastAPI Backend
"""
import asyncio
import json
import logging
from contextlib import asynccontextmanager
from datetime import datetime
from typing import Any

from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware

from api.routes import companies, financials, agents, kpis, scenarios, reports, email_center
from core.config import settings
from core.database import engine, Base
from core.events import event_bus
from tasks.celery_app import celery_app  # noqa: F401 – ensures tasks are registered

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Active WebSocket connections
ws_clients: list[WebSocket] = []


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup / shutdown lifecycle."""
    logger.info("Starting FP&A Platform backend...")
    # Create DB tables
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    # Seed initial data if empty
    from db.seed import seed_database
    await seed_database()

    # Start event bus broadcaster
    asyncio.create_task(broadcast_events())

    logger.info("FP&A Platform ready ✅")
    yield
    logger.info("Shutting down...")


app = FastAPI(
    title="Summit Growth Partners FP&A Platform",
    description="Autonomous FP&A Planning & Scenario Modeling Platform",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(companies.router, prefix="/api/companies", tags=["Companies"])
app.include_router(financials.router, prefix="/api/financials", tags=["Financials"])
app.include_router(agents.router, prefix="/api/agents", tags=["Agents"])
app.include_router(kpis.router, prefix="/api/kpis", tags=["KPIs"])
app.include_router(scenarios.router, prefix="/api/scenarios", tags=["Scenarios"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
app.include_router(email_center.router, prefix="/api/email", tags=["Email"])


async def broadcast_events():
    """Broadcast agent events to all WebSocket clients."""
    async for event in event_bus.subscribe():
        dead = []
        for ws in ws_clients:
            try:
                await ws.send_json(event)
            except Exception:
                dead.append(ws)
        for ws in dead:
            ws_clients.remove(ws)


@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    ws_clients.append(websocket)
    try:
        while True:
            data = await websocket.receive_text()
            # Echo ping/pong
            if data == "ping":
                await websocket.send_text("pong")
    except WebSocketDisconnect:
        ws_clients.remove(websocket)


@app.get("/health")
async def health():
    return {"status": "ok", "timestamp": datetime.utcnow().isoformat()}


@app.get("/api/dashboard/summary")
async def dashboard_summary():
    """Aggregate portfolio summary across all companies."""
    from core.database import AsyncSessionLocal
    from sqlalchemy import select, func
    from models.financial import FinancialRecord
    from models.company import Company

    async with AsyncSessionLocal() as session:
        companies_q = await session.execute(select(Company))
        companies_list = companies_q.scalars().all()

        summary = {
            "total_companies": len(companies_list),
            "total_revenue": 0,
            "total_ebitda": 0,
            "companies": [],
        }

        for company in companies_list:
            # Get latest month revenue & ebitda
            rev_q = await session.execute(
                select(FinancialRecord)
                .where(
                    FinancialRecord.company_id == company.id,
                    FinancialRecord.metric == "revenue",
                )
                .order_by(FinancialRecord.period.desc())
                .limit(1)
            )
            rev = rev_q.scalar_one_or_none()

            ebitda_q = await session.execute(
                select(FinancialRecord)
                .where(
                    FinancialRecord.company_id == company.id,
                    FinancialRecord.metric == "ebitda",
                )
                .order_by(FinancialRecord.period.desc())
                .limit(1)
            )
            ebitda = ebitda_q.scalar_one_or_none()

            rev_val = rev.value if rev else 0
            ebitda_val = ebitda.value if ebitda else 0

            summary["total_revenue"] += rev_val
            summary["total_ebitda"] += ebitda_val
            summary["companies"].append({
                "id": company.id,
                "name": company.name,
                "industry": company.industry,
                "revenue": rev_val,
                "ebitda": ebitda_val,
                "ebitda_margin": (ebitda_val / rev_val * 100) if rev_val else 0,
            })

        summary["ebitda_margin"] = (
            summary["total_ebitda"] / summary["total_revenue"] * 100
            if summary["total_revenue"]
            else 0
        )

        return summary
