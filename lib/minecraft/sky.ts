// Himmel: Farbverlauf nach Tageszeit, Sonne, Mond, Sterne und Wolkenschicht

import * as THREE from 'three'
import { mulberry32 } from './random'

// Tageszeit t in [0,1): 0 = Sonnenaufgang ~6 Uhr, 0.25 = Mittag, 0.5 = Sonnenuntergang, 0.75 = Mitternacht
export function dayFactor(t: number): number {
  // Helligkeit des Sonnenlichts (0..1)
  const angle = t * Math.PI * 2
  const sun = Math.sin(angle) // >0 am Tag
  return THREE.MathUtils.clamp(sun * 4 + 0.5, 0.06, 1)
}

export function skyColors(t: number): { sky: THREE.Color; fog: THREE.Color; sunset: number } {
  const day = new THREE.Color(0x87ceeb)
  const night = new THREE.Color(0x0b0e1d)
  const sunset = new THREE.Color(0xf88c4a)

  const angle = t * Math.PI * 2
  const sun = Math.sin(angle)
  const f = THREE.MathUtils.clamp((sun + 0.12) * 3, 0, 1)
  const sky = night.clone().lerp(day, f)

  // Orangefärbung um Auf-/Untergang
  const sunsetAmount = THREE.MathUtils.clamp(1 - Math.abs(sun) * 5, 0, 1) * 0.7
  sky.lerp(sunset, sunsetAmount * 0.5)

  const fog = sky.clone().lerp(new THREE.Color(0xffffff), 0.15 * f)
  return { sky, fog, sunset: sunsetAmount }
}

export class Sky {
  group = new THREE.Group()
  private sun: THREE.Mesh
  private moon: THREE.Mesh
  private stars: THREE.Points
  private clouds: THREE.Mesh
  private starsMat: THREE.PointsMaterial
  private cloudsMat: THREE.MeshBasicMaterial

  constructor() {
    // Sonne: leuchtendes gelbes Quadrat
    const sunCanvas = document.createElement('canvas')
    sunCanvas.width = sunCanvas.height = 32
    const sctx = sunCanvas.getContext('2d')!
    sctx.fillStyle = '#fdf4b8'
    sctx.fillRect(4, 4, 24, 24)
    sctx.fillStyle = '#ffec6e'
    sctx.fillRect(7, 7, 18, 18)
    const sunTex = new THREE.CanvasTexture(sunCanvas)
    sunTex.magFilter = THREE.NearestFilter
    this.sun = new THREE.Mesh(
      new THREE.PlaneGeometry(60, 60),
      new THREE.MeshBasicMaterial({ map: sunTex, transparent: true, fog: false, depthWrite: false }),
    )

    // Mond: grauer Pixel-Mond
    const moonCanvas = document.createElement('canvas')
    moonCanvas.width = moonCanvas.height = 32
    const mctx = moonCanvas.getContext('2d')!
    mctx.fillStyle = '#dddfe8'
    mctx.fillRect(6, 6, 20, 20)
    mctx.fillStyle = '#b8bcd0'
    mctx.fillRect(10, 8, 6, 6)
    mctx.fillRect(18, 16, 5, 5)
    const moonTex = new THREE.CanvasTexture(moonCanvas)
    moonTex.magFilter = THREE.NearestFilter
    this.moon = new THREE.Mesh(
      new THREE.PlaneGeometry(40, 40),
      new THREE.MeshBasicMaterial({ map: moonTex, transparent: true, fog: false, depthWrite: false }),
    )

    // Sterne
    const rand = mulberry32(1337)
    const starPositions = new Float32Array(600 * 3)
    for (let i = 0; i < 600; i++) {
      // gleichmäßig auf Kugel
      const theta = rand() * Math.PI * 2
      const phi = Math.acos(2 * rand() - 1)
      const r = 480
      starPositions[i * 3] = r * Math.sin(phi) * Math.cos(theta)
      starPositions[i * 3 + 1] = r * Math.cos(phi)
      starPositions[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)
    }
    const starGeo = new THREE.BufferGeometry()
    starGeo.setAttribute('position', new THREE.BufferAttribute(starPositions, 3))
    this.starsMat = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, fog: false, depthWrite: false })
    this.stars = new THREE.Points(starGeo, this.starsMat)

    // Wolken: großes Canvas-Muster als halbtransparente Ebene
    const cloudCanvas = document.createElement('canvas')
    cloudCanvas.width = cloudCanvas.height = 256
    const cctx = cloudCanvas.getContext('2d')!
    const crand = mulberry32(4242)
    cctx.clearRect(0, 0, 256, 256)
    cctx.fillStyle = 'rgba(255,255,255,0.92)'
    for (let i = 0; i < 60; i++) {
      const x = (crand() * 256) | 0
      const y = (crand() * 256) | 0
      const w = 12 + ((crand() * 30) | 0)
      const h = 6 + ((crand() * 12) | 0)
      cctx.fillRect(x, y, w, h)
      cctx.fillRect(x + 4, y - 4, w - 8, h)
    }
    const cloudTex = new THREE.CanvasTexture(cloudCanvas)
    cloudTex.wrapS = cloudTex.wrapT = THREE.RepeatWrapping
    cloudTex.repeat.set(4, 4)
    cloudTex.magFilter = THREE.NearestFilter
    this.cloudsMat = new THREE.MeshBasicMaterial({
      map: cloudTex,
      transparent: true,
      opacity: 0.75,
      fog: false,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.clouds = new THREE.Mesh(new THREE.PlaneGeometry(2000, 2000), this.cloudsMat)
    this.clouds.rotation.x = -Math.PI / 2

    this.group.add(this.sun, this.moon, this.stars, this.clouds)
  }

  // t = Tageszeit [0,1), Position folgt der Kamera (Himmel "unendlich weit weg")
  update(t: number, camX: number, camY: number, camZ: number): void {
    const angle = t * Math.PI * 2
    const r = 450

    this.sun.position.set(camX + Math.cos(angle) * r, camY + Math.sin(angle) * r, camZ)
    this.sun.lookAt(camX, camY, camZ)
    this.moon.position.set(camX - Math.cos(angle) * r, camY - Math.sin(angle) * r, camZ)
    this.moon.lookAt(camX, camY, camZ)

    const sunHeight = Math.sin(angle)
    this.starsMat.opacity = THREE.MathUtils.clamp(-sunHeight * 3, 0, 1)
    this.stars.position.set(camX, camY, camZ)
    this.stars.rotation.z = t * Math.PI * 2 * 0.5

    this.clouds.position.set(camX, 160, camZ)
    const map = this.cloudsMat.map as THREE.Texture
    map.offset.x = (Date.now() * 0.0000015) % 1
    // Wolken nachts abdunkeln
    const b = THREE.MathUtils.clamp(sunHeight * 2 + 0.3, 0.15, 1)
    this.cloudsMat.color.setRGB(b, b, b)
  }
}
