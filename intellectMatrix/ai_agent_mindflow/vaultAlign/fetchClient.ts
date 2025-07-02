

import fetch, { RequestInit, Response } from 'node-fetch'

export interface FetchClientOptions {
  timeoutMs?: number
  maxRetries?: number
  backoffFactor?: number
  defaultHeaders?: Record<string, string>
}

export class FetchClient {
  private timeoutMs: number
  private maxRetries: number
  private backoffFactor: number
  private defaultHeaders: Record<string, string>

  constructor(options: FetchClientOptions = {}) {
    this.timeoutMs = options.timeoutMs ?? 5000
    this.maxRetries = options.maxRetries ?? 3
    this.backoffFactor = options.backoffFactor ?? 2
    this.defaultHeaders = options.defaultHeaders ?? { 'Content-Type': 'application/json' }
  }

  private async timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
    let id: NodeJS.Timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      id = setTimeout(() => reject(new Error('Request timed out')), ms)
    })
    const result = await Promise.race([promise, timeoutPromise])
    clearTimeout(id!)
    return result as T
  }

  private async request<T>(url: string, opts: RequestInit = {}): Promise<T> {
    let attempt = 0
    let delay = 200
    while (true) {
      try {
        const mergedOpts: RequestInit = {
          ...opts,
          headers: { ...this.defaultHeaders, ...(opts.headers || {}) }
        }
        const response: Response = await this.timeout(fetch(url, mergedOpts), this.timeoutMs)
        if (!response.ok) {
          const text = await response.text()
          throw new Error(`HTTP ${response.status}: ${text}`)
        }
        return (await response.json()) as T
      } catch (err) {
        if (++attempt > this.maxRetries) throw err
        await new Promise(r => setTimeout(r, delay))
        delay *= this.backoffFactor
      }
    }
  }

  async get<T>(url: string): Promise<T> {
    return this.request<T>(url, { method: 'GET' })
  }

  async post<T>(url: string, body: any): Promise<T> {
    return this.request<T>(url, { method: 'POST', body: JSON.stringify(body) })
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value
  }
}
