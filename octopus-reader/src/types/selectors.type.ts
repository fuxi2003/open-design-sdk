import type { ArtboardId, LayerId } from './ids.type'
import type { LayerOctopusData } from './octopus.type'

export type ArtboardSelector = Partial<{
  id: ArtboardId | Array<ArtboardId>
  name: string | Array<string> | RegExp
}>

export type LayerSelector = Partial<{
  id: LayerId | Array<LayerId>
  type: LayerOctopusData['type'] | Array<LayerOctopusData['type']>
  name: string | null | Array<string | null> | RegExp
  text: string | Array<string> | RegExp
  bitmapAssetName: string | Array<string>
  fontPostScriptName: string | Array<string>
}>
