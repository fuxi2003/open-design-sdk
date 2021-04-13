import type { IOpenDesignApi } from '@opendesign/api'
import type { IRenderingEngine } from '@opendesign/rendering'
import type { IDesignFacade } from './design-facade.iface'
import type { IDesignFileManager } from './design-file-manager.iface'
import type { ILocalDesignManager } from './local-design-manager.iface'
import type { ISystemFontManager } from './system-font-manager.iface'

export type FontMatchDescriptor = {
  fontFilename: string
  fontPostscriptName: string
  fallback: boolean
}

export interface ISdk {
  isDestroyed(): boolean
  destroy(): Promise<void>

  importDesignFile(filePath: string): Promise<IDesignFacade>
  importDesignLink(url: string): Promise<IDesignFacade>
  openOctopusFile(filePath: string): Promise<IDesignFacade>
  fetchDesignById(designId: string): Promise<IDesignFacade>

  setWorkingDirectory(workingDirectory: string | null): void

  getSystemFont(postscriptName: string): Promise<FontMatchDescriptor | null>
  setFallbackFonts(fallbackFontPostscriptNames: Array<string>): void

  useLocalDesignManager(localDesignManager: ILocalDesignManager): void
  useRenderingEngine(renderingEngine: IRenderingEngine): void
  useDesignFileManager(designFileManager: IDesignFileManager): void
  useSystemFontManager(systemFontManager: ISystemFontManager): void
  useOpenDesignApi(api: IOpenDesignApi): void
}
