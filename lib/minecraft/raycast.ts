// Voxel-Raycast (Amanatides & Woo DDA): findet den anvisierten Block und die Trefffläche

import { World } from './world'
import { getBlock } from './blocks'

export interface RaycastHit {
  x: number
  y: number
  z: number
  // Normale der getroffenen Fläche (zeigt vom Block weg) → Platzierungs-Position
  nx: number
  ny: number
  nz: number
  distance: number
}

export function raycastBlocks(
  world: World,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDistance: number,
  hitLiquids = false,
): RaycastHit | null {
  let x = Math.floor(ox)
  let y = Math.floor(oy)
  let z = Math.floor(oz)

  const stepX = dx > 0 ? 1 : -1
  const stepY = dy > 0 ? 1 : -1
  const stepZ = dz > 0 ? 1 : -1

  const tDeltaX = dx !== 0 ? Math.abs(1 / dx) : Infinity
  const tDeltaY = dy !== 0 ? Math.abs(1 / dy) : Infinity
  const tDeltaZ = dz !== 0 ? Math.abs(1 / dz) : Infinity

  let tMaxX = dx !== 0 ? (dx > 0 ? (x + 1 - ox) / dx : (x - ox) / dx) : Infinity
  let tMaxY = dy !== 0 ? (dy > 0 ? (y + 1 - oy) / dy : (y - oy) / dy) : Infinity
  let tMaxZ = dz !== 0 ? (dz > 0 ? (z + 1 - oz) / dz : (z - oz) / dz) : Infinity

  let nx = 0
  let ny = 0
  let nz = 0
  let t = 0

  while (t <= maxDistance) {
    const id = world.getBlockAt(x, y, z)
    if (id !== 0) {
      const def = getBlock(id)
      if (def && (hitLiquids || !def.liquid)) {
        return { x, y, z, nx, ny, nz, distance: t }
      }
    }

    if (tMaxX < tMaxY && tMaxX < tMaxZ) {
      t = tMaxX
      tMaxX += tDeltaX
      x += stepX
      nx = -stepX
      ny = 0
      nz = 0
    } else if (tMaxY < tMaxZ) {
      t = tMaxY
      tMaxY += tDeltaY
      y += stepY
      nx = 0
      ny = -stepY
      nz = 0
    } else {
      t = tMaxZ
      tMaxZ += tDeltaZ
      z += stepZ
      nx = 0
      ny = 0
      nz = stepZ * -1
    }
  }

  return null
}
