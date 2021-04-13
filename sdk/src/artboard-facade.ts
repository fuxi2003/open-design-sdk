import { inspect } from 'util'

import { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import { LayerFacade } from './layer-facade'

import type {
  ArtboardId,
  ArtboardManifestData,
  ArtboardOctopusData as ArtboardOctopusDataType,
  IArtboard,
  LayerId,
  LayerSelector,
  PageId,
  RgbaColor,
} from '@opendesign/octopus-reader'
import type { BlendingMode, Bounds } from '@opendesign/rendering'
import type {
  FontDescriptor,
  IArtboardFacade,
} from './types/artboard-facade.iface'
import type { DesignFacade } from './design-facade'
import type { BitmapAssetDescriptor } from './types/local-design.iface'

// HACK: This makes TypeDoc not inline the whole type in the documentation.
interface ArtboardOctopusData extends ArtboardOctopusDataType {}

export type LayerAttributesConfig = {
  /** Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied. */
  includeEffects?: boolean
  /** Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results. */
  clip?: boolean
  /** Whether to render the artboard background below the layer. By default, the background is not included. */
  includeArtboardBackground?: boolean
  /** The blending mode to use for rendering the layer instead of its default blending mode. */
  blendingMode?: BlendingMode
  /** The opacity to use for the layer instead of its default opacity. */
  opacity?: number
}

export class ArtboardFacade implements IArtboardFacade {
  private _artboardEntity: IArtboard
  private _designFacade: DesignFacade

  private _layerFacades: Map<LayerId, LayerFacade> = new Map()

  /** @internal */
  constructor(
    artboardEntity: IArtboard,
    params: { designFacade: DesignFacade }
  ) {
    this._artboardEntity = artboardEntity
    this._designFacade = params.designFacade
  }

  /**
   * The ID of the artboard.
   * @category Identification
   */
  get id() {
    return this._artboardEntity.id
  }

  /**
   * Returns the content of the artboard in the form of an "artboard octopus" document.
   *
   * This data includes the list of layers, the artboard position and size as well as styles used in the artboard.
   *
   * See the [Octopus Format](https://opendesign.avocode.com/docs/octopus-format) documentation page for more info.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Data
   */
  async getContent(): Promise<ArtboardOctopusData> {
    const artboardEntity = this._artboardEntity
    if (!artboardEntity.isLoaded()) {
      await this._designFacade.loadArtboard(this.id)
    }

    const octopus = artboardEntity.getOctopus()
    if (!octopus) {
      throw new Error('The artboard octopus is not available')
    }

    return octopus
  }

  /**
   * The ID of the page in which the artboard is placed.
   * @category Reference
   */
  get pageId() {
    return this._artboardEntity.pageId
  }

  /**
   * The ID of the component this artboard represents.
   * @category Reference
   */
  get componentId() {
    return this._artboardEntity.componentId
  }

  /**
   * The name of the artboard.
   * @category Identification
   */
  get name() {
    return this._artboardEntity.name
  }

  /** @internal */
  toString() {
    const artboardInfo = this.toJSON()
    return `Artboard ${inspect(artboardInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return {
      id: this.id,
      pageId: this.pageId,
      componentId: this.componentId,
      name: this.name,
    }
  }

  /** @internal */
  setArtboardEntity(artboardEntity: IArtboard) {
    this._artboardEntity = artboardEntity
  }

  /** @internal */
  getArtboardEntity() {
    return this._artboardEntity
  }

  /**
   * Returns the design object associated with the artboard object.
   * @category Reference
   */
  getDesign() {
    return this._designFacade
  }

  /** @internal */
  getManifest() {
    return this._artboardEntity.getManifest()
  }

  /** @internal */
  setManifest(nextManifestData: ArtboardManifestData) {
    return this._artboardEntity.setManifest(nextManifestData)
  }

  /**
   * Returns whether the artboard content is loaded in memory from the API or a local cache.
   * @category Status
   */
  isLoaded() {
    return this._artboardEntity.isLoaded()
  }

  /** @internal */
  async load(): Promise<void> {
    if (this.isLoaded()) {
      return
    }

    await this._designFacade.loadArtboard(this.id)
  }

  /**
   * Releases data related to the artboard from memory.
   * @category Status
   */
  unload() {
    return this._designFacade.unloadArtboard(this.id)
  }

  /**
   * Returns the page object associated with the artboard object.
   * @category Reference
   */
  getPage() {
    const pageId = this.pageId
    return pageId ? this._designFacade.getPageById(pageId) : null
  }

  /** @internal */
  setPage(nextPageId: PageId) {
    this._artboardEntity.setPage(nextPageId)
  }

  /** @internal */
  unassignFromPage() {
    this._artboardEntity.unassignFromPage()
  }

  /**
   * Returns the dimensions of the artboard and its position within the coordinate system of the design/page.
   * @category Data
   */
  async getBounds(): Promise<Bounds> {
    await this.load()

    const bounds = this._artboardEntity.getBounds()
    if (!bounds) {
      throw new Error('Artboard bounds are not available')
    }

    return bounds
  }

  /**
   * Returns a list of bitmap assets used by layers in the artboard (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in the artboard should be searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  async getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ): Promise<
    Array<
      BitmapAssetDescriptor & {
        artboardLayerIds: Record<ArtboardId, Array<LayerId>>
      }
    >
  > {
    await this.load()

    return this._artboardEntity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by layers the artboard (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in the artboard should be searched.
   */
  async getFonts(
    options: { depth?: number } = {}
  ): Promise<Array<FontDescriptor>> {
    await this.load()

    return this._artboardEntity.getFonts(options)
  }

  /**
   * Returns the background color of the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Data
   */
  async getBackgroundColor(): Promise<RgbaColor | null> {
    await this.load()

    return this._artboardEntity.getBackgroundColor()
  }

  /**
   * Returns a collection of the first-level (root) layers objects within the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   */
  async getRootLayers() {
    await this.load()

    const layerCollection = this._artboardEntity.getRootLayers()
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns a collection of all layers from the artboard (optionally down to a specific nesting level).
   *
   * The produced collection can be queried further for narrowing down the search.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param options.depth The maximum nesting level of layers within the artboard to include in the collection. By default, all levels are included. `0` also means "no limit"; `1` means only root layers in the artboard should be included.
   */
  async getFlattenedLayers(options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._artboardEntity.getFlattenedLayers(options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the layer object from within the artboard which has the specified ID.
   *
   * Layer IDs are unique within individual artboards.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   */
  async getLayerById(layerId: LayerId) {
    await this.load()
    return this.getLayerFacadeById(layerId)
  }

  /** @internal */
  getLayerFacadeById(layerId: LayerId) {
    const prevLayerFacade = this._layerFacades.get(layerId)
    if (prevLayerFacade) {
      return prevLayerFacade
    }

    const nextLayerFacade = this._createLayerFacade(layerId)
    if (nextLayerFacade) {
      this._layerFacades.set(layerId, nextLayerFacade)
    }

    return nextLayerFacade
  }

  /**
   * Returns the first layer object from the artboard (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in the artboard should be searched.
   */
  async findLayer(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerEntity = this._artboardEntity.findLayer(selector, options)
    return layerEntity ? this.getLayerById(layerEntity.id) : null
  }

  /**
   * Returns a collection of all layer objects from the artboards (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in the artboard should be searched.
   */
  async findLayers(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._artboardEntity.findLayers(selector, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the nesting level at which the layer of the specified ID is contained within the layer tree of the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param layerId A layer ID.
   */
  async getLayerDepth(layerId: LayerId) {
    await this.load()

    return this._artboardEntity.getLayerDepth(layerId)
  }

  /**
   * Returns whether the artboard represends a (main/master) component.
   * @category Data
   */
  isComponent() {
    return this._artboardEntity.isComponent()
  }

  /**
   * Renders the artboard as an PNG image file.
   *
   * All visible layers from the artboard are included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param filePath The target location of the produced PNG image file.
   */
  renderToFile(
    filePath: string,
    options: { scale?: number } = {}
  ): Promise<void> {
    return this._designFacade.renderArtboardToFile(this.id, filePath, options)
  }

  /**
   * Renders the specified layer from the artboard as an PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
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
  renderLayerToFile(
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
    return this._designFacade.renderArtboardLayerToFile(
      this.id,
      layerId,
      filePath,
      options
    )
  }

  /**
   * Renders the specified layers from the artboard as a single PNG image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param layerIds The IDs of the artboard layers to render.
   * @param filePath The target location of the produced PNG image file.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.layerAttributes Layer-specific options to use for the rendering instead of the default values.
   */
  renderLayersToFile(
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    return this._designFacade.renderArtboardLayersToFile(
      this.id,
      layerIds,
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
   * @param layerId The ID of the artboard layer to inspect.
   */
  getLayerBounds(layerId: LayerId) {
    return this._designFacade.getArtboardLayerBounds(this.id, layerId)
  }

  /**
   * Returns the top-most layer located at the specified coordinates within the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param x The X coordinate in the coordinate system of the artboard where to look for a layer.
   * @param y The Y coordinate in the coordinate system of the artboard where to look for a layer.
   */
  getLayerAtPosition(x: number, y: number) {
    return this._designFacade.getArtboardLayerAtPosition(this.id, x, y)
  }

  /**
   * Returns all layers located within the specified area of the the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param bounds The area in the corrdinate system of the artboard where to look for layers.
   * @param options.partialOverlap Whether to also return layers which are only partially contained within the specified area.
   */
  getLayersInArea(bounds: Bounds, options: { partialOverlap?: boolean } = {}) {
    return this._designFacade.getArtboardLayersInArea(this.id, bounds, options)
  }

  /** @internal */
  async resolveVisibleLayerSubtree(layerId: LayerId): Promise<Array<LayerId>> {
    const layer = await this.getLayerById(layerId)
    if (!layer) {
      throw new Error('No such layer')
    }

    const visibleNestedLayerIds = layer
      .findNestedLayers({ visible: true })
      .map((nestedLayer) => nestedLayer.id)

    return [layer.id].concat(visibleNestedLayerIds)
  }

  private _createLayerFacade(layerId: LayerId): LayerFacade | null {
    const artboardEntity = this._artboardEntity
    const layerEntity = artboardEntity
      ? artboardEntity.getLayerById(layerId)
      : null

    return layerEntity
      ? new LayerFacade(layerEntity, { designFacade: this._designFacade })
      : null
  }
}
