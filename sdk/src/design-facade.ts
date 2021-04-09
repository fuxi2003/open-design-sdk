import { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
import { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import { PageFacade } from './page-facade'

import { inspect } from 'util'
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
import type {
  Bounds,
  IRenderingDesign,
  BlendingMode,
} from '@opendesign/rendering'
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
  /**
   * The absolute path of the original design file. This is not available for designs loaded from the API.
   * @category Identification
   */
  readonly sourceFilename: string | null

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

  private _fallbackFontPostscriptNames: Array<string> = []

  /** @internal */
  constructor(params: { sdk: Sdk; sourceFilename?: string | null }) {
    this.sourceFilename = params.sourceFilename || null

    this._sdk = params.sdk
  }

  /**
   * The ID of the referenced server-side design. This is not available when the API is not configured for the SDK.
   * @category Identification
   */
  get id() {
    const apiDesign = this._apiDesign
    return apiDesign?.id || null
  }

  /**
   * The absolute path of the local cache. This is not available when the local cache is not configured for the SDK.
   * @internal
   * @category Identification
   */
  get octopusFilename() {
    const localDesign = this._localDesign
    return localDesign?.filename || null
  }

  /** @internal */
  toString() {
    const designInfo = this.toJSON()
    return `Design ${inspect(designInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return {
      id: this.id,
      sourceFilename: this.sourceFilename,
      octopusFilename: this.octopusFilename,
    }
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
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   */
  async findLayerById(layerId: LayerId) {
    await this.load()

    const entity = this._getDesignEntity()
    const layerEntity = entity.findLayerById(layerId)
    const artboardId = layerEntity ? layerEntity.artboardId : null
    if (!layerEntity || !artboardId) {
      return null
    }

    return this.getArtboardLayerFacade(artboardId, layerEntity.id)
  }

  /**
   * Returns a collection of all layer objects which have the specified ID.
   *
   * Layer IDs are unique within individual artboards but different artboards can potentially have layer ID clashes.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
    const layerEntity = entity.findLayer(selector, options)
    const artboardId = layerEntity ? layerEntity.artboardId : null
    if (!layerEntity || !artboardId) {
      return null
    }

    return this.getArtboardLayerFacade(artboardId, layerEntity.id)
  }

  /**
   * Returns a collection of all layer objects from all pages and artboards (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
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
   * Sets the fonts which should be used as a fallback in case the actual fonts needed for rendering text layers are not available.
   *
   * The first font from this list which is available in the system is used for all text layers with missing actual fonts. If none of the fonts are available, the text layers are not rendered.
   *
   * This configuration overrides/extends the global configuration set via {@link Sdk.setFallbackFonts}. Fonts specified here are preferred over the global config.
   *
   * @category Configuration
   * @param fallbackFontPostscriptNames An ordered list of font postscript names.
   */
  setFallbackFonts(fallbackFontPostscriptNames: Array<string>) {
    this._fallbackFontPostscriptNames = fallbackFontPostscriptNames
  }

  /**
   * Renders the specified artboard as an PNG image file.
   *
   * All visible layers from the artboard are included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard to render.
   * @param filePath The target location of the produced PNG image file.
   */
  async renderArtboardToFile(
    artboardId: ArtboardId,
    filePath: string,
    options: { scale?: number } = {}
  ): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: true })

    return renderingDesign.renderArtboardToFile(artboardId, filePath, options)
  }

  /**
   * Renders all artboards from the specified page as a single PNG image file.
   *
   * All visible layers from the artboards are included.
   *
   * Uncached items (artboard contents and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param pageId The ID of the page to render.
   * @param filePath The target location of the produced PNG image file.
   */
  async renderPageToFile(
    pageId: PageId,
    filePath: string,
    options: { scale?: number } = {}
  ): Promise<void> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignPage(pageId, { loadAssets: true })

    return renderingDesign.renderPageToFile(pageId, filePath, options)
  }

  /**
   * Renders the specified layer from the specified artboard as an PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param layerId The ID of the artboard layer to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options.blendingMode The blending mode to use for rendering the layer instead of its default blending mode. Note that this configuration has no effect when the artboard background is not included via `includeArtboardBackground=true`.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeArtboardBackground Whether to render the artboard background below the layer. By default, the background is not included.
   * @param options.includeEffects Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   */
  async renderArtboardLayerToFile(
    artboardId: ArtboardId,
    layerId: LayerId,
    filePath: string,
    options: {
      includeEffects?: boolean
      clip?: boolean
      includeArtboardBackground?: boolean
      blendingMode?: BlendingMode
      opacity?: number
      bounds?: Bounds
      scale?: number
    } = {}
  ): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const layer = await artboard.getLayerById(layerId)
    if (!layer) {
      throw new Error('No such layer')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: false })

    const bitmapAssetDescs = layer.getBitmapAssets()
    await this.downloadBitmapAssets(bitmapAssetDescs)

    const fonts = layer.getFonts()
    await this._loadSystemFontsToRendering(fonts)

    const { bounds, scale, ...layerAttributes } = options
    const resolvedLayerIds = await this._resolveVisibleArtboardLayerSubtree(
      artboardId,
      layerId
    )

    return renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      filePath,
      {
        ...(bounds ? { bounds } : {}),
        scale: scale || 1,
        layerAttributes: { [layerId]: layerAttributes },
      }
    )
  }

  /**
   * Renders the specified layers from the specified artboard into as a single composed PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param layerIds The IDs of the artboard layers to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.layerAttributes Layer-specific options to use for the rendering instead of the default values.
   */
  async renderArtboardLayersToFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: false })

    const resolvedLayerSubtrees = await Promise.all(
      layerIds.map((layerId) => {
        return this._resolveVisibleArtboardLayerSubtree(artboardId, layerId)
      })
    )
    const resolvedLayerIds = resolvedLayerSubtrees.flat(1)

    const bitmapAssetDescs = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId)
          return layer ? layer.getBitmapAssets() : []
        })
      )
    ).flat(1)

    const fonts = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId)
          return layer ? layer.getFonts() : []
        })
      )
    ).flat(1)

    await Promise.all([
      this.downloadBitmapAssets(bitmapAssetDescs),
      this._loadSystemFontsToRendering(fonts),
    ])

    return renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      filePath,
      options
    )
  }

  /**
   * Returns various bounds of the specified layer.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Data
   * @param artboardId The ID of the artboard from which to inspect the layer.
   * @param layerId The ID of the layer to inspect.
   */
  async getArtboardLayerBounds(artboardId: ArtboardId, layerId: LayerId) {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const layer = await artboard.getLayerById(layerId)
    if (!layer) {
      throw new Error('No such layer')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: false })

    const fonts = layer.getFonts()
    await this._loadSystemFontsToRendering(fonts)

    return renderingDesign.getArtboardLayerBounds(artboardId, layerId)
  }

  /**
   * Returns the top-most layer located at the specified coordinates within the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param x The X coordinate in the coordinate system of the artboard where to look for a layer.
   * @param y The Y coordinate in the coordinate system of the artboard where to look for a layer.
   */
  async getArtboardLayerAtPosition(
    artboardId: ArtboardId,
    x: number,
    y: number
  ): Promise<LayerFacade | null> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: true })

    const layerId = await renderingDesign.getArtboardLayerAtPosition(
      artboardId,
      x,
      y
    )
    return layerId ? this.getArtboardLayerFacade(artboardId, layerId) : null
  }

  /**
   * Returns all layers located within the specified area of the the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param artboardId The ID of the artboard from which to render the layer.
   * @param bounds The area in the corrdinate system of the artboard where to look for layers.
   * @param options.partialOverlap Whether to also return layers which are only partially contained within the specified area.
   */
  async getArtboardLayersInArea(
    artboardId: ArtboardId,
    bounds: Bounds,
    options: { partialOverlap?: boolean } = {}
  ): Promise<Array<LayerFacade>> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, { loadAssets: true })

    const layerIds = await renderingDesign.getArtboardLayersInArea(
      artboardId,
      bounds,
      options
    )

    return layerIds.flatMap((layerId) => {
      const layerFacade = this.getArtboardLayerFacade(artboardId, layerId)
      return layerFacade ? [layerFacade] : []
    })
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

  /**
   * Releases all loaded data of the design from memory. The design object is no longer usable after this.
   *
   * If it is only desired to clean loaded data from memory while keeping the object usable, call {@link DesignFacade.unload} instead.
   *
   * @category Status
   */
  async destroy() {
    const localDesign = this._localDesign
    if (localDesign) {
      localDesign.unload()
    }

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      renderingDesign.destroy()
    }

    this._designEntity = null
    this._getDesignEntity.clear()
  }

  /**
   * Releases all loaded data of the design from memory. The design object can be used for loading the data again later.
   *
   * @category Status
   */
  async unload() {
    const localDesign = this._localDesign
    if (localDesign) {
      localDesign.unload()
    }

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      await renderingDesign.unloadArtboards()
    }

    const designEntity = this._getDesignEntity()
    designEntity.unloadArtboards()
  }

  /**
   * Releases data related to the specified artboard from memory.
   *
   * @category Status
   */
  async unloadArtboard(artboardId: ArtboardId) {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    if (!artboard.isLoaded()) {
      console.warn('Trying to unload an artboard which has not been loaded.')
      return
    }

    const renderingDesign = this._renderingDesign
    if (renderingDesign) {
      renderingDesign.unloadArtboard(artboardId)
    }

    const artboardEntity = artboard.getArtboardEntity()
    artboardEntity.unload()
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
   * Downloads the specified bitmap assets to the local cache.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset Aggregation
   * @param bitmapAssetDescs A list of bitmap assets to download.
   */
  async downloadBitmapAssets(
    bitmapAssetDescs: Array<LocalBitmapAssetDescriptor>
  ) {
    await sequence(bitmapAssetDescs, async (bitmapAssetDesc) => {
      return this.downloadBitmapAsset(bitmapAssetDesc)
    })
  }

  /**
   * Downloads the specified bitmap asset to the local cache.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset Aggregation
   * @param bitmapAssetDescs A list of bitmap assets to download.
   */
  async downloadBitmapAsset(bitmapAssetDesc: LocalBitmapAssetDescriptor) {
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

    if (await localDesign.hasBitmapAsset(bitmapAssetDesc)) {
      return
    }

    const bitmapAssetStream = await apiDesign.getBitmapAssetStream(
      bitmapAssetDesc.name
    )
    return localDesign.saveBitmapAssetStream(bitmapAssetDesc, bitmapAssetStream)
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
   * @internal
   * @category Serialization
   * @param filePath An absolute path of the target `.octopus` file or a path relative to the current working directory. When omitted, the open `.octopus` file location is used instead. The API has to be configured in case there are uncached items.
   */
  async saveOctopusFile(filePath: string | null = null) {
    const localDesign = await this._getLocalDesign(filePath)
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

    await this.setLocalDesign(localDesign)

    const bitmapAssetDescs = await this.getBitmapAssets()
    await this.downloadBitmapAssets(bitmapAssetDescs)
  }

  /**
   * Downloads the design file of the specified format produced by a server-side design file format conversion.
   *
   * In case no such conversion has been done for the design yet, a new conversion is initiated and the resulting design file is downloaded.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   */
  async saveDesignFile(filePath: string) {
    const format = getDesignFormatByFileName(filePath)
    if (!format) {
      throw new Error('Unknown target design file format')
    }
    if (format !== 'sketch') {
      throw new Error('Unsupported target design file format')
    }

    const conversion = await this.getConversionToFormat(format)
    return this._sdk.saveDesignFileStream(
      filePath,
      await conversion.getResultStream()
    )
  }

  private async _getLocalDesign(
    filePath: string | null
  ): Promise<ILocalDesign> {
    const localDesign = this._localDesign

    if (!filePath) {
      if (!localDesign) {
        throw new Error('The design is not configured to be a local file')
      }

      return localDesign
    }

    if (localDesign) {
      await localDesign.saveAs(filePath)
      return localDesign
    }

    const targetDesignFacade = await this._sdk.openOctopusFile(filePath)
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

  /**
   * Returns info about a design file of the specified format produced by a server-side design file format conversion.
   *
   * In case no such conversion has been done for the design yet, a new conversion is initiated and the resulting design file info is then returned.
   *
   * @category Serialization
   * @param format The format to which the design should be converted.
   */
  async getConversionToFormat(format: DesignConversionTargetFormatEnum) {
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

  private async _loadRenderingDesignPage(
    pageId: string,
    params: {
      loadAssets: boolean
    }
  ) {
    const pageArtboards = this.getPageArtboards(pageId)

    await sequence(pageArtboards, (artboard) => {
      return this._loadRenderingDesignArtboard(artboard.id, params)
    })
  }

  private async _loadRenderingDesignArtboard(
    artboardId: string,
    params: {
      loadAssets: boolean
    }
  ) {
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

      return this._loadRenderingDesignArtboard(componentArtboard.id, params)
    })

    if (params.loadAssets) {
      const bitmapAssetDescs = await artboard.getBitmapAssets()
      const fonts = await artboard.getFonts()

      await Promise.all([
        this.downloadBitmapAssets(bitmapAssetDescs),
        this._loadSystemFontsToRendering(fonts),
      ])
    }

    await renderingDesign.markArtboardAsReady(artboardId)

    if (!renderingDesign.isArtboardReady(artboardId)) {
      throw new Error('The artboard failed to be loaded to a ready state')
    }
  }

  private async _loadSystemFontsToRendering(
    fonts: Array<{ fontPostScriptName: string }>
  ) {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await sequence(fonts, async ({ fontPostScriptName }) => {
      const fontMatch = await this._sdk.getSystemFont(fontPostScriptName, {
        fallbacks: this._fallbackFontPostscriptNames,
      })
      if (fontMatch) {
        await renderingDesign.loadFont(
          fontPostScriptName,
          fontMatch.fontFilename
        )
      } else {
        console.warn(`Font not available: ${fontPostScriptName}`)
      }
    })
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
