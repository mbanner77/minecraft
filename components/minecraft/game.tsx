'use client'

// Haupt-Komponente: verwaltet Menü/Lade/Spiel-Phasen, erstellt die Engine
// und rendert HUD + Screens darüber.

import { useCallback, useEffect, useRef, useState } from 'react'
import './minecraft.css'
import { GameEngine, UIState, DebugInfo } from '@/lib/minecraft/engine'
import { WorldMeta, listWorlds, saveWorldMeta, deleteWorld } from '@/lib/minecraft/save'
import { hashString } from '@/lib/minecraft/random'
import { DEFAULT_RENDER_DISTANCE, GameMode, SAVE_KEY_PREFIX } from '@/lib/minecraft/constants'
import { sounds } from '@/lib/minecraft/sounds'
import { Hud } from './hud'
import { InventoryScreen } from './inventory-screen'
import { DebugOverlay } from './debug-overlay'
import { MainMenu, PauseMenu, DeathScreen, LoadingScreen } from './menus'

type Phase = 'menu' | 'loading' | 'playing'

interface Options {
  renderDistance: number
  volume: number
}

function loadOptions(): Options {
  try {
    const raw = localStorage.getItem(`${SAVE_KEY_PREFIX}:options`)
    if (raw) return { renderDistance: DEFAULT_RENDER_DISTANCE, volume: 0.5, ...JSON.parse(raw) }
  } catch {
    // Standardwerte verwenden
  }
  return { renderDistance: DEFAULT_RENDER_DISTANCE, volume: 0.5 }
}

export default function MinecraftGame() {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const engineRef = useRef<GameEngine | null>(null)
  const [phase, setPhase] = useState<Phase>('menu')
  const [worlds, setWorlds] = useState<WorldMeta[]>([])
  const [uiState, setUIState] = useState<UIState | null>(null)
  const [debug, setDebug] = useState<DebugInfo | null>(null)
  const [progress, setProgress] = useState(0)
  const [options, setOptions] = useState<Options>({ renderDistance: DEFAULT_RENDER_DISTANCE, volume: 0.5 })
  const [pointerLocked, setPointerLocked] = useState(false)

  useEffect(() => {
    setWorlds(listWorlds())
    const opts = loadOptions()
    setOptions(opts)
    sounds.setVolume(opts.volume)
  }, [])

  useEffect(() => {
    const onLockChange = () => setPointerLocked(document.pointerLockElement === canvasRef.current)
    document.addEventListener('pointerlockchange', onLockChange)
    return () => document.removeEventListener('pointerlockchange', onLockChange)
  }, [])

  const persistOptions = useCallback((opts: Options) => {
    setOptions(opts)
    try {
      localStorage.setItem(`${SAVE_KEY_PREFIX}:options`, JSON.stringify(opts))
    } catch {
      // ignorieren
    }
  }, [])

  const setRenderDistance = useCallback(
    (n: number) => {
      persistOptions({ ...options, renderDistance: n })
      if (engineRef.current) engineRef.current.renderDistance = n
    },
    [options, persistOptions],
  )

  const setVolume = useCallback(
    (v: number) => {
      persistOptions({ ...options, volume: v })
      sounds.setVolume(v)
    },
    [options, persistOptions],
  )

  const startWorld = useCallback(
    async (meta: WorldMeta) => {
      const canvas = canvasRef.current
      if (!canvas || engineRef.current) return
      setPhase('loading')
      setProgress(0)

      // dem Browser einen Frame Zeit geben, den Ladebildschirm zu zeigen
      await new Promise((res) => requestAnimationFrame(res))

      const engine = new GameEngine(canvas, meta, loadOptions().renderDistance, {
        onUIState: setUIState,
        onDebug: setDebug,
        onLoadProgress: (done, total) => setProgress(done / total),
      })
      engineRef.current = engine
      await engine.start()
      setPhase('playing')
      canvas.requestPointerLock()
    },
    [],
  )

  const quitToMenu = useCallback(() => {
    engineRef.current?.dispose()
    engineRef.current = null
    setUIState(null)
    setDebug(null)
    setWorlds(listWorlds())
    setPhase('menu')
    if (document.pointerLockElement) document.exitPointerLock()
  }, [])

  const createWorld = useCallback(
    (name: string, seedInput: string, mode: GameMode) => {
      let seed: number
      if (seedInput === '') seed = (Math.random() * 0xffffffff) >>> 0
      else if (/^-?\d+$/.test(seedInput)) seed = Math.abs(parseInt(seedInput, 10)) >>> 0
      else seed = hashString(seedInput)

      const meta: WorldMeta = {
        id: `w${Date.now().toString(36)}${Math.floor(Math.random() * 1e6).toString(36)}`,
        name,
        seed,
        mode,
        createdAt: Date.now(),
        lastPlayed: Date.now(),
        timeOfDay: 0.05,
      }
      saveWorldMeta(meta)
      void startWorld(meta)
    },
    [startWorld],
  )

  const removeWorld = useCallback((w: WorldMeta) => {
    deleteWorld(w.id)
    setWorlds(listWorlds())
  }, [])

  // Engine beim Verlassen der Seite aufräumen
  useEffect(() => {
    return () => {
      engineRef.current?.dispose()
      engineRef.current = null
    }
  }, [])

  const engine = engineRef.current
  const screen = uiState?.screen ?? null
  const showClickHint = phase === 'playing' && !screen && !pointerLocked

  return (
    <div className="fixed inset-0 bg-black overflow-hidden">
      <canvas ref={canvasRef} className="w-full h-full block" style={{ cursor: phase === 'playing' && !screen ? 'none' : 'default' }} />

      {phase === 'menu' && (
        <MainMenu
          worlds={worlds}
          onPlay={(w) => void startWorld(w)}
          onCreate={createWorld}
          onDelete={removeWorld}
          renderDistance={options.renderDistance}
          setRenderDistance={setRenderDistance}
        />
      )}

      {phase === 'loading' && <LoadingScreen progress={progress} />}

      {phase === 'playing' && uiState && engine && (
        <>
          <Hud state={uiState} iconFor={(id) => engine.iconFor(id)} />

          {debug && <DebugOverlay info={debug} />}

          {showClickHint && (
            <div
              className="absolute inset-0 mc-root flex items-center justify-center"
              style={{ background: 'rgba(0,0,0,0.4)' }}
              onClick={() => canvasRef.current?.requestPointerLock()}
            >
              <div className="text-white text-xl font-bold" style={{ textShadow: '2px 2px 0 #3f3f3f' }}>
                Klicken zum Spielen
              </div>
            </div>
          )}

          {(screen === 'inventory' || screen === 'crafting' || screen === 'furnace') && (
            <InventoryScreen engine={engine} state={uiState} />
          )}

          {screen === 'pause' && (
            <PauseMenu
              onResume={() => engine.closeScreen()}
              onQuit={quitToMenu}
              renderDistance={options.renderDistance}
              setRenderDistance={setRenderDistance}
              volume={options.volume}
              setVolume={setVolume}
            />
          )}

          {screen === 'death' && <DeathScreen onRespawn={() => engine.respawn()} onQuit={quitToMenu} />}
        </>
      )}
    </div>
  )
}
