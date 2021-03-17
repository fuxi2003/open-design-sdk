import type { IRenderingDesign } from './rendering-design.iface'

export interface IRenderingEngine {
  createDesign(
    designId: string,
    params: {
      bitmapAssetDirectoryPath?: string | null
      fontDirectoryPath?: string | null
    }
  ): Promise<IRenderingDesign>
}
