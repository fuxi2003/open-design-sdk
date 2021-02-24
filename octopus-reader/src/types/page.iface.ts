import type { IArtboard } from './artboard.iface'
import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type {
  FileLayerDescriptor,
  IFileLayerCollection,
} from './file-layer-collection.iface'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ArtboardSelector, LayerSelector } from './selectors.type'

export interface IPage {
  readonly id: PageId
  name: string | null

  addArtboard(artboardId: ArtboardId): void
  removeArtboard(
    artboardId: ArtboardId,
    options?: Partial<{ unassign: boolean }>
  ): void

  getArtboards(): Array<IArtboard>
  getComponentArtboards(): Array<IArtboard>
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  getArtboardByComponentId(componentId: ComponentId): IArtboard | null
  findArtboard(selector: ArtboardSelector): IArtboard | null
  findArtboards(selector: ArtboardSelector): Array<IArtboard>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>

  getFlattenedLayers(options?: Partial<{ depth: number }>): IFileLayerCollection

  findLayerById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): FileLayerDescriptor | null
  findLayersById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollection
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): FileLayerDescriptor | null
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollection
}