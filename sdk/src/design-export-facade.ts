import { inspect } from 'util'

import type { IApiDesignExport } from '@opendesign/api'
import type { IDesignExportFacade } from './types/design-export-facade.iface'
import type { Sdk } from './sdk'

export class DesignExportFacade implements IDesignExportFacade {
  private _sdk: Sdk
  private _designExport: IApiDesignExport

  constructor(designExport: IApiDesignExport, params: { sdk: Sdk }) {
    this._sdk = params.sdk
    this._designExport = designExport
  }

  /**
   * The ID of the export task.
   * @category Identification
   */
  get id() {
    return this._designExport.id
  }

  /**
   * The ID of the exported design.
   * @category Reference
   */
  get designId() {
    return this._designExport.designId
  }

  /**
   * The status of the export task.
   * @category Data
   */
  get status() {
    return this._designExport.status
  }

  /**
   * The target format to which the design is exported.
   * @category Data
   */
  get resultFormat() {
    return this._designExport.resultFormat
  }

  /** @internal */
  toString() {
    const exportInfo = this.toJSON()
    return `DesignExport ${inspect(exportInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return {
      id: this.id,
      designId: this.designId,
      status: this.status,
      resultFormat: this.resultFormat,
    }
  }

  /**
   * Returns the URL of the produced design file.
   * @category Serialization
   */
  async getResultUrl() {
    const processedDesignExport = await this._designExport.getProcessedDesignExport()

    const resultUrl = processedDesignExport.resultUrl
    if (!resultUrl) {
      throw new Error('The export result location is not available')
    }

    this._designExport = processedDesignExport

    return resultUrl
  }

  /**
   * Returns a readable binary stream of the produced design file.
   * @category Serialization
   */
  async getResultStream() {
    return this._designExport.getResultStream()
  }

  /**
   * Downloads the produced design file to the file system.
   *
   * A file system has to be available when using this method.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   */
  async exportDesignFile(filePath: string) {
    return this._sdk.saveDesignFileStream(
      filePath,
      await this.getResultStream()
    )
  }
}
