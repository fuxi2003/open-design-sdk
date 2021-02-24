import type { IBitmap } from '../types/bitmap.iface'
import type { BitmapMetadata, Bounds } from '../types/octopus.type'

type BitmapDescriptor = {
  'filename'?: string
  'bounds'?: Bounds
  'metadata'?: BitmapMetadata
}

export class Bitmap implements IBitmap {
  _bitmapDesc: BitmapDescriptor

  constructor(bitmapDesc: BitmapDescriptor) {
    this._bitmapDesc = bitmapDesc
  }

  getBitmapAssetName(): string | null {
    return this._bitmapDesc['filename'] || null
  }

  getBitmapBounds(): Bounds | null {
    return this._bitmapDesc['bounds'] || null
  }

  getBitmapMetadata(): BitmapMetadata | null {
    return this._bitmapDesc['metadata'] || null
  }
}
