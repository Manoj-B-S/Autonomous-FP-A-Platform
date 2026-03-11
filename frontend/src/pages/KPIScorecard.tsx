import { useEffect, useState } from 'react'
import { kpisApi, agentsApi } from '../lib/api'
import { useAppStore } from '../store'
import { Bot, RefreshCw } from 'lucide-react'
import { LineChart, Line, ResponsiveContainer, Tooltip } from 'recharts'

export default function KPIScorecard() {
  const { companies } = useAppStore()
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '')
  const [kpis, setKpis] = useState<any[]>([])
  const [latestKpis, setLatestKpis] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState<any>(null)

  useEffect(() => {
    if (companies.length && !selectedCompany) setSelectedCompany(companies[0].id)
  }, [companies])

  useEffect(() => {
    if (!selectedCompany) return
    setLoading(true)
    Promise.all([
      kpisApi.list(selectedCompany),
      kpisApi.latest(selectedCompany),
    ]).then(([listR, latestR]) => {
      setKpis(listR.data)
      setLatestKpis(latestR.data)
      setLoading(false)
    })
  }, [selectedCompany])

  const runAnalysis = async () => {
    setAnalyzing(true)
    const r = await agentsApi.runKpis(selectedCompany)
    setAnalysis(r.data)
    setAnalyzing(false)
  }

  const STATUS_COLORS: Record<string, string> = {
    green: 'bg-green-100 text-green-700 border-green-200',
    yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
    red: 'bg-red-100 text-red-700 border-red-200',
    gray: 'bg-gray-100 text-gray-600 border-gray-200',
  }

  const STATUS_ICONS: Record<string, string> = {
    green: '✅',
    yellow: '⚠️',
    red: '🚨',
    gray: '—',
  }

  // Build sparkline data per KPI
  const kpiByName: Record<string, any[]> = {}
  kpis.forEach(k => {
    kpiByName[k.kpi_name] = k.data?.slice(-6) || []
  })

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">KPI Scorecard</h2>
          <p className="text-gray-500 mt-1">Real-time KPI monitoring with AI analysis</p>
        </div>
        <div className="flex items-center gap-3">
          <select
            value={selectedCompany}
            onChange={e => setSelectedCompany(e.target.value)}
            className="text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-navy-900/20"
          >
            {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
          <button onClick={runAnalysis} disabled={analyzing} className="btn-primary">
            {analyzing ? <><RefreshCw size={14} className="animate-spin" /> Analyzing...</> : <><Bot size={14} /> AI Analysis</>}
          </button>
        </div>
      </div>

      {/* AI Analysis result */}
      {analysis && (
        <div className="card p-5 border-l-4 border-blue-500">
          <div className="flex items-start justify-between mb-3">
            <h3 className="font-semibold flex items-center gap-2"><Bot size={16} className="text-blue-600" /> AI KPI Analysis</h3>
            <span className={`text-xs font-medium px-2 py-1 rounded-full ${
              analysis.overall_health === 'green' ? 'bg-green-100 text-green-700' :
              analysis.overall_health === 'yellow' ? 'bg-yellow-100 text-yellow-700' :
              'bg-red-100 text-red-700'
            }`}>Overall: {analysis.overall_health?.toUpperCase()}</span>
          </div>
          <p className="text-sm text-gray-600 mb-3">{analysis.summary}</p>
          {analysis.alerts?.map((a: any, i: number) => (
            <div key={i} className={`text-sm px-3 py-2 rounded-lg mb-1 ${
              a.severity === 'critical' ? 'bg-red-50 text-red-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              {a.severity === 'critical' ? '🚨' : '⚠️'} {a.kpi}: {a.message}
            </div>
          ))}
        </div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin w-8 h-8 border-4 border-navy-900 border-t-transparent rounded-full" />
        </div>
      ) : (
        <div className="card overflow-hidden">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">KPI</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Current</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Target</th>
                <th className="text-right px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Variance</th>
                <th className="text-center px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Status</th>
                <th className="px-5 py-3 text-xs font-semibold text-gray-600 uppercase tracking-wide">Trend</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {latestKpis.map(kpi => (
                <tr key={kpi.kpi_name} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <span className="font-medium text-sm text-gray-900">{kpi.kpi_name?.replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}</span>
                  </td>
                  <td className="px-5 py-3 text-right text-sm font-semibold text-gray-900">
                    {kpi.value?.toFixed(2)}
                  </td>
                  <td className="px-5 py-3 text-right text-sm text-gray-500">
                    {kpi.target ? kpi.target.toFixed(2) : '—'}
                  </td>
                  <td className="px-5 py-3 text-right text-sm">
                    <span className={kpi.variance_pct >= 0 ? 'text-green-600' : 'text-red-600'}>
                      {kpi.variance_pct >= 0 ? '+' : ''}{kpi.variance_pct?.toFixed(1)}%
                    </span>
                  </td>
                  <td className="px-5 py-3 text-center">
                    <span className={`text-xs font-medium px-2 py-1 rounded-full border ${STATUS_COLORS[kpi.status] || STATUS_COLORS.gray}`}>
                      {STATUS_ICONS[kpi.status]} {kpi.status?.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {kpiByName[kpi.kpi_name]?.length > 2 ? (
                      <div className="w-24 h-8">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={kpiByName[kpi.kpi_name]}>
                            <Line
                              type="monotone"
                              dataKey="value"
                              stroke={kpi.status === 'green' ? '#10b981' : kpi.status === 'red' ? '#ef4444' : '#f59e0b'}
                              strokeWidth={1.5}
                              dot={false}
                            />
                            <Tooltip contentStyle={{ fontSize: '10px' }} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    ) : <span className="text-gray-300 text-xs">No data</span>}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {latestKpis.length === 0 && (
            <div className="text-center py-12 text-gray-400">No KPI data available for this company.</div>
          )}
        </div>
      )}
    </div>
  )
}
