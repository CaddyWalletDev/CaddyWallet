import { z } from "zod"

// -----------------------------
// API endpoint literals
// -----------------------------
export const API_ENDPOINTS = {
  portfolioSummary: "/api/portfolio/summary",
  sentiment:        "/api/sentiment",
  swapQuote:        "/api/swap/quote",
  swapExecute:      "/api/swap/execute",
} as const
export type ApiEndpoints = typeof API_ENDPOINTS

// -----------------------------
// Default numeric settings
// -----------------------------
export const DEFAULTS = {
  pollingIntervalMs:   15_000,
  sentimentTimeoutMs:  5_000,
  swapSlippagePct:     0.5,
  swapTimeoutSec:      30,
} as const
export type Defaults = typeof DEFAULTS

// -----------------------------
// UI layout constants
// -----------------------------
export const UI_CONFIG = {
  chartResolution:      100,
  panelPadding:         6,
  widgetPadding:        5,
  sparklineStrokeWidth: 2,
} as const
export type UiConfig = typeof UI_CONFIG

// -----------------------------
// Env helpers
// -----------------------------

/** Try a list of env keys, return first non-empty value */
function envFirst(keys: string[], env = process.env): string | undefined {
  for (const k of keys) {
    const v = env[k]
    if (v !== undefined && v !== "") return v
  }
  return undefined
}

function envNumberAny(keys: string[], fallback: number, opts?: { min?: number; max?: number; integer?: boolean; nonnegative?: boolean }): number {
  const raw = envFirst(keys)
  const n = raw === undefined ? NaN : Number(raw)
  let v = Number.isFinite(n) ? n : fallback
  if (opts?.integer) v = Math.trunc(v)
  if (opts?.nonnegative && v < 0) v = fallback
  if (opts?.min !== undefined && v < opts.min) v = opts.min
  if (opts?.max !== undefined && v > opts.max) v = opts.max
  return v
}

function envPctAny(keys: string[], fallback: number): number {
  const raw = envFirst(keys)
  const n = raw === undefined ? NaN : Number(raw)
  if (!Number.isFinite(n)) return fallback
  return n < 0 ? 0 : n > 100 ? 100 : n
}

function envBool(key: string, fallback = false): boolean {
  const v = process.env[key]
  if (v === undefined) return fallback
  const s = v.trim().toLowerCase()
  return ["1", "true", "yes", "y", "on"].includes(s)
}

// -----------------------------
// Zod schema for validated config
// -----------------------------
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
    /** Derived: slippage as fraction in [0,1] */
    swapSlippageFraction: z.number().min(0).max(1),
  }),
  ui: z.object({
    chartResolution:      z.number().int().positive(),
    panelPadding:         z.number().int().nonnegative(),
    widgetPadding:        z.number().int().nonnegative(),
    sparklineStrokeWidth: z.number().int().nonnegative(),
  }),
  env: z.object({
    nodeEnv: z.enum(["development", "test", "production"]).default("development"),
    isDev:   z.boolean(),
    isTest:  z.boolean(),
    isProd:  z.boolean(),
  }),
})
export type AppConfig = z.infer<typeof appConfigSchema>

// -----------------------------
// Build runtime config (with env overrides)
// -----------------------------
/**
 * Build config from a provided env (defaults to process.env). Keeps strong literal checks on endpoints.
 * Adds derived defaults.swapSlippageFraction and env info.
 */
export function buildAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const rawConfig = {
    endpoints: API_ENDPOINTS,
    defaults: {
      // Support both POLLING_INTERVAL_MS and POLL_INTERVAL_MS as synonyms
      pollingIntervalMs:  envNumberAny(["POLLING_INTERVAL_MS", "POLL_INTERVAL_MS"], DEFAULTS.pollingIntervalMs, { integer: true, min: 1 }),
      sentimentTimeoutMs: envNumberAny(["SENTIMENT_TIMEOUT_MS", "SENT_TIMEOUT_MS"], DEFAULTS.sentimentTimeoutMs, { integer: true, min: 1 }),
      swapSlippagePct:    envPctAny(["SWAP_SLIPPAGE_PCT"], DEFAULTS.swapSlippagePct),
      swapTimeoutSec:     envNumberAny(["SWAP_TIMEOUT_SEC"], DEFAULTS.swapTimeoutSec, { integer: true, min: 1 }),
      swapSlippageFraction: 0, // placeholder; set below
    },
    ui: {
      chartResolution:      envNumberAny(["UI_CHART_RESOLUTION"], UI_CONFIG.chartResolution, { integer: true, min: 1 }),
      panelPadding:         envNumberAny(["UI_PANEL_PADDING"], UI_CONFIG.panelPadding, { integer: true, min: 0 }),
      widgetPadding:        envNumberAny(["UI_WIDGET_PADDING"], UI_CONFIG.widgetPadding, { integer: true, min: 0 }),
      sparklineStrokeWidth: envNumberAny(["UI_SPARKLINE_STROKE_WIDTH"], UI_CONFIG.sparklineStrokeWidth, { integer: true, min: 0 }),
    },
    env: {
      nodeEnv: (env.NODE_ENV === "production" || env.NODE_ENV === "test") ? env.NODE_ENV : "development",
      isDev:   env.NODE_ENV !== "production" && env.NODE_ENV !== "test",
      isTest:  env.NODE_ENV === "test",
      isProd:  env.NODE_ENV === "production",
    },
  }

  rawConfig.defaults.swapSlippageFraction = rawConfig.defaults.swapSlippagePct / 100

  return appConfigSchema.parse(rawConfig)
}

// -----------------------------
// Endpoint resolution with API_BASE_URL
// -----------------------------
/**
 * If API_BASE_URL is set (e.g., https://api.example.com), returns full URLs for endpoints,
 * otherwise returns the original relative paths.
 */
export function resolveEndpoint(name: keyof ApiEndpoints, env: NodeJS.ProcessEnv = process.env): string {
  const base = envFirst(["API_BASE_URL"], env)
  const path = API_ENDPOINTS[name]
  if (!base) return path
  // Normalize join without double slashes
  const trimmed = base.endsWith("/") ? base.slice(0, -1) : base
  return path.startsWith("/") ? `${trimmed}${path}` : `${trimmed}/${path}`
}

export function resolvedEndpoints(env: NodeJS.ProcessEnv = process.env): Record<keyof ApiEndpoints, string> {
  return {
    portfolioSummary: resolveEndpoint("portfolioSummary", env),
    sentiment:        resolveEndpoint("sentiment", env),
    swapQuote:        resolveEndpoint("swapQuote", env),
    swapExecute:      resolveEndpoint("swapExecute", env),
  }
}

// -----------------------------
// Deep freeze util to protect at runtime
// -----------------------------
function deepFreeze<T>(obj: T): T {
  if (obj && typeof obj === "object") {
    Object.freeze(obj)
    for (const v of Object.values(obj as Record<string, unknown>)) {
      if (v && (typeof v === "object") && !Object.isFrozen(v)) deepFreeze(v)
    }
  }
  return obj
}

// -----------------------------
// Immutable, validated default instance
// -----------------------------
export const AppConfig: AppConfig = deepFreeze(buildAppConfig())

// Optional: expose a strict mode that warns on missing base URL when required
export const REQUIRE_ABSOLUTE_ENDPOINTS = envBool("REQUIRE_ABSOLUTE_ENDPOINTS", false)
if (REQUIRE_ABSOLUTE_ENDPOINTS) {
  const base = process.env.API_BASE_URL
  if (!base) {
    // eslint-disable-next-line no-console
    console.warn("[AppConfig] REQUIRE_ABSOLUTE_ENDPOINTS is true but API_BASE_URL is not set.")
  }
}
