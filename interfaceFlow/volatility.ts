export class VolatilityPulse {
  /** sliding window length (N) */
  private readonly window: number
  /** sample variance if true, population variance if false */
  private readonly sample: boolean

  /** circular buffer for last N values */
  private readonly buf: Float64Array
  /** write index into circular buffer */
  private idx = 0
  /** number of values currently stored (<= window) */
  private n = 0

  /** Kahan–compensated running sum */
  private sum = 0
  private sumC = 0
  /** Kahan–compensated running sum of squares */
  private sumSq = 0
  private sumSqC = 0

  /** last computed stddev (returned by update and exposed via current) */
  private lastStd = 0

  /**
   * @param window size of the rolling window (integer >= 2)
   * @param sample if true, uses sample variance (n-1); else population variance (n)
   */
  constructor(window: number = 20, sample = false) {
    if (!Number.isInteger(window) || window < 2) {
      throw new RangeError(`window must be an integer >= 2 (got ${window})`)
    }
    this.window = window
    this.sample = sample
    this.buf = new Float64Array(window)
  }

  /** Add a number and return the current rolling standard deviation */
  update(x: number): number {
    if (!Number.isFinite(x)) throw new TypeError("value must be a finite number")

    if (this.n < this.window) {
      // growing phase
      this.buf[this.idx] = x
      this.idx = (this.idx + 1) % this.window
      this.n++
      this.kahanAdd(x)
    } else {
      // steady phase: evict oldest, insert newest
      const old = this.buf[this.idx]
      this.buf[this.idx] = x
      this.idx = (this.idx + 1) % this.window
      this.kahanSub(old)
      this.kahanAdd(x)
    }

    this.lastStd = this.computeStd()
    return this.lastStd
  }

  /** Get the latest stddev without mutating the state */
  current(): number {
    return this.lastStd
  }

  /** Rolling mean */
  mean(): number {
    return this.n ? this.sum / this.n : 0
  }

  /** Rolling variance (population or sample based on constructor flag) */
  variance(): number {
    if (this.n < 2) return 0
    const n = this.n
    const meanSq = (this.sum * this.sum) / n
    const base = this.sumSq - meanSq
    const denom = this.sample ? n - 1 : n
    const v = base / denom
    return v > 0 ? v : 0
  }

  /** Rolling standard deviation (recomputed on demand) */
  stddev(): number {
    const v = this.variance()
    return v > 0 ? Math.sqrt(v) : 0
  }

  /** Z-score of a value (defaults to most recent), 0 if stddev is 0 */
  zScore(value?: number): number {
    const mu = this.mean()
    const sigma = this.stddev()
    if (sigma === 0) return 0
    const v = value ?? (this.n ? this.buf[(this.idx - 1 + this.window) % this.window] : 0)
    return (v - mu) / sigma
  }

  /** Number of points currently in the window */
  count(): number {
    return this.n
  }

  /** Reset all state */
  reset(): void {
    this.idx = 0
    this.n = 0
    this.sum = 0
    this.sumC = 0
    this.sumSq = 0
    this.sumSqC = 0
    this.lastStd = 0
    this.buf.fill(0)
  }

  /** Snapshot of current values in chronological order (oldest → newest) */
  values(): number[] {
    const out: number[] = []
    const start = (this.idx - this.n + this.window) % this.window
    for (let k = 0; k < this.n; k++) {
      out.push(this.buf[(start + k) % this.window])
    }
    return out
  }

  // ---- internal: compensated accumulation helpers ----

  private kahanAdd(x: number): void {
    // sum
    {
      const y = x - this.sumC
      const t = this.sum + y
      this.sumC = (t - this.sum) - y
      this.sum = t
    }
    // sum of squares
    {
      const xx = x * x
      const y = xx - this.sumSqC
      const t = this.sumSq + y
      this.sumSqC = (t - this.sumSq) - y
      this.sumSq = t
    }
  }

  private kahanSub(x: number): void {
    // sum
    {
      const y = -x - this.sumC
      const t = this.sum + y
      this.sumC = (t - this.sum) - y
      this.sum = t
    }
    // sum of squares
    {
      const xx = x * x
      const y = -xx - this.sumSqC
      const t = this.sumSq + y
      this.sumSqC = (t - this.sumSq) - y
      this.sumSq = t
    }
  }

  private computeStd(): number {
    if (this.n < 2) return 0
    const v = this.variance()
    return v > 0 ? Math.sqrt(v) : 0
  }
}
