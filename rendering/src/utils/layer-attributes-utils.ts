import { LayerAttributesConfig } from '../types/layer-attributes.type'

export function serializeLayerAttributes(
  layerAttributes: LayerAttributesConfig
) {
  return {
    'draw-effects': layerAttributes.includeEffects !== false,
    'enable-clipping': layerAttributes.clip !== false,
    'draw-background': Boolean(layerAttributes.includeComponentBackground),
    ...(typeof layerAttributes.blendingMode === 'undefined'
      ? {}
      : { 'blend-mode': layerAttributes.blendingMode }),
    ...(typeof layerAttributes.opacity === 'undefined'
      ? {}
      : { 'opacity': layerAttributes.opacity }),
  }
}
