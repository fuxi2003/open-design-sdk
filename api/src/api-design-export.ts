import fetch from 'node-fetch'
import { sleep } from './utils/sleep'

import type { components } from 'open-design-api-types'
import type { OpenDesignApi } from './open-design-api'
import type { IApiDesignExport } from './types/ifaces'

type DesignExport = components['schemas']['DesignExport']
type DesignId = components['schemas']['DesignId']

export class ApiDesignExport implements IApiDesignExport {
  readonly designId: DesignId

  _exportData: DesignExport
  _openDesignApi: OpenDesignApi

  constructor(
    exportData: DesignExport,
    params: { designId: DesignId; openDesignApi: OpenDesignApi }
  ) {
    this.designId = params.designId

    this._exportData = exportData
    this._openDesignApi = params.openDesignApi
  }

  get id() {
    return this._exportData['id']
  }

  get status() {
    return this._exportData['status']
  }

  get resultFormat() {
    return this._exportData['result_format']
  }

  get resultUrl() {
    return this._exportData['result_url']
  }

  async refresh() {
    return this._openDesignApi.getDesignExportById(this.designId, this.id)
  }

  async getProcessedDesignExport(): Promise<ApiDesignExport> {
    if (this.status === 'uploading' || this.status === 'processing') {
      await sleep(1000)

      const nextExport = await this.refresh()
      return nextExport.getProcessedDesignExport()
    }

    return this
  }

  async getResultStream(): Promise<NodeJS.ReadableStream> {
    const processedExport = await this.getProcessedDesignExport()

    const resultUrl = processedExport.resultUrl
    if (!resultUrl) {
      throw new Error('The design export result location is not available')
    }

    const res = await fetch(resultUrl)
    if (res.status !== 200 || !res.body) {
      throw new Error('The design export result is not available')
    }

    return res.body
  }
}
