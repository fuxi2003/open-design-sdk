import { createReadStream, createWriteStream } from 'fs'
import { resolve as resolvePath } from 'path'

import type { IDesignFileManager } from '../types/design-file-manager.iface'

export class DesignFileManager implements IDesignFileManager {
  async readDesignFileStream(relPath: string): Promise<NodeJS.ReadableStream> {
    const filename = resolvePath(relPath)
    return createReadStream(filename)
  }

  async saveDesignFileStream(
    relPath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void> {
    const filename = resolvePath(relPath)
    const writeStream = createWriteStream(filename)

    return new Promise((resolve, reject) => {
      designFileStream.once('error', reject)
      writeStream.once('close', resolve)
      writeStream.once('error', reject)

      designFileStream.pipe(writeStream)
    })
  }
}
