// Zentrale Konstanten der Spielwelt und Physik

export const CHUNK_SIZE = 16
export const WORLD_HEIGHT = 128
export const SEA_LEVEL = 62

export const DEFAULT_RENDER_DISTANCE = 6 // Chunks
export const MIN_RENDER_DISTANCE = 3
export const MAX_RENDER_DISTANCE = 12

// Spieler-Abmessungen (wie Minecraft: 0.6 breit, 1.8 hoch, Augen bei 1.62)
export const PLAYER_WIDTH = 0.6
export const PLAYER_HEIGHT = 1.8
export const PLAYER_EYE_HEIGHT = 1.62
export const PLAYER_SNEAK_EYE_HEIGHT = 1.27

// Physik (Blöcke/Sekunde bzw. Blöcke/Sekunde²)
export const GRAVITY = 32
export const TERMINAL_VELOCITY = 78
export const JUMP_VELOCITY = 9.0
export const WALK_SPEED = 4.317
export const SPRINT_SPEED = 5.612
export const SNEAK_SPEED = 1.31
export const FLY_SPEED = 10.92
export const FLY_SPRINT_SPEED = 21.6
export const SWIM_SPEED = 2.2
export const WATER_DRAG = 0.8
export const REACH_DISTANCE = 4.5
export const CREATIVE_REACH_DISTANCE = 5.0

// Zeit: ein voller Tag dauert wie in Minecraft 20 Minuten (24000 Ticks à 50ms)
export const DAY_LENGTH_SECONDS = 1200
export const TICKS_PER_DAY = 24000

// Speichern
export const SAVE_KEY_PREFIX = 'minicraft'
export const AUTOSAVE_INTERVAL_MS = 10000

export const MAX_STACK = 64

export const MAX_LIGHT = 15

export type GameMode = 'survival' | 'creative'
