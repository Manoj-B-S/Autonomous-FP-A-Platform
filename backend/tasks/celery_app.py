"""
Celery tasks - Autonomous background jobs
Scheduled jobs that run without user intervention
"""
import asyncio
import json
import logging
from datetime import datetime

from celery import Celery
from celery.schedules import crontab

from core.config import settings

logger = logging.getLogger(__name__)

celery_app = Celery(
    "fpa_platform",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["tasks.scheduled_tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    timezone="UTC",
    enable_utc=True,
    beat_schedule={
        # Daily KPI monitoring at 6am UTC
        "daily-kpi-monitoring": {
            "task": "tasks.scheduled_tasks.run_kpi_monitoring",
            "schedule": crontab(hour=6, minute=0),
        },
        # Monthly reforecast on 1st of each month
        "monthly-reforecast": {
            "task": "tasks.scheduled_tasks.run_monthly_reforecast",
            "schedule": crontab(day_of_month=1, hour=7, minute=0),
        },
        # Weekly portfolio summary - every Monday 8am
        "weekly-portfolio-summary": {
            "task": "tasks.scheduled_tasks.send_weekly_portfolio_summary",
            "schedule": crontab(day_of_week=1, hour=8, minute=0),
        },
        # Every 4 hours - quick KPI check
        "kpi-check-every-4h": {
            "task": "tasks.scheduled_tasks.run_kpi_monitoring",
            "schedule": crontab(minute=0, hour="*/4"),
        },
    },
)
