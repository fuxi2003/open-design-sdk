import { ArtboardFacade } from './artboard-facade'
import { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import { PageFacade } from './page-facade'

import {
  createEmptyFile,
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
} from '@opendesign/octopus-reader'
import { sequence } from './utils/async'
import { memoize } from './utils/memoize'
import { getDesignFormatByFileName } from './utils/design-format-utils'

import type { IApiDesign, IApiDesignConversion } from '@opendesign/api'
import type { IRenderingDesign } from '@opendesign/rendering'
import type { components } from 'open-design-api-types'
import type { Sdk } from './sdk'
import type {
  ILocalDesign,
  LocalBitmapAssetDescriptor,
} from './types/local-design.iface'
import type { IDesignFacade } from './types/design-facade.iface'
import type { LayerFacade } from './layer-facade'

type DesignConversionTargetFormatEnum = components['schemas']['DesignConversionTargetFormatEnum']

export class DesignFacade implements IDesignFacade {
  private _sdk: Sdk

  private _designEntity: IFile | null = null
  private _localDesign: ILocalDesign | null = null
  private _apiDesign: IApiDesign | null = null
  private _renderingDesign: IRenderingDesign | null = null

  private _artboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()
  private _pageFacades: Map<PageId, PageFacade> = new Map()

  private _manifestLoaded: boolean = false
  private _pendingManifestUpdate: ManifestData | null = null

  private _conversions: Map<
    DesignConversionTargetFormatEnum,
    IApiDesignConversion
  > = new Map()

  /** @internal */
  constructor(params: { sdk: Sdk }) {
    this._sdk = params.sdk
  }

  /**
   * The ID of the referenced server-side design. This is not available when online services are not configured for the SDK.
   * @category Identification
   */
  get id() {
    const apiDesign = this._apiDesign
    return apiDesign?.id || null
  }

  /**
   * The absolute path of the open local `.octopus` design or the local cache. This is not available when online services are not configured for the SDK.
   * @category Identification
   */
  get filename() {
    const localDesign = this._localDesign
    return localDesign?.filename || null
  }

  /** @internal */
  getManifest(): ManifestData {
    if (this._pendingManifestUpdate) {
      return this._pendingManifestUpdate
    }

    const entity = this._getDesignEntity()
    return entity.getManifest()
  }

  /** @internal */
  setManifest(nextManifest: ManifestData) {
    this._pendingManifestUpdate = nextManifest
    this._manifestLoaded = true

    this._getDesignEntity.clear()
    this._getArtboardsMemoized.clear()
    this._getPagesMemoized.clear()
  }

  private _getDesignEntity = memoize(() => {
    const entity = this._designEntity || createEmptyFile()

    const pendingManifestUpdate = this._pendingManifestUpdate
    if (pendingManifestUpdate) {
      this._pendingManifestUpdate = null
      entity.setManifest(pendingManifestUpdate)

      this._getArtboardsMemoized.clear()
      this._getPagesMemoized.clear()
    }

    return entity
  })

  /** @internal */
  getLocalDesign() {
    return this._localDesign
  }

  /** @internal */
  async setLocalDesign(localDesign: ILocalDesign) {
    this._localDesign = localDesign

    if (!this._manifestLoaded) {
      this.setManifest(await localDesign.getManifest())
    }
  }

  /** @internal */
  async setApiDesign(apiDesign: IApiDesign) {
    this._apiDesign = apiDesign

    if (!this._manifestLoaded) {
      this.setManifest(await apiDesign.getManifest())
    }
  }

  /** @internal */
  setRenderingDesign(renderingDesign: IRenderingDesign) {
    this._renderingDesign = renderingDesign
  }

  /**
   * Returns a complete list of artboard object in the design. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   */
  getArtboards() {
    return this._getArtboardsMemoized()
  }

  private _getArtboardsMemoized = memoize(() => {
    const prevArtboardFacades = this._artboardFacades
    const nextArtboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()

    const entity = this._getDesignEntity()
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

  /**
   * Returns a single artboard object. These can be used to work with the artboard contents.
   *
   * @category Artboard Lookup
   * @param artboardId An artboard ID.
   */
  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const prevArtboardFacade = this._artboardFacades.get(artboardId)
    if (prevArtboardFacade) {
      return prevArtboardFacade
    }

    const entity = this._getDesignEntity()
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

  /**
   * Returns artboard objects for a specific page (in case the design is paged). These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   * @param pageId A page ID.
   */
  getPageArtboards(pageId: PageId): Array<ArtboardFacade> {
    const entity = this._getDesignEntity()
    const artboardEntities = entity.getPageArtboards(pageId)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Returns (main/master) component artboard objects. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   */
  getComponentArtboards(): Array<ArtboardFacade> {
    const entity = this._getDesignEntity()
    const artboardEntities = entity.getComponentArtboards()

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Returns an artboard object of a specific (main/master) component. These can be used to work with the artboard contents.
   *
   * @category Artboard Lookup
   * @param componentId A component ID.
   */
  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const entity = this._getDesignEntity()
    const artboardEntity = entity.getArtboardByComponentId(componentId)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  /**
   * Returns info about whether the design is paged (i.e. has artboards organized on different pages).
   *
   * @category Page Lookup
   */
  isPaged() {
    const entity = this._getDesignEntity()
    return entity.isPaged()
  }

  /**
   * Returns a complete list of page object in the design. These can be used to work with artboard contents.
   *
   * An empty list is returned for unpaged designs.
   *
   * @category Page Lookup
   */
  getPages() {
    return this._getPagesMemoized()
  }

  private _getPagesMemoized = memoize(() => {
    const prevPageFacades = this._pageFacades
    const nextPageFacades: Map<PageId, PageFacade> = new Map()

    const entity = this._getDesignEntity()
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

  /**
   * Returns a single page object. These can be used to work with the page contents and contents of artboards inside the page.
   *
   * @category Page Lookup
   * @param pageId A page ID.
   */
  getPageById(pageId: PageId): PageFacade | null {
    const prevPageFacade = this._pageFacades.get(pageId)
    if (prevPageFacade) {
      return prevPageFacade
    }

    const entity = this._getDesignEntity()
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

  private _createArtboardFacade(artboardEntity: IArtboard): ArtboardFacade {
    const artboard = new ArtboardFacade(artboardEntity, { designFacade: this })
    return artboard
  }

  private _createPageFacade(pageEntity: IPage): PageFacade {
    const page = new PageFacade(pageEntity, { designFacade: this })
    return page
  }

  /**
   * Looks up the first artboard object matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the result.
   */
  findArtboard(selector: ArtboardSelector): ArtboardFacade | null {
    const entity = this._getDesignEntity()
    const artboardEntity = entity.findArtboard(selector)

    return artboardEntity ? this.getArtboardById(artboardEntity.id) : null
  }

  /**
   * Looks up all artboard objects matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the results.
   */
  findArtboards(selector: ArtboardSelector): Array<ArtboardFacade> {
    const entity = this._getDesignEntity()
    const artboardEntities = entity.findArtboards(selector)

    return artboardEntities
      .map((artboardEntity) => {
        return this.getArtboardById(artboardEntity.id)
      })
      .filter(Boolean) as Array<ArtboardFacade>
  }

  /**
   * Looks up the first artboard object matching the provided criteria.
   *
   * @category Page Lookup
   * @param selector A page selector. All specified fields must be matched by the result.
   */
  findPage(selector: PageSelector): PageFacade | null {
    const entity = this._getDesignEntity()
    const pageEntity = entity.findPage(selector)

    return pageEntity ? this.getPageById(pageEntity.id) : null
  }

  /**
   * Looks up all artboard objects matching the provided criteria.
   *
   * @category Page Lookup
   * @param selector A page selector. All specified fields must be matched by the results.
   */
  findPages(selector: PageSelector): Array<PageFacade> {
    const entity = this._getDesignEntity()
    const pageEntities = entity.findPages(selector)

    return pageEntities
      .map((pageEntity) => {
        return this.getPageById(pageEntity.id)
      })
      .filter(Boolean) as Array<PageFacade>
  }

  /**
   * Returns a collection of all layers from all pages and artboards (optionally down to a specific nesting level).
   *
   * The produced collection can be queried further for narrowing down the search.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Layer Lookup
   * @param options.depth The maximum nesting level of layers within pages and artboards to include in the collection. By default, all levels are included.
   */
  async getFlattenedLayers(options: Partial<{ depth: number }> = {}) {
    await this.load()

    const entity = this._getDesignEntity()
    const layerCollection = entity.getFlattenedLayers(options)

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns the first layer object which has the specified ID.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes. This is the reason the method is not prefixed with "get".
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   */
  async findLayerById(layerId: LayerId) {
    await this.load()

    const entity = this._getDesignEntity()
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

  /**
   * Returns a collection of all layer objects which have the specified ID.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   */
  async findLayersById(layerId: LayerId) {
    await this.load()

    const entity = this._getDesignEntity()
    const layerCollection = entity.findLayersById(layerId)

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns the first layer object from any page or artboard (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched.
   */
  async findLayer(
    selector: FileLayerSelector,
    options: { depth?: number } = {}
  ) {
    await this.load()

    const entity = this._getDesignEntity()
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

  /**
   * Returns a collection of all layer objects from all pages and artboards (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Layer Lookup
   * @param selector A design-wide layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched.
   */
  async findLayers(
    selector: FileLayerSelector,
    options: { depth?: number } = {}
  ) {
    await this.load()

    const entity = this._getDesignEntity()
    const layerCollection = entity.findLayers(selector, options)

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns a list of bitmap assets used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  async getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ) {
    await this.load()

    const entity = this._getDesignEntity()
    return entity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched.
   */
  async getFonts(options: { depth?: number } = {}) {
    await this.load()

    const entity = this._getDesignEntity()
    return entity.getFonts(options)
  }

  /**
   * Renders the specified artboard as an image file.
   *
   * All visible layers from the artboard are included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard to render.
   * @param relPath The target location of the produced image file.
   */
  async renderArtboardToFile(
    artboardId: ArtboardId,
    relPath: string
  ): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId)

    return renderingDesign.renderArtboardToFile(artboardId, relPath)
  }

  /**
   * Renders all artboards from the specified page as a single image file.
   *
   * All visible layers from the artboards are included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param pageId The ID of the page to render.
   * @param relPath The target location of the produced image file.
   */
  async renderPageToFile(pageId: PageId, relPath: string): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignPage(pageId)

    return renderingDesign.renderPageToFile(pageId, relPath)
  }

  /**
   * Renders the specified layer from the specified artboard as an image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param layerId The ID of the artboard layer to render.
   * @param relPath The target location of the produced image file.
   */
  async renderArtboardLayerToFile(
    artboardId: ArtboardId,
    layerId: LayerId,
    relPath: string
  ): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId)

    const resolvedLayerIds = await this._resolveVisibleArtboardLayerSubtree(
      artboardId,
      layerId
    )

    return renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      relPath
    )
  }

  /**
   * Renders the specified layers from the specified artboard into as a single composed image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param layerIds The IDs of the artboard layers to render.
   * @param relPath The target location of the produced image file.
   */
  async renderArtboardLayersToFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    relPath: string
  ): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId)

    const resolvedLayerSubtrees = await Promise.all(
      layerIds.map((layerId) => {
        return this._resolveVisibleArtboardLayerSubtree(artboardId, layerId)
      })
    )
    const resolvedLayerIds = resolvedLayerSubtrees.flat(1)

    return renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      relPath
    )
  }

  /** @internal */
  getArtboardLayerFacade(
    artboardId: ArtboardId,
    layerId: LayerId
  ): LayerFacade | null {
    const artboardFacade = this.getArtboardById(artboardId)
    return artboardFacade ? artboardFacade.getLayerFacadeById(layerId) : null
  }

  /** @internal */
  async load() {
    const artboards = this.getArtboards()
    return Promise.all(
      artboards.map((artboard) => {
        return artboard.load()
      })
    )
  }

  /** @internal */
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

  private async _loadArtboardContent(
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

  /**
   * Downloads the specified bitmap assets to the local `.octopus` file or the local cache.
   *
   * Both online and offline services have to be configured when using this method.
   *
   * @category Asset Aggregation
   * @param bitmapAssetDescs A list of bitmap assets to download.
   */
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

  /**
   * Downloads all uncached pages, artboards and bitmap assets to the local `.octopus` file or the local cache.
   *
   * In case a new file path is provided for a design loaded from an existing `.octopus` file, all of its contents are copied to the new location and this method essentially serves the purpose of a "save as" action.
   *
   * The produced `.octopus` file preserves a reference to a server-side design.
   *
   * The design object switches to using the new location as the local `.octopus` file and considers the file a local cache.
   *
   * @category Serialization
   * @param relPath An absolute path of the target `.octopus` file or a path relative to the current working directory. When omitted, the open `.octopus` file location is used instead. Online services have to be configured in case there are uncached items.
   */
  async saveOctopusFile(relPath: string | null = null) {
    const localDesign = await this._getLocalDesign(relPath)
    const apiDesign = this._apiDesign

    const manifest = this.getManifest()
    await localDesign.saveManifest(manifest)

    if (apiDesign) {
      await localDesign.saveApiDesignInfo({
        apiRoot: apiDesign.getApiRoot(),
        designId: apiDesign.id,
      })
    }

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

  /**
   * Downloads the design file of the specified format produced by a server-side design file format conversion.
   *
   * In case no such conversion has been done for the design yet, a new conversion is initiated and the resulting design file is downloaded.
   *
   * @category Serialization
   * @param relPath An absolute path to which to save the design file or a path relative to the current working directory.
   */
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

  private async _getLocalDesign(relPath: string | null): Promise<ILocalDesign> {
    const localDesign = this._localDesign

    if (!relPath) {
      if (!localDesign) {
        throw new Error('The design is not configured to be a local file')
      }

      return localDesign
    }

    if (localDesign) {
      await localDesign.saveAs(relPath)
      return localDesign
    }

    const targetDesignFacade = await this._sdk.openOctopusFile(relPath)
    const targetLocalDesign = targetDesignFacade.getLocalDesign()
    if (!targetLocalDesign) {
      throw new Error('Target location is not available')
    }

    return targetLocalDesign
  }

  /** @internal */
  addConversion(conversion: IApiDesignConversion) {
    const format = conversion.resultFormat
    this._conversions.set(format, conversion)
  }

  private async _getConversionToFormat(
    format: DesignConversionTargetFormatEnum
  ) {
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

  private async _loadRenderingDesignPage(pageId: string) {
    const pageArtboards = this.getPageArtboards(pageId)

    await sequence(pageArtboards, (artboard) => {
      return this._loadRenderingDesignArtboard(artboard.id)
    })
  }

  private async _loadRenderingDesignArtboard(artboardId: string) {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    if (renderingDesign.isArtboardReady(artboardId)) {
      return
    }

    const localDesign = this._localDesign
    if (!localDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    await artboard.load()

    const octopusFilename = await localDesign.getArtboardContentFilename(
      artboardId
    )
    if (!octopusFilename) {
      throw new Error('The artboard octopus location is not available')
    }

    const desc = await renderingDesign.loadArtboard(artboardId, {
      octopusFilename,
      symbolId: artboard.componentId,
    })

    // NOTE: This logic is more a future-proofing of the logic rather than a required step
    //   as the SDK works with "expanded" octopus documents only and there should thus not be
    //   any pending symbols.
    await sequence(desc.pendingSymbolIds, async (componentId: string) => {
      const componentArtboard = this.getArtboardByComponentId(componentId)
      if (!componentArtboard) {
        throw new Error('A dependency component artboard is not available')
      }

      return this._loadRenderingDesignArtboard(componentArtboard.id)
    })

    if (!renderingDesign.isArtboardReady(artboardId)) {
      throw new Error('The artboard failed to be loaded to a ready state')
    }
  }

  private _resolveVisibleArtboardLayerSubtree(
    artboardId: ArtboardId,
    layerId: LayerId
  ): Promise<Array<LayerId>> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.resolveVisibleLayerSubtree(layerId)
  }
}
