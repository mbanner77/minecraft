// Prozedural erzeugte 16x16-Texturen im Minecraft-Stil, gepackt in einen Atlas.
// Es werden bewusst KEINE Original-Assets verwendet — alles wird zur Laufzeit gezeichnet.

import { mulberry32, hashString } from './random'

export const TILE = 16

type RGB = [number, number, number]
type RGBA = [number, number, number, number]

interface TileCtx {
  set(x: number, y: number, c: RGB | RGBA): void
  rand(): number
  clear(): void
}

type TileDrawFn = (t: TileCtx) => void

function shade(c: RGB, f: number): RGB {
  return [Math.min(255, c[0] * f) | 0, Math.min(255, c[1] * f) | 0, Math.min(255, c[2] * f) | 0]
}

// Fläche mit leichtem Helligkeitsrauschen füllen — die Basis fast aller Blöcke
function noisyFill(t: TileCtx, base: RGB, variation = 0.12) {
  for (let y = 0; y < TILE; y++) {
    for (let x = 0; x < TILE; x++) {
      const f = 1 - variation + t.rand() * variation * 2
      t.set(x, y, shade(base, f))
    }
  }
}

function speckle(t: TileCtx, color: RGB, count: number, size = 1) {
  for (let i = 0; i < count; i++) {
    const x = (t.rand() * TILE) | 0
    const y = (t.rand() * TILE) | 0
    for (let dy = 0; dy < size; dy++)
      for (let dx = 0; dx < size; dx++)
        if (x + dx < TILE && y + dy < TILE) t.set(x + dx, y + dy, shade(color, 0.9 + t.rand() * 0.2))
  }
}

// Erz: Steinbasis mit farbigen Klumpen
function oreTile(color: RGB, highlight: RGB): TileDrawFn {
  return (t) => {
    noisyFill(t, [125, 125, 125])
    for (let i = 0; i < 5; i++) {
      const cx = 2 + ((t.rand() * 12) | 0)
      const cy = 2 + ((t.rand() * 12) | 0)
      t.set(cx, cy, color)
      t.set(cx + 1, cy, color)
      t.set(cx, cy + 1, highlight)
      if (t.rand() > 0.5) t.set(cx + 1, cy + 1, color)
      if (t.rand() > 0.5) t.set(cx - 1, cy, highlight)
    }
  }
}

function woolTile(base: RGB): TileDrawFn {
  return (t) => {
    noisyFill(t, base, 0.08)
    for (let i = 0; i < 12; i++) {
      const x = (t.rand() * TILE) | 0
      const y = (t.rand() * TILE) | 0
      t.set(x, y, shade(base, 0.85))
    }
    // dezente Web-Linien
    for (let y = 0; y < TILE; y += 4) {
      for (let x = 0; x < TILE; x++) if (t.rand() > 0.6) t.set(x, y, shade(base, 0.92))
    }
  }
}

function plankTile(base: RGB): TileDrawFn {
  return (t) => {
    noisyFill(t, base, 0.08)
    // horizontale Bretter mit versetzten Stößen
    for (let row = 0; row < 4; row++) {
      const y = row * 4
      for (let x = 0; x < TILE; x++) t.set(x, y + 3, shade(base, 0.72))
      const joint = (row % 2 === 0 ? 4 : 11)
      for (let dy = 0; dy < 3; dy++) t.set(joint, y + dy, shade(base, 0.75))
      // Maserung
      for (let x = 0; x < TILE; x++) if (t.rand() > 0.82) t.set(x, y + 1 + ((t.rand() * 2) | 0), shade(base, 0.88))
    }
  }
}

function leavesTile(base: RGB): TileDrawFn {
  return (t) => {
    t.clear()
    for (let y = 0; y < TILE; y++) {
      for (let x = 0; x < TILE; x++) {
        const r = t.rand()
        if (r > 0.16) {
          const f = 0.75 + t.rand() * 0.5
          t.set(x, y, shade(base, f))
        }
        // sonst transparent lassen — Blattwerk wirkt durchbrochen
      }
    }
  }
}

function logSide(bark: RGB, streak: RGB): TileDrawFn {
  return (t) => {
    noisyFill(t, bark, 0.1)
    for (let x = 0; x < TILE; x += 2 + ((x * 7) % 3)) {
      for (let y = 0; y < TILE; y++) {
        if (t.rand() > 0.35) t.set(x, y, streak)
      }
    }
  }
}

// Pixel-Art-Helfer für Items -----------------------------------------------

interface Palette {
  light: RGB
  mid: RGB
  dark: RGB
}

const MATERIALS: Record<string, Palette> = {
  wooden: { light: [186, 152, 98], mid: [162, 130, 78], dark: [104, 78, 47] },
  stone: { light: [160, 160, 160], mid: [125, 125, 125], dark: [82, 82, 82] },
  iron: { light: [236, 236, 236], mid: [204, 204, 204], dark: [140, 140, 140] },
  gold: { light: [252, 238, 75], mid: [234, 204, 33], dark: [162, 130, 10] },
  diamond: { light: [142, 250, 226], mid: [76, 217, 192], dark: [26, 145, 128] },
}

const STICK_LIGHT: RGB = [162, 130, 78]
const STICK_DARK: RGB = [104, 78, 47]

function drawHandle(t: TileCtx, from: number, to: number) {
  // diagonaler Stiel von unten links nach oben rechts (x = 15 - y)
  for (let i = from; i <= to; i++) {
    const x = i
    const y = 15 - i
    t.set(x, y, STICK_LIGHT)
    t.set(x + 1, y, STICK_DARK)
  }
}

function toolTile(kind: 'pickaxe' | 'axe' | 'shovel' | 'sword', mat: Palette): TileDrawFn {
  return (t) => {
    t.clear()
    if (kind === 'pickaxe') {
      drawHandle(t, 1, 10)
      // gebogener Kopf oben
      const head: Array<[number, number]> = [
        [4, 2], [5, 2], [6, 1], [7, 1], [8, 1], [9, 1], [10, 2], [11, 2],
        [3, 3], [12, 3], [2, 4], [13, 4], [2, 5], [13, 5], [1, 6], [14, 6], [14, 7],
      ]
      for (const [x, y] of head) {
        t.set(x, y, mat.mid)
        t.set(x, y + 1, mat.dark)
      }
      for (const [x, y] of [[6, 0], [7, 0], [8, 0], [9, 0]] as Array<[number, number]>) t.set(x, y, mat.light)
    } else if (kind === 'axe') {
      drawHandle(t, 1, 9)
      // Axtblatt oben rechts am Stielende
      for (let y = 1; y <= 6; y++) {
        for (let x = 6; x <= 12; x++) {
          const inBlade = x + y >= 9 && x + y <= 15 && x - y <= 9
          if (inBlade) t.set(x, y, y <= 2 ? mat.light : x + y >= 14 ? mat.dark : mat.mid)
        }
      }
    } else if (kind === 'shovel') {
      drawHandle(t, 1, 9)
      // Schaufelblatt am oberen Ende
      for (let y = 0; y <= 4; y++) {
        for (let x = 10; x <= 14; x++) {
          if (x - 10 + y <= 6 && y - (x - 12) <= 5) {
            t.set(x, y, y === 0 || x === 14 ? mat.light : y >= 3 ? mat.dark : mat.mid)
          }
        }
      }
    } else {
      // Schwert: Klinge diagonal, kurzer Griff
      for (let i = 4; i <= 13; i++) {
        const x = i
        const y = 15 - i
        t.set(x, y, mat.light)
        t.set(x - 1, y, mat.mid)
        t.set(x, y + 1, mat.dark)
      }
      // Parierstange
      t.set(3, 10, STICK_DARK)
      t.set(5, 12, STICK_DARK)
      t.set(4, 11, STICK_DARK)
      // Griff
      t.set(2, 13, STICK_LIGHT)
      t.set(1, 14, STICK_LIGHT)
      t.set(3, 13, STICK_DARK)
      t.set(2, 14, STICK_DARK)
    }
  }
}

// Tile-Registry ---------------------------------------------------------------

const TILE_DRAWERS: Record<string, TileDrawFn> = {
  stone: (t) => noisyFill(t, [125, 125, 125]),
  dirt: (t) => {
    noisyFill(t, [134, 96, 67])
    speckle(t, [104, 72, 48], 14)
  },
  grass_top: (t) => {
    noisyFill(t, [116, 178, 68], 0.16)
    speckle(t, [95, 150, 55], 20)
  },
  grass_side: (t) => {
    noisyFill(t, [134, 96, 67])
    speckle(t, [104, 72, 48], 10)
    for (let x = 0; x < TILE; x++) {
      const depth = 2 + ((t.rand() * 3) | 0)
      for (let y = 0; y < depth; y++) t.set(x, y, shade([116, 178, 68], 0.85 + t.rand() * 0.3))
    }
  },
  grass_side_snow: (t) => {
    noisyFill(t, [134, 96, 67])
    for (let x = 0; x < TILE; x++) {
      const depth = 2 + ((t.rand() * 3) | 0)
      for (let y = 0; y < depth; y++) t.set(x, y, shade([240, 245, 250], 0.92 + t.rand() * 0.1))
    }
  },
  cobblestone: (t) => {
    noisyFill(t, [110, 110, 110])
    // runde Steine
    for (let i = 0; i < 7; i++) {
      const cx = (t.rand() * TILE) | 0
      const cy = (t.rand() * TILE) | 0
      const r = 2 + ((t.rand() * 2) | 0)
      const f = 0.85 + t.rand() * 0.4
      for (let y = -r; y <= r; y++)
        for (let x = -r; x <= r; x++)
          if (x * x + y * y <= r * r && cx + x >= 0 && cx + x < TILE && cy + y >= 0 && cy + y < TILE)
            t.set(cx + x, cy + y, shade([120, 120, 120], f))
    }
    speckle(t, [70, 70, 70], 16)
  },
  mossy_cobblestone: (t) => {
    TILE_DRAWERS.cobblestone(t)
    speckle(t, [88, 128, 64], 22, 2)
  },
  oak_planks: plankTile([162, 130, 78]),
  birch_planks: plankTile([196, 178, 128]),
  bedrock: (t) => {
    noisyFill(t, [70, 70, 70], 0.4)
    speckle(t, [30, 30, 30], 24, 2)
  },
  water: (t) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const f = 0.85 + t.rand() * 0.3
        t.set(x, y, [(47 * f) | 0, (98 * f) | 0, (212 * f) | 0, 170])
      }
  },
  sand: (t) => {
    noisyFill(t, [219, 207, 163], 0.07)
    speckle(t, [190, 178, 132], 14)
  },
  gravel: (t) => {
    noisyFill(t, [131, 127, 126], 0.2)
    speckle(t, [90, 86, 84], 20, 2)
    speckle(t, [160, 156, 154], 12)
  },
  oak_log: logSide([85, 60, 33], [60, 42, 24]),
  birch_log: (t) => {
    noisyFill(t, [216, 215, 210], 0.06)
    // schwarze Birkenflecken
    for (let i = 0; i < 6; i++) {
      const x = (t.rand() * 14) | 0
      const y = (t.rand() * 15) | 0
      t.set(x, y, [40, 40, 38])
      t.set(x + 1, y, [40, 40, 38])
      if (t.rand() > 0.5) t.set(x + 1, y + 1, [70, 70, 66])
    }
  },
  log_top: (t) => {
    noisyFill(t, [85, 60, 33], 0.08)
    // Jahresringe
    const ring: RGB = [162, 130, 78]
    for (let r = 2; r <= 7; r += 2) {
      for (let a = 0; a < 64; a++) {
        const ang = (a / 64) * Math.PI * 2
        const x = Math.round(7.5 + Math.cos(ang) * r)
        const y = Math.round(7.5 + Math.sin(ang) * r)
        if (x >= 1 && x < 15 && y >= 1 && y < 15) t.set(x, y, shade(ring, 0.85 + t.rand() * 0.3))
      }
    }
  },
  oak_leaves: leavesTile([46, 122, 38]),
  birch_leaves: leavesTile([98, 150, 70]),
  glass: (t) => {
    t.clear()
    const frame: RGBA = [210, 235, 240, 255]
    for (let i = 0; i < TILE; i++) {
      t.set(i, 0, frame)
      t.set(i, 15, frame)
      t.set(0, i, frame)
      t.set(15, i, frame)
    }
    // Glanz-Streifen
    for (let i = 2; i < 7; i++) t.set(i, 9 - i, [255, 255, 255, 120])
    for (let i = 4; i < 12; i++) t.set(i, 15 - i + 2, [255, 255, 255, 70])
  },
  ice: (t) => {
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) {
        const f = 0.88 + t.rand() * 0.2
        t.set(x, y, [(155 * f) | 0, (200 * f) | 0, (245 * f) | 0, 220])
      }
    for (let i = 2; i < 9; i++) t.set(i, 12 - i, [235, 248, 255, 240])
  },
  coal_ore: oreTile([45, 45, 45], [20, 20, 20]),
  iron_ore: oreTile([216, 175, 147], [186, 140, 110]),
  gold_ore: oreTile([252, 238, 75], [234, 204, 33]),
  diamond_ore: oreTile([92, 219, 213], [60, 180, 200]),
  crafting_table_top: (t) => {
    plankTile([162, 130, 78])(t)
    // Rasterlinien wie das Crafting-Gitter
    for (let i = 0; i < TILE; i++) {
      t.set(i, 0, [104, 78, 47])
      t.set(i, 15, [104, 78, 47])
      t.set(0, i, [104, 78, 47])
      t.set(15, i, [104, 78, 47])
    }
    for (let i = 3; i < 13; i++) {
      t.set(i, 7, [90, 66, 40])
      t.set(7, i, [90, 66, 40])
    }
  },
  crafting_table_side: (t) => {
    plankTile([162, 130, 78])(t)
    // Werkzeug-Silhouetten angedeutet
    for (let y = 3; y < 8; y++) for (let x = 2; x < 7; x++) if ((x + y) % 2 === 0) t.set(x, y, [104, 78, 47])
    for (let y = 3; y < 8; y++) for (let x = 9; x < 14; x++) if ((x + y) % 3 === 0) t.set(x, y, [90, 66, 40])
  },
  furnace_top: (t) => noisyFill(t, [110, 110, 110]),
  furnace_front: (t) => {
    noisyFill(t, [110, 110, 110])
    // dunkle Öffnung mit Glut
    for (let y = 8; y < 14; y++)
      for (let x = 4; x < 12; x++) t.set(x, y, [35, 30, 28])
    for (let x = 5; x < 11; x++) if (x % 2 === 0) t.set(x, 13, [255, 140, 30])
    for (let y = 2; y < 6; y++) for (let x = 4; x < 12; x++) t.set(x, y, [80, 80, 80])
  },
  torch: (t) => {
    t.clear()
    // Stiel
    for (let y = 6; y < 14; y++) {
      t.set(7, y, STICK_LIGHT)
      t.set(8, y, STICK_DARK)
    }
    // glühender Kopf
    t.set(7, 4, [255, 220, 90])
    t.set(8, 4, [255, 220, 90])
    t.set(7, 5, [255, 160, 40])
    t.set(8, 5, [255, 160, 40])
    t.set(7, 3, [255, 255, 180])
    t.set(8, 3, [255, 255, 180])
  },
  bricks: (t) => {
    const mortar: RGB = [188, 178, 168]
    const brick: RGB = [150, 84, 68]
    for (let y = 0; y < TILE; y++)
      for (let x = 0; x < TILE; x++) t.set(x, y, shade(brick, 0.85 + t.rand() * 0.3))
    for (let row = 0; row < 4; row++) {
      const y = row * 4 + 3
      for (let x = 0; x < TILE; x++) t.set(x, y, mortar)
      const off = row % 2 === 0 ? 7 : 3
      for (let dy = 0; dy < 3; dy++) {
        t.set(off, row * 4 + dy, mortar)
        t.set((off + 8) % TILE, row * 4 + dy, mortar)
      }
    }
  },
  stone_bricks: (t) => {
    noisyFill(t, [122, 122, 122], 0.08)
    const line: RGB = [70, 70, 70]
    for (let row = 0; row < 2; row++) {
      const y = row * 8 + 7
      for (let x = 0; x < TILE; x++) t.set(x, y, line)
      const off = row % 2 === 0 ? 7 : 3
      for (let dy = 0; dy < 7; dy++) t.set(off, row * 8 + dy, line)
    }
    for (let x = 0; x < TILE; x++) t.set(x, 15, line)
  },
  snow: (t) => noisyFill(t, [240, 245, 250], 0.04),
  sandstone: (t) => {
    noisyFill(t, [216, 203, 155], 0.06)
    for (let y = 4; y < TILE; y += 5)
      for (let x = 0; x < TILE; x++) if (t.rand() > 0.3) t.set(x, y, [190, 176, 126])
  },
  sandstone_top: (t) => noisyFill(t, [219, 207, 163], 0.05),
  obsidian: (t) => {
    noisyFill(t, [24, 18, 38], 0.25)
    speckle(t, [64, 46, 96], 8)
  },
  cactus_top: (t) => {
    noisyFill(t, [88, 142, 48], 0.1)
    for (let i = 0; i < TILE; i++) {
      t.set(i, 0, [58, 100, 32])
      t.set(i, 15, [58, 100, 32])
      t.set(0, i, [58, 100, 32])
      t.set(15, i, [58, 100, 32])
    }
  },
  cactus_side: (t) => {
    noisyFill(t, [88, 142, 48], 0.1)
    for (let x = 2; x < TILE; x += 4)
      for (let y = 0; y < TILE; y++) t.set(x, y, shade([58, 100, 32], 0.9 + t.rand() * 0.2))
    // Stacheln
    for (let i = 0; i < 6; i++) t.set((t.rand() * 16) | 0, (t.rand() * 16) | 0, [230, 240, 200])
  },
  dandelion: (t) => {
    t.clear()
    for (let y = 8; y < 15; y++) t.set(7, y, [62, 120, 40])
    t.set(6, 10, [62, 120, 40])
    for (let y = 4; y < 8; y++)
      for (let x = 5; x < 10; x++)
        if (Math.abs(x - 7) + Math.abs(y - 5.5) < 3.2) t.set(x, y, [250, 216, 60])
    t.set(7, 5, [255, 240, 120])
  },
  poppy: (t) => {
    t.clear()
    for (let y = 8; y < 15; y++) t.set(7, y, [62, 120, 40])
    t.set(8, 11, [62, 120, 40])
    for (let y = 3; y < 8; y++)
      for (let x = 5; x < 10; x++)
        if (Math.abs(x - 7) + Math.abs(y - 5) < 3.4) t.set(x, y, [200, 44, 36])
    t.set(7, 5, [40, 30, 30])
  },
  tall_grass: (t) => {
    t.clear()
    for (let i = 0; i < 8; i++) {
      const x = 1 + ((t.rand() * 14) | 0)
      const h = 5 + ((t.rand() * 9) | 0)
      for (let y = 15; y > 15 - h; y--) {
        const bend = y < 15 - h + 3 && t.rand() > 0.5 ? 1 : 0
        t.set(Math.min(15, x + bend), y, shade([96, 158, 58], 0.8 + t.rand() * 0.4))
      }
    }
  },
  dead_bush: (t) => {
    t.clear()
    for (let y = 9; y < 15; y++) t.set(7, y, [118, 84, 46])
    const branches: Array<[number, number, number, number]> = [
      [7, 9, -1, -1], [7, 9, 1, -1], [7, 11, -1, 0], [7, 11, 1, 0], [7, 10, 1, -1],
    ]
    for (const [sx, sy, dx, dy] of branches) {
      let x = sx, y = sy
      for (let i = 0; i < 4; i++) {
        x += dx + (t.rand() > 0.7 ? dx : 0)
        y += dy - (t.rand() > 0.6 ? 1 : 0)
        if (x >= 0 && x < TILE && y >= 0 && y < TILE) t.set(x, y, [118, 84, 46])
      }
    }
  },
  wool_white: woolTile([222, 222, 222]),
  wool_red: woolTile([176, 46, 38]),
  wool_blue: woolTile([53, 57, 157]),
  wool_green: woolTile([94, 124, 22]),
  wool_yellow: woolTile([248, 198, 39]),
  glowstone: (t) => {
    noisyFill(t, [144, 102, 60], 0.15)
    for (let i = 0; i < 8; i++) {
      const cx = 1 + ((t.rand() * 13) | 0)
      const cy = 1 + ((t.rand() * 13) | 0)
      t.set(cx, cy, [255, 220, 120])
      t.set(cx + 1, cy, [252, 188, 82])
      t.set(cx, cy + 1, [252, 188, 82])
    }
  },
  tnt_top: (t) => {
    noisyFill(t, [180, 60, 50], 0.1)
    for (let y = 5; y < 11; y++) for (let x = 5; x < 11; x++) t.set(x, y, [230, 220, 190])
    for (let y = 7; y < 9; y++) for (let x = 7; x < 9; x++) t.set(x, y, [40, 40, 40])
  },
  tnt_bottom: (t) => noisyFill(t, [150, 50, 42], 0.1),
  tnt_side: (t) => {
    noisyFill(t, [190, 64, 54], 0.08)
    for (let y = 6; y < 10; y++) for (let x = 0; x < TILE; x++) t.set(x, y, [230, 220, 190])
    // "TNT"-Pixel
    const glyph = ['X.X..X.X..X.X', 'XXX..XX...XXX']
    for (let x = 2; x < 14; x++) {
      t.set(x, 7, x % 4 === 1 ? [40, 40, 40] : ((x % 2 === 0) ? [40, 40, 40] : [230, 220, 190]))
      void glyph
    }
  },
  pumpkin_top: (t) => {
    noisyFill(t, [196, 116, 24], 0.1)
    for (let y = 6; y < 10; y++) for (let x = 6; x < 10; x++) t.set(x, y, [88, 110, 40])
  },
  pumpkin_side: (t) => {
    noisyFill(t, [208, 126, 28], 0.08)
    for (let x = 2; x < TILE; x += 4)
      for (let y = 0; y < TILE; y++) t.set(x, y, shade([170, 96, 18], 0.9 + t.rand() * 0.2))
  },
  melon_top: (t) => {
    noisyFill(t, [108, 152, 28], 0.1)
    speckle(t, [70, 110, 20], 18)
  },
  melon_side: (t) => {
    noisyFill(t, [108, 152, 28], 0.06)
    for (let x = 1; x < TILE; x += 3)
      for (let y = 0; y < TILE; y++) t.set(x, y, shade([160, 190, 60], 0.9 + t.rand() * 0.2))
  },
  clay: (t) => noisyFill(t, [158, 164, 176], 0.07),

  // ---- Item-Icons ----
  stick: (t) => {
    t.clear()
    for (let i = 3; i <= 11; i++) {
      t.set(i, 14 - i, STICK_LIGHT)
      t.set(i + 1, 14 - i, STICK_DARK)
    }
  },
  coal: (t) => {
    t.clear()
    for (let y = 4; y < 12; y++)
      for (let x = 4; x < 12; x++)
        if ((x - 8) * (x - 8) + (y - 8) * (y - 8) < 15) t.set(x, y, shade([45, 45, 45], 0.8 + t.rand() * 0.5))
    t.set(6, 6, [90, 90, 90])
  },
  charcoal: (t) => {
    t.clear()
    for (let y = 4; y < 12; y++)
      for (let x = 4; x < 12; x++)
        if ((x - 8) * (x - 8) + (y - 8) * (y - 8) < 15) t.set(x, y, shade([58, 48, 40], 0.8 + t.rand() * 0.5))
    t.set(9, 6, [110, 90, 70])
  },
  iron_ingot: ingotTile([220, 220, 220], [160, 160, 160]),
  gold_ingot: ingotTile([250, 224, 60], [190, 150, 20]),
  diamond: (t) => {
    t.clear()
    const c: RGB = [90, 222, 210]
    const hi: RGB = [180, 255, 245]
    const lo: RGB = [40, 160, 150]
    for (let y = 0; y < 10; y++)
      for (let x = 0; x < TILE; x++) {
        const w = y < 4 ? 3 + y * 1.5 : 9 - (y - 4) * 1.5
        if (Math.abs(x - 7.5) < w / 1.4) t.set(x, y + 3, y < 3 ? hi : y > 6 ? lo : c)
      }
  },
  apple: (t) => {
    t.clear()
    for (let y = 5; y < 13; y++)
      for (let x = 4; x < 12; x++)
        if ((x - 7.5) * (x - 7.5) + (y - 9) * (y - 9) < 14) t.set(x, y, shade([196, 40, 30], 0.85 + t.rand() * 0.3))
    t.set(8, 4, [104, 78, 47])
    t.set(8, 3, [104, 78, 47])
    t.set(9, 3, [62, 120, 40])
    t.set(10, 3, [62, 120, 40])
    t.set(5, 7, [255, 150, 140])
  },
  porkchop_raw: meatTile([238, 140, 150], [250, 190, 190]),
  porkchop_cooked: meatTile([168, 110, 60], [220, 170, 110]),
  mutton_raw: meatTile([200, 70, 70], [240, 160, 150]),
  mutton_cooked: meatTile([140, 84, 44], [200, 150, 100]),
}

function ingotTile(main: RGB, dark: RGB): TileDrawFn {
  return (t) => {
    t.clear()
    // zwei gestapelte Barren (Parallelogramme)
    const bar = (x0: number, y0: number) => {
      for (let y = 0; y < 4; y++)
        for (let x = 0; x < 9; x++) {
          const px = x0 + x + (3 - y)
          if (px >= 0 && px < TILE && y0 + y < TILE) t.set(px, y0 + y, y === 0 ? shade(main, 1.1) : y === 3 ? dark : main)
        }
    }
    bar(1, 5)
    bar(3, 9)
  }
}

function meatTile(main: RGB, marble: RGB): TileDrawFn {
  return (t) => {
    t.clear()
    for (let y = 3; y < 13; y++)
      for (let x = 3; x < 13; x++) {
        const d = (x - 8) * (x - 8) * 0.7 + (y - 8) * (y - 8)
        if (d < 22) t.set(x, y, shade(main, 0.85 + t.rand() * 0.3))
      }
    // Knochen
    for (let i = 0; i < 4; i++) t.set(11 + (i > 1 ? 1 : 0), 3 + i, [240, 235, 220])
    // Marmorierung
    for (let i = 0; i < 5; i++) t.set(4 + ((t.rand() * 7) | 0), 5 + ((t.rand() * 6) | 0), marble)
  }
}

// Werkzeuge registrieren
for (const mat of ['wooden', 'stone', 'iron', 'gold', 'diamond'] as const) {
  for (const kind of ['pickaxe', 'axe', 'shovel', 'sword'] as const) {
    TILE_DRAWERS[`${mat}_${kind}`] = toolTile(kind, MATERIALS[mat])
  }
}

// Zerstörungs-Overlays crack_0..crack_9
for (let stage = 0; stage < 10; stage++) {
  TILE_DRAWERS[`crack_${stage}`] = (t) => {
    t.clear()
    const cracks = 2 + stage
    for (let c = 0; c < cracks; c++) {
      let x = (t.rand() * TILE) | 0
      let y = (t.rand() * TILE) | 0
      const len = 3 + stage
      for (let i = 0; i < len; i++) {
        t.set(x, y, [20, 20, 20, 200])
        x += t.rand() > 0.5 ? 1 : -1
        y += t.rand() > 0.5 ? 1 : -1
        x = Math.max(0, Math.min(15, x))
        y = Math.max(0, Math.min(15, y))
      }
    }
  }
}

// Atlas-Erzeugung -------------------------------------------------------------

export interface TextureAtlas {
  canvas: HTMLCanvasElement
  tilesX: number
  tilesY: number
  tileIndex: Map<string, number>
  // UV-Rechteck eines Tiles: [u0, v0, u1, v1] — v ist bereits für three.js (flipY=false) angepasst
  uvRect(key: string): [number, number, number, number]
  indexOf(key: string): number
}

export function buildTextureAtlas(): TextureAtlas {
  const keys = Object.keys(TILE_DRAWERS)
  const tilesX = 16
  const tilesY = Math.ceil(keys.length / tilesX)
  const canvas = document.createElement('canvas')
  canvas.width = tilesX * TILE
  canvas.height = tilesY * TILE
  const ctx = canvas.getContext('2d')!
  const img = ctx.createImageData(canvas.width, canvas.height)
  const data = img.data
  const tileIndex = new Map<string, number>()

  keys.forEach((key, idx) => {
    tileIndex.set(key, idx)
    const ox = (idx % tilesX) * TILE
    const oy = Math.floor(idx / tilesX) * TILE
    const rand = mulberry32(hashString(key))
    const tctx: TileCtx = {
      rand,
      set(x, y, c) {
        if (x < 0 || y < 0 || x >= TILE || y >= TILE) return
        const o = ((oy + y) * canvas.width + ox + x) * 4
        data[o] = c[0]
        data[o + 1] = c[1]
        data[o + 2] = c[2]
        data[o + 3] = c.length > 3 ? (c as RGBA)[3] : 255
      },
      clear() {
        for (let y = 0; y < TILE; y++)
          for (let x = 0; x < TILE; x++) {
            const o = ((oy + y) * canvas.width + ox + x) * 4
            data[o] = 0
            data[o + 1] = 0
            data[o + 2] = 0
            data[o + 3] = 0
          }
      },
    }
    TILE_DRAWERS[key](tctx)
  })

  ctx.putImageData(img, 0, 0)

  return {
    canvas,
    tilesX,
    tilesY,
    tileIndex,
    indexOf(key: string): number {
      const i = tileIndex.get(key)
      if (i === undefined) throw new Error(`Unbekanntes Texture-Tile: ${key}`)
      return i
    },
    uvRect(key: string): [number, number, number, number] {
      const i = this.indexOf(key)
      const tx = i % tilesX
      const ty = Math.floor(i / tilesX)
      // kleiner Inset gegen Texture-Bleeding an Kachelrändern
      const eps = 0.02 / tilesX
      const u0 = tx / tilesX + eps
      const u1 = (tx + 1) / tilesX - eps
      const v0 = ty / tilesY + eps
      const v1 = (ty + 1) / tilesY - eps
      return [u0, v0, u1, v1]
    },
  }
}

// Icon-Erzeugung für das Inventar --------------------------------------------
// Blöcke werden als isometrischer Würfel gezeichnet, Items/Pflanzen flach.

import { getBlock, getItemDef, isBlockId } from './blocks'

const iconCache = new Map<number, string>()

export function itemIconDataURL(atlas: TextureAtlas, id: number): string {
  const cached = iconCache.get(id)
  if (cached) return cached

  const size = 48
  const cv = document.createElement('canvas')
  cv.width = size
  cv.height = size
  const ctx = cv.getContext('2d')!
  ctx.imageSmoothingEnabled = false

  const srcTile = (key: string): [number, number] => {
    const i = atlas.indexOf(key)
    return [(i % atlas.tilesX) * TILE, Math.floor(i / atlas.tilesX) * TILE]
  }

  if (isBlockId(id)) {
    const def = getBlock(id)
    if (def.cross || def.liquid) {
      const [sx, sy] = srcTile(def.tex.side)
      ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 4, 4, size - 8, size - 8)
    } else {
      // Isometrischer Würfel: Top-, Links- (Seite) und Rechts-Fläche (Seite, dunkler)
      const [tx, ty] = srcTile(def.tex.top)
      const [sx, sy] = srcTile(def.tex.side)
      const w = size / 2
      const h = size / 4

      // Oberseite (Raute)
      ctx.save()
      ctx.transform(1, 0.5, -1, 0.5, size / 2, 0)
      ctx.drawImage(atlas.canvas, tx, ty, TILE, TILE, 0, 0, w, w)
      ctx.restore()
      // Linke Seite
      ctx.save()
      ctx.transform(1, 0.5, 0, 1, 0, h)
      ctx.filter = 'brightness(0.75)'
      ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 0, 0, w, w)
      ctx.restore()
      // Rechte Seite
      ctx.save()
      ctx.transform(1, -0.5, 0, 1, size / 2, h + w / 2)
      ctx.filter = 'brightness(0.55)'
      ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 0, 0, w, w)
      ctx.restore()
    }
  } else {
    const def = getItemDef(id)
    if (def) {
      const [sx, sy] = srcTile(def.tex)
      ctx.drawImage(atlas.canvas, sx, sy, TILE, TILE, 2, 2, size - 4, size - 4)
    }
  }

  const url = cv.toDataURL()
  iconCache.set(id, url)
  return url
}
