// OverviewPanel.tsx
import React from 'react'

interface OverviewPanelProps {
  title: string
  totalBalance: number
  openOrders: number
  recentPnL: number
  history: number[]
}

const OverviewPanel: React.FC<OverviewPanelProps> = ({
  title,
  totalBalance,
  openOrders,
  recentPnL,
  history
}) => {
  // simple sparkline path
  const max = Math.max(...history, 1)
  const points = history.map((v, i) => {
    const x = (i / (history.length - 1)) * 100
    const y = 100 - (v / max) * 100
    return `${x},${y}`
  }).join(' ')

  return (
    <div className="bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-semibold mb-4">{title}</h2>
      <div className="space-y-2 mb-4">
        <div className="flex justify-between">
          <span>Total Balance</span>
          <span className="font-mono">{totalBalance.toFixed(2)} SOL</span>
        </div>
        <div className="flex justify-between">
          <span>Open Orders</span>
          <span className="font-mono">{openOrders}</span>
        </div>
        <div className="flex justify-between">
          <span>Recent PnL</span>
          <span className={`${recentPnL >= 0 ? 'text-green-600' : 'text-red-600'} font-mono`}>
            {recentPnL >= 0 ? '+' : ''}{recentPnL.toFixed(2)}%
          </span>
        </div>
      </div>
      <svg className="w-full h-20" viewBox="0 0 100 100" preserveAspectRatio="none">
        <polyline
          fill="none"
          stroke="#34D399"
          strokeWidth="2"
          points={points}
        />
      </svg>
    </div>
  )
}

export default OverviewPanel
