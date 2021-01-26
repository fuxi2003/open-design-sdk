import type { IBitmap } from './bitmap.iface'
import type {
  LayerOctopusData,
  PatternBorderEffectOctopusData,
  PatternFillEffectOctopusData,
} from './octopus.type'

export interface IEffects {
  readonly octopus: NonNullable<LayerOctopusData['effects']>

  getPatternFills(): Array<IPatternFillEffect>
  getPatternBorders(): Array<IPatternBorderEffect>
}

export interface IPatternFillEffect {
  readonly octopus: PatternFillEffectOctopusData

  getBitmap(): IBitmap | null
}

export interface IPatternBorderEffect {
  readonly octopus: PatternBorderEffectOctopusData

  getBitmap(): IBitmap | null
}
