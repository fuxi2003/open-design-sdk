import type {
  ArtboardId,
  ArtboardOctopusData,
  ManifestData,
  PageId,
} from '@opendesign/octopus-reader'

export type ApiDesignInfo = {
  apiRoot?: string
  designId?: string
}

export type BitmapAssetDescriptor = { name: string; prerendered: boolean }

export type BitmapMapping = { [bitmapKey: string]: string }

// Design-level API

export interface ILocalDesign {
  readonly filename: string | null

  saveAs(nextFilename: string): Promise<void>
  move(nextFilename: string): Promise<void>

  unload(): void

  getManifest(): Promise<ManifestData>
  saveManifest(manifest: ManifestData): Promise<void>

  getBitmapMapping(): Promise<BitmapMapping>
  saveBitmapMapping(bitmapMapping: BitmapMapping): Promise<void>

  getApiDesignInfo(): Promise<ApiDesignInfo | null>
  saveApiDesignInfo(apiDesignInfo: ApiDesignInfo | null): Promise<void>

  // Design Structure

  getArtboardContentFilename(artboardId: ArtboardId): Promise<string | null>
  getArtboardContent(artboardId: ArtboardId): Promise<ArtboardOctopusData>
  getArtboardContentJsonStream(
    artboardId: ArtboardId
  ): Promise<NodeJS.ReadableStream>
  hasArtboardContent(artboardId: ArtboardId): Promise<boolean>
  saveArtboardContent(
    artboardId: ArtboardId,
    artboardOctopus: ArtboardOctopusData
  ): Promise<void>
  saveArtboardContentJsonStream(
    artboardId: ArtboardId,
    artboardOctopusJsonStream: NodeJS.ReadableStream
  ): Promise<void>

  getPageContent(pageId: PageId): Promise<ArtboardOctopusData>
  hasPageContent(pageId: PageId): Promise<boolean>
  savePageContent(
    pageId: PageId,
    pageOctopus: ArtboardOctopusData
  ): Promise<void>
  savePageContentJsonStream(
    pageId: PageId,
    pageOctopusJsonStream: NodeJS.ReadableStream
  ): Promise<void>

  hasBitmapAsset(bitmapAssetDesc: BitmapAssetDescriptor): Promise<boolean>
  getBitmapAssetDirectory(): string
  getBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor
  ): Promise<NodeJS.ReadableStream>
  getBitmapAssetBlob(bitmapAssetDesc: BitmapAssetDescriptor): Promise<Buffer>
  saveBitmapAssetStream(
    bitmapAssetDesc: BitmapAssetDescriptor,
    bitmapAssetStream: NodeJS.ReadableStream
  ): Promise<void>
  saveBitmapAssetBlob(
    bitmapAssetDesc: BitmapAssetDescriptor,
    bitmapAssetBlob: Buffer
  ): Promise<void>
  resolveBitmapAsset(
    bitmapAssetDesc: BitmapAssetDescriptor
  ): Promise<{
    basename: string
    mapped: boolean
    filename: string
    available: boolean
  }>
}
