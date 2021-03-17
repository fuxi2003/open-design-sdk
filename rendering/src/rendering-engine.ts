import { RenderingProcess } from './rendering-process'

import type { IRenderingEngine } from './types/rendering-engine.iface'

export class RenderingEngine implements IRenderingEngine {
  private _renderingProcess: RenderingProcess

  // TODO: Move rendering process init to a factory.
  constructor() {
    const renderingProcess = new RenderingProcess()
    renderingProcess.init()

    this._renderingProcess = renderingProcess
  }
}
