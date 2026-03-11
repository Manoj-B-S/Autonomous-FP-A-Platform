import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Building2, Target, TrendingUp,
  Bot, Mail, FileText, Wifi, WifiOff, Bell, X
} from 'lucide-react'
import { useAppStore } from '../../store'
import { useState } from 'react'

const NAV = [
  { to: '/', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/kpis', icon: Target, label: 'KPI Scorecard' },
  { to: '/scenarios', icon: TrendingUp, label: 'Scenarios' },
  { to: '/agents', icon: Bot, label: 'Agent Activity' },
  { to: '/reports', icon: FileText, label: 'Reports' },
  { to: '/email', icon: Mail, label: 'Email Center' },
]

export default function Layout({ children }: { children: React.ReactNode }) {
  const { isConnected, companies, notifications, clearNotifications } = useAppStore()
  const [showNotif, setShowNotif] = useState(false)

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar */}
      <aside className="w-60 flex-shrink-0 bg-navy-900 flex flex-col">
        {/* Logo */}
        <div className="px-5 py-5 border-b border-white/10">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-blue-500 rounded-lg flex items-center justify-center text-white text-sm font-bold">S</div>
            <div>
              <div className="text-white font-semibold text-sm">Summit Growth</div>
              <div className="text-white/50 text-xs">FP&A Platform</div>
            </div>
          </div>
        </div>

        {/* Live indicator */}
        <div className="px-5 py-3 border-b border-white/10">
          <div className="flex items-center gap-2">
            {isConnected ? (
              <>
                <div className="w-2 h-2 rounded-full bg-green-400 live-dot"></div>
                <span className="text-green-400 text-xs font-medium">Agents Live</span>
                <Wifi size={12} className="text-green-400" />
              </>
            ) : (
              <>
                <div className="w-2 h-2 rounded-full bg-gray-500"></div>
                <span className="text-gray-500 text-xs">Connecting...</span>
                <WifiOff size={12} className="text-gray-500" />
              </>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {NAV.map(({ to, icon: Icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  isActive
                    ? 'bg-white/15 text-white font-medium'
                    : 'text-white/60 hover:text-white hover:bg-white/8'
                }`
              }
            >
              <Icon size={16} />
              {label}
            </NavLink>
          ))}

          {/* Companies sub-nav */}
          <div className="pt-4">
            <div className="px-3 pb-2 text-white/30 text-xs font-medium uppercase tracking-wider">Portfolio</div>
            {companies.map(c => (
              <NavLink
                key={c.id}
                to={`/company/${c.id}`}
                className={({ isActive }) =>
                  `flex items-center gap-2 px-3 py-2 rounded-lg text-xs transition-colors ${
                    isActive ? 'bg-white/15 text-white' : 'text-white/50 hover:text-white hover:bg-white/8'
                  }`
                }
              >
                <Building2 size={12} />
                <span className="truncate">{c.name}</span>
              </NavLink>
            ))}
          </div>
        </nav>

        {/* Bottom */}
        <div className="px-4 py-4 border-t border-white/10">
          <div className="text-white/30 text-xs">© 2026 Summit Growth Partners</div>
        </div>
      </aside>

      {/* Main content */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Top bar */}
        <header className="bg-white border-b border-gray-200 px-6 py-3 flex items-center justify-between flex-shrink-0">
          <div>
            <h1 className="text-base font-semibold text-gray-900">Autonomous FP&A Platform</h1>
            <p className="text-xs text-gray-500">6 portfolio companies · AI-powered</p>
          </div>
          <div className="flex items-center gap-3">
            <div className="relative">
              <button
                onClick={() => setShowNotif(!showNotif)}
                className="relative p-2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <Bell size={16} />
                {notifications.length > 0 && (
                  <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
                )}
              </button>
              {showNotif && notifications.length > 0 && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white border border-gray-200 rounded-xl shadow-lg z-50 p-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium">Agent Notifications</span>
                    <button onClick={() => { clearNotifications(); setShowNotif(false) }}>
                      <X size={14} className="text-gray-400" />
                    </button>
                  </div>
                  <div className="space-y-1 max-h-60 overflow-y-auto">
                    {notifications.map((n, i) => (
                      <div key={i} className="text-xs text-gray-600 py-1 border-b border-gray-100 last:border-0">{n}</div>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <div className="flex items-center gap-2 px-3 py-1.5 bg-gray-100 rounded-lg">
              <div className="w-6 h-6 bg-navy-900 rounded-full flex items-center justify-center text-white text-xs font-medium">P</div>
              <span className="text-sm text-gray-700">PE Partner</span>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto p-6">
          {children}
        </main>
      </div>
    </div>
  )
}
