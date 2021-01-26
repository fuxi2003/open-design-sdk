import type { BorderRadiuses, LayerOctopusData } from './octopus.type'

export interface IShape {
  readonly octopus: NonNullable<LayerOctopusData['shape']>

  getBorderRadius(): number | null
  getBorderRadiuses(): BorderRadiuses | null
}
