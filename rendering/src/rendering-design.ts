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

  async renderArtboardToFile(
    artboardId: string,
    relPath: string
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard || !artboard.ready) {
      throw new Error('The artboard is not ready')
    }

    return artboard.renderToFile(relPath)
  }

  async renderPageToFile(pageId: string, relPath: string): Promise<void> {
    const result = await this._renderingProcess.execCommand('render-page', {
      'design': this.id,
      'page': pageId,
      'file': relPath,
    })
    if (!result['ok']) {
      console.error('RenderingDesign#renderPageToFile() render-page:', result)
      throw new Error('Failed to render page')
    }
  }

  async renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    relPath: string
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard || !artboard.ready) {
      throw new Error('The artboard is not ready')
    }

    return artboard.renderLayerToFile(layerId, relPath)
  }

  async renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    relPath: string
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard || !artboard.ready) {
      throw new Error('The artboard is not ready')
    }

    return artboard.renderLayersToFile(layerIds, relPath)
  }
}
