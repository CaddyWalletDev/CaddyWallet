import React, { useMemo } from 'react'

interface OverviewPanelProps {
  title: string
  totalBalance: number
  openOrders: number
  recentPnL: number
  history: number[]
}

export const OverviewPanel: React.FC<OverviewPanelProps> = React.memo(({
  title,
  totalBalance,
  openOrders,
  recentPnL,
  history,
}) => {
  // Precompute sparkline points
  const points = useMemo(() => {
    if (history.length < 2) {
      // Fallback to a flat line for less than 2 points
      return history.map((_, i) => `${(i / (history.length || 1)) * 100},50`).join(' ')
    }

    const max = Math.max(...history, 1)
    return history
      .map((v, i) => {
        const x = (i / (history.length - 1)) * 100
        const y = 100 - (v / max) * 100
        return `${x},${y}`
      })
      .join(' ')
  }, [history])

  const pnlColorClass = useMemo(() => {
    if (recentPnL > 0) return 'text-green-500'
    if (recentPnL < 0) return 'text-red-500'
    return 'text-gray-500'
  }, [recentPnL])

  return (
    <div className="bg-white dark:bg-gray-800 shadow-lg rounded-2xl p-6">
      <h2 className="text-2xl font-semibold mb-4 text-gray-900 dark:text-gray-100">
        {title}
      </h2>

      <div className="space-y-3 mb-6">
        <div className="flex justify-between">
          <span className="text-gray-700 dark:text-gray-300">Total Balance</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">
            {totalBalance.toFixed(2)} SOL
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-700 dark:text-gray-300">Open Orders</span>
          <span className="font-mono text-gray-900 dark:text-gray-100">
            {openOrders}
          </span>
        </div>

        <div className="flex justify-between">
          <span className="text-gray-700 dark:text-gray-300">Recent PnL</span>
          <span className={`font-mono ${pnlColorClass}`}>
            {recentPnL >= 0 ? '+' : ''}
            {recentPnL.toFixed(2)}%
          </span>
        </div>
      </div>

      <svg
        className="w-full h-24"
        viewBox="0 0 100 100"
        preserveAspectRatio="none"
        aria-label="Performance sparkline"
        role="img"
      >
        <polyline
          fill="none"
          stroke="#34D399"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  )
})

OverviewPanel.displayName = 'OverviewPanel'

export default OverviewPanel
