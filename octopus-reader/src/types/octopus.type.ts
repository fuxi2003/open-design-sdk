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
