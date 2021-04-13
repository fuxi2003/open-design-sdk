import type { IApiDesignExport } from '@opendesign/api'

export interface IDesignExportFacade {
  readonly id: IApiDesignExport['id']
  readonly designId: IApiDesignExport['designId']
  readonly status: IApiDesignExport['status']
  readonly resultFormat: IApiDesignExport['resultFormat']

  getResultUrl(): Promise<string>

  getResultStream(): Promise<NodeJS.ReadableStream>
}
