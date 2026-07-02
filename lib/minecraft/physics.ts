// AABB-Physik gegen die Voxel-Welt: Achsen-getrenntes Auflösen (erst Y, dann X, dann Z)

import { World } from './world'
import { getBlock } from './blocks'

export interface PhysicsBody {
  // Position = Mittelpunkt der Grundfläche (Füße)
  x: number
  y: number
  z: number
  vx: number
  vy: number
  vz: number
  width: number
  height: number
  onGround: boolean
  inWater: boolean
  headInWater: boolean
}

function isSolid(world: World, x: number, y: number, z: number): boolean {
  const id = world.getBlockAt(Math.floor(x), Math.floor(y), Math.floor(z))
  if (id === 0) return false
  const def = getBlock(id)
  return def !== undefined && def.solid
}

// Kollidiert die AABB (Körper an Position px/py/pz) mit einem soliden Block?
function collides(world: World, body: PhysicsBody, px: number, py: number, pz: number): boolean {
  const hw = body.width / 2
  const x0 = Math.floor(px - hw)
  const x1 = Math.floor(px + hw - 1e-7)
  const y0 = Math.floor(py)
  const y1 = Math.floor(py + body.height - 1e-7)
  const z0 = Math.floor(pz - hw)
  const z1 = Math.floor(pz + hw - 1e-7)

  for (let y = y0; y <= y1; y++) {
    for (let z = z0; z <= z1; z++) {
      for (let x = x0; x <= x1; x++) {
        if (isSolid(world, x + 0.5, y + 0.5, z + 0.5)) return true
      }
    }
  }
  return false
}

function isLiquidAt(world: World, x: number, y: number, z: number): boolean {
  const id = world.getBlockAt(Math.floor(x), Math.floor(y), Math.floor(z))
  if (id === 0) return false
  const def = getBlock(id)
  return def !== undefined && def.liquid
}

// Bewegt den Körper um (mx, my, mz) mit Kollisionsauflösung.
// sneak: nicht über Kanten laufen (wie Schleichen in Minecraft)
export function moveBody(world: World, body: PhysicsBody, mx: number, my: number, mz: number, sneak = false): void {
  const step = 0.25 // Substeps gegen Tunneling bei hohen Geschwindigkeiten
  const steps = Math.max(1, Math.ceil(Math.max(Math.abs(mx), Math.abs(my), Math.abs(mz)) / step))
  const sx = mx / steps
  const sy = my / steps
  const sz = mz / steps

  for (let i = 0; i < steps; i++) {
    // Y-Achse
    if (sy !== 0) {
      if (!collides(world, body, body.x, body.y + sy, body.z)) {
        body.y += sy
        body.onGround = false
      } else {
        if (sy < 0) body.onGround = true
        body.vy = 0
        // an Blockgrenze ausrichten
        if (sy < 0) body.y = Math.floor(body.y + sy) + 1
        else body.y = Math.floor(body.y + body.height + sy) - body.height
      }
    }

    // Schleichen: nicht von der Kante fallen
    const guard = (nx: number, nz: number): boolean => {
      if (!sneak || !body.onGround) return false
      return !collides(world, body, nx, body.y - 0.1, nz) // kein Boden unter neuer Position
    }

    // X-Achse
    if (sx !== 0) {
      if (!collides(world, body, body.x + sx, body.y, body.z) && !guard(body.x + sx, body.z)) {
        body.x += sx
      } else {
        body.vx = 0
      }
    }

    // Z-Achse
    if (sz !== 0) {
      if (!collides(world, body, body.x, body.y, body.z + sz) && !guard(body.x, body.z + sz)) {
        body.z += sz
      } else {
        body.vz = 0
      }
    }
  }

  // Boden-Status aktualisieren (auch ohne Y-Bewegung, z.B. nach Blockabbau)
  if (body.vy <= 0) {
    body.onGround = collides(world, body, body.x, body.y - 0.05, body.z)
  }

  // Wasser-Status
  body.inWater = isLiquidAt(world, body.x, body.y + 0.3, body.z) || isLiquidAt(world, body.x, body.y + body.height * 0.5, body.z)
  body.headInWater = isLiquidAt(world, body.x, body.y + body.height - 0.15, body.z)
}

export function bodyCollidesAt(world: World, body: PhysicsBody, x: number, y: number, z: number): boolean {
  return collides(world, body, x, y, z)
}

// Prüft, ob eine Block-Position mit der AABB eines Körpers überlappt (fürs Platzieren)
export function blockIntersectsBody(bx: number, by: number, bz: number, body: PhysicsBody): boolean {
  const hw = body.width / 2
  return (
    bx + 1 > body.x - hw &&
    bx < body.x + hw &&
    by + 1 > body.y &&
    by < body.y + body.height &&
    bz + 1 > body.z - hw &&
    bz < body.z + hw
  )
}
