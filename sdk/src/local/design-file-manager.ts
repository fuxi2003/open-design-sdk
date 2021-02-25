import { createReadStream, createWriteStream } from 'fs'
import { resolve as resolvePath } from 'path'

import type { IDesignFileManager } from '../types/ifaces'

export class DesignFileManager implements IDesignFileManager {
  async readDesignFileStream(relPath: string): Promise<NodeJS.ReadableStream> {
    const filename = resolvePath(relPath)
    return createReadStream(filename)
  }
}
