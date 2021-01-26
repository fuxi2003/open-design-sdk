import type { LayerOctopusData } from '../types/octopus.type'
import type { IText } from '../types/text.iface'

export class Text implements IText {
  readonly octopus: NonNullable<LayerOctopusData['text']>

  constructor(textDesc: NonNullable<LayerOctopusData['text']>) {
    this.octopus = textDesc
  }

  getTextContent(): string {
    return this.octopus['value'] || ''
  }
}
