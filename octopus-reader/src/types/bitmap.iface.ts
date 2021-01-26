import type { BitmapMetadata, Bounds } from './octopus.type'

export interface IBitmap {
  getBitmapAssetName(): string | null
  getBitmapBounds(): Bounds | null
  getBitmapMetadata(): BitmapMetadata | null
}
