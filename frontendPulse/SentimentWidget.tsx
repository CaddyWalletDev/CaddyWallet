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
        if (!res.ok) throw new Error(`Failed to fetch sentiment (HTTP ${res.status})`)
        const data = await res.json()
        if (!cancelled) setSentiment(data.score)
      } catch (err: any) {
        if (!cancelled) setError(err.message || 'Unknown error')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    fetchSentiment()

    return () => {
      cancelled = true
    }
  }, [symbol])

  return (
    <div className="bg-white shadow-xl rounded-lg p-6 flex flex-col items-center w-64">
      <h3 className="text-xl font-semibold mb-4 text-center">{symbol} Sentiment</h3>
      {loading && <div className="text-gray-500">Loading...</div>}
      {error && <div className="text-red-500">{`Error: ${error}`}</div>}
      {!loading && sentiment !== null && (
        <div className="text-4xl font-bold text-green-600">
          {sentiment >= 0 ? `+${sentiment.toFixed(1)}%` : `${sentiment.toFixed(1)}%`}
        </div>
      )}
      {!loading && sentiment === null && !error && (
        <div className="text-gray-500">No sentiment data available</div>
      )}
    </div>
  )
}

export default SentimentWidget
