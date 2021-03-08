import type { IBitmap } from './bitmap.iface'

export interface IBitmapMask {
  getBitmap(): IBitmap | null
  isEnabled(): boolean
  isExtendedWithWhite(): boolean
}
