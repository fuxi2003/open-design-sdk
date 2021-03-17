import type { IRenderingDesign } from './types/rendering-design.iface'

export class RenderingDesign implements IRenderingDesign {
  readonly id: string
  constructor(params: {
    id: string
  }) {
    this.id = params.id
  }
}
