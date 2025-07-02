// Dashboard.tsx
import React, { useEffect, useState } from 'react'
import SentimentWidget from './SentimentWidget'
import OverviewPanel from './OverviewPanel'

interface PortfolioSummary {
  totalBalance: number
  openOrders: number
  recentPnL: number
  history: number[]
}

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function fetchSummary() {
      try {
        setLoading(true)
        // placeholder endpoint
        const res = await fetch('/api/portfolio/summary')
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        setSummary({
          totalBalance: data.totalBalance,
          openOrders: data.openOrders,
          recentPnL: data.recentPnL,
          history: data.history
        })
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchSummary()
  }, [])

  if (loading) {
    return <div className="p-4 text-center">Loading dashboard…</div>
  }
  if (error || !summary) {
    return <div className="p-4 text-red-600">Error: {error}</div>
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 p-6">
      <OverviewPanel
        title="Portfolio Overview"
        totalBalance={summary.totalBalance}
        openOrders={summary.openOrders}
        recentPnL={summary.recentPnL}
        history={summary.history}
      />
      <SentimentWidget symbol="SOL" />
      <SentimentWidget symbol="USDC" />
    </div>
  )
}

export default Dashboard
