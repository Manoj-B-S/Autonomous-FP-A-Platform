from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_db
from models.company import Company

router = APIRouter()


@router.get("/")
async def list_companies(db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company))
    companies = result.scalars().all()
    return [
        {
            "id": c.id,
            "name": c.name,
            "industry": c.industry,
            "annual_revenue": c.annual_revenue,
            "growth_rate": c.growth_rate,
            "gross_margin": c.gross_margin,
            "headcount": c.headcount,
            "founded_year": c.founded_year,
            "description": c.description,
        }
        for c in companies
    ]


@router.get("/{company_id}")
async def get_company(company_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Company).where(Company.id == company_id))
    company = result.scalar_one_or_none()
    if not company:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Company not found")
    return {
        "id": company.id,
        "name": company.name,
        "industry": company.industry,
        "annual_revenue": company.annual_revenue,
        "growth_rate": company.growth_rate,
        "gross_margin": company.gross_margin,
        "headcount": company.headcount,
        "founded_year": company.founded_year,
        "description": company.description,
    }
