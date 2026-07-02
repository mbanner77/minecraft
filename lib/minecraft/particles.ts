// Einfache Block-Partikel (Abbau, Explosionen) als instanziierte Quads mit Schwerkraft

import * as THREE from 'three'
import { World } from './world'
import { getBlock } from './blocks'
import { TextureAtlas, TILE } from './textures'

interface Particle {
  x: number; y: number; z: number
  vx: number; vy: number; vz: number
  life: number
  maxLife: number
  size: number
  u: number; v: number // zufälliger Ausschnitt der Blocktextur
}

const MAX_PARTICLES = 400

export class ParticleSystem {
  mesh: THREE.InstancedMesh
  private particles: Particle[] = []
  private material: THREE.MeshBasicMaterial
  private dummy = new THREE.Object3D()
  private uvOffsets: Float32Array

  constructor(atlas: TextureAtlas, atlasTexture: THREE.Texture) {
    const geo = new THREE.PlaneGeometry(1, 1)
    this.material = new THREE.MeshBasicMaterial({
      map: atlasTexture,
      transparent: true,
      alphaTest: 0.1,
      side: THREE.DoubleSide,
    })
    // Pro Instanz ein UV-Offset; die Plane-UVs werden auf einen 2x2-Pixel-Ausschnitt skaliert
    const su = 2 / (atlas.tilesX * TILE)
    const sv = 2 / (atlas.tilesY * TILE)
    this.material.onBeforeCompile = (shader) => {
      shader.vertexShader = shader.vertexShader
        .replace(
          '#include <common>',
          '#include <common>\nattribute vec2 uvOffset;',
        )
        .replace(
          '#include <uv_vertex>',
          `#include <uv_vertex>\n vMapUv = uvOffset + uv * vec2(${su.toFixed(8)}, ${sv.toFixed(8)});`,
        )
    }
    this.mesh = new THREE.InstancedMesh(geo, this.material, MAX_PARTICLES)
    this.mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage)
    this.mesh.frustumCulled = false
    this.mesh.count = 0
    this.uvOffsets = new Float32Array(MAX_PARTICLES * 2)
    geo.setAttribute('uvOffset', new THREE.InstancedBufferAttribute(this.uvOffsets, 2))
  }

  // Partikelwolke beim Blockabbau
  burst(atlas: TextureAtlas, blockId: number, bx: number, by: number, bz: number, count = 16): void {
    const def = getBlock(blockId)
    if (!def) return
    const idx = atlas.indexOf(def.tex.side)
    const tx = (idx % atlas.tilesX) * TILE
    const ty = Math.floor(idx / atlas.tilesX) * TILE
    const atlasW = atlas.tilesX * TILE
    const atlasH = atlas.tilesY * TILE

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift()
      // zufälliger 2x2-Pixel-Ausschnitt aus dem Tile
      const px = tx + Math.random() * (TILE - 2)
      const py = ty + Math.random() * (TILE - 2)
      this.particles.push({
        x: bx + 0.2 + Math.random() * 0.6,
        y: by + 0.2 + Math.random() * 0.6,
        z: bz + 0.2 + Math.random() * 0.6,
        vx: (Math.random() - 0.5) * 4,
        vy: Math.random() * 5 + 1,
        vz: (Math.random() - 0.5) * 4,
        life: 0,
        maxLife: 0.5 + Math.random() * 0.5,
        size: 0.08 + Math.random() * 0.08,
        u: px / atlasW,
        v: py / atlasH, // Atlas-Textur nutzt flipY=false → Canvas-Koordinaten direkt

      })
    }
  }

  update(dt: number, world: World, camera: THREE.Camera): void {
    const alive: Particle[] = []
    for (const p of this.particles) {
      p.life += dt
      if (p.life >= p.maxLife) continue
      p.vy -= 16 * dt
      const nx = p.x + p.vx * dt
      const ny = p.y + p.vy * dt
      const nz = p.z + p.vz * dt
      // simple Kollision: an Blöcken stoppen
      if (world.getBlockAt(Math.floor(nx), Math.floor(ny), Math.floor(nz)) === 0) {
        p.x = nx
        p.y = ny
        p.z = nz
      } else {
        p.vx *= 0.4
        p.vz *= 0.4
        if (world.getBlockAt(Math.floor(p.x), Math.floor(ny), Math.floor(p.z)) !== 0) p.vy = 0
        else p.y = ny
      }
      alive.push(p)
    }
    this.particles = alive

    this.mesh.count = alive.length
    for (let i = 0; i < alive.length; i++) {
      const p = alive[i]
      this.dummy.position.set(p.x, p.y, p.z)
      this.dummy.quaternion.copy((camera as THREE.PerspectiveCamera).quaternion)
      this.dummy.scale.setScalar(p.size * (1 - (p.life / p.maxLife) * 0.5))
      this.dummy.updateMatrix()
      this.mesh.setMatrixAt(i, this.dummy.matrix)
      this.uvOffsets[i * 2] = p.u
      this.uvOffsets[i * 2 + 1] = p.v
    }
    this.mesh.instanceMatrix.needsUpdate = true
    const attr = (this.mesh.geometry.getAttribute('uvOffset') as THREE.InstancedBufferAttribute)
    attr.needsUpdate = true
  }
}
