import { create } from 'zustand'

export interface Company {
  id: string
  name: string
  industry: string
  annual_revenue: number
  growth_rate: number
  gross_margin: number
  headcount: number
  founded_year: number
  description: string
}

export interface AgentActivity {
  id?: number
  agent_name: string
  company_id?: string
  action: string
  status: string
  created_at?: string
  timestamp?: string
  agent?: string
}

interface AppState {
  companies: Company[]
  selectedCompany: Company | null
  agentActivities: AgentActivity[]
  isConnected: boolean
  notifications: string[]

  setCompanies: (companies: Company[]) => void
  setSelectedCompany: (company: Company | null) => void
  addAgentActivity: (activity: AgentActivity) => void
  setAgentActivities: (activities: AgentActivity[]) => void
  setConnected: (connected: boolean) => void
  addNotification: (msg: string) => void
  clearNotifications: () => void
}

export const useAppStore = create<AppState>((set) => ({
  companies: [],
  selectedCompany: null,
  agentActivities: [],
  isConnected: false,
  notifications: [],

  setCompanies: (companies) => set({ companies }),
  setSelectedCompany: (company) => set({ selectedCompany: company }),
  addAgentActivity: (activity) =>
    set((state) => ({
      agentActivities: [activity, ...state.agentActivities].slice(0, 100),
    })),
  setAgentActivities: (activities) => set({ agentActivities: activities }),
  setConnected: (connected) => set({ isConnected: connected }),
  addNotification: (msg) =>
    set((state) => ({ notifications: [msg, ...state.notifications].slice(0, 10) })),
  clearNotifications: () => set({ notifications: [] }),
}))
