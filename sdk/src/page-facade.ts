import { DesignLayerCollectionFacade } from './design-layer-collection-facade'

import type {
  ArtboardId,
  ArtboardSelector,
  ComponentId,
  IPage,
  LayerId,
  LayerSelector,
} from '@opendesign/octopus-reader'
import type { ArtboardFacade } from './artboard-facade'
import type { DesignFacade } from './design-facade'
import type { IPageFacade } from './types/page-facade.iface'

export class PageFacade implements IPageFacade {
  private _pageEntity: IPage
  private _designFacade: DesignFacade

  /** @internal */
  constructor(pageEntity: IPage, params: { designFacade: DesignFacade }) {
    this._pageEntity = pageEntity
    this._designFacade = params.designFacade
  }

  /**
   * The ID of the page.
   * @category Identification
   */
  get id() {
    return this._pageEntity.id
  }

  /**
   * The name of the artboard.
   * @category Identification
   */
  get name() {
    return this._pageEntity.name
  }

  /** @internal */
  setPageEntity(pageEntity: IPage) {
    this._pageEntity = pageEntity
  }

  /**
   * Returns the design object associated with the page object.
   * @category Reference
   */
  getDesign() {
    return this._designFacade
  }

  /**
   * Returns whether the page content and the content of all artboards the page contains are loaded in memory from the API, a local `.octopus` file or a local cache.
   * @category Status
   */
  isLoaded() {
    const artboards = this.getArtboards()
    return artboards.every((artboard) => {
      return artboard.isLoaded()
    })
  }

  /** @internal */
  async load(): Promise<void> {
    const artboards = this.getArtboards()
    await Promise.all(
      artboards.map((artboard) => {
        return artboard.load()
      })
    )
  }

  /**
   * Returns a list of artboard object the page contains. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   */
  getArtboards() {
    return this._designFacade.getPageArtboards(this.id)
  }

  /**
   * Returns a single artboard object. This can be used to work with the artboard contents. Artboards from other pages are not returned.
   *
   * @category Artboard Lookup
   * @param artboardId An artboard ID.
   */
  getArtboardById(artboardId: ArtboardId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardById(artboardId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  /**
   * Returns (main/master) component artboard objects the page contains. These can be used to work with artboard contents.
   *
   * @category Artboard Lookup
   */
  getComponentArtboards(): Array<ArtboardFacade> {
    return this.getArtboards().filter((artboard) => {
      return artboard.isComponent()
    })
  }

  /**
   * Returns an artboard object of a specific (main/master) component. These can be used to work with the artboard contents. Component artboards from other pages are not returned.
   *
   * @category Artboard Lookup
   * @param componentId A component ID.
   */
  getArtboardByComponentId(componentId: ComponentId): ArtboardFacade | null {
    const artboard = this._designFacade.getArtboardByComponentId(componentId)
    if (!artboard || artboard.pageId !== this.id) {
      return null
    }

    return artboard
  }

  /**
   * Looks up the first artboard object the page contains matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the result.
   */
  findArtboard(selector: ArtboardSelector): ArtboardFacade | null {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      return this.getArtboardById(selector['id'])
    }

    const matchingArtboards = this._designFacade.findArtboards(selector)

    return (
      matchingArtboards.find((artboard) => {
        return artboard.pageId === this.id
      }) || null
    )
  }

  /**
   * Looks up all artboard objects the page contains matching the provided criteria.
   *
   * @category Artboard Lookup
   * @param selector An artboard selector. All specified fields must be matched by the results.
   */
  findArtboards(selector: ArtboardSelector): Array<ArtboardFacade> {
    const selectorKeys = Object.keys(selector)
    if (
      selectorKeys.length === 1 &&
      selectorKeys[0] === 'id' &&
      typeof selector['id'] === 'string'
    ) {
      const artboard = this.getArtboardById(selector['id'])
      return artboard ? [artboard] : []
    }

    return this._designFacade.findArtboards(selector).filter((artboard) => {
      return artboard.pageId === this.id
    })
  }

  /**
   * Returns a list of bitmap assets used by layers in all artboards the page contains (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all artboards the page contains. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for bitmap asset usage. By default, all levels are searched.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  async getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ) {
    await this.load()

    return this._pageEntity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by layers in all artboards the page contains (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of all artboards the page contains. Uncached items are downloaded when online services are configured (and cached when offline services are configured).
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched.
   */
  async getFonts(options: { depth?: number } = {}) {
    await this.load()

    return this._pageEntity.getFonts(options)
  }

  async getFlattenedLayers(options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.getFlattenedLayers(options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  async findLayerById(layerId: LayerId, options: { depth?: number } = {}) {
    await this.load()

    const layerEntity = this._pageEntity.findLayerById(layerId, options)
    const layerFacade =
      layerEntity && layerEntity.artboardId
        ? this._designFacade.getArtboardLayerFacade(
            layerEntity.artboardId,
            layerEntity.id
          )
        : null

    return layerFacade
  }

  async findLayersById(layerId: LayerId, options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.findLayersById(layerId, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  async findLayer(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerEntity = this._pageEntity.findLayer(selector, options)
    const layerFacade =
      layerEntity && layerEntity.artboardId
        ? this._designFacade.getArtboardLayerFacade(
            layerEntity.artboardId,
            layerEntity.id
          )
        : null

    return layerFacade
  }

  async findLayers(selector: LayerSelector, options: { depth?: number } = {}) {
    await this.load()

    const layerCollection = this._pageEntity.findLayers(selector, options)
    return new DesignLayerCollectionFacade(layerCollection, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Renders all artboards from the page as a single image file.
   *
   * All visible layers from the artboards are included.
   *
   * Uncached items (artboard content and bitmap assets of rendered layers) are downloaded and cached.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param filePath The target location of the produced image file.
   */
  renderToFile(filePath: string) {
    return this._designFacade.renderPageToFile(this.id, filePath)
  }
}
