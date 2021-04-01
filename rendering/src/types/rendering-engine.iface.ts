import type { IRenderingDesign } from './rendering-design.iface'

export interface IRenderingEngine {
  isDestroyed(): boolean
  destroy(): Promise<void>

  createDesign(
    designId: string,
    params: {
      bitmapAssetDirectoryPath?: string | null
      fontDirectoryPath?: string | null
    }
  ): Promise<IRenderingDesign>
}
