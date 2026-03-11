import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { useEffect } from 'react'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import CompanyDetail from './pages/CompanyDetail'
import KPIScorecard from './pages/KPIScorecard'
import ScenarioBuilder from './pages/ScenarioBuilder'
import AgentActivity from './pages/AgentActivity'
import EmailCenter from './pages/EmailCenter'
import Reports from './pages/Reports'
import { useWebSocket } from './hooks/useWebSocket'
import { useAppStore } from './store'
import { companiesApi, agentsApi } from './lib/api'

function AppInner() {
  useWebSocket()
  const { setCompanies, setAgentActivities } = useAppStore()

  useEffect(() => {
    companiesApi.list().then(r => setCompanies(r.data))
    agentsApi.activity(50).then(r => setAgentActivities(r.data))
  }, [])

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/company/:id" element={<CompanyDetail />} />
        <Route path="/kpis" element={<KPIScorecard />} />
        <Route path="/scenarios" element={<ScenarioBuilder />} />
        <Route path="/agents" element={<AgentActivity />} />
        <Route path="/email" element={<EmailCenter />} />
        <Route path="/reports" element={<Reports />} />
      </Routes>
    </Layout>
  )
}

export default function App() {
  return (
    <BrowserRouter>
      <AppInner />
    </BrowserRouter>
  )
}
