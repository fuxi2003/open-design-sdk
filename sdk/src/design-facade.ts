import { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
import { DesignExportFacade } from './design-export-facade'
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
import { enumerablizeWithPrototypeGetters } from './utils/object'

import type { CancelToken } from '@avocode/cancel-token'
import type { IApiDesign } from '@opendesign/api'
import type {
  Bounds,
  IRenderingDesign,
  BlendingMode,
  LayerBounds,
} from '@opendesign/rendering'
import type { components } from 'open-design-api-types'
import type { FontDescriptor, LayerFacade } from './layer-facade'
import type { Sdk } from './sdk'
import type { FontSource } from './local/font-source'
import type { BitmapAssetDescriptor, LocalDesign } from './local/local-design'

type DesignExportTargetFormatEnum = components['schemas']['DesignExportTargetFormatEnum']

export class DesignFacade {
  /**
   * The absolute path of the original design file. This is not available for designs loaded from the API.
   * @category Identification
   */
  readonly sourceFilename: string | null

  private _sdk: Sdk
  private _console: Console

  private _designEntity: IFile | null = null
  private _localDesign: LocalDesign | null = null
  private _apiDesign: IApiDesign | null = null
  private _renderingDesign: IRenderingDesign | null = null
  private _fontSource: FontSource | null = null

  private _artboardFacades: Map<ArtboardId, ArtboardFacade> = new Map()
  private _pageFacades: Map<PageId, PageFacade> = new Map()

  private _manifestLoaded: boolean = false
  private _pendingManifestUpdate: ManifestData | null = null

  private _designExports: Map<
    DesignExportTargetFormatEnum,
    DesignExportFacade
  > = new Map()

  /** @internal */
  constructor(params: {
    sdk: Sdk
    console?: Console | null
    sourceFilename?: string | null
  }) {
    this.sourceFilename = params.sourceFilename || null

    this._sdk = params.sdk
    this._console = params.console || console

    enumerablizeWithPrototypeGetters(this, {
      enumerableOwnKeys: ['sourceFilename'],
      omittedPrototypeKeys: ['octopusFilename'],
    })
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
    return { ...this }
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

  private _getDesignEntity = memoize(
    (): IFile => {
      const entity = this._designEntity || createEmptyFile()

      const pendingManifestUpdate = this._pendingManifestUpdate
      if (pendingManifestUpdate) {
        this._pendingManifestUpdate = null
        entity.setManifest(pendingManifestUpdate)

        this._getArtboardsMemoized.clear()
        this._getPagesMemoized.clear()
      }

      return entity
    }
  )

  /** @internal */
  getLocalDesign(): LocalDesign | null {
    return this._localDesign
  }

  /** @internal */
  async setLocalDesign(
    localDesign: LocalDesign,
    options: {
      cancelToken?: CancelToken | null
    }
  ) {
    if (!this._manifestLoaded) {
      this.setManifest(await localDesign.getManifest(options))
    }

    this._localDesign = localDesign
  }

  /** @internal */
  async setApiDesign(
    apiDesign: IApiDesign,
    options: {
      cancelToken?: CancelToken | null
    }
  ) {
    if (!this._manifestLoaded) {
      this.setManifest(await apiDesign.getManifest(options))
    }

    this._apiDesign = apiDesign
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
  getArtboards(): Array<ArtboardFacade> {
    return this._getArtboardsMemoized()
  }

  private _getArtboardsMemoized = memoize(
    (): Array<ArtboardFacade> => {
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
    }
  )

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
  isPaged(): boolean {
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
  getPages(): Array<PageFacade> {
    return this._getPagesMemoized()
  }

  private _getPagesMemoized = memoize(
    (): Array<PageFacade> => {
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
    }
  )

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
   * @param options.depth The maximum nesting level of layers within pages and artboards to include in the collection. By default, all levels are included. `0` also means "no limit"; `1` means only root layers in artboards should be included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getFlattenedLayers(
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<DesignLayerCollectionFacade> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    const layerCollection = entity.getFlattenedLayers({
      depth: options.depth || 0,
    })

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async findLayerById(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    await this.load(options)

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async findLayersById(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    await this.load(options)

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
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async findLayer(
    selector: FileLayerSelector,
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<LayerFacade | null> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    const layerEntity = entity.findLayer(selector, {
      depth: options.depth || 0,
    })
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
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async findLayers(
    selector: FileLayerSelector,
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<DesignLayerCollectionFacade> {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    const layerCollection = entity.findLayers(selector, {
      depth: options.depth || 0,
    })

    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this,
    })
  }

  /**
   * Returns a list of bitmap assets used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getBitmapAssets(
    options: {
      depth?: number
      includePrerendered?: boolean
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<
    Array<
      BitmapAssetDescriptor & {
        artboardLayerIds: Record<ArtboardId, Array<LayerId>>
      }
    >
  > {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    return entity.getBitmapAssets({
      depth: options.depth || 0,
      includePrerendered: options.includePrerendered !== false,
    })
  }

  /**
   * Returns a list of fonts used by layers in all pages and artboards (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all pages and artboards. Uncached items are downloaded when the API is configured (and cached when the local cache is configured).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in artboards should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getFonts(
    options: { depth?: number; cancelToken?: CancelToken | null } = {}
  ): Promise<
    Array<
      FontDescriptor & { artboardLayerIds: Record<ArtboardId, Array<LayerId>> }
    >
  > {
    await this.load({ cancelToken: options.cancelToken || null })

    const entity = this._getDesignEntity()
    return entity.getFonts({ depth: options.depth || 0 })
  }

  setFontSource(fontSource: FontSource | null) {
    this._fontSource = fontSource
  }

  /**
   * Sets the directory where fonts should be looked up when rendering the design.
   *
   * Fonts are matched based on their postscript names, not the file basenames.
   */
  setFontDirectory(fontDirectoryPath: string) {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error(
        'Cannot set the font directory when the rendering engine is not configured'
      )
    }

    renderingDesign.setFontDirectory(fontDirectoryPath)

    const fontSource = this._fontSource
    if (fontSource) {
      fontSource.setFontDirectory(fontDirectoryPath)
    }
  }

  /**
   * Sets the fonts which should be used as a fallback in case the actual fonts needed for rendering text layers are not available.
   *
   * The first font from this list which is available in the system is used for all text layers with missing actual fonts. If none of the fonts are available, the text layers are not rendered.
   *
   * This configuration overrides/extends the global configuration set via {@link Sdk.setGlobalFallbackFonts}. Fonts specified here are preferred over the global config.
   *
   * @category Configuration
   * @param fallbackFonts An ordered list of font postscript names or font file paths.
   */
  setFallbackFonts(fallbackFonts: Array<string>) {
    const fontSource = this._fontSource
    if (fontSource) {
      fontSource.setFallbackFonts(fallbackFonts)
    }
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
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default artboard area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async renderArtboardToFile(
    artboardId: ArtboardId,
    filePath: string,
    options: {
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
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

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      cancelToken: options.cancelToken || null,
    })

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
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default page area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async renderPageToFile(
    pageId: PageId,
    filePath: string,
    options: {
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
    } = {}
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
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
      cancelToken?: CancelToken | null
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

    const { bounds, scale, cancelToken = null, ...layerAttributes } = options

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      cancelToken,
    })

    const bitmapAssetDescs = layer.getBitmapAssets()
    await this.downloadBitmapAssets(bitmapAssetDescs)

    const fonts = layer.getFonts()
    await this._loadFontsToRendering(fonts, { cancelToken })

    await renderingDesign.markArtboardAsReady(artboardId)

    const resolvedLayerIds = await this._resolveVisibleArtboardLayerSubtree(
      artboardId,
      layerId,
      { cancelToken }
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async renderArtboardLayersToFile(
    artboardId: ArtboardId,
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
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

    const { cancelToken = null, ...layerOptions } = options

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      cancelToken,
    })

    const resolvedLayerSubtrees = await Promise.all(
      layerIds.map((layerId) => {
        return this._resolveVisibleArtboardLayerSubtree(artboardId, layerId, {
          cancelToken,
        })
      })
    )
    const resolvedLayerIds = resolvedLayerSubtrees.flat(1)

    const bitmapAssetDescs = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId, { cancelToken })
          return layer ? layer.getBitmapAssets() : []
        })
      )
    ).flat(1)

    const fonts = (
      await Promise.all(
        layerIds.map(async (layerId) => {
          const layer = await artboard.getLayerById(layerId, { cancelToken })
          return layer ? layer.getFonts() : []
        })
      )
    ).flat(1)

    await Promise.all([
      this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken }),
      this._loadFontsToRendering(fonts, { cancelToken }),
    ])

    await renderingDesign.markArtboardAsReady(artboardId)
    cancelToken?.throwIfCancelled()

    return renderingDesign.renderArtboardLayersToFile(
      artboardId,
      resolvedLayerIds,
      filePath,
      layerOptions
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getArtboardLayerBounds(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerBounds> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const layer = await artboard.getLayerById(layerId, options)
    if (!layer) {
      throw new Error('No such layer')
    }

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: false,
      ...options,
    })

    const fonts = layer.getFonts()
    await this._loadFontsToRendering(fonts, options)

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getArtboardLayerAtPosition(
    artboardId: ArtboardId,
    x: number,
    y: number,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      ...options,
    })

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. newly cached artboards are not uncached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getArtboardLayersInArea(
    artboardId: ArtboardId,
    bounds: Bounds,
    options: {
      partialOverlap?: boolean
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Array<LayerFacade>> {
    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    const { cancelToken = null, ...layerOptions } = options

    await this._loadRenderingDesignArtboard(artboardId, {
      loadAssets: true,
      cancelToken: options.cancelToken || null,
    })

    const layerIds = await renderingDesign.getArtboardLayersInArea(
      artboardId,
      bounds,
      layerOptions
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
  async load(options: { cancelToken?: CancelToken | null }) {
    const artboards = this.getArtboards()
    return Promise.all(
      artboards.map((artboard) => {
        return artboard.load(options)
      })
    )
  }

  /** @internal */
  async loadArtboard(
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<ArtboardFacade> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    if (!artboard.isLoaded()) {
      // NOTE: Maybe use the Octopus Reader file entity instead for clearer source of truth.
      const artboardEntity = artboard.getArtboardEntity()
      const content = await this._loadArtboardContent(artboardId, options)
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
      this._console.warn(
        'Trying to unload an artboard which has not been loaded.'
      )
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
    artboardId: ArtboardId,
    options: {
      cancelToken?: CancelToken | null
    }
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
          artboardId,
          options
        )
        await localDesign.saveArtboardContentJsonStream(
          artboardId,
          contentStream,
          options
        )
      }

      return localDesign.getArtboardContent(artboardId, options)
    }

    if (!apiDesign) {
      throw new Error('The artboard cannot be loaded')
    }

    return apiDesign.getArtboardContent(artboardId, options)
  }

  /**
   * Downloads the specified bitmap assets to the local cache.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset
   * @param bitmapAssetDescs A list of bitmap assets to download.
   */
  async downloadBitmapAssets(
    bitmapAssetDescs: Array<BitmapAssetDescriptor>,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    await sequence(bitmapAssetDescs, async (bitmapAssetDesc) => {
      return this.downloadBitmapAsset(bitmapAssetDesc, options)
    })
  }

  /**
   * Downloads the specified bitmap asset to the local cache.
   *
   * The API and the local cache have to be configured when using this method.
   *
   * @category Asset
   * @param bitmapAssetDescs A list of bitmap assets to download.
   */
  async downloadBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
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

    if (await localDesign.hasBitmapAsset(bitmapAssetDesc, options)) {
      return
    }

    const bitmapAssetStream = await apiDesign.getBitmapAssetStream(
      bitmapAssetDesc.name,
      options
    )
    return localDesign.saveBitmapAssetStream(
      bitmapAssetDesc,
      bitmapAssetStream,
      options
    )
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
  async saveOctopusFile(
    options: { filePath?: string | null; cancelToken?: CancelToken | null } = {}
  ): Promise<void> {
    const cancelToken = options.cancelToken || null

    const localDesign = await this._getLocalDesign({
      filePath: options.filePath || null,
      cancelToken,
    })
    const apiDesign = this._apiDesign

    const manifest = this.getManifest()
    await localDesign.saveManifest(manifest, { cancelToken })

    if (apiDesign) {
      await localDesign.saveApiDesignInfo(
        {
          apiRoot: apiDesign.getApiRoot(),
          designId: apiDesign.id,
        },
        { cancelToken }
      )
    }

    await Promise.all(
      this.getArtboards().map(async (artboard) => {
        const artboardOctopus = await artboard.getContent({ cancelToken })
        if (!artboardOctopus) {
          throw new Error('Artboard octopus not available')
        }

        await localDesign.saveArtboardContent(artboard.id, artboardOctopus, {
          cancelToken,
        })
      })
    )

    await this.setLocalDesign(localDesign, { cancelToken })

    const bitmapAssetDescs = await this.getBitmapAssets({ cancelToken })
    await this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken })
  }

  /**
   * Downloads the design file of the specified format produced by a server-side design file export.
   *
   * In case no such export has been done for the design yet, a new export is initiated and the resulting design file is downloaded.
   *
   * @category Serialization
   * @param filePath An absolute path to which to save the design file or a path relative to the current working directory.
   */
  async exportDesignFile(
    filePath: string,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<void> {
    const format = getDesignFormatByFileName(filePath)
    if (!format) {
      throw new Error('Unknown target design file format')
    }
    if (format !== 'sketch') {
      throw new Error('Unsupported target design file format')
    }

    const designExport = await this.getExportToFormat(format, options)
    return this._sdk.saveDesignFileStream(
      filePath,
      await designExport.getResultStream(options),
      options
    )
  }

  private async _getLocalDesign(params: {
    filePath: string | null
    cancelToken?: CancelToken | null
  }): Promise<LocalDesign> {
    const cancelToken = params.cancelToken || null
    const localDesign = this._localDesign

    if (!params.filePath) {
      if (!localDesign) {
        throw new Error('The design is not configured to be a local file')
      }

      return localDesign
    }

    if (localDesign) {
      await localDesign.saveAs(params.filePath, { cancelToken })
      return localDesign
    }

    const targetDesignFacade = await this._sdk.openOctopusFile(
      params.filePath,
      { cancelToken }
    )
    const targetLocalDesign = targetDesignFacade.getLocalDesign()
    if (!targetLocalDesign) {
      throw new Error('Target location is not available')
    }

    return targetLocalDesign
  }

  /** @internal */
  addDesignExport(designExport: DesignExportFacade) {
    const format = designExport.resultFormat
    this._designExports.set(format, designExport)
  }

  /**
   * Returns info about a design file of the specified format produced by a server-side design file format export.
   *
   * In case no such export has been done for the design yet, a new export is initiated and the resulting design file info is then returned.
   *
   * @category Serialization
   * @param format The format to which the design should be exported.
   */
  async getExportToFormat(
    format: DesignExportTargetFormatEnum,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignExportFacade> {
    const prevExport = this._designExports.get(format)
    if (prevExport) {
      return prevExport
    }

    const apiDesign = this._apiDesign
    if (!apiDesign) {
      throw new Error('The API is not configured, cannot export the design')
    }

    const designExport = await apiDesign.exportDesign({
      format,
      cancelToken: options.cancelToken || null,
    })
    const designExportFacade = new DesignExportFacade(designExport, {
      sdk: this._sdk,
    })
    this._designExports.set(format, designExportFacade)

    return designExportFacade
  }

  private async _loadRenderingDesignPage(
    pageId: string,
    params: {
      loadAssets: boolean
      cancelToken?: CancelToken | null
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
      cancelToken?: CancelToken | null
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

    const cancelToken = params.cancelToken || null

    await artboard.load({ cancelToken })

    const octopusFilename = await localDesign.getArtboardContentFilename(
      artboardId,
      { cancelToken }
    )
    if (!octopusFilename) {
      throw new Error('The artboard octopus location is not available')
    }

    const desc = await renderingDesign.loadArtboard(artboardId, {
      octopusFilename,
      symbolId: artboard.componentId,
      pageId: artboard.pageId,
    })
    cancelToken?.throwIfCancelled()

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
      cancelToken?.throwIfCancelled()

      const fonts = await artboard.getFonts()
      cancelToken?.throwIfCancelled()

      await Promise.all([
        this.downloadBitmapAssets(bitmapAssetDescs, { cancelToken }),
        this._loadFontsToRendering(fonts, { cancelToken }),
      ])
    }

    await renderingDesign.markArtboardAsReady(artboardId)
    cancelToken?.throwIfCancelled()

    if (!renderingDesign.isArtboardReady(artboardId)) {
      throw new Error('The artboard failed to be loaded to a ready state')
    }
  }

  private async _loadFontsToRendering(
    fonts: Array<{ fontPostScriptName: string }>,
    options: {
      cancelToken?: CancelToken | null
    }
  ) {
    const fontSource = this._fontSource
    if (!fontSource) {
      return
    }

    const renderingDesign = this._renderingDesign
    if (!renderingDesign) {
      throw new Error('The rendering engine is not configured')
    }

    await sequence(fonts, async ({ fontPostScriptName }) => {
      const fontMatch = await fontSource.resolveFontPath(
        fontPostScriptName,
        options
      )
      if (fontMatch) {
        await renderingDesign.loadFont(
          fontPostScriptName,
          fontMatch.fontFilename,
          { facePostscriptName: fontMatch.fontPostscriptName }
        )
        options.cancelToken?.throwIfCancelled()
      } else {
        this._console.warn(`Font not available: ${fontPostScriptName}`)
      }
    })
  }

  private _resolveVisibleArtboardLayerSubtree(
    artboardId: ArtboardId,
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<Array<LayerId>> {
    const artboard = this.getArtboardById(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.resolveVisibleLayerSubtree(layerId, options)
  }
}
