// Chunk-Meshing: sichtbare Flächen (Culling), Smooth Lighting, Ambient Occlusion,
// Pflanzen als X-Quads, Wasser mit abgesenkter Oberfläche in separater Geometrie.

import { Chunk } from './chunk'
import { CHUNK_SIZE, WORLD_HEIGHT } from './constants'
import { World } from './world'
import { getBlock, Block, BlockDef } from './blocks'
import { TextureAtlas } from './textures'

export interface GeometryData {
  positions: Float32Array
  uvs: Float32Array
  light: Float32Array // 2 pro Vertex: Skylight, Blocklight (0..1)
  ao: Float32Array // 1 pro Vertex
  indices: Uint32Array
}

interface Builder {
  positions: number[]
  uvs: number[]
  light: number[]
  ao: number[]
  indices: number[]
  vertexCount: number
}

function newBuilder(): Builder {
  return { positions: [], uvs: [], light: [], ao: [], indices: [], vertexCount: 0 }
}

function finish(b: Builder): GeometryData {
  return {
    positions: new Float32Array(b.positions),
    uvs: new Float32Array(b.uvs),
    light: new Float32Array(b.light),
    ao: new Float32Array(b.ao),
    indices: new Uint32Array(b.indices),
  }
}

// Flächen-Tabelle (Winding: CCW von außen betrachtet)
// corners: [x, y, z, u, v]
const FACES: Array<{
  dir: [number, number, number]
  corners: Array<[number, number, number, number, number]>
}> = [
  { dir: [-1, 0, 0], corners: [[0, 1, 0, 0, 1], [0, 0, 0, 0, 0], [0, 1, 1, 1, 1], [0, 0, 1, 1, 0]] },
  { dir: [1, 0, 0], corners: [[1, 1, 1, 0, 1], [1, 0, 1, 0, 0], [1, 1, 0, 1, 1], [1, 0, 0, 1, 0]] },
  { dir: [0, -1, 0], corners: [[1, 0, 1, 1, 0], [0, 0, 1, 0, 0], [1, 0, 0, 1, 1], [0, 0, 0, 0, 1]] },
  { dir: [0, 1, 0], corners: [[0, 1, 1, 1, 1], [1, 1, 1, 0, 1], [0, 1, 0, 1, 0], [1, 1, 0, 0, 0]] },
  { dir: [0, 0, -1], corners: [[1, 0, 0, 0, 0], [0, 0, 0, 1, 0], [1, 1, 0, 0, 1], [0, 1, 0, 1, 1]] },
  { dir: [0, 0, 1], corners: [[0, 0, 1, 0, 0], [1, 0, 1, 1, 0], [0, 1, 1, 0, 1], [1, 1, 1, 1, 1]] },
]

const AO_VALUES = [0.45, 0.65, 0.82, 1.0]

function texForFace(def: BlockDef, dir: [number, number, number]): string {
  if (dir[1] === 1) return def.tex.top
  if (dir[1] === -1) return def.tex.bottom
  return def.tex.side
}

export function buildChunkGeometry(
  world: World,
  chunk: Chunk,
  atlas: TextureAtlas,
): { opaque: GeometryData; water: GeometryData } {
  const opaque = newBuilder()
  const water = newBuilder()
  const baseX = chunk.cx * CHUNK_SIZE
  const baseZ = chunk.cz * CHUNK_SIZE

  const blockAt = (wx: number, wy: number, wz: number): number => {
    // schneller Pfad innerhalb des Chunks
    const lx = wx - baseX
    const lz = wz - baseZ
    if (lx >= 0 && lx < CHUNK_SIZE && lz >= 0 && lz < CHUNK_SIZE) {
      if (wy < 0 || wy >= WORLD_HEIGHT) return 0
      return chunk.get(lx, wy, lz)
    }
    return world.getBlockAt(wx, wy, wz)
  }

  const isOpaque = (wx: number, wy: number, wz: number): boolean => {
    const id = blockAt(wx, wy, wz)
    if (id === 0) return false
    const d = getBlock(id)
    return d !== undefined && d.opaque
  }

  const lightAt = (wx: number, wy: number, wz: number): [number, number] => {
    return [world.getSkyLightAt(wx, wy, wz) / 15, world.getBlockLightAt(wx, wy, wz) / 15]
  }

  for (let y = 0; y < WORLD_HEIGHT; y++) {
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const id = chunk.get(x, y, z)
        if (id === 0) continue
        const def = getBlock(id)
        if (!def) continue
        const wx = baseX + x
        const wz = baseZ + z

        if (def.cross) {
          addCross(opaque, atlas, def, wx, y, wz, lightAt(wx, y, wz))
          continue
        }

        const isWater = def.liquid
        // Eis hat Alpha < 255 und braucht echtes Blending → Transparent-Pass
        const target = isWater || id === Block.Ice ? water : opaque

        for (const face of FACES) {
          const [dx, dy, dz] = face.dir
          const nx = wx + dx
          const ny = y + dy
          const nz = wz + dz
          const nId = blockAt(nx, ny, nz)

          // Culling: Nachbar verdeckt die Fläche?
          if (nId !== 0) {
            const nDef = getBlock(nId)
            if (nDef) {
              if (isWater) {
                // Wasser: nur Flächen gegen Luft und transparente Nicht-Flüssigkeiten zeigen
                if (nDef.liquid || nDef.opaque) continue
              } else if (nDef.opaque) {
                continue
              } else if (nDef.transparent && nId === id) {
                continue // Glas an Glas, Blätter an Blätter: Innenflächen weglassen
              }
            }
          }

          const tileKey = texForFace(def, face.dir)
          const [u0, v0, u1, v1] = atlas.uvRect(tileKey)

          // Wasseroberfläche absenken, wenn kein Wasser darüber
          let topOffset = 0
          if (isWater && blockAt(wx, y + 1, wz) !== Block.Water) topOffset = -0.125
          // Kaktus-Seiten leicht einrücken
          const inset = id === Block.Cactus && dy === 0 ? 1 / 16 : 0

          const vertLight: Array<[number, number]> = []
          const vertAO: number[] = []

          for (const corner of face.corners) {
            const [cx, cy, cz] = corner
            if (isWater || def.transparent || !def.opaque) {
              // Keine AO/Smooth-Berechnung für Wasser & transparente Blöcke:
              // Licht der Zelle vor der Fläche verwenden
              vertLight.push(lightAt(nx, ny, nz))
              vertAO.push(1)
              continue
            }

            // Smooth Lighting + AO: Zellen um die Vertex-Ecke in der Flächenebene
            let tAxis: number, bAxis: number
            if (dx !== 0) { tAxis = 1; bAxis = 2 } else if (dy !== 0) { tAxis = 0; bAxis = 2 } else { tAxis = 0; bAxis = 1 }
            const cpos = [cx, cy, cz]
            const st = cpos[tAxis] === 1 ? 1 : -1
            const sb = cpos[bAxis] === 1 ? 1 : -1

            const base = [wx + dx, y + dy, wz + dz]
            const side1 = [...base]
            side1[tAxis] += st
            const side2 = [...base]
            side2[bAxis] += sb
            const cornerC = [...base]
            cornerC[tAxis] += st
            cornerC[bAxis] += sb

            const o1 = isOpaque(side1[0], side1[1], side1[2]) ? 1 : 0
            const o2 = isOpaque(side2[0], side2[1], side2[2]) ? 1 : 0
            const oc = isOpaque(cornerC[0], cornerC[1], cornerC[2]) ? 1 : 0
            const aoLevel = o1 && o2 ? 0 : 3 - (o1 + o2 + oc)
            vertAO.push(AO_VALUES[aoLevel])

            // Licht über die (nicht verdeckten) Zellen mitteln
            let sSky = 0
            let sBlock = 0
            let n = 0
            const cells = [base, side1, side2]
            if (!(o1 && o2)) cells.push(cornerC)
            for (const c of cells) {
              if (isOpaque(c[0], c[1], c[2])) continue
              const [sk, bl] = lightAt(c[0], c[1], c[2])
              sSky += sk
              sBlock += bl
              n++
            }
            if (n === 0) {
              vertLight.push(lightAt(base[0], base[1], base[2]))
            } else {
              vertLight.push([sSky / n, sBlock / n])
            }
          }

          // Quad emittieren, Diagonale nach AO kippen (vermeidet Anisotropie-Artefakte)
          const vi = target.vertexCount
          for (let ci = 0; ci < 4; ci++) {
            const [cx, cy, cz, uu, vv] = face.corners[ci]
            let px = wx + cx
            let py = y + cy
            let pz = wz + cz
            if (topOffset !== 0 && cy === 1) py += topOffset
            if (inset > 0) {
              if (dx !== 0) px -= dx * inset
              if (dz !== 0) pz -= dz * inset
            }
            target.positions.push(px, py, pz)
            target.uvs.push(u0 + uu * (u1 - u0), v0 + (1 - vv) * (v1 - v0))
            target.light.push(vertLight[ci][0], vertLight[ci][1])
            target.ao.push(vertAO[ci])
          }
          const flip = vertAO[0] + vertAO[3] < vertAO[1] + vertAO[2]
          if (flip) {
            target.indices.push(vi + 1, vi + 3, vi + 0, vi + 0, vi + 3, vi + 2)
          } else {
            target.indices.push(vi + 0, vi + 1, vi + 2, vi + 2, vi + 1, vi + 3)
          }
          target.vertexCount += 4
        }
      }
    }
  }

  return { opaque: finish(opaque), water: finish(water) }
}

// Pflanzen/Fackeln als zwei gekreuzte, beidseitig sichtbare Quads
function addCross(
  b: Builder,
  atlas: TextureAtlas,
  def: BlockDef,
  wx: number,
  y: number,
  wz: number,
  light: [number, number],
): void {
  const [u0, v0, u1, v1] = atlas.uvRect(def.tex.side)
  const a = 0.146 // (1 - sqrt(2)/2) / 2 → Diagonale im Block
  const quads: Array<Array<[number, number, number]>> = [
    [
      [wx + a, y, wz + a], [wx + 1 - a, y, wz + 1 - a],
      [wx + a, y + 1, wz + a], [wx + 1 - a, y + 1, wz + 1 - a],
    ],
    [
      [wx + 1 - a, y, wz + a], [wx + a, y, wz + 1 - a],
      [wx + 1 - a, y + 1, wz + a], [wx + a, y + 1, wz + 1 - a],
    ],
  ]
  const uvs: Array<[number, number]> = [[0, 0], [1, 0], [0, 1], [1, 1]]

  for (const q of quads) {
    for (const flip of [false, true]) {
      const vi = b.vertexCount
      for (let i = 0; i < 4; i++) {
        const [px, py, pz] = q[i]
        const [uu, vv] = uvs[i]
        b.positions.push(px, py, pz)
        b.uvs.push(u0 + uu * (u1 - u0), v0 + (1 - vv) * (v1 - v0))
        b.light.push(light[0], light[1])
        b.ao.push(1)
      }
      if (flip) b.indices.push(vi + 0, vi + 2, vi + 1, vi + 1, vi + 2, vi + 3)
      else b.indices.push(vi + 0, vi + 1, vi + 2, vi + 1, vi + 3, vi + 2)
      b.vertexCount += 4
    }
  }
}
