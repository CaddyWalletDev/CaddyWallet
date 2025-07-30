/**
 * Represents contextual information for an action execution.
 */
export interface ActionContext<Payload = unknown, Result = unknown> {
  /** The input data for the action */
  payload: Payload
  /** Metadata about the execution context */
  metadata: {
    /** Origin identifier (e.g. "user", "system") */
    origin: string
    /** Unix timestamp in milliseconds */
    timestamp: number
  }
}

/**
 * Standardized result of an action run.
 */
export interface ActionResult<T = unknown> {
  success: boolean
  data?: T
  error?: string
  durationMs?: number
}

/**
 * Base abstract class for implementing Caddy-style actions.
 * Adds hooks for pre/post execution, structured logging, and error handling.
 */
export abstract class BaseCaddyAction<
  Payload = unknown,
  Response = unknown
> {
  /**
   * Hook: called before validation/execution.
   * Can be overridden to modify context or short-circuit.
   */
  protected async beforeRun(
    context: ActionContext<Payload>
  ): Promise<void> {
    // no-op by default, override in subclass if needed
  }

  /**
   * Execute the core logic of the action. Must be implemented by subclasses.
   * @param context The action context
   * @returns A result or data payload
   */
  protected abstract execute(
    context: ActionContext<Payload>
  ): Promise<Response>

  /**
   * Hook: called after successful execution.
   * Can be overridden to post-process the result.
   */
  protected async afterRun(
    context: ActionContext<Payload>,
    result: Response
  ): Promise<void> {
    // no-op by default, override in subclass if needed
  }

  /**
   * Validates the incoming context. Throws on failure.
   * @param context The action context
   */
  protected validate(
    context: ActionContext<Payload>
  ): void {
    if (context.payload == null) {
      throw new Error("Action payload is required")
    }
    const md = context.metadata
    if (
      !md ||
      typeof md.origin !== "string" ||
      typeof md.timestamp !== "number"
    ) {
      throw new Error("Invalid or missing metadata")
    }
    if (md.timestamp > Date.now() + 1000) {
      throw new Error("Metadata timestamp cannot be in the future")
    }
  }

  /**
   * Logs structured information.
   */
  protected log(
    level: "info" | "warn" | "error",
    message: string,
    meta?: Record<string, unknown>
  ): void {
    const entry = {
      level,
      message,
      timestamp: new Date().toISOString(),
      ...meta,
    }
    console[level]("[BaseCaddyAction]", entry)
  }

  /**
   * Run the action with built-in hooks, validation and error capture.
   * @param context The action context
   * @returns A standardized ActionResult
   */
  public async run(
    context: ActionContext<Payload>
  ): Promise<ActionResult<Response>> {
    const start = Date.now()
    try {
      await this.beforeRun(context)
      this.validate(context)
      this.log("info", "Validation passed", {
        origin: context.metadata.origin,
      })

      const data = await this.execute(context)

      await this.afterRun(context, data)
      const durationMs = Date.now() - start

      this.log("info", "Execution succeeded", { durationMs })
      return { success: true, data, durationMs }
    } catch (err: any) {
      const durationMs = Date.now() - start
      const errorMsg = err?.message ?? "Unknown error"
      this.log("error", "Execution failed", { error: errorMsg, durationMs })
      return { success: false, error: errorMsg, durationMs }
    }
  }
}
