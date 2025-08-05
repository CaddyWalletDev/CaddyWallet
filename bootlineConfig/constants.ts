import { z } from "zod"

// API endpoint literals
export const API_ENDPOINTS = {
  portfolioSummary: "/api/portfolio/summary",
  sentiment:        "/api/sentiment",
  swapQuote:        "/api/swap/quote",
  swapExecute:      "/api/swap/execute",
} as const
export type ApiEndpoints = typeof API_ENDPOINTS

// Default numeric settings
export const DEFAULTS = {
  pollingIntervalMs:   15_000,
  sentimentTimeoutMs:  5_000,
  swapSlippagePct:     0.5,
  swapTimeoutSec:      30,
} as const
export type Defaults = typeof DEFAULTS

// UI layout constants
export const UI_CONFIG = {
  chartResolution:      100,
  panelPadding:         6,
  widgetPadding:        5,
  sparklineStrokeWidth: 2,
} as const
export type UiConfig = typeof UI_CONFIG

/** Helper to read numeric env var, fallback to default */
function envNumber(key: string, fallback: number): number {
  const v = Number(process.env[key])
  return Number.isFinite(v) && v >= 0 ? v : fallback
}

/** Helper to read percentage env var (0–100), fallback */
function envPct(key: string, fallback: number): number {
  const v = Number(process.env[key])
  return Number.isFinite(v) && v >= 0 && v <= 100 ? v : fallback
}

// Schema for validated config
export const appConfigSchema = z.object({
  endpoints: z.object({
    portfolioSummary: z.literal(API_ENDPOINTS.portfolioSummary),
    sentiment:        z.literal(API_ENDPOINTS.sentiment),
    swapQuote:        z.literal(API_ENDPOINTS.swapQuote),
    swapExecute:      z.literal(API_ENDPOINTS.swapExecute),
  }),
  defaults: z.object({
    pollingIntervalMs:  z.number().int().positive(),
    sentimentTimeoutMs: z.number().int().positive(),
    swapSlippagePct:    z.number().min(0).max(100),
    swapTimeoutSec:     z.number().int().positive(),
  }),
  ui: z.object({
    chartResolution:      z.number().int().positive(),
    panelPadding:         z.number().int().nonnegative(),
    widgetPadding:        z.number().int().nonnegative(),
    sparklineStrokeWidth: z.number().int().nonnegative(),
  }),
})
export type AppConfig = z.infer<typeof appConfigSchema>

// Build runtime config with possible env overrides
const rawConfig = {
  endpoints: API_ENDPOINTS,
  defaults: {
    pollingIntervalMs:  envNumber("POLL_INTERVAL_MS",   DEFAULTS.pollingIntervalMs),
    sentimentTimeoutMs: envNumber("SENT_TIMEOUT_MS",    DEFAULTS.sentimentTimeoutMs),
    swapSlippagePct:    envPct("SWAP_SLIPPAGE_PCT",     DEFAULTS.swapSlippagePct),
    swapTimeoutSec:     envNumber("SWAP_TIMEOUT_SEC",   DEFAULTS.swapTimeoutSec),
  },
  ui: {
    chartResolution:      envNumber("UI_CHART_RESOLUTION",      UI_CONFIG.chartResolution),
    panelPadding:         envNumber("UI_PANEL_PADDING",         UI_CONFIG.panelPadding),
    widgetPadding:        envNumber("UI_WIDGET_PADDING",        UI_CONFIG.widgetPadding),
    sparklineStrokeWidth: envNumber("UI_SPARKLINE_STROKE_WIDTH", UI_CONFIG.sparklineStrokeWidth),
  },
}

// Immutable, validated config instance
export const AppConfig: AppConfig = Object.freeze(appConfigSchema.parse(rawConfig))
