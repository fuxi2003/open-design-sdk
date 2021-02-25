import type { IOpenDesignApi } from '@opendesign/api/types'
import type {
  AggregatedBitmapAssetDescriptor,
  AggregatedFileBitmapAssetDescriptor,
  AggregatedFileFontDescriptor,
  AggregatedFontDescriptor,
  ArtboardId,
  ArtboardManifestData,
  ArtboardOctopusData,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IBitmap,
  IEffects,
  ILayer,
  IShape,
  IText,
  LayerId,
  LayerSelector,
  ManifestData,
  PageId,
  PageSelector,
  RgbaColor,
} from '@opendesign/octopus-reader/types'
import type { ILocalDesignManager } from '../local/ifaces'

// -- modules

export interface IDesignFileManager {
  readDesignFileStream(relPath: string): Promise<NodeJS.ReadableStream>

  saveDesignFileStream(
    relPath: string,
    designFileStream: NodeJS.ReadableStream
  ): Promise<void>
}

export interface ISdk {
  openDesignFile(relPath: string): Promise<IDesignFacade>
  openOctopusFile(relPath: string): Promise<IDesignFacade>
  fetchDesignById(designId: string): Promise<IDesignFacade>

  useLocalDesignManager(localDesignManager: ILocalDesignManager): void
  useDesignFileManager(designFileManager: IDesignFileManager): void
  useOpenDesignApi(api: IOpenDesignApi): void
}

export interface IDesignFacade {
  readonly id: string | null
  readonly filename: string | null

  saveOctopusFile(relPath?: string | null): Promise<void>

  getManifest(): ManifestData
  // setManifest(nextManifest: ManifestData): void

  /** @category Page Lookup */
  isPaged(): boolean
  /** @category Page Lookup */
  getPages(): Array<IPageFacade>
  /** @category Page Lookup */
  getPageById(pageId: PageId): IPageFacade | null
  /** @category Page Lookup */
  findPage(selector: PageSelector): IPageFacade | null
  /** @category Page Lookup */
  findPages(selector: PageSelector): Array<IPageFacade>

  /** @category Artboard Lookup */
  getArtboards(): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getPageArtboards(pageId: PageId): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getComponentArtboards(): Array<IArtboardFacade>
  /** @category Artboard Lookup */
  getArtboardById(artboardId: ArtboardId): IArtboardFacade | null
  /** @category Artboard Lookup */
  getArtboardByComponentId(componentId: ComponentId): IArtboardFacade | null
  /** @category Artboard Lookup */
  findArtboard(selector: ArtboardSelector): IArtboardFacade | null
  /** @category Artboard Lookup */
  findArtboards(selector: ArtboardSelector): Array<IArtboardFacade>

  /** @category Layer Lookup */
  getFlattenedLayers(
    options?: Partial<{ depth: number }>
  ): Promise<IFileLayerCollectionFacade>

  /** @category Layer Lookup */
  findLayerById(layerId: LayerId): Promise<DesignLayerDescriptor | null>
  /** @category Layer Lookup */
  findLayersById(layerId: LayerId): Promise<IFileLayerCollectionFacade>
  /** @category Layer Lookup */
  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<DesignLayerDescriptor | null>
  /** @category Layer Lookup */
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<IFileLayerCollectionFacade>

  /** @category Asset Aggregation */
  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedFileBitmapAssetDescriptor>>
  /** @category Asset Aggregation */
  getFonts(
    options?: Partial<{ depth: number }>
  ): Promise<Array<AggregatedFileFontDescriptor>>
}

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

export interface IPageFacade {
  readonly id: PageId

  readonly name: string | null

  getArtboards(): Array<IArtboardFacade>
  getComponentArtboards(): Array<IArtboardFacade>
  getArtboardById(artboardId: ArtboardId): IArtboardFacade | null
  getArtboardByComponentId(componentId: ComponentId): IArtboardFacade | null
  findArtboard(selector: ArtboardSelector): IArtboardFacade | null
  findArtboards(selector: ArtboardSelector): Array<IArtboardFacade>

  getBitmapAssets(
    options?: Partial<{ includePrerendered: boolean }>
  ): Promise<Array<AggregatedFileBitmapAssetDescriptor>>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Promise<Array<AggregatedFileFontDescriptor>>

  getFlattenedLayers(): Promise<IFileLayerCollectionFacade>

  findLayerById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): Promise<DesignLayerDescriptor | null>
  findLayersById(
    layerId: LayerId,
    options?: Partial<{ depth: number }>
  ): Promise<IFileLayerCollectionFacade>
  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<DesignLayerDescriptor | null>
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): Promise<IFileLayerCollectionFacade>
}

export interface ILayerFacade {
  readonly id: LayerId
  readonly name: ILayer['name']
  readonly type: ILayer['type']
  readonly octopus: ILayer['octopus']

  getArtboard(): IArtboardFacade | null

  isRootLayer(): boolean
  getDepth(): number

  getParentLayer(): ILayerFacade | null
  getParentLayers(): ILayerCollectionFacade
  getParentLayerIds(): Array<LayerId>
  findParentLayer(selector: LayerSelector): ILayerFacade | null
  findParentLayers(selector: LayerSelector): ILayerCollectionFacade

  hasNestedLayers(): boolean
  getNestedLayers(options?: Partial<{ depth: number }>): ILayerCollectionFacade
  findNestedLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findNestedLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollectionFacade

  isMasked(): boolean
  getMaskLayer(): ILayerFacade | null
  getMaskLayerId(): LayerId | null

  isInlineArtboard(): boolean

  isComponentInstance(): boolean
  hasComponentOverrides(): boolean
  getComponentArtboard(): IArtboardFacade | null

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>

  getBitmap(): IBitmap | null
  getPrerenderedBitmap(): IBitmap | null
  getShape(): IShape | null
  getText(): IText | null

  getEffects(): IEffects
}

export interface ILayerCollectionFacade {
  readonly length: number

  [Symbol.iterator](): Iterator<ILayerFacade>

  getLayers(): Array<ILayerFacade>
  getLayerById(layerId: LayerId): ILayerFacade | null

  findLayer(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerFacade | null
  findLayers(
    selector: LayerSelector,
    options?: Partial<{ depth: number }>
  ): ILayerCollectionFacade

  filter(filter: (layer: ILayerFacade) => boolean): ILayerCollectionFacade

  map<T>(mapper: (layer: ILayerFacade) => T): Array<T>
  flatMap<T>(mapper: (layer: ILayerFacade) => Array<T>): Array<T>

  reduce<T>(
    reducer: (state: T, layer: ILayerFacade, index: number) => T,
    initialValue?: T
  ): T

  concat(
    addedLayers: ILayerCollectionFacade | Array<ILayerFacade>
  ): ILayerCollectionFacade

  flatten(options?: Partial<{ depth: number }>): ILayerCollectionFacade

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFontDescriptor>
}

export interface IFileLayerCollectionFacade {
  readonly length: number

  [Symbol.iterator](): Iterator<DesignLayerDescriptor>

  getLayers(): Array<DesignLayerDescriptor>

  findLayer(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): DesignLayerDescriptor | null
  findLayers(
    selector: FileLayerSelector,
    options?: Partial<{ depth: number }>
  ): IFileLayerCollectionFacade

  filter(
    filter: (layerDesc: DesignLayerDescriptor) => boolean
  ): IFileLayerCollectionFacade

  map<T>(mapper: (layerDesc: DesignLayerDescriptor) => T): Array<T>
  flatMap<T>(mapper: (layerDesc: DesignLayerDescriptor) => Array<T>): Array<T>

  reduce<T>(
    reducer: (state: T, layerDesc: DesignLayerDescriptor, index: number) => T,
    initialValue?: T
  ): T

  getBitmapAssets(
    options?: Partial<{ depth: number; includePrerendered: boolean }>
  ): Array<AggregatedFileBitmapAssetDescriptor>
  getFonts(
    options?: Partial<{ depth: number }>
  ): Array<AggregatedFileFontDescriptor>
}

export type DesignLayerDescriptor = {
  artboardId: ArtboardId
  layer: ILayerFacade
}
