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
  chartResolution:     100,
  panelPadding:        6,
  widgetPadding:       5,
  sparklineStrokeWidth:2,
} as const
export type UiConfig = typeof UI_CONFIG

// Combined and validated application config
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
    chartResolution:     z.number().int().positive(),
    panelPadding:        z.number().int().nonnegative(),
    widgetPadding:       z.number().int().nonnegative(),
    sparklineStrokeWidth:z.number().int().nonnegative(),
  }),
})
export type AppConfig = z.infer<typeof appConfigSchema>

// Immutable, runtime‑validated config instance
export const AppConfig: AppConfig = appConfigSchema.parse({
  endpoints: API_ENDPOINTS,
  defaults:  DEFAULTS,
  ui:        UI_CONFIG,
})
