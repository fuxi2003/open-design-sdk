import { DesignFacade } from '../design-facade'

import type { ManifestData } from '../../../octopus-reader/src/docs'
import type { Sdk } from '../sdk'

export function createDesignFromManifest(
  manifest: ManifestData,
  params: {
    sdk: Sdk
    filename?: string | null
  }
): DesignFacade {
  const design = new DesignFacade(params)
  design.setManifest(manifest)
  return design
}
