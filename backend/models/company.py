from sqlalchemy import Column, String, Float, DateTime, Text, Integer, Boolean
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import relationship
from datetime import datetime
from core.database import Base


class Company(Base):
    __tablename__ = "companies"

    id = Column(String, primary_key=True)  # e.g. "cloudcrm_inc"
    name = Column(String, nullable=False)
    industry = Column(String, nullable=False)
    annual_revenue = Column(Float, default=0)
    growth_rate = Column(Float, default=0)
    gross_margin = Column(Float, default=0)
    headcount = Column(Integer, default=0)
    founded_year = Column(Integer, default=2018)
    description = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)
