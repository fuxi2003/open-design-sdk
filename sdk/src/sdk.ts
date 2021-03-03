import {
  createDesignFromLocalDesign,
  createDesignFromOpenDesignApiDesign,
} from './utils/design-factories'

import type { IOpenDesignApi } from '@opendesign/api/types'
import type { components } from 'open-design-api-types'
import type { ISdk } from './types/sdk.iface'
import type { DesignFacade } from './design-facade'
import type { DesignFileManager } from './local/design-file-manager'
import type { LocalDesignManager } from './local/local-design-manager'
import type { ILocalDesign } from './types/local-design.iface'

type DesignConversionTargetFormatEnum = components['schemas']['DesignConversionTargetFormatEnum']

export class Sdk implements ISdk {
  private _openDesignApi: IOpenDesignApi | null = null
  private _designFileManager: DesignFileManager | null = null
  private _localDesignManager: LocalDesignManager | null = null

  /** @internal */
  constructor() {}

  async openOctopusFile(relPath: string): Promise<DesignFacade> {
    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.openOctopusFile(relPath, {
      apiDesignInfo: this._getCommonApiDesignInfo(),
    })
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
    })

    const apiDesign = await this._getApiDesignByLocalDesign(localDesign)
    if (apiDesign) {
      await designFacade.setApiDesign(apiDesign)
    }

    return designFacade
  }

  async openDesignFile(relPath: string): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const designFileManager = this._designFileManager
    if (!designFileManager) {
      throw new Error('Design file manager is not configured.')
    }

    const designFileStream = await designFileManager.readDesignFileStream(
      relPath
    )
    const apiDesign = await openDesignApi.importDesignFile(designFileStream)

    return this.fetchDesignById(apiDesign.id)
  }

  async openFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
  }): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importFigmaDesignLink(params)

    return this.fetchDesignById(apiDesign.id)
  }

  async convertFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
    conversions: Array<{ format: DesignConversionTargetFormatEnum }>
  }): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const {
      designId,
      conversions,
    } = await openDesignApi.importFigmaDesignLinkWithConversions(params)
    const apiDesign = await openDesignApi.getDesignById(designId)

    const designFacade = await this.fetchDesignById(apiDesign.id)
    conversions.forEach((conversion) => {
      designFacade.addConversion(conversion)
    })

    return designFacade
  }

  async fetchDesignById(designId: string): Promise<DesignFacade> {
    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.getDesignById(designId)
    const designFacade = await createDesignFromOpenDesignApiDesign(apiDesign, {
      sdk: this,
    })

    const localDesignManager = this._localDesignManager
    if (localDesignManager) {
      const localDesign = await localDesignManager.createOctopusFileFromManifest(
        designFacade.getManifest(),
        apiDesign
          ? {
              apiDesignInfo: {
                apiRoot: apiDesign.getApiRoot(),
                designId: apiDesign.id,
              },
            }
          : {}
      )
      await designFacade.setLocalDesign(localDesign)
    }

    return designFacade
  }

  /** @internal */
  async saveDesignFileStream(
    relPath: string,
    designFileStream: NodeJS.ReadableStream
  ) {
    const designFileManager = this._designFileManager
    if (!designFileManager) {
      throw new Error('Design file manager is not configured.')
    }

    return designFileManager.saveDesignFileStream(relPath, designFileStream)
  }

  /** @internal */
  useDesignFileManager(designFileManager: DesignFileManager): void {
    this._designFileManager = designFileManager
  }

  /** @internal */
  useLocalDesignManager(localDesignManager: LocalDesignManager): void {
    this._localDesignManager = localDesignManager
  }

  /** @internal */
  useOpenDesignApi(api: IOpenDesignApi): void {
    this._openDesignApi = api
  }

  private _getCommonApiDesignInfo() {
    const openDesignApi = this._openDesignApi
    return openDesignApi ? { apiRoot: openDesignApi.getApiRoot() } : null
  }

  private async _getApiDesignByLocalDesign(localDesign: ILocalDesign) {
    const apiDesignInfo = await localDesign.getApiDesignInfo()
    const designId = apiDesignInfo ? apiDesignInfo.designId : null
    if (!designId) {
      return null
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      console.warn(
        'The local design references an API design but the API is not configured.'
      )
      return null
    }

    try {
      return await openDesignApi.getDesignById(designId)
    } catch (err) {
      console.warn(
        'API design referenced by the opened local design is not available'
      )
      return null
    }
  }
}
