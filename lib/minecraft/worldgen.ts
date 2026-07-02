// Weltgenerierung: Biome, Terrain-Höhen, Höhlen, Erze und Vegetation.
// Alles deterministisch aus dem Seed — derselbe Seed erzeugt dieselbe Welt.

import { Chunk } from './chunk'
import { CHUNK_SIZE, WORLD_HEIGHT, SEA_LEVEL } from './constants'
import { SimplexNoise } from './noise'
import { Block } from './blocks'
import { coordRandom, hashCoords } from './random'

export type Biome = 'ocean' | 'beach' | 'plains' | 'forest' | 'birch_forest' | 'desert' | 'mountains' | 'snowy'

export class WorldGenerator {
  readonly seed: number
  private heightNoise: SimplexNoise
  private detailNoise: SimplexNoise
  private biomeNoise: SimplexNoise
  private tempNoise: SimplexNoise
  private caveNoise: SimplexNoise
  private caveNoise2: SimplexNoise
  private oreNoise: SimplexNoise

  constructor(seed: number) {
    this.seed = seed
    this.heightNoise = new SimplexNoise(seed)
    this.detailNoise = new SimplexNoise(seed + 101)
    this.biomeNoise = new SimplexNoise(seed + 202)
    this.tempNoise = new SimplexNoise(seed + 303)
    this.caveNoise = new SimplexNoise(seed + 404)
    this.caveNoise2 = new SimplexNoise(seed + 505)
    this.oreNoise = new SimplexNoise(seed + 606)
  }

  // Kontinentalität + Bergigkeit → Geländehöhe
  terrainHeight(wx: number, wz: number): number {
    const continental = this.heightNoise.fbm2D(wx * 0.0018, wz * 0.0018, 4)
    const hills = this.detailNoise.fbm2D(wx * 0.008, wz * 0.008, 4)
    const mountains = this.biomeNoise.fbm2D(wx * 0.004, wz * 0.004, 3)

    let h = SEA_LEVEL + continental * 22 + hills * 8
    // Berge dort, wo mountainNoise hoch ist
    const m = Math.max(0, mountains - 0.25) / 0.75
    h += m * m * 46

    return Math.max(4, Math.min(WORLD_HEIGHT - 4, Math.floor(h)))
  }

  biomeAt(wx: number, wz: number): Biome {
    const h = this.terrainHeight(wx, wz)
    const temp = this.tempNoise.fbm2D(wx * 0.0016 + 500, wz * 0.0016 + 500, 3)
    const moisture = this.biomeNoise.fbm2D(wx * 0.0025 - 800, wz * 0.0025 - 800, 3)

    if (h < SEA_LEVEL - 2) return 'ocean'
    if (h <= SEA_LEVEL + 1) return 'beach'
    if (h > SEA_LEVEL + 34) return temp < 0.1 ? 'snowy' : 'mountains'
    if (temp < -0.35) return 'snowy'
    if (temp > 0.4 && moisture < 0.0) return 'desert'
    if (moisture > 0.22) return temp > 0.05 ? 'forest' : 'birch_forest'
    return 'plains'
  }

  private isCave(wx: number, y: number, wz: number): boolean {
    if (y <= 4) return false
    // zwei verschränkte 3D-Noise-Bänder ergeben röhrenartige Höhlen
    const n1 = this.caveNoise.noise3D(wx * 0.02, y * 0.035, wz * 0.02)
    const n2 = this.caveNoise2.noise3D(wx * 0.02 + 300, y * 0.035, wz * 0.02 + 300)
    if (Math.abs(n1) < 0.09 && Math.abs(n2) < 0.09) return true
    // größere Kavernen in der Tiefe
    if (y < 32) {
      const big = this.caveNoise.fbm3D(wx * 0.015, y * 0.02, wz * 0.015, 2)
      if (big > 0.52) return true
    }
    return false
  }

  private oreAt(wx: number, y: number, wz: number): number {
    // Erz-Adern über 3D-Noise + Positions-Hash, tiefenabhängig
    const r = coordRandom(this.seed ^ 0x5eed, wx, y, wz)
    const vein = this.oreNoise.noise3D(wx * 0.09, y * 0.09, wz * 0.09)

    if (y < 14 && vein > 0.62 && r < 0.35) return Block.DiamondOre
    if (y < 30 && vein < -0.62 && r < 0.4) return Block.GoldOre
    if (y < 56 && Math.abs(vein) > 0.66 && r < 0.5) return Block.IronOre
    if (y < 100 && Math.abs(vein) > 0.6 && r < 0.55) return Block.CoalOre
    if (y < 40 && vein > 0.55 && vein < 0.6 && r < 0.3) return Block.Gravel
    return 0
  }

  generateChunk(cx: number, cz: number): Chunk {
    const chunk = new Chunk(cx, cz)
    const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE)
    const biomes: Biome[] = new Array(CHUNK_SIZE * CHUNK_SIZE)

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const wx = cx * CHUNK_SIZE + x
        const wz = cz * CHUNK_SIZE + z
        const h = this.terrainHeight(wx, wz)
        const biome = this.biomeAt(wx, wz)
        heights[z * CHUNK_SIZE + x] = h
        biomes[z * CHUNK_SIZE + x] = biome

        for (let y = 0; y <= Math.max(h, SEA_LEVEL); y++) {
          let id = 0

          if (y === 0) {
            id = Block.Bedrock
          } else if (y <= 2 && coordRandom(this.seed ^ 0xbed, wx, y, wz) < 0.5) {
            id = Block.Bedrock
          } else if (y <= h) {
            if (this.isCave(wx, y, wz) && !(y >= h - 1 && h <= SEA_LEVEL + 1)) {
              id = 0 // Höhle (aber nicht direkt unter Meeresboden-Oberfläche öffnen)
            } else if (y === h) {
              id = this.surfaceBlock(biome, h)
            } else if (y >= h - 3) {
              id = this.subSurfaceBlock(biome)
            } else {
              id = this.oreAt(wx, y, wz) || Block.Stone
            }
          } else if (y <= SEA_LEVEL) {
            id = biome === 'snowy' && y === SEA_LEVEL ? Block.Ice : Block.Water
          }

          if (id !== 0) chunk.set(x, y, z, id)
        }
      }
    }

    this.placeFeatures(chunk, heights, biomes)
    return chunk
  }

  private surfaceBlock(biome: Biome, h: number): number {
    switch (biome) {
      case 'desert':
      case 'beach':
        return Block.Sand
      case 'ocean':
        return h < SEA_LEVEL - 8 ? Block.Gravel : Block.Sand
      case 'snowy':
        return Block.SnowyGrass
      case 'mountains':
        return h > SEA_LEVEL + 44 ? Block.Stone : Block.Grass
      default:
        return Block.Grass
    }
  }

  private subSurfaceBlock(biome: Biome): number {
    switch (biome) {
      case 'desert':
      case 'beach':
        return Block.Sandstone
      case 'ocean':
        return Block.Sand
      default:
        return Block.Dirt
    }
  }

  // Bäume, Kakteen, Blumen, Gras — deterministisch pro Spalte.
  // Bäume werden nur platziert, wenn die Krone komplett im Chunk liegt (2 Rand-Puffer),
  // damit keine Chunk-übergreifende Generierung nötig ist.
  private placeFeatures(chunk: Chunk, heights: Int16Array, biomes: Biome[]): void {
    const { cx, cz } = chunk
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const h = heights[z * CHUNK_SIZE + x]
        const biome = biomes[z * CHUNK_SIZE + x]
        const wx = cx * CHUNK_SIZE + x
        const wz = cz * CHUNK_SIZE + z
        if (chunk.get(x, h, z) === 0) continue // Höhle hat Oberfläche entfernt
        const surface = chunk.get(x, h, z)
        const r = coordRandom(this.seed ^ 0xf00d, wx, 0, wz)

        if ((biome === 'forest' || biome === 'birch_forest') && x >= 2 && x <= 13 && z >= 2 && z <= 13) {
          if (r < 0.02 && surface === Block.Grass) {
            this.placeTree(chunk, x, h + 1, z, biome === 'birch_forest' || r < 0.004)
            continue
          }
        }
        if (biome === 'plains' && x >= 2 && x <= 13 && z >= 2 && z <= 13 && r < 0.003 && surface === Block.Grass) {
          this.placeTree(chunk, x, h + 1, z, false)
          continue
        }

        if (biome === 'desert') {
          if (r < 0.005 && surface === Block.Sand && h > SEA_LEVEL) {
            const height = 1 + (hashCoords(this.seed, wx, 1, wz) % 3)
            for (let i = 1; i <= height; i++) chunk.set(x, h + i, z, Block.Cactus)
          } else if (r >= 0.005 && r < 0.008 && surface === Block.Sand) {
            chunk.set(x, h + 1, z, Block.DeadBush)
          }
          continue
        }

        if (surface === Block.Grass) {
          if (r >= 0.09 && r < 0.12) chunk.set(x, h + 1, z, Block.TallGrass)
          else if (r >= 0.12 && r < 0.135) chunk.set(x, h + 1, z, r < 0.128 ? Block.Dandelion : Block.Poppy)
          else if (r >= 0.135 && r < 0.1362 && biome === 'plains') chunk.set(x, h + 1, z, Block.Pumpkin)
          else if (r >= 0.14 && r < 0.1405 && biome === 'plains') chunk.set(x, h + 1, z, Block.Melon)
        }
        if (biome === 'snowy' && surface === Block.SnowyGrass && r < 0.02) {
          chunk.set(x, h + 1, z, Block.SnowBlock)
        }
      }
    }
  }

  private placeTree(chunk: Chunk, x: number, y: number, z: number, birch: boolean): void {
    const log = birch ? Block.BirchLog : Block.OakLog
    const leaves = birch ? Block.BirchLeaves : Block.OakLeaves
    const height = 4 + (hashCoords(this.seed, chunk.cx * 16 + x, 7, chunk.cz * 16 + z) % 3)

    if (y + height + 2 >= WORLD_HEIGHT) return

    // Krone
    for (let dy = height - 2; dy <= height + 1; dy++) {
      const radius = dy >= height ? 1 : 2
      for (let dz = -radius; dz <= radius; dz++) {
        for (let dx = -radius; dx <= radius; dx++) {
          if (dx === 0 && dz === 0 && dy < height) continue
          // Ecken der Krone ausdünnen
          if (Math.abs(dx) === radius && Math.abs(dz) === radius) {
            if (coordRandom(this.seed, chunk.cx * 16 + x + dx, y + dy, chunk.cz * 16 + z + dz) < 0.5) continue
          }
          const tx = x + dx
          const tz = z + dz
          if (tx < 0 || tx >= CHUNK_SIZE || tz < 0 || tz >= CHUNK_SIZE) continue
          if (chunk.get(tx, y + dy, tz) === 0) chunk.set(tx, y + dy, tz, leaves)
        }
      }
    }
    // Stamm
    for (let i = 0; i < height; i++) chunk.set(x, y + i, z, log)
  }

  // Sicherer Spawnpunkt nahe 0,0: höchster Block, kein Wasser
  findSpawn(): { x: number; y: number; z: number } {
    for (let r = 0; r < 64; r += 4) {
      for (let a = 0; a < 8; a++) {
        const x = Math.round(Math.cos((a / 8) * Math.PI * 2) * r)
        const z = Math.round(Math.sin((a / 8) * Math.PI * 2) * r)
        const h = this.terrainHeight(x, z)
        if (h > SEA_LEVEL + 1) {
          return { x: x + 0.5, y: h + 2, z: z + 0.5 }
        }
      }
    }
    return { x: 0.5, y: this.terrainHeight(0, 0) + 2, z: 0.5 }
  }
}
