import { RenderingDesign } from './rendering-design'
import { RenderingProcess } from './rendering-process'

import type { IRenderingEngine } from './types/rendering-engine.iface'

export class RenderingEngine implements IRenderingEngine {
  private _renderingProcess: RenderingProcess

  private _designs: Map<string, RenderingDesign> = new Map()

  // TODO: Move rendering process init to a factory.
  constructor() {
    const renderingProcess = new RenderingProcess()
    renderingProcess.init()

    this._renderingProcess = renderingProcess
  }

  async createDesign(
    designId: string,
    params: {
      bitmapAssetDirectoryPath?: string | null
      fontDirectoryPath?: string | null
    } = {}
  ): Promise<RenderingDesign> {
    const result = await this._renderingProcess.execCommand('create-design', {
      'design': designId,
    })
    if (!result['ok']) {
      throw new Error('Failed to create a design rendering session')
    }

    const design = new RenderingDesign({
      id: designId,
    })

    this._designs.set(designId, design)

    return design
  }
}
