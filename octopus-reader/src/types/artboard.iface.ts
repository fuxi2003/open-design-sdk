import type { AggregatedBitmapAssetDescriptor } from './bitmap-assets.type'
import type { IFile } from './file.iface'
import type { AggregatedFontDescriptor } from './fonts.type'
import type { ArtboardId, ComponentId, LayerId, PageId } from './ids.type'
import type { ILayerCollection } from './layer-collection.iface'
import type { ILayer } from './layer.iface'
import type { ArtboardManifestData } from './manifest.type'
import type { ArtboardOctopusData, RgbaColor } from './octopus.type'
import type { IPage } from './page.iface'
import type { LayerSelector } from './selectors.type'

export interface IArtboard {
  readonly octopus: ArtboardOctopusData | null

  readonly id: ArtboardId
  readonly pageId: PageId | null
  readonly componentId: ComponentId | null
  readonly name: string | null

  getManifest(): ArtboardManifestData
  setManifest(nextManifest: ArtboardManifestData): void

  isLoaded(): boolean

  getFile(): IFile | null

  getPage(): IPage | null
  setPage(nextPageId: PageId | null): void
  unassignFromPage(): void

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>

  getBackgroundColor(): RgbaColor | null

  getRootLayers(): ILayerCollection
  getFlattenedLayers(options?: Partial<{ depth: number }>): ILayerCollection

  getLayerById(layerId: LayerId): ILayer | null
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayer | null

  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollection

  getLayerDepth(layerId: LayerId): number | null

  isComponent(): boolean
}
