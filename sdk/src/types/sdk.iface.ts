import type { IOpenDesignApi } from '@opendesign/api'
import type { IRenderingEngine } from '@opendesign/rendering'
import type { IDesignFacade } from './design-facade.iface'
import type { IDesignFileManager } from './design-file-manager.iface'
import type { ILocalDesignManager } from './local-design-manager.iface'

export interface ISdk {
  openDesignFile(relPath: string): Promise<IDesignFacade>
  openOctopusFile(relPath: string): Promise<IDesignFacade>
  fetchDesignById(designId: string): Promise<IDesignFacade>

  setWorkingDirectory(workingDirectory: string | null): void

  useLocalDesignManager(localDesignManager: ILocalDesignManager): void
  useRenderingEngine(renderingEngine: IRenderingEngine): void
  useDesignFileManager(designFileManager: IDesignFileManager): void
  useOpenDesignApi(api: IOpenDesignApi): void
}
