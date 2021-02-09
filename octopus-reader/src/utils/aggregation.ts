import {
  keepUniqueFileBitmapAssetDescriptors,
  keepUniqueFileFontDescriptors,
} from './assets'

import type { IArtboard } from '../types/artboard.iface'
import type { AggregatedFileBitmapAssetDescriptor } from '../types/bitmap-assets.type'
import type { FileLayerDescriptor } from '../types/file-layer-collection.iface'
import type { AggregatedFileFontDescriptor } from '../types/fonts.type'
import type { LayerId } from '../types/ids.type'
import type { LayerSelector } from '../types/selectors.type'

export function getBitmapAssets(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number; includePrerendered: boolean }>
): Array<AggregatedFileBitmapAssetDescriptor> {
  return keepUniqueFileBitmapAssetDescriptors(
    artboards.flatMap((artboard) => {
      return artboard.getBitmapAssets(options).map((assetDesc) => {
        const { layerIds, ...data } = assetDesc
        return { ...data, artboardLayerIds: { [artboard.id]: layerIds } }
      })
    })
  )
}

export function getFonts(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number }>
): Array<AggregatedFileFontDescriptor> {
  return keepUniqueFileFontDescriptors(
    artboards.flatMap((artboard) => {
      return artboard.getFonts(options).map((assetDesc) => {
        const { layerIds, ...data } = assetDesc
        return { ...data, artboardLayerIds: { [artboard.id]: layerIds } }
      })
    })
  )
}

export function getFlattenedLayers(
  artboards: Array<IArtboard>,
  options: Partial<{ depth: number }> = {}
): Array<FileLayerDescriptor> {
  return artboards.flatMap((artboard) => {
    return artboard.getFlattenedLayers(options).map((layer) => {
      return { artboardId: artboard.id, layer }
    })
  })
}

export function findLayerById(
  artboards: Array<IArtboard>,
  layerId: LayerId
): FileLayerDescriptor | null {
  for (const artboard of artboards) {
    const layer = artboard.getLayerById(layerId)
    if (layer) {
      return { artboardId: artboard.id, layer }
    }
  }

  return null
}

export function findLayersById(
  artboards: Array<IArtboard>,
  layerId: LayerId
): Array<FileLayerDescriptor> {
  const layers = artboards.flatMap((artboard) => {
    const layer = artboard.getLayerById(layerId)
    return layer ? [{ artboardId: artboard.id, layer }] : []
  })

  return layers
}

export function findLayer(
  artboards: Array<IArtboard>,
  selector: LayerSelector,
  options: Partial<{ depth: number }> = {}
): FileLayerDescriptor | null {
  const depthWithinArtboard = options.depth || Infinity

  for (const artboard of artboards) {
    const layer = artboard.findLayer(selector, { depth: depthWithinArtboard })
    if (layer) {
      return { artboardId: artboard.id, layer }
    }
  }

  return null
}

export function findLayers(
  artboards: Array<IArtboard>,
  selector: LayerSelector,
  options: Partial<{ depth: number }> = {}
): Array<FileLayerDescriptor> {
  const depthWithinArtboard = options.depth || Infinity

  const layers = artboards.flatMap((artboard) => {
    return artboard
      .findLayers(selector, { depth: depthWithinArtboard })
      .map((layer) => {
        return { artboardId: artboard.id, layer }
      })
  })

  return layers
}
