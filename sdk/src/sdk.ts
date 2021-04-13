import {
  createDesignFromLocalDesign,
  createDesignFromOpenDesignApiDesign,
} from './utils/design-factories'
import { mapFind } from './utils/async'
import { inspect } from 'util'
import { v4 as uuid } from 'uuid'

import type {
  DesignImportFormatEnum,
  IApiDesignExport,
  IOpenDesignApi,
} from '@opendesign/api'
import type { IRenderingEngine } from '@opendesign/rendering'
import type { components } from 'open-design-api-types'
import type { FontMatchDescriptor, ISdk } from './types/sdk.iface'
import type { DesignFacade } from './design-facade'
import type { DesignFileManager } from './local/design-file-manager'
import type { LocalDesignCache } from './local/local-design-cache'
import type { LocalDesignManager } from './local/local-design-manager'
import type { ILocalDesign } from './types/local-design.iface'
import type { ISystemFontManager } from './types/system-font-manager.iface'

type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']

export class Sdk implements ISdk {
  private _openDesignApi: IOpenDesignApi | null = null
  private _designFileManager: DesignFileManager | null = null
  private _localDesignCache: LocalDesignCache | null = null
  private _localDesignManager: LocalDesignManager | null = null
  private _renderingEngine: IRenderingEngine | null = null
  private _systemFontManager: ISystemFontManager | null = null

  private _destroyed: boolean = false

  private _fallbackFontPostscriptNames: Array<string> = [
    'Roboto',
    'Helvetica',
    'Arial',
    'Courier',
  ]

  /** @internal */
  constructor() {}

  /** @internal */
  toString() {
    return `OpenDesignSdk ${inspect(this.toJSON())}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return {
      workingDirectory: this.getWorkingDirectory(),
    }
  }

  /**
   * Returns whether the SDK has been destroyed.
   *
   * @category Status
   */
  isDestroyed() {
    return this._destroyed
  }

  /**
   * Destroys the SDK instance.
   *
   * The local rendering engine process is terminated if it has been configured.
   *
   * Any design objects created by the SDK are no longer usable and the user should dispose any references to such objects to prevent memory leaks.
   *
   * @category Status
   */
  async destroy() {
    this._destroyed = true

    if (this._renderingEngine && !this._renderingEngine.isDestroyed()) {
      await this._renderingEngine.destroy()
    }
  }

  /**
   * Returns the current "working directory" which is used for storing the local cache and temporary files.
   *
   * The SDK creates and reads from a `.opendesign` subdirectory within the working directory.
   *
   * Note that the `.opendesign` subdirectory should likely not be included in version control systems.
   *
   * @category Configuration
   * @returns An absolute path to the working directory. Defaults to the current process working directory (`process.cwd()` in node.js) when the workspace directory is not configured via {@link Sdk.setWorkingDirectory}.
   */
  getWorkingDirectory(): string | null {
    return (
      this._localDesignCache?.getWorkingDirectory() ||
      this._localDesignManager?.getWorkingDirectory() ||
      this._designFileManager?.getWorkingDirectory() ||
      null
    )
  }

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
    const localDesignCache = this._localDesignCache
    const localDesignManager = this._localDesignManager
    const designFileManager = this._designFileManager

    if (!localDesignCache && !localDesignManager && !designFileManager) {
      throw new Error(
        'Offline services are not configured. Cannot set the working directory.'
      )
    }

    localDesignCache?.setWorkingDirectory(workingDirectory)
    localDesignManager?.setWorkingDirectory(workingDirectory)
    designFileManager?.setWorkingDirectory(workingDirectory)
  }

  /**
   * Sets the fonts which should be used as a fallback in case the actual fonts needed for rendering text layers are not available.
   *
   * The first font from this list which is available in the system is used for all text layers with missing actual fonts. If none of the fonts are available, the text layers are not rendered.
   *
   * This configuration can be overriden/extended for each individual design via {@link DesignFacade.setFallbackFonts}. Fonts provided to an individual design are preferred over fonts specified here.
   *
   * @category Configuration
   * @param fallbackFontPostscriptNames An ordered list of font postscript names.
   */
  setFallbackFonts(fallbackFontPostscriptNames: Array<string>) {
    this._fallbackFontPostscriptNames = fallbackFontPostscriptNames
  }

  /**
   * Opens a local `.octopus` file.
   *
   * The local cache has to be configured when using this method.
   *
   * In case the file references a server-side design and the API is configured, missing data of partially downloaded files can be fetched from the server.
   *
   * @internal
   * @category Local Design File Usage
   * @param filePath An absolute `.octopus` file path or a path relative to the current working directory.
   * @returns A design object which can be used for retrieving data from the local `.octopus` file or a referenced server-side design (see above).
   */
  async openOctopusFile(filePath: string): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.openOctopusFile(filePath, {
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
   * The local cache has to be configured when using this method.
   *
   * @internal
   * @category Local Design File Usage
   * @param filePath An absolute `.octopus` file path or a path relative to the current working directory.
   * @returns A design object which can be used for creating `.octopus` file content.
   */
  async createOctopusFile(filePath: string): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const localDesignManager = this._localDesignManager
    if (!localDesignManager) {
      throw new Error('Local design manager is not configured.')
    }

    const localDesign = await localDesignManager.createOctopusFile(filePath)
    const designFacade = await createDesignFromLocalDesign(localDesign, {
      sdk: this,
    })

    const renderingEngine = this._renderingEngine
    if (renderingEngine) {
      const renderingDesign = await renderingEngine.createDesign(uuid(), {
        bitmapAssetDirectoryPath: localDesign.getBitmapAssetDirectory(),
        // fontDirectoryPath: localDesign.getFontDirectory(),
      })
      designFacade.setRenderingDesign(renderingDesign)
    }

    return designFacade
  }

  /**
   * Opens a local design file.
   *
   * The API has to be configured when using this method. This is also requires a file system (i.e. it is not available in the browser).
   *
   * The design is automatically uploaded to the API and local caching is established.
   *
   * @category Local Design File Usage
   * @param filePath An absolute design file path or a path relative to the current working directory.
   * @returns A design object which can be used for retrieving data from the local design file using the API.
   */
  async openDesignFile(filePath: string): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const designFileManager = this._designFileManager
    if (!designFileManager) {
      throw new Error('Design file manager is not configured.')
    }

    const designFileStream = await designFileManager.readDesignFileStream(
      filePath
    )
    const apiDesign = await openDesignApi.importDesignFile(designFileStream)

    return this._fetchDesignById(apiDesign.id, {
      sourceFilename: String(designFileStream.path),
    })
  }

  /**
   * Opens a design file located at the specified URL.
   *
   * The API has to be configured when using this method.
   *
   * The design file is not downloaded to the local environment but rather imported via the API directly. Once imported via the API, the design behaves exactly like a design fetched via {@link Sdk.fetchDesignById}.
   *
   * @category Local Design File Usage
   * @param filePath An absolute design file path or a path relative to the current working directory.
   * @returns A design object which can be used for retrieving data from the local design file using the API.
   */
  async openDesignLink(
    url: string,
    options: { format?: DesignImportFormatEnum } = {}
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importDesignLink(url, options)

    return this.fetchDesignById(apiDesign.id)
  }

  /**
   * Opens a Figma design.
   *
   * The API has to be configured when using this method.
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
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.importFigmaDesignLink(params)

    return this.fetchDesignById(apiDesign.id)
  }

  /**
   * Opens a Figma design while initiating a export to another design file format (currently only Sketch is available).
   *
   * The API has to be configured when using this method. A file system has to be available for downloading the converted design file from the API but downloading the result is not a required step as it can be done later from another client.
   *
   * The design is automatically imported by the API and local caching is established in case the local cache is configured.
   *
   * @category Figma Design Usage
   * @param params Info about the Figma design
   * @param params.figmaToken A Figma access token generated in the "Personal access tokens" section of [Figma account settings](https://www.figma.com/settings).
   * @param params.figmaFileKey A Figma design "file key" from the design URL (i.e. `abc` from `https://www.figma.com/file/abc/Sample-File`).
   * @param params.figmaIds A listing of Figma design frames to use.
   * @param params.designName A name override for the design. The original Figma design name is used by default.
   * @param params.exports Design file export configurations. Only a single export to the `"sketch"` (Sketch) file format is available currently.
   * @returns A design object which can be used for retrieving data from the Figma design or downloading the exported design file using the API.
   */
  async convertFigmaDesign(params: {
    figmaToken: string
    figmaFileKey: string
    figmaIds?: Array<string>
    designName?: string | null
    exports: Array<{ format: DesignExportTargetFormatEnum }>
  }): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const {
      designId,
      exports,
    } = await openDesignApi.importFigmaDesignLinkWithExports(params)
    const apiDesign = await openDesignApi.getDesignById(designId)

    return this._fetchDesignById(apiDesign.id, {
      exports,
    })
  }

  /**
   * Opens a server-side design file.
   *
   * The API has to be configured when using this method.
   *
   * The design is automatically uploaded to the API and local caching is established in case the local cache is configured.
   *
   * @category Server Side Design File Usage
   * @param designId An ID of a server-side design assigned during import (via `openDesignFile()`, `openFigmaDesign()` or `convertFigmaDesign()`).
   * @returns A design object which can be used for retrieving data from the design using the API.
   */
  async fetchDesignById(designId: string): Promise<DesignFacade> {
    return this._fetchDesignById(designId, {})
  }

  private async _fetchDesignById(
    designId: string,
    params: {
      sourceFilename?: string | null
      exports?: Array<IApiDesignExport> | null
    }
  ): Promise<DesignFacade> {
    if (this.isDestroyed()) {
      throw new Error('The SDK has been destroyed.')
    }

    const openDesignApi = this._openDesignApi
    if (!openDesignApi) {
      throw new Error('Open Design API is not configured.')
    }

    const apiDesign = await openDesignApi.getDesignById(designId)
    const designFacade = await createDesignFromOpenDesignApiDesign(apiDesign, {
      sdk: this,
      sourceFilename: params.sourceFilename || null,
      exports: params.exports || null,
    })

    const localDesignManager = this._localDesignManager
    if (localDesignManager) {
      const localDesignCache = this._localDesignCache
      const cachedOctopusFilename = localDesignCache
        ? await localDesignCache.getDesignOctopusFilename(designId)
        : null

      const apiDesignInfo = {
        apiRoot: apiDesign.getApiRoot(),
        designId: apiDesign.id,
      }

      const localDesign = cachedOctopusFilename
        ? await localDesignManager.openOctopusFile(cachedOctopusFilename, {
            apiDesignInfo,
          })
        : await localDesignManager.createOctopusFileFromManifest(
            designFacade.getManifest(),
            {
              name: apiDesign.name,
              apiDesignInfo,
            }
          )

      if (localDesignCache && !cachedOctopusFilename) {
        localDesignCache.setDesignOctopusFilename(
          designId,
          localDesign.filename
        )
      }

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
    filePath: string,
    designFileStream: NodeJS.ReadableStream
  ) {
    const designFileManager = this._designFileManager
    if (!designFileManager) {
      throw new Error('Design file manager is not configured.')
    }

    return designFileManager.saveDesignFileStream(filePath, designFileStream)
  }

  /** @internal */
  async getSystemFont(
    postscriptName: string,
    options: {
      fallbacks?: Array<string>
    } = {}
  ): Promise<FontMatchDescriptor | null> {
    const match =
      (await this._getMatchingSystemFont(postscriptName)) ||
      (await this._getFallbackFont(options.fallbacks || []))
    return match
  }

  private async _getMatchingSystemFont(
    postscriptName: string
  ): Promise<FontMatchDescriptor | null> {
    const systemFontManager = this._systemFontManager
    if (!systemFontManager) {
      return null
    }

    const fontFilename = await systemFontManager.getSystemFontPath(
      postscriptName
    )

    return fontFilename
      ? { fontFilename, fontPostscriptName: postscriptName, fallback: false }
      : null
  }

  private async _getFallbackFont(
    fallbackFontPostscriptNames: Array<string>
  ): Promise<FontMatchDescriptor | null> {
    return mapFind(
      fallbackFontPostscriptNames.concat(this._fallbackFontPostscriptNames),
      (postscriptName: string) => {
        return this._getMatchingSystemFont(postscriptName)
      }
    )
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
  useLocalDesignCache(localDesignCache: LocalDesignCache): void {
    this._localDesignCache = localDesignCache
  }

  /** @internal */
  useSystemFontManager(systemFontManager: ISystemFontManager): void {
    this._systemFontManager = systemFontManager
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
