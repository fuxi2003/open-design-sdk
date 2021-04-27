import { basename, join as joinPaths } from 'path'
import {
  checkFile,
  readJsonFile,
  readFileStream,
  writeJsonFile,
  writeJsonFileStream,
  readFileBlob,
  writeFileBlob,
  copyDirectory,
  moveDirectory,
  deleteFile,
} from '../utils/fs'

import {
  ARTBOARD_CONTENT_BASENAME,
  ARTBOARD_DIRECTORY_BASENAME,
  API_DESIGN_INFO_BASENAME,
  BITMAP_ASSET_DIRECTORY_BASENAME,
  BITMAP_ASSET_MAPPING_BASENAME,
  MANIFEST_BASENAME,
  PAGE_CONTENT_BASENAME,
  PAGE_DIRECTORY_BASENAME,
} from './consts'

import type { CancelToken } from '@avocode/cancel-token'
import type {
  ArtboardId,
  ArtboardOctopusData,
  ManifestData,
  PageId,
} from '@opendesign/octopus-reader'
import type { LocalDesignManager } from './local-design-manager'

export type ApiDesignInfo = {
  apiRoot?: string
  designId?: string
}

export type BitmapAssetDescriptor = { name: string; prerendered: boolean }

export type BitmapMapping = { [bitmapKey: string]: string }

export class LocalDesign {
  _localDesignManager: LocalDesignManager

  _filename: string

  _apiDesignInfo: ApiDesignInfo | null
  _bitmapMapping: BitmapMapping | null = null

  constructor(init: {
    filename: string
    localDesignManager: LocalDesignManager
    apiDesignInfo?: ApiDesignInfo | null
  }) {
    const filename = init.filename
    if (!filename) {
      throw new Error('A filename must be specified')
    }

    this._filename = init.filename
    this._localDesignManager = init.localDesignManager
    this._apiDesignInfo = init.apiDesignInfo || null
  }

  get filename(): string {
    return this._filename
  }

  async saveAs(
    nextFilePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    const nextFilename = this._localDesignManager.resolvePath(nextFilePath)
    const prevFilename = this._filename
    await copyDirectory(prevFilename, nextFilename)
    options.cancelToken?.throwIfCancelled()

    this._filename = nextFilename
  }

  async move(
    nextFilePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ) {
    const nextFilename = this._localDesignManager.resolvePath(nextFilePath)
    const prevFilename = this._filename
    await moveDirectory(prevFilename, nextFilename)
    options.cancelToken?.throwIfCancelled()

    this._filename = nextFilename
  }

  async getManifest(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ManifestData> {
    const manifestFilename = this._getManifestFilename()
    const manifest = (await readJsonFile(
      manifestFilename,
      options
    )) as ManifestData
    return manifest
  }

  async saveManifest(
    manifest: ManifestData,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const manifestFilename = this._getManifestFilename()
    await writeJsonFile(manifestFilename, manifest, options)
  }

  async hasArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    return checkFile(contentFilename, options)
  }

  async getArtboardContentFilename(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<string | null> {
    if (!this.hasArtboardContent(artboardId, options)) {
      return null
    }

    return this._getArtboardContentFilename(artboardId)
  }

  async getArtboardContent(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ArtboardOctopusData> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    const content = (await readJsonFile(
      contentFilename,
      options
    )) as ArtboardOctopusData
    return content
  }

  async getArtboardContentJsonStream(
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    return readFileStream(contentFilename)
  }

  async saveArtboardContent(
    artboardId: ArtboardId,
    content: ArtboardOctopusData,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    await writeJsonFile(contentFilename, content, options)
  }

  async saveArtboardContentJsonStream(
    artboardId: ArtboardId,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const contentFilename = this._getArtboardContentFilename(artboardId)
    await writeJsonFileStream(contentFilename, contentStream, options)
  }

  async hasPageContent(
    pageId: PageId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const contentFilename = this._getPageContentFilename(pageId)
    return checkFile(contentFilename, options)
  }

  async getPageContent(
    pageId: PageId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ArtboardOctopusData> {
    const contentFilename = this._getPageContentFilename(pageId)
    const content = (await readJsonFile(
      contentFilename,
      options
    )) as ArtboardOctopusData
    return content
  }

  async getPageContentJsonStream(
    pageId: PageId
  ): Promise<NodeJS.ReadableStream> {
    const contentFilename = this._getPageContentFilename(pageId)
    return readFileStream(contentFilename)
  }

  async savePageContent(
    pageId: PageId,
    content: ArtboardOctopusData,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFile(contentFilename, content, options)
  }

  async savePageContentJsonStream(
    pageId: PageId,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const contentFilename = this._getPageContentFilename(pageId)
    await writeJsonFileStream(contentFilename, contentStream, options)
  }

  async hasBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<boolean> {
    const { available } = await this.resolveBitmapAsset(
      bitmapAssetDesc,
      options
    )
    return available
  }

  getBitmapAssetDirectory(): string {
    return joinPaths(this._filename, BITMAP_ASSET_DIRECTORY_BASENAME)
  }

  async getBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<NodeJS.ReadableStream> {
    const {
      filename: bitmapAssetFilename,
      available,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, options)
    if (!available) {
      throw new Error('No such asset')
    }

    return readFileStream(bitmapAssetFilename)
  }

  async getBitmapAssetBlob(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Buffer> {
    const {
      filename: bitmapAssetFilename,
      available,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, options)
    if (!available) {
      throw new Error('No such asset')
    }

    return readFileBlob(bitmapAssetFilename)
  }

  async saveBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    content: ArtboardOctopusData,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    await this._loadBitmapMapping(options)

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, options)
    await writeJsonFile(bitmapAssetFilename, content)

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        options
      )
    }
  }

  async saveBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor,
    contentStream: NodeJS.ReadableStream,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    await this._loadBitmapMapping(options)

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, options)
    await writeJsonFileStream(bitmapAssetFilename, contentStream, options)

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        options
      )
    }
  }

  async saveBitmapAssetBlob(
    bitmapAssetDesc: BitmapAssetDescriptor,
    bitmapAssetBlob: Buffer,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    await this._loadBitmapMapping(options)

    const {
      filename: bitmapAssetFilename,
      basename,
      mapped,
    } = await this.resolveBitmapAsset(bitmapAssetDesc, options)
    await writeFileBlob(bitmapAssetFilename, bitmapAssetBlob, options)

    if (mapped) {
      await this.saveBitmapMapping(
        {
          ...(this._bitmapMapping || {}),
          [bitmapAssetDesc.name]: basename,
        },
        options
      )
    }
  }

  async getBitmapMapping(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<BitmapMapping> {
    await this._loadBitmapMapping(options)

    if (!this._bitmapMapping) {
      throw new Error('Bitmap mapping is not available')
    }

    return this._bitmapMapping
  }

  async _loadBitmapMapping(options: { cancelToken?: CancelToken | null }) {
    if (this._bitmapMapping) {
      return
    }

    const bitmapMappingFilename = this._getBitmapMappingFilename()

    const bitmapMappingExists = await checkFile(bitmapMappingFilename)
    options.cancelToken?.throwIfCancelled()

    if (!bitmapMappingExists) {
      this._bitmapMapping = {}
      return
    }

    this._bitmapMapping = (await readJsonFile(bitmapMappingFilename),
    options) as BitmapMapping
  }

  unload() {
    this._unloadBitmapMapping()
  }

  _unloadBitmapMapping() {
    this._bitmapMapping = null
  }

  async saveBitmapMapping(
    bitmapMapping: BitmapMapping,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const prevBitmapMapping = this._bitmapMapping
    this._bitmapMapping = bitmapMapping

    const unregisterCanceller = options.cancelToken?.onCancelled(() => {
      if (this._bitmapMapping === bitmapMapping) {
        this._bitmapMapping = prevBitmapMapping
      }
    })

    const bitmapMappingFilename = this._getBitmapMappingFilename()
    await writeJsonFile(bitmapMappingFilename, bitmapMapping, options)

    unregisterCanceller?.()
  }

  async getApiDesignInfo(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ApiDesignInfo | null> {
    await this._loadApiDesignInfo(options)

    return this._apiDesignInfo
  }

  async _loadApiDesignInfo(options: { cancelToken?: CancelToken | null }) {
    if (this._apiDesignInfo) {
      return
    }

    const apiDesignInfoFilename = this._getApiDesignInfoFilename()
    const apiDesignInfoExists = await checkFile(apiDesignInfoFilename)
    options.cancelToken?.throwIfCancelled()

    if (!apiDesignInfoExists) {
      this._apiDesignInfo = null
      return
    }

    this._apiDesignInfo = (await readJsonFile(
      apiDesignInfoFilename,
      options
    )) as ApiDesignInfo
  }

  async saveApiDesignInfo(
    apiDesignInfo: ApiDesignInfo | null,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    this._apiDesignInfo = apiDesignInfo

    const apiDesignInfoFilename = this._getApiDesignInfoFilename()
    if (apiDesignInfo) {
      await writeJsonFile(apiDesignInfoFilename, apiDesignInfo, options)
    } else {
      await deleteFile(apiDesignInfoFilename)
    }
  }

  _getManifestFilename(): string {
    return joinPaths(this._filename, MANIFEST_BASENAME)
  }

  _getBitmapMappingFilename(): string {
    return joinPaths(this._filename, BITMAP_ASSET_MAPPING_BASENAME)
  }

  _getApiDesignInfoFilename(): string {
    return joinPaths(this._filename, API_DESIGN_INFO_BASENAME)
  }

  _getArtboardContentFilename(artboardId: ArtboardId): string {
    return joinPaths(
      this._filename,
      ARTBOARD_DIRECTORY_BASENAME,
      artboardId,
      ARTBOARD_CONTENT_BASENAME
    )
  }

  _getPageContentFilename(pageId: PageId): string {
    return joinPaths(
      this._filename,
      PAGE_DIRECTORY_BASENAME,
      pageId,
      PAGE_CONTENT_BASENAME
    )
  }

  async resolveBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<{
    basename: string
    mapped: boolean
    filename: string
    available: boolean
  }> {
    const { basename, mapped } = await this._getBitmapAssetBasename(
      bitmapAssetDesc,
      options
    )
    const filename = joinPaths(
      this._filename,
      BITMAP_ASSET_DIRECTORY_BASENAME,
      basename
    )

    return {
      basename,
      mapped,
      filename,
      available: await checkFile(filename, options),
    }
  }

  async _getBitmapAssetBasename(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<{ basename: string; mapped: boolean }> {
    await this._loadBitmapMapping(options)

    const bitmapMapping = this._bitmapMapping || {}
    const mappedBasename = bitmapMapping[bitmapAssetDesc.name]

    return mappedBasename
      ? { basename: mappedBasename, mapped: true }
      : this._createBitmapAssetBasename(bitmapAssetDesc)
  }

  _createBitmapAssetBasename(
    bitmapAssetDesc: BitmapAssetDescriptor
  ): { basename: string; mapped: boolean } {
    const bitmapKey = bitmapAssetDesc.name.toLowerCase()
    if (this._checkBitmapBasenameValid(bitmapKey)) {
      return { basename: bitmapKey, mapped: false }
    }

    // const ext = extname(bitmapKey)
    const name = basename(bitmapKey).replace(/[#:\?\/\*](.*?)$/, '$1')

    return { basename: name, mapped: true }
  }

  _checkBitmapBasenameValid(basename: string): boolean {
    return !/[#:?/*]/.test(basename)
  }
}
