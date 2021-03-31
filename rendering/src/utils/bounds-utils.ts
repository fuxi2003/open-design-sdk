import { Bounds } from '../types/bounds.type'

export function parseBounds(
  coordinates: [number, number, number, number]
): { left: number; top: number; width: number; height: number } {
  return {
    left: coordinates[0],
    top: coordinates[1],
    width: coordinates[2] - coordinates[0],
    height: coordinates[3] - coordinates[1],
  }
}

export function serializeBounds(
  bounds: Bounds
): [number, number, number, number] {
  return [
    bounds.left,
    bounds.top,
    bounds.left + bounds.width,
    bounds.top + bounds.height,
  ]
}

export function mergeBounds(prevBounds: Bounds, nextBounds: Bounds): Bounds {
  const left = Math.min(prevBounds.left, nextBounds.left)
  const top = Math.min(prevBounds.top, nextBounds.top)
  const right = Math.max(
    prevBounds.left + prevBounds.width,
    nextBounds.left + nextBounds.width
  )
  const bottom = Math.max(
    prevBounds.top + prevBounds.height,
    nextBounds.top + nextBounds.height
  )

  return {
    left,
    top,
    width: right - left,
    height: bottom - top,
  }
}
