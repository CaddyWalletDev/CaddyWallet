import pLimit from "p-limit"
import { Connection, PublicKey, ConfirmedSignatureInfo } from "@solana/web3.js"

export interface EmergenceRates {
  [address: string]: number
}

/**
 * Scans a list of addresses to detect "emerging" accounts based on
 * transaction activity within a sliding time window.
 */
export class EmergingScanner {
  private connection: Connection
  private windowMs: number
  private threshold: number
  private concurrency: number

  /**
   * @param rpcUrl     RPC endpoint for Solana
   * @param windowMs   Time window in milliseconds for activity
   * @param threshold  Minimum tx count within window to consider "emerging"
   * @param concurrency Number of parallel RPC calls (default 5)
   */
  constructor(
    rpcUrl: string,
    windowMs: number = 60_000,
    threshold: number = 100,
    concurrency: number = 5
  ) {
    this.connection = new Connection(rpcUrl, "confirmed")
    this.windowMs = windowMs
    this.threshold = threshold
    this.concurrency = concurrency
  }

  /**
   * Returns the list of addresses considered "emerging"
   * (i.e. tx count ≥ threshold within the window).
   */
  async scan(addresses: string[]): Promise<string[]> {
    const now = Date.now()
    const emerging = new Set<string>()
    const limit = pLimit(this.concurrency)

    await Promise.all(
      addresses.map(addr =>
        limit(async () => {
          try {
            const sigs = await this.connection.getSignaturesForAddress(
              new PublicKey(addr),
              { limit: 50 }
            )
            const recentCount = sigs.filter(s => {
              const ts = (s.blockTime ?? 0) * 1000
              return now - ts <= this.windowMs
            }).length

            if (recentCount >= this.threshold) {
              emerging.add(addr)
            }
          } catch (err) {
            console.warn(`Scan failed for ${addr}:`, err)
          }
        })
      )
    )

    return Array.from(emerging)
  }

  /**
   * Computes emergence rates (txs per second) for each address
   * based on recent transactions within the window.
   */
  async getEmergenceRates(addresses: string[]): Promise<EmergenceRates> {
    const now = Date.now()
    const rates: EmergenceRates = {}
    const limit = pLimit(this.concurrency)

    await Promise.all(
      addresses.map(addr =>
        limit(async () => {
          try {
            const sigs = await this.connection.getSignaturesForAddress(
              new PublicKey(addr),
              { limit: 100 }
            )
            const count = sigs.filter(s => {
              const ts = (s.blockTime ?? 0) * 1000
              return now - ts <= this.windowMs
            }).length
            rates[addr] = count / (this.windowMs / 1000)
          } catch (err) {
            console.warn(`Rate calc failed for ${addr}:`, err)
            rates[addr] = 0
          }
        })
      )
    )

    return rates
  }
}
