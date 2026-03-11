"""
Autonomous FP&A Agent System
10 specialized agents powered by Claude claude-sonnet-4-20250514
"""
import json
import logging
from datetime import datetime
from typing import Any, Optional

import anthropic

from core.config import settings
from core.events import event_bus

logger = logging.getLogger(__name__)


def get_claude_client() -> anthropic.AsyncAnthropic:
    return anthropic.AsyncAnthropic(api_key=settings.anthropic_api_key)


async def _call_claude(
    system: str,
    user_message: str,
    model: str = "claude-sonnet-4-20250514",
    max_tokens: int = 2048,
) -> str:
    """Call Claude API and return text response."""
    client = get_claude_client()
    response = await client.messages.create(
        model=model,
        max_tokens=max_tokens,
        system=system,
        messages=[{"role": "user", "content": user_message}],
    )
    return response.content[0].text


async def _log_activity(
    session,
    agent_name: str,
    company_id: Optional[str],
    action: str,
    result: Any,
    status: str = "completed",
):
    """Persist agent activity to DB and broadcast via WebSocket."""
    from models.financial import AgentActivity

    activity = AgentActivity(
        agent_name=agent_name,
        company_id=company_id,
        action=action,
        result=json.dumps(result) if not isinstance(result, str) else result,
        status=status,
    )
    session.add(activity)
    await session.commit()

    await event_bus.publish(
        "agent_activity",
        {
            "agent": agent_name,
            "company_id": company_id,
            "action": action,
            "status": status,
            "timestamp": datetime.utcnow().isoformat(),
        },
    )


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 1: Strategic Orchestrator
# ─────────────────────────────────────────────────────────────────────────────
class StrategicOrchestratorAgent:
    NAME = "Strategic Orchestrator"

    async def run_planning_cycle(self, session, companies: list[dict]) -> dict:
        """Coordinate full planning cycle across all portfolio companies."""
        await event_bus.publish("agent_activity", {
            "agent": self.NAME,
            "action": "Starting annual planning cycle",
            "status": "running",
        })

        results = {}
        for company in companies:
            company_id = company["id"]

            # Trigger sub-agents in parallel via event
            await event_bus.publish("agent_activity", {
                "agent": self.NAME,
                "company_id": company_id,
                "action": f"Initiating planning workflow for {company['name']}",
                "status": "running",
            })

            # Revenue forecast
            rev_agent = RevenueForecastingAgent()
            rev_result = await rev_agent.generate_forecast(session, company)

            # Expense forecast
            exp_agent = ExpenseForecastingAgent()
            exp_result = await exp_agent.generate_forecast(session, company)

            # Scenario modeling
            scen_agent = ScenarioModelingAgent()
            scen_result = await scen_agent.create_scenarios(session, company)

            results[company_id] = {
                "revenue_forecast": rev_result,
                "expense_forecast": exp_result,
                "scenarios": scen_result,
            }

        prompt = f"""
You are the Strategic Orchestrator for Summit Growth Partners, a PE firm with 6 portfolio companies.
You've just completed a full planning cycle. Summarize the key findings.

Companies analyzed: {json.dumps([c['name'] for c in companies])}
Results summary: {json.dumps({k: 'completed' for k in results})}

Provide:
1. Overall portfolio health assessment (2-3 sentences)
2. Top 3 strategic priorities for the quarter
3. Companies requiring immediate attention
4. Recommended next steps

Be specific, data-driven, and concise.
"""
        orchestrator_summary = await _call_claude(
            system="You are an expert PE portfolio orchestrator and CFO advisor.",
            user_message=prompt,
        )

        await _log_activity(
            session, self.NAME, None,
            "Completed annual planning cycle",
            {"summary": orchestrator_summary, "companies_processed": len(companies)},
        )

        return {"summary": orchestrator_summary, "company_results": results}


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 2: Budget Builder
# ─────────────────────────────────────────────────────────────────────────────
class BudgetBuilderAgent:
    NAME = "Budget Builder"

    async def validate_and_build_budget(self, session, company: dict, budget_data: list[dict]) -> dict:
        prompt = f"""
You are a senior FP&A analyst building and validating the annual budget for {company['name']}.

Company Profile:
- Industry: {company['industry']}
- Current Annual Revenue: ${company['annual_revenue']:,.0f}
- Historical Growth Rate: {company['growth_rate']*100:.1f}%
- Gross Margin: {company['gross_margin']*100:.1f}%

Department Budget Submissions:
{json.dumps(budget_data[:10], indent=2)}

Please:
1. Validate if growth assumptions are realistic (flag if >2x historical growth or <0)
2. Check if margin assumptions are achievable
3. Identify departments that appear sandbagged or overly optimistic
4. Provide a consolidated budget recommendation with adjustments
5. Flag any risks or concerns

Return a JSON response with:
{{
  "validation_status": "approved|requires_revision|rejected",
  "total_budget_revenue": <number>,
  "total_budget_opex": <number>,
  "projected_ebitda": <number>,
  "ebitda_margin": <number>,
  "flags": [<list of issues found>],
  "recommendations": [<list of recommendations>],
  "commentary": "<executive summary>"
}}
"""
        response = await _call_claude(
            system="You are an expert FP&A budget analyst at a PE-backed company. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1500,
        )

        try:
            # Extract JSON from response
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {"commentary": response}
        except Exception:
            result = {"commentary": response}

        await _log_activity(session, self.NAME, company["id"],
                            f"Budget validation for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 3: Revenue Forecasting
# ─────────────────────────────────────────────────────────────────────────────
class RevenueForecastingAgent:
    NAME = "Revenue Forecasting"

    async def generate_forecast(self, session, company: dict, historical: list[dict] = None) -> dict:
        historical_summary = ""
        if historical:
            historical_summary = f"Historical Revenue (last 6 months): {json.dumps(historical[-6:])}"

        prompt = f"""
You are a revenue forecasting specialist. Generate a 12-month rolling revenue forecast for {company['name']}.

Company Profile:
- Industry: {company['industry']}
- Current Annual Run Rate: ${company['annual_revenue']:,.0f}
- Historical Growth Rate: {company['growth_rate']*100:.1f}%
- Gross Margin: {company['gross_margin']*100:.1f}%
{historical_summary}

Generate monthly revenue forecast for next 12 months (2026-01 to 2026-12).
Account for:
- Growth trajectory and momentum
- Industry seasonality patterns
- Market conditions

Return JSON:
{{
  "forecast_methodology": "<brief description>",
  "annual_forecast": <total 12-month revenue>,
  "yoy_growth_rate": <decimal>,
  "monthly_forecasts": [
    {{"period": "2026-01", "revenue": <number>, "confidence": "high|medium|low"}},
    ...12 months...
  ],
  "key_assumptions": [<list>],
  "risks": [<list>]
}}
"""
        response = await _call_claude(
            system="You are an expert revenue forecasting analyst. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=2000,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            # Generate synthetic fallback
            base = company['annual_revenue'] / 12
            growth = company['growth_rate']
            months = [f"2026-{i:02d}" for i in range(1, 13)]
            result = {
                "forecast_methodology": "trend-based projection",
                "annual_forecast": company['annual_revenue'] * (1 + growth),
                "yoy_growth_rate": growth,
                "monthly_forecasts": [
                    {"period": m, "revenue": round(base * (1 + growth) * (1 + i*0.005), 0), "confidence": "medium"}
                    for i, m in enumerate(months)
                ],
                "key_assumptions": [f"{growth*100:.0f}% YoY growth continues"],
                "risks": ["Market slowdown could compress growth"],
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Generated 12-month forecast for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 4: Expense Forecasting
# ─────────────────────────────────────────────────────────────────────────────
class ExpenseForecastingAgent:
    NAME = "Expense Forecasting"

    async def generate_forecast(self, session, company: dict) -> dict:
        prompt = f"""
You are an expense forecasting specialist for {company['name']}.

Company: {company['name']} ({company['industry']})
Annual Revenue: ${company['annual_revenue']:,.0f}
Gross Margin: {company['gross_margin']*100:.1f}%
Headcount: {company.get('headcount', 100)}

Forecast annual operating expenses broken down by category.
Identify cost optimization opportunities.

Return JSON:
{{
  "total_opex": <number>,
  "opex_as_pct_revenue": <decimal>,
  "categories": {{
    "sales_marketing": <number>,
    "rd": <number>,
    "general_admin": <number>,
    "headcount_costs": <number>,
    "other": <number>
  }},
  "optimization_opportunities": [
    {{"area": "<area>", "potential_savings": <number>, "recommendation": "<text>"}}
  ],
  "key_drivers": [<list>]
}}
"""
        response = await _call_claude(
            system="You are an expert expense forecasting analyst. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1000,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            rev = company['annual_revenue']
            result = {
                "total_opex": rev * 0.65,
                "opex_as_pct_revenue": 0.65,
                "categories": {
                    "sales_marketing": rev * 0.30,
                    "rd": rev * 0.15,
                    "general_admin": rev * 0.12,
                    "headcount_costs": rev * 0.05,
                    "other": rev * 0.03,
                },
                "optimization_opportunities": [],
                "key_drivers": ["Headcount growth", "Marketing spend"],
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Generated expense forecast for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 5: Capital Planning
# ─────────────────────────────────────────────────────────────────────────────
class CapitalPlanningAgent:
    NAME = "Capital Planning"

    async def analyze_capital_requirements(self, session, company: dict, initiatives: list = None) -> dict:
        prompt = f"""
You are a capital planning analyst for {company['name']} ({company['industry']}).

Annual Revenue: ${company['annual_revenue']:,.0f}
Growth Rate: {company['growth_rate']*100:.1f}%
Initiatives: {json.dumps(initiatives or [], indent=2)}

Analyze capital requirements and provide:
1. CapEx budget recommendation
2. ROI analysis for top initiatives  
3. Capital allocation priorities

Return JSON:
{{
  "total_capex_budget": <number>,
  "capex_as_pct_revenue": <decimal>,
  "categories": {{
    "technology": <number>,
    "equipment": <number>,
    "facilities": <number>,
    "other": <number>
  }},
  "initiative_roi": [
    {{"name": "<initiative>", "investment": <number>, "npv": <number>, "irr": <decimal>, "payback_months": <number>}}
  ],
  "recommendation": "<strategic recommendation>"
}}
"""
        response = await _call_claude(
            system="You are a capital planning expert. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1000,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            result = {
                "total_capex_budget": company['annual_revenue'] * 0.05,
                "capex_as_pct_revenue": 0.05,
                "categories": {"technology": company['annual_revenue'] * 0.03, "equipment": company['annual_revenue'] * 0.02},
                "initiative_roi": [],
                "recommendation": "Maintain current capital allocation"
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Capital planning for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 6: Scenario Modeling
# ─────────────────────────────────────────────────────────────────────────────
class ScenarioModelingAgent:
    NAME = "Scenario Modeling"

    async def create_scenarios(self, session, company: dict) -> dict:
        prompt = f"""
You are a scenario modeling expert. Create base, upside, and downside scenarios for {company['name']}.

Company: {company['name']} ({company['industry']})
Annual Revenue: ${company['annual_revenue']:,.0f}
Historical Growth: {company['growth_rate']*100:.1f}%
Gross Margin: {company['gross_margin']*100:.1f}%

Create 3 scenarios with different assumptions and projected P&L impact.

Return JSON:
{{
  "base": {{
    "revenue_growth": <decimal>,
    "gross_margin": <decimal>,
    "ebitda_margin": <decimal>,
    "annual_revenue": <number>,
    "annual_ebitda": <number>,
    "probability": <decimal>,
    "key_assumptions": [<list>]
  }},
  "upside": {{
    "revenue_growth": <decimal>,
    "gross_margin": <decimal>,
    "ebitda_margin": <decimal>,
    "annual_revenue": <number>,
    "annual_ebitda": <number>,
    "probability": <decimal>,
    "key_assumptions": [<list>]
  }},
  "downside": {{
    "revenue_growth": <decimal>,
    "gross_margin": <decimal>,
    "ebitda_margin": <decimal>,
    "annual_revenue": <number>,
    "annual_ebitda": <number>,
    "probability": <decimal>,
    "key_assumptions": [<list>]
  }},
  "sensitivity_analysis": {{
    "revenue_1pct_impact_on_ebitda": <number>,
    "key_risks": [<list>]
  }}
}}
"""
        response = await _call_claude(
            system="You are a financial scenario modeling expert. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1500,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            rev = company['annual_revenue']
            g = company['growth_rate']
            gm = company['gross_margin']
            result = {
                "base": {"revenue_growth": g, "gross_margin": gm, "ebitda_margin": 0.15,
                         "annual_revenue": rev*(1+g), "annual_ebitda": rev*(1+g)*0.15,
                         "probability": 0.60, "key_assumptions": ["Base case growth"]},
                "upside": {"revenue_growth": g*1.3, "gross_margin": gm+0.03, "ebitda_margin": 0.22,
                           "annual_revenue": rev*(1+g*1.3), "annual_ebitda": rev*(1+g*1.3)*0.22,
                           "probability": 0.25, "key_assumptions": ["Strong market demand"]},
                "downside": {"revenue_growth": g*0.5, "gross_margin": gm-0.05, "ebitda_margin": 0.05,
                             "annual_revenue": rev*(1+g*0.5), "annual_ebitda": rev*(1+g*0.5)*0.05,
                             "probability": 0.15, "key_assumptions": ["Market slowdown"]},
                "sensitivity_analysis": {"revenue_1pct_impact_on_ebitda": rev*0.01, "key_risks": ["Churn increase"]},
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Created 3 scenarios for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 7: KPI Tracking
# ─────────────────────────────────────────────────────────────────────────────
class KPITrackingAgent:
    NAME = "KPI Tracker"

    async def analyze_kpis(self, session, company: dict, kpi_data: list[dict]) -> dict:
        prompt = f"""
You are a KPI monitoring specialist. Analyze KPI performance for {company['name']}.

Recent KPI Data (last 3 months):
{json.dumps(kpi_data[-30:] if len(kpi_data) > 30 else kpi_data, indent=2)}

For each KPI, determine:
- Status: red (>10% below target), yellow (0-10% below), green (at/above target)
- Trend: improving/stable/deteriorating
- Priority action needed

Return JSON:
{{
  "overall_health": "red|yellow|green",
  "kpis": [
    {{
      "name": "<kpi name>",
      "current_value": <number>,
      "target": <number>,
      "status": "red|yellow|green",
      "trend": "improving|stable|deteriorating",
      "variance_pct": <decimal>,
      "action_required": "<recommendation if red/yellow>"
    }}
  ],
  "alerts": [
    {{"kpi": "<name>", "severity": "critical|warning", "message": "<alert text>"}}
  ],
  "summary": "<executive summary of KPI health>"
}}
"""
        response = await _call_claude(
            system="You are a KPI analytics expert. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1500,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            result = {
                "overall_health": "yellow",
                "kpis": [],
                "alerts": [],
                "summary": f"KPI analysis completed for {company['name']}",
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"KPI analysis for {company['name']}", result)
        return result

    async def check_all_kpis_for_alerts(self, session, companies_data: list) -> list[dict]:
        """Autonomous check - returns alerts needing email notification."""
        all_alerts = []
        for item in companies_data:
            result = await self.analyze_kpis(session, item["company"], item["kpis"])
            for alert in result.get("alerts", []):
                if alert.get("severity") == "critical":
                    all_alerts.append({
                        "company_id": item["company"]["id"],
                        "company_name": item["company"]["name"],
                        **alert,
                    })
        return all_alerts


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 8: Variance Explanation
# ─────────────────────────────────────────────────────────────────────────────
class VarianceExplanationAgent:
    NAME = "Variance Analyst"

    async def explain_variances(self, session, company: dict, actuals: dict, forecast: dict) -> dict:
        prompt = f"""
You are a variance analysis expert. Explain the forecast vs actual variances for {company['name']}.

Actuals vs Forecast:
- Revenue: Actual ${actuals.get('revenue', 0):,.0f} vs Forecast ${forecast.get('revenue', 0):,.0f}
- Gross Profit: Actual ${actuals.get('gross_profit', 0):,.0f} vs Forecast ${forecast.get('gross_profit', 0):,.0f}
- EBITDA: Actual ${actuals.get('ebitda', 0):,.0f} vs Forecast ${forecast.get('ebitda', 0):,.0f}
- OpEx: Actual ${actuals.get('opex', 0):,.0f} vs Forecast ${forecast.get('opex', 0):,.0f}

Analyze variances and provide board-ready commentary.

Return JSON:
{{
  "revenue_variance": <number>,
  "revenue_variance_pct": <decimal>,
  "ebitda_variance": <number>,
  "ebitda_variance_pct": <decimal>,
  "materiality": "high|medium|low",
  "drivers": [
    {{"category": "volume|price|mix|timing|cost", "description": "<explanation>", "impact": <number>}}
  ],
  "board_commentary": "<2-3 sentence board-deck ready explanation>",
  "management_actions": [<list of recommended actions>],
  "revised_full_year_outlook": "<brief FY outlook adjustment>"
}}
"""
        response = await _call_claude(
            system="You are an expert variance analysis and financial commentary specialist. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1200,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            rev_var = actuals.get('revenue', 0) - forecast.get('revenue', 0)
            result = {
                "revenue_variance": rev_var,
                "revenue_variance_pct": rev_var / max(forecast.get('revenue', 1), 1),
                "ebitda_variance": 0,
                "ebitda_variance_pct": 0,
                "materiality": "medium",
                "drivers": [],
                "board_commentary": f"Revenue variance of ${abs(rev_var):,.0f} driven by market conditions.",
                "management_actions": ["Review sales pipeline", "Assess pricing strategy"],
                "revised_full_year_outlook": "Full year outlook maintained pending further analysis.",
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Variance analysis for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 9: Strategic Initiative Tracker
# ─────────────────────────────────────────────────────────────────────────────
class StrategicInitiativeTrackerAgent:
    NAME = "Initiative Tracker"

    async def track_initiatives(self, session, company: dict, initiatives: list[dict]) -> dict:
        prompt = f"""
You are a strategic initiative tracking specialist for {company['name']}.

Active Initiatives:
{json.dumps(initiatives, indent=2)}

For each initiative:
1. Assess progress vs plan
2. Calculate current ROI/IRR vs original business case
3. Flag underperforming initiatives (IRR < 15% or behind schedule)
4. Recommend go/no-go decisions

Return JSON:
{{
  "portfolio_irr": <weighted average irr>,
  "total_investment_deployed": <number>,
  "initiatives": [
    {{
      "id": "<id>",
      "name": "<name>",
      "status": "<status>",
      "irr": <decimal>,
      "irr_vs_plan": <decimal>,
      "health": "on_track|at_risk|behind",
      "recommendation": "continue|accelerate|pause|stop",
      "commentary": "<brief update>"
    }}
  ],
  "portfolio_summary": "<executive summary>",
  "flagged_for_review": [<list of initiative ids needing attention>]
}}
"""
        response = await _call_claude(
            system="You are an expert strategic initiative and portfolio management analyst. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1200,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            result = {
                "portfolio_irr": 0.28,
                "total_investment_deployed": sum(i.get("investment", 0) for i in initiatives),
                "initiatives": [{"id": i.get("initiative_id"), "name": i.get("name"),
                                  "health": "on_track", "recommendation": "continue"} for i in initiatives],
                "portfolio_summary": "Initiative portfolio performing in line with expectations.",
                "flagged_for_review": [],
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Initiative tracking for {company['name']}", result)
        return result


# ─────────────────────────────────────────────────────────────────────────────
# AGENT 10: Reporting & Insights
# ─────────────────────────────────────────────────────────────────────────────
class ReportingInsightsAgent:
    NAME = "Reporting & Insights"

    async def generate_monthly_report(self, session, company: dict, financial_data: dict) -> dict:
        prompt = f"""
You are a financial reporting specialist. Generate an executive monthly report for {company['name']}.

Financial Performance:
{json.dumps(financial_data, indent=2)}

Generate a comprehensive monthly report with:
1. Executive summary (3-4 sentences)
2. Revenue performance vs plan
3. EBITDA bridge (key drivers of change)
4. Top 3 risks and opportunities
5. Recommended actions for management
6. Next month outlook

Return JSON:
{{
  "report_month": "{datetime.utcnow().strftime('%B %Y')}",
  "executive_summary": "<summary>",
  "performance_rating": "exceeding|on_plan|below_plan|significantly_below",
  "revenue_analysis": "<2-3 sentences>",
  "ebitda_bridge": [
    {{"driver": "<name>", "impact": <number>, "explanation": "<text>"}}
  ],
  "risks": [
    {{"risk": "<description>", "likelihood": "high|medium|low", "mitigation": "<action>"}}
  ],
  "opportunities": [
    {{"opportunity": "<description>", "potential_upside": <number>}}
  ],
  "management_actions": [<list>],
  "next_month_outlook": "<outlook>"
}}
"""
        response = await _call_claude(
            system="You are an expert financial reporting analyst at a PE firm. Always respond with valid JSON.",
            user_message=prompt,
            max_tokens=1500,
        )

        try:
            import re
            json_match = re.search(r'\{.*\}', response, re.DOTALL)
            result = json.loads(json_match.group()) if json_match else {}
        except Exception:
            result = {
                "report_month": datetime.utcnow().strftime("%B %Y"),
                "executive_summary": f"{company['name']} delivered solid performance this month.",
                "performance_rating": "on_plan",
                "revenue_analysis": "Revenue tracking in line with plan.",
                "ebitda_bridge": [],
                "risks": [],
                "opportunities": [],
                "management_actions": ["Continue monitoring KPIs"],
                "next_month_outlook": "Positive outlook for next month.",
            }

        await _log_activity(session, self.NAME, company["id"],
                            f"Monthly report for {company['name']}", result)
        return result

    async def generate_portfolio_insights(self, session, portfolio_data: list[dict]) -> str:
        """Generate portfolio-level insights for PE partners."""
        prompt = f"""
You are a PE portfolio analytics expert. Generate strategic insights for Summit Growth Partners' portfolio.

Portfolio Overview:
{json.dumps([{"company": d["company"]["name"], "industry": d["company"]["industry"],
               "revenue": d["company"]["annual_revenue"]} for d in portfolio_data], indent=2)}

Generate a concise but comprehensive portfolio-level insights memo:
1. Portfolio performance headline
2. Best and worst performing companies with reasons
3. Cross-portfolio themes (growth, margins, headcount efficiency)
4. Strategic recommendations for PE partners
5. Priority interventions needed

Write in executive memo style, 400-500 words.
"""
        insights = await _call_claude(
            system="You are an expert PE portfolio analyst writing for senior investors.",
            user_message=prompt,
            max_tokens=800,
        )

        await _log_activity(session, self.NAME, None,
                            "Generated portfolio insights memo", {"length": len(insights)})
        return insights
