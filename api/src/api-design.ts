import type { ArtboardId, PageId } from '@opendesign/octopus-reader'
import type { components } from 'open-design-api-types'
import type { OpenDesignApi } from './open-design-api'
import type { IApiDesign } from './types/ifaces'

type ConversionId = components['schemas']['ConversionId']
type Design = components['schemas']['Design']
type DesignConversionTargetFormatEnum = components['schemas']['DesignConversionTargetFormatEnum']

export class ApiDesign implements IApiDesign {
  _info: Design
  _openDesignApi: OpenDesignApi

  constructor(info: Design, params: { openDesignApi: OpenDesignApi }) {
    this._info = info
    this._openDesignApi = params.openDesignApi
  }

  get id() {
    return this._info['id']
  }

  get name() {
    return this._info['name']
  }

  get format() {
    return this._info['format']
  }

  get createdAt() {
    return this._info['created_at']
  }

  get completedAt() {
    return this._info['completed_at']
  }

  get status() {
    return this._info['status']
  }

  getApiRoot() {
    return this._openDesignApi.getApiRoot()
  }

  async getManifest() {
    const summary = await this.getSummary()
    const {
      'artboards': artboardDataList,
      'pages': pageDataList,
      ...info
    } = summary

    this._info = info

    const pageNames: Record<PageId, string> | null = pageDataList
      ? pageDataList.reduce((names, pageData) => {
          return { ...names, [pageData['id']]: pageData['name'] }
        }, {})
      : null

    return {
      'pages': pageNames,
      'artboards': artboardDataList.map((artboardData) => {
        return {
          'artboard_original_id': artboardData['id'],
          'artboard_name': artboardData['name'],
          'failed': artboardData['status'] === 'failed',
          'url':
            artboardData['status'] === 'done'
              ? `${this._openDesignApi.getApiRoot()}/designs/${
                  this.id
                }/artboards/${artboardData['id']}/content`
              : null,
          'preview_url': null,
          'is_symbol': false,
          'symbol_id': null,
          'frame': { 'x': 0, 'y': 0 },
          ...(artboardData['page_id']
            ? {
                'page_original_id': artboardData['page_id'],
                'page_name': pageNames
                  ? pageNames[artboardData['page_id']]
                  : null,
              }
            : {}),
        }
      }),
    }
  }

  getSummary() {
    return this._openDesignApi.getDesignSummary(this.id)
  }

  getArtboardContent(artboardId: ArtboardId) {
    return this._openDesignApi.getDesignArtboardContent(this.id, artboardId)
  }

  getArtboardContentJsonStream(artboardId: ArtboardId) {
    return this._openDesignApi.getDesignArtboardContentJsonStream(
      this.id,
      artboardId
    )
  }

  convertDesign(params: { format: DesignConversionTargetFormatEnum }) {
    return this._openDesignApi.convertDesign(this.id, params)
  }

  getConversionById(conversionId: ConversionId) {
    return this._openDesignApi.getDesignConversionById(this.id, conversionId)
  }

  getConversionResultStream(conversionId: ConversionId) {
    return this._openDesignApi.getDesignConversionResultStream(
      this.id,
      conversionId
    )
  }

  getBitmapAssetStream(bitmapKey: string) {
    return this._openDesignApi.getDesignBitmapAssetStream(this.id, bitmapKey)
  }
}
