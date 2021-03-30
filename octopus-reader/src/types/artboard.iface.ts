import type { AggregatedFileBitmapAssetDescriptor } from './bitmap-assets.type'
import type { IFile } from './file.iface'
import type { AggregatedFileFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { ILayer } from './layer.iface'
import type { ArtboardManifestData } from './manifest.type'
import type { ArtboardOctopusData, RgbaColor } from './octopus.type'
import type { IPage } from './page.iface'
import type { LayerSelector } from './selectors.type'

export interface IArtboard {
  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly componentId: ComponentId | null
  readonly name: string | null

  getManifest(): ArtboardManifestData
  setManifest(nextManifest: ArtboardManifestData): void

  isLoaded(): boolean
  getOctopus(): ArtboardOctopusData | null
  setOctopus(nextOctopus: ArtboardOctopusData): void

  getFile(): IFile | null

  getPage(): IPage | null
  setPage(nextPageId: PageId | null): void
  unassignFromPage(): void

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>

  getBackgroundColor(): RgbaColor | null

  getRootLayers(): ILayerCollection
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  getLayerById(layerId: LayerId): ILayer | null
  findLayer(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayer | null

  findLayers(
    selector: LayerSelector | ((layer: ILayer) => boolean),
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  getLayerDepth(layerId: LayerId): number | null

  isComponent(): boolean
}
