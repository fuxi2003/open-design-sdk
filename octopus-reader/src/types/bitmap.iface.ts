import type { BitmapMetadata, Bounds } from './octopus.type'

export interface IBitmap {
  /**
   * Returns the bitmap asset identifier.
   *
   * This is currently always an absolute URL.
   *
   * @category Identification
   */
  getBitmapAssetName(): string | null

  /**
   * Returns the area in the coordinate system of the artboard to which the bitmap should be rendered.
   *
   * This does not have to reflect the actual natural dimensions of the bitmap image file.
   *
   * @category Data
   */
  getBitmapBounds(): Bounds | null

  /**
   * Returns internal metadata the rendering engine uses to properly render the image.
   *
   * @category Data
   */
  getBitmapMetadata(): BitmapMetadata | null
}
