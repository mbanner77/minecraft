// Welt: Chunk-Verwaltung, Block-Zugriff über Weltkoordinaten und das Lichtsystem
// (Skylight + Blocklight als Flutfüllung, wie im Original mit Werten 0..15).

import { Chunk, chunkKey } from './chunk'
import { CHUNK_SIZE, WORLD_HEIGHT, MAX_LIGHT } from './constants'
import { WorldGenerator } from './worldgen'
import { getBlock, Block } from './blocks'

const NEIGHBORS: Array<[number, number, number]> = [
  [1, 0, 0], [-1, 0, 0], [0, 1, 0], [0, -1, 0], [0, 0, 1], [0, 0, -1],
]

// Wie stark ein Block Licht beim Durchgang schluckt (0 = frei, 15 = blockiert)
function lightOpacity(id: number): number {
  if (id === 0) return 0
  const def = getBlock(id)
  if (!def) return 15
  if (def.opaque) return 15
  if (def.liquid) return 2
  if (id === Block.OakLeaves || id === Block.BirchLeaves) return 1
  return 0
}

export class World {
  readonly generator: WorldGenerator
  chunks = new Map<string, Chunk>()
  // Zerstörte/gesetzte Blöcke, die gespeichert werden müssen, markieren Chunks als modified.
  onChunkDirty?: (chunk: Chunk) => void
  // Gespeicherte Chunk-Daten (vom Save-System gesetzt), key -> Uint8Array
  savedChunks = new Map<string, Uint8Array>()

  constructor(generator: WorldGenerator) {
    this.generator = generator
  }

  getChunk(cx: number, cz: number): Chunk | undefined {
    return this.chunks.get(chunkKey(cx, cz))
  }

  hasChunk(cx: number, cz: number): boolean {
    return this.chunks.has(chunkKey(cx, cz))
  }

  ensureChunk(cx: number, cz: number): Chunk {
    const key = chunkKey(cx, cz)
    let chunk = this.chunks.get(key)
    if (chunk) return chunk
    chunk = this.generator.generateChunk(cx, cz)
    const saved = this.savedChunks.get(key)
    if (saved && saved.length === chunk.blocks.length) {
      chunk.blocks.set(saved)
      chunk.modified = true
    }
    this.chunks.set(key, chunk)
    this.initChunkLight(chunk)
    // Nachbar-Meshes wurden ggf. gegen "Luft mit vollem Skylight" gebaut,
    // solange dieser Chunk fehlte → neu meshen (Face-Culling + Licht an der Grenze)
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const n = this.chunks.get(chunkKey(cx + dx, cz + dz))
      if (n) n.dirty = true
    }
    return chunk
  }

  unloadChunk(cx: number, cz: number): Chunk | undefined {
    const key = chunkKey(cx, cz)
    const chunk = this.chunks.get(key)
    if (chunk) {
      if (chunk.modified) this.savedChunks.set(key, new Uint8Array(chunk.blocks))
      this.chunks.delete(key)
    }
    return chunk
  }

  getBlockAt(wx: number, wy: number, wz: number): number {
    if (wy < 0) return Block.Bedrock // unterhalb der Welt: solide
    if (wy >= WORLD_HEIGHT) return 0
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk) return 0
    return chunk.get(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE)
  }

  isLoadedAt(wx: number, wz: number): boolean {
    return this.hasChunk(Math.floor(wx / CHUNK_SIZE), Math.floor(wz / CHUNK_SIZE))
  }

  // Block setzen inkl. Licht-Update und Dirty-Markierung der betroffenen Chunk-Meshes
  setBlockAt(wx: number, wy: number, wz: number, id: number): void {
    if (wy < 0 || wy >= WORLD_HEIGHT) return
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk) return
    const lx = wx - cx * CHUNK_SIZE
    const lz = wz - cz * CHUNK_SIZE
    const oldId = chunk.get(lx, wy, lz)
    if (oldId === id) return

    chunk.set(lx, wy, lz, id)
    chunk.modified = true

    this.updateLightForBlockChange(wx, wy, wz, oldId, id)

    // Betroffene Meshes neu bauen (auch Nachbarn bei Randblöcken)
    this.markDirtyAround(wx, wy, wz)
  }

  markDirtyAround(wx: number, wy: number, wz: number): void {
    for (let dz = -1; dz <= 1; dz++) {
      for (let dx = -1; dx <= 1; dx++) {
        const cx = Math.floor((wx + dx) / CHUNK_SIZE)
        const cz = Math.floor((wz + dz) / CHUNK_SIZE)
        const c = this.chunks.get(chunkKey(cx, cz))
        if (c) c.dirty = true
      }
    }
  }

  markAllDirtyIn(chunks: Set<Chunk>): void {
    for (const c of chunks) c.dirty = true
  }

  // ---- Licht-Zugriff ----

  getSkyLightAt(wx: number, wy: number, wz: number): number {
    if (wy >= WORLD_HEIGHT) return MAX_LIGHT
    if (wy < 0) return 0
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk) return MAX_LIGHT
    return chunk.getSkyLight(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE)
  }

  getBlockLightAt(wx: number, wy: number, wz: number): number {
    if (wy < 0 || wy >= WORLD_HEIGHT) return 0
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk) return 0
    return chunk.getBlockLight(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE)
  }

  private setSkyLightAt(wx: number, wy: number, wz: number, v: number): Chunk | undefined {
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (chunk) chunk.setSkyLight(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE, v)
    return chunk
  }

  private setBlockLightAt(wx: number, wy: number, wz: number, v: number): Chunk | undefined {
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (chunk) chunk.setBlockLight(wx - cx * CHUNK_SIZE, wy, wz - cz * CHUNK_SIZE, v)
    return chunk
  }

  // ---- Licht-Initialisierung pro Chunk ----

  private initChunkLight(chunk: Chunk): void {
    const { cx, cz } = chunk
    const heights = new Int16Array(CHUNK_SIZE * CHUNK_SIZE) // erster lichtundurchlässiger Block von oben

    // 1) Skylight-Säulen von oben füllen — Abschwächung identisch zur BFS-Regel
    //    in propagateLight (volles Licht fällt frei, sonst -max(1, op) pro Schritt),
    //    sonst weicht das Licht nach einem Chunk-Reload vom Flutfüllungs-Fixpunkt ab
    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        let level = MAX_LIGHT
        let y = WORLD_HEIGHT - 1
        for (; y >= 0; y--) {
          const id = chunk.get(x, y, z)
          const op = lightOpacity(id)
          if (op >= 15) break
          if (!(level === MAX_LIGHT && op === 0)) level = Math.max(0, level - Math.max(1, op))
          chunk.setSkyLight(x, y, z, level)
          if (level === 0) break
        }
        heights[z * CHUNK_SIZE + x] = y
      }
    }

    // 2) BFS-Seeds sammeln: Zellen an "Lichtkanten" (Spalte niedriger als Nachbarspalten)
    //    sowie Emitter für Blocklight
    const skyQueue: number[] = [] // wx, wy, wz, level
    const blockQueue: number[] = []

    for (let z = 0; z < CHUNK_SIZE; z++) {
      for (let x = 0; x < CHUNK_SIZE; x++) {
        const own = heights[z * CHUNK_SIZE + x]
        let hmax = own
        if (x > 0) hmax = Math.max(hmax, heights[z * CHUNK_SIZE + x - 1])
        if (x < CHUNK_SIZE - 1) hmax = Math.max(hmax, heights[z * CHUNK_SIZE + x + 1])
        if (z > 0) hmax = Math.max(hmax, heights[(z - 1) * CHUNK_SIZE + x])
        if (z < CHUNK_SIZE - 1) hmax = Math.max(hmax, heights[(z + 1) * CHUNK_SIZE + x])
        // Randspalten immer als Seeds (für Chunk-übergreifende Ausbreitung)
        if (x === 0 || x === CHUNK_SIZE - 1 || z === 0 || z === CHUNK_SIZE - 1) hmax = WORLD_HEIGHT - 1

        // Spalten mit Teil-Abschwächern (Wasser, Blätter) brauchen auch oberhalb
        // von hmax Seeds: bis zum ersten vollen Sonnenlicht hochlaufen
        let first15 = own + 1
        for (let y = own + 1; y < WORLD_HEIGHT; y++) {
          first15 = y
          if (chunk.getSkyLight(x, y, z) === MAX_LIGHT) break
        }

        const top = Math.max(hmax, first15)
        for (let y = own + 1; y <= top; y++) {
          const l = chunk.getSkyLight(x, y, z)
          if (l > 1) skyQueue.push(cx * CHUNK_SIZE + x, y, cz * CHUNK_SIZE + z, l)
        }
      }
    }

    // Emitter (Fackeln, Leuchtstein) im Chunk
    for (let y = 0; y < WORLD_HEIGHT; y++) {
      for (let z = 0; z < CHUNK_SIZE; z++) {
        for (let x = 0; x < CHUNK_SIZE; x++) {
          const id = chunk.get(x, y, z)
          if (id !== 0) {
            const def = getBlock(id)
            if (def && def.light > 0) {
              chunk.setBlockLight(x, y, z, def.light)
              blockQueue.push(cx * CHUNK_SIZE + x, y, cz * CHUNK_SIZE + z, def.light)
            }
          }
        }
      }
    }

    // 3) Licht aus bereits geladenen Nachbar-Chunks hereinfließen lassen
    for (const [dx, dz] of [[1, 0], [-1, 0], [0, 1], [0, -1]] as Array<[number, number]>) {
      const n = this.getChunk(cx + dx, cz + dz)
      if (!n) continue
      // Randreihe des Nachbarn, die an diesen Chunk grenzt
      for (let i = 0; i < CHUNK_SIZE; i++) {
        const nx = dx === 1 ? 0 : dx === -1 ? CHUNK_SIZE - 1 : i
        const nz = dz === 1 ? 0 : dz === -1 ? CHUNK_SIZE - 1 : i
        for (let y = 0; y < WORLD_HEIGHT; y++) {
          const sl = n.getSkyLight(nx, y, nz)
          if (sl > 1) skyQueue.push((cx + dx) * CHUNK_SIZE + nx, y, (cz + dz) * CHUNK_SIZE + nz, sl)
          const bl = n.getBlockLight(nx, y, nz)
          if (bl > 1) blockQueue.push((cx + dx) * CHUNK_SIZE + nx, y, (cz + dz) * CHUNK_SIZE + nz, bl)
        }
      }
    }

    this.propagateLight(skyQueue, 'sky')
    this.propagateLight(blockQueue, 'block')
  }

  // ---- Flutfüllung ----

  private propagateLight(queue: number[], channel: 'sky' | 'block'): Set<Chunk> {
    const touched = new Set<Chunk>()
    let head = 0
    while (head < queue.length) {
      const wx = queue[head]
      const wy = queue[head + 1]
      const wz = queue[head + 2]
      const level = queue[head + 3]
      head += 4
      if (level <= 1) continue
      // Veraltete Seeds überspringen: die Zelle kann seit dem Einreihen dunkler
      // geworden sein (z.B. Frontier-Einträge aus removeLight, die eine spätere
      // Entfernungs-Welle über einen anderen Pfad doch noch genullt hat)
      if (wy < WORLD_HEIGHT) {
        const cur = channel === 'sky' ? this.getSkyLightAt(wx, wy, wz) : this.getBlockLightAt(wx, wy, wz)
        if (cur < level) continue
      }

      for (const [dx, dy, dz] of NEIGHBORS) {
        const nx = wx + dx
        const ny = wy + dy
        const nz = wz + dz
        if (ny < 0 || ny >= WORLD_HEIGHT) continue
        const cxN = Math.floor(nx / CHUNK_SIZE)
        const czN = Math.floor(nz / CHUNK_SIZE)
        const chunk = this.chunks.get(chunkKey(cxN, czN))
        if (!chunk) continue
        const lx = nx - cxN * CHUNK_SIZE
        const lz = nz - czN * CHUNK_SIZE
        const id = chunk.get(lx, ny, lz)
        const op = lightOpacity(id)
        if (op >= 15) continue

        // Sonnenlicht fällt ungeschwächt senkrecht nach unten
        let next: number
        if (channel === 'sky' && dy === -1 && level === MAX_LIGHT && op === 0) {
          next = MAX_LIGHT
        } else {
          next = level - Math.max(1, op)
        }
        if (next <= 0) continue

        const cur = channel === 'sky' ? chunk.getSkyLight(lx, ny, lz) : chunk.getBlockLight(lx, ny, lz)
        if (cur >= next) continue
        if (channel === 'sky') chunk.setSkyLight(lx, ny, lz, next)
        else chunk.setBlockLight(lx, ny, lz, next)
        touched.add(chunk)
        queue.push(nx, ny, nz, next)
      }
    }
    for (const c of touched) c.dirty = true
    return touched
  }

  private removeLight(wx: number, wy: number, wz: number, channel: 'sky' | 'block'): void {
    const get = channel === 'sky' ? this.getSkyLightAt.bind(this) : this.getBlockLightAt.bind(this)
    const set = channel === 'sky' ? this.setSkyLightAt.bind(this) : this.setBlockLightAt.bind(this)

    const old = get(wx, wy, wz)
    if (old === 0) return
    set(wx, wy, wz, 0)

    const removeQueue: number[] = [wx, wy, wz, old]
    const addQueue: number[] = []
    const touched = new Set<Chunk>()
    let head = 0

    while (head < removeQueue.length) {
      const x = removeQueue[head]
      const y = removeQueue[head + 1]
      const z = removeQueue[head + 2]
      const level = removeQueue[head + 3]
      head += 4

      for (const [dx, dy, dz] of NEIGHBORS) {
        const nx = x + dx
        const ny = y + dy
        const nz = z + dz
        if (ny < 0 || ny >= WORLD_HEIGHT) continue
        if (!this.isLoadedAt(nx, nz)) continue
        const nl = get(nx, ny, nz)
        if (nl === 0) continue
        // Senkrechtes Sonnenlicht: 15 unter 15 stammt von oben → mit entfernen
        const fromHere = nl < level || (channel === 'sky' && dy === -1 && level === MAX_LIGHT && nl === MAX_LIGHT)
        if (fromHere) {
          const c = set(nx, ny, nz, 0)
          if (c) touched.add(c)
          removeQueue.push(nx, ny, nz, nl)
        } else {
          // Fremde Lichtquelle — von hier aus wieder auffüllen
          addQueue.push(nx, ny, nz, nl)
        }
      }
    }

    for (const c of touched) c.dirty = true
    this.propagateLight(addQueue, channel)
  }

  private updateLightForBlockChange(wx: number, wy: number, wz: number, oldId: number, newId: number): void {
    const oldDef = oldId !== 0 ? getBlock(oldId) : undefined
    const newDef = newId !== 0 ? getBlock(newId) : undefined
    const oldEmit = oldDef?.light ?? 0
    const newEmit = newDef?.light ?? 0

    // Emission entfernt/geändert
    if (oldEmit > 0) this.removeLight(wx, wy, wz, 'block')

    const newOpacity = lightOpacity(newId)

    // Vorhandenes Licht an der Stelle entfernen (no-op, wenn dort schon 0 ist);
    // bei durchlässigen Blöcken wird es direkt danach korrekt wieder aufgefüllt
    this.removeLight(wx, wy, wz, 'sky')
    if (newEmit === 0) this.removeLight(wx, wy, wz, 'block')

    if (newOpacity < 15) {
      // Block entfernt oder durchlässig(er) geworden: Licht von Nachbarn hereinziehen
      const skyQueue: number[] = []
      const blockQueue: number[] = []
      // Kommt von oben volles Sonnenlicht?
      if (this.getSkyLightAt(wx, wy + 1, wz) === MAX_LIGHT || wy + 1 >= WORLD_HEIGHT) {
        if (newOpacity === 0) {
          this.setSkyLightAt(wx, wy, wz, MAX_LIGHT)
          skyQueue.push(wx, wy, wz, MAX_LIGHT)
        } else if (wy + 1 < WORLD_HEIGHT) {
          skyQueue.push(wx, wy + 1, wz, MAX_LIGHT)
        } else {
          const level = Math.max(0, MAX_LIGHT - Math.max(1, newOpacity))
          this.setSkyLightAt(wx, wy, wz, level)
          if (level > 1) skyQueue.push(wx, wy, wz, level)
        }
      }
      for (const [dx, dy, dz] of NEIGHBORS) {
        // ungeladene Nachbarn liefern Fallback-Skylight 15 → keine Phantom-Seeds
        if (!this.isLoadedAt(wx + dx, wz + dz)) continue
        const sl = this.getSkyLightAt(wx + dx, wy + dy, wz + dz)
        if (sl > 1) skyQueue.push(wx + dx, wy + dy, wz + dz, sl)
        const bl = this.getBlockLightAt(wx + dx, wy + dy, wz + dz)
        if (bl > 1) blockQueue.push(wx + dx, wy + dy, wz + dz, bl)
      }
      this.propagateLight(skyQueue, 'sky')
      this.propagateLight(blockQueue, 'block')
    }

    // Neue Emission
    if (newEmit > 0) {
      this.setBlockLightAt(wx, wy, wz, newEmit)
      this.propagateLight([wx, wy, wz, newEmit], 'block')
    }
  }

  // Höchster Nicht-Luft-Block (Weltkoordinaten)
  highestBlockAt(wx: number, wz: number): number {
    const cx = Math.floor(wx / CHUNK_SIZE)
    const cz = Math.floor(wz / CHUNK_SIZE)
    const chunk = this.chunks.get(chunkKey(cx, cz))
    if (!chunk) return 0
    return chunk.highestBlock(wx - cx * CHUNK_SIZE, wz - cz * CHUNK_SIZE)
  }
}
