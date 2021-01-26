import type { BorderRadiuses, LayerOctopusData } from '../types/octopus.type'
import type { IShape } from '../types/shape.iface'

export class Shape implements IShape {
  readonly octopus: NonNullable<LayerOctopusData['shape']>

  constructor(shapeDesc: NonNullable<LayerOctopusData['shape']>) {
    this.octopus = shapeDesc
  }

  getBorderRadius(): number | null {
    const borderRadiuses = this.getBorderRadiuses()
    return borderRadiuses &&
      borderRadiuses.topLeft === borderRadiuses.topRight &&
      borderRadiuses.topLeft === borderRadiuses.bottomLeft &&
      borderRadiuses.topLeft === borderRadiuses.bottomRight
      ? borderRadiuses.topLeft
      : null
  }

  getBorderRadiuses(): BorderRadiuses | null {
    const paths = this.octopus['paths'] || []
    const onlyPath = paths.length === 1 ? paths[0] : null
    return onlyPath ? onlyPath['radius'] || null : null
  }
}
