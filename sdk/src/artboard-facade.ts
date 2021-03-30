import { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import { LayerFacade } from './layer-facade'

import type {
  ArtboardManifestData,
  ArtboardOctopusData as ArtboardOctopusDataType,
  IArtboard,
  LayerId,
  LayerSelector,
  PageId,
  RgbaColor,
} from '@opendesign/octopus-reader'
import type { DesignFacade } from './design-facade'
import type { IArtboardFacade } from './types/artboard-facade.iface'

// HACK: This makes TypeDoc not inline the whole type in the documentation.
interface ArtboardOctopusData extends ArtboardOctopusDataType {}

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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
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
   * Returns whether the artboard content is loaded in memory from the API, a local `.octopus` file or a local cache.
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
   * Returns a list of bitmap assets used by layers in the artboard (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  async getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ) {
    await this.load()

    return this._artboardEntity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by layers the artboard (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched.
   */
  async getFonts(options: { depth?: number } = {}) {
    await this.load()

    return this._artboardEntity.getFonts(options)
  }

  /**
   * Returns the background color of the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param options.depth The maximum nesting level of layers within the artboard to include in the collection. By default, all levels are included.
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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched.
   */
  async findLayer(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerEntity = this._artboardEntity.findLayer(selector, options)
    return layerEntity ? this.getLayerById(layerEntity.id) : null
  }

  /**
   * Returns a collection of all layer objects from the artboards (optionally down to a specific nesting level) matching the specified criteria.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within page and artboard layers to search. By default, all levels are searched.
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
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when offline services are configured). Online services have to be configured when working with an uncached artboard.
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
   * Renders the artboard as an image file.
   *
   * All visible layers from the artboard are included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param relPath The target location of the produced image file.
   */
  renderToFile(relPath: string): Promise<void> {
    return this._designFacade.renderArtboardToFile(this.id, relPath)
  }

  /**
   * Renders the specified layer from the artboard as an image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param layerId The ID of the artboard layer to render.
   * @param relPath The target location of the produced image file.
   */
  renderLayerToFile(layerId: LayerId, relPath: string): Promise<void> {
    return this._designFacade.renderArtboardLayerToFile(
      this.id,
      layerId,
      relPath
    )
  }

  /**
   * Renders the specified layers from the artboard as a single image file.
   *
   * In case of group layers, all visible nested layers are also included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param layerIds The IDs of the artboard layers to render.
   * @param relPath The target location of the produced image file.
   */
  renderLayersToFile(layerIds: Array<LayerId>, relPath: string): Promise<void> {
    return this._designFacade.renderArtboardLayersToFile(
      this.id,
      layerIds,
      relPath
    )
  }

  /**
   * Returns various bounds of the specified layer.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Data
   * @param layerId The ID of the artboard layer to inspect.
   */
  getLayerBounds(layerId: LayerId) {
    return this._designFacade.getArtboardLayerBounds(this.id, layerId)
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
