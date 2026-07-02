// Deterministische Zufallszahlen: xmur3-Hash zum Seeden, mulberry32 als PRNG

export function hashString(str: string): number {
  let h = 1779033703 ^ str.length
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353)
    h = (h << 13) | (h >>> 19)
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507)
  h = Math.imul(h ^ (h >>> 13), 3266489909)
  return (h ^= h >>> 16) >>> 0
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0
  return function () {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Deterministischer Hash für eine Position (z.B. Feature-Platzierung pro Spalte)
export function hashCoords(seed: number, x: number, y: number, z = 0): number {
  let h = seed >>> 0
  h = Math.imul(h ^ (x | 0), 0x9e3779b1)
  h = (h << 13) | (h >>> 19)
  h = Math.imul(h ^ (y | 0), 0x85ebca6b)
  h = (h << 13) | (h >>> 19)
  h = Math.imul(h ^ (z | 0), 0xc2b2ae35)
  h ^= h >>> 16
  return h >>> 0
}

export function coordRandom(seed: number, x: number, y: number, z = 0): number {
  return hashCoords(seed, x, y, z) / 4294967296
}
