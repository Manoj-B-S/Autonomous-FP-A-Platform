# Summit Growth Partners — Autonomous FP&A Platform

## Overview

A production-grade, autonomous FP&A planning and scenario modeling platform for Summit Growth Partners PE firm. Features **10 AI agents** powered by Claude claude-sonnet-4-20250514 that continuously monitor 6 portfolio companies, generate rolling forecasts, model scenarios, and send stakeholder alerts — all without manual intervention.

## Architecture

```
┌─────────────────────────────────────────────────────┐
│                  React Frontend (Vite)               │
│  Dashboard │ KPIs │ Scenarios │ Agents │ Reports     │
│  Real-time WebSocket Agent Feed                      │
└──────────────────┬──────────────────────────────────┘
                   │ REST + WebSocket
┌──────────────────▼──────────────────────────────────┐
│                FastAPI Backend                       │
│  10 Agents │ Scheduled Tasks │ Email Service         │
│  SQLAlchemy │ Celery │ PostgreSQL │ Redis            │
└─────────────────────────────────────────────────────┘
```

## 10 AI Agents

| # | Agent | Responsibility |
|---|-------|---------------|
| 1 | Strategic Orchestrator | Coordinates all planning across 6 companies |
| 2 | Budget Builder | Validates bottoms-up budgets, flags sandbagging |
| 3 | Revenue Forecasting | 12-month rolling forecasts with driver analysis |
| 4 | Expense Forecasting | OpEx projections with optimization opportunities |
| 5 | Capital Planning | CapEx budgets and ROI analysis |
| 6 | Scenario Modeling | Base/upside/downside with sensitivity analysis |
| 7 | KPI Tracker | Monitors 20+ KPIs, sends threshold alerts |
| 8 | Variance Analyst | Explains forecast vs actual variances |
| 9 | Initiative Tracker | IRR/NPV tracking for strategic initiatives |
| 10 | Reporting & Insights | Monthly board packs, executive memos |

## Autonomous Operations

All scheduled without manual intervention:
- **Every 4 hours**: KPI monitoring across all companies
- **Every Monday 8am**: Weekly portfolio summary email to PE partners
- **1st of month**: Full reforecast for all 6 companies
- **Event-driven**: Variance alerts when actuals miss forecast by >10%

## Portfolio Companies

| Company | Industry | Revenue | Growth |
|---------|----------|---------|--------|
| CloudCRM Inc | SaaS | $35M ARR | 45% YoY |
| ManufactureTech Co | Manufacturing | $95M | 8% |
| HealthcareTech Solutions | Healthcare IT | $55M | 25% |
| E-commerce Logistics | Logistics | $140M | 15% |
| FinTech Payments | FinTech | $28M | 85% |
| Industrial Services Group | Services | $180M | 5% |

## Quick Start (< 15 minutes)

### Prerequisites
- Docker & Docker Compose
- Anthropic API key

### 1. Clone and configure
```bash
git clone <your-repo>
cd fpa-platform
cp .env.example .env
# Edit .env: set ANTHROPIC_API_KEY=your_key_here
```

### 2. Generate sample data
```bash
pip install numpy pandas
python scripts/generate_assignment2_data.py --output data/sample
```

### 3. Start the platform
```bash
docker-compose up --build
```

### 4. Access the platform
- **Frontend**: http://localhost:3000
- **API docs**: http://localhost:8000/docs
- **Health check**: http://localhost:8000/health

The database is auto-seeded from CSV files on first startup (~30 seconds).

## Development (without Docker)

### Backend
```bash
cd backend
pip install -r requirements.txt
uvicorn main:app --reload --port 8000
# In separate terminal:
celery -A tasks.celery_app worker --loglevel=info
celery -A tasks.celery_app beat --loglevel=info
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```

## Key Features

### Dashboard
- Portfolio-level aggregated metrics (revenue, EBITDA, margin)
- Company cards with drill-down to detail views
- Real-time agent activity feed via WebSocket
- One-click "Trigger Planning Cycle" button

### Company Detail
- 18-month revenue/EBITDA/gross profit trend chart
- Run any of 6 agents directly from the UI
- Download PDF board pack or Excel financial model
- AI-powered scenario analysis with side-by-side comparison

### KPI Scorecard
- Full KPI table with color-coded status (red/yellow/green)
- Sparkline trend charts for each KPI
- AI-powered analysis with alerts and recommendations

### Scenario Builder
- Interactive assumption sliders
- AI generates base/upside/downside with probability weighting
- Comparison bar chart with revenue and EBITDA
- Sensitivity analysis (1% revenue → EBITDA impact)

### Reports
- AI-generated monthly report (executive summary, risks, opportunities, EBITDA bridge)
- PDF board pack download (ReportLab)
- Excel financial model export (openpyxl)

### Email Center
- View automated email log
- Send test emails (weekly summary, KPI alert)
- Automated schedule displayed

## Tech Stack

| Layer | Technology |
|-------|-----------|
| AI | Claude claude-sonnet-4-20250514 (Anthropic) |
| Backend | FastAPI + Python 3.11 |
| Database | PostgreSQL 15 + SQLAlchemy 2.0 |
| Cache | Redis 7 |
| Tasks | Celery + Celery Beat |
| Frontend | React 18 + Vite + TypeScript |
| Styling | Tailwind CSS |
| Charts | Recharts |
| State | Zustand |
| Email | SendGrid + Jinja2 |
| PDF | ReportLab |
| Excel | openpyxl |
| Container | Docker + Docker Compose |

## API Documentation

Available at http://localhost:8000/docs (Swagger UI) after startup.

Key endpoints:
- `GET /api/companies/` — List portfolio companies
- `GET /api/financials/{id}/history` — Financial history
- `GET /api/kpis/{id}/latest` — Latest KPI values
- `POST /api/agents/run/forecast/{id}` — Run revenue forecast agent
- `POST /api/agents/run/scenarios/{id}` — Run scenario modeling
- `POST /api/agents/run/planning-cycle` — Trigger full planning cycle
- `GET /api/reports/pdf/{id}` — Download PDF board pack
- `GET /api/reports/excel/{id}` — Download Excel model
- `GET /ws` — WebSocket for real-time agent activity

## Data Files (auto-generated)

```
data/sample/
├── historical_financials/    # 36-month P&L, BS, CF per company
├── department_budgets/       # Department-level budgets
├── kpi_history/              # 36 months of KPI data
├── driver_data/              # Operational metrics
├── initiatives/              # Strategic initiative data
├── strategic_plans/          # JSON plans per company
└── market_benchmarks/        # Industry benchmark data
```

## Financial Model Logic

### Revenue Forecasting
- Trend-based projection using historical growth rates
- Industry-specific seasonality factors applied
- Statistical uncertainty modeled (confidence levels)
- Incorporates known drivers (pipeline, churn)

### Scenario Modeling
- **Base**: Historical growth rate maintained
- **Upside**: 30% acceleration, margin expansion
- **Downside**: 50% growth deceleration, margin compression
- Weighted probability: Base 60%, Upside 25%, Downside 15%

### KPI Thresholds
- 🟢 Green: Within 5% of target
- 🟡 Yellow: 5-15% below target
- 🔴 Red: >15% below target → triggers email alert

### Variance Analysis
- Revenue, EBITDA variance vs prior period
- Categorized by: volume, price, mix, timing, cost
- Materiality threshold: >5% or >$100K triggers board alert

## Known Limitations

- Without a valid Anthropic API key, agent endpoints return synthetic fallback data
- Celery Beat requires Redis to be running for scheduled jobs
- SendGrid key optional — without it, emails are logged to DB only
- No authentication (single-user local deployment per requirements)

## Bonus Features Implemented

- ✅ PDF board pack generation (ReportLab)
- ✅ Excel export with styled headers
- ✅ Real-time WebSocket agent activity feed
- ✅ Celery Beat autonomous scheduling
- ✅ Variance alert email triggers
- ✅ Interactive assumption sliders in Scenario Builder
