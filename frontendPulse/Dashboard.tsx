import React, { useCallback, useEffect, useMemo, useRef, useState } from "react"
import SentimentWidget from "./SentimentWidget"
import OverviewPanel from "./OverviewPanel"
import { AppConfig } from "./config"

interface PortfolioSummary {
  totalBalance: number
  openOrders: number
  recentPnL: number
  history: number[]
}

const SENTIMENT_SYMBOLS = ["SOL", "USDC"] as const

type LoadOptions = {
  signal: AbortSignal
  timeoutMs: number
  retries: number
  backoffBaseMs: number
}

const CACHE_KEY = "portfolioSummaryCache"
const CACHE_STALE_MS = 60_000

function sleep(ms: number): Promise<void> {
  return new Promise(r => setTimeout(r, ms))
}

async function fetchWithTimeout(input: RequestInfo, init: RequestInit, timeoutMs: number): Promise<Response> {
  const controller = new AbortController()
  const t = setTimeout(() => controller.abort(), timeoutMs)
  const anySignal = init.signal as AbortSignal | undefined
  const onAbort = () => controller.abort()
  try {
    if (anySignal) anySignal.addEventListener("abort", onAbort, { once: true })
    const res = await fetch(input, { ...init, signal: controller.signal })
    return res
  } finally {
    clearTimeout(t)
    if (anySignal) anySignal.removeEventListener("abort", onAbort)
  }
}

async function loadSummary({ signal, timeoutMs, retries, backoffBaseMs }: LoadOptions): Promise<PortfolioSummary> {
  let attempt = 0
  let lastErr: any = null
  while (attempt <= retries) {
    attempt++
    try {
      const res = await fetchWithTimeout(AppConfig.endpoints.portfolioSummary, { headers: { accept: "application/json" }, signal }, timeoutMs)
      if (!res.ok) throw new Error(`HTTP ${res.status}`)
      const data = (await res.json()) as PortfolioSummary
      return {
        totalBalance: data.totalBalance,
        openOrders: data.openOrders,
        recentPnL: data.recentPnL,
        history: Array.isArray(data.history) ? data.history : []
      }
    } catch (e) {
      if ((signal as any).aborted) throw e
      lastErr = e
      if (attempt > retries) break
      await sleep(backoffBaseMs * attempt)
    }
  }
  throw lastErr ?? new Error("Failed to load summary")
}

function readCache(): { value: PortfolioSummary | null; ts: number | null } {
  try {
    const raw = sessionStorage.getItem(CACHE_KEY)
    if (!raw) return { value: null, ts: null }
    const parsed = JSON.parse(raw)
    return { value: parsed.value as PortfolioSummary, ts: Number(parsed.ts) || null }
  } catch {
    return { value: null, ts: null }
  }
}

function writeCache(value: PortfolioSummary): void {
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify({ value, ts: Date.now() }))
  } catch {
    // ignore
  }
}

function usePortfolioSummary() {
  const [summary, setSummary] = useState<PortfolioSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStale, setIsStale] = useState(false)
  const ctrlRef = useRef<AbortController | null>(null)

  const offline = typeof navigator !== "undefined" && !navigator.onLine

  const load = useCallback(async () => {
    ctrlRef.current?.abort()
    const controller = new AbortController()
    ctrlRef.current = controller
    try {
      setLoading(true)
      setError(null)
      const res = await loadSummary({
        signal: controller.signal,
        timeoutMs: AppConfig.fetchTimeoutMs ?? 10_000,
        retries: AppConfig.fetchRetries ?? 2,
        backoffBaseMs: AppConfig.fetchBackoffBaseMs ?? 300
      })
      if (!controller.signal.aborted) {
        setSummary(res)
        setIsStale(false)
        writeCache(res)
      }
    } catch (e: any) {
      if (!controller.signal.aborted) {
        setError(e?.message || "Failed to fetch summary")
        setSummary(null)
      }
    } finally {
      if (!controller.signal.aborted) setLoading(false)
    }
  }, [])

  useEffect(() => {
    const { value, ts } = readCache()
    if (value) {
      setSummary(value)
      const stale = !(ts && Date.now() - ts < CACHE_STALE_MS)
      setIsStale(stale)
      setLoading(false)
      if (!offline) {
        void load()
      }
    } else {
      void load()
    }
    return () => ctrlRef.current?.abort()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const refetch = useCallback(() => load(), [load])

  return { summary, loading, error, isStale, refetch, offline }
}

const Dashboard: React.FC = () => {
  const { summary, loading, error, isStale, refetch, offline } = usePortfolioSummary()

  const headerRight = useMemo(
    () => (
      <div className="flex items-center gap-3">
        {offline && <span className="text-xs text-amber-600">offline</span>}
        {isStale && <span className="text-xs text-gray-500">stale</span>}
        <button
          onClick={refetch}
          className="px-3 py-1 rounded-md border border-gray-300 text-sm hover:bg-gray-50 active:bg-gray-100"
          aria-label="Refresh dashboard"
        >
          Refresh
        </button>
      </div>
    ),
    [isStale, refetch, offline]
  )

  if (loading && !summary) {
    return (
      <div className="p-6 space-y-4">
        <div className="h-6 w-48 bg-gray-200 animate-pulse rounded" />
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
          <div className="h-48 bg-gray-100 animate-pulse rounded-xl" />
        </div>
      </div>
    )
  }

  if (error && !summary) {
    return (
      <div className="p-6">
        <div className="mb-3 text-red-600">Error: {error}</div>
        <button
          onClick={refetch}
          className="px-4 py-2 rounded-md bg-red-600 text-white hover:bg-red-700"
        >
          Try again
        </button>
      </div>
    )
  }

  if (!summary) return null

  return (
    <div className="p-6 space-y-4">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Portfolio Dashboard</h2>
        {headerRight}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
    </div>
  )
}

export default Dashboard
