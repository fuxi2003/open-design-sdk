import { inspect } from 'util'
import { enumerablizeWithPrototypeGetters } from './utils/object'

import { DesignLayerCollectionFacade } from './design-layer-collection-facade'

import type { CancelToken } from '@avocode/cancel-token'
import type {
  IBitmap,
  IBitmapMask,
  IEffects,
  ILayer,
  IShape,
  IText,
  LayerId,
  LayerOctopusData as LayerOctopusDataType,
  LayerSelector,
  TextFontDescriptor as FontDescriptor,
} from '@opendesign/octopus-reader'
import type { BlendingMode, Bounds, LayerBounds } from '@opendesign/rendering'
import type { ArtboardFacade } from './artboard-facade'
import type { DesignFacade } from './design-facade'
import type { BitmapAssetDescriptor } from './local/local-design'

export type { FontDescriptor }

// HACK: This makes TypeDoc not inline the whole type in the documentation.
interface LayerOctopusData extends LayerOctopusDataType {}

export class LayerFacade {
  private _layerEntity: ILayer
  private _designFacade: DesignFacade

  /** @internal */
  constructor(layerEntity: ILayer, params: { designFacade: DesignFacade }) {
    this._layerEntity = layerEntity
    this._designFacade = params.designFacade

    enumerablizeWithPrototypeGetters(this)
  }

  /**
   * The ID of the layer.
   * @category Identification
   */
  get id() {
    return this._layerEntity.id
  }

  /**
   * The name of the layer.
   * @category Data
   */
  get name() {
    return this._layerEntity.name
  }

  /**
   * The type of the layer.
   * @category Data
   */
  get type() {
    return this._layerEntity.type
  }

  /**
   * Octopus data of the layer.
   *
   * See the [Octopus Format](https://opendesign.avocode.com/docs/octopus-format) documentation page for more info.
   *
   * @category Data
   */
  get octopus(): LayerOctopusData {
    return this._layerEntity.octopus
  }

  /**
   * The ID of the artboard in which the layer is placed.
   * @category Reference
   */
  get artboardId() {
    return this._layerEntity.artboardId
  }

  /** @internal */
  toString() {
    const layerInfo = this.toJSON()
    return `Layer ${inspect(layerInfo)}`
  }

  /** @internal */
  [inspect.custom]() {
    return this.toString()
  }

  /** @internal */
  toJSON() {
    return { ...this }
  }

  /**
   * Returns the artboard object associated with the layer object.
   * @category Reference
   */
  getArtboard(): ArtboardFacade | null {
    const artboardId = this.artboardId
    return artboardId ? this._designFacade.getArtboardById(artboardId) : null
  }

  /** @internal */
  getLayerEntity(): ILayer {
    return this._layerEntity
  }

  /**
   * Returns whether the layer is located at the first level within the layer tree of the artboard (i.e. it does not have a parent layer).
   * @category Layer Context
   */
  isRootLayer(): boolean {
    return this._layerEntity.isRootLayer()
  }

  /**
   * The nesting level at which the layer is contained within the layer tree of the artboard.
   *
   * Root (first-level) layers have depth of 1.
   *
   * @category Layer Context
   */
  get depth(): number {
    return this._layerEntity.getDepth()
  }

  /**
   * Returns the immediate parent layer object which contains the layer.
   *
   * @category Layer Lookup
   */
  getParentLayer(): LayerFacade | null {
    const layerEntity = this._layerEntity.getParentLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { designFacade: this._designFacade })
      : null
  }

  /**
   * Returns all parent layer objects which contain the layer sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  getParentLayers(): DesignLayerCollectionFacade {
    const layerEntities = this._layerEntity.getParentLayers()
    return new DesignLayerCollectionFacade(layerEntities, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the IDs of all parent layers which contain the layer sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  getParentLayerIds(): Array<LayerId> {
    return this._layerEntity.getParentLayerIds()
  }

  /**
   * Returns the deepest parent layer objects which contains the layer and matches the provided criteria.
   *
   * @category Layer Lookup
   */
  findParentLayer(selector: LayerSelector): LayerFacade | null {
    const layerEntity = this._layerEntity.findParentLayer(selector)
    return layerEntity
      ? new LayerFacade(layerEntity, { designFacade: this._designFacade })
      : null
  }

  /**
   * Returns all parent layer objects which contain the layer and match the provided criteria sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  findParentLayers(selector: LayerSelector): DesignLayerCollectionFacade {
    const layerEntities = this._layerEntity.findParentLayers(selector)
    return new DesignLayerCollectionFacade(layerEntities, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns whether there are any layers nested within the layer (i.e. the layer is the parent layer of other layers).
   *
   * This usually applies to group layers and expanded/inlined component layers. Empty group layers return `false`.
   *
   * @category Layer Lookup
   */
  hasNestedLayers(): boolean {
    return this._layerEntity.hasNestedLayers()
  }

  /**
   * Returns a collection of layer objects nested within the layer (i.e. the layer is either the immediate parent layer of other layers or one of their parent layers), optionally down to a specific layer nesting level.
   *
   * This usually applies to group layers and expanded/inlined component layers. Empty group layers return an empty nested layer collection.
   *
   * @category Layer Lookup
   * @param options.depth The maximum nesting level within the layer to include in the collection. By default, only the immediate nesting level is included. `Infinity` can be specified to get all nesting levels.
   */
  getNestedLayers(
    options: { depth?: number } = {}
  ): DesignLayerCollectionFacade {
    const layerEntities = this._layerEntity.getNestedLayers(options)
    return new DesignLayerCollectionFacade(layerEntities, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns the first layer object nested within the layer (i.e. the layer is either the immediate parent layer of other layers or one of their parent layers), optionally down to a specific layer nesting level, which matches the specific criteria.
   *
   * Note that the subtree is walked in *document order*, not level by level, which means that nested layers of a layer are searched before searching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layer to search. By default, all levels are searched. `0` also means "no limit"; `1` means only layers nested directly in the layer should be searched.
   */
  findNestedLayer(
    selector: LayerSelector,
    options: { depth?: number } = {}
  ): LayerFacade | null {
    const layerEntity = this._layerEntity.findNestedLayer(selector, options)
    return layerEntity
      ? new LayerFacade(layerEntity, { designFacade: this._designFacade })
      : null
  }

  /**
   * Returns a collection of layer objects nested within the layer (i.e. the layer is either the immediate parent layer of other layers or one of their parent layers), optionally down to a specific layer nesting level, which match the specific criteria.
   *
   * Note that the results are sorted in *document order*, not level by level, which means that matching nested layers of a layer are included before matching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layer to search. By default, all levels are searched. `0` also means "no limit"; `1` means only layers nested directly in the layer should be searched.
   */
  findNestedLayers(
    selector: LayerSelector,
    options: { depth?: number } = {}
  ): DesignLayerCollectionFacade {
    const layerEntities = this._layerEntity.findNestedLayers(selector, options)
    return new DesignLayerCollectionFacade(layerEntities, {
      designFacade: this._designFacade,
    })
  }

  /**
   * Returns whether the layer is masked/clipped by another layer.
   *
   * @category Layer Context
   */
  isMasked(): boolean {
    return this._layerEntity.isMasked()
  }

  /**
   * Returns the layer which masks/clips the layer if there is one.
   *
   * @category Layer Lookup
   */
  getMaskLayer(): LayerFacade | null {
    const layerEntity = this._layerEntity.getMaskLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { designFacade: this._designFacade })
      : null
  }

  /**
   * Returns the ID of the layer which masks/clips the layer if there is one.
   *
   * @category Layer Lookup
   */
  getMaskLayerId(): LayerId | null {
    return this._layerEntity.getMaskLayerId()
  }

  /**
   * Returns whether the layer represents an "inline artboard" (which is a feature used in Photoshop design files only).
   *
   * @category Layer Context
   */
  isInlineArtboard(): boolean {
    return this._layerEntity.isInlineArtboard()
  }

  /**
   * Returns whether the layer is a component (instance of a main/master component).
   *
   * @category Layer Context
   */
  isComponentInstance(): boolean {
    return this._layerEntity.isComponentInstance()
  }

  /**
   * Returns whether there are any overrides on this component (instance) which override main/master component values.
   *
   * The specific overrides can be obtained from the octopus data (`octopus.overrides`).
   *
   * Layers which do not represent a component (instance), see {@link LayerFacade.isComponentInstance}, return `false`.
   *
   * @category Layer Context
   */
  hasComponentOverrides(): boolean {
    return this._layerEntity.hasComponentOverrides()
  }

  /**
   * Returns the artboard which represents the main/master component of which this layer is and instance.
   *
   * Nothing is returned from layers which do not represent a component (instance), see {@link LayerFacade.isComponentInstance}.
   *
   * @category Reference
   */
  getComponentArtboard(): ArtboardFacade | null {
    const componentArtboardEntity = this._layerEntity.getComponentArtboard()
    return componentArtboardEntity
      ? this._designFacade.getArtboardById(componentArtboardEntity.id)
      : null
  }

  /**
   * Returns a list of bitmap assets used by the layer and layers nested within the layer (optionally down to a specific nesting level).
   *
   * Note that this method aggregates results of the more granular bitmap asset-related methods of {@link LayerFacade.getBitmap}, {@link LayerFacade.getBitmapMask} and pattern fill bitmap assets discoverable via {@link LayerFacade.getEffects}.
   *
   * @category Asset
   * @param options.depth The maximum nesting level within the layer to search for bitmap asset usage. By default, all levels are searched. Specifying the depth of `0` leads to nested layer bitmap assets being omitted altogether.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ): Array<BitmapAssetDescriptor & { layerIds: Array<LayerId> }> {
    return this._layerEntity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by the layer and layers nested within the layer (optionally down to a specific nesting level).
   *
   * @category Asset
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. Specifying the depth of `0` leads to fonts used by nested layers being omitted altogether.
   */
  getFonts(
    options: { depth?: number } = {}
  ): Array<FontDescriptor & { layerIds: Array<LayerId> }> {
    return this._layerEntity.getFonts(options)
  }

  /**
   * Returns the bitmap asset of the layer if there is one.
   *
   * @category Asset
   */
  getBitmap(): IBitmap | null {
    return (
      this._layerEntity.getBitmap() || this._layerEntity.getPrerenderedBitmap()
    )
  }

  /**
   * Returns the bitmap mask of the layer if there is one.
   *
   * @category Asset
   */
  getBitmapMask(): IBitmapMask | null {
    return this._layerEntity.getBitmapMask()
  }

  /**
   * Returns whether the bitmap asset is "pre-rendered".
   *
   * Only non-bitmap layers (`type!=layer`) have prerendered assets. Bitmap assets of bitmap layers are not considered "pre-rendered".
   *
   * @category Asset
   */
  isBitmapPrerendered(): boolean {
    return Boolean(this._layerEntity.getPrerenderedBitmap())
  }

  /**
   * Returns a vector shape object of the layer if there is one.
   *
   * Only shape layers (`type=shapeLayer`) return shape objects here.
   *
   * @internal
   * @category Data
   */
  getShape(): IShape | null {
    return this._layerEntity.getShape()
  }

  /**
   * Returns a text object of the layer if there is one.
   *
   * Only text layers (`type=textLayer`) return text objects here.
   *
   * @category Data
   */
  getText(): IText | null {
    return this._layerEntity.getText()
  }

  /**
   * Returns a layer effect aggregation object.
   *
   * Any layer can have various effects (such as shadows, borders or fills) applied to it.
   *
   * Note that there can be bitmap assets in case of pattern fill effects being applied.
   *
   * @category Data
   */
  getEffects(): IEffects {
    return this._layerEntity.getEffects()
  }

  /**
   * Renders the layer as an PNG image file.
   *
   * In case the layer is a group layer, all visible nested layers are also included.
   *
   * Uncached items (bitmap assets of rendered layers) are downloaded and cached.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Rendering
   * @param filePath The target location of the produced PNG image file.
   * @param options.blendingMode The blending mode to use for rendering the layer instead of its default blending mode. Note that this configuration has no effect when the artboard background is not included via `includeArtboardBackground=true`.
   * @param options.clip Whether to apply clipping by a mask layer if any such mask is set for the layer (see {@link LayerFacade.isMasked}). Clipping is disabled by default. Setting this flag for layers which do not have a mask layer set has no effect on the results.
   * @param options.includeArtboardBackground Whether to render the artboard background below the layer. By default, the background is not included.
   * @param options.includeEffects Whether to apply layer effects of the layer. Rendering of effects of nested layers is not affected. By defaults, effects of the layer are applied.
   * @param options.opacity The opacity to use for the layer instead of its default opacity.
   * @param options.bounds The area to include. This can be used to either crop or expand (add empty space to) the default layer area.
   * @param options.scale The scale (zoom) factor to use for rendering instead of the default 1x factor.
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the created image file is not deleted when cancelled during actual rendering). A cancellation token can be created via {@link createCancelToken}.
   */
  async renderToFile(
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
    const artboardId = this.artboardId
    if (!artboardId) {
      throw new Error('Detached layers cannot be rendered')
    }

    return this._designFacade.renderArtboardLayerToFile(
      artboardId,
      this.id,
      filePath,
      options
    )
  }

  /**
   * Returns various bounds the layer.
   *
   * The rendering engine and the local cache have to be configured when using this method.
   *
   * @category Data
   * @param options.cancelToken A cancellation token which aborts the asynchronous operation. When the token is cancelled, the promise is rejected and side effects are not reverted (e.g. the artboards is not uncached when newly cached). A cancellation token can be created via {@link createCancelToken}.
   */
  async getBounds(
    options: {
      cancelToken?: CancelToken | null
    } = {}
  ): Promise<LayerBounds> {
    const artboardId = this.artboardId
    if (!artboardId) {
      throw new Error('Detached layers cannot be rendered')
    }

    return this._designFacade.getArtboardLayerBounds(
      artboardId,
      this.id,
      options
    )
  }
}
