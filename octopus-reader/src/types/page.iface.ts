import type { IArtboard } from './artboard.iface'
import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayer } from './layer.iface'
import type { ILayerCollection } from './layer-collection.iface'
import type { ArtboardSelector, LayerSelector } from './selectors.type'

export interface IPage {
  readonly id: PageId
  name: string | null

  unloadArtboards(): void

  addArtboard(artboardId: ArtboardId): void
  removeArtboard(
    artboardId: ArtboardId,
    options?: Partial<{ unassign: boolean }>
  ): void

  getArtboards(): Array<IArtboard>
  getComponentArtboards(): Array<IArtboard>
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  getArtboardByComponentId(componentId: ComponentId): IArtboard | null
  findArtboard(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): IArtboard | null
  findArtboards(
    selector: ArtboardSelector | ((artboard: IArtboard) => boolean)
  ): Array<IArtboard>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>

  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  findLayerById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayersById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): ILayerCollection
  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null
  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection
}
