import { ShiftRecord } from './assetShiftApi'

export interface ShiftSummary {
  totalIn: number
  totalOut: number
  net: number
  topMovers: ShiftRecord[]
}

export class AssetShiftMonitor {
  summarize(records: ShiftRecord[]): ShiftSummary {
    const inflows = records.filter(r => r.delta > 0)
    const outflows = records.filter(r => r.delta < 0)
    const totalIn = inflows.reduce((sum, r) => sum + r.delta, 0)
    const totalOut = outflows.reduce((sum, r) => sum + r.delta, 0)
    const net = totalIn + totalOut
    const sorted = records.slice().sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
    const topMovers = sorted.slice(0, 5)
    return { totalIn, totalOut, net, topMovers }
  }

  detectAnomaly(records: ShiftRecord[], threshold: number): ShiftRecord[] {
    return records.filter(r => Math.abs(r.delta) >= threshold)
  }

  aggregateBySlot(records: ShiftRecord[]): Record<number, number> {
    return records.reduce((acc, r) => {
      acc[r.slot] = (acc[r.slot] || 0) + r.delta
      return acc
    }, {} as Record<number, number>)
  }
}
