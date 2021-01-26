import type { LayerOctopusData } from './octopus.type'

export interface IText {
  readonly octopus: NonNullable<LayerOctopusData['text']>

  getTextContent(): string
}
