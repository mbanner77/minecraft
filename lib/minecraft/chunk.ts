// Chunk: 16x128x16 Blöcke als Uint8Array plus Lichtdaten (Skylight/Blocklight je 4 Bit)

import { CHUNK_SIZE, WORLD_HEIGHT } from './constants'

export function chunkKey(cx: number, cz: number): string {
  return `${cx},${cz}`
}

export function blockIndex(x: number, y: number, z: number): number {
  // x, z lokal 0..15, y 0..WORLD_HEIGHT-1
  return (y * CHUNK_SIZE + z) * CHUNK_SIZE + x
}

export class Chunk {
  readonly cx: number
  readonly cz: number
  blocks: Uint8Array
  light: Uint8Array // high nibble: Skylight, low nibble: Blocklight
  modified = false // vom Spieler verändert → muss gespeichert werden
  dirty = true // Mesh muss neu gebaut werden
  lightDirty = true

  constructor(cx: number, cz: number) {
    this.cx = cx
    this.cz = cz
    this.blocks = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
    this.light = new Uint8Array(CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)
  }

  get(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_HEIGHT) return 0
    return this.blocks[blockIndex(x, y, z)]
  }

  set(x: number, y: number, z: number, id: number): void {
    if (y < 0 || y >= WORLD_HEIGHT) return
    this.blocks[blockIndex(x, y, z)] = id
  }

  getSkyLight(x: number, y: number, z: number): number {
    if (y >= WORLD_HEIGHT) return 15
    if (y < 0) return 0
    return this.light[blockIndex(x, y, z)] >> 4
  }

  getBlockLight(x: number, y: number, z: number): number {
    if (y < 0 || y >= WORLD_HEIGHT) return 0
    return this.light[blockIndex(x, y, z)] & 0xf
  }

  setSkyLight(x: number, y: number, z: number, v: number): void {
    if (y < 0 || y >= WORLD_HEIGHT) return
    const i = blockIndex(x, y, z)
    this.light[i] = (this.light[i] & 0x0f) | (v << 4)
  }

  setBlockLight(x: number, y: number, z: number, v: number): void {
    if (y < 0 || y >= WORLD_HEIGHT) return
    const i = blockIndex(x, y, z)
    this.light[i] = (this.light[i] & 0xf0) | v
  }

  // Höchster nicht-Luft-Block einer Spalte (für Spawn, Regen, Himmel-Licht)
  highestBlock(x: number, z: number): number {
    for (let y = WORLD_HEIGHT - 1; y >= 0; y--) {
      if (this.blocks[blockIndex(x, y, z)] !== 0) return y
    }
    return 0
  }
}
