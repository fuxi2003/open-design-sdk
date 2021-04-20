import { get, getStream, post, postMultipart } from './utils/fetch'
import { sleep } from './utils/sleep'
import cplus from 'cplus'
import fetch from 'node-fetch'

import { ApiDesign } from './api-design'
import { ApiDesignExport } from './api-design-export'
import { OpenDesignApiError } from './open-design-api-error'

import type { ReadStream } from 'fs'
import type { ArtboardId } from '@opendesign/octopus-reader'
import type { components } from 'open-design-api-types'
import type { IOpenDesignApi } from './types/ifaces'

export type DesignExportId = components['schemas']['DesignExportId']
export type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']
export type Design = components['schemas']['Design']
export type DesignId = components['schemas']['DesignId']
export type DesignImportFormatEnum = components['schemas']['DesignImportFormatEnum']
export type DesignSummary = components['schemas']['DesignSummary']
export type OctopusDocument = components['schemas']['OctopusDocument']

export class OpenDesignApi implements IOpenDesignApi {
  private _apiRoot: string
  private _token: string

  private _console: Console

  constructor(params: {
    apiRoot: string
    token: string
    console?: Console | null
  }) {
    this._apiRoot = params.apiRoot
    this._token = params.token

    this._console = params.console || cplus.create()
  }

  getApiRoot() {
    return this._apiRoot
  }

  _getAuthInfo() {
    return { token: this._token }
  }

  async getDesignById(designId: DesignId): Promise<ApiDesign> {
    const res = await get(
      this._apiRoot,
      '/designs/{design_id}',
      {
        'design_id': designId,
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    // @ts-ignore
    if (res.statusCode === 401 || res.statusCode === 403) {
      this._console.error('OpenDesignApi#getDesignById()', { designId }, res)
      throw new OpenDesignApiError(
        res,
        'Cannot fetch design due to missing permissions'
      )
    }
    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error('OpenDesignApi#getDesignById()', { designId }, res)
      throw new OpenDesignApiError(res, 'Cannot fetch design')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      return this.getDesignById(designId)
    }

    const apiDesign = new ApiDesign(res.body as Design, {
      openDesignApi: this,
    })

    return apiDesign
  }

  async getDesignSummary(designId: DesignId): Promise<DesignSummary> {
    const res = await get(
      this._apiRoot,
      '/designs/{design_id}/summary',
      {
        'design_id': designId,
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error('OpenDesignApi#getDesignSummary()', { designId }, res)
      throw new OpenDesignApiError(res, 'Cannot fetch design')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      return this.getDesignSummary(designId)
    }

    return res.body as DesignSummary
  }

  async importDesignFile(
    designFileStream: ReadStream,
    options: { format?: DesignImportFormatEnum } = {}
  ): Promise<ApiDesign> {
    const res = await postMultipart(
      this._apiRoot,
      '/designs/upload',
      {},
      {
        'file': designFileStream,
        ...(options.format ? { 'format': options.format } : {}),
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 201) {
      this._console.error('OpenDesignApi#importDesignFile()', res)
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const designId = res.body['design']['id']
    return this.getDesignById(designId)
  }

  async importDesignLink(
    url: string,
    options: { format?: DesignImportFormatEnum } = {}
  ): Promise<ApiDesign> {
    const res = await post(
      this._apiRoot,
      '/designs/link',
      {},
      {
        'url': url,
        ...(options.format ? { 'format': options.format } : {}),
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 201) {
      this._console.error('OpenDesignApi#importDesignLink()', res)
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const designId = res.body['design']['id']
    return this.getDesignById(designId)
  }

  async importFigmaDesignLink(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
  }): Promise<ApiDesign> {
    const res = await post(
      this._apiRoot,
      '/designs/figma-link',
      {},
      {
        'figma_token': params.figmaToken,
        'figma_filekey': params.figmaFileKey,
        ...(params.figmaIds ? { 'figma_ids': params.figmaIds } : {}),
        ...(params.name ? { 'design_name': params.name } : {}),
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 201) {
      this._console.error('OpenDesignApi#importDesignLink()', res)
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const designId = res.body['design']['id']
    return this.getDesignById(designId)
  }

  async importFigmaDesignLinkWithExports(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string> | null
    name?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
  }): Promise<{ designId: DesignId; exports: Array<ApiDesignExport> }> {
    const res = await post(
      this._apiRoot,
      '/designs/figma-link',
      {},
      {
        'figma_token': params.figmaToken,
        'figma_filekey': params.figmaFileKey,
        'exports': params.exports,
        ...(params.figmaIds ? { 'figma_ids': params.figmaIds } : {}),
        ...(params.name ? { 'design_name': params.name } : {}),
      },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 201) {
      this._console.error('OpenDesignApi#importDesignLink()', res)
      throw new OpenDesignApiError(res, 'Cannot import design')
    }

    const designId = res.body['design']['id']

    return {
      designId,
      exports: res.body['exports'].map((designExportData) => {
        return new ApiDesignExport(designExportData, {
          designId,
          openDesignApi: this,
        })
      }),
    }
  }

  async getDesignArtboardContent(
    designId: DesignId,
    artboardId: ArtboardId
  ): Promise<OctopusDocument> {
    const res = await get(
      this._apiRoot,
      '/designs/{design_id}/artboards/{artboard_id}/content',
      { 'design_id': designId, 'artboard_id': artboardId },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error('OpenDesignApi#getDesignById()', { designId }, res)
      throw new OpenDesignApiError(res, 'Cannot fetch artboard content')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      return this.getDesignArtboardContent(designId, artboardId)
    }

    return res.body
  }

  async getDesignArtboardContentJsonStream(
    designId: DesignId,
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream> {
    const res = await getStream(
      this._apiRoot,
      '/designs/{design_id}/artboards/{artboard_id}/content',
      { 'design_id': designId, 'artboard_id': artboardId },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 200 && res.statusCode !== 202) {
      this._console.error(
        'OpenDesignApi#getDesignArtboardContentJsonStream()',
        { designId },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot fetch artboard content')
    }

    if (res.statusCode === 202) {
      await sleep(1000)
      return this.getDesignArtboardContentJsonStream(designId, artboardId)
    }

    return res.stream
  }

  async exportDesign(
    designId: DesignId,
    params: {
      format: DesignExportTargetFormatEnum
    }
  ): Promise<ApiDesignExport> {
    const res = await post(
      this._apiRoot,
      '/designs/{design_id}/exports',
      { 'design_id': designId },
      { 'format': params.format },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 201) {
      this._console.error(
        'OpenDesignApi#exportDesign()',
        { designId, ...params },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot convert the design')
    }
    if (res.body['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'Design export failed')
    }

    return new ApiDesignExport(res.body, {
      designId,
      openDesignApi: this,
    })
  }

  async getDesignExportById(
    designId: DesignId,
    designExportId: DesignExportId
  ): Promise<ApiDesignExport> {
    const res = await get(
      this._apiRoot,
      '/designs/{design_id}/exports/{export_id}',
      { 'design_id': designId, 'export_id': designExportId },
      this._getAuthInfo(),
      { console: this._console }
    )

    if (res.statusCode !== 200) {
      this._console.error(
        'OpenDesignApi#getDesignExportById()',
        { designId },
        res
      )
      throw new OpenDesignApiError(res, 'Cannot fetch design export info')
    }
    if (res.body['status'] === 'failed') {
      throw new OpenDesignApiError(res, 'Design export failed')
    }

    return new ApiDesignExport(res.body, {
      designId,
      openDesignApi: this,
    })
  }

  async getDesignExportResultStream(
    designId: DesignId,
    designExportId: DesignExportId
  ): Promise<NodeJS.ReadableStream> {
    const designExport = await this.getDesignExportById(
      designId,
      designExportId
    )
    return designExport.getResultStream()
  }

  async getDesignBitmapAssetStream(designId: DesignId, bitmapKey: string) {
    const absolute = /^https?:\/\//.test(bitmapKey)
    if (!absolute) {
      throw new Error('Relative asset paths are not supported')
    }

    const res = await fetch(bitmapKey)
    if (res.status !== 200) {
      this._console.debug('ApiDesign#getBitmapAssetStream()', {
        bitmapKey,
        statusCode: res.status,
      })
      throw new Error('Asset not available')
    }

    return res.body
  }
}
