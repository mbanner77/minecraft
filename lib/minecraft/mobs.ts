// Mobs: Schwein, Schaf (passiv), Zombie, Creeper (feindlich) — Box-Modelle,
// einfache Wander-/Verfolgungs-KI, Physik über die gemeinsame AABB-Engine.

import * as THREE from 'three'
import { World } from './world'
import { PhysicsBody, moveBody } from './physics'
import { GRAVITY, TERMINAL_VELOCITY } from './constants'
import { Item } from './blocks'

export type MobType = 'pig' | 'sheep' | 'zombie' | 'creeper'

export interface MobEvent {
  type: 'attack' | 'explode' | 'die'
  damage?: number
  radius?: number
}

interface MobSpec {
  width: number
  height: number
  health: number
  speed: number
  hostile: boolean
  drops: Array<{ id: number; count: number }>
}

const SPECS: Record<MobType, MobSpec> = {
  pig: { width: 0.9, height: 0.9, health: 10, speed: 1.2, hostile: false, drops: [{ id: Item.RawPorkchop, count: 2 }] },
  sheep: { width: 0.9, height: 1.15, health: 8, speed: 1.1, hostile: false, drops: [{ id: Item.RawMutton, count: 1 }, { id: 34, count: 1 }] },
  zombie: { width: 0.6, height: 1.9, health: 20, speed: 1.9, hostile: true, drops: [] },
  creeper: { width: 0.6, height: 1.7, health: 20, speed: 1.7, hostile: true, drops: [{ id: 40, count: 1 }] },
}

// kleine Rausch-Textur in einer Grundfarbe
function noiseTexture(r: number, g: number, b: number, variation = 0.15): THREE.CanvasTexture {
  const cv = document.createElement('canvas')
  cv.width = cv.height = 8
  const ctx = cv.getContext('2d')!
  for (let y = 0; y < 8; y++) {
    for (let x = 0; x < 8; x++) {
      const f = 1 - variation + Math.random() * variation * 2
      ctx.fillStyle = `rgb(${(r * f) | 0},${(g * f) | 0},${(b * f) | 0})`
      ctx.fillRect(x, y, 1, 1)
    }
  }
  const tex = new THREE.CanvasTexture(cv)
  tex.magFilter = THREE.NearestFilter
  return tex
}

interface PartColors {
  main: [number, number, number]
  accent?: [number, number, number]
}

function makePart(w: number, h: number, d: number, colors: PartColors): THREE.Mesh {
  const tex = noiseTexture(...colors.main)
  const mat = new THREE.MeshBasicMaterial({ map: tex })
  mat.userData.baseColor = new THREE.Color(1, 1, 1)
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), mat)
  return mesh
}

export class Mob {
  readonly type: MobType
  readonly spec: MobSpec
  body: PhysicsBody
  group = new THREE.Group()
  health: number
  dead = false
  yaw = 0

  private legs: THREE.Mesh[] = []
  private walkPhase = 0
  private wanderTimer = 0
  private moving = false
  private fleeTimer = 0
  private attackCooldown = 0
  private hurtFlash = 0
  fuse = -1 // Creeper: >= 0 → zündet

  constructor(type: MobType, x: number, y: number, z: number) {
    this.type = type
    this.spec = SPECS[type]
    this.health = this.spec.health
    this.body = {
      x, y, z,
      vx: 0, vy: 0, vz: 0,
      width: this.spec.width,
      height: this.spec.height,
      onGround: false,
      inWater: false,
      headInWater: false,
    }
    this.buildModel()
  }

  private buildModel(): void {
    const g = this.group
    if (this.type === 'pig') {
      const pink: PartColors = { main: [238, 155, 160] }
      const body = makePart(0.9, 0.55, 1.2, pink)
      body.position.y = 0.65
      const head = makePart(0.55, 0.55, 0.55, pink)
      head.position.set(0, 0.75, -0.8)
      const snout = makePart(0.25, 0.18, 0.1, { main: [225, 120, 130] })
      snout.position.set(0, 0.68, -1.12)
      g.add(body, head, snout)
      for (const [lx, lz] of [[-0.28, -0.4], [0.28, -0.4], [-0.28, 0.4], [0.28, 0.4]]) {
        const leg = makePart(0.22, 0.4, 0.22, pink)
        leg.position.set(lx, 0.2, lz)
        this.legs.push(leg)
        g.add(leg)
      }
    } else if (this.type === 'sheep') {
      const wool: PartColors = { main: [225, 225, 225] }
      const body = makePart(1.0, 0.7, 1.3, wool)
      body.position.y = 0.85
      const head = makePart(0.45, 0.45, 0.5, { main: [200, 180, 170] })
      head.position.set(0, 1.05, -0.85)
      g.add(body, head)
      for (const [lx, lz] of [[-0.25, -0.4], [0.25, -0.4], [-0.25, 0.4], [0.25, 0.4]]) {
        const leg = makePart(0.2, 0.5, 0.2, { main: [200, 180, 170] })
        leg.position.set(lx, 0.25, lz)
        this.legs.push(leg)
        g.add(leg)
      }
    } else if (this.type === 'zombie') {
      const skin: PartColors = { main: [92, 150, 90] }
      const cloth: PartColors = { main: [70, 110, 160] }
      const head = makePart(0.5, 0.5, 0.5, skin)
      head.position.y = 1.65
      const torso = makePart(0.5, 0.7, 0.28, cloth)
      torso.position.y = 1.05
      g.add(head, torso)
      for (const side of [-1, 1]) {
        const arm = makePart(0.2, 0.6, 0.2, skin)
        arm.position.set(side * 0.36, 1.15, -0.15)
        arm.rotation.x = -Math.PI / 2.4
        g.add(arm)
        const leg = makePart(0.22, 0.7, 0.22, { main: [60, 70, 120] })
        leg.position.set(side * 0.13, 0.35, 0)
        this.legs.push(leg)
        g.add(leg)
      }
    } else {
      const green: PartColors = { main: [110, 170, 90] }
      const head = makePart(0.5, 0.5, 0.5, green)
      head.position.y = 1.45
      const torso = makePart(0.42, 0.9, 0.3, green)
      torso.position.y = 0.75
      g.add(head, torso)
      for (const [lx, lz] of [[-0.15, -0.2], [0.15, -0.2], [-0.15, 0.2], [0.15, 0.2]]) {
        const leg = makePart(0.22, 0.3, 0.25, green)
        leg.position.set(lx, 0.15, lz)
        this.legs.push(leg)
        g.add(leg)
      }
    }
  }

  hurt(damage: number, knockX: number, knockZ: number): void {
    this.health -= damage
    this.hurtFlash = 0.35
    const k = 6
    const len = Math.hypot(knockX, knockZ) || 1
    this.body.vx += (knockX / len) * k
    this.body.vz += (knockZ / len) * k
    this.body.vy = Math.max(this.body.vy, 4.5)
    if (!this.spec.hostile) this.fleeTimer = 4
    if (this.health <= 0) this.dead = true
  }

  update(dt: number, world: World, px: number, py: number, pz: number, isNight: boolean): MobEvent[] {
    const events: MobEvent[] = []
    const b = this.body
    if (this.attackCooldown > 0) this.attackCooldown -= dt
    if (this.hurtFlash > 0) this.hurtFlash -= dt

    const distToPlayer = Math.hypot(px - b.x, py - b.y, pz - b.z)

    // ---- Verhalten ----
    let targetSpeed = 0
    if (this.spec.hostile && (isNight || distToPlayer < 16)) {
      if (distToPlayer < 20) {
        // Spieler verfolgen
        this.yaw = Math.atan2(px - b.x, pz - b.z)
        targetSpeed = this.spec.speed
        this.moving = true

        if (this.type === 'zombie' && distToPlayer < 1.4 && this.attackCooldown <= 0) {
          this.attackCooldown = 1.0
          events.push({ type: 'attack', damage: 3 })
        }
        if (this.type === 'creeper') {
          if (distToPlayer < 2.2) {
            if (this.fuse < 0) this.fuse = 1.5
          } else if (this.fuse >= 0 && distToPlayer > 4) {
            this.fuse = -1 // Spieler entkommen → entschärft
          }
          if (this.fuse >= 0) {
            this.fuse -= dt
            targetSpeed = 0
            if (this.fuse <= 0) {
              this.dead = true
              events.push({ type: 'explode', radius: 3 })
            }
          }
        }
      }
    } else {
      // Wandern / Fliehen
      this.wanderTimer -= dt
      if (this.fleeTimer > 0) {
        this.fleeTimer -= dt
        this.yaw = Math.atan2(b.x - px, b.z - pz) // weg vom Spieler
        targetSpeed = this.spec.speed * 1.8
        this.moving = true
      } else {
        if (this.wanderTimer <= 0) {
          this.moving = Math.random() > 0.4
          this.yaw = Math.random() * Math.PI * 2
          this.wanderTimer = 1.5 + Math.random() * 3.5
        }
        targetSpeed = this.moving ? this.spec.speed * 0.6 : 0
      }
    }

    // ---- Physik ----
    const dirX = Math.sin(this.yaw)
    const dirZ = Math.cos(this.yaw)
    const accel = 18
    b.vx += (dirX * targetSpeed - b.vx) * Math.min(1, accel * dt) * (b.onGround ? 1 : 0.3)
    b.vz += (dirZ * targetSpeed - b.vz) * Math.min(1, accel * dt) * (b.onGround ? 1 : 0.3)

    if (b.inWater) {
      b.vy += (-GRAVITY * 0.25) * dt
      b.vy = Math.max(b.vy, -3)
      if (targetSpeed > 0) b.vy = Math.max(b.vy, 2) // schwimmen
    } else {
      b.vy -= GRAVITY * dt
      b.vy = Math.max(b.vy, -TERMINAL_VELOCITY)
    }

    // Hindernis voraus? → springen
    if (targetSpeed > 0 && b.onGround) {
      const aheadX = b.x + dirX * 0.7
      const aheadZ = b.z + dirZ * 0.7
      const feet = world.getBlockAt(Math.floor(aheadX), Math.floor(b.y + 0.1), Math.floor(aheadZ))
      const head = world.getBlockAt(Math.floor(aheadX), Math.floor(b.y + 1.1), Math.floor(aheadZ))
      if (feet !== 0 && head === 0) b.vy = 8.5
    }

    moveBody(world, b, b.vx * dt, b.vy * dt, b.vz * dt)

    // in den Abgrund gefallen
    if (b.y < -10) this.dead = true

    // ---- Modell aktualisieren ----
    this.group.position.set(b.x, b.y, b.z)
    this.group.rotation.y = this.yaw + Math.PI // Modelle schauen Richtung -Z

    const speed = Math.hypot(b.vx, b.vz)
    this.walkPhase += speed * dt * 4
    for (let i = 0; i < this.legs.length; i++) {
      this.legs[i].rotation.x = Math.sin(this.walkPhase + (i % 2) * Math.PI) * Math.min(0.6, speed * 0.5)
    }

    // Verletzungs-/Zünd-Blinken
    const flash = this.hurtFlash > 0 ? 1 : this.fuse >= 0 && Math.sin(this.fuse * 25) > 0 ? 2 : 0
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined
      if (mat && mat.color) {
        if (flash === 1) mat.color.setRGB(1.5, 0.4, 0.4)
        else if (flash === 2) mat.color.setRGB(1.8, 1.8, 1.8)
        else mat.color.setRGB(1, 1, 1)
      }
    })

    if (this.dead && events.every((e) => e.type !== 'explode')) events.push({ type: 'die' })
    return events
  }

  // Helligkeit ans lokale Licht anpassen (vom Engine-Loop gesetzt)
  applyBrightness(brightness: number): void {
    if (this.hurtFlash > 0 || this.fuse >= 0) return
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined
      if (mat && mat.color) mat.color.setRGB(brightness, brightness, brightness)
    })
  }

  dispose(): void {
    this.group.traverse((o) => {
      const mesh = o as THREE.Mesh
      if (mesh.geometry) mesh.geometry.dispose()
      const mat = mesh.material as THREE.MeshBasicMaterial | undefined
      if (mat) {
        mat.map?.dispose()
        mat.dispose()
      }
    })
  }
}
