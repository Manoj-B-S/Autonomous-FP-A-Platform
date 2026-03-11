import { useEffect, useState } from 'react'
import { emailApi } from '../lib/api'
import { Mail, Send, CheckCircle, Clock } from 'lucide-react'

const EMAIL_TYPES = [
  { type: 'weekly_summary', label: 'Weekly Portfolio Summary', desc: 'Sent every Monday to PE partners', icon: '📊' },
  { type: 'kpi_alert', label: 'KPI Alert (Test)', desc: 'Trigger a test KPI alert email', icon: '🚨' },
]

export default function EmailCenter() {
  const [logs, setLogs] = useState<any[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  useEffect(() => {
    emailApi.logs().then(r => setLogs(r.data))
  }, [])

  const sendTest = async (type: string) => {
    setSending(type)
    await emailApi.sendTest(type)
    setSent(type)
    const r = await emailApi.logs()
    setLogs(r.data)
    setTimeout(() => { setSending(null); setSent(null) }, 3000)
  }

  const TYPE_COLORS: Record<string, string> = {
    kpi_alert: 'bg-red-100 text-red-700',
    reforecast: 'bg-blue-100 text-blue-700',
    weekly_summary: 'bg-green-100 text-green-700',
    variance_alert: 'bg-orange-100 text-orange-700',
    general: 'bg-gray-100 text-gray-600',
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Email Center</h2>
        <p className="text-gray-500 mt-1">Automated email delivery · Sent by AI agents without manual intervention</p>
      </div>

      {/* Email templates */}
      <div className="grid grid-cols-2 gap-4">
        {EMAIL_TYPES.map(et => (
          <div key={et.type} className="card p-5">
            <div className="flex items-start gap-3 mb-3">
              <div className="text-2xl">{et.icon}</div>
              <div>
                <h3 className="font-semibold text-gray-900 text-sm">{et.label}</h3>
                <p className="text-xs text-gray-500 mt-0.5">{et.desc}</p>
              </div>
            </div>
            <button
              onClick={() => sendTest(et.type)}
              disabled={!!sending}
              className="btn-primary w-full justify-center"
            >
              {sending === et.type ? (
                <><Clock size={13} className="animate-spin" /> Sending...</>
              ) : sent === et.type ? (
                <><CheckCircle size={13} /> Sent!</>
              ) : (
                <><Send size={13} /> Send Test Email</>
              )}
            </button>
          </div>
        ))}
      </div>

      {/* Automated schedule info */}
      <div className="card p-5">
        <h3 className="font-semibold text-gray-900 mb-3">Automated Email Schedule</h3>
        <div className="space-y-3">
          {[
            { schedule: 'Every Monday 8:00 AM UTC', type: 'Weekly Portfolio Summary', recipient: 'PE Partners, CFOs', status: 'Active' },
            { schedule: '1st of month 7:00 AM UTC', type: 'Monthly Reforecast Summary', recipient: 'PE Partners', status: 'Active' },
            { schedule: 'Every 4 hours', type: 'KPI Alert (if thresholds breached)', recipient: 'CFO', status: 'Active' },
            { schedule: 'Event-driven', type: 'Variance Alert (>10% miss)', recipient: 'CFO, PE Partners', status: 'Active' },
          ].map((s, i) => (
            <div key={i} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
              <div>
                <p className="text-sm font-medium text-gray-900">{s.type}</p>
                <p className="text-xs text-gray-500">{s.schedule} · To: {s.recipient}</p>
              </div>
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">{s.status}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Email log */}
      <div className="card overflow-hidden">
        <div className="px-5 py-3 border-b border-gray-100 bg-gray-50">
          <h3 className="font-semibold text-gray-700 text-sm">Email Send Log ({logs.length})</h3>
        </div>
        <div className="divide-y divide-gray-50 max-h-80 overflow-y-auto">
          {logs.map(log => (
            <div key={log.id} className="flex items-center gap-4 px-5 py-3">
              <Mail size={14} className="text-gray-400 flex-shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{log.subject}</p>
                <p className="text-xs text-gray-500">To: {log.to_email}</p>
              </div>
              <div className="flex items-center gap-2">
                <span className={`text-xs px-2 py-0.5 rounded-full ${TYPE_COLORS[log.email_type] || TYPE_COLORS.general}`}>
                  {log.email_type}
                </span>
                <span className="text-xs text-gray-400">{new Date(log.created_at).toLocaleString()}</span>
              </div>
            </div>
          ))}
          {logs.length === 0 && (
            <div className="text-center py-10 text-gray-400">
              <Mail size={28} className="mx-auto mb-2 opacity-30" />
              <p className="text-sm">No emails sent yet. Send a test email above.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
