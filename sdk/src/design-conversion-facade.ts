import { inspect } from 'util'

import type { IApiDesignConversion } from '@opendesign/api'
import type { IDesignConversionFacade } from './types/design-conversion-facade.iface'
import type { Sdk } from './sdk'

export class DesignConversionFacade implements IDesignConversionFacade {
  private _sdk: Sdk
  private _conversion: IApiDesignConversion

  constructor(conversion: IApiDesignConversion, params: { sdk: Sdk }) {
    this._sdk = params.sdk
    this._conversion = conversion
  }

  /**
   * The ID of the conversion task.
   * @category Identification
   */
  get id() {
    return this._conversion.id
  }

  /**
   * The ID of the converted design.
   * @category Reference
   */
  get designId() {
    return this._conversion.designId
  }

  /**
   * The status of the conversion task.
   * @category Data
   */
  get status() {
    return this._conversion.status
  }

  /**
   * The target format to which the design is converted.
   * @category Data
   */
  get resultFormat() {
    return this._conversion.resultFormat
  }

  /** @internal */
  toString() {
    const conversionInfo = this.toJSON()
    return `DesignConversion ${inspect(conversionInfo)}`
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
   * Returns the URL of the produced converted design file.
   * @category Serialization
   */
  async getResultUrl() {
    const processedConversion = await this._conversion.getProcessedConversion()

    const resultUrl = processedConversion.resultUrl
    if (!resultUrl) {
      throw new Error('The conversion result location is not available')
    }

    this._conversion = processedConversion

    return resultUrl
  }

  /**
   * Returns a readable binary stream of the produced converted design file.
   * @category Serialization
   */
  async getResultStream() {
    return this._conversion.getResultStream()
  }

  /**
   * Downloads the produced converted design file to the file system.
   *
   * A file system has to be available when using this method.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   */
  async saveDesignFile(filePath: string) {
    return this._sdk.saveDesignFileStream(
      filePath,
      await this.getResultStream()
    )
  }
}
