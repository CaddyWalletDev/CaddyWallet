export type AlertLevel = 'info' | 'warn' | 'error' | 'critical'

export interface AlertPayload {
  level: AlertLevel
  message: string
  details?: any
  timestamp?: number
}

export class CaddyAlertService {
  private handlers: Array<(payload: AlertPayload) => void> = []

  onAlert(handler: (payload: AlertPayload) => void): void {
    this.handlers.push(handler)
  }

  alert(payload: AlertPayload): void {
    payload.timestamp = payload.timestamp || Date.now()
    for (const h of this.handlers) {
      try {
        h(payload)
      } catch {
        // swallow
      }
    }
  }
}
