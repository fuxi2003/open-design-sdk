import { createReadStream, createWriteStream } from 'fs'
import { resolve as resolvePath } from 'path'

import type { IDesignFileManager } from '../types/design-file-manager.iface'

export class DesignFileManager implements IDesignFileManager {
  async readDesignFileStream(filePath: string): Promise<NodeJS.ReadableStream> {
    const filename = resolvePath(filePath)
    const stream = createReadStream(filename)

    return new Promise((resolve, reject) => {
      stream.once('ready', () => {
        resolve(stream)
      })
      stream.once('error', (err) => {
        reject(err)
      })
    })
  }

  async saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void> {
    const filename = resolvePath(filePath)
    const writeStream = createWriteStream(filename)

    return new Promise((resolve, reject) => {
      designFileStream.once('error', reject)
      writeStream.once('close', resolve)
      writeStream.once('error', reject)

      designFileStream.pipe(writeStream)
    })
  }
}
