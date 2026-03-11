import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, TrendingDown, DollarSign, Users, Zap, ArrowRight, RefreshCw } from 'lucide-react'
import { dashboardApi, agentsApi } from '../lib/api'
import { useAppStore } from '../store'
import { formatCurrency, formatPct, industryIcon } from '../lib/utils'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line } from 'recharts'

interface DashboardSummary {
  total_companies: number
  total_revenue: number
  total_ebitda: number
  ebitda_margin: number
  companies: any[]
}

export default function Dashboard() {
  const [summary, setSummary] = useState<DashboardSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [triggering, setTriggering] = useState(false)
  const { agentActivities } = useAppStore()

  useEffect(() => {
    dashboardApi.summary().then(r => { setSummary(r.data); setLoading(false) })
  }, [])

  const triggerCycle = async () => {
    setTriggering(true)
    await agentsApi.triggerPlanningCycle()
    setTimeout(() => setTriggering(false), 3000)
  }

  if (loading) return (
    <div className="flex items-center justify-center h-64">
      <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full"></div>
    </div>
  )

  const revenueData = summary?.companies.map(c => ({
    name: c.name.replace(' Inc', '').replace(' Co', '').replace(' Group', '').replace(' Solutions', '').replace(' Logistics', ''),
    revenue: Math.round(c.revenue / 1_000_000 * 10) / 10,
    ebitda: Math.round(c.ebitda / 1_000_000 * 10) / 10,
  })) || []

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Portfolio Overview</h2>
          <p className="text-gray-500 mt-1">Summit Growth Partners · 6 Companies · Annual Planning 2026</p>
        </div>
        <button
          onClick={triggerCycle}
          disabled={triggering}
          className="btn-primary"
        >
          {triggering ? (
            <><RefreshCw size={15} className="animate-spin" /> Running Cycle...</>
          ) : (
            <><Zap size={15} /> Trigger Planning Cycle</>
          )}
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-4">
        <MetricCard
          label="Total Portfolio Revenue"
          value={formatCurrency(summary?.total_revenue || 0, true)}
          sub="Monthly run rate"
          icon={<DollarSign size={20} />}
          color="blue"
        />
        <MetricCard
          label="Portfolio EBITDA"
          value={formatCurrency(summary?.total_ebitda || 0, true)}
          sub="Monthly"
          icon={<TrendingUp size={20} />}
          color="green"
        />
        <MetricCard
          label="Blended EBITDA Margin"
          value={formatPct((summary?.ebitda_margin || 0) / 100)}
          sub="Portfolio avg"
          icon={<TrendingUp size={20} />}
          color="purple"
        />
        <MetricCard
          label="Portfolio Companies"
          value={`${summary?.total_companies || 6}`}
          sub="Active investments"
          icon={<Users size={20} />}
          color="orange"
        />
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Revenue chart */}
        <div className="col-span-2 card p-5">
          <h3 className="font-semibold text-gray-900 mb-4">Monthly Revenue by Company</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={revenueData} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}M`} />
              <Tooltip formatter={(v: number) => [`$${v}M`, '']} />
              <Bar dataKey="revenue" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Revenue" />
              <Bar dataKey="ebitda" fill="#3b82f6" radius={[4, 4, 0, 0]} name="EBITDA" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Agent activity feed */}
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Agent Activity</h3>
            <Link to="/agents" className="text-xs text-blue-600 hover:underline">View all</Link>
          </div>
          <div className="space-y-2 max-h-52 overflow-y-auto">
            {agentActivities.slice(0, 12).map((a, i) => (
              <div key={i} className="flex items-start gap-2 text-xs">
                <div className={`mt-0.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  a.status === 'completed' ? 'bg-green-500' :
                  a.status === 'running' ? 'bg-blue-500 animate-pulse' : 'bg-gray-300'
                }`} />
                <div>
                  <span className="font-medium text-gray-700">{a.agent_name || a.agent}</span>
                  <span className="text-gray-500 ml-1">{a.action}</span>
                </div>
              </div>
            ))}
            {agentActivities.length === 0 && (
              <p className="text-xs text-gray-400">No agent activity yet. Trigger a planning cycle to start.</p>
            )}
          </div>
        </div>
      </div>

      {/* Company cards grid */}
      <div>
        <h3 className="font-semibold text-gray-900 mb-3">Portfolio Companies</h3>
        <div className="grid grid-cols-3 gap-4">
          {summary?.companies.map(c => (
            <CompanyCard key={c.id} company={c} />
          ))}
        </div>
      </div>
    </div>
  )
}

function MetricCard({ label, value, sub, icon, color }: any) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 text-blue-600',
    green: 'bg-green-50 text-green-600',
    purple: 'bg-purple-50 text-purple-600',
    orange: 'bg-orange-50 text-orange-600',
  }
  return (
    <div className="card p-5">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs text-gray-500 font-medium uppercase tracking-wide">{label}</p>
          <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          <p className="text-xs text-gray-400 mt-0.5">{sub}</p>
        </div>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${colors[color]}`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function CompanyCard({ company }: { company: any }) {
  const margin = company.ebitda_margin
  const marginColor = margin > 20 ? 'text-green-600' : margin > 10 ? 'text-yellow-600' : 'text-red-600'

  return (
    <Link to={`/company/${company.id}`} className="card p-4 hover:shadow-md transition-shadow block">
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="text-lg">{industryIcon(company.industry)}</div>
          <h4 className="font-semibold text-gray-900 text-sm mt-1">{company.name}</h4>
          <p className="text-xs text-gray-500">{company.industry}</p>
        </div>
        <ArrowRight size={14} className="text-gray-400 mt-1" />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <p className="text-xs text-gray-500">Revenue</p>
          <p className="font-bold text-gray-900 text-sm">{formatCurrency(company.revenue, true)}/mo</p>
        </div>
        <div>
          <p className="text-xs text-gray-500">EBITDA Margin</p>
          <p className={`font-bold text-sm ${marginColor}`}>{margin.toFixed(1)}%</p>
        </div>
      </div>
    </Link>
  )
}
