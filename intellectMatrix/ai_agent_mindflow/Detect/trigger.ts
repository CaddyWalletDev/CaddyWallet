/**
 * Trigger module for AI Agent Mindflow
 *
 * This class listens for DetectionResult events, evaluates conditions,
 * and maps detections to predefined actions. It supports cooldowns
 * to prevent repeated triggers and dynamic thresholds adjustments.
 */

export interface TriggerConfig {
  /** Minimum confidence required to fire an action */
  confidenceThreshold: number
  /** Cooldown period (ms) after an action is fired */
  cooldownMs: number
  /** Mapping from detection types to action names */
  actionMap: Record<string, string>
}

export interface DetectionResult {
  detected: boolean
  contributingEvents: Array<{ timestamp: number; value: number }>
  explanation: string
  confidence?: number
  type?: string
}

export interface TriggerOutcome {
  actionFired?: string
  timestamp: number
  explanation: string
}

export class Trigger {
  private config: TriggerConfig
  private lastFired: Record<string, number> = {}

  constructor(config: Partial<TriggerConfig> = {}) {
    this.config = {
      confidenceThreshold: 0.7,
      cooldownMs: 10000,
      actionMap: {},
      ...config
    }
  }

  /**
   * Attempt to fire an action based on a DetectionResult
   */
  attempt(result: DetectionResult): TriggerOutcome {
    const now = Date.now()
    const type = result.type || 'default'
    const last = this.lastFired[type] || 0

    if (!result.detected) {
      return { timestamp: now, explanation: 'No detection' }
    }

    const confidence = result.confidence ?? 1
    if (confidence < this.config.confidenceThreshold) {
      return { timestamp: now, explanation: `Confidence ${confidence} below threshold` }
    }

    if (now - last < this.config.cooldownMs) {
      return { timestamp: now, explanation: 'In cooldown period' }
    }

    const action = this.config.actionMap[type] || 'no-action'
    this.lastFired[type] = now
    return {
      actionFired: action,
      timestamp: now,
      explanation: `Fired action "${action}" for type "${type}" with confidence ${confidence}`
    }
  }

  /**
   * Update the mapping of detection types to actions
   */
  updateActionMap(map: Record<string, string>): void {
    this.config.actionMap = { ...this.config.actionMap, ...map }
  }

  /**
   * Manually reset cooldown for a given detection type
   */
  resetCooldown(type: string): void {
    delete this.lastFired[type]
  }

  /**
   * Adjust confidence threshold at runtime
   */
  setThreshold(value: number): void {
    this.config.confidenceThreshold = value
  }
}
