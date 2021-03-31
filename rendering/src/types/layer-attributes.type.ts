import type { BlendingMode } from './commands.type'

export type LayerAttributesConfig = {
  includeEffects?: boolean
  clip?: boolean
  includeArtboardBackground?: boolean
  blendingMode?: BlendingMode
  opacity?: number
}
