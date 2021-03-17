import { RenderingArtboard } from './rendering-artboard'

import type { RenderingProcess } from './rendering-process'
import type { IRenderingDesign } from './types/rendering-design.iface'

export class RenderingDesign implements IRenderingDesign {
  readonly id: string
  readonly bitmapAssetDirectoryPath: string | null
  readonly fontDirectoryPath: string | null

  private _renderingProcess: RenderingProcess
  private _artboards: Map<string, RenderingArtboard> = new Map()

  constructor(params: {
    id: string
    bitmapAssetDirectoryPath: string | null
    fontDirectoryPath: string | null
    renderingProcess: RenderingProcess
  }) {
    this.id = params.id
    this.bitmapAssetDirectoryPath = params.bitmapAssetDirectoryPath || null
    this.fontDirectoryPath = params.fontDirectoryPath || null

    this._renderingProcess = params.renderingProcess
  }

  isArtboardLoaded(artboardId: string): boolean {
    const artboard = this._artboards.get(artboardId)
    return Boolean(artboard)
  }

  isArtboardReady(artboardId: string): boolean {
    const artboard = this._artboards.get(artboardId)
    return Boolean(artboard?.ready)
  }

  async loadArtboard(
    artboardId: string,
    params: {
      octopusFilename: string
      symbolId?: string | null
      pageId?: string | null
    }
  ): Promise<RenderingArtboard> {
    const prevArtboard = this._artboards.get(artboardId)
    if (prevArtboard) {
      return prevArtboard
    }

    const artboard = new RenderingArtboard(artboardId, {
      designId: this.id,
      renderingProcess: this._renderingProcess,
      pageId: params.pageId || null,
      symbolId: params.symbolId || null,
      ready: false,
    })
    this._artboards.set(artboardId, artboard)

    await artboard.load({
      octopusFilename: params.octopusFilename,
      bitmapAssetDirectoryPath: this.bitmapAssetDirectoryPath,
      fontDirectoryPath: this.fontDirectoryPath,
    })

    return artboard
  }
}