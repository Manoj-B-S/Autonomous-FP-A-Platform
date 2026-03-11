from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from pydantic import BaseModel
from core.database import get_db
from models.financial import EmailLog

router = APIRouter()


class SendEmailRequest(BaseModel):
    email_type: str
    company_id: str = ""
    to_email: str = "cfo@summitgrowthpartners.com"


@router.get("/logs")
async def get_email_logs(limit: int = 50, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(EmailLog).order_by(EmailLog.created_at.desc()).limit(limit)
    )
    logs = result.scalars().all()
    return [
        {
            "id": l.id,
            "to_email": l.to_email,
            "subject": l.subject,
            "email_type": l.email_type,
            "company_id": l.company_id,
            "status": l.status,
            "created_at": l.created_at.isoformat(),
        }
        for l in logs
    ]


@router.post("/send/test")
async def send_test_email(req: SendEmailRequest, db: AsyncSession = Depends(get_db)):
    """Manually trigger a test email send."""
    from services.email_service import send_weekly_summary_email, send_kpi_alert_email
    from core.config import settings

    if req.email_type == "weekly_summary":
        await send_weekly_summary_email(
            "Test weekly summary: All 6 portfolio companies performing in line with expectations. "
            "CloudCRM leading with 45% growth. FinTech Payments hyper-growing at 85%. "
            "Industrial Services stable. No critical KPI alerts this week."
        )
    elif req.email_type == "kpi_alert":
        await send_kpi_alert_email([
            {"company_name": "CloudCRM Inc", "kpi": "Churn Rate", "severity": "critical",
             "message": "Churn rate at 5.2%, exceeding 3.5% target by 49%."},
            {"company_name": "FinTech Payments", "kpi": "CAC", "severity": "warning",
             "message": "Customer Acquisition Cost up 22% MoM, approaching budget limit."},
        ])

    return {"status": "sent", "email_type": req.email_type, "to": req.to_email}
