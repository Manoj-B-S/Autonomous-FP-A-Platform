"""Seed the database from generated CSV/JSON files."""
import json
import logging
import os
from pathlib import Path

import pandas as pd
from sqlalchemy import select

from core.config import settings
from core.database import AsyncSessionLocal
from models.company import Company
from models.financial import (
    FinancialRecord, DepartmentBudget, KPIRecord, Initiative
)

logger = logging.getLogger(__name__)

COMPANY_META = {
    "cloudcrm_inc": {
        "name": "CloudCRM Inc",
        "industry": "SaaS",
        "annual_revenue": 35_000_000,
        "growth_rate": 0.45,
        "gross_margin": 0.72,
        "headcount": 145,
        "founded_year": 2019,
        "description": "High-growth SaaS CRM platform with $35M ARR",
    },
    "manufacturetech_co": {
        "name": "ManufactureTech Co",
        "industry": "Manufacturing",
        "annual_revenue": 95_000_000,
        "growth_rate": 0.08,
        "gross_margin": 0.35,
        "headcount": 380,
        "founded_year": 2008,
        "description": "Contract manufacturing with stable cyclical growth",
    },
    "healthcaretech": {
        "name": "HealthcareTech Solutions",
        "industry": "Healthcare IT",
        "annual_revenue": 55_000_000,
        "growth_rate": 0.25,
        "gross_margin": 0.55,
        "headcount": 220,
        "founded_year": 2016,
        "description": "Healthcare IT services platform with strong NRR",
    },
    "ecommerce_logistics": {
        "name": "E-commerce Logistics",
        "industry": "Logistics",
        "annual_revenue": 140_000_000,
        "growth_rate": 0.15,
        "gross_margin": 0.22,
        "headcount": 620,
        "founded_year": 2013,
        "description": "Fulfillment & logistics with strong Q4 seasonality",
    },
    "fintech_payments": {
        "name": "FinTech Payments",
        "industry": "FinTech",
        "annual_revenue": 28_000_000,
        "growth_rate": 0.85,
        "gross_margin": 0.65,
        "headcount": 110,
        "founded_year": 2021,
        "description": "Hyper-growth payment processing startup",
    },
    "industrial_services": {
        "name": "Industrial Services Group",
        "industry": "Services",
        "annual_revenue": 180_000_000,
        "growth_rate": 0.05,
        "gross_margin": 0.28,
        "headcount": 1200,
        "founded_year": 2001,
        "description": "Mature facilities management company",
    },
}


async def seed_database():
    data_dir = Path(settings.data_dir)
    if not data_dir.exists():
        logger.warning(f"Data directory {data_dir} not found. Skipping seed.")
        return

    async with AsyncSessionLocal() as session:
        # Check if already seeded
        result = await session.execute(select(Company).limit(1))
        if result.scalar_one_or_none():
            logger.info("Database already seeded.")
            return

        logger.info("Seeding database from CSV files...")

        # 1. Companies
        for company_id, meta in COMPANY_META.items():
            company = Company(id=company_id, **meta)
            session.add(company)
        await session.commit()
        logger.info(f"Seeded {len(COMPANY_META)} companies")

        # 2. Historical Financials
        hist_file = data_dir / "historical_financials" / "historical_financials.csv"
        if hist_file.exists():
            df = pd.read_csv(hist_file)
            records = []
            for _, row in df.iterrows():
                records.append(FinancialRecord(
                    company_id=row["company"],
                    period=row["period"],
                    metric=row["metric"],
                    value=float(row["value"]),
                ))
            session.add_all(records)
            await session.commit()
            logger.info(f"Seeded {len(records)} financial records")

        # 3. Department Budgets
        budget_file = data_dir / "department_budgets" / "department_budgets.csv"
        if budget_file.exists():
            df = pd.read_csv(budget_file)
            records = []
            months = ["jan", "feb", "mar", "apr", "may", "jun",
                      "jul", "aug", "sep", "oct", "nov", "dec"]
            for _, row in df.iterrows():
                for i, mon in enumerate(months, 1):
                    if mon in df.columns:
                        records.append(DepartmentBudget(
                            company_id=row["company"],
                            department=row["department"],
                            category=row["category"],
                            month=i,
                            year=2026,
                            amount=float(row[mon]) if pd.notna(row.get(mon, 0)) else 0,
                        ))
            session.add_all(records)
            await session.commit()
            logger.info(f"Seeded {len(records)} budget records")

        # 4. KPI History
        kpi_file = data_dir / "kpi_history" / "kpi_history.csv"
        if kpi_file.exists():
            df = pd.read_csv(kpi_file)
            records = []
            for _, row in df.iterrows():
                records.append(KPIRecord(
                    company_id=row["company"],
                    period=row["period"],
                    kpi_name=row["kpi_name"],
                    value=float(row["value"]),
                    target=float(row["target"]) if pd.notna(row.get("target")) else None,
                ))
            session.add_all(records)
            await session.commit()
            logger.info(f"Seeded {len(records)} KPI records")

        # 5. Strategic Initiatives
        init_file = data_dir / "initiatives" / "initiatives.csv"
        if init_file.exists():
            df = pd.read_csv(init_file)
            records = []
            for _, row in df.iterrows():
                records.append(Initiative(
                    id=row["initiative_id"],
                    company_id=row["company"],
                    name=row["name"],
                    category=row["category"],
                    start_date=str(row["start_date"]),
                    investment=float(row["investment"]),
                    annual_revenue_impact=float(row["annual_revenue_impact"]),
                    irr=float(row["irr"]),
                    status=row["status"],
                ))
            session.add_all(records)
            await session.commit()
            logger.info(f"Seeded {len(records)} initiatives")

        logger.info("✅ Database seeding complete!")
