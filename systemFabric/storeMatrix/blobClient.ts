export class BlobClient {
  constructor(private serviceUrl: string, private credential: any) {}

  private getClient(containerName: string) {
    const pipeline = /* create pipeline with credential */
    return new (/* BlobServiceClient */)(this.serviceUrl, pipeline)
      .getContainerClient(containerName)
  }

  async uploadBlob(container: string, blobName: string, data: Uint8Array): Promise<void> {
    const client = this.getClient(container)
    const block = client.getBlockBlobClient(blobName)
    await block.uploadData(data, { blobHTTPHeaders: { blobContentType: 'application/octet-stream' } })
  }

  async downloadBlob(container: string, blobName: string): Promise<Uint8Array> {
    const client = this.getClient(container)
    const download = await client.getBlobClient(blobName).download()
    const chunks: Uint8Array[] = []
    for await (const chunk of download.readableStreamBody!) {
      chunks.push(chunk)
    }
    return Uint8Array.from(chunks.reduce((a, b) => [...a, ...b], [] as number[]))
  }

  async deleteBlob(container: string, blobName: string): Promise<void> {
    const client = this.getClient(container)
    await client.getBlobClient(blobName).deleteIfExists()
  }
}
