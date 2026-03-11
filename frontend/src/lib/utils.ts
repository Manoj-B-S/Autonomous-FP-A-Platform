export function formatCurrency(value: number, compact = false): string {
  if (compact) {
    if (Math.abs(value) >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
    if (Math.abs(value) >= 1_000) return `$${(value / 1_000).toFixed(0)}K`
    return `$${value.toFixed(0)}`
  }
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(value)
}

export function formatPct(value: number, decimals = 1): string {
  return `${(value * 100).toFixed(decimals)}%`
}

export function formatNumber(value: number): string {
  return new Intl.NumberFormat('en-US').format(Math.round(value))
}

export function getStatusColor(status: string) {
  switch (status) {
    case 'green': return 'text-green-700 bg-green-100'
    case 'yellow': return 'text-yellow-700 bg-yellow-100'
    case 'red': return 'text-red-700 bg-red-100'
    default: return 'text-gray-600 bg-gray-100'
  }
}

export function industryIcon(industry: string): string {
  const icons: Record<string, string> = {
    SaaS: '☁️',
    Manufacturing: '🏭',
    'Healthcare IT': '🏥',
    Logistics: '📦',
    FinTech: '💳',
    Services: '🏢',
  }
  return icons[industry] || '🏢'
}
