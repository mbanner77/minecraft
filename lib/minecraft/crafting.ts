// Crafting: geformte und formlose Rezepte für 2x2 (Inventar) und 3x3 (Werkbank),
// dazu Ofen-Rezepte (Schmelzen).

import { Block, Item } from './blocks'

export interface Recipe {
  // pattern: Zeilen mit Zeichen, key ordnet Zeichen einer Item-ID zu, ' ' = leer
  pattern?: string[]
  key?: Record<string, number>
  // formlos: Liste benötigter Zutaten
  ingredients?: number[]
  result: { id: number; count: number }
}

export const RECIPES: Recipe[] = [
  // Grundmaterialien
  { ingredients: [Block.OakLog], result: { id: Block.OakPlanks, count: 4 } },
  { ingredients: [Block.BirchLog], result: { id: Block.BirchPlanks, count: 4 } },
  { pattern: ['P', 'P'], key: { P: Block.OakPlanks }, result: { id: Item.Stick, count: 4 } },
  { pattern: ['P', 'P'], key: { P: Block.BirchPlanks }, result: { id: Item.Stick, count: 4 } },
  { pattern: ['PP', 'PP'], key: { P: Block.OakPlanks }, result: { id: Block.CraftingTable, count: 1 } },
  { pattern: ['PP', 'PP'], key: { P: Block.BirchPlanks }, result: { id: Block.CraftingTable, count: 1 } },
  { pattern: ['CCC', 'C C', 'CCC'], key: { C: Block.Cobblestone }, result: { id: Block.Furnace, count: 1 } },
  { pattern: ['C', 'S'], key: { C: Item.Coal, S: Item.Stick }, result: { id: Block.Torch, count: 4 } },
  { pattern: ['C', 'S'], key: { C: Item.Charcoal, S: Item.Stick }, result: { id: Block.Torch, count: 4 } },

  // Blöcke
  { pattern: ['SS', 'SS'], key: { S: Block.Sand }, result: { id: Block.Sandstone, count: 1 } },
  { pattern: ['SS', 'SS'], key: { S: Block.Stone }, result: { id: Block.StoneBricks, count: 4 } },
  { pattern: ['SS', 'SS'], key: { S: Block.SnowBlock }, result: { id: Block.SnowBlock, count: 1 } },

  // Werkzeuge: Holz
  { pattern: ['PPP', ' S ', ' S '], key: { P: Block.OakPlanks, S: Item.Stick }, result: { id: Item.WoodenPickaxe, count: 1 } },
  { pattern: ['PP', 'PS', ' S'], key: { P: Block.OakPlanks, S: Item.Stick }, result: { id: Item.WoodenAxe, count: 1 } },
  { pattern: ['P', 'S', 'S'], key: { P: Block.OakPlanks, S: Item.Stick }, result: { id: Item.WoodenShovel, count: 1 } },
  { pattern: ['P', 'P', 'S'], key: { P: Block.OakPlanks, S: Item.Stick }, result: { id: Item.WoodenSword, count: 1 } },
  // Werkzeuge: Stein
  { pattern: ['PPP', ' S ', ' S '], key: { P: Block.Cobblestone, S: Item.Stick }, result: { id: Item.StonePickaxe, count: 1 } },
  { pattern: ['PP', 'PS', ' S'], key: { P: Block.Cobblestone, S: Item.Stick }, result: { id: Item.StoneAxe, count: 1 } },
  { pattern: ['P', 'S', 'S'], key: { P: Block.Cobblestone, S: Item.Stick }, result: { id: Item.StoneShovel, count: 1 } },
  { pattern: ['P', 'P', 'S'], key: { P: Block.Cobblestone, S: Item.Stick }, result: { id: Item.StoneSword, count: 1 } },
  // Werkzeuge: Eisen
  { pattern: ['PPP', ' S ', ' S '], key: { P: Item.IronIngot, S: Item.Stick }, result: { id: Item.IronPickaxe, count: 1 } },
  { pattern: ['PP', 'PS', ' S'], key: { P: Item.IronIngot, S: Item.Stick }, result: { id: Item.IronAxe, count: 1 } },
  { pattern: ['P', 'S', 'S'], key: { P: Item.IronIngot, S: Item.Stick }, result: { id: Item.IronShovel, count: 1 } },
  { pattern: ['P', 'P', 'S'], key: { P: Item.IronIngot, S: Item.Stick }, result: { id: Item.IronSword, count: 1 } },
  // Werkzeuge: Gold
  { pattern: ['PPP', ' S ', ' S '], key: { P: Item.GoldIngot, S: Item.Stick }, result: { id: Item.GoldPickaxe, count: 1 } },
  { pattern: ['PP', 'PS', ' S'], key: { P: Item.GoldIngot, S: Item.Stick }, result: { id: Item.GoldAxe, count: 1 } },
  { pattern: ['P', 'S', 'S'], key: { P: Item.GoldIngot, S: Item.Stick }, result: { id: Item.GoldShovel, count: 1 } },
  { pattern: ['P', 'P', 'S'], key: { P: Item.GoldIngot, S: Item.Stick }, result: { id: Item.GoldSword, count: 1 } },
  // Werkzeuge: Diamant
  { pattern: ['PPP', ' S ', ' S '], key: { P: Item.Diamond, S: Item.Stick }, result: { id: Item.DiamondPickaxe, count: 1 } },
  { pattern: ['PP', 'PS', ' S'], key: { P: Item.Diamond, S: Item.Stick }, result: { id: Item.DiamondAxe, count: 1 } },
  { pattern: ['P', 'S', 'S'], key: { P: Item.Diamond, S: Item.Stick }, result: { id: Item.DiamondShovel, count: 1 } },
  { pattern: ['P', 'P', 'S'], key: { P: Item.Diamond, S: Item.Stick }, result: { id: Item.DiamondSword, count: 1 } },

  // Sonstiges
  { pattern: ['GGG', 'G G', 'GGG'], key: { G: Item.GoldIngot }, result: { id: Block.Glowstone, count: 1 } },
  { pattern: ['WWW', 'WWW', 'WWW'], key: { W: Block.TallGrass }, result: { id: Block.WhiteWool, count: 1 } },
]

// Ofen: Eingabe → Ausgabe (Schmelzzeit einheitlich 10s)
export const SMELTING: Record<number, { id: number; count: number }> = {
  [Block.IronOre]: { id: Item.IronIngot, count: 1 },
  [Block.GoldOre]: { id: Item.GoldIngot, count: 1 },
  [Block.Sand]: { id: Block.Glass, count: 1 },
  [Block.Cobblestone]: { id: Block.Stone, count: 1 },
  [Block.OakLog]: { id: Item.Charcoal, count: 1 },
  [Block.BirchLog]: { id: Item.Charcoal, count: 1 },
  [Item.RawPorkchop]: { id: Item.CookedPorkchop, count: 1 },
  [Item.RawMutton]: { id: Item.CookedMutton, count: 1 },
  [Block.Clay]: { id: Block.Bricks, count: 1 },
}

export const SMELT_TIME_S = 10

// Prüft ein Crafting-Gitter (size x size, Slots zeilenweise, null = leer) gegen alle Rezepte
export function matchRecipe(grid: Array<number | null>, size: 2 | 3): Recipe | null {
  for (const recipe of RECIPES) {
    if (recipe.pattern) {
      if (matchShaped(recipe, grid, size)) return recipe
    } else if (recipe.ingredients) {
      if (matchShapeless(recipe, grid)) return recipe
    }
  }
  return null
}

function matchShaped(recipe: Recipe, grid: Array<number | null>, size: 2 | 3): boolean {
  const pattern = recipe.pattern!
  const key = recipe.key!
  const ph = pattern.length
  const pw = Math.max(...pattern.map((r) => r.length))
  if (ph > size || pw > size) return false

  // alle möglichen Verschiebungen des Musters im Gitter testen (auch gespiegelt)
  for (const mirrored of [false, true]) {
    for (let oy = 0; oy <= size - ph; oy++) {
      for (let ox = 0; ox <= size - pw; ox++) {
        let ok = true
        for (let y = 0; y < size && ok; y++) {
          for (let x = 0; x < size && ok; x++) {
            const px = x - ox
            const py = y - oy
            let expected: number | null = null
            if (py >= 0 && py < ph && px >= 0 && px < pw) {
              const row = pattern[py]
              const ch = mirrored ? row[pw - 1 - px] : row[px]
              if (ch && ch !== ' ') expected = key[ch] ?? null
            }
            const actual = grid[y * size + x]
            if ((expected ?? null) !== (actual ?? null)) ok = false
          }
        }
        if (ok) return true
      }
    }
  }
  return false
}

function matchShapeless(recipe: Recipe, grid: Array<number | null>): boolean {
  const needed = [...recipe.ingredients!]
  for (const cell of grid) {
    if (cell === null) continue
    const idx = needed.indexOf(cell)
    if (idx === -1) return false
    needed.splice(idx, 1)
  }
  return needed.length === 0
}
