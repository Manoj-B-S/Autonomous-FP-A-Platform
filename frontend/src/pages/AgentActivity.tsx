import { useEffect, useState } from 'react'
import { agentsApi } from '../lib/api'
import { useAppStore } from '../store'
import { Bot, CheckCircle, Clock, AlertCircle, Zap } from 'lucide-react'

const AGENT_COLORS: Record<string, string> = {
  'Strategic Orchestrator': 'bg-purple-100 text-purple-700',
  'Budget Builder': 'bg-blue-100 text-blue-700',
  'Revenue Forecasting': 'bg-green-100 text-green-700',
  'Expense Forecasting': 'bg-yellow-100 text-yellow-700',
  'Capital Planning': 'bg-orange-100 text-orange-700',
  'Scenario Modeling': 'bg-indigo-100 text-indigo-700',
  'KPI Tracker': 'bg-red-100 text-red-700',
  'Variance Analyst': 'bg-pink-100 text-pink-700',
  'Initiative Tracker': 'bg-teal-100 text-teal-700',
  'Reporting & Insights': 'bg-gray-100 text-gray-700',
}

export default function AgentActivity() {
  const { agentActivities, addAgentActivity } = useAppStore()
  const [dbActivities, setDbActivities] = useState<any[]>([])
  const [triggering, setTriggering] = useState(false)

  useEffect(() => {
    agentsApi.activity(100).then(r => setDbActivities(r.data))
  }, [])

  const triggerCycle = async () => {
    setTriggering(true)
    await agentsApi.triggerPlanningCycle()
    setTimeout(() => {
      agentsApi.activity(100).then(r => setDbActivities(r.data))
      setTriggering(false)
    }, 5000)
  }

  const allActivities = [
    ...agentActivities.map(a => ({
      agent_name: a.agent_name || a.agent,
      action: a.action,
      status: a.status,
      created_at: a.timestamp || a.created_at || new Date().toISOString(),
      isLive: true,
    })),
    ...dbActivities.map(a => ({ ...a, isLive: false })),
  ].slice(0, 100)

  const agents = [
    'Strategic Orchestrator', 'Budget Builder', 'Revenue Forecasting',
    'Expense Forecasting', 'Capital Planning', 'Scenario Modeling',
    'KPI Tracker', 'Variance Analyst', 'Initiative Tracker', 'Reporting & Insights',
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Agent Activity Feed</h2>
          <p className="text-gray-500 mt-1">Real-time autonomous agent operations</p>
        </div>
        <button onClick={triggerCycle} disabled={triggering} className="btn-primary">
          {triggering ? (
            <><span className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" /> Running...</>
          ) : (
            <><Zap size={14} /> Trigger Full Cycle</>
          )}
        </button>
      </div>

      {/* Agent roster */}
      <div className="grid grid-cols-5 gap-3">
        {agents.map(name => {
          const recentActivity = allActivities.find(a => (a.agent_name || '') === name)
          return (
            <div key={name} className="card p-3">
              <div className="flex items-center gap-2 mb-1">
                <Bot size={13} className="text-gray-400" />
                <span className={`text-xs font-medium px-1.5 py-0.5 rounded-full ${AGENT_COLORS[name] || 'bg-gray-100 text-gray-600'}`}>
                  Active
                </span>
              </div>
              <p className="text-xs font-semibold text-gray-900 leading-tight">{name}</p>
              {recentActivity && (
                <p className="text-xs text-gray-400 mt-1 truncate">{recentActivity.action}</p>
              )}
            </div>
          )
        })}
      </div>

      {/* Activity log */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50 flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-green-500 live-dot"></div>
          <span className="text-sm font-semibold text-gray-700">Live Activity Log</span>
          <span className="text-xs text-gray-400">({allActivities.length} events)</span>
        </div>
        <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
          {allActivities.map((a, i) => (
            <div key={i} className="flex items-start gap-4 px-5 py-3 hover:bg-gray-50 transition-colors">
              <div className="mt-0.5 flex-shrink-0">
                {a.status === 'completed' ? (
                  <CheckCircle size={16} className="text-green-500" />
                ) : a.status === 'running' ? (
                  <Clock size={16} className="text-blue-500 animate-pulse" />
                ) : (
                  <AlertCircle size={16} className="text-red-500" />
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${AGENT_COLORS[a.agent_name || ''] || 'bg-gray-100 text-gray-600'}`}>
                    {a.agent_name}
                  </span>
                  {a.company_id && (
                    <span className="text-xs text-gray-400">{a.company_id.replace(/_/g, ' ')}</span>
                  )}
                  {a.isLive && (
                    <span className="text-xs bg-blue-100 text-blue-600 px-1.5 py-0.5 rounded-full">LIVE</span>
                  )}
                </div>
                <p className="text-sm text-gray-700">{a.action}</p>
              </div>
              <div className="text-xs text-gray-400 flex-shrink-0">
                {a.created_at ? new Date(a.created_at).toLocaleTimeString() : ''}
              </div>
            </div>
          ))}
          {allActivities.length === 0 && (
            <div className="text-center py-16 text-gray-400">
              <Bot size={32} className="mx-auto mb-3 opacity-30" />
              <p>No agent activity yet.</p>
              <p className="text-sm mt-1">Click "Trigger Full Cycle" to start autonomous planning.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
