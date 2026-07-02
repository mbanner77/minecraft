// Block- und Item-Registry: IDs, Eigenschaften, Abbau-Härte, Drops, Rezept-Grundlagen.
// Block-IDs < 256, Item-IDs >= 256 (wie im Original). IDs sind Teil des Speicherformats
// und dürfen nicht umnummeriert werden.

export const Block = {
  Air: 0,
  Stone: 1,
  Grass: 2,
  Dirt: 3,
  Cobblestone: 4,
  OakPlanks: 5,
  Bedrock: 6,
  Water: 7,
  Sand: 8,
  Gravel: 9,
  OakLog: 10,
  OakLeaves: 11,
  Glass: 12,
  CoalOre: 13,
  IronOre: 14,
  GoldOre: 15,
  DiamondOre: 16,
  CraftingTable: 17,
  Furnace: 18,
  Torch: 19,
  Bricks: 20,
  SnowyGrass: 21,
  Sandstone: 22,
  Obsidian: 23,
  BirchLog: 24,
  BirchLeaves: 25,
  BirchPlanks: 26,
  Cactus: 27,
  Dandelion: 28,
  Poppy: 29,
  TallGrass: 30,
  DeadBush: 31,
  MossyCobblestone: 32,
  StoneBricks: 33,
  WhiteWool: 34,
  RedWool: 35,
  BlueWool: 36,
  GreenWool: 37,
  YellowWool: 38,
  Glowstone: 39,
  Tnt: 40,
  Pumpkin: 41,
  Melon: 42,
  Ice: 43,
  SnowBlock: 44,
  Clay: 45,
} as const

export const Item = {
  Stick: 256,
  Coal: 257,
  Charcoal: 258,
  IronIngot: 259,
  GoldIngot: 260,
  Diamond: 261,
  Apple: 262,
  RawPorkchop: 263,
  CookedPorkchop: 264,
  RawMutton: 265,
  CookedMutton: 266,
  WoodenPickaxe: 270,
  WoodenAxe: 271,
  WoodenShovel: 272,
  WoodenSword: 273,
  StonePickaxe: 274,
  StoneAxe: 275,
  StoneShovel: 276,
  StoneSword: 277,
  IronPickaxe: 278,
  IronAxe: 279,
  IronShovel: 280,
  IronSword: 281,
  GoldPickaxe: 282,
  GoldAxe: 283,
  GoldShovel: 284,
  GoldSword: 285,
  DiamondPickaxe: 286,
  DiamondAxe: 287,
  DiamondShovel: 288,
  DiamondSword: 289,
} as const

export type BlockId = (typeof Block)[keyof typeof Block]
export type ItemId = (typeof Item)[keyof typeof Item] | BlockId

export type ToolType = 'pickaxe' | 'axe' | 'shovel' | 'sword' | 'none'
export type ToolTier = 0 | 1 | 2 | 3 | 4 // hand/holz, stein, eisen, gold, diamant (gold = 3, schnell aber schwach)

export interface BlockDef {
  id: number
  name: string
  // Texturen als Tile-Schlüssel des Atlas; side gilt für N/S/O/W
  tex: { top: string; bottom: string; side: string }
  solid: boolean // Kollision
  opaque: boolean // blockiert Licht und verdeckt Nachbarflächen
  transparent: boolean // wird im Transparent-Pass gerendert (Glas, Wasser, Eis, Blätter)
  liquid: boolean
  cross: boolean // als X-Pflanzengeometrie rendern (Blumen, Gras, Fackel)
  replaceable: boolean // kann beim Platzieren überschrieben werden (Gras, Wasser)
  hardness: number // Basis-Abbauzeit-Faktor (-1 = unzerstörbar)
  tool: ToolType // bevorzugtes Werkzeug
  minTier: ToolTier // Mindest-Tier, damit Drops fallen (0 = Hand reicht)
  drops?: { id: ItemId; count: number } | null // undefined = droppt sich selbst, null = nichts
  light: number // Lichtemission 0..15
}

export interface ItemDef {
  id: number
  name: string
  tex: string
  maxStack: number
  tool?: { type: ToolType; tier: ToolTier; speed: number; damage: number; durability: number }
  food?: number // Hunger-Punkte
  fuel?: number // Brenndauer in Sekunden im Ofen
}

const B: Record<number, BlockDef> = {}
const I: Record<number, ItemDef> = {}

function block(
  id: number,
  name: string,
  tex: string | { top: string; bottom: string; side: string },
  opts: Partial<Omit<BlockDef, 'id' | 'name' | 'tex'>> = {},
) {
  const t = typeof tex === 'string' ? { top: tex, bottom: tex, side: tex } : tex
  B[id] = {
    id,
    name,
    tex: t,
    solid: true,
    opaque: true,
    transparent: false,
    liquid: false,
    cross: false,
    replaceable: false,
    hardness: 1,
    tool: 'none',
    minTier: 0,
    light: 0,
    ...opts,
  }
}

function item(id: number, name: string, tex: string, opts: Partial<Omit<ItemDef, 'id' | 'name' | 'tex'>> = {}) {
  I[id] = { id, name, tex, maxStack: 64, ...opts }
}

// ---- Blöcke ----
block(Block.Stone, 'Stein', 'stone', { hardness: 1.5, tool: 'pickaxe', minTier: 0, drops: { id: Block.Cobblestone, count: 1 } })
block(Block.Grass, 'Grasblock', { top: 'grass_top', bottom: 'dirt', side: 'grass_side' }, { hardness: 0.6, tool: 'shovel', drops: { id: Block.Dirt, count: 1 } })
block(Block.Dirt, 'Erde', 'dirt', { hardness: 0.5, tool: 'shovel' })
block(Block.Cobblestone, 'Bruchstein', 'cobblestone', { hardness: 2, tool: 'pickaxe' })
block(Block.OakPlanks, 'Eichenholzbretter', 'oak_planks', { hardness: 2, tool: 'axe' })
block(Block.Bedrock, 'Grundgestein', 'bedrock', { hardness: -1 })
block(Block.Water, 'Wasser', 'water', { solid: false, opaque: false, transparent: true, liquid: true, replaceable: true, hardness: -1, drops: null })
block(Block.Sand, 'Sand', 'sand', { hardness: 0.5, tool: 'shovel' })
block(Block.Gravel, 'Kies', 'gravel', { hardness: 0.6, tool: 'shovel' })
block(Block.OakLog, 'Eichenstamm', { top: 'log_top', bottom: 'log_top', side: 'oak_log' }, { hardness: 2, tool: 'axe' })
block(Block.OakLeaves, 'Eichenlaub', 'oak_leaves', { opaque: false, transparent: true, hardness: 0.2, drops: null })
block(Block.Glass, 'Glas', 'glass', { opaque: false, transparent: true, hardness: 0.3, drops: null })
block(Block.CoalOre, 'Steinkohle', 'coal_ore', { hardness: 3, tool: 'pickaxe', minTier: 0, drops: { id: Item.Coal, count: 1 } })
block(Block.IronOre, 'Eisenerz', 'iron_ore', { hardness: 3, tool: 'pickaxe', minTier: 1 })
block(Block.GoldOre, 'Golderz', 'gold_ore', { hardness: 3, tool: 'pickaxe', minTier: 2 })
block(Block.DiamondOre, 'Diamanterz', 'diamond_ore', { hardness: 3, tool: 'pickaxe', minTier: 2, drops: { id: Item.Diamond, count: 1 } })
block(Block.CraftingTable, 'Werkbank', { top: 'crafting_table_top', bottom: 'oak_planks', side: 'crafting_table_side' }, { hardness: 2.5, tool: 'axe' })
block(Block.Furnace, 'Ofen', { top: 'furnace_top', bottom: 'furnace_top', side: 'furnace_front' }, { hardness: 3.5, tool: 'pickaxe' })
block(Block.Torch, 'Fackel', 'torch', { solid: false, opaque: false, cross: true, hardness: 0.05, light: 14 })
block(Block.Bricks, 'Ziegelsteine', 'bricks', { hardness: 2, tool: 'pickaxe' })
block(Block.SnowyGrass, 'Verschneiter Grasblock', { top: 'snow', bottom: 'dirt', side: 'grass_side_snow' }, { hardness: 0.6, tool: 'shovel', drops: { id: Block.Dirt, count: 1 } })
block(Block.Sandstone, 'Sandstein', { top: 'sandstone_top', bottom: 'sandstone_top', side: 'sandstone' }, { hardness: 0.8, tool: 'pickaxe' })
block(Block.Obsidian, 'Obsidian', 'obsidian', { hardness: 50, tool: 'pickaxe', minTier: 4 })
block(Block.BirchLog, 'Birkenstamm', { top: 'log_top', bottom: 'log_top', side: 'birch_log' }, { hardness: 2, tool: 'axe' })
block(Block.BirchLeaves, 'Birkenlaub', 'birch_leaves', { opaque: false, transparent: true, hardness: 0.2, drops: null })
block(Block.BirchPlanks, 'Birkenholzbretter', 'birch_planks', { hardness: 2, tool: 'axe' })
block(Block.Cactus, 'Kaktus', { top: 'cactus_top', bottom: 'cactus_top', side: 'cactus_side' }, { opaque: false, hardness: 0.4 })
block(Block.Dandelion, 'Löwenzahn', 'dandelion', { solid: false, opaque: false, cross: true, hardness: 0.05 })
block(Block.Poppy, 'Mohn', 'poppy', { solid: false, opaque: false, cross: true, hardness: 0.05 })
block(Block.TallGrass, 'Gras', 'tall_grass', { solid: false, opaque: false, cross: true, replaceable: true, hardness: 0.05, drops: null })
block(Block.DeadBush, 'Toter Busch', 'dead_bush', { solid: false, opaque: false, cross: true, replaceable: true, hardness: 0.05, drops: { id: Item.Stick, count: 1 } })
block(Block.MossyCobblestone, 'Bemooster Bruchstein', 'mossy_cobblestone', { hardness: 2, tool: 'pickaxe' })
block(Block.StoneBricks, 'Steinziegel', 'stone_bricks', { hardness: 1.5, tool: 'pickaxe' })
block(Block.WhiteWool, 'Weiße Wolle', 'wool_white', { hardness: 0.8 })
block(Block.RedWool, 'Rote Wolle', 'wool_red', { hardness: 0.8 })
block(Block.BlueWool, 'Blaue Wolle', 'wool_blue', { hardness: 0.8 })
block(Block.GreenWool, 'Grüne Wolle', 'wool_green', { hardness: 0.8 })
block(Block.YellowWool, 'Gelbe Wolle', 'wool_yellow', { hardness: 0.8 })
block(Block.Glowstone, 'Leuchtstein', 'glowstone', { hardness: 0.3, light: 15 })
block(Block.Tnt, 'TNT', { top: 'tnt_top', bottom: 'tnt_bottom', side: 'tnt_side' }, { hardness: 0.1 })
block(Block.Pumpkin, 'Kürbis', { top: 'pumpkin_top', bottom: 'pumpkin_top', side: 'pumpkin_side' }, { hardness: 1, tool: 'axe' })
block(Block.Melon, 'Melone', { top: 'melon_top', bottom: 'melon_top', side: 'melon_side' }, { hardness: 1, tool: 'axe' })
block(Block.Ice, 'Eis', 'ice', { opaque: false, transparent: true, hardness: 0.5, tool: 'pickaxe', drops: null })
block(Block.SnowBlock, 'Schneeblock', 'snow', { hardness: 0.2, tool: 'shovel' })
block(Block.Clay, 'Ton', 'clay', { hardness: 0.6, tool: 'shovel' })

// ---- Items ----
item(Item.Stick, 'Stock', 'stick', { fuel: 5 })
item(Item.Coal, 'Kohle', 'coal', { fuel: 80 })
item(Item.Charcoal, 'Holzkohle', 'charcoal', { fuel: 80 })
item(Item.IronIngot, 'Eisenbarren', 'iron_ingot')
item(Item.GoldIngot, 'Goldbarren', 'gold_ingot')
item(Item.Diamond, 'Diamant', 'diamond')
item(Item.Apple, 'Apfel', 'apple', { food: 4 })
item(Item.RawPorkchop, 'Rohes Schweinefleisch', 'porkchop_raw', { food: 3 })
item(Item.CookedPorkchop, 'Gebratenes Schweinefleisch', 'porkchop_cooked', { food: 8 })
item(Item.RawMutton, 'Rohes Hammelfleisch', 'mutton_raw', { food: 2 })
item(Item.CookedMutton, 'Gebratenes Hammelfleisch', 'mutton_cooked', { food: 6 })

// Werkzeuge: [tier, speed, damage, durability]
const TOOL_MATS: Array<[string, string, ToolTier, number, number, number]> = [
  ['Wooden', 'Holz', 1, 2, 1, 59],
  ['Stone', 'Stein', 2, 4, 2, 131],
  ['Iron', 'Eisen', 3, 6, 3, 250],
  ['Gold', 'Gold', 1, 12, 1, 32],
  ['Diamond', 'Diamant', 4, 8, 4, 1561],
]
const TOOL_KINDS: Array<[string, string, ToolType, number]> = [
  ['Pickaxe', 'spitzhacke', 'pickaxe', 1],
  ['Axe', 'axt', 'axe', 2],
  ['Shovel', 'schaufel', 'shovel', 0],
  ['Sword', 'schwert', 'sword', 3],
]
for (const [matEn, matDe, tier, speed, dmg, dur] of TOOL_MATS) {
  for (const [kindEn, kindDe, type, extraDmg] of TOOL_KINDS) {
    const id = (Item as Record<string, number>)[`${matEn}${kindEn}`]
    const name = `${matDe}${kindDe}`.replace(/^./, (c) => c.toUpperCase())
    item(id, name.charAt(0).toUpperCase() + name.slice(1), `${matEn.toLowerCase()}_${kindEn.toLowerCase()}`, {
      maxStack: 1,
      tool: { type, tier, speed, damage: dmg + extraDmg, durability: dur },
      fuel: matEn === 'Wooden' ? 10 : undefined,
    })
  }
}

// Blöcke, die als Ofen-Brennstoff taugen
export const BLOCK_FUEL: Record<number, number> = {
  [Block.OakPlanks]: 15,
  [Block.BirchPlanks]: 15,
  [Block.OakLog]: 15,
  [Block.BirchLog]: 15,
  [Block.CraftingTable]: 15,
}

export function getBlock(id: number): BlockDef {
  return B[id]
}

export function isBlockId(id: number): boolean {
  return id > 0 && id < 256 && B[id] !== undefined
}

export function getItemDef(id: number): ItemDef | undefined {
  return I[id]
}

// Anzeigename für Block ODER Item
export function displayName(id: number): string {
  if (id < 256) return B[id]?.name ?? '???'
  return I[id]?.name ?? '???'
}

export function maxStackOf(id: number): number {
  if (id < 256) return 64
  return I[id]?.maxStack ?? 64
}

export const ALL_BLOCKS: BlockDef[] = Object.values(B)
export const ALL_ITEMS: ItemDef[] = Object.values(I)

// Reihenfolge im Kreativ-Inventar
export const CREATIVE_ITEMS: number[] = [
  Block.Grass, Block.Dirt, Block.Stone, Block.Cobblestone, Block.MossyCobblestone,
  Block.StoneBricks, Block.Bricks, Block.Sand, Block.Sandstone, Block.Gravel, Block.Clay,
  Block.OakLog, Block.OakPlanks, Block.OakLeaves, Block.BirchLog, Block.BirchPlanks, Block.BirchLeaves,
  Block.Glass, Block.Ice, Block.SnowBlock, Block.SnowyGrass, Block.Obsidian, Block.Bedrock,
  Block.CoalOre, Block.IronOre, Block.GoldOre, Block.DiamondOre,
  Block.CraftingTable, Block.Furnace, Block.Torch, Block.Glowstone, Block.Tnt,
  Block.Pumpkin, Block.Melon, Block.Cactus,
  Block.Dandelion, Block.Poppy, Block.TallGrass, Block.DeadBush,
  Block.WhiteWool, Block.RedWool, Block.BlueWool, Block.GreenWool, Block.YellowWool,
  Block.Water,
  Item.Stick, Item.Coal, Item.Charcoal, Item.IronIngot, Item.GoldIngot, Item.Diamond,
  Item.Apple, Item.RawPorkchop, Item.CookedPorkchop, Item.RawMutton, Item.CookedMutton,
  Item.WoodenPickaxe, Item.WoodenAxe, Item.WoodenShovel, Item.WoodenSword,
  Item.StonePickaxe, Item.StoneAxe, Item.StoneShovel, Item.StoneSword,
  Item.IronPickaxe, Item.IronAxe, Item.IronShovel, Item.IronSword,
  Item.GoldPickaxe, Item.GoldAxe, Item.GoldShovel, Item.GoldSword,
  Item.DiamondPickaxe, Item.DiamondAxe, Item.DiamondShovel, Item.DiamondSword,
]
