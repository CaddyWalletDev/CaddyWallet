// SentimentWidget.tsx
import React, { useEffect, useState } from 'react'

interface SentimentWidgetProps {
  symbol: string
}

const SentimentWidget: React.FC<SentimentWidgetProps> = ({ symbol }) => {
  const [sentiment, setSentiment] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    async function fetchSentiment() {
      try {
        setLoading(true)
        const res = await fetch(`/api/sentiment?symbol=${symbol}`)
        if (!res.ok) throw new Error(`HTTP ${res.status}`)
        const data = await res.json()
        if (!cancelled) setSentiment(data.score)
      } catch (err: any) {
        if (!cancelled) setError(err.message)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    fetchSentiment()
    return () => { cancelled = true }
  }, [symbol])

  return (
    <div className="bg-white shadow-lg rounded-xl p-5 flex flex-col items-center">
      <h3 className="text-xl font-medium mb-3">{symbol} Sentiment</h3>
      {loading && <div>Loading…</div>}
      {error && <div className="text-red-500">Error</div>}
      {!loading && sentiment !== null && (
        <div className="text-4xl font-bold">{sentiment.toFixed(1)}%</div>
      )}
    </div>
  )
}

export default SentimentWidget
