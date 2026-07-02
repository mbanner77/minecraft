// Speichern/Laden über localStorage: Welt-Metadaten, veränderte Chunks (RLE-komprimiert,
// Base64-kodiert) und Spielerzustand.

import { SAVE_KEY_PREFIX, GameMode } from './constants'

export interface WorldMeta {
  id: string
  name: string
  seed: number
  mode: GameMode
  createdAt: number
  lastPlayed: number
  timeOfDay: number
}

export interface PlayerSave {
  x: number
  y: number
  z: number
  yaw: number
  pitch: number
  health: number
  hunger: number
  inventory: Array<{ id: number; count: number; durability?: number } | null>
  selectedSlot: number
}

// ---- RLE + Base64 für Chunk-Blockdaten ----

function rleEncode(data: Uint8Array): Uint8Array {
  const out: number[] = []
  let i = 0
  while (i < data.length) {
    const v = data[i]
    let run = 1
    while (i + run < data.length && data[i + run] === v && run < 0xffff) run++
    out.push(v, run & 0xff, (run >> 8) & 0xff)
    i += run
  }
  return new Uint8Array(out)
}

function rleDecode(data: Uint8Array, targetLength: number): Uint8Array {
  const out = new Uint8Array(targetLength)
  let o = 0
  for (let i = 0; i + 2 < data.length + 1 && o < targetLength; i += 3) {
    const v = data[i]
    const run = data[i + 1] | (data[i + 2] << 8)
    out.fill(v, o, Math.min(targetLength, o + run))
    o += run
  }
  return out
}

function toBase64(data: Uint8Array): string {
  let bin = ''
  for (let i = 0; i < data.length; i += 8192) {
    bin += String.fromCharCode(...data.subarray(i, i + 8192))
  }
  return btoa(bin)
}

function fromBase64(s: string): Uint8Array {
  const bin = atob(s)
  const out = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i)
  return out
}

// ---- Storage-Zugriff ----

function storageAvailable(): boolean {
  try {
    return typeof window !== 'undefined' && !!window.localStorage
  } catch {
    return false
  }
}

export function listWorlds(): WorldMeta[] {
  if (!storageAvailable()) return []
  try {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}:worlds`)
    if (!raw) return []
    const list = JSON.parse(raw) as WorldMeta[]
    return list.sort((a, b) => b.lastPlayed - a.lastPlayed)
  } catch {
    return []
  }
}

export function saveWorldMeta(meta: WorldMeta): void {
  if (!storageAvailable()) return
  try {
    const worlds = listWorlds().filter((w) => w.id !== meta.id)
    worlds.push(meta)
    localStorage.setItem(`${SAVE_KEY_PREFIX}:worlds`, JSON.stringify(worlds))
  } catch {
    // Quota erschöpft — Metadaten sind klein, sollte praktisch nie passieren
  }
}

export function deleteWorld(id: string): void {
  if (!storageAvailable()) return
  try {
    const worlds = listWorlds().filter((w) => w.id !== id)
    localStorage.setItem(`${SAVE_KEY_PREFIX}:worlds`, JSON.stringify(worlds))
    // zugehörige Chunk-/Player-Daten entfernen
    const prefix = `${SAVE_KEY_PREFIX}:${id}:`
    const toRemove: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) toRemove.push(key)
    }
    toRemove.forEach((k) => localStorage.removeItem(k))
  } catch {
    // ignorieren
  }
}

export function saveChunkBlocks(worldId: string, chunkKey: string, blocks: Uint8Array): boolean {
  if (!storageAvailable()) return false
  try {
    localStorage.setItem(`${SAVE_KEY_PREFIX}:${worldId}:c:${chunkKey}`, toBase64(rleEncode(blocks)))
    return true
  } catch {
    return false // Quota voll
  }
}

export function loadAllChunks(worldId: string, blockLength: number): Map<string, Uint8Array> {
  const result = new Map<string, Uint8Array>()
  if (!storageAvailable()) return result
  const prefix = `${SAVE_KEY_PREFIX}:${worldId}:c:`
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i)
      if (key && key.startsWith(prefix)) {
        const chunkKey = key.slice(prefix.length)
        const raw = localStorage.getItem(key)
        if (raw) result.set(chunkKey, rleDecode(fromBase64(raw), blockLength))
      }
    }
  } catch {
    // defekte Daten ignorieren
  }
  return result
}

export function savePlayer(worldId: string, player: PlayerSave): void {
  if (!storageAvailable()) return
  try {
    localStorage.setItem(`${SAVE_KEY_PREFIX}:${worldId}:player`, JSON.stringify(player))
  } catch {
    // ignorieren
  }
}

export function loadPlayer(worldId: string): PlayerSave | null {
  if (!storageAvailable()) return null
  try {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}:${worldId}:player`)
    return raw ? (JSON.parse(raw) as PlayerSave) : null
  } catch {
    return null
  }
}
