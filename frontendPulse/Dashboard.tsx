// Dashboard.tsx
import React, { useEffect, useState } from 'react'
import SentimentWidget from './SentimentWidget'
import OverviewPanel from './OverviewPanel'
import { AppConfig } from './config'

interface PortfolioSummary {
  totalBalance: number
  openOrders: number
  recentPnL: number
  history: number[]
}

const SENTIMENT_SYMBOLS = ['SOL', 'USDC'] as const

const Dashboard: React.FC = () => {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const controller = new AbortController()

    async function fetchSummary() {
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(
          AppConfig.endpoints.portfolioSummary,
          { signal: controller.signal }
        )
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = (await res.json()) as PortfolioSummary
        setSummary({
          totalBalance: data.totalBalance,
          openOrders: data.openOrders,
          recentPnL: data.recentPnL,
          history: data.history,
        })
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          setError(err.message || 'Failed to fetch summary')
          setSummary(null)
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false)
        }
      }
    }

    fetchSummary()
    return () => {
      controller.abort()
    }
  }, [])

  if (loading) {
    return (
      <div className="p-4 text-center text-gray-500">
        Loading dashboard…
      </div>
    )
  }

  if (error) {
    return (
      <div className="p-4 text-red-600">
        Error: {error}
      </div>
    )
  }

  if (!summary) {
    return null
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
      {SENTIMENT_SYMBOLS.map(symbol => (
        <SentimentWidget key={symbol} symbol={symbol} />
      ))}
    </div>
  )
}

export default Dashboard
