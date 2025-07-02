export const API_ENDPOINTS = {
  portfolioSummary: '/api/portfolio/summary',
  sentiment: '/api/sentiment',
  swapQuote: '/api/swap/quote',
  swapExecute: '/api/swap/execute'
}

export const DEFAULTS = {
  pollingIntervalMs: 15000,
  sentimentTimeoutMs: 5000,
  swapSlippagePct: 0.5,
  swapTimeoutSec: 30
}

export const UI = {
  chartResolution: 100,
  panelPadding: 6,
  widgetPadding: 5,
  sparklineStrokeWidth: 2
}
