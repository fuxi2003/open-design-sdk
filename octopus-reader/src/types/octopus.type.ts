import type { components } from 'open-design-api-types'

/**
 * An artboard ID.
 * @category Identification
 */
export type ArtboardId = string

/**
 * A component ID.
 * @category Identification
 */
export type ComponentId = string

/**
 * Artboard content (an octopus document)
 * @category Data
 * @octopusschema OctopusDocument
 */
export type OctopusDocument = components['schemas']['OctopusDocument']
// type OctopusDocument = {
//   'bounds': Bounds
//   'frame': { 'x': number; 'y': number }
//   'layers'?: Array<LayerOctopusData>
//   'hasBackgroundColor'?: boolean
//   'backgroundColor'?: RgbaColor | null
//   'symbolID'?: ComponentId | null
// }

export type Bounds = {
  left?: number
  top?: number
  width?: number
  height?: number
}

export type RgbaColor = { 'r': number; 'g': number; 'b': number; 'a': number }

export type BorderRadiuses = {
  topLeft?: number
  topRight?: number
  bottomRight?: number
  bottomLeft?: number
}

export type Path = {
  'radius'?: BorderRadiuses
}

export type BitmapMetadata = Record<string, unknown>

/**
 * A layer ID.
 * @category Identification
 */
export type LayerId = string

export type FontData = {
  'name': string
  'postScriptName'?: string
  'syntheticPostScriptName'?: boolean
  'type': string
}

export type PatternOctopusData = {
  'filename': string
}

export type ColorFillEffectOctopusData = { 'color': RgbaColor }
export type ColorBorderEffectOctopusData = { 'color': RgbaColor }
export type GradientFillEffectOctopusData = { 'gradient': unknown }
export type GradientBorderEffectOctopusData = { 'gradient': unknown }
export type PatternFillEffectOctopusData = { 'pattern': PatternOctopusData }
export type PatternBorderEffectOctopusData = { 'pattern': PatternOctopusData }

export type FillEffectOctopusData =
  | ColorFillEffectOctopusData
  | GradientFillEffectOctopusData
  | PatternFillEffectOctopusData
export type BorderEffectOctopusData =
  | ColorBorderEffectOctopusData
  | GradientBorderEffectOctopusData
  | PatternBorderEffectOctopusData

/**
 * Layer data (layer octopus)
 * @category Data
 * @octopusschema Layer
 */
export type LayerOctopusData = NonNullable<
  components['schemas']['OctopusDocument']['layers']
>[0]
// export type LayerOctopusData = {
//   'id': LayerId
//   'name': string | null
//   'type': 'layer' | 'shapeLayer' | 'textLayer' | 'groupLayer'
//   'layers'?: Array<LayerOctopusData>
//   'clipped'?: boolean
//   'maskedBy'?: LayerId | null
//   'symbolID'?: string | null
//   'documentId'?: string | null
//   'overrides'?: Array<unknown>
//   'bitmap'?: {
//     'filename': string
//     'bounds': Bounds
//     'metadata'?: BitmapMetadata
//   }
//   'text'?: {
//     'value': string
//     'defaultStyle'?: {
//       'font'?: FontData
//     }
//     'styles'?: Array<{
//       'ranges': Array<{ 'from': number; 'to': number }>
//       'font'?: FontData
//     }>
//   }
//   'shape'?: {
//     'path'?: Path
//     'paths'?: Array<Path>
//   }
//   'effects'?: {
//     'fills'?: Array<FillEffectOctopusData>
//     'borders'?: Array<BorderEffectOctopusData>
//   }
//   'artboard'?: {
//     'color': RgbaColor
//   }
// }
