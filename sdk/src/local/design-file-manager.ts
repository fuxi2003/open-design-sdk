import { createReadStream, createWriteStream, ReadStream } from 'fs'
import { resolve as resolvePath } from 'path'

import type { IDesignFileManager } from '../types/design-file-manager.iface'

export class DesignFileManager implements IDesignFileManager {
  private _workingDirectory: string | null = null

  getWorkingDirectory() {
    return this._workingDirectory || resolvePath('.')
  }

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  async readDesignFileStream(filePath: string): Promise<ReadStream> {
    const filename = this._resolvePath(filePath)
    const stream = createReadStream(filename)

    return new Promise((resolve, reject) => {
      stream.once('readable', () => {
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
    const filename = this._resolvePath(filePath)
    const writeStream = createWriteStream(filename)

    return new Promise((resolve, reject) => {
      designFileStream.once('error', reject)
      writeStream.once('close', resolve)
      writeStream.once('error', reject)

      designFileStream.pipe(writeStream)
    })
  }

  _resolvePath(filePath: string) {
    return resolvePath(this._workingDirectory || '.', `${filePath}`)
  }
}
