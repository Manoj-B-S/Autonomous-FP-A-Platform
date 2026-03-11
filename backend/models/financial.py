from sqlalchemy import Column, String, Float, Integer, DateTime, ForeignKey, UniqueConstraint
from datetime import datetime
from core.database import Base


class FinancialRecord(Base):
    __tablename__ = "financial_records"
    __table_args__ = (
        UniqueConstraint("company_id", "period", "metric", name="uq_financial_record"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    period = Column(String, nullable=False)  # YYYY-MM
    metric = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class DepartmentBudget(Base):
    __tablename__ = "department_budgets"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    department = Column(String, nullable=False)
    category = Column(String, nullable=False)
    month = Column(Integer, nullable=False)  # 1-12
    year = Column(Integer, nullable=False)
    amount = Column(Float, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)


class KPIRecord(Base):
    __tablename__ = "kpi_records"
    __table_args__ = (
        UniqueConstraint("company_id", "period", "kpi_name", name="uq_kpi_record"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    period = Column(String, nullable=False)
    kpi_name = Column(String, nullable=False)
    value = Column(Float, nullable=False)
    target = Column(Float)
    created_at = Column(DateTime, default=datetime.utcnow)


class Scenario(Base):
    __tablename__ = "scenarios"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    scenario_type = Column(String, nullable=False)  # base/upside/downside
    assumptions = Column(String)  # JSON string
    results = Column(String)  # JSON string
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)


class AgentActivity(Base):
    __tablename__ = "agent_activities"

    id = Column(Integer, primary_key=True, autoincrement=True)
    agent_name = Column(String, nullable=False)
    company_id = Column(String, ForeignKey("companies.id"))
    action = Column(String, nullable=False)
    result = Column(String)  # JSON
    status = Column(String, default="running")  # running/completed/failed
    created_at = Column(DateTime, default=datetime.utcnow)


class EmailLog(Base):
    __tablename__ = "email_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    to_email = Column(String, nullable=False)
    subject = Column(String, nullable=False)
    body_preview = Column(String)
    email_type = Column(String)
    company_id = Column(String)
    status = Column(String, default="sent")
    created_at = Column(DateTime, default=datetime.utcnow)


class Initiative(Base):
    __tablename__ = "initiatives"

    id = Column(String, primary_key=True)
    company_id = Column(String, ForeignKey("companies.id"), nullable=False)
    name = Column(String, nullable=False)
    category = Column(String)
    start_date = Column(String)
    investment = Column(Float, default=0)
    annual_revenue_impact = Column(Float, default=0)
    irr = Column(Float, default=0)
    status = Column(String, default="Planning")
    created_at = Column(DateTime, default=datetime.utcnow)
