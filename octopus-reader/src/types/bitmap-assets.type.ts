import type { ArtboardId, LayerId } from './ids.type'

export type BitmapAssetDescriptor = {
  name: string
  layerId: LayerId
  prerendered: boolean
}

export type AggregatedBitmapAssetDescriptor = {
  name: string
  layerIds: Array<LayerId>
  prerendered: boolean
}

export type FileBitmapAssetDescriptor = BitmapAssetDescriptor & {
  artboardId: ArtboardId
}

export type AggregatedFileBitmapAssetDescriptor = {
  name: string
  artboardLayerIds: Record<ArtboardId, Array<LayerId>>
  prerendered: boolean
}
