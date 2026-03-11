import { useState } from 'react'
import { reportsApi, agentsApi, downloadBlob } from '../lib/api'
import { useAppStore } from '../store'
import { FileText, Download, Bot, RefreshCw, BarChart2 } from 'lucide-react'

export default function Reports() {
  const { companies } = useAppStore()
  const [selectedCompany, setSelectedCompany] = useState(companies[0]?.id || '')
  const [report, setReport] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [downloading, setDownloading] = useState('')

  const generateReport = async () => {
    setLoading(true)
    const r = await agentsApi.runReport(selectedCompany)
    setReport(r.data)
    setLoading(false)
  }

  const downloadPdf = async () => {
    setDownloading('pdf')
    const r = await reportsApi.pdf(selectedCompany)
    downloadBlob(r.data, `${selectedCompany}_board_pack.pdf`)
    setDownloading('')
  }

  const downloadExcel = async () => {
    setDownloading('excel')
    const r = await reportsApi.excel(selectedCompany)
    downloadBlob(r.data, `${selectedCompany}_financial_model.xlsx`)
    setDownloading('')
  }

  const RATING_CONFIG: Record<string, { label: string; color: string }> = {
    exceeding: { label: 'Exceeding Plan 🟢', color: 'text-green-700 bg-green-100' },
    on_plan: { label: 'On Plan ✅', color: 'text-blue-700 bg-blue-100' },
    below_plan: { label: 'Below Plan ⚠️', color: 'text-yellow-700 bg-yellow-100' },
    significantly_below: { label: 'Significantly Below 🚨', color: 'text-red-700 bg-red-100' },
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Reports & Exports</h2>
          <p className="text-gray-500 mt-1">AI-generated board packs, financial models, and executive reports</p>
        </div>
        <select
          value={selectedCompany}
          onChange={e => { setSelectedCompany(e.target.value); setReport(null) }}
          className="text-sm border border-gray-200 rounded-lg px-3 py-2"
        >
          {companies.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
      </div>

      {/* Report actions */}
      <div className="grid grid-cols-3 gap-4">
        <div className="card p-5">
          <div className="text-2xl mb-3">📊</div>
          <h3 className="font-semibold text-gray-900 mb-1">AI Monthly Report</h3>
          <p className="text-xs text-gray-500 mb-4">Claude generates executive summary, variance analysis, and recommendations</p>
          <button onClick={generateReport} disabled={loading} className="btn-primary w-full justify-center">
            {loading ? <><RefreshCw size={13} className="animate-spin" /> Generating...</> : <><Bot size={13} /> Generate Report</>}
          </button>
        </div>

        <div className="card p-5">
          <div className="text-2xl mb-3">📄</div>
          <h3 className="font-semibold text-gray-900 mb-1">PDF Board Pack</h3>
          <p className="text-xs text-gray-500 mb-4">Professional PDF with financials table, ready for board distribution</p>
          <button onClick={downloadPdf} disabled={downloading === 'pdf'} className="btn-secondary w-full justify-center">
            {downloading === 'pdf' ? 'Generating...' : <><Download size={13} /> Download PDF</>}
          </button>
        </div>

        <div className="card p-5">
          <div className="text-2xl mb-3">📉</div>
          <h3 className="font-semibold text-gray-900 mb-1">Excel Financial Model</h3>
          <p className="text-xs text-gray-500 mb-4">Full financial model exported as Excel with 36-month history</p>
          <button onClick={downloadExcel} disabled={downloading === 'excel'} className="btn-secondary w-full justify-center">
            {downloading === 'excel' ? 'Generating...' : <><Download size={13} /> Download Excel</>}
          </button>
        </div>
      </div>

      {/* AI Report display */}
      {report && (
        <div className="card p-6 space-y-5">
          <div className="flex items-center justify-between">
            <h3 className="font-bold text-gray-900 text-lg flex items-center gap-2">
              <Bot size={18} className="text-blue-600" /> AI Monthly Report — {report.report_month}
            </h3>
            {report.performance_rating && (
              <span className={`text-sm font-medium px-3 py-1 rounded-full ${RATING_CONFIG[report.performance_rating]?.color || 'bg-gray-100 text-gray-600'}`}>
                {RATING_CONFIG[report.performance_rating]?.label || report.performance_rating}
              </span>
            )}
          </div>

          {report.executive_summary && (
            <div className="bg-blue-50 rounded-xl p-4">
              <p className="text-sm font-medium text-blue-800 mb-1">Executive Summary</p>
              <p className="text-sm text-blue-900">{report.executive_summary}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-5">
            {report.risks && report.risks.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-800 mb-2">⚠️ Key Risks</h4>
                <div className="space-y-2">
                  {report.risks.map((r: any, i: number) => (
                    <div key={i} className="bg-red-50 rounded-lg p-3 text-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium text-red-800">{r.risk}</span>
                        <span className={`text-xs px-1.5 py-0.5 rounded-full ${
                          r.likelihood === 'high' ? 'bg-red-100 text-red-700' :
                          r.likelihood === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                          'bg-gray-100 text-gray-600'
                        }`}>{r.likelihood}</span>
                      </div>
                      {r.mitigation && <p className="text-xs text-red-700">Mitigation: {r.mitigation}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {report.opportunities && report.opportunities.length > 0 && (
              <div>
                <h4 className="font-semibold text-sm text-gray-800 mb-2">🚀 Opportunities</h4>
                <div className="space-y-2">
                  {report.opportunities.map((o: any, i: number) => (
                    <div key={i} className="bg-green-50 rounded-lg p-3 text-sm">
                      <p className="font-medium text-green-800">{o.opportunity}</p>
                      {o.potential_upside && (
                        <p className="text-xs text-green-700 mt-1">Potential upside: ${(o.potential_upside / 1000).toFixed(0)}K</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {report.ebitda_bridge && report.ebitda_bridge.length > 0 && (
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">📊 EBITDA Bridge</h4>
              <div className="space-y-1">
                {report.ebitda_bridge.map((b: any, i: number) => (
                  <div key={i} className="flex items-center gap-3 text-sm py-1.5 border-b border-gray-100 last:border-0">
                    <span className="text-gray-600 flex-1">{b.driver}</span>
                    <span className={`font-medium ${b.impact >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                      {b.impact >= 0 ? '+' : ''}${Math.abs(b.impact / 1000).toFixed(0)}K
                    </span>
                    <span className="text-gray-400 text-xs flex-1">{b.explanation}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {report.management_actions && (
            <div>
              <h4 className="font-semibold text-sm text-gray-800 mb-2">✅ Recommended Actions</h4>
              <ul className="space-y-1">
                {report.management_actions.map((a: string, i: number) => (
                  <li key={i} className="text-sm text-gray-600 flex items-start gap-2">
                    <span className="text-blue-500 font-bold mt-0.5">{i + 1}.</span> {a}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {report.next_month_outlook && (
            <div className="bg-gray-50 rounded-xl p-4">
              <p className="text-sm font-medium text-gray-800 mb-1">Next Month Outlook</p>
              <p className="text-sm text-gray-600">{report.next_month_outlook}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
