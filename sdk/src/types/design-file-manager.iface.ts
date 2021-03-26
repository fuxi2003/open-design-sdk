import type { ReadStream } from 'fs'

export interface IDesignFileManager {
  readDesignFileStream(filePath: string): Promise<ReadStream>

  saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void>
}
