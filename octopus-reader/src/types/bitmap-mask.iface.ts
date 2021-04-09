import type { IBitmap } from './bitmap.iface'

export interface IBitmapMask {
  /**
   * Returns the bitmap used for masking.
   * @category Data
   */
  getBitmap(): IBitmap | null

  /**
   * Returns whether the mask is in effect.
   * @category Data
   */
  isEnabled(): boolean

  /**
   * Returns whether the area of the masked layer which is not covered by the mask bitmap image should be visible.
   * @category Data
   */
  isExtendedWithWhite(): boolean
}
