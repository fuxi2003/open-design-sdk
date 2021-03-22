import { LayerCollectionFacade } from './layer-collection-facade'

import type {
  ILayer,
  LayerOctopusData as LayerOctopusDataType,
  LayerSelector,
} from '@opendesign/octopus-reader'
import type { ArtboardFacade } from './artboard-facade'
import type { ILayerFacade } from './types/layer-facade.iface'

// HACK: This makes TypeDoc not inline the whole type in the documentation.
interface LayerOctopusData extends LayerOctopusDataType {}

export class LayerFacade implements ILayerFacade {
  private _layerEntity: ILayer
  private _artboardFacade: ArtboardFacade

  /** @internal */
  constructor(layerEntity: ILayer, params: { artboardFacade: ArtboardFacade }) {
    this._layerEntity = layerEntity
    this._artboardFacade = params.artboardFacade
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

  /**
   * Returns the artboard object associated with the layer object.
   * @category Reference
   */
  getArtboard() {
    return this._artboardFacade
  }

  /** @internal */
  getLayerEntity() {
    return this._layerEntity
  }

  /**
   * Returns whether the layer is located at the first level within the layer tree of the artboard (i.e. it does not have a parent layer).
   * @category Layer Context
   */
  isRootLayer() {
    return this._layerEntity.isRootLayer()
  }

  /**
   * Returns the nesting level at which the layer is contained within the layer tree of the artboard.
   *
   * @category Layer Context
   */
  getDepth() {
    return this._layerEntity.getDepth()
  }

  /**
   * Returns the immediate parent layer object which contains the layer.
   *
   * @category Layer Lookup
   */
  getParentLayer() {
    const layerEntity = this._layerEntity.getParentLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  /**
   * Returns all parent layer objects which contain the layer sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  getParentLayers() {
    const layerEntities = this._layerEntity.getParentLayers()
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  /**
   * Returns the IDs of all parent layers which contain the layer sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  getParentLayerIds() {
    return this._layerEntity.getParentLayerIds()
  }

  /**
   * Returns the deepest parent layer objects which contains the layer and matches the provided criteria.
   *
   * @category Layer Lookup
   */
  findParentLayer(selector: LayerSelector) {
    const layerEntity = this._layerEntity.findParentLayer(selector)
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  /**
   * Returns all parent layer objects which contain the layer and match the provided criteria sorted from the immediate parent layer to the first-level (root) layer.
   *
   * @category Layer Lookup
   */
  findParentLayers(selector: LayerSelector) {
    const layerEntities = this._layerEntity.findParentLayers(selector)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  /**
   * Returns whether there are any layers nested within the layer (i.e. the layer is the parent layer of other layers).
   *
   * This usually applies to group layers and expanded/inlined component layers. Empty group layers return `false`.
   *
   * @category Layer Lookup
   */
  hasNestedLayers() {
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
  getNestedLayers(options: { depth?: number } = {}) {
    const layerEntities = this._layerEntity.getNestedLayers(options)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  /**
   * Returns the first layer object nested within the layer (i.e. the layer is either the immediate parent layer of other layers or one of their parent layers), optionally down to a specific layer nesting level, which matches the specific criteria.
   *
   * Note that the subtree is walked in *document order*, not level by level, which means that nested layers of a layer are searched before searching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layer to search. By default, all levels are searched.
   */
  findNestedLayer(selector: LayerSelector, options: { depth?: number } = {}) {
    const layerEntity = this._layerEntity.findNestedLayer(selector, options)
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  /**
   * Returns a collection of layer objects nested within the layer (i.e. the layer is either the immediate parent layer of other layers or one of their parent layers), optionally down to a specific layer nesting level, which match the specific criteria.
   *
   * Note that the results are sorted in *document order*, not level by level, which means that matching nested layers of a layer are included before matching sibling layers of the layer.
   *
   * @category Layer Lookup
   * @param selector A layer selector. All specified fields must be matched by the result.
   * @param options.depth The maximum nesting level within the layer to search. By default, all levels are searched.
   */
  findNestedLayers(selector: LayerSelector, options: { depth?: number } = {}) {
    const layerEntities = this._layerEntity.findNestedLayers(selector, options)
    return new LayerCollectionFacade(layerEntities, {
      artboardFacade: this._artboardFacade,
    })
  }

  /**
   * Returns whether the layer is masked/clipped by another layer.
   *
   * @category Layer Context
   */
  isMasked() {
    return this._layerEntity.isMasked()
  }

  /**
   * Returns the layer which masks/clips the layer if there is one.
   *
   * @category Layer Lookup
   */
  getMaskLayer() {
    const layerEntity = this._layerEntity.getMaskLayer()
    return layerEntity
      ? new LayerFacade(layerEntity, { artboardFacade: this._artboardFacade })
      : null
  }

  /**
   * Returns the ID of the layer which masks/clips the layer if there is one.
   *
   * @category Layer Lookup
   */
  getMaskLayerId() {
    return this._layerEntity.getMaskLayerId()
  }

  /**
   * Returns whether the layer represents an "inline artboard" (which is a feature used in Photoshop design files only).
   *
   * @category Layer Context
   */
  isInlineArtboard() {
    return this._layerEntity.isInlineArtboard()
  }

  /**
   * Returns whether the layer is a component (instance of a main/master component).
   *
   * @category Layer Context
   */
  isComponentInstance() {
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
  hasComponentOverrides() {
    return this._layerEntity.hasComponentOverrides()
  }

  /**
   * Returns the artboard which represents the main/master component of which this layer is and instance.
   *
   * Nothing is returned from layers which do not represent a component (instance), see {@link LayerFacade.isComponentInstance}.
   *
   * @category Reference
   */
  getComponentArtboard() {
    const componentArtboardEntity = this._layerEntity.getComponentArtboard()
    return componentArtboardEntity
      ? this._artboardFacade
          .getDesign()
          .getArtboardById(componentArtboardEntity.id)
      : null
  }

  /**
   * Returns a list of bitmap assets used by the layer and layers nested within the layer (optionally down to a specific nesting level).
   *
   * Note that this method aggregates results of the more granular bitmap asset-related methods of {@link LayerFacade.getBitmap}, {@link LayerFacade.getBitmapMask} and {@link LayerFacade.getPrerenderedBitmap} and pattern fill bitmap assets discoverable via {@link LayerFacade.getEffects}.
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within the layer to search for bitmap asset usage. By default, all levels are searched. Specifying the depth of `0` leads to nested layer bitmap assets being omitted altogether.
   * @param options.includePrerendered Whether to also include "pre-rendered" bitmap assets. These assets can be produced by the rendering engine (if configured; future functionality) but are available as assets for either performance reasons or due to the some required data (such as font files) potentially not being available. By default, pre-rendered assets are included.
   */
  getBitmapAssets(
    options: { depth?: number; includePrerendered?: boolean } = {}
  ) {
    return this._layerEntity.getBitmapAssets(options)
  }

  /**
   * Returns a list of fonts used by the layer and layers nested within the layer (optionally down to a specific nesting level).
   *
   * @category Asset Aggregation
   * @param options.depth The maximum nesting level within page and artboard layers to search for font usage. By default, all levels are searched. Specifying the depth of `0` leads to fonts used by nested layers being omitted altogether.
   */
  getFonts(options: { depth?: number } = {}) {
    return this._layerEntity.getFonts(options)
  }

  /**
   * Returns the bitmap asset of the layer if there is one.
   *
   * Only bitmap layers (`type=layer`) can return an asset here. Bitmap assets of layers of other types are considered "pre-rendered" and returned via {@link LayerFacade.getPrerenderedBitmap}.
   *
   * @category Asset Aggregation
   */
  getBitmap() {
    return this._layerEntity.getBitmap()
  }

  /**
   * Returns the bitmap mask of the layer if there is one.
   *
   * @category Asset Aggregation
   */
  getBitmapMask() {
    return this._layerEntity.getBitmapMask()
  }

  /**
   * Returns the "pre-rendered" bitmap asset of the layer if there is one.
   *
   * Only non-bitmap layers (`type!=layer`) can return an asset here. Bitmap assets of bitmap layers are not considered "pre-rendered" and are returned via {@link LayerFacade.getBitmap}.
   *
   * @category Asset Aggregation
   */
  getPrerenderedBitmap() {
    return this._layerEntity.getPrerenderedBitmap()
  }

  /**
   * Returns a vector shape object of the layer if there is one.
   *
   * Only shape layers (`type=shapeLayer`) return shape objects here.

   * @category Data
   */
  getShape() {
    return this._layerEntity.getShape()
  }

  /**
   * Returns a text object of the layer if there is one.
   *
   * Only text layers (`type=textLayer`) return text objects here.
   *
   * @category Data
   */
  getText() {
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
  getEffects() {
    return this._layerEntity.getEffects()
  }

  /**
   * Renders the layer as an image file.
   *
   * In case the layer is a group layer, all visible nested layers are also included.
   *
   * Offline services including the local rendering engine have to be configured when using this method.
   *
   * @category Rendering
   * @param relPath The target location of the produced image file.
   */
  async renderToFile(relPath: string): Promise<void> {
    return this._artboardFacade.renderLayerToFile(this.id, relPath)
  }
}
