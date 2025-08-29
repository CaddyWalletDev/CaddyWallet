import { BlobServiceClient, ContainerClient, BlockBlobClient } from "@azure/storage-blob"

export interface StorageOptions {
  /** Default container name used by save/load/remove/list */
  defaultContainer: string
  /** Retry policy (deterministic backoff) */
  retryOptions?: {
    maxTries?: number
    retryDelayInMs?: number
    maxRetryDelayInMs?: number
  }
  /** One of the two must be provided */
  connectionString?: string              // e.g. "DefaultEndpointsProtocol=...;AccountName=...;AccountKey=...;EndpointSuffix=core.windows.net"
  serviceUrl?: string                    // e.g. "https://<account>.blob.core.windows.net" (optionally with SAS: ?sv=...)
}

type CredentialLike = any // StorageSharedKeyCredential | TokenCredential | undefined

export class BlobStorage {
  private svc: BlobServiceClient
  private readonly options: Required<Pick<StorageOptions, "defaultContainer">> & StorageOptions["retryOptions"]

  constructor(options: StorageOptions, credential?: CredentialLike) {
    if (!options?.defaultContainer) {
      throw new Error("defaultContainer is required")
    }
    // Configure retry defaults
    const retry = {
      maxTries: Math.max(1, options.retryOptions?.maxTries ?? 3),
      retryDelayInMs: Math.max(50, options.retryOptions?.retryDelayInMs ?? 250),
      maxRetryDelayInMs: Math.max(500, options.retryOptions?.maxRetryDelayInMs ?? 5_000),
    }
    this.options = { defaultContainer: options.defaultContainer, ...retry }

    if (options.connectionString) {
      this.svc = BlobServiceClient.fromConnectionString(options.connectionString, {
        retryOptions: {
          maxTries: retry.maxTries,
          tryTimeoutInMs: 0, // no global timeout here; we handle delays explicitly
        },
      })
    } else if (options.serviceUrl) {
      // If serviceUrl includes a SAS token, credential may be omitted.
      this.svc = new BlobServiceClient(options.serviceUrl, credential, {
        retryOptions: {
          maxTries: retry.maxTries,
          tryTimeoutInMs: 0,
        },
      })
    } else {
      throw new Error("Provide either connectionString or serviceUrl")
    }
  }

  /** Ensure the default container exists (idempotent). Call once at startup. */
  async initialize(): Promise<void> {
    await this.ensureContainer(this.options.defaultContainer)
  }

  /** Save bytes as a blob under the given key (path). Optionally override container. */
  async save(key: string, data: Uint8Array, container = this.options.defaultContainer, contentType?: string, metadata?: Record<string, string>): Promise<void> {
    if (!key) throw new Error("key is required")
    const client = await this.getBlockBlobClient(container, key)
    const headers = { blobContentType: contentType ?? this.contentTypeForKey(key) }
    await this.withRetry(() => client.uploadData(data, { blobHTTPHeaders: headers, metadata }))
  }

  /** Load blob bytes by key. Throws if not found. Optionally override container. */
  async load(key: string, container = this.options.defaultContainer): Promise<Uint8Array> {
    if (!key) throw new Error("key is required")
    const client = await this.getBlockBlobClient(container, key)
    const buffer = await this.withRetry(() => client.downloadToBuffer())
    return new Uint8Array(buffer)
  }

  /** Remove a blob if it exists. Optionally override container. */
  async remove(key: string, container = this.options.defaultContainer): Promise<void> {
    if (!key) throw new Error("key is required")
    const client = await this.getBlockBlobClient(container, key)
    await this.withRetry(() => client.deleteIfExists())
  }

  /** List blob names with an optional prefix. Optionally override container. */
  async list(prefix = "", container = this.options.defaultContainer): Promise<string[]> {
    const cont = await this.getContainerClient(container)
    const items: string[] = []
    for await (const blob of cont.listBlobsFlat({ prefix })) {
      items.push(blob.name)
    }
    return items
  }

  /** Return a URL for a blob (useful if container is public or URL has SAS on service). */
  async url(key: string, container = this.options.defaultContainer): Promise<string> {
    const client = await this.getBlockBlobClient(container, key)
    return client.url
  }

  // ---------------- internals ----------------

  private async ensureContainer(name: string): Promise<ContainerClient> {
    const cont = this.svc.getContainerClient(name)
    await this.withRetry(() => cont.createIfNotExists())
    return cont
  }

  private async getContainerClient(name: string): Promise<ContainerClient> {
    const cont = this.svc.getContainerClient(name)
    // Lazily ensure on first use if it doesn't exist
    const exists = await this.withRetry(() => cont.exists())
    if (!exists) await this.withRetry(() => cont.create())
    return cont
  }

  private async getBlockBlobClient(container: string, key: string): Promise<BlockBlobClient> {
    const cont = await this.getContainerClient(container)
    return cont.getBlockBlobClient(key)
  }

  private async withRetry<T>(fn: () => Promise<T>): Promise<T> {
    const { maxTries, retryDelayInMs, maxRetryDelayInMs } = this.options
    let lastErr: any
    for (let attempt = 1; attempt <= (maxTries ?? 3); attempt++) {
      try {
        return await fn()
      } catch (err: any) {
        lastErr = err
        if (attempt >= (maxTries ?? 3)) break
        const delay = Math.min(maxRetryDelayInMs ?? 5_000, (retryDelayInMs ?? 250) * attempt * attempt)
        await new Promise(r => setTimeout(r, delay))
      }
    }
    throw lastErr
  }

  private contentTypeForKey(key: string): string {
    const ext = key.toLowerCase().split(".").pop() || ""
    switch (ext) {
      case "json": return "application/json"
      case "txt": return "text/plain; charset=utf-8"
      case "csv": return "text/csv; charset=utf-8"
      case "png": return "image/png"
      case "jpg":
      case "jpeg": return "image/jpeg"
      case "gif": return "image/gif"
      case "webp": return "image/webp"
      case "svg": return "image/svg+xml"
      case "pdf": return "application/pdf"
      default: return "application/octet-stream"
    }
  }
}
