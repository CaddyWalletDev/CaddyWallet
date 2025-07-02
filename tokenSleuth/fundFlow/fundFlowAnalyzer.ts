import { FlowRecord } from './fundFlowApi'

export interface FlowSummary {
  totalIn: number
  totalOut: number
  net: number
  topInFlows: FlowRecord[]
  topOutFlows: FlowRecord[]
}

export class FundFlowAnalyzer {
  summarize(records: FlowRecord[]): FlowSummary {
    const inflows = records.filter(r => r.change > 0)
    const outflows = records.filter(r => r.change < 0)
    const totalIn = inflows.reduce((sum, r) => sum + r.change, 0)
    const totalOut = outflows.reduce((sum, r) => sum + r.change, 0)
    const net = totalIn + totalOut
    const topInFlows = inflows.sort((a, b) => b.change - a.change).slice(0, 5)
    const topOutFlows = outflows.sort((a, b) => a.change - b.change).slice(0, 5)
    return { totalIn, totalOut, net, topInFlows, topOutFlows }
  }

  detectAnomalies(records: FlowRecord[], threshold: number): FlowRecord[] {
    return records.filter(r => Math.abs(r.change) >= threshold)
  }
}
