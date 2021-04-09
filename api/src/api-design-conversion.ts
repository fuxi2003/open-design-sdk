import fetch from 'node-fetch'
import { sleep } from './utils/sleep'

import type { components } from 'open-design-api-types'
import type { OpenDesignApi } from './open-design-api'
import type { IApiDesignConversion } from './types/ifaces'

type Conversion = components['schemas']['Conversion']
type DesignId = components['schemas']['DesignId']

export class ApiDesignConversion implements IApiDesignConversion {
  readonly designId: DesignId

  _conversionData: Conversion
  _openDesignApi: OpenDesignApi

  constructor(
    conversionData: Conversion,
    params: { designId: DesignId; openDesignApi: OpenDesignApi }
  ) {
    this.designId = params.designId

    this._conversionData = conversionData
    this._openDesignApi = params.openDesignApi
  }

  get id() {
    return this._conversionData['id']
  }

  get status() {
    return this._conversionData['status']
  }

  get resultFormat() {
    return this._conversionData['result_format']
  }

  get resultUrl() {
    return this._conversionData['result_url']
  }

  async refresh() {
    return this._openDesignApi.getDesignConversionById(this.designId, this.id)
  }

  async getResultStream(): Promise<NodeJS.ReadableStream> {
    if (this.status === 'uploading' || this.status === 'processing') {
      await sleep(1000)
      return this._openDesignApi.getDesignConversionResultStream(
        this.designId,
        this.id
      )
    }

    const resultUrl = this.resultUrl
    if (!resultUrl) {
      throw new Error('The conversion result location is not available')
    }

    const res = await fetch(resultUrl)
    if (res.status !== 200) {
      throw new Error('The conversion result is not available')
    }

    return res.body
  }
}
