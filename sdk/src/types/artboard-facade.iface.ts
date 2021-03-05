import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFontDescriptor,
  ArtboardId,
  ArtboardManifestData,
  ArtboardOctopusData,
  ComponentId,
  LayerId,
  LayerSelector,
  PageId,
  RgbaColor,
} from '@opendesign/octopus-reader/types'
import type { IDesignFacade } from './design-facade.iface'
import type { ILayerCollectionFacade } from './layer-collection-facade.iface'
import type { ILayerFacade } from './layer-facade.iface'
import type { IPageFacade } from './page-facade.iface'

export interface IArtboardFacade {
  readonly id: ArtboardId

  readonly pageId: PageId | null
  readonly componentId: ComponentId | null
  readonly name: string | null

  getManifest(): ArtboardManifestData
  setManifest(nextManifest: ArtboardManifestData): void

  isLoaded(): boolean
  getContent(): Promise<ArtboardOctopusData>

  getDesign(): IDesignFacade | null

  getPage(): IPageFacade | null
  setPage(nextPageId: PageId | null, params: { name?: string | null }): void
  unassignFromPage(): void

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedBitmapAssetDescriptor>>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Promise<Array<AggregatedFontDescriptor>>

  getBackgroundColor(): Promise<RgbaColor | null>

  getRootLayers(): Promise<ILayerCollectionFacade>
  getFlattenedLayers(
    options?: Partial<{ depth: number }>
  ): Promise<ILayerCollectionFacade>

  getLayerById(layerId: LayerId): Promise<ILayerFacade | null>
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<ILayerFacade | null>

  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<ILayerCollectionFacade>

  getLayerDepth(layerId: LayerId): Promise<number | null>

  isComponent(): boolean
}
