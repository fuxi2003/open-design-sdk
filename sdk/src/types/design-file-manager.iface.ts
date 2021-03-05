export interface IDesignFileManager {
  readDesignFileStream(relPath: string): Promise<NodeJS.ReadableStream>

  saveDesignFileStream(
    relPath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void>
}
