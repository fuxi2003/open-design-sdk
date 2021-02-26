import { ArtboardFacade } from './artboard-facade'
import { FileLayerCollectionFacade } from './file-layer-collection-facade'
import { PageFacade } from './page-facade'

import { createEmptyFile } from '@opendesign/octopus-reader/src/index'
import { memoize } from '@opendesign/octopus-reader/src/utils/memoize'
import { sequence } from './utils/async'
import { getDesignFormatByFileName } from './utils/design-format-utils'

import type { IApiDesign, IApiDesignConversion } from '@opendesign/api/types'
import type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IArtboard,
  IFile,
  IPage,
  LayerId,
  ManifestData,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader/types'
import type { components } from 'open-design-api-types'
import type { Sdk } from './sdk'
import type { ILocalDesign, LocalBitmapAssetDescriptor } from './local/ifaces'
import type { IDesignFacade } from './types/ifaces'
import type { LayerFacade } from './layer-facade'

type DesignConversionTargetFormatEnum = components['schemas']['DesignConversionTargetFormatEnum']

export class DesignFacade implements IDesignFacade {
  _sdk: Sdk

  _designEntity: IFile | null = null
  _localDesign: ILocalDesign | null = null
  _apiDesign: IApiDesign | null = null

  _artboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()
  _pageFacades: Map<PageId, PageFacade> = new Map()

  _manifestLoaded: boolean = false
  _pendingManifestUpdate: ManifestData | null = null

  _conversions: Map<
    DesignConversionTargetFormatEnum,
    IApiDesignConversion
  > = new Map()

  constructor(params: { sdk: Sdk }) {
    this._sdk = params.sdk
  }

  get id() {
    const apiDesign = this._apiDesign
    return apiDesign?.id || null
  }

  get filename() {
    const localDesign = this._localDesign
    return localDesign?.filename || null
  }

  getManifest(): ManifestData {
    if (this._pendingManifestUpdate) {
      return this._pendingManifestUpdate
    }

    const entity = this.getDesignEntity()
    return entity.getManifest()
  }

  setManifest(nextManifest: ManifestData) {
    this._pendingManifestUpdate = nextManifest
    this._manifestLoaded = true

    this.getDesignEntity.clear()
    this.getArtboards.clear()
    this.getPages.clear()
  }

  getDesignEntity = memoize(() => {
    const entity = this._designEntity || createEmptyFile()

    const pendingManifestUpdate = this._pendingManifestUpdate
    if (pendingManifestUpdate) {
      this._pendingManifestUpdate = null
      entity.setManifest(pendingManifestUpdate)

      this.getArtboards.clear()
      this.getPages.clear()
    }

    return entity
  })

  getLocalDesign() {
    return this._localDesign
  }

  async setLocalDesign(localDesign: ILocalDesign) {
    this._localDesign = localDesign

    if (!this._manifestLoaded) {
      this.setManifest(await localDesign.getManifest())
    }
  }

  async setApiDesign(apiDesign: IApiDesign) {
    this._apiDesign = apiDesign

    if (!this._manifestLoaded) {
      this.setManifest(await apiDesign.getManifest())
    }
  }

  getArtboards = memoize(() => {
    const prevArtboardFacades = this._artboardFacades
    const nextArtboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()

    const entity = this.getDesignEntity()
    const artboardEntities = entity.getArtboards()

    artboardEntities.forEach((artboardEntity) => {
      const artboardId = artboardEntity.id
      const artboardFacade =
        prevArtboardFacades.get(artboardId) ||
        this._createArtboardFacade(artboardEntity)

      artboardFacade.setArtboardEntity(artboardEntity)

      nextArtboardFacades.set(artboardId, artboardFacade)
    })

    this._artboardFacades = nextArtboardFacades

    return [...nextArtboardFacades.values()]
  })

  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const prevArtboardFacade = this._artboardFacades.get(artboardId)
    if (prevArtboardFacade) {
      return prevArtboardFacade
    }

    const entity = this.getDesignEntity()
    const artboardEntity = entity.getArtboardById(artboardId)
    if (!artboardEntity) {
      return null
    }

    const artboardFacade = this._createArtboardFacade(artboardEntity)
    artboardFacade.setArtboardEntity(artboardEntity)

    const nextArtboardFacades = new Map(this._artboardFacades.entries())
    nextArtboardFacades.set(artboardId, artboardFacade)

    return artboardFacade
  }

  getPageArtboards(pageId: PageId): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.getPageArtboards(pageId)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  getComponentArtboards(): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.getComponentArtboards()

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const entity = this.getDesignEntity()
    const artboardEntity = entity.getArtboardByComponentId(componentId)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  isPaged() {
    const entity = this.getDesignEntity()
    return entity.isPaged()
  }

  getPages = memoize(() => {
    const prevPageFacades = this._pageFacades
    const nextPageFacades: Map<PageId, PageFacade> = new Map()

    const entity = this.getDesignEntity()
    const pageEntities = entity.getPages()

    pageEntities.forEach((pageEntity) => {
      const pageId = pageEntity.id
      const pageFacade =
        prevPageFacades.get(pageId) || this._createPageFacade(pageEntity)

      pageFacade.setPageEntity(pageEntity)

      nextPageFacades.set(pageId, pageFacade)
    })

    this._pageFacades = nextPageFacades

    return [...nextPageFacades.values()]
  })

  getPageById(pageId: PageId): PageFacade | null {
    const prevPageFacade = this._pageFacades.get(pageId)
    if (prevPageFacade) {
      return prevPageFacade
    }

    const entity = this.getDesignEntity()
    const pageEntity = entity.getPageById(pageId)
    if (!pageEntity) {
      return null
    }

    const pageFacade = this._createPageFacade(pageEntity)
    pageFacade.setPageEntity(pageEntity)

    const nextPageFacades = new Map(this._pageFacades.entries())
    nextPageFacades.set(pageId, pageFacade)

    return pageFacade
  }

  _createArtboardFacade(artboardEntity: IArtboard): ArtboardFacade {
    const artboard = new ArtboardFacade(artboardEntity, { designFacade: this })
    return artboard
  }

  _createPageFacade(pageEntity: IPage): PageFacade {
    const page = new PageFacade(pageEntity, { designFacade: this })
    return page
  }

  findArtboard(selector: ArtboardSelector): ArtboardFacade | null {
    const entity = this.getDesignEntity()
    const artboardEntity = entity.findArtboard(selector)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  findArtboards(selector: ArtboardSelector): Array<ArtboardFacade> {
    const entity = this.getDesignEntity()
    const artboardEntities = entity.findArtboards(selector)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  findPage(selector: PageSelector): PageFacade | null {
    const entity = this.getDesignEntity()
    const pageEntity = entity.findPage(selector)

    return pageEntity ? this.getPageById(pageEntity.id) : null
  }

  findPages(selector: PageSelector): Array<PageFacade> {
    const entity = this.getDesignEntity()
    const pageEntities = entity.findPages(selector)

    return pageEntities
      .map((pageEntity) => {
        return this.getPageById(pageEntity.id)
      })
      .filter(Boolean) as Array<PageFacade>
  }

  async getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    await this.load()

    const entity = this.getDesignEntity()
    const layerCollection = entity.getFlattenedLayers(options)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  async findLayerById(layerId: LayerId) {
    await this.load()

    const entity = this.getDesignEntity()
    const layerEntityDesc = entity.findLayerById(layerId)
    if (!layerEntityDesc) {
      return null
    }

    const layerFacade = this.getArtboardLayerFacade(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )

    return layerFacade
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  async findLayersById(layerId: LayerId) {
    await this.load()

    const entity = this.getDesignEntity()
    const layerCollection = entity.findLayersById(layerId)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  async findLayer(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    await this.load()

    const entity = this.getDesignEntity()
    const layerEntityDesc = entity.findLayer(selector, options)
    if (!layerEntityDesc) {
      return null
    }

    const layerFacade = this.getArtboardLayerFacade(
      layerEntityDesc.artboardId,
      layerEntityDesc.layer.id
    )

    return layerFacade
      ? {
          artboardId: layerEntityDesc.artboardId,
          layer: layerFacade,
        }
      : null
  }

  async findLayers(
    selector: FileLayerSelector,
    options: Partial<{ depth: number }> = {}
  ) {
    await this.load()

    const entity = this.getDesignEntity()
    const layerCollection = entity.findLayers(selector, options)

    return new FileLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  async getBitmapAssets(
    options: Partial<{ depth: number; includePrerendered: boolean }> = {}
  ) {
    await this.load()

    const entity = this.getDesignEntity()
    return entity.getBitmapAssets(options)
  }

  async getFonts(options: Partial<{ depth: number }> = {}) {
    await this.load()

    const entity = this.getDesignEntity()
    return entity.getFonts(options)
  }

  getArtboardLayerFacade(
    artboardId: ArtboardId,
    layerId: LayerId
  ): LayerFacade | null {
    const artboardFacade = this.getArtboardById(artboardId)
    return artboardFacade ? artboardFacade.getLayerFacadeById(layerId) : null
  }

  async load() {
    const artboards = this.getArtboards()
    return Promise.all(
      artboards.map((artboard) => {
        return artboard.load()
      })
    )
  }

  async loadArtboard(artboardId: ArtboardId): Promise<ArtboardFacade> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    if (!artboard.isLoaded()) {
      // NOTE: Maybe use the Octopus Reader file entity instead for clearer source of truth.
      const artboardEntity = artboard.getArtboardEntity()
      const content = await this._loadArtboardContent(artboardId)
      artboardEntity.setOctopus(content)
    }

    return artboard
  }

  async _loadArtboardContent(
    artboardId: ArtboardId
  ): Promise<ArtboardOctopusData> {
    const localDesign = this._localDesign
    const apiDesign = this._apiDesign

    if (localDesign) {
      if (!(await localDesign.hasArtboardContent(artboardId))) {
        if (!apiDesign) {
          throw new Error(
            'The artboard is not locally available and the API is not configured'
          )
        }

        const contentStream = await apiDesign.getArtboardContentJsonStream(
          artboardId
        )
        await localDesign.saveArtboardContentJsonStream(
          artboardId,
          contentStream
        )
      }

      return localDesign.getArtboardContent(artboardId)
    }

    if (!apiDesign) {
      throw new Error('The artboard cannot be loaded')
    }

    return apiDesign.getArtboardContent(artboardId)
  }

  async downloadBitmapAssets(
    bitmapAssetDescs: Array<LocalBitmapAssetDescriptor>
  ) {
    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error(
        'The API is not configured, cannot download bitmap assets'
      )
    }

    const localDesign = this._localDesign
    if (!localDesign) {
      throw new Error('The design is not configured to be a local file')
    }

    await sequence(bitmapAssetDescs, async (bitmapAssetDesc) => {
      const bitmapAssetStream = await apiDesign.getBitmapAssetStream(
        bitmapAssetDesc.name
      )
      return localDesign.saveBitmapAssetStream(
        bitmapAssetDesc,
        bitmapAssetStream
      )
    })
  }

  async saveOctopusFile(relPath: string | null = null) {
    const localDesign = await this._getLocalDesign(relPath)

    const manifest = this.getManifest()
    await localDesign.saveManifest(manifest)

    await Promise.all(
      this.getArtboards().map(async (artboard) => {
        const artboardOctopus = await artboard.getContent()
        if (!artboardOctopus) {
          throw new Error('Artboard octopus not available')
        }

        await localDesign.saveArtboardContent(artboard.id, artboardOctopus)
      })
    )

    const bitmapAssetDescs = await this.getBitmapAssets()
    const apiDesign = this._apiDesign

    await sequence(bitmapAssetDescs, async (bitmapAssetDesc) => {
      if (await localDesign.hasBitmapAsset(bitmapAssetDesc)) {
        return
      }

      if (!apiDesign) {
        throw new Error('The API is not configured, cannot save bitmap assets')
      }

      const bitmapAssetStream = await apiDesign.getBitmapAssetStream(
        bitmapAssetDesc.name
      )
      await localDesign.saveBitmapAssetStream(
        bitmapAssetDesc,
        bitmapAssetStream
      )
    })

    await this.setLocalDesign(localDesign)
  }

  async saveDesignFile(relPath: string) {
    const format = getDesignFormatByFileName(relPath)
    if (!format) {
      throw new Error('Unknown target design file format')
    }
    if (format !== 'sketch') {
      throw new Error('Unsupported target design file format')
    }

    const conversion = await this._getConversionToFormat(format)
    return this._sdk.saveDesignFileStream(
      relPath,
      await conversion.getResultStream()
    )
  }

  async _getLocalDesign(relPath: string | null): Promise<ILocalDesign> {
    if (!relPath) {
      const localDesign = this._localDesign
      if (!localDesign) {
        throw new Error('The design is not configured to be a local file')
      }

      return localDesign
    }

    const targetDesignFacade = await this._sdk.openOctopusFile(relPath)
    const targetLocalDesign = targetDesignFacade.getLocalDesign()
    if (!targetLocalDesign) {
      throw new Error('Target location is not available')
    }

    return targetLocalDesign
  }

  addConversion(conversion: IApiDesignConversion) {
    const format = conversion.resultFormat
    this._conversions.set(format, conversion)
  }

  async _getConversionToFormat(format: DesignConversionTargetFormatEnum) {
    const prevConversion = this._conversions.get(format)
    if (prevConversion) {
      return prevConversion
    }

    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error('The API is not configured, cannot convert the design')
    }

    const conversion = await apiDesign.convertDesign({ format })
    this._conversions.set(format, conversion)

    return conversion
  }
}
