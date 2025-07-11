/**
 * Represents contextual information for an action execution.
 */
export interface ActionContext<Payload = unknown, Result = unknown> {
  /**
   * The input data for the action
   */
  payload: Payload
  /**
   * Metadata about the execution context
   */
  metadata: {
    /** Origin identifier (e.g. "user", "system") */
    origin: string
    /** Unix timestamp in milliseconds */
    timestamp: number
  }
}

/**
 * Standardized result of an action run
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Base abstract class for implementing Caddy-style actions.
 * Provides validation, execution orchestration, and error handling.
 */
export abstract class BaseCaddyAction<Payload = unknown, Response = unknown> {
  /**
   * Execute the core logic of the action. Must be implemented by subclasses.
   * @param context The action context
   * @returns A result or data payload
   */
  protected abstract execute(context: ActionContext<Payload>): Promise<Response>

  /**
   * Validate the incoming context. Throws on failure.
   * @param context The action context
   */
  protected validate(context: ActionContext<Payload>): void {
    if (context.payload == null) {
      throw new Error("Action payload is required")
    }
    if (
      !context.metadata ||
      typeof context.metadata.origin !== "string" ||
      typeof context.metadata.timestamp !== "number"
    ) {
      throw new Error("Invalid or missing metadata")
    }
  }

  /**
   * Run the action with built-in validation and error capture.
   * @param context The action context
   * @returns A standardized ActionResult
   */
  public async run(
    context: ActionContext<Payload>
  ): Promise<ActionResult<Response>> {
    try {
      this.validate(context)
      const result = await this.execute(context)
      return { success: true, data: result }
    } catch (err: any) {
      return { success: false, error: err.message }
    }
  }
}
