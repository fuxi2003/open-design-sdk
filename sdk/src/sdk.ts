import {
  createDesignFromLocalDesign,
  createDesignFromOpenDesignApiDesign,
} from './utils/design-factories'
import { v4 as uuid } from 'uuid'

import type { IOpenDesignApi } from '@opendesign/api'
import type { IRenderingEngine } from '@opendesign/rendering'
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
  private _renderingEngine: IRenderingEngine | null = null

  /** @internal */
  constructor() {}

  /**
   * Sets the "working directory" which is used for storing the local cache and temporary files.
   *
   * The SDK creates and reads from a `.opendesign` subdirectory within the working directory.
   *
   * Note that the `.opendesign` subdirectory should likely not be included in version control systems.
   *
   * @category Configuration
   * @param workingDirectory An absolute path to the directory or a path relative to the process working directory (`process.cwd()` in node.js). When `null` is provided, the working directory is reset to the process working directory.
   */
  setWorkingDirectory(workingDirectory: string | null) {
    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error(
        'Offline services are not configured. Cannot set the working directory.'
      )
    }

    localDesignManager.setWorkingDirectory(workingDirectory)
  }

  /**
   * Opens a local `.octopus` file.
   *
   * Offline services have to be configured when using this method.
   *
   * In case the file references a server-side design and online services is configured, the API can be used for fetching missing data of partially downloaded files.
   *
   * @category Local Design File Usage
   * @param relPath An absolute `.octopus` file path or a path relative to the current working directory.
   * @returns A design object which can be used for retrieving data from the local `.octopus` file or a referenced server-side design (see above).
   */
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

  /**
   * Creates an empty local `.octopus` file.
   *
   * This method expects a path value previously obtained from {@link DesignFacade.filename}.
   *
   * Offline services have to be configured when using this method.
   *
   * @internal
   * @category Local Design File Usage
   * @param relPath An absolute `.octopus` file path or a path relative to the current working directory.
   * @returns A design object which can be used for creating `.octopus` file content.
   */
  async createOctopusFile(relPath: string): Promise<DesignFacade> {
    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.createOctopusFile(relPath)
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
    })

    return designFacade
  }

  /**
   * Opens a local design file.
   *
   * Both online and offline services have to be configured when using this method.
   *
   * The design is automatically uploaded to the API and local caching is established.
   *
   * @category Local Design File Usage
   * @param relPath An absolute design file path or a path relative to the current working directory.
   * @returns A design object which can be used for retrieving data from the local design file using the API.
   */
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

  /**
   * Opens a Figma design.
   *
   * Online services have to be configured when using this method.
   *
   * The design is automatically imported by the API and local caching is established.
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design. The original Figma design name is used by default.
   * @returns A design object which can be used for retrieving data from the Figma design using the API.
   */
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

  /**
   * Opens a Figma design while initiating a conversion to another design file format (currently only Sketch is available).
   *
   * Online services have to be configured when using this method. Offline services have to be configured for downloading the converted design file from the API but downloading the result is not a required step as it can be done later from another client.
   *
   * The design is automatically imported by the API and local caching is established in case offline services are configured.
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design. The original Figma design name is used by default.
   * @param params.conversions Design file conversion configurations. Only a single conversion to the `"sketch"` (Sketch) file format is available currently.
   * @returns A design object which can be used for retrieving data from the Figma design or downloading the converted design file using the API.
   */
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

  /**
   * Opens a server-side design file.
   *
   * Online services have to be configured when using this method.
   *
   * The design is automatically uploaded to the API and when offline services are also configured, local caching is established and the designs can be saved as `.octopus` files.
   *
   * @category Server Side Design File Usage
   * @param designId An ID of a server-side design assigned during import (via `openDesignFile()`, `openFigmaDesign()` or `convertFigmaDesign()`).
   * @returns A design object which can be used for retrieving data from the design using the API.
   */
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

      const renderingEngine = this._renderingEngine
      if (renderingEngine) {
        const renderingDesign = await renderingEngine.createDesign(uuid(), {
          bitmapAssetDirectoryPath: localDesign.getBitmapAssetDirectory(),
          // fontDirectoryPath: localDesign.getFontDirectory(),
        })
        designFacade.setRenderingDesign(renderingDesign)
      }
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

  /** @internal */
  useRenderingEngine(renderingEngine: IRenderingEngine): void {
    this._renderingEngine = renderingEngine
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
