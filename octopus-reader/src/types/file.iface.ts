import type { IArtboard } from './artboard.iface'
import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type {
  FileLayerDescriptor,
  IFileLayerCollection,
} from './file-layer-collection.iface'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ArtboardManifestData, ManifestData } from './manifest.type'
import type { ArtboardOctopusData } from './octopus.type'
import type { ArtboardSelector, LayerSelector } from './selectors.type'

export interface IFile {
  /** @category Octopus File Manifest */
  getManifest(): ManifestData
  /** @category Octopus File Manifest */
  setManifest(nextManifest: ManifestData): void

  /**
   * @category Artboard Management
   */
  addArtboard(
    artboardId: ArtboardId,
    octopus: ArtboardOctopusData,
    params?: Partial<{
      manifest: ArtboardManifestData
      pageId: PageId | null
      componentId: ComponentId | null
      name: string | null
    }>
  ): IArtboard

  /** @category Artboard Management */
  removeArtboard(artboardId: ArtboardId): boolean

  /** @category Artboard Lookup */
  getArtboards(): Array<IArtboard>
  /** @category Artboard Lookup */
  getPageArtboards(pageId: PageId): Array<IArtboard>
  /** @category Artboard Lookup */
  getComponentArtboards(): Array<IArtboard>
  /** @category Artboard Lookup */
  getArtboardById(artboardId: ArtboardId): IArtboard | null
  /** @category Artboard Lookup */
  getArtboardByComponentId(componentId: ComponentId): IArtboard | null
  /** @category Artboard Lookup */
  findArtboard(selector: ArtboardSelector): IArtboard | null
  /** @category Artboard Lookup */
  findArtboards(selector: ArtboardSelector): Array<IArtboard>

  /** @category Layer Lookup */
  getFlattenedLayers(options?: Partial<{ depth: number }>): IFileLayerCollection
  /** @category Layer Lookup */
  findLayerById(layerId: LayerId): FileLayerDescriptor | null
  /** @category Layer Lookup */
  findLayersById(layerId: LayerId): IFileLayerCollection
  /** @category Layer Lookup */
  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): FileLayerDescriptor | null
  /** @category Layer Lookup */
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollection

  /** @category Asset Aggregation */
  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  /** @category Asset Aggregation */
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>
}
