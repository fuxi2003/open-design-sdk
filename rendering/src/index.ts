import { RenderingEngine } from './rendering-engine'
import { RenderingProcess } from './rendering-process'

import type { Bounds } from './types/bounds.type'
import type { LayerAttributesConfig } from './types/layer-attributes.type'
import type {
  LayerBounds,
  IRenderingArtboard,
} from './types/rendering-artboard.iface'
import type {
  BlendingMode,
  ClippingMode,
  LayerType,
} from './types/commands.type'
import type { IRenderingDesign } from './types/rendering-design.iface'
import type { IRenderingEngine } from './types/rendering-engine.iface'

export type {
  BlendingMode,
  Bounds,
  ClippingMode,
  LayerAttributesConfig,
  LayerBounds,
  LayerType,
  IRenderingArtboard,
  IRenderingDesign,
  IRenderingEngine,
}

export async function createRenderingEngine() {
  const renderingProcess = new RenderingProcess()
  renderingProcess.init()

  const renderingEngine = new RenderingEngine({ renderingProcess })

  return renderingEngine
}
