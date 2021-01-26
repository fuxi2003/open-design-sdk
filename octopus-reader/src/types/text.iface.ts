import type { TextFontDescriptor } from './fonts.type'
import type { LayerOctopusData } from './octopus.type'

export interface IText {
  readonly octopus: NonNullable<LayerOctopusData['text']>

  getTextContent(): string
  getFonts(options?: Partial<{ depth: number }>): Array<TextFontDescriptor>
}
