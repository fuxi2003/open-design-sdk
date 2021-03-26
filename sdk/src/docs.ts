import type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader'

import type { BlendingMode } from '@opendesign/rendering'

import type { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
import type { DesignFacade } from './design-facade'
import type { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import type { LayerFacade } from './layer-facade'
import type { PageFacade } from './page-facade'
import type { Sdk } from './sdk'

import type {
  createSdk,
  createOfflineSdk,
  createOnlineSdk,
  createUncachedSdk,
} from './index'

export type { createSdk, createOfflineSdk, createOnlineSdk, createUncachedSdk }

export type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  BlendingMode,
  ComponentId,
  FileLayerSelector,
  LayerAttributesConfig,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
}

export type {
  ArtboardFacade,
  DesignFacade,
  DesignLayerCollectionFacade,
  LayerFacade,
  PageFacade,
  Sdk,
}
