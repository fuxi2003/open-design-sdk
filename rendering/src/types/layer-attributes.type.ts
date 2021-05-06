import type { BlendingMode } from './commands.type'

export type LayerAttributesConfig = {
  includeEffects?: boolean
  clip?: boolean
  includeComponentBackground?: boolean
  blendingMode?: BlendingMode
  opacity?: number
}
