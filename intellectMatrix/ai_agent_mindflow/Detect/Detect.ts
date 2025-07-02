/**
 * Detect module for AI Agent Mindflow
 *
 * This class encapsulates the logic for detecting patterns,
 * anomalies, and triggers within a stream of input events.
 * It provides methods to configure detection parameters,
 * process incoming data, and emit detection results.
 */

export interface DetectConfig {
  /** Minimum change threshold to consider as an event */
  changeThreshold: number
  /** Number of consecutive events required to confirm a pattern */
  confirmationCount: number
  /** Time window (ms) within which events must occur */
  timeWindow: number
}

export interface EventPoint {
  /** Timestamp of the event in milliseconds */
  timestamp: number
  /** Numeric value or magnitude of the event */
  value: number
}

export interface DetectionResult {
  /** Whether a pattern or anomaly was detected */
  detected: boolean
  /** List of events that contributed to detection */
  contributingEvents: EventPoint[]
  /** Explanation of why detection occurred */
  explanation: string
}

export class Detect {
  private config: DetectConfig
  private buffer: EventPoint[] = []

  constructor(config?: Partial<DetectConfig>) {
    // Merge provided config with sensible defaults
    this.config = {
      changeThreshold: 10,
      confirmationCount: 3,
      timeWindow: 5_000,
      ...config
    }
  }

  /**
   * Process a new event point.
   * Adds to buffer and attempts detection.
   */
  process(point: EventPoint): DetectionResult {
    this.buffer.push(point)
    this.cleanupBuffer()
    const candidates = this.buffer.filter(p => p.value >= this.config.changeThreshold)

    if (candidates.length >= this.config.confirmationCount) {
      const windowSpan = candidates[candidates.length - 1].timestamp - candidates[0].timestamp
      if (windowSpan <= this.config.timeWindow) {
        return this.createResult(true, candidates, windowSpan)
      }
    }

    return this.createResult(false, candidates, 0)
  }

  /**
   * Remove old events outside of the configured time window.
   */
  private cleanupBuffer(): void {
    const cutoff = Date.now() - this.config.timeWindow
    this.buffer = this.buffer.filter(p => p.timestamp >= cutoff)
  }

  /**
   * Construct a detection result with explanation.
   */
  private createResult(
    detected: boolean,
    events: EventPoint[],
    windowSpan: number
  ): DetectionResult {
    let explanation: string
    if (detected) {
      explanation = `Detected ${events.length} events ≥ threshold ${this.config.changeThreshold} within ${windowSpan}ms`
    } else {
      explanation = `Only ${events.length} events ≥ threshold ${this.config.changeThreshold} in buffer`
    }
    return { detected, contributingEvents: events, explanation }
  }

  /**
   * Reset internal state and clear buffered events.
   */
  reset(): void {
    this.buffer = []
  }
}
