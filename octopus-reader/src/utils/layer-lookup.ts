import type { FileLayerDescriptor } from '../types/file-layer-collection.iface'
import type { ILayer } from '../types/layer.iface'
import type { FileLayerSelector, LayerSelector } from '../types/selectors.type'

const layerDataMatchers = {
  id: (idSelector: LayerSelector['id'], layer: ILayer) => {
    return Array.isArray(idSelector)
      ? idSelector.includes(layer.id)
      : layer.id === idSelector
  },
  type: (typeSelector: LayerSelector['type'], layer: ILayer) => {
    return Array.isArray(typeSelector)
      ? typeSelector.includes(layer.type)
      : layer.type === typeSelector
  },
  name: (nameSelector: LayerSelector['name'], layer: ILayer) => {
    return Array.isArray(nameSelector)
      ? nameSelector.includes(layer.name)
      : nameSelector instanceof RegExp
      ? Boolean(
          typeof layer.name === 'string' && layer.name.match(nameSelector)
        )
      : layer.name === nameSelector
  },
  text: (textSelector: LayerSelector['text'], layer: ILayer) => {
    const text = layer.getText()
    const textContent = text ? text.getTextContent() : null

    return (
      textContent !== null &&
      (Array.isArray(textSelector)
        ? textSelector.includes(textContent)
        : textSelector instanceof RegExp
        ? Boolean(
            typeof textContent === 'string' && textContent.match(textSelector)
          )
        : textContent === textSelector)
    )
  },
  bitmapAssetName: (
    bitmapAssetNameSelector: string | Array<string>,
    layer: ILayer
  ) => {
    const assetDescs = layer.getBitmapAssets({
      depth: 1,
      includePrerendered: true,
    })

    return assetDescs.some((assetDesc) => {
      return Array.isArray(bitmapAssetNameSelector)
        ? bitmapAssetNameSelector.includes(assetDesc.name)
        : assetDesc.name === bitmapAssetNameSelector
    })
  },
  fontPostScriptName: (
    postScriptNameSelector: string | Array<string>,
    layer: ILayer
  ) => {
    const fontDescs = layer.getFonts({
      depth: 1,
    })

    return fontDescs.some((fontDesc) => {
      return Array.isArray(postScriptNameSelector)
        ? postScriptNameSelector.includes(fontDesc.fontPostScriptName)
        : fontDesc.fontPostScriptName === postScriptNameSelector
    })
  },
  visible: (visibleSelector: LayerSelector['visible'], layer: ILayer) => {
    const layerVisible = layer.octopus['visible'] !== false
    return layerVisible === visibleSelector
  },
}

export function matchLayer(
  selector: LayerSelector | ((layer: ILayer) => boolean),
  layer: ILayer
): boolean {
  if (typeof selector === 'function') {
    return selector(layer)
  }

  return (
    (selector.id === undefined || layerDataMatchers.id(selector.id, layer)) &&
    (selector.type === undefined ||
      layerDataMatchers.type(selector.type, layer)) &&
    (selector.name === undefined ||
      layerDataMatchers.name(selector.name, layer)) &&
    (selector.text === undefined ||
      layerDataMatchers.name(selector.text, layer)) &&
    (selector.bitmapAssetName === undefined ||
      layerDataMatchers.bitmapAssetName(selector.bitmapAssetName, layer)) &&
    (selector.fontPostScriptName === undefined ||
      layerDataMatchers.fontPostScriptName(
        selector.fontPostScriptName,
        layer
      )) &&
    (selector.visible === undefined ||
      layerDataMatchers.visible(selector.visible, layer))
  )
}

export function matchFileLayer(
  selector: FileLayerSelector | ((layerDesc: FileLayerDescriptor) => boolean),
  layerDesc: FileLayerDescriptor
): boolean {
  if (typeof selector === 'function') {
    return selector(layerDesc)
  }

  return (
    (selector.artboardId === undefined ||
      layerDesc.artboardId === selector.artboardId) &&
    matchLayer(selector, layerDesc.layer)
  )
}

export function findLayerInLayers(
  selector: LayerSelector | ((layer: ILayer) => boolean),
  layerSubtrees: Array<ILayer>,
  options: Partial<{ depth: number }> = {}
): ILayer | null {
  const depth = options.depth || Infinity

  for (const layer of layerSubtrees) {
    if (matchLayer(selector, layer)) {
      return layer
    }

    const nestedLayerMatch =
      depth === 1
        ? null
        : layer
            .getNestedLayers({ depth: depth - 1 })
            .findLayer(selector, { depth: 1 })
    if (nestedLayerMatch) {
      return nestedLayerMatch
    }
  }

  return null
}

export function findLayersInLayers(
  selector: LayerSelector | ((layer: ILayer) => boolean),
  layerSubtrees: Array<ILayer>,
  options: Partial<{ depth: number }> = {}
): Array<ILayer> {
  const depth = options.depth || Infinity

  return layerSubtrees.flatMap((layer) => {
    const matchedNestedLayers =
      depth === 1
        ? []
        : layer
            .getNestedLayers({ depth: depth - 1 })
            .findLayers(selector, { depth: 1 })
            .getLayers()

    return matchLayer(selector, layer)
      ? [layer].concat(matchedNestedLayers)
      : matchedNestedLayers
  })
}

// --- file layers ---

export function findLayerInFileLayers(
  selector: FileLayerSelector | ((layerDesc: FileLayerDescriptor) => boolean),
  layerSubtrees: Array<FileLayerDescriptor>,
  options: Partial<{ depth: number }> = {}
): FileLayerDescriptor | null {
  const depth = options.depth || Infinity

  for (const { artboardId, layer } of layerSubtrees) {
    if (
      typeof selector !== 'function' &&
      selector.artboardId !== undefined &&
      selector.artboardId !== artboardId
    ) {
      continue
    }

    if (matchFileLayer(selector, { artboardId, layer })) {
      return { artboardId, layer }
    }

    const nestedLayerMatch =
      depth === 1
        ? null
        : layer
            .getNestedLayers({ depth: depth - 1 })
            .findLayer(
              typeof selector === 'function'
                ? (layer: ILayer) => selector({ artboardId, layer })
                : selector
            )

    if (nestedLayerMatch) {
      return { artboardId, layer: nestedLayerMatch }
    }
  }

  return null
}

export function findLayersInFileLayers(
  selector: FileLayerSelector | ((layerDesc: FileLayerDescriptor) => boolean),
  layerSubtrees: Array<FileLayerDescriptor>,
  options: Partial<{ depth: number }> = {}
): Array<FileLayerDescriptor> {
  const depth = options.depth || Infinity

  return layerSubtrees.flatMap(({ artboardId, layer }) => {
    if (
      typeof selector !== 'function' &&
      selector.artboardId !== undefined &&
      selector.artboardId !== artboardId
    ) {
      return []
    }

    const matchedNestedLayers =
      depth === 1
        ? []
        : layer
            .getNestedLayers({ depth: depth - 1 })
            .findLayers(
              typeof selector === 'function'
                ? (layer: ILayer) => selector({ artboardId, layer })
                : selector
            )
            .getLayers()
            .map((nestedLayer) => {
              return { artboardId, layer: nestedLayer }
            })

    return matchFileLayer(selector, { artboardId, layer })
      ? [{ artboardId, layer }].concat(matchedNestedLayers)
      : matchedNestedLayers
  })
}
