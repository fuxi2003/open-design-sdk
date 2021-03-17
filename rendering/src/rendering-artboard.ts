import type { RenderingProcess } from './rendering-process'
import type { LayerAttributes } from './types/commands.type'
import type { IRenderingArtboard } from './types/rendering-artboard.iface'

export class RenderingArtboard implements IRenderingArtboard {
  readonly id: string
  readonly symbolId: string | null

  private _designId: string
  private _renderingProcess: RenderingProcess
  private _pageId: string | null

  private _ready: boolean
  private _pendingSymbolIds: Array<string>

  constructor(
    id: string,
    params: {
      renderingProcess: RenderingProcess
      designId: string
      symbolId?: string | null
      pageId?: string | null
      ready?: boolean
      pendingSymbolIds?: Array<string>
    }
  ) {
    this.id = id
    this.symbolId = params.symbolId || null

    this._designId = params.designId
    this._renderingProcess = params.renderingProcess
    this._pageId = params.pageId || null

    this._pendingSymbolIds = params.pendingSymbolIds || []
    this._ready = params.ready !== false && this._pendingSymbolIds.length === 0
  }

  get ready() {
    return this._ready
  }

  get pendingSymbolIds() {
    return this._pendingSymbolIds
  }

  async load(params: {
    octopusFilename: string
    bitmapAssetDirectoryPath?: string | null
    fontDirectoryPath?: string | null
  }) {
    const loadResult = await this._renderingProcess.execCommand(
      'load-artboard',
      {
        'design': this._designId,
        'artboard': this.id,
        'file': params.octopusFilename,
        'assetpath': params.bitmapAssetDirectoryPath,
        'fontpath': params.fontDirectoryPath,
        'page': this._pageId,
      }
    )

    const symbolLoadResult = this.symbolId
      ? await this._renderingProcess.execCommand('load-artboard', {
          'design': this._designId,
          'symbol': this.symbolId,
          'file': params.octopusFilename,
          'assetpath': params.bitmapAssetDirectoryPath,
          'fontpath': params.fontDirectoryPath,
          'page': this._pageId,
        })
      : { 'ok': true }

    if (!loadResult['ok'] || !symbolLoadResult['ok']) {
      throw new Error('Failed to load design artboard')
    }

    const pendingSymbolIds = await this._getPendingArtboardDependencies()
    this._pendingSymbolIds = pendingSymbolIds
    this._ready = pendingSymbolIds.length === 0
  }

  async _getPendingArtboardDependencies(): Promise<Array<string>> {
    const dependencyResult = await this._renderingProcess.execCommand(
      'get-artboard-dependencies',
      {
        'design': this._designId,
        'artboard': this.id,
      }
    )
    if (!dependencyResult['ok']) {
      throw new Error('Failed to get pending artboard dependency list')
    }

    return dependencyResult['symbols'] || []
  }

  async renderToFile(relPath: string): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand('render-artboard', {
      'design': this._designId,
      'artboard': this.id,
      'file': relPath,
    })
    if (!result['ok']) {
      console.error(
        'RenderingDesign#renderArtboardToFile() render-artboard:',
        result
      )
      throw new Error('Failed to render artboard')
    }
  }

  async renderLayerToFile(layerId: string, relPath: string): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand('render-layer', {
      'design': this._designId,
      'artboard': this.id,
      'layer': layerId,
      'file': relPath,
    })
    if (!result['ok']) {
      console.error(
        'RenderingDesign#renderArtboardLayerToFile() render-layer:',
        result
      )
      throw new Error('Failed to render artboard layer')
    }
  }

  async renderLayersToFile(
    layerIds: Array<string>,
    relPath: string
  ): Promise<void> {
    if (!this.ready) {
      throw new Error('The artboard is not ready')
    }

    const result = await this._renderingProcess.execCommand(
      'render-artboard-composition',
      {
        'design': this._designId,
        'artboard': this.id,
        'background': { 'enable': false },
        'draw-shown-only': true,
        'layer-attributes': layerIds.map(
          (layerId): LayerAttributes => {
            return {
              'layer': layerId,
              'visibility': 'force-show',
            }
          }
        ),
        'file': relPath,
      }
    )
    if (!result['ok']) {
      console.error(
        'RenderingDesign#renderLayersToFile() render-artboard-composition:',
        result
      )
      throw new Error('Failed to render artboard layers')
    }
  }
}
