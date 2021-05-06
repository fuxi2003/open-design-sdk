import { inspect } from 'util'
import { enumerablizeWithPrototypeGetters } from './utils/object'

import { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import { LayerFacade } from './layer-facade'

import type { CancelToken } from '@avocode/cancel-token'
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
import type { BlendingMode, Bounds, LayerBounds } from '@opendesign/rendering'
import type { DesignFacade } from './design-facade'
import type { FontDescriptor } from './layer-facade'
import type { BitmapAssetDescriptor } from './local/local-design'
import type { PageFacade } from './page-facade'

// HACK: This makes TypeDoc not inline the whole type in the documentation.
interface ArtboardOctopusData extends ArtboardOctopusDataType {}

export type LayerAttributesConfig = {
  /** Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied. */
  includeEffects?: boolean
  /** Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results. */
  clip?: boolean
  /** Whether to render the component background from the main/master component. By default, the configuration from the main/master component is used. */
  includeComponentBackground?: boolean
  /** The blending mode to use for rendering the layer instead of its default blending mode. */
  blendingMode?: BlendingMode
  /** The opacity to use for the layer instead of its default opacity. */
  opacity?: number
}

export class ArtboardFacade {
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

    enumerablizeWithPrototypeGetters(this)
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
   * See the [Octopus Format](https://opendesign.dev/docs/octopus-format) documentation page for more info.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Data
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const artboardContent = await artboards.getContent()
   * ```
   */
  async getContent(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<ArtboardOctopusData> {
    const artboardEntity = this._artboardEntity
    if (!artboardEntity.isLoaded()) {
      await this._designFacade.loadArtboard(this.id, options)
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
      ...this,
    }
  }

  /** @internal */
  setArtboardEntity(artboardEntity: IArtboard) {
    this._artboardEntity = artboardEntity
  }

  /** @internal */
  getArtboardEntity(): IArtboard {
    return this._artboardEntity
  }

  /**
   * Returns the design object associated with the artboard object.
   * @category Reference
   *
   * @example
   * ```typescript
   * const design = artboard.getDesign()
   * ```
   */
  getDesign(): DesignFacade {
    return this._designFacade
  }

  /** @internal */
  getManifest(): ArtboardManifestData {
    return this._artboardEntity.getManifest()
  }

  /** @internal */
  setManifest(nextManifestData: ArtboardManifestData) {
    return this._artboardEntity.setManifest(nextManifestData)
  }

  /**
   * Returns whether the artboard content is loaded in memory from the API or a local cache.
   *
   * @category Status
   *
   * @example
   * ```typescript
   * const design = await sdk.fetchDesignById('<DESIGN_ID>')
   * const artboard = design.getArtboardById('<ARTBOARD_ID>')
   * console.log(artboard.isLoaded()) // false
   *
   * const layerA = await artboard.findLayerById('a')
   * console.log(artboard.isLoaded()) // true
   * ```
   */
  isLoaded() {
    return this._artboardEntity.isLoaded()
  }

  /** @internal */
  async load(options: { cancelToken?: CancelToken | null }): Promise<void> {
    if (this.isLoaded()) {
      return
    }

    await this._designFacade.loadArtboard(this.id, options)
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
   *
   * @category Reference
   *
   * @example
   * ```typescript
   * const page = artboard.getPage()
   * ```
   */
  getPage(): PageFacade | null {
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
   *
   * @category Data
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const artboardBounds = await artboard.getBounds()
   * ```
   */
  async getBounds(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Bounds> {
    await this.load(options)

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // All bitmap assets from the artboard
   * const bitmapAssetDescs = await artboard.getBitmapAssets()
   *
   * // Bitmap assets excluding pre-renredered bitmaps from the artboard
   * const bitmapAssetDescs = await artboard.getBitmapAssets({
   *   includePrerendered: false,
   * })
   * ```
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
    const { cancelToken = null, ...bitmapOptions } = options

    await this.load({ cancelToken })

    return this._artboardEntity.getBitmapAssets(bitmapOptions)
  }

  /**
   * Returns a list of fonts used by layers the artboard (optionally down to a specific nesting level).
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. `0` also means "no limit"; `1` means only root layers in the artboard should be searched.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // All fonts from the artboard
   * const fontDescs = await artboard.getFonts()
   * ```
   */
  async getFonts(
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<
    Array<
      FontDescriptor & { artboardLayerIds: Record<ArtboardId, Array<LayerId>> }
    >
  > {
    const { cancelToken = null, ...fontOptions } = options

    await this.load({ cancelToken })

    return this._artboardEntity.getFonts(fontOptions)
  }

  /**
   * Returns the background color of the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Data
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const color = await artboard.getBackgroundColor()
   * if (color) {
   *   console.log(color) // { r: number, g: number, b: number, a: number }
   * }
   * ```
   */
  async getBackgroundColor(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<RgbaColor | null> {
    await this.load(options)

    return this._artboardEntity.getBackgroundColor()
  }

  /**
   * Returns a collection of the first-level (root) layers objects within the artboard.
   *
   * This method internally triggers loading of the artboard content. In case the artboard is uncached, it is downloaded (and cached when the local cache is configured). The API has to be configured when working with an uncached artboard.
   *
   * @category Layer Lookup
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const rootLayers = await artboard.getRootLayers()
   * ```
   */
  async getRootLayers(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    await this.load(options)

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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // All layers (from all nesting levels)
   * const allLayers = await artboard.getFlattenedLayers()
   *
   * // Layers from the first three nesting levels (root layers + 2 levels)
   * const layers = await artboard.getFlattenedLayers({ depth: 3 })
   * ```
   */
  async getFlattenedLayers(
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerCollection = this._artboardEntity.getFlattenedLayers(
      layerOptions
    )
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const layerA = await artboard.getLayerById('a')
   *
   * // Multiple layers
   * const [ layerA, layerB, layerC ] = await Promise.all([
   *   artboard.getLayerById('a'),
   *   artboard.getLayerById('b'),
   *   artboard.getLayerById('c'),
   * ])
   * ```
   */
  async getLayerById(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    await this.load(options)

    return this.getLayerFacadeById(layerId)
  }

  /** @internal */
  getLayerFacadeById(layerId: LayerId): LayerFacade | null {
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // Layer by name
   * const layer = await artboard.findLayer({ name: 'Share icon' })
   *
   * // Text layer by content
   * const layer = await artboard.findLayer({
   *   type: 'textLayer',
   *   text: /click to dismiss/i,
   * })
   *
   * // With timeout
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await artboard.findLayer(
   *   { name: 'Share icon' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayer(
    selector: LayerSelector,
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerEntity = this._artboardEntity.findLayer(selector, layerOptions)
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // Layer by name
   * const layer = await artboard.findLayers({ name: 'Share icon' })
   *
   * // Invisible text layers
   * const layer = await artboard.findLayers({
   *   type: 'textLayer',
   *   visible: false,
   * })
   *
   * // With timeout
   * const { cancel, token } = createCancelToken()
   * setTimeout(cancel, 5000) // Throw an OperationCancelled error in 5 seconds.
   * const layer = await artboard.findLayers(
   *   { name: 'Share icon' },
   *   { cancelToken: token }
   * )
   * ```
   */
  async findLayers(
    selector: LayerSelector,
    options: {
      depth?: number
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<DesignLayerCollectionFacade> {
    const { cancelToken = null, ...layerOptions } = options

    await this.load({ cancelToken })

    const layerCollection = this._artboardEntity.findLayers(
      selector,
      layerOptions
    )
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   * @returns The depth where the layer is located within the layer tree of the artboard. Root layers have the depth of 1.
   *
   * @example
   * ```typescript
   * const depth = await artboard.getLayerDepth('<ARTBOARD_ID>', '<LAYER_ID>')
   * ```
   */
  async getLayerDepth(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<number | null> {
    await this.load(options)

    return this._artboardEntity.getLayerDepth(layerId)
  }

  /**
   * Returns whether the artboard represends a (main/master) component.
   * @category Data
   *
   * @example
   * ```typescript
   * const isComponentArtboard = artboard.isComponent()
   * ```
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created image file is not deleted when cancelled during actual rendering). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // With default options (1x, whole artboard area)
   * await artboard.renderToFile('./rendered/artboard.png')
   *
   * // With custom scale and crop
   * await artboard.renderToFile('./rendered/artboard.png', {
   *   scale: 4,
   *   // The result is going to have the dimensions of 400x200 due to the 4x scale.
   *   bounds: { left: 100, top: 0, width: 100, height: 50 },
   * })
   * ```
   */
  renderToFile(
    filePath: string,
    options: {
      scale?: number
      cancelToken?: CancelToken | null
    } = {}
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
   * @param options.blendingMode The blending mode to use for rendering the layer instead of its default blending mode.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeComponentBackground Whether to render the component background from the main/master component. By default, the configuration from the main/master component is used. Note that this configuration has no effect when the artboard background is not included via explicit `includeComponentBackground=true` nor the main/master component configuration as there is nothing with which to blend the layer.
   * @param options.includeEffects Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created image file is not deleted when cancelled during actual rendering). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // With default options (1x, whole layer area)
   * await artboard.renderLayerToFile(
   *   '<LAYER_ID>',
   *   './rendered/layer.png'
   * )
   *
   * // With custom scale and crop and using the component background color
   * await artboard.renderLayerToFile(
   *   '<LAYER_ID>',
   *   './rendered/layer.png',
   *   {
   *     scale: 2,
   *     // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *     bounds: { left: 100, top: 0, width: 100, height: 50 },
   *     includeComponentBackground: true,
   *   }
   * )
   * ```
   */
  renderLayerToFile(
    layerId: LayerId,
    filePath: string,
    options: {
      includeEffects?: boolean
      clip?: boolean
      includeComponentBackground?: boolean
      blendingMode?: BlendingMode
      opacity?: number
      bounds?: Bounds
      scale?: number
      cancelToken?: CancelToken | null
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created image file is not deleted when cancelled during actual rendering). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // With default options (1x, whole combined layer area)
   * await artboard.renderLayersToFile(
   *   ['<LAYER1>', '<LAYER2>'],
   *   './rendered/layers.png'
   * )
   *
   * // With custom scale and crop and using the custom layer configuration
   * await artboard.renderLayersToFile(
   *   ['<LAYER1>', '<LAYER2>'],
   *   './rendered/layers.png',
   *   {
   *     scale: 2,
   *     // The result is going to have the dimensions of 400x200 due to the 2x scale.
   *     bounds: { left: 100, top: 0, width: 100, height: 50 },
   *     layerAttributes: {
   *       '<LAYER1>': { blendingMode: 'SOFT_LIGHT', includeComponentBackground: true },
   *       '<LAYER2>': { opacity: 0.6 },
   *     }
   *   }
   * )
   * ```
   */
  renderLayersToFile(
    layerIds: Array<LayerId>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
      cancelToken?: CancelToken | null
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
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const layerBounds = await artboard.getLayerBounds('<LAYER_ID>')
   * const boundsWithEffects = layerBounds.fullBounds
   * ```
   */
  getLayerBounds(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerBounds> {
    return this._designFacade.getArtboardLayerBounds(this.id, layerId, options)
  }

  /**
   * Returns the top-most layer located at the specified coordinates within the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param x The X coordinate in the coordinate system of the artboard where to look for a layer.
   * @param y The Y coordinate in the coordinate system of the artboard where to look for a layer.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * const layerId = await artboard.getLayerAtPosition(100, 200)
   * ```
   */
  getLayerAtPosition(
    x: number,
    y: number,
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerFacade | null> {
    return this._designFacade.getArtboardLayerAtPosition(this.id, x, y, options)
  }

  /**
   * Returns all layers located within the specified area of the the specified artboard.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Layer Lookup
   * @param bounds The area in the corrdinate system of the artboard where to look for layers.
   * @param options.partialOverlap Whether to also return layers which are only partially contained within the specified area.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   *
   * @example
   * ```typescript
   * // Layers fully contained in the area
   * const layerIds = await artboard.getLayersInArea(
   *   { left: 80, top: 150, width: 40, height: 30 }
   * )
   *
   * // Layers fully or partially contained in the area
   * const layerIds = await artboard.getLayersInArea(
   *   { left: 80, top: 150, width: 40, height: 30 },
   *   { partialOverlap: true }
   * )
   * ```
   */
  getLayersInArea(
    bounds: Bounds,
    options: {
      partialOverlap?: boolean
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<Array<LayerFacade>> {
    return this._designFacade.getArtboardLayersInArea(this.id, bounds, options)
  }

  /** @internal */
  async resolveVisibleLayerSubtree(
    layerId: LayerId,
    options: {
      cancelToken?: CancelToken | null
    }
  ): Promise<Array<LayerId>> {
    const layer = await this.getLayerById(layerId, options)
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
