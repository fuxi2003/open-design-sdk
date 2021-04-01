import type { ReadStream } from 'fs'

export interface IDesignFileManager {
  getWorkingDirectory(): string

  setWorkingDirectory(workingDirectory: string | null): void

  readDesignFileStream(filePath: string): Promise<ReadStream>

  saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void>
}
