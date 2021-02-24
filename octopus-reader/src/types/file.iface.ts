import type { IArtboard } from './artboard.iface'
import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type {
  FileLayerDescriptor,
  IFileLayerCollection,
} from './file-layer-collection.iface'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { ArtboardOctopusData } from './octopus.type'
import type { ArtboardSelector, LayerSelector } from './selectors.type'

export interface IFile {
  addArtboard(
    artboardId: ArtboardId,
    octopus: ArtboardOctopusData,
    params?: Partial<{
      pageId: PageId | null
      name: string | null
    }>
  ): IArtboard

  removeArtboard(artboardId: ArtboardId): boolean

  getArtboards(): Array<IArtboard>
  getPageArtboards(pageId: PageId): Array<IArtboard>
  getComponentArtboards(): Array<IArtboard>
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  getArtboardByComponentId(
    componentId: ArtboardOctopusData['symbolID']
  ): IArtboard | null
  findArtboard(selector: ArtboardSelector): IArtboard | null
  findArtboards(selector: ArtboardSelector): Array<IArtboard>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>

  getFlattenedLayers(options?: Partial<{ depth: number }>): IFileLayerCollection

  findLayerById(layerId: LayerId): FileLayerDescriptor | null
  findLayersById(layerId: LayerId): IFileLayerCollection
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): FileLayerDescriptor | null
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollection
}
