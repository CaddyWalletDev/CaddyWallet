export class VolatilityPulse {
  private window: number
  private data: number[] = []

  constructor(window: number = 20) {
    this.window = window
  }

  update(value: number): number {
    this.data.push(value)
    if (this.data.length > this.window) {
      this.data.shift()
    }
    const mean = this.data.reduce((a, b) => a + b, 0) / this.data.length
    const variance = this.data.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / this.data.length
    return Math.sqrt(variance)
  }

  current(): number {
    if (!this.data.length) return 0
    const mean = this.data.reduce((a, b) => a + b, 0) / this.data.length
    return this.update(mean)
  }
}
