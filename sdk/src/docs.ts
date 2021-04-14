import type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  ComponentId,
  FileLayerSelector,
  IBitmap,
  IBitmapMask,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
} from '@opendesign/octopus-reader'

import type { BlendingMode } from '@opendesign/rendering'

import type { ArtboardFacade, LayerAttributesConfig } from './artboard-facade'
import type { DesignExportFacade } from './design-export-facade'
import type { DesignFacade } from './design-facade'
import type { DesignLayerCollectionFacade } from './design-layer-collection-facade'
import type { LayerFacade } from './layer-facade'
import type { FontDescriptor } from './types/layer-facade.iface'
import type { BitmapAssetDescriptor } from './types/local-design.iface'
import type { PageFacade } from './page-facade'
import type { Sdk } from './sdk'

import type { createSdk } from './index'

export type { createSdk }

export type {
  ArtboardId,
  ArtboardOctopusData,
  ArtboardSelector,
  BitmapAssetDescriptor,
  BlendingMode,
  ComponentId,
  FileLayerSelector,
  FontDescriptor,
  IBitmap,
  IBitmapMask,
  LayerAttributesConfig,
  LayerId,
  LayerOctopusData,
  LayerSelector,
  PageId,
  PageSelector,
}

export type {
  ArtboardFacade,
  DesignExportFacade,
  DesignFacade,
  DesignLayerCollectionFacade,
  LayerFacade,
  PageFacade,
  Sdk,
}
