// Die Spiel-Engine: three.js-Rendering, Chunk-Streaming, Spieler-Steuerung und -Physik,
// Block-Interaktion, Inventar/Crafting/Ofen, Mobs, Item-Entities, Tag/Nacht, Speichern.

import * as THREE from 'three'
import {
  CHUNK_SIZE, WORLD_HEIGHT, GRAVITY, TERMINAL_VELOCITY, JUMP_VELOCITY,
  WALK_SPEED, SPRINT_SPEED, SNEAK_SPEED, FLY_SPEED, FLY_SPRINT_SPEED,
  PLAYER_WIDTH, PLAYER_HEIGHT, PLAYER_EYE_HEIGHT, PLAYER_SNEAK_EYE_HEIGHT,
  REACH_DISTANCE, DAY_LENGTH_SECONDS, AUTOSAVE_INTERVAL_MS, GameMode, SEA_LEVEL,
} from './constants'
import { World } from './world'
import { WorldGenerator, Biome } from './worldgen'
import { buildChunkGeometry } from './mesher'
import { buildTextureAtlas, TextureAtlas, TILE, itemIconDataURL } from './textures'
import { Block, Item, getBlock, getItemDef, isBlockId, displayName, BLOCK_FUEL } from './blocks'
import { raycastBlocks, RaycastHit } from './raycast'
import { PhysicsBody, moveBody, blockIntersectsBody } from './physics'
import { Inventory, ItemStack, makeStack, HOTBAR_SIZE } from './inventory'
import { matchRecipe, SMELTING, SMELT_TIME_S } from './crafting'
import { Mob, MobType } from './mobs'
import { Sky, skyColors, dayFactor } from './sky'
import { ParticleSystem } from './particles'
import { sounds } from './sounds'
import {
  WorldMeta, saveWorldMeta, saveChunkBlocks, loadAllChunks, savePlayer, loadPlayer,
} from './save'
import { chunkKey } from './chunk'

export type UIScreen = null | 'inventory' | 'crafting' | 'furnace' | 'pause' | 'death'

export interface DebugInfo {
  fps: number
  x: number
  y: number
  z: number
  chunkX: number
  chunkZ: number
  facing: string
  biome: Biome
  skyLight: number
  blockLight: number
  loadedChunks: number
  mobs: number
  time: string
}

export interface UIState {
  screen: UIScreen
  mode: GameMode
  health: number
  hunger: number
  air: number
  underwater: boolean
  selectedSlot: number
  // Slots werden als flache Kopien übergeben (React-freundlich)
  inventory: Array<ItemStack | null>
  cursor: ItemStack | null
  craftGrid: Array<ItemStack | null>
  craftResult: ItemStack | null
  craftSize: 2 | 3
  furnace: { input: ItemStack | null; fuel: ItemStack | null; output: ItemStack | null; progress: number; fuelBurn: number } | null
  hoveredName: string | null
  version: number
}

interface FurnaceState {
  input: ItemStack | null
  fuel: ItemStack | null
  output: ItemStack | null
  progress: number // 0..1
  fuelLeft: number // Sekunden
  fuelTotal: number
}

class ItemEntity {
  id: number
  count: number
  body: PhysicsBody
  mesh: THREE.Mesh
  age = 0
  pickupDelay = 0.7

  constructor(id: number, count: number, x: number, y: number, z: number, mesh: THREE.Mesh) {
    this.id = id
    this.count = count
    this.mesh = mesh
    this.body = { x, y, z, vx: 0, vy: 0, vz: 0, width: 0.25, height: 0.25, onGround: false, inWater: false, headInWater: false }
  }
}

export interface EngineCallbacks {
  onUIState: (state: UIState) => void
  onDebug: (info: DebugInfo | null) => void
  onLoadProgress?: (done: number, total: number) => void
}

export class GameEngine {
  readonly meta: WorldMeta
  readonly atlas: TextureAtlas
  private canvas: HTMLCanvasElement
  private renderer: THREE.WebGLRenderer
  private scene: THREE.Scene
  private camera: THREE.PerspectiveCamera
  private atlasTexture: THREE.CanvasTexture
  private opaqueMaterial: THREE.ShaderMaterial
  private waterMaterial: THREE.ShaderMaterial
  private world: World
  private sky: Sky
  private particles: ParticleSystem
  private chunkMeshes = new Map<string, { opaque?: THREE.Mesh; water?: THREE.Mesh }>()
  private outline: THREE.LineSegments
  private crackMesh: THREE.Mesh
  private crackTextures: THREE.CanvasTexture[] = []
  private handGroup: THREE.Group
  private handMesh: THREE.Mesh | null = null
  private handItemId = -1

  // Spieler
  body: PhysicsBody
  yaw = 0
  pitch = 0
  mode: GameMode
  flying = false
  sprinting = false
  sneaking = false
  health = 20
  hunger = 20
  private exhaustion = 0
  private regenTimer = 0
  private starveTimer = 0
  air = 300
  private fallStart: number | null = null
  dead = false

  inventory = new Inventory()
  selectedSlot = 0
  cursorStack: ItemStack | null = null
  craftGrid: Array<ItemStack | null> = new Array(9).fill(null)
  craftSize: 2 | 3 = 2

  private furnaces = new Map<string, FurnaceState>()
  private openFurnaceKey: string | null = null

  screen: UIScreen = null
  paused = false

  timeOfDay: number
  renderDistance: number
  showDebug = false

  private mobs: Mob[] = []
  private itemEntities: ItemEntity[] = []
  private tntFuses: Array<{ x: number; y: number; z: number; t: number }> = []

  // Input
  private keys = new Set<string>()
  private lastWTap = 0
  private lastSpaceTap = 0
  private mouseDown = [false, false, false]
  private breaking: { x: number; y: number; z: number; progress: number; total: number } | null = null
  private useCooldown = 0
  private attackCooldown = 0
  private stepTimer = 0
  private wasInWater = false

  private callbacks: EngineCallbacks
  private running = false
  private disposed = false
  private lastFrame = 0
  private fps = 0
  private fpsCounter = 0
  private fpsTimer = 0
  private uiVersion = 0
  private uiDirty = true
  private uiThrottle = 0
  private autosaveTimer = 0
  private mobSpawnTimer = 0
  private swingTime = 0

  private disposeFns: Array<() => void> = []

  constructor(canvas: HTMLCanvasElement, meta: WorldMeta, renderDistance: number, callbacks: EngineCallbacks) {
    this.canvas = canvas
    this.meta = meta
    this.mode = meta.mode
    this.renderDistance = renderDistance
    this.callbacks = callbacks
    this.timeOfDay = meta.timeOfDay ?? 0.05

    const generator = new WorldGenerator(meta.seed)
    this.world = new World(generator)
    this.world.savedChunks = loadAllChunks(meta.id, CHUNK_SIZE * CHUNK_SIZE * WORLD_HEIGHT)

    // Renderer
    this.renderer = new THREE.WebGLRenderer({ canvas, antialias: false, powerPreference: 'high-performance' })
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    // Alle Farben stammen aus handgezeichneten Canvas-Texturen und sind als
    // Display-Farben gemeint — keine sRGB-Konvertierung in der Pipeline,
    // sonst rendern die Custom-Shader (ohne colorspace_fragment) zu dunkel.
    this.renderer.outputColorSpace = THREE.LinearSRGBColorSpace
    this.scene = new THREE.Scene()
    this.camera = new THREE.PerspectiveCamera(70, 1, 0.05, 1000)
    this.resize()

    // Texturen & Materialien
    this.atlas = buildTextureAtlas()
    this.atlasTexture = new THREE.CanvasTexture(this.atlas.canvas)
    this.atlasTexture.magFilter = THREE.NearestFilter
    this.atlasTexture.minFilter = THREE.NearestFilter
    this.atlasTexture.flipY = false

    this.opaqueMaterial = this.makeChunkMaterial(false)
    this.waterMaterial = this.makeChunkMaterial(true)

    // Himmel & Partikel
    this.sky = new Sky()
    this.scene.add(this.sky.group)
    this.particles = new ParticleSystem(this.atlas, this.atlasTexture)
    this.scene.add(this.particles.mesh)

    // Auswahl-Umriss
    const outlineGeo = new THREE.EdgesGeometry(new THREE.BoxGeometry(1.002, 1.002, 1.002))
    this.outline = new THREE.LineSegments(
      outlineGeo,
      new THREE.LineBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.6 }),
    )
    this.outline.visible = false
    this.scene.add(this.outline)

    // Riss-Overlay
    for (let i = 0; i < 10; i++) {
      const cv = document.createElement('canvas')
      cv.width = cv.height = TILE
      const ctx = cv.getContext('2d')!
      const idx = this.atlas.indexOf(`crack_${i}`)
      ctx.drawImage(
        this.atlas.canvas,
        (idx % this.atlas.tilesX) * TILE, Math.floor(idx / this.atlas.tilesX) * TILE, TILE, TILE,
        0, 0, TILE, TILE,
      )
      const tex = new THREE.CanvasTexture(cv)
      tex.magFilter = THREE.NearestFilter
      this.crackTextures.push(tex)
    }
    this.crackMesh = new THREE.Mesh(
      new THREE.BoxGeometry(1.004, 1.004, 1.004),
      new THREE.MeshBasicMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -1 }),
    )
    this.crackMesh.visible = false
    this.scene.add(this.crackMesh)

    // Hand / gehaltenes Item (an der Kamera)
    this.handGroup = new THREE.Group()
    this.camera.add(this.handGroup)
    this.scene.add(this.camera)

    // Spieler platzieren
    const saved = loadPlayer(meta.id)
    const spawn = generator.findSpawn()
    this.body = {
      x: saved?.x ?? spawn.x,
      y: saved?.y ?? spawn.y,
      z: saved?.z ?? spawn.z,
      vx: 0, vy: 0, vz: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      onGround: false,
      inWater: false,
      headInWater: false,
    }
    this.yaw = saved?.yaw ?? 0
    this.pitch = saved?.pitch ?? 0
    this.health = saved?.health ?? 20
    this.hunger = saved?.hunger ?? 20
    this.selectedSlot = saved?.selectedSlot ?? 0
    if (saved?.inventory) this.inventory = Inventory.deserialize(saved.inventory)
    else if (this.mode === 'survival') {
      // kleines Starterpaket
      this.inventory.add(Block.CraftingTable, 1)
    }

    this.bindInput()
  }

  // ---------- Setup-Helfer ----------

  private makeChunkMaterial(water: boolean): THREE.ShaderMaterial {
    return new THREE.ShaderMaterial({
      uniforms: {
        uMap: { value: this.atlasTexture },
        uDayLight: { value: 1 },
        uFogColor: { value: new THREE.Color(0x87ceeb) },
        uFogNear: { value: 50 },
        uFogFar: { value: 150 },
        uTime: { value: 0 },
      },
      vertexShader: `
        attribute vec2 aLight;
        attribute float aAO;
        varying vec2 vUv;
        varying float vBrightness;
        varying float vFogDepth;
        uniform float uDayLight;
        void main() {
          vUv = uv;
          float light = max(aLight.x * uDayLight, aLight.y);
          float brightness = pow(0.86, (1.0 - light) * 15.0);
          vBrightness = brightness * aAO;
          vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
          vFogDepth = -mvPosition.z;
          gl_Position = projectionMatrix * mvPosition;
        }
      `,
      fragmentShader: `
        uniform sampler2D uMap;
        uniform vec3 uFogColor;
        uniform float uFogNear;
        uniform float uFogFar;
        uniform float uTime;
        varying vec2 vUv;
        varying float vBrightness;
        varying float vFogDepth;
        void main() {
          vec4 tex = texture2D(uMap, vUv);
          ${water ? '' : 'if (tex.a < 0.5) discard;'}
          vec3 color = tex.rgb * vBrightness;
          ${water ? 'color *= 0.95 + 0.05 * sin(uTime * 1.7);' : ''}
          float fogFactor = smoothstep(uFogNear, uFogFar, vFogDepth);
          color = mix(color, uFogColor, fogFactor);
          gl_FragColor = vec4(color, ${water ? 'tex.a * 0.85' : 'tex.a'});
        }
      `,
      transparent: water,
      depthWrite: !water,
      side: water ? THREE.DoubleSide : THREE.FrontSide,
    })
  }

  resize(): void {
    const w = this.canvas.clientWidth || window.innerWidth
    const h = this.canvas.clientHeight || window.innerHeight
    this.renderer.setSize(w, h, false)
    this.camera.aspect = w / h
    this.camera.updateProjectionMatrix()
  }

  // ---------- Lebenszyklus ----------

  async start(): Promise<void> {
    // Start-Chunks synchron in kleinen Häppchen laden (mit Fortschrittsanzeige)
    const pcx = Math.floor(this.body.x / CHUNK_SIZE)
    const pcz = Math.floor(this.body.z / CHUNK_SIZE)
    const initial: Array<[number, number]> = []
    const r = Math.min(this.renderDistance, 4)
    for (let dz = -r; dz <= r; dz++)
      for (let dx = -r; dx <= r; dx++) initial.push([pcx + dx, pcz + dz])
    initial.sort((a, b) => (Math.abs(a[0] - pcx) + Math.abs(a[1] - pcz)) - (Math.abs(b[0] - pcx) + Math.abs(b[1] - pcz)))

    for (let i = 0; i < initial.length; i++) {
      this.world.ensureChunk(initial[i][0], initial[i][1])
      this.callbacks.onLoadProgress?.(i + 1, initial.length)
      if (i % 4 === 3) await new Promise((res) => setTimeout(res, 0))
    }

    // Falls kein Spielstand: sicher auf der Oberfläche spawnen
    const savedPlayer = loadPlayer(this.meta.id)
    if (!savedPlayer) {
      const h = this.world.highestBlockAt(Math.floor(this.body.x), Math.floor(this.body.z))
      this.body.y = h + 1.2
    }

    this.running = true
    this.lastFrame = performance.now()
    this.renderer.setAnimationLoop(() => this.frame())
  }

  dispose(): void {
    if (this.disposed) return
    this.disposed = true
    this.running = false
    this.saveAll()
    this.renderer.setAnimationLoop(null)
    this.disposeFns.forEach((fn) => fn())
    for (const meshes of this.chunkMeshes.values()) {
      meshes.opaque?.geometry.dispose()
      meshes.water?.geometry.dispose()
    }
    this.mobs.forEach((m) => m.dispose())
    this.itemEntities.forEach((e) => this.removeItemEntityMesh(e))
    this.crackTextures.forEach((t) => t.dispose())
    this.atlasTexture.dispose()
    this.opaqueMaterial.dispose()
    this.waterMaterial.dispose()
    this.renderer.dispose()
  }

  saveAll(): void {
    for (const chunk of this.world.chunks.values()) {
      if (chunk.modified) saveChunkBlocks(this.meta.id, chunkKey(chunk.cx, chunk.cz), chunk.blocks)
    }
    for (const [key, blocks] of this.world.savedChunks) {
      saveChunkBlocks(this.meta.id, key, blocks)
    }
    savePlayer(this.meta.id, {
      x: this.body.x, y: this.body.y, z: this.body.z,
      yaw: this.yaw, pitch: this.pitch,
      health: this.health, hunger: this.hunger,
      inventory: this.inventory.serialize(),
      selectedSlot: this.selectedSlot,
    })
    saveWorldMeta({ ...this.meta, lastPlayed: Date.now(), timeOfDay: this.timeOfDay })
  }

  // ---------- Input ----------

  private bindInput(): void {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.repeat) return
      const code = e.code

      if (code === 'F3') {
        e.preventDefault()
        this.showDebug = !this.showDebug
        if (!this.showDebug) this.callbacks.onDebug(null)
        return
      }

      if (this.dead) return

      if (code === 'Escape') {
        // Escape verlässt Pointer-Lock automatisch; UI-Screens schließen
        if (this.screen && this.screen !== 'pause') this.closeScreen()
        return
      }

      if (code === 'KeyE') {
        e.preventDefault()
        if (this.screen === 'inventory' || this.screen === 'crafting' || this.screen === 'furnace') this.closeScreen()
        else if (!this.screen) this.openScreen('inventory')
        return
      }

      if (this.screen) return // restliche Steuerung nur im Spiel

      this.keys.add(code)

      if (code === 'KeyW') {
        const now = performance.now()
        if (now - this.lastWTap < 280) this.sprinting = true
        this.lastWTap = now
      }
      if (code === 'Space' && this.mode === 'creative') {
        const now = performance.now()
        if (now - this.lastSpaceTap < 280) {
          this.flying = !this.flying
          this.body.vy = 0
        }
        this.lastSpaceTap = now
      }
      if (code === 'KeyQ') this.dropSelected()
      if (code.startsWith('Digit')) {
        const n = parseInt(code.slice(5), 10)
        if (n >= 1 && n <= 9) {
          this.selectedSlot = n - 1
          this.markUIDirty()
        }
      }
    }
    const onKeyUp = (e: KeyboardEvent) => {
      this.keys.delete(e.code)
      if (e.code === 'KeyW') this.sprinting = false
    }
    const onMouseMove = (e: MouseEvent) => {
      if (document.pointerLockElement !== this.canvas || this.screen || this.dead) return
      const sens = 0.0023
      this.yaw -= e.movementX * sens
      this.pitch -= e.movementY * sens
      this.pitch = Math.max(-Math.PI / 2 + 0.001, Math.min(Math.PI / 2 - 0.001, this.pitch))
    }
    const onMouseDown = (e: MouseEvent) => {
      if (this.screen || this.dead) return
      if (document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock()
        return
      }
      this.mouseDown[e.button] = true
      if (e.button === 0) this.attack()
      if (e.button === 1) {
        e.preventDefault()
        this.pickBlock()
      }
      if (e.button === 2) this.useItem()
    }
    const onMouseUp = (e: MouseEvent) => {
      this.mouseDown[e.button] = false
      if (e.button === 0) this.breaking = null
    }
    const onWheel = (e: WheelEvent) => {
      if (this.screen || this.dead) return
      const dir = e.deltaY > 0 ? 1 : -1
      this.selectedSlot = (this.selectedSlot + dir + HOTBAR_SIZE) % HOTBAR_SIZE
      this.markUIDirty()
    }
    const onPointerLockChange = () => {
      if (document.pointerLockElement !== this.canvas && !this.screen && !this.dead && this.running) {
        this.openScreen('pause')
      }
    }
    const onContextMenu = (e: Event) => e.preventDefault()
    const onResize = () => this.resize()
    const onBeforeUnload = () => this.saveAll()

    window.addEventListener('keydown', onKeyDown)
    window.addEventListener('keyup', onKeyUp)
    window.addEventListener('mousemove', onMouseMove)
    this.canvas.addEventListener('mousedown', onMouseDown)
    window.addEventListener('mouseup', onMouseUp)
    this.canvas.addEventListener('wheel', onWheel, { passive: true })
    document.addEventListener('pointerlockchange', onPointerLockChange)
    this.canvas.addEventListener('contextmenu', onContextMenu)
    window.addEventListener('resize', onResize)
    window.addEventListener('beforeunload', onBeforeUnload)

    this.disposeFns.push(() => {
      window.removeEventListener('keydown', onKeyDown)
      window.removeEventListener('keyup', onKeyUp)
      window.removeEventListener('mousemove', onMouseMove)
      this.canvas.removeEventListener('mousedown', onMouseDown)
      window.removeEventListener('mouseup', onMouseUp)
      this.canvas.removeEventListener('wheel', onWheel)
      document.removeEventListener('pointerlockchange', onPointerLockChange)
      this.canvas.removeEventListener('contextmenu', onContextMenu)
      window.removeEventListener('resize', onResize)
      window.removeEventListener('beforeunload', onBeforeUnload)
    })
  }

  // ---------- UI-Screens ----------

  openScreen(screen: UIScreen, furnaceKey?: string): void {
    this.screen = screen
    this.openFurnaceKey = furnaceKey ?? null
    this.craftSize = screen === 'crafting' ? 3 : 2
    if (screen && document.pointerLockElement === this.canvas) document.exitPointerLock()
    this.breaking = null
    this.mouseDown = [false, false, false]
    this.keys.clear()
    this.markUIDirty()
  }

  closeScreen(): void {
    // Crafting-Reste zurück ins Inventar
    for (let i = 0; i < this.craftGrid.length; i++) {
      const s = this.craftGrid[i]
      if (s) {
        const rest = this.inventory.add(s.id, s.count)
        if (rest > 0) this.spawnItemEntity(s.id, rest, this.body.x, this.body.y + 1, this.body.z)
        this.craftGrid[i] = null
      }
    }
    if (this.cursorStack) {
      const rest = this.inventory.add(this.cursorStack.id, this.cursorStack.count)
      if (rest > 0) this.spawnItemEntity(this.cursorStack.id, rest, this.body.x, this.body.y + 1, this.body.z)
      this.cursorStack = null
    }
    this.screen = null
    this.openFurnaceKey = null
    this.paused = false
    this.canvas.requestPointerLock()
    this.markUIDirty()
  }

  togglePause(): void {
    if (this.screen === 'pause') this.closeScreen()
    else this.openScreen('pause')
  }

  respawn(): void {
    const spawn = this.world.generator.findSpawn()
    this.body.x = spawn.x
    this.body.z = spawn.z
    this.body.y = Math.max(spawn.y, this.world.highestBlockAt(Math.floor(spawn.x), Math.floor(spawn.z)) + 1.2)
    this.body.vx = this.body.vy = this.body.vz = 0
    this.health = 20
    this.hunger = 20
    this.air = 300
    this.dead = false
    this.fallStart = null
    this.screen = null
    this.canvas.requestPointerLock()
    this.markUIDirty()
  }

  // ---------- Inventar / Crafting / Ofen ----------

  private markUIDirty(): void {
    this.uiDirty = true
  }

  getUIState(): UIState {
    let furnace: UIState['furnace'] = null
    if (this.openFurnaceKey) {
      const f = this.furnaces.get(this.openFurnaceKey)
      if (f) {
        furnace = {
          input: f.input ? { ...f.input } : null,
          fuel: f.fuel ? { ...f.fuel } : null,
          output: f.output ? { ...f.output } : null,
          progress: f.progress,
          fuelBurn: f.fuelTotal > 0 ? f.fuelLeft / f.fuelTotal : 0,
        }
      }
    }
    const hovered = this.currentTarget
      ? displayName(this.world.getBlockAt(this.currentTarget.x, this.currentTarget.y, this.currentTarget.z))
      : null
    return {
      screen: this.dead ? 'death' : this.screen,
      mode: this.mode,
      health: this.health,
      hunger: this.hunger,
      air: this.air,
      underwater: this.body.headInWater,
      selectedSlot: this.selectedSlot,
      inventory: this.inventory.slots.map((s) => (s ? { ...s } : null)),
      cursor: this.cursorStack ? { ...this.cursorStack } : null,
      craftGrid: this.craftGrid.slice(0, this.craftSize * this.craftSize).map((s) => (s ? { ...s } : null)),
      craftResult: this.computeCraftResult(),
      craftSize: this.craftSize,
      furnace,
      hoveredName: hovered,
      version: ++this.uiVersion,
    }
  }

  private computeCraftResult(): ItemStack | null {
    const size = this.craftSize
    const grid = this.craftGrid.slice(0, size * size).map((s) => (s ? s.id : null))
    const recipe = matchRecipe(grid, size)
    return recipe ? makeStack(recipe.result.id, recipe.result.count) : null
  }

  // Generische Slot-Interaktion (linke/rechte Maustaste, Shift)
  clickSlot(container: 'inv' | 'craft' | 'craftResult' | 'furnaceIn' | 'furnaceFuel' | 'furnaceOut', index: number, button: 0 | 2, shift: boolean): void {
    const furnace = this.openFurnaceKey ? this.furnaces.get(this.openFurnaceKey) : undefined

    const getSlot = (): ItemStack | null => {
      switch (container) {
        case 'inv': return this.inventory.slots[index]
        case 'craft': return this.craftGrid[index]
        case 'craftResult': return this.computeCraftResult()
        case 'furnaceIn': return furnace?.input ?? null
        case 'furnaceFuel': return furnace?.fuel ?? null
        case 'furnaceOut': return furnace?.output ?? null
      }
    }
    const setSlot = (s: ItemStack | null): void => {
      switch (container) {
        case 'inv': this.inventory.slots[index] = s; break
        case 'craft': this.craftGrid[index] = s; break
        case 'craftResult': break
        case 'furnaceIn': if (furnace) furnace.input = s; break
        case 'furnaceFuel': if (furnace) furnace.fuel = s; break
        case 'furnaceOut': if (furnace) furnace.output = s; break
      }
    }

    // Crafting-Ergebnis entnehmen
    if (container === 'craftResult') {
      const result = this.computeCraftResult()
      if (!result) return
      const consume = () => {
        for (let i = 0; i < this.craftSize * this.craftSize; i++) {
          const s = this.craftGrid[i]
          if (s) {
            s.count--
            if (s.count <= 0) this.craftGrid[i] = null
          }
        }
      }
      if (shift) {
        // so oft wie möglich craften
        let guard = 0
        while (this.computeCraftResult() && guard++ < 64) {
          const r = this.computeCraftResult()!
          const rest = this.inventory.add(r.id, r.count)
          if (rest > 0) break
          consume()
        }
      } else {
        if (this.cursorStack) {
          if (this.cursorStack.id === result.id && this.cursorStack.count + result.count <= 64) {
            this.cursorStack.count += result.count
            consume()
          }
        } else {
          this.cursorStack = result
          consume()
        }
      }
      sounds.play('click')
      this.markUIDirty()
      return
    }

    const slot = getSlot()

    if (shift && slot) {
      // Schnell verschieben
      if (container === 'inv') {
        if (furnace) {
          // ins passende Ofen-Fach
          const def = getItemDef(slot.id)
          const isFuel = (def?.fuel ?? 0) > 0 || BLOCK_FUEL[slot.id] !== undefined
          const target = isFuel && !SMELTING[slot.id] ? 'fuel' : 'input'
          const t = target === 'fuel' ? furnace.fuel : furnace.input
          if (!t) {
            if (target === 'fuel') furnace.fuel = slot
            else furnace.input = slot
            this.inventory.slots[index] = null
          } else if (t.id === slot.id) {
            const space = 64 - t.count
            const move = Math.min(space, slot.count)
            t.count += move
            slot.count -= move
            if (slot.count <= 0) this.inventory.slots[index] = null
          }
        } else {
          // Hotbar ↔ Hauptinventar
          const targetRange = index < HOTBAR_SIZE ? [HOTBAR_SIZE, 36] : [0, HOTBAR_SIZE]
          this.inventory.slots[index] = null
          let rest = slot.count
          // in vorhandene Stapel des Zielbereichs
          for (let i = targetRange[0]; i < targetRange[1] && rest > 0; i++) {
            const s = this.inventory.slots[i]
            if (s && s.id === slot.id && s.count < 64 && slot.durability === undefined) {
              const mv = Math.min(64 - s.count, rest)
              s.count += mv
              rest -= mv
            }
          }
          for (let i = targetRange[0]; i < targetRange[1] && rest > 0; i++) {
            if (!this.inventory.slots[i]) {
              this.inventory.slots[i] = { ...slot, count: rest }
              rest = 0
            }
          }
          if (rest > 0) this.inventory.slots[index] = { ...slot, count: rest }
        }
      } else {
        // aus Craft/Ofen zurück ins Inventar
        const rest = this.inventory.add(slot.id, slot.count)
        if (rest === 0) setSlot(null)
        else setSlot({ ...slot, count: rest })
      }
      sounds.play('click')
      this.markUIDirty()
      return
    }

    if (button === 0) {
      // Linksklick: tauschen / zusammenlegen
      if (this.cursorStack && slot && this.cursorStack.id === slot.id && slot.durability === undefined && this.cursorStack.durability === undefined) {
        const max = 64
        const move = Math.min(max - slot.count, this.cursorStack.count)
        slot.count += move
        this.cursorStack.count -= move
        if (this.cursorStack.count <= 0) this.cursorStack = null
      } else {
        setSlot(this.cursorStack)
        this.cursorStack = slot
      }
    } else {
      // Rechtsklick: einen ablegen / halbieren
      if (this.cursorStack) {
        if (!slot) {
          setSlot({ ...this.cursorStack, count: 1 })
          this.cursorStack.count--
          if (this.cursorStack.count <= 0) this.cursorStack = null
        } else if (slot.id === this.cursorStack.id && slot.count < 64 && slot.durability === undefined) {
          slot.count++
          this.cursorStack.count--
          if (this.cursorStack.count <= 0) this.cursorStack = null
        }
      } else if (slot) {
        const half = Math.ceil(slot.count / 2)
        this.cursorStack = { ...slot, count: half }
        slot.count -= half
        if (slot.count <= 0) setSlot(null)
      }
    }
    sounds.play('click')
    this.markUIDirty()
  }

  // Kreativ-Inventar: Item auf den Cursor legen
  creativePick(id: number): void {
    if (this.cursorStack && this.cursorStack.id === id) {
      this.cursorStack = null
    } else {
      const def = getItemDef(id)
      this.cursorStack = makeStack(id, def?.maxStack === 1 ? 1 : 64)
    }
    sounds.play('click')
    this.markUIDirty()
  }

  clearCursor(): void {
    this.cursorStack = null
    this.markUIDirty()
  }

  // ---------- Interaktion ----------

  private currentTarget: RaycastHit | null = null

  private lookDirection(): [number, number, number] {
    const cp = Math.cos(this.pitch)
    return [-Math.sin(this.yaw) * cp, Math.sin(this.pitch), -Math.cos(this.yaw) * cp]
  }

  private eyePosition(): [number, number, number] {
    const eye = this.sneaking ? PLAYER_SNEAK_EYE_HEIGHT : PLAYER_EYE_HEIGHT
    return [this.body.x, this.body.y + eye, this.body.z]
  }

  private raycast(): RaycastHit | null {
    const [ox, oy, oz] = this.eyePosition()
    const [dx, dy, dz] = this.lookDirection()
    return raycastBlocks(this.world, ox, oy, oz, dx, dy, dz, REACH_DISTANCE)
  }

  private heldStack(): ItemStack | null {
    return this.inventory.slots[this.selectedSlot]
  }

  // Linksklick: Mob angreifen oder Block anfangen abzubauen
  private attack(): void {
    this.swingTime = 0.001

    // Mob im Weg?
    const [ox, oy, oz] = this.eyePosition()
    const [dx, dy, dz] = this.lookDirection()
    const blockHit = this.raycast()
    const maxDist = blockHit ? blockHit.distance : REACH_DISTANCE

    let closest: Mob | null = null
    let closestDist = maxDist
    for (const mob of this.mobs) {
      const b = mob.body
      // Ray-AABB-Test
      const t = rayAABB(ox, oy, oz, dx, dy, dz, b.x - b.width / 2, b.y, b.z - b.width / 2, b.x + b.width / 2, b.y + b.height, b.z + b.width / 2)
      if (t !== null && t < closestDist) {
        closest = mob
        closestDist = t
      }
    }

    if (closest) {
      const held = this.heldStack()
      const tool = held ? getItemDef(held.id)?.tool : undefined
      const damage = tool ? tool.damage : 1
      closest.hurt(damage, dx, dz)
      sounds.play('hurt', 1.3)
      if (held && tool && held.durability !== undefined) {
        held.durability--
        if (held.durability <= 0) {
          this.inventory.slots[this.selectedSlot] = null
          sounds.play('pop', 0.6)
        }
        this.markUIDirty()
      }
      return
    }
    // Kein Mob getroffen: der Blockabbau startet im Update-Loop (updateBreaking)
  }

  // Rechtsklick: platzieren, benutzen, essen
  private useItem(): void {
    if (this.useCooldown > 0) return
    this.useCooldown = 0.22
    this.swingTime = 0.001

    const hit = this.raycast()

    // Interaktive Blöcke öffnen
    if (hit) {
      const id = this.world.getBlockAt(hit.x, hit.y, hit.z)
      if (id === Block.CraftingTable) {
        this.openScreen('crafting')
        return
      }
      if (id === Block.Furnace) {
        const key = `${hit.x},${hit.y},${hit.z}`
        if (!this.furnaces.has(key)) {
          this.furnaces.set(key, { input: null, fuel: null, output: null, progress: 0, fuelLeft: 0, fuelTotal: 0 })
        }
        this.openScreen('furnace', key)
        return
      }
      if (id === Block.Tnt) {
        // TNT mit leerer Hand oder Nicht-Block-Item zünden
        const held = this.heldStack()
        if (!held || !isBlockId(held.id)) {
          this.tntFuses.push({ x: hit.x, y: hit.y, z: hit.z, t: 2.0 })
          sounds.play('click', 0.5)
          return
        }
      }
    }

    const held = this.heldStack()
    if (!held) return

    // Essen
    const def = getItemDef(held.id)
    if (def?.food) {
      if (this.hunger < 20 && this.mode === 'survival') {
        this.hunger = Math.min(20, this.hunger + def.food)
        this.inventory.consumeOne(this.selectedSlot)
        sounds.play('eat')
        this.markUIDirty()
      }
      return
    }

    // Block platzieren
    if (isBlockId(held.id) && hit) {
      const targetId = this.world.getBlockAt(hit.x, hit.y, hit.z)
      const targetDef = getBlock(targetId)
      let px = hit.x
      let py = hit.y
      let pz = hit.z
      if (!targetDef?.replaceable) {
        px += hit.nx
        py += hit.ny
        pz += hit.nz
      }
      if (py < 0 || py >= WORLD_HEIGHT) return
      const existing = this.world.getBlockAt(px, py, pz)
      const existingDef = existing !== 0 ? getBlock(existing) : undefined
      if (existing !== 0 && !existingDef?.replaceable) return

      const placeDef = getBlock(held.id)
      // nicht in sich selbst oder Mobs hineinbauen
      if (placeDef.solid) {
        if (blockIntersectsBody(px, py, pz, this.body)) return
        for (const mob of this.mobs) {
          if (blockIntersectsBody(px, py, pz, mob.body)) return
        }
      }

      this.world.setBlockAt(px, py, pz, held.id)
      if (this.mode === 'survival') {
        this.inventory.consumeOne(this.selectedSlot)
        this.markUIDirty()
      }
      sounds.play('place')
    }
  }

  // Mittelklick: Block in die Hotbar übernehmen (Kreativ)
  private pickBlock(): void {
    const hit = this.raycast()
    if (!hit) return
    const id = this.world.getBlockAt(hit.x, hit.y, hit.z)
    if (id === 0) return
    // schon in der Hotbar?
    for (let i = 0; i < HOTBAR_SIZE; i++) {
      if (this.inventory.slots[i]?.id === id) {
        this.selectedSlot = i
        this.markUIDirty()
        return
      }
    }
    if (this.mode === 'creative') {
      this.inventory.slots[this.selectedSlot] = makeStack(id, 1)
      this.markUIDirty()
    }
  }

  private dropSelected(): void {
    const s = this.heldStack()
    if (!s) return
    const [dx, dy, dz] = this.lookDirection()
    const [ex, ey, ez] = this.eyePosition()
    const e = this.spawnItemEntity(s.id, 1, ex + dx * 0.5, ey - 0.3, ez + dz * 0.5)
    if (e) {
      e.body.vx = dx * 6
      e.body.vy = dy * 6 + 2
      e.body.vz = dz * 6
      e.pickupDelay = 1.5
    }
    this.inventory.consumeOne(this.selectedSlot)
    sounds.play('pop', 0.8)
    this.markUIDirty()
  }

  // Abbauzeit in Sekunden für einen Block mit aktuellem Werkzeug
  private breakTime(blockId: number): number {
    if (this.mode === 'creative') return 0.05
    const def = getBlock(blockId)
    if (!def || def.hardness < 0) return Infinity
    let speed = 1
    const held = this.heldStack()
    if (held) {
      const tool = getItemDef(held.id)?.tool
      if (tool && tool.type === def.tool) speed = tool.speed
    }
    // ohne passendes Werkzeug bei minTier > 0 dauert es 3x so lang (und droppt nichts)
    const canHarvest = this.canHarvest(def)
    let t = (def.hardness * 1.5) / speed
    if (!canHarvest) t = def.hardness * 5
    if (this.body.headInWater) t *= 5
    if (!this.body.onGround && !this.flying) t *= 2
    return Math.max(0.05, t)
  }

  private canHarvest(def: { minTier: number; tool: string }): boolean {
    if (def.minTier === 0) return true
    const held = this.heldStack()
    const tool = held ? getItemDef(held.id)?.tool : undefined
    return !!tool && tool.type === def.tool && tool.tier >= def.minTier
  }

  private updateBreaking(dt: number): void {
    if (!this.mouseDown[0] || this.screen || this.dead) {
      this.breaking = null
      this.crackMesh.visible = false
      return
    }
    const hit = this.currentTarget
    if (!hit) {
      this.breaking = null
      this.crackMesh.visible = false
      return
    }

    const id = this.world.getBlockAt(hit.x, hit.y, hit.z)
    if (id === 0) {
      this.breaking = null
      this.crackMesh.visible = false
      return
    }

    if (!this.breaking || this.breaking.x !== hit.x || this.breaking.y !== hit.y || this.breaking.z !== hit.z) {
      const total = this.breakTime(id)
      if (!isFinite(total)) {
        this.breaking = null
        this.crackMesh.visible = false
        return
      }
      this.breaking = { x: hit.x, y: hit.y, z: hit.z, progress: 0, total }
    }

    this.breaking.progress += dt
    this.swingTime = 0.001

    // Riss-Overlay
    const stage = Math.min(9, Math.floor((this.breaking.progress / this.breaking.total) * 10))
    this.crackMesh.visible = this.breaking.total > 0.1
    this.crackMesh.position.set(hit.x + 0.5, hit.y + 0.5, hit.z + 0.5)
    ;(this.crackMesh.material as THREE.MeshBasicMaterial).map = this.crackTextures[stage]
    ;(this.crackMesh.material as THREE.MeshBasicMaterial).needsUpdate = true

    if (this.breaking.progress >= this.breaking.total) {
      this.finishBreaking(id, hit.x, hit.y, hit.z)
    }
  }

  private finishBreaking(id: number, x: number, y: number, z: number): void {
    const def = getBlock(id)
    this.world.setBlockAt(x, y, z, 0)
    this.particles.burst(this.atlas, id, x, y, z)
    sounds.play('dig')
    this.breaking = null
    this.crackMesh.visible = false
    this.exhaustion += 0.005

    // Kies/Sand fallen lassen (vereinfachte Gravitation: direkt nach unten versetzen)
    this.applyGravityBlocks(x, y + 1, z)

    if (this.mode === 'survival') {
      // Drops
      if (def && this.canHarvest(def)) {
        const drop = def.drops === undefined ? { id, count: 1 } : def.drops
        if (drop) this.spawnItemEntity(drop.id, drop.count, x + 0.5, y + 0.4, z + 0.5)
        // Äpfel aus Eichenlaub (Chance)
        if (id === Block.OakLeaves && Math.random() < 0.08) {
          this.spawnItemEntity(Item.Apple, 1, x + 0.5, y + 0.4, z + 0.5)
        }
        if ((id === Block.OakLeaves || id === Block.BirchLeaves) && Math.random() < 0.05) {
          this.spawnItemEntity(Item.Stick, 1, x + 0.5, y + 0.4, z + 0.5)
        }
      }
      // Werkzeug abnutzen
      const held = this.heldStack()
      if (held && held.durability !== undefined) {
        held.durability--
        if (held.durability <= 0) {
          this.inventory.slots[this.selectedSlot] = null
          sounds.play('pop', 0.6)
        }
        this.markUIDirty()
      }
    }
  }

  // Sand/Kies über einer entstandenen Lücke fällt
  private applyGravityBlocks(x: number, y: number, z: number): void {
    let cy = y
    while (cy < WORLD_HEIGHT) {
      const id = this.world.getBlockAt(x, cy, z)
      if (id !== Block.Sand && id !== Block.Gravel) break
      // Fallziel suchen
      let ty = cy - 1
      while (ty > 0 && this.world.getBlockAt(x, ty, z) === 0) ty--
      // nicht in Spieler oder Mobs hinein materialisieren — Block bleibt dann schweben
      if (blockIntersectsBody(x, ty + 1, z, this.body)) break
      if (this.mobs.some((m) => blockIntersectsBody(x, ty + 1, z, m.body))) break
      this.world.setBlockAt(x, cy, z, 0)
      this.world.setBlockAt(x, ty + 1, z, id)
      cy++
    }
  }

  // ---------- Explosionen ----------

  explode(cx: number, cy: number, cz: number, radius: number): void {
    sounds.play('explosion')
    const r = Math.ceil(radius)
    for (let dy = -r; dy <= r; dy++) {
      for (let dz = -r; dz <= r; dz++) {
        for (let dx = -r; dx <= r; dx++) {
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz)
          if (dist > radius + (Math.random() - 0.5)) continue
          const x = Math.floor(cx) + dx
          const y = Math.floor(cy) + dy
          const z = Math.floor(cz) + dz
          const id = this.world.getBlockAt(x, y, z)
          if (id === 0 || id === Block.Bedrock || id === Block.Obsidian || id === Block.Water) continue
          if (id === Block.Tnt) {
            // Kettenreaktion
            this.tntFuses.push({ x, y, z, t: 0.3 + Math.random() * 0.5 })
            continue
          }
          this.world.setBlockAt(x, y, z, 0)
          if (Math.random() < 0.15 && this.mode === 'survival') {
            const def = getBlock(id)
            const drop = def?.drops === undefined ? { id, count: 1 } : def?.drops
            if (drop) this.spawnItemEntity(drop.id, drop.count, x + 0.5, y + 0.5, z + 0.5)
          }
          if (Math.random() < 0.12) this.particles.burst(this.atlas, id, x, y, z, 6)
        }
      }
    }

    // Schaden an Spieler und Mobs
    const hurtRadius = radius * 2
    const pd = Math.hypot(this.body.x - cx, this.body.y + 0.9 - cy, this.body.z - cz)
    if (pd < hurtRadius && this.mode === 'survival') {
      this.damagePlayer(Math.round((1 - pd / hurtRadius) * 14))
      const k = 12 * (1 - pd / hurtRadius)
      this.body.vx += ((this.body.x - cx) / (pd || 1)) * k
      this.body.vy += 6 * (1 - pd / hurtRadius)
      this.body.vz += ((this.body.z - cz) / (pd || 1)) * k
    }
    for (const mob of this.mobs) {
      const md = Math.hypot(mob.body.x - cx, mob.body.y - cy, mob.body.z - cz)
      if (md < hurtRadius) {
        mob.hurt(Math.round((1 - md / hurtRadius) * 16), mob.body.x - cx, mob.body.z - cz)
      }
    }
  }

  // ---------- Item-Entities ----------

  private spawnItemEntity(id: number, count: number, x: number, y: number, z: number): ItemEntity | null {
    if (this.itemEntities.length > 200) return null
    // Icon-Textur aus dem Atlas
    const key = isBlockId(id) ? getBlock(id).tex.side : (getItemDef(id)?.tex ?? 'stone')
    const idx = this.atlas.indexOf(key)
    const cv = document.createElement('canvas')
    cv.width = cv.height = TILE
    const ctx = cv.getContext('2d')!
    ctx.drawImage(this.atlas.canvas, (idx % this.atlas.tilesX) * TILE, Math.floor(idx / this.atlas.tilesX) * TILE, TILE, TILE, 0, 0, TILE, TILE)
    const tex = new THREE.CanvasTexture(cv)
    tex.magFilter = THREE.NearestFilter
    const mesh = new THREE.Mesh(
      new THREE.PlaneGeometry(0.3, 0.3),
      new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }),
    )
    this.scene.add(mesh)
    const e = new ItemEntity(id, count, x, y, z, mesh)
    e.body.vx = (Math.random() - 0.5) * 2
    e.body.vy = 3
    e.body.vz = (Math.random() - 0.5) * 2
    this.itemEntities.push(e)
    return e
  }

  private removeItemEntityMesh(e: ItemEntity): void {
    this.scene.remove(e.mesh)
    e.mesh.geometry.dispose()
    const mat = e.mesh.material as THREE.MeshBasicMaterial
    mat.map?.dispose()
    mat.dispose()
  }

  private updateItemEntities(dt: number): void {
    const keep: ItemEntity[] = []
    for (const e of this.itemEntities) {
      e.age += dt
      if (e.pickupDelay > 0) e.pickupDelay -= dt
      e.body.vy -= GRAVITY * 0.6 * dt
      if (e.body.inWater) e.body.vy = Math.max(e.body.vy, 1.5)
      moveBody(this.world, e.body, e.body.vx * dt, e.body.vy * dt, e.body.vz * dt)
      if (e.body.onGround) {
        e.body.vx *= 0.8
        e.body.vz *= 0.8
      }

      const dx = this.body.x - e.body.x
      const dy = this.body.y + 0.8 - e.body.y
      const dz = this.body.z - e.body.z
      const dist = Math.hypot(dx, dy, dz)

      // Magnet + Aufsammeln
      if (e.pickupDelay <= 0 && !this.dead) {
        if (dist < 0.9) {
          const rest = this.inventory.add(e.id, e.count)
          if (rest === 0) {
            sounds.play('pop', 1.1)
            this.removeItemEntityMesh(e)
            this.markUIDirty()
            continue
          } else {
            e.count = rest
          }
        } else if (dist < 2.2) {
          e.body.vx += (dx / dist) * 18 * dt
          e.body.vy += (dy / dist) * 18 * dt
          e.body.vz += (dz / dist) * 18 * dt
        }
      }

      if (e.age > 300 || e.body.y < -20) {
        this.removeItemEntityMesh(e)
        continue
      }

      e.mesh.position.set(e.body.x, e.body.y + 0.15 + Math.sin(e.age * 2.5) * 0.05, e.body.z)
      e.mesh.rotation.y = e.age * 1.5
      keep.push(e)
    }
    this.itemEntities = keep
  }

  // ---------- Mobs ----------

  private isNight(): boolean {
    return Math.sin(this.timeOfDay * Math.PI * 2) < -0.1
  }

  private updateMobSpawning(dt: number): void {
    this.mobSpawnTimer -= dt
    if (this.mobSpawnTimer > 0) return
    this.mobSpawnTimer = 2

    // Despawn weit entfernter Mobs
    this.mobs = this.mobs.filter((m) => {
      const d = Math.hypot(m.body.x - this.body.x, m.body.z - this.body.z)
      if (d > 72) {
        this.scene.remove(m.group)
        m.dispose()
        return false
      }
      return true
    })

    const night = this.isNight()
    const hostileCount = this.mobs.filter((m) => m.spec.hostile).length
    const passiveCount = this.mobs.length - hostileCount
    const wantHostile = night && hostileCount < 8
    const wantPassive = !night && passiveCount < 8

    if (!wantHostile && !wantPassive) return

    // Zufällige Position im Ring 20–44 um den Spieler
    const angle = Math.random() * Math.PI * 2
    const dist = 20 + Math.random() * 24
    const x = Math.floor(this.body.x + Math.cos(angle) * dist)
    const z = Math.floor(this.body.z + Math.sin(angle) * dist)
    if (!this.world.isLoadedAt(x, z)) return
    const y = this.world.highestBlockAt(x, z)
    if (y <= 1 || y >= WORLD_HEIGHT - 4) return
    const ground = this.world.getBlockAt(x, y, z)
    const groundDef = getBlock(ground)
    if (!groundDef?.solid || groundDef.liquid) return

    let type: MobType
    if (wantHostile) {
      type = Math.random() < 0.65 ? 'zombie' : 'creeper'
    } else {
      if (ground !== Block.Grass && ground !== Block.SnowyGrass) return
      type = Math.random() < 0.5 ? 'pig' : 'sheep'
    }

    const mob = new Mob(type, x + 0.5, y + 1.05, z + 0.5)
    this.mobs.push(mob)
    this.scene.add(mob.group)
  }

  private updateMobs(dt: number): void {
    const night = this.isNight()
    const remaining: Mob[] = []
    for (const mob of this.mobs) {
      const events = mob.update(dt, this.world, this.body.x, this.body.y, this.body.z, night)
      for (const ev of events) {
        if (ev.type === 'attack' && this.mode === 'survival' && !this.dead) {
          this.damagePlayer(ev.damage ?? 2)
          // Rückstoß
          const dx = this.body.x - mob.body.x
          const dz = this.body.z - mob.body.z
          const len = Math.hypot(dx, dz) || 1
          this.body.vx += (dx / len) * 8
          this.body.vy += 4
          this.body.vz += (dz / len) * 8
        } else if (ev.type === 'explode') {
          this.explode(mob.body.x, mob.body.y + 0.8, mob.body.z, ev.radius ?? 3)
        } else if (ev.type === 'die') {
          for (const drop of mob.spec.drops) {
            if (this.mode === 'survival') {
              this.spawnItemEntity(drop.id, drop.count, mob.body.x, mob.body.y + 0.5, mob.body.z)
            }
          }
        }
      }

      if (mob.dead) {
        this.scene.remove(mob.group)
        mob.dispose()
      } else {
        // Helligkeit ans Licht anpassen
        const bx = Math.floor(mob.body.x)
        const by = Math.floor(mob.body.y + 0.5)
        const bz = Math.floor(mob.body.z)
        const sky = this.world.getSkyLightAt(bx, by, bz) / 15
        const block = this.world.getBlockLightAt(bx, by, bz) / 15
        const light = Math.max(sky * dayFactor(this.timeOfDay), block)
        mob.applyBrightness(Math.pow(0.86, (1 - light) * 15))
        remaining.push(mob)
      }
    }
    this.mobs = remaining
  }

  // ---------- Spieler-Update ----------

  private damagePlayer(amount: number): void {
    if (this.mode === 'creative' || amount <= 0 || this.dead) return
    this.health = Math.max(0, this.health - amount)
    sounds.play('hurt')
    this.markUIDirty()
    if (this.health <= 0) {
      this.dead = true
      this.breaking = null
      if (document.pointerLockElement === this.canvas) document.exitPointerLock()
      this.markUIDirty()
    }
  }

  private updatePlayer(dt: number): void {
    const b = this.body
    const inUI = this.screen !== null || this.dead

    this.sneaking = !inUI && this.keys.has('ShiftLeft') && !this.flying
    if (this.sneaking) this.sprinting = false
    if (this.hunger <= 6) this.sprinting = false

    // Bewegungsrichtung aus Tasten
    let mx = 0
    let mz = 0
    if (!inUI) {
      if (this.keys.has('KeyW')) mz -= 1
      if (this.keys.has('KeyS')) mz += 1
      if (this.keys.has('KeyA')) mx -= 1
      if (this.keys.has('KeyD')) mx += 1
      if (this.keys.has('ControlLeft') && mz < 0) this.sprinting = true
    }
    if (mz >= 0) this.sprinting = false
    const len = Math.hypot(mx, mz)
    if (len > 0) {
      mx /= len
      mz /= len
    }

    // in Weltkoordinaten drehen (Kamera-Konvention: yaw=0 blickt Richtung -Z,
    // Vorwärts = (-sin(yaw), -cos(yaw)), Rechts = (cos(yaw), -sin(yaw)))
    const sin = Math.sin(this.yaw)
    const cos = Math.cos(this.yaw)
    const wx = mx * cos + mz * sin
    const wz = -mx * sin + mz * cos

    let speed = WALK_SPEED
    if (this.sprinting) speed = SPRINT_SPEED
    if (this.sneaking) speed = SNEAK_SPEED
    if (this.flying) speed = this.sprinting ? FLY_SPRINT_SPEED : FLY_SPEED
    if (b.inWater && !this.flying) speed *= 0.55

    // Beschleunigung: am Boden knackig, in der Luft träger
    const control = this.flying ? 8 : b.onGround ? 12 : 3
    b.vx += (wx * speed - b.vx) * Math.min(1, control * dt)
    b.vz += (wz * speed - b.vz) * Math.min(1, control * dt)

    if (this.flying) {
      let vy = 0
      if (!inUI && this.keys.has('Space')) vy += speed
      if (!inUI && this.keys.has('ShiftLeft')) vy -= speed
      b.vy += (vy - b.vy) * Math.min(1, 10 * dt)
      if (b.onGround && this.keys.has('ShiftLeft')) this.flying = false
    } else if (b.inWater) {
      b.vy -= GRAVITY * 0.3 * dt
      b.vy = Math.max(b.vy, -4)
      // an der Oberfläche stärkerer Schub, damit man über 1-Block-Ufer klettern kann
      if (!inUI && this.keys.has('Space')) b.vy = Math.min(b.vy + 24 * dt, b.headInWater ? 3.5 : 6.4)
      this.fallStart = null
    } else {
      b.vy -= GRAVITY * dt
      b.vy = Math.max(b.vy, -TERMINAL_VELOCITY)
      if (!inUI && this.keys.has('Space') && b.onGround) {
        b.vy = JUMP_VELOCITY
        this.exhaustion += this.sprinting ? 0.2 : 0.05
      }
    }

    // Fallhöhe für Fallschaden
    if (!b.onGround && !this.flying && !b.inWater) {
      if (this.fallStart === null || b.y > this.fallStart) {
        if (this.fallStart === null) this.fallStart = b.y
      }
      if (b.vy > 0 && this.fallStart < b.y) this.fallStart = b.y
    }

    const wasOnGround = b.onGround
    const prevY = b.y
    moveBody(this.world, b, b.vx * dt, b.vy * dt, b.vz * dt, this.sneaking)

    // Fallschaden bei Landung
    if (!wasOnGround && b.onGround && this.fallStart !== null) {
      const fall = this.fallStart - b.y
      if (fall > 3.5 && !b.inWater) {
        this.damagePlayer(Math.floor(fall - 3))
      }
      this.fallStart = null
    }
    if (b.onGround) this.fallStart = null
    else if (this.fallStart === null && !this.flying && !b.inWater && b.vy < 0) this.fallStart = Math.max(prevY, b.y)

    // Wasser-Sound
    if (b.inWater && !this.wasInWater) sounds.play('splash')
    this.wasInWater = b.inWater

    // aus der Welt gefallen
    if (b.y < -30) this.damagePlayer(4)

    // Schritte
    const moveSpeed = Math.hypot(b.vx, b.vz)
    if (b.onGround && moveSpeed > 1.5) {
      this.stepTimer -= dt * moveSpeed
      if (this.stepTimer <= 0) {
        this.stepTimer = 1.7
        sounds.play('step', 0.9 + Math.random() * 0.3)
      }
    }

    // Atem / Ertrinken
    if (this.mode === 'survival') {
      if (b.headInWater) {
        this.air -= dt * 20
        if (this.air <= 0) {
          this.air = 0
          this.starveTimer += dt
          if (this.starveTimer > 1) {
            this.starveTimer = 0
            this.damagePlayer(2)
          }
        }
        this.markUIDirty()
      } else if (this.air < 300) {
        this.air = Math.min(300, this.air + dt * 60)
        this.markUIDirty()
      }

      // Hunger & Regeneration
      this.exhaustion += dt * (this.sprinting ? 0.35 : moveSpeed > 0.5 ? 0.015 : 0.003)
      if (this.exhaustion >= 4) {
        this.exhaustion = 0
        if (this.hunger > 0) {
          this.hunger--
          this.markUIDirty()
        }
      }
      if (this.hunger >= 18 && this.health < 20) {
        this.regenTimer += dt
        if (this.regenTimer >= 4) {
          this.regenTimer = 0
          this.health = Math.min(20, this.health + 1)
          this.exhaustion += 1.5
          this.markUIDirty()
        }
      }
      if (this.hunger <= 0) {
        this.starveTimer += dt
        if (this.starveTimer > 4) {
          this.starveTimer = 0
          if (this.health > 1) this.damagePlayer(1)
        }
      }
    }

    // Kamera
    const eye = this.sneaking ? PLAYER_SNEAK_EYE_HEIGHT : PLAYER_EYE_HEIGHT
    this.camera.position.set(b.x, b.y + eye, b.z)
    this.camera.rotation.order = 'YXZ'
    this.camera.rotation.y = this.yaw
    this.camera.rotation.x = this.pitch

    // FOV beim Sprinten
    const targetFov = this.sprinting && moveSpeed > 4 ? 77 : 70
    if (Math.abs(this.camera.fov - targetFov) > 0.5) {
      this.camera.fov += (targetFov - this.camera.fov) * Math.min(1, dt * 8)
      this.camera.updateProjectionMatrix()
    }
  }

  // ---------- Öfen ----------

  private updateFurnaces(dt: number): void {
    let changed = false
    for (const f of this.furnaces.values()) {
      const recipe = f.input ? SMELTING[f.input.id] : undefined

      // Brennstoff nachlegen
      if (recipe && f.fuelLeft <= 0 && f.fuel) {
        const def = getItemDef(f.fuel.id)
        const fuelSec = def?.fuel ?? BLOCK_FUEL[f.fuel.id] ?? 0
        if (fuelSec > 0) {
          f.fuelLeft = fuelSec
          f.fuelTotal = fuelSec
          f.fuel.count--
          if (f.fuel.count <= 0) f.fuel = null
          changed = true
        }
      }

      if (f.fuelLeft > 0) {
        f.fuelLeft -= dt
        if (recipe) {
          // Passt das Ergebnis in den Ausgabe-Slot?
          const fits = !f.output || (f.output.id === recipe.id && f.output.count + recipe.count <= 64)
          if (fits) {
            f.progress += dt / SMELT_TIME_S
            if (f.progress >= 1) {
              f.progress = 0
              if (f.output) f.output.count += recipe.count
              else f.output = makeStack(recipe.id, recipe.count)
              f.input!.count--
              if (f.input!.count <= 0) f.input = null
              changed = true
            }
          } else {
            f.progress = 0
          }
        } else {
          f.progress = 0
        }
      } else if (f.progress > 0) {
        f.progress = Math.max(0, f.progress - dt * 0.3)
      }
    }
    if (changed || (this.openFurnaceKey && this.screen === 'furnace')) this.markUIDirty()
  }

  // ---------- Chunk-Streaming & Meshing ----------

  private updateChunks(): void {
    const pcx = Math.floor(this.body.x / CHUNK_SIZE)
    const pcz = Math.floor(this.body.z / CHUNK_SIZE)
    const rd = this.renderDistance

    // fehlende Chunks sammeln, nächste zuerst
    const missing: Array<[number, number, number]> = []
    for (let dz = -rd; dz <= rd; dz++) {
      for (let dx = -rd; dx <= rd; dx++) {
        const d = dx * dx + dz * dz
        if (d > rd * rd + 2) continue
        if (!this.world.hasChunk(pcx + dx, pcz + dz)) missing.push([pcx + dx, pcz + dz, d])
      }
    }
    missing.sort((a, b) => a[2] - b[2])
    for (let i = 0; i < Math.min(2, missing.length); i++) {
      this.world.ensureChunk(missing[i][0], missing[i][1])
    }

    // zu weit entfernte entladen
    for (const [key, chunk] of this.world.chunks) {
      const dx = chunk.cx - pcx
      const dz = chunk.cz - pcz
      if (dx * dx + dz * dz > (rd + 2) * (rd + 2)) {
        if (chunk.modified) saveChunkBlocks(this.meta.id, key, chunk.blocks)
        this.world.unloadChunk(chunk.cx, chunk.cz)
        const meshes = this.chunkMeshes.get(key)
        if (meshes) {
          if (meshes.opaque) {
            this.scene.remove(meshes.opaque)
            meshes.opaque.geometry.dispose()
          }
          if (meshes.water) {
            this.scene.remove(meshes.water)
            meshes.water.geometry.dispose()
          }
          this.chunkMeshes.delete(key)
        }
      }
    }

    // dirty Chunks neu meshen (nächste zuerst, Budget pro Frame)
    const dirty: Array<[number, import('./chunk').Chunk]> = []
    for (const chunk of this.world.chunks.values()) {
      if (chunk.dirty) {
        const dx = chunk.cx - pcx
        const dz = chunk.cz - pcz
        dirty.push([dx * dx + dz * dz, chunk])
      }
    }
    dirty.sort((a, b) => a[0] - b[0])
    const budget = Math.min(3, dirty.length)
    for (let i = 0; i < budget; i++) {
      this.rebuildChunkMesh(dirty[i][1])
    }
  }

  private rebuildChunkMesh(chunk: import('./chunk').Chunk): void {
    chunk.dirty = false
    const key = chunkKey(chunk.cx, chunk.cz)
    const { opaque, water } = buildChunkGeometry(this.world, chunk, this.atlas)

    let entry = this.chunkMeshes.get(key)
    if (!entry) {
      entry = {}
      this.chunkMeshes.set(key, entry)
    }

    const apply = (data: typeof opaque, existing: THREE.Mesh | undefined, material: THREE.Material): THREE.Mesh | undefined => {
      if (data.indices.length === 0) {
        if (existing) {
          this.scene.remove(existing)
          existing.geometry.dispose()
        }
        return undefined
      }
      const geo = new THREE.BufferGeometry()
      geo.setAttribute('position', new THREE.BufferAttribute(data.positions, 3))
      geo.setAttribute('uv', new THREE.BufferAttribute(data.uvs, 2))
      geo.setAttribute('aLight', new THREE.BufferAttribute(data.light, 2))
      geo.setAttribute('aAO', new THREE.BufferAttribute(data.ao, 1))
      geo.setIndex(new THREE.BufferAttribute(data.indices, 1))
      geo.computeBoundingSphere()
      if (existing) {
        existing.geometry.dispose()
        existing.geometry = geo
        return existing
      }
      const mesh = new THREE.Mesh(geo, material)
      mesh.matrixAutoUpdate = false
      this.scene.add(mesh)
      return mesh
    }

    entry.opaque = apply(opaque, entry.opaque, this.opaqueMaterial)
    entry.water = apply(water, entry.water, this.waterMaterial)
  }

  // ---------- Held Item (Hand) ----------

  private updateHand(dt: number): void {
    const held = this.heldStack()
    const id = held ? held.id : 0

    if (id !== this.handItemId) {
      this.handItemId = id
      if (this.handMesh) {
        this.handGroup.remove(this.handMesh)
        this.handMesh.geometry.dispose()
        const m = this.handMesh.material as THREE.Material
        m.dispose()
        this.handMesh = null
      }
      if (id !== 0) {
        if (isBlockId(id) && !getBlock(id).cross) {
          // Mini-Würfel mit Blocktexturen
          const def = getBlock(id)
          const geo = new THREE.BoxGeometry(0.3, 0.3, 0.3)
          const uvAttr = geo.getAttribute('uv') as THREE.BufferAttribute
          // BoxGeometry-Faces: +x, -x, +y, -y, +z, -z (je 4 UVs)
          const faceKeys = [def.tex.side, def.tex.side, def.tex.top, def.tex.bottom, def.tex.side, def.tex.side]
          for (let f = 0; f < 6; f++) {
            const [u0, v0, u1, v1] = this.atlas.uvRect(faceKeys[f])
            for (let v = 0; v < 4; v++) {
              const i = f * 4 + v
              const ou = uvAttr.getX(i)
              const ov = uvAttr.getY(i)
              uvAttr.setXY(i, u0 + ou * (u1 - u0), v0 + (1 - ov) * (v1 - v0))
            }
          }
          uvAttr.needsUpdate = true
          this.handMesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ map: this.atlasTexture }))
        } else {
          // flaches Item
          const key = isBlockId(id) ? getBlock(id).tex.side : (getItemDef(id)?.tex ?? 'stone')
          const idx = this.atlas.indexOf(key)
          const cv = document.createElement('canvas')
          cv.width = cv.height = TILE
          const ctx = cv.getContext('2d')!
          ctx.drawImage(this.atlas.canvas, (idx % this.atlas.tilesX) * TILE, Math.floor(idx / this.atlas.tilesX) * TILE, TILE, TILE, 0, 0, TILE, TILE)
          const tex = new THREE.CanvasTexture(cv)
          tex.magFilter = THREE.NearestFilter
          this.handMesh = new THREE.Mesh(
            new THREE.PlaneGeometry(0.4, 0.4),
            new THREE.MeshBasicMaterial({ map: tex, transparent: true, alphaTest: 0.1, side: THREE.DoubleSide }),
          )
        }
        this.handGroup.add(this.handMesh)
      }
    }

    if (this.swingTime > 0) {
      this.swingTime += dt
      if (this.swingTime > 0.3) this.swingTime = 0
    }
    // kontinuierliches Schwingen beim Abbauen
    if (this.breaking && this.swingTime === 0) this.swingTime = 0.001

    const swing = this.swingTime > 0 ? Math.sin((this.swingTime / 0.3) * Math.PI) : 0
    const bob = Math.hypot(this.body.vx, this.body.vz) > 0.5 && this.body.onGround
      ? Math.sin(performance.now() * 0.012) * 0.012
      : 0
    this.handGroup.position.set(0.32, -0.32 + bob - swing * 0.15, -0.55 - swing * 0.1)
    this.handGroup.rotation.set(-swing * 1.1, 0.4 - swing * 0.4, 0)
  }

  // ---------- Haupt-Loop ----------

  private frame(): void {
    if (!this.running) return
    const now = performance.now()
    let dt = Math.min(0.1, (now - this.lastFrame) / 1000)
    this.lastFrame = now

    this.fpsCounter++
    this.fpsTimer += dt
    if (this.fpsTimer >= 0.5) {
      this.fps = Math.round(this.fpsCounter / this.fpsTimer)
      this.fpsCounter = 0
      this.fpsTimer = 0
    }

    const gamePaused = this.screen === 'pause'
    if (gamePaused) dt = 0

    if (dt > 0) {
      // Tageszeit
      this.timeOfDay = (this.timeOfDay + dt / DAY_LENGTH_SECONDS) % 1

      this.updatePlayer(dt)

      // Ziel-Block
      this.currentTarget = this.dead || this.screen ? null : this.raycast()
      if (this.currentTarget) {
        this.outline.visible = true
        this.outline.position.set(this.currentTarget.x + 0.5, this.currentTarget.y + 0.5, this.currentTarget.z + 0.5)
      } else {
        this.outline.visible = false
      }

      this.updateBreaking(dt)
      if (this.useCooldown > 0) this.useCooldown -= dt
      // Rechtsklick gedrückt halten → weiterplatzieren
      if (this.mouseDown[2] && !this.screen && !this.dead && this.useCooldown <= 0) this.useItem()

      // TNT-Zünder
      for (let i = this.tntFuses.length - 1; i >= 0; i--) {
        const f = this.tntFuses[i]
        f.t -= dt
        if (f.t <= 0) {
          this.tntFuses.splice(i, 1)
          if (this.world.getBlockAt(f.x, f.y, f.z) === Block.Tnt) {
            this.world.setBlockAt(f.x, f.y, f.z, 0)
            this.explode(f.x + 0.5, f.y + 0.5, f.z + 0.5, 3.5)
          }
        }
      }

      this.updateMobSpawning(dt)
      this.updateMobs(dt)
      this.updateItemEntities(dt)
      this.updateFurnaces(dt)
      this.particles.update(dt, this.world, this.camera)
      this.updateHand(dt)

      // Autosave
      this.autosaveTimer += dt * 1000
      if (this.autosaveTimer >= AUTOSAVE_INTERVAL_MS) {
        this.autosaveTimer = 0
        this.saveAll()
      }
    }

    this.updateChunks()

    // Himmel & Nebel
    const day = dayFactor(this.timeOfDay)
    const { sky, fog } = skyColors(this.timeOfDay)
    this.renderer.setClearColor(sky)
    const fogNear = this.body.headInWater ? 2 : this.renderDistance * CHUNK_SIZE * 0.55
    const fogFar = this.body.headInWater ? 14 : this.renderDistance * CHUNK_SIZE * 0.95
    const fogColor = this.body.headInWater ? new THREE.Color(0x18408c) : fog
    for (const mat of [this.opaqueMaterial, this.waterMaterial]) {
      mat.uniforms.uDayLight.value = day
      mat.uniforms.uFogColor.value = fogColor
      mat.uniforms.uFogNear.value = fogNear
      mat.uniforms.uFogFar.value = fogFar
      mat.uniforms.uTime.value = now / 1000
    }
    if (this.body.headInWater) this.renderer.setClearColor(fogColor)
    this.sky.update(this.timeOfDay, this.camera.position.x, this.camera.position.y, this.camera.position.z)

    this.renderer.render(this.scene, this.camera)

    // UI-Updates gedrosselt
    this.uiThrottle -= dt
    if (this.uiDirty || this.uiThrottle <= 0) {
      this.uiDirty = false
      this.uiThrottle = 0.25
      this.callbacks.onUIState(this.getUIState())
    }

    if (this.showDebug) {
      const bx = Math.floor(this.body.x)
      const by = Math.floor(this.body.y)
      const bz = Math.floor(this.body.z)
      const dirs = ['Norden (-Z)', 'Westen (-X)', 'Süden (+Z)', 'Osten (+X)']
      const yawDeg = ((this.yaw * 180) / Math.PI) % 360
      const facing = dirs[Math.round((((yawDeg + 360) % 360) / 90)) % 4]
      const ticks = Math.floor(((this.timeOfDay + 0.75) % 1) * 24)
      this.callbacks.onDebug({
        fps: this.fps,
        x: this.body.x,
        y: this.body.y,
        z: this.body.z,
        chunkX: Math.floor(bx / CHUNK_SIZE),
        chunkZ: Math.floor(bz / CHUNK_SIZE),
        facing,
        biome: this.world.generator.biomeAt(bx, bz),
        skyLight: this.world.getSkyLightAt(bx, by, bz),
        blockLight: this.world.getBlockLightAt(bx, by, bz),
        loadedChunks: this.world.chunks.size,
        mobs: this.mobs.length,
        time: `${String(ticks).padStart(2, '0')}:00`,
      })
    }
  }

  // Für die UI: Icon eines Items
  iconFor(id: number): string {
    return itemIconDataURL(this.atlas, id)
  }
}

// Ray-vs-AABB (slab method), gibt Distanz oder null zurück
function rayAABB(
  ox: number, oy: number, oz: number,
  dx: number, dy: number, dz: number,
  minX: number, minY: number, minZ: number,
  maxX: number, maxY: number, maxZ: number,
): number | null {
  let tmin = -Infinity
  let tmax = Infinity
  const dirs = [dx, dy, dz]
  const mins = [minX, minY, minZ]
  const maxs = [maxX, maxY, maxZ]
  const origins = [ox, oy, oz]
  for (let i = 0; i < 3; i++) {
    if (Math.abs(dirs[i]) < 1e-9) {
      if (origins[i] < mins[i] || origins[i] > maxs[i]) return null
    } else {
      let t1 = (mins[i] - origins[i]) / dirs[i]
      let t2 = (maxs[i] - origins[i]) / dirs[i]
      if (t1 > t2) {
        const tmp = t1
        t1 = t2
        t2 = tmp
      }
      tmin = Math.max(tmin, t1)
      tmax = Math.min(tmax, t2)
      if (tmin > tmax) return null
    }
  }
  return tmin >= 0 ? tmin : tmax >= 0 ? 0 : null
}
