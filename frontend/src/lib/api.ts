import axios from 'axios'

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:8000',
  timeout: 30000,
})

// Company endpoints
export const companiesApi = {
  list: () => api.get('/api/companies/'),
  get: (id: string) => api.get(`/api/companies/${id}`),
}

// Financials endpoints
export const financialsApi = {
  history: (companyId: string, metric?: string, periods?: number) =>
    api.get(`/api/financials/${companyId}/history`, { params: { metric, periods } }),
  summary: (companyId: string) => api.get(`/api/financials/${companyId}/summary`),
  budget: (companyId: string) => api.get(`/api/financials/${companyId}/budget`),
}

// KPI endpoints
export const kpisApi = {
  list: (companyId: string) => api.get(`/api/kpis/${companyId}`),
  latest: (companyId: string) => api.get(`/api/kpis/${companyId}/latest`),
}

// Scenarios endpoints
export const scenariosApi = {
  list: (companyId: string) => api.get(`/api/scenarios/${companyId}`),
  create: (data: any) => api.post('/api/scenarios/', data),
}

// Agent endpoints
export const agentsApi = {
  activity: (limit?: number) => api.get('/api/agents/activity', { params: { limit } }),
  runForecast: (companyId: string) => api.post(`/api/agents/run/forecast/${companyId}`),
  runScenarios: (companyId: string) => api.post(`/api/agents/run/scenarios/${companyId}`),
  runKpis: (companyId: string) => api.post(`/api/agents/run/kpis/${companyId}`),
  runVariance: (companyId: string) => api.post(`/api/agents/run/variance/${companyId}`),
  runReport: (companyId: string) => api.post(`/api/agents/run/report/${companyId}`),
  runInitiatives: (companyId: string) => api.post(`/api/agents/run/initiatives/${companyId}`),
  runBudget: (companyId: string) => api.post(`/api/agents/run/budget/${companyId}`),
  triggerPlanningCycle: () => api.post('/api/agents/run/planning-cycle'),
}

// Dashboard
export const dashboardApi = {
  summary: () => api.get('/api/dashboard/summary'),
}

// Reports
export const reportsApi = {
  pdf: (companyId: string) =>
    api.get(`/api/reports/pdf/${companyId}`, { responseType: 'blob' }),
  excel: (companyId: string) =>
    api.get(`/api/reports/excel/${companyId}`, { responseType: 'blob' }),
}

// Email
export const emailApi = {
  logs: () => api.get('/api/email/logs'),
  sendTest: (type: string) => api.post('/api/email/send/test', { email_type: type }),
}

export function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
