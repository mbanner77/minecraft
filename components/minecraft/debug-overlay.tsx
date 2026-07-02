'use client'

// F3-Debug-Overlay im Stil des Originals

import type { DebugInfo } from '@/lib/minecraft/engine'

const BIOME_NAMES: Record<string, string> = {
  ocean: 'Ozean',
  beach: 'Strand',
  plains: 'Ebene',
  forest: 'Wald',
  birch_forest: 'Birkenwald',
  desert: 'Wüste',
  mountains: 'Berge',
  snowy: 'Verschneite Ebene',
}

export function DebugOverlay({ info }: { info: DebugInfo }) {
  return (
    <div className="mc-debug mc-root">
      {`Minicraft (${info.fps} fps)\n`}
      {`XYZ: ${info.x.toFixed(3)} / ${info.y.toFixed(3)} / ${info.z.toFixed(3)}\n`}
      {`Block: ${Math.floor(info.x)} ${Math.floor(info.y)} ${Math.floor(info.z)}\n`}
      {`Chunk: ${info.chunkX} ${info.chunkZ}\n`}
      {`Blickrichtung: ${info.facing}\n`}
      {`Biom: ${BIOME_NAMES[info.biome] ?? info.biome}\n`}
      {`Licht: ${info.skyLight} (Himmel), ${info.blockLight} (Block)\n`}
      {`Chunks geladen: ${info.loadedChunks}\n`}
      {`Mobs: ${info.mobs}\n`}
      {`Uhrzeit: ${info.time}`}
    </div>
  )
}
