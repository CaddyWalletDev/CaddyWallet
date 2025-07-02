import { Transaction } from './types'

export function calculateMean(values: number[]): number {
  if (!values.length) return 0
  const sum = values.reduce((a, b) => a + b, 0)
  return sum / values.length
}

export function calculateStd(values: number[]): number {
  const mean = calculateMean(values)
  const variance =
    values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) /
    (values.length || 1)
  return Math.sqrt(variance)
}

export function movingAverage(
  values: number[],
  windowSize: number
): number[] {
  const result: number[] = []
  for (let i = 0; i < values.length; i++) {
    const start = Math.max(0, i - windowSize + 1)
    const window = values.slice(start, i + 1)
    const avg = calculateMean(window)
    result.push(avg)
  }
  return result
}

export function zScores(values: number[]): number[] {
  const mean = calculateMean(values)
  const std = calculateStd(values) || 1
  return values.map(v => (v - mean) / std)
}

export function groupBy<T>(
  arr: T[],
  keyFn: (item: T) => string
): Record<string, T[]> {
  return arr.reduce((acc, item) => {
    const key = keyFn(item)
    if (!acc[key]) acc[key] = []
    acc[key].push(item)
    return acc
  }, {} as Record<string, T[]>)
}
