import { Readable } from 'stream'
import { createGunzip } from 'zlib'
import { ContentEncoding, ContentItem, RawContent } from './types'

export class SimpleContentItem implements ContentItem {
  constructor(
    private streamCreator: () => Promise<Readable>,
    private length?: number,
    private encoding?: ContentEncoding | null
  ) {}

  static fromBuffer(buffer: Uint8Array): SimpleContentItem {
    return new SimpleContentItem(async () => bufferToStream(buffer), buffer.length, null)
  }

  /**
   * Gets the readable stream, uncompressed if necessary.
   */
  async asStream(): Promise<Readable> {
    const stream = await this.streamCreator()

    if (this.encoding == 'gzip') {
      return stream.pipe(createGunzip())
    }

    return stream
  }

  /**
   * Used to get the raw stream, no matter how it is stored.
   * That may imply that the stream may be compressed, if so, the
   * compression encoding should be available in "content".
   */
  async asRawStream(): Promise<RawContent> {
    return {
      stream: await this.streamCreator(),
      encoding: this.encoding || null,
      size: this.length || null
    }
  }
}

export function bufferToStream(buffer: Uint8Array): Readable {
  return Readable.from(Buffer.from(buffer))
}

export function streamToBuffer(stream: Readable): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const buffers: Uint8Array[] = []
    stream.on('error', reject)
    stream.on('data', (data) => {
      if (data instanceof Uint8Array) {
        buffers.push(data)
      } else {
        reject(new Error('Stream did not emit Uint8Array'))
        stream.destroy()
      }
    })
    stream.on('end', () => resolve(Buffer.concat(buffers)))
  })
}
