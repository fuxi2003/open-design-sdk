import createCancelToken, { CancelToken } from '@avocode/cancel-token'
import { createReadStream, createWriteStream, ReadStream } from 'fs'
import { resolve as resolvePath } from 'path'

export class DesignFileManager {
  private _workingDirectory: string | null = null
  private _destroyTokenController = createCancelToken()

  destroy() {
    this._destroyTokenController.cancel(
      'The design file manager has been destroyed.'
    )
  }

  getWorkingDirectory() {
    return this._workingDirectory || resolvePath('.')
  }

  setWorkingDirectory(workingDirectory: string | null) {
    this._workingDirectory = workingDirectory
      ? resolvePath(workingDirectory)
      : null
  }

  async readDesignFileStream(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ReadStream> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const filename = this._resolvePath(filePath)
    const stream = createReadStream(filename)

    return new Promise((resolve, reject) => {
      const unregisterCanceller = cancelToken.onCancelled((reason: unknown) => {
        stream.close()
        reject(reason)
      })
      const handleError = (err: Error) => {
        unregisterCanceller?.()
        reject(err)
      }
      const handleReadble = () => {
        unregisterCanceller?.()
        resolve(stream)
      }

      stream.once('readable', handleReadble)
      stream.once('error', handleError)
    })
  }

  async saveDesignFileStream(
    filePath: string,
    designFileStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const cancelToken = createCancelToken.race([
      options.cancelToken,
      this._destroyTokenController.token,
    ])

    const filename = this._resolvePath(filePath)
    const writeStream = createWriteStream(filename)

    return new Promise((resolve, reject) => {
      const unregisterCanceller = cancelToken?.onCancelled(
        (reason: unknown) => {
          writeStream.close()
          reject(reason)
        }
      )
      const handleError = (err: Error) => {
        unregisterCanceller?.()
        reject(err)
      }
      const handleClose = () => {
        unregisterCanceller?.()
        resolve()
      }

      designFileStream.once('error', handleError)
      writeStream.once('close', handleClose)
      writeStream.once('error', handleError)

      designFileStream.pipe(writeStream)
    })
  }

  _resolvePath(filePath: string) {
    return resolvePath(this._workingDirectory || '.', `${filePath}`)
  }
}
