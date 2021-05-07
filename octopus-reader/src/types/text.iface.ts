import type { TextFontDescriptor } from './fonts.type'
import type { Text } from './octopus.type'

export interface IText {
  readonly octopus: Text

  getTextContent(): string
  getFonts(options?: Partial<{ depth: number }>): Array<TextFontDescriptor>
}
