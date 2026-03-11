from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
import json
from core.database import get_db
from models.financial import Scenario

router = APIRouter()


class ScenarioCreate(BaseModel):
    company_id: str
    name: str
    scenario_type: str
    assumptions: dict
    results: dict


@router.get("/{company_id}")
async def get_scenarios(company_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(Scenario)
        .where(Scenario.company_id == company_id)
        .order_by(Scenario.created_at.desc())
    )
    scenarios = result.scalars().all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "scenario_type": s.scenario_type,
            "assumptions": json.loads(s.assumptions) if s.assumptions else {},
            "results": json.loads(s.results) if s.results else {},
            "created_at": s.created_at.isoformat(),
        }
        for s in scenarios
    ]


@router.post("/")
async def create_scenario(payload: ScenarioCreate, db: AsyncSession = Depends(get_db)):
    scenario = Scenario(
        company_id=payload.company_id,
        name=payload.name,
        scenario_type=payload.scenario_type,
        assumptions=json.dumps(payload.assumptions),
        results=json.dumps(payload.results),
    )
    db.add(scenario)
    await db.commit()
    await db.refresh(scenario)
    return {"id": scenario.id, "status": "created"}
