// CaddyAgentCore.ts

export type PluginFn = (context: ActionContext) => Promise<void> // legacy plugin (no next)

/** Middleware with Koa-style signature; preferred for new plugins */
export type Middleware = (ctx: ActionContext, next: () => Promise<void>) => Promise<void>

/** Options that control invocation behavior */
export interface InvokeOptions {
  /** Max time allowed for the whole pipeline + action */
  timeoutMs?: number
  /** Number of retries on failure (default 0 = no retry) */
  retries?: number
  /** Abort the invocation if the signal is aborted */
  signal?: AbortSignal
  /** Called before each retry with the error and attempt number (1-based) */
  onRetry?: (err: unknown, attempt: number) => void
}

/** Execution metadata returned by invokeWithMeta */
export interface InvokeMeta {
  action: string
  startedAt: number
  endedAt: number
  durationMs: number
  attempts: number
}

/** Minimal shape of an action; your implementation can extend it */
export interface BaseCaddyAction<R = any> {
  run(ctx: ActionContext): Promise<R>
}

/** Minimal shape of the context */
export interface ActionContext {
  [key: string]: unknown
}

function toMiddleware(p: PluginFn): Middleware {
  // Wrap legacy plugin into middleware that always calls next
  return async (ctx, next) => {
    await p(ctx)
    await next()
  }
}

function compose(middlewares: Middleware[]): Middleware {
  // Koa-style composition
  return function (ctx: ActionContext, next: () => Promise<void>) {
    let index = -1
    const dispatch = (i: number): Promise<void> => {
      if (i <= index) return Promise.reject(new Error("next() called multiple times"))
      index = i
      const fn = i === middlewares.length ? next : middlewares[i]
      if (!fn) return Promise.resolve()
      return Promise.resolve(fn(ctx, () => dispatch(i + 1)))
    }
    return dispatch(0)
  }
}

async function withTimeout<T>(work: () => Promise<T>, ms?: number, signal?: AbortSignal): Promise<T> {
  if (!ms && !signal) return work()
  return new Promise<T>((resolve, reject) => {
    let settled = false
    let timer: any

    const onAbort = () => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      reject(new Error("Invocation aborted"))
    }

    if (ms && ms > 0) {
      timer = setTimeout(() => {
        if (settled) return
        settled = true
        reject(new Error(`Invocation timed out after ${ms}ms`))
      }, ms)
    }

    if (signal) {
      if (signal.aborted) return onAbort()
      signal.addEventListener("abort", onAbort, { once: true })
    }

    work()
      .then((val) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (signal) signal.removeEventListener("abort", onAbort)
        resolve(val)
      })
      .catch((err) => {
        if (settled) return
        settled = true
        clearTimeout(timer)
        if (signal) signal.removeEventListener("abort", onAbort)
        reject(err)
      })
  })
}

export class CaddyAgentCore {
  private actions = new Map<string, BaseCaddyAction>()
  private middlewares: Middleware[] = []

  /** Register or replace an action by name */
  register(name: string, action: BaseCaddyAction): void {
    if (!name || typeof name !== "string") throw new Error("Action name must be a non-empty string")
    if (!action || typeof action.run !== "function") throw new Error(`Action "${name}" must implement run(ctx)`)
    this.actions.set(name, action)
  }

  /** Remove a registered action by name; returns true if removed */
  unregister(name: string): boolean {
    return this.actions.delete(name)
  }

  /** Check if an action is registered */
  hasAction(name: string): boolean {
    return this.actions.has(name)
  }

  /** List all registered action names */
  listActions(): string[] {
    return Array.from(this.actions.keys())
  }

  /** Add a legacy plugin (no next) or modern middleware (with next) */
  use(plugin: PluginFn | Middleware): void {
    // Detect arity: if function length < 2, treat as legacy plugin
    const mw = (plugin as Middleware).length >= 2 ? (plugin as Middleware) : toMiddleware(plugin as PluginFn)
    this.middlewares.push(mw)
  }

  /**
   * Invoke an action by name with optional execution controls.
   * Returns exactly what the action returns (for backward compatibility).
   */
  async invoke<T = any>(name: string, context: ActionContext, options: InvokeOptions = {}): Promise<T> {
    const { result } = await this.invokeWithMeta<T>(name, context, options)
    return result
  }

  /**
   * Invoke an action and also return execution metadata
   */
  async invokeWithMeta<T = any>(
    name: string,
    context: ActionContext,
    options: InvokeOptions = {}
  ): Promise<{ result: T; meta: InvokeMeta }> {
    const action = this.actions.get(name)
    if (!action) throw new Error(`Action not found: ${name}`)

    const pipeline = compose(this.middlewares)
    const startedAt = Date.now()
    let attempts = 0

    const execOnce = async (): Promise<T> => {
      attempts++
      let output: T | undefined
      await pipeline(context, async () => {
        output = (await action.run(context)) as T
      })
      // At this point output must be set by the action.run
      return output as T
    }

    const retries = options.retries ?? 0

    let lastErr: unknown
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const result = await withTimeout(execOnce, options.timeoutMs, options.signal)
        const endedAt = Date.now()
        return {
          result,
          meta: {
            action: name,
            startedAt,
            endedAt,
            durationMs: endedAt - startedAt,
            attempts,
          },
        }
      } catch (err) {
        lastErr = err
        if (attempt < retries) {
          options.onRetry?.(err, attempt + 1)
          continue
        }
        break
      }
    }

    // Exhausted retries
    const endedAt = Date.now()
    const meta: InvokeMeta = {
      action: name,
      startedAt,
      endedAt,
      durationMs: endedAt - startedAt,
      attempts,
    }
    const error = lastErr instanceof Error ? lastErr : new Error(String(lastErr))
    // Attach meta for upstream error handlers if desired
    ;(error as any).__caddy_meta__ = meta
    throw error
  }

  /** Remove all actions and middlewares */
  clear(): void {
    this.actions.clear()
    this.middlewares = []
  }
}
