import { useState } from 'react'
import { agentsApi } from '../lib/api'
import { useAppStore } from '../store'
import { TrendingUp, TrendingDown, Minus, Bot, RefreshCw } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts'

export default function ScenarioBuilder() {
  const { companies } = useAppStore()
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '')
  const [scenarios, setScenarios] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [customRevGrowth, setCustomRevGrowth] = useState(20)
  const [customMargin, setCustomMargin] = useState(15)

  const runScenarios = async () => {
    setLoading(true)
    const r = await agentsApi.runScenarios(selectedCompany)
    setScenarios(r.data)
    setLoading(false)
  }

  const chartData = scenarios ? [
    {
      scenario: 'Downside',
      revenue: Math.round((scenarios.downside?.annual_revenue || 0) / 1_000_000 * 10) / 10,
      ebitda: Math.round((scenarios.downside?.annual_ebitda || 0) / 1_000_000 * 10) / 10,
    },
    {
      scenario: 'Base',
      revenue: Math.round((scenarios.base?.annual_revenue || 0) / 1_000_000 * 10) / 10,
      ebitda: Math.round((scenarios.base?.annual_ebitda || 0) / 1_000_000 * 10) / 10,
    },
    {
      scenario: 'Upside',
      revenue: Math.round((scenarios.upside?.annual_revenue || 0) / 1_000_000 * 10) / 10,
      ebitda: Math.round((scenarios.upside?.annual_ebitda || 0) / 1_000_000 * 10) / 10,
    },
  ] : []

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Scenario Builder</h2>
          <p className="text-gray-500 mt-1">AI-powered base/upside/downside scenario modeling</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={e => { setSelectedCompany(e.target.value); setScenarios(null) }}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={runScenarios} disabled={loading} className="btn-primary">
            {loading ? <><RefreshCw size={14} className="animate-spin" /> Modeling...</> : <><Bot size={14} /> Generate Scenarios</>}
          </button>
        </div>
      </div>

      {/* Assumption sliders */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-4">Custom Assumptions (Override)</h3>
        <div className="grid grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Revenue Growth Rate: <strong>{customRevGrowth}%</strong></label>
            <input
              type="range" min={-20} max={100} value={customRevGrowth}
              onChange={e => setCustomRevGrowth(Number(e.target.value))}
              className="w-full accent-navy-900"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>-20%</span><span>100%</span></div>
          </div>
          <div>
            <label className="text-sm text-gray-700 mb-2 block">Target EBITDA Margin: <strong>{customMargin}%</strong></label>
            <input
              type="range" min={-30} max={50} value={customMargin}
              onChange={e => setCustomMargin(Number(e.target.value))}
              className="w-full accent-navy-900"
            />
            <div className="flex justify-between text-xs text-gray-400 mt-1"><span>-30%</span><span>50%</span></div>
          </div>
        </div>
      </div>

      {scenarios && (
        <>
          {/* Scenario cards */}
          <div className="grid grid-cols-3 gap-4">
            <ScenarioCard type="downside" data={scenarios.downside} />
            <ScenarioCard type="base" data={scenarios.base} />
            <ScenarioCard type="upside" data={scenarios.upside} />
          </div>

          {/* Comparison chart */}
          <div className="card p-5">
            <h3 className="font-semibold text-gray-900 mb-4">Scenario Comparison ($M)</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData} barCategoryGap="35%">
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="scenario" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 11 }} tickFormatter={v => `$${v}M`} />
                <Tooltip formatter={(v: number) => [`$${v}M`, '']} />
                <Legend />
                <Bar dataKey="revenue" fill="#1e3a5f" radius={[4, 4, 0, 0]} name="Annual Revenue" />
                <Bar dataKey="ebitda" fill="#10b981" radius={[4, 4, 0, 0]} name="Annual EBITDA" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Sensitivity analysis */}
          {scenarios.sensitivity_analysis && (
            <div className="card p-5">
              <h3 className="font-semibold text-gray-900 mb-3">Sensitivity Analysis</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 rounded-lg p-4">
                  <p className="text-sm text-blue-700 mb-1">1% Revenue Change Impact on EBITDA</p>
                  <p className="text-xl font-bold text-blue-900">
                    ${((scenarios.sensitivity_analysis.revenue_1pct_impact_on_ebitda || 0) / 1000).toFixed(0)}K
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-700 mb-2">Key Risks</p>
                  <ul className="space-y-1">
                    {scenarios.sensitivity_analysis.key_risks?.map((r: string, i: number) => (
                      <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                        <span className="text-red-400 mt-0.5">▪</span> {r}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {!scenarios && !loading && (
        <div className="card p-12 text-center">
          <Bot size={40} className="mx-auto text-gray-300 mb-3" />
          <p className="text-gray-500">Select a company and click "Generate Scenarios" to run AI-powered scenario modeling</p>
        </div>
      )}
    </div>
  )
}

function ScenarioCard({ type, data }: { type: 'downside' | 'base' | 'upside'; data: any }) {
  const config = {
    downside: { label: 'Downside Case', icon: TrendingDown, color: 'red', border: 'border-red-200', bg: 'bg-red-50' },
    base: { label: 'Base Case', icon: Minus, color: 'blue', border: 'border-blue-300', bg: 'bg-blue-50' },
    upside: { label: 'Upside Case', icon: TrendingUp, color: 'green', border: 'border-green-200', bg: 'bg-green-50' },
  }[type]

  const Icon = config.icon
  const formatM = (v: number) => `$${((v || 0) / 1_000_000).toFixed(1)}M`
  const formatPct = (v: number) => `${((v || 0) * 100).toFixed(1)}%`

  return (
    <div className={`card border-2 ${config.border} p-5`}>
      <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg ${config.bg} mb-4`}>
        <Icon size={14} className={`text-${config.color}-600`} />
        <span className={`text-sm font-semibold text-${config.color}-700`}>{config.label}</span>
      </div>

      <div className="space-y-3">
        <MetricRow label="Revenue Growth" value={formatPct(data?.revenue_growth || 0)} />
        <MetricRow label="Annual Revenue" value={formatM(data?.annual_revenue || 0)} />
        <MetricRow label="Gross Margin" value={formatPct(data?.gross_margin || 0)} />
        <MetricRow label="EBITDA Margin" value={formatPct(data?.ebitda_margin || 0)} />
        <MetricRow label="Annual EBITDA" value={formatM(data?.annual_ebitda || 0)} />
        <div className="pt-2 border-t border-gray-100">
          <div className="flex justify-between text-sm">
            <span className="text-gray-500">Probability</span>
            <span className="font-bold text-gray-900">{formatPct(data?.probability || 0)}</span>
          </div>
        </div>
      </div>

      {data?.key_assumptions && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <p className="text-xs font-medium text-gray-600 mb-1">Key Assumptions</p>
          {data.key_assumptions.slice(0, 2).map((a: string, i: number) => (
            <p key={i} className="text-xs text-gray-500">• {a}</p>
          ))}
        </div>
      )}
    </div>
  )
}

function MetricRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-sm">
      <span className="text-gray-500">{label}</span>
      <span className="font-semibold text-gray-900">{value}</span>
    </div>
  )
}
