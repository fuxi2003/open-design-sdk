import type { ArtboardId, LayerId, PageId } from './ids.type'
import type { LayerOctopusData } from './octopus.type'

/** @category Page Lookup */
export type PageSelector = {
  id?: PageId | Array<PageId>
  name?: string | Array<string> | RegExp
}

/** @category Artboard Lookup */
export type ArtboardSelector = {
  id?: ArtboardId | Array<ArtboardId>
  name?: string | Array<string> | RegExp
}

/** @category Layer Lookup */
export type LayerSelector = {
  id?: LayerId | Array<LayerId>
  type?: LayerOctopusData['type'] | Array<LayerOctopusData['type']>
  name?: string | null | Array<string | null> | RegExp
  text?: string | Array<string> | RegExp
  bitmapAssetName?: string | Array<string>
  fontPostScriptName?: string | Array<string>
  visible?: boolean
}

/** @category Layer Lookup */
export type FileLayerSelector = {
  artboardId?: ArtboardId | Array<ArtboardId>
  /**
   * A layer ID or a list of layer IDs for which to search.
   */
  id?: LayerId | Array<LayerId>
  type?: LayerOctopusData['type'] | Array<LayerOctopusData['type']>
  name?: string | null | Array<string | null> | RegExp
  text?: string | Array<string> | RegExp
  bitmapAssetName?: string | Array<string>
  fontPostScriptName?: string | Array<string>
  visible?: boolean
}
