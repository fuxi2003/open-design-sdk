export interface IDesignFileManager {
  readDesignFileStream(filePath: string): Promise<NodeJS.ReadableStream>

  saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void>
}
