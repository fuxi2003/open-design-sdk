import { RenderingArtboard } from './rendering-artboard'

import { serializeBounds } from './utils/bounds-utils'

import type { RenderingProcess } from './rendering-process'
import type { Bounds } from './types/bounds.type'
import type { LayerAttributesConfig } from './types/layer-attributes.type'
import type { IRenderingDesign } from './types/rendering-design.iface'

export class RenderingDesign implements IRenderingDesign {
  readonly id: string
  readonly bitmapAssetDirectoryPath: string | null
  readonly fontDirectoryPath: string | null

  private _renderingProcess: RenderingProcess
  private _artboards: Map<string, RenderingArtboard> = new Map()
  private _loadedBitmaps: Set<string> = new Set()
  private _loadedFonts: Set<string> = new Set()

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

  async loadFont(postscriptName: string, filename: string): Promise<void> {
    if (this._loadedFonts.has(postscriptName)) {
      return
    }

    await this._renderingProcess.execCommand('load-font', {
      'design': this.id,
      'key': postscriptName,
      'file': filename,
    })

    this._loadedFonts.add(postscriptName)
  }

  async loadImage(bitmapKey: string, filename: string): Promise<void> {
    if (this._loadedBitmaps.has(bitmapKey)) {
      return
    }

    await this._renderingProcess.execCommand('load-image', {
      'design': this.id,
      'key': bitmapKey,
      'file': filename,
    })

    this._loadedBitmaps.add(bitmapKey)
  }

  async renderArtboardToFile(
    artboardId: string,
    filePath: string,
    options: { scale?: number; bounds?: Bounds } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderToFile(filePath, options)
  }

  async renderPageToFile(
    pageId: string,
    filePath: string,
    options: { scale?: number; bounds?: Bounds } = {}
  ): Promise<void> {
    const result = await this._renderingProcess.execCommand('render-page', {
      'design': this.id,
      'page': pageId,
      'file': filePath,
      'scale': options.scale || 1,
      ...(options.bounds ? { 'bounds': serializeBounds(options.bounds) } : {}),
    })
    if (!result['ok']) {
      console.error('RenderingDesign#renderPageToFile() render-page:', result)
      throw new Error('Failed to render page')
    }
  }

  async renderArtboardLayerToFile(
    artboardId: string,
    layerId: string,
    filePath: string,
    options: LayerAttributesConfig & {
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderLayerToFile(layerId, filePath, options)
  }

  async renderArtboardLayersToFile(
    artboardId: string,
    layerIds: Array<string>,
    filePath: string,
    options: {
      layerAttributes?: Record<string, LayerAttributesConfig>
      scale?: number
      bounds?: Bounds
    } = {}
  ): Promise<void> {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.renderLayersToFile(layerIds, filePath, options)
  }

  async getArtboardLayerBounds(artboardId: string, layerId: string) {
    const artboard = this._artboards.get(artboardId)
    if (!artboard) {
      throw new Error('No such artboard')
    }

    return artboard.getLayerBounds(layerId)
  }
}
