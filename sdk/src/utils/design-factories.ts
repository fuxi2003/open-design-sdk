import { DesignFacade } from '../design-facade'

import type { IApiDesign } from '@opendesign/api/types'
import type { ManifestData } from '@opendesign/octopus-reader/types'
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

export async function createDesignFromOpenDesignApiDesign(
  apiDesign: IApiDesign,
  params: {
    sdk: Sdk
  }
): Promise<DesignFacade> {
  const design = new DesignFacade({ sdk: params.sdk })

  await design.setApiDesign(apiDesign)

  return design
}
