import type { components } from 'open-design-api-types/typescript/octopus'

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

export type Bounds = components['schemas']['Bounds']

export type RgbaColor = components['schemas']['Color']

export type BorderRadiuses = components['schemas']['ShapeRectCornerRadius']

export type Path = components['schemas']['ShapePath']

export type BitmapMetadata = NonNullable<
  components['schemas']['Bitmap']['metadata']
>

/**
 * A layer ID.
 * @category Identification
 */
export type LayerId = string

export type FontData = components['schemas']['Font']

export type PatternOctopusData = components['schemas']['EffectAbstractPattern']

export type ColorFillEffectOctopusData = components['schemas']['EffectFill'] & {
  'color': RgbaColor
}
export type ColorBorderEffectOctopusData = components['schemas']['EffectBorder'] & {
  'color': RgbaColor
}
export type GradientFillEffectOctopusData = components['schemas']['EffectFill'] & {
  'gradient': components['schemas']['EffectAbstractGradient']
}
export type GradientBorderEffectOctopusData = components['schemas']['EffectBorder'] & {
  'gradient': components['schemas']['EffectAbstractGradient']
}
export type PatternFillEffectOctopusData = components['schemas']['EffectFill'] & {
  'pattern': components['schemas']['EffectAbstractPattern']
}
export type PatternBorderEffectOctopusData = components['schemas']['EffectBorder'] & {
  'pattern': components['schemas']['EffectAbstractPattern']
}

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
export type LayerOctopusData = components['schemas']['Layer']

export type Text = components['schemas']['Text']
