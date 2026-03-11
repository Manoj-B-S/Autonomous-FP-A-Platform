import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Bot, Download, TrendingUp, FileText, BarChart2, Target, Zap } from 'lucide-react'
import { financialsApi, agentsApi, reportsApi, downloadBlob } from '../lib/api'
import { useAppStore } from '../store'
import { formatCurrency, formatPct, industryIcon } from '../lib/utils'
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend
} from 'recharts'

export default function CompanyDetail() {
  const { id } = useParams<{ id: string }>()
  const { companies } = useAppStore()
  const company = companies.find(c => c.id === id)

  const [history, setHistory] = useState<any[]>([])
  const [summary, setSummary] = useState<any>(null)
  const [agentResult, setAgentResult] = useState<any>(null)
  const [activeAgent, setActiveAgent] = useState('')
  const [loading, setLoading] = useState(false)
  const [tab, setTab] = useState('financials')

  useEffect(() => {
    if (!id) return
    financialsApi.history(id, undefined, 24).then(r => setHistory(r.data))
    financialsApi.summary(id).then(r => setSummary(r.data))
  }, [id])

  const runAgent = async (agentFn: () => Promise<any>, label: string) => {
    setActiveAgent(label)
    setLoading(true)
    setAgentResult(null)
    try {
      const r = await agentFn()
      setAgentResult({ label, data: r.data })
    } finally {
      setLoading(false)
      setActiveAgent('')
    }
  }

  const downloadPdf = async () => {
    const r = await reportsApi.pdf(id!)
    downloadBlob(r.data, `${id}_board_pack.pdf`)
  }

  const downloadExcel = async () => {
    const r = await reportsApi.excel(id!)
    downloadBlob(r.data, `${id}_financial_model.xlsx`)
  }

  if (!company) return <div className="text-gray-500 p-8">Company not found</div>

  const chartData = history.slice(-18).map(p => ({
    period: p.period?.slice(2),
    revenue: Math.round((p.revenue || 0) / 1000),
    ebitda: Math.round((p.ebitda || 0) / 1000),
    gross_profit: Math.round((p.gross_profit || 0) / 1000),
  }))

  const AGENTS = [
    { label: 'Revenue Forecast', icon: TrendingUp, fn: () => agentsApi.runForecast(id!) },
    { label: 'Scenario Modeling', icon: BarChart2, fn: () => agentsApi.runScenarios(id!) },
    { label: 'KPI Analysis', icon: Target, fn: () => agentsApi.runKpis(id!) },
    { label: 'Variance Analysis', icon: Zap, fn: () => agentsApi.runVariance(id!) },
    { label: 'Monthly Report', icon: FileText, fn: () => agentsApi.runReport(id!) },
    { label: 'Budget Validation', icon: Bot, fn: () => agentsApi.runBudget(id!) },
  ]

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="text-3xl">{industryIcon(company.industry)}</div>
          <div>
            <h2 className="text-2xl font-bold text-gray-900">{company.name}</h2>
            <p className="text-gray-500">{company.industry} · {company.headcount} employees · Founded {company.founded_year}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={downloadExcel} className="btn-secondary">
            <Download size={14} /> Excel
          </button>
          <button onClick={downloadPdf} className="btn-primary">
            <Download size={14} /> PDF Report
          </button>
        </div>
      </div>

      {/* Summary cards */}
      {summary && (
        <div className="grid grid-cols-5 gap-3">
          {[
            { label: 'Revenue', value: formatCurrency(summary.revenue, true), sub: 'Monthly' },
            { label: 'Gross Profit', value: formatCurrency(summary.gross_profit, true), sub: `${(summary.gross_margin * 100).toFixed(1)}% margin` },
            { label: 'EBITDA', value: formatCurrency(summary.ebitda, true), sub: `${(summary.ebitda_margin * 100).toFixed(1)}% margin` },
            { label: 'Cash', value: formatCurrency(summary.cash, true), sub: 'Balance' },
            { label: 'AR', value: formatCurrency(summary.accounts_receivable, true), sub: 'Outstanding' },
          ].map(m => (
            <div key={m.label} className="card p-4">
              <p className="text-xs text-gray-500">{m.label}</p>
              <p className="text-xl font-bold text-gray-900 mt-1">{m.value}</p>
              <p className="text-xs text-gray-400">{m.sub}</p>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-3 gap-6">
        {/* Chart */}
        <div className="col-span-2 card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Financial Trend (18 months, $000s)</h3>
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="period" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}K`} />
              <Tooltip formatter={(v: number) => [`$${v}K`, '']} />
              <Legend iconSize={10} wrapperStyle={{ fontSize: '11px' }} />
              <Line type="monotone" dataKey="revenue" stroke="#1e3a5f" strokeWidth={2} dot={false} name="Revenue" />
              <Line type="monotone" dataKey="gross_profit" stroke="#3b82f6" strokeWidth={2} dot={false} name="Gross Profit" />
              <Line type="monotone" dataKey="ebitda" stroke="#10b981" strokeWidth={2} dot={false} name="EBITDA" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Agent control panel */}
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bot size={16} /> Run AI Agents
          </h3>
          <div className="space-y-2">
            {AGENTS.map(a => (
              <button
                key={a.label}
                onClick={() => runAgent(a.fn, a.label)}
                disabled={loading}
                className="w-full text-left px-3 py-2 rounded-lg border border-gray-200 hover:border-navy-900 hover:bg-navy-50 transition-colors text-sm flex items-center gap-2 disabled:opacity-50"
              >
                <a.icon size={13} className="text-navy-900" />
                {a.label}
                {activeAgent === a.label && (
                  <span className="ml-auto w-3 h-3 border-2 border-navy-900 border-t-transparent rounded-full animate-spin" />
                )}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Agent Result */}
      {agentResult && (
        <div className="card p-5">
          <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
            <Bot size={16} className="text-blue-600" />
            {agentResult.label} — AI Analysis
          </h3>
          <AgentResultDisplay label={agentResult.label} data={agentResult.data} />
        </div>
      )}
    </div>
  )
}

function AgentResultDisplay({ label, data }: { label: string; data: any }) {
  if (label === 'Revenue Forecast' && data.monthly_forecasts) {
    const chartData = data.monthly_forecasts.map((m: any) => ({
      period: m.period?.slice(2),
      revenue: Math.round(m.revenue / 1000),
    }))
    return (
      <div>
        <div className="grid grid-cols-3 gap-4 mb-4">
          <div className="bg-blue-50 rounded-lg p-3">
            <p className="text-xs text-blue-700">Annual Forecast</p>
            <p className="font-bold text-blue-900">{formatCurrency(data.annual_forecast, true)}</p>
          </div>
          <div className="bg-green-50 rounded-lg p-3">
            <p className="text-xs text-green-700">YoY Growth</p>
            <p className="font-bold text-green-900">{formatPct(data.yoy_growth_rate || 0)}</p>
          </div>
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-xs text-gray-700">Methodology</p>
            <p className="font-medium text-gray-900 text-xs">{data.forecast_methodology}</p>
          </div>
        </div>
        <ResponsiveContainer width="100%" height={160}>
          <BarChart data={chartData}>
            <XAxis dataKey="period" tick={{ fontSize: 10 }} />
            <YAxis tick={{ fontSize: 10 }} tickFormatter={v => `$${v}K`} />
            <Tooltip formatter={(v: number) => [`$${v}K`, 'Revenue']} />
            <Bar dataKey="revenue" fill="#1e3a5f" radius={[3, 3, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    )
  }

  if (label === 'Scenario Modeling' && data.base) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {(['downside', 'base', 'upside'] as const).map(s => (
          <ScenarioCard key={s} type={s} data={data[s]} />
        ))}
      </div>
    )
  }

  if (label === 'KPI Analysis' && data.kpis) {
    return (
      <div className="space-y-2">
        <div className={`px-3 py-2 rounded-lg text-sm font-medium inline-block mb-3 ${
          data.overall_health === 'green' ? 'bg-green-100 text-green-700' :
          data.overall_health === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
          'bg-red-100 text-red-700'
        }`}>Overall Health: {data.overall_health?.toUpperCase()}</div>
        <div className="grid grid-cols-2 gap-2">
          {data.kpis?.slice(0, 8).map((k: any) => (
            <div key={k.name} className="flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-700">{k.name}</span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                k.status === 'green' ? 'bg-green-100 text-green-700' :
                k.status === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
                'bg-red-100 text-red-700'
              }`}>{k.status}</span>
            </div>
          ))}
        </div>
        {data.summary && <p className="text-sm text-gray-600 mt-3 bg-blue-50 p-3 rounded-lg">{data.summary}</p>}
      </div>
    )
  }

  // Generic display
  return (
    <div>
      {data.executive_summary && <p className="text-sm text-gray-700 mb-3 bg-blue-50 p-3 rounded-lg">{data.executive_summary}</p>}
      {data.commentary && <p className="text-sm text-gray-700 mb-3 bg-blue-50 p-3 rounded-lg">{data.commentary}</p>}
      {data.board_commentary && <p className="text-sm text-gray-700 mb-3 bg-blue-50 p-3 rounded-lg">{data.board_commentary}</p>}
      {data.recommendations && (
        <ul className="space-y-1">
          {data.recommendations.map((r: string, i: number) => (
            <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
              <span className="text-blue-500 mt-0.5">•</span> {r}
            </li>
          ))}
        </ul>
      )}
      {data.flags && data.flags.length > 0 && (
        <div className="mt-3 space-y-1">
          {data.flags.map((f: string, i: number) => (
            <div key={i} className="text-sm text-red-700 bg-red-50 px-3 py-1.5 rounded-lg">⚠️ {f}</div>
          ))}
        </div>
      )}
    </div>
  )
}

function ScenarioCard({ type, data }: { type: string; data: any }) {
  const colors: Record<string, string> = {
    downside: 'border-red-200 bg-red-50',
    base: 'border-blue-200 bg-blue-50',
    upside: 'border-green-200 bg-green-50',
  }
  const labels: Record<string, string> = { downside: '🔻 Downside', base: '📊 Base', upside: '🔺 Upside' }
  return (
    <div className={`rounded-xl border-2 p-4 ${colors[type]}`}>
      <div className="font-semibold text-sm mb-3">{labels[type]}</div>
      <div className="space-y-2 text-xs">
        <div className="flex justify-between">
          <span className="text-gray-600">Revenue Growth</span>
          <span className="font-medium">{formatPct(data?.revenue_growth || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Annual Revenue</span>
          <span className="font-medium">{formatCurrency(data?.annual_revenue || 0, true)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">EBITDA Margin</span>
          <span className="font-medium">{formatPct(data?.ebitda_margin || 0)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Probability</span>
          <span className="font-medium">{formatPct(data?.probability || 0, 0)}</span>
        </div>
      </div>
    </div>
  )
}

function formatCurrency(v: number, compact = false) {
  if (compact) {
    if (Math.abs(v) >= 1_000_000) return `$${(v / 1_000_000).toFixed(1)}M`
    if (Math.abs(v) >= 1_000) return `$${(v / 1_000).toFixed(0)}K`
    return `$${v.toFixed(0)}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0 }).format(v)
}

function formatPct(v: number, d = 1) {
  return `${(v * 100).toFixed(d)}%`
}
