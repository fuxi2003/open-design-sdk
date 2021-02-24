import type { ArtboardId, LayerId } from './ids.type'

export type TextFontDescriptor = {
  fontPostScriptName: string
  fontPostScriptNameSynthetic: boolean
  fontTypes: Array<string>
}

export type FontDescriptor = TextFontDescriptor & {
  layerId: LayerId
}

export type AggregatedFontDescriptor = {
  fontPostScriptName: string
  fontPostScriptNameSynthetic: boolean
  fontTypes: Array<string>
  layerIds: Array<LayerId>
}

export type FileFontDescriptor = FontDescriptor & {
  artboardId: ArtboardId
}

export type AggregatedFileFontDescriptor = {
  fontPostScriptName: string
  fontPostScriptNameSynthetic: boolean
  fontTypes: Array<string>
  artboardLayerIds: Record<ArtboardId, Array<LayerId>>
}
