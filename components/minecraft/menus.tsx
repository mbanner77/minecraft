'use client'

// Hauptmenü (Weltliste, Welt erstellen), Pause-Menü, Todesbildschirm, Ladebildschirm

import { useState } from 'react'
import type { WorldMeta } from '@/lib/minecraft/save'
import type { GameMode } from '@/lib/minecraft/constants'
import { MIN_RENDER_DISTANCE, MAX_RENDER_DISTANCE } from '@/lib/minecraft/constants'

// Hintergrund: dunkles "Dirt"-Muster wie im Original-Menü
export function DirtBackground({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="absolute inset-0 mc-root flex items-center justify-center overflow-y-auto"
      style={{
        backgroundColor: '#3a2a1c',
        backgroundImage:
          'radial-gradient(rgba(0,0,0,0.35) 1px, transparent 1px), radial-gradient(rgba(90,64,40,0.5) 1.5px, transparent 1.5px)',
        backgroundSize: '8px 8px, 12px 12px',
        backgroundPosition: '0 0, 4px 4px',
      }}
    >
      {children}
    </div>
  )
}

export function MainMenu({
  worlds,
  onPlay,
  onCreate,
  onDelete,
  renderDistance,
  setRenderDistance,
}: {
  worlds: WorldMeta[]
  onPlay: (w: WorldMeta) => void
  onCreate: (name: string, seed: string, mode: GameMode) => void
  onDelete: (w: WorldMeta) => void
  renderDistance: number
  setRenderDistance: (n: number) => void
}) {
  const [creating, setCreating] = useState(false)
  const [name, setName] = useState('Neue Welt')
  const [seed, setSeed] = useState('')
  const [mode, setMode] = useState<GameMode>('survival')

  return (
    <DirtBackground>
      <div className="flex flex-col items-center gap-6 py-10 px-4 w-full max-w-lg">
        <div className="text-center">
          <div className="mc-title">MINICRAFT</div>
          <div className="mc-subtitle mt-1">Jetzt im Browser!</div>
        </div>

        {!creating ? (
          <div className="w-full flex flex-col gap-2.5">
            {worlds.length > 0 && (
              <div className="mc-panel mb-2" style={{ padding: 10 }}>
                <h2>Deine Welten</h2>
                <div className="flex flex-col gap-1.5 max-h-56 overflow-y-auto mc-scrollbox">
                  {worlds.map((w) => (
                    <div key={w.id} className="flex gap-1.5">
                      <button className="mc-btn flex-1" style={{ padding: '8px 12px' }} onClick={() => onPlay(w)}>
                        {w.name}
                        <span style={{ fontSize: 11, display: 'block', color: '#c8c8c8', fontWeight: 400 }}>
                          {w.mode === 'survival' ? 'Überleben' : 'Kreativ'} · Seed {w.seed}
                        </span>
                      </button>
                      <button
                        className="mc-btn"
                        style={{ width: 'auto', padding: '8px 12px' }}
                        title="Welt löschen"
                        onClick={() => {
                          if (confirm(`Welt „${w.name}" wirklich löschen?`)) onDelete(w)
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <button className="mc-btn" onClick={() => setCreating(true)}>
              Neue Welt erstellen
            </button>

            <div className="mt-2">
              <label className="mc-label">
                Sichtweite: {renderDistance} Chunks
              </label>
              <input
                type="range"
                min={MIN_RENDER_DISTANCE}
                max={MAX_RENDER_DISTANCE}
                value={renderDistance}
                onChange={(e) => setRenderDistance(parseInt(e.target.value, 10))}
                className="w-full"
              />
            </div>

            <div className="mc-panel mt-3" style={{ padding: 10 }}>
              <h2>Steuerung</h2>
              <div style={{ fontSize: 12, lineHeight: 1.6 }}>
                <b>WASD</b> Bewegen · <b>Maus</b> Umsehen · <b>Leertaste</b> Springen<br />
                <b>Linksklick</b> Abbauen/Angreifen · <b>Rechtsklick</b> Platzieren/Benutzen<br />
                <b>E</b> Inventar · <b>Shift</b> Schleichen · <b>Strg/2×W</b> Sprinten · <b>Q</b> Wegwerfen<br />
                <b>Mausrad/1–9</b> Hotbar · <b>F3</b> Debug · <b>Esc</b> Menü<br />
                <b>Kreativ:</b> 2× Leertaste = Fliegen
              </div>
            </div>
          </div>
        ) : (
          <div className="mc-panel w-full" style={{ padding: 16 }}>
            <h2>Neue Welt erstellen</h2>
            <div className="flex flex-col gap-3 mt-2">
              <div>
                <label className="mc-label" style={{ color: '#3f3f3f', textShadow: 'none' }}>Weltname</label>
                <input className="mc-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={32} />
              </div>
              <div>
                <label className="mc-label" style={{ color: '#3f3f3f', textShadow: 'none' }}>Seed (optional)</label>
                <input className="mc-input" value={seed} onChange={(e) => setSeed(e.target.value)} placeholder="Zufällig" />
              </div>
              <div>
                <label className="mc-label" style={{ color: '#3f3f3f', textShadow: 'none' }}>Spielmodus</label>
                <div className="flex gap-2">
                  <button
                    className="mc-btn"
                    style={{ opacity: mode === 'survival' ? 1 : 0.55 }}
                    onClick={() => setMode('survival')}
                  >
                    Überleben
                  </button>
                  <button
                    className="mc-btn"
                    style={{ opacity: mode === 'creative' ? 1 : 0.55 }}
                    onClick={() => setMode('creative')}
                  >
                    Kreativ
                  </button>
                </div>
              </div>
              <div className="flex gap-2 mt-2">
                <button className="mc-btn" onClick={() => onCreate(name.trim() || 'Neue Welt', seed.trim(), mode)}>
                  Welt erstellen
                </button>
                <button className="mc-btn" onClick={() => setCreating(false)}>
                  Abbrechen
                </button>
              </div>
            </div>
          </div>
        )}

        <div style={{ color: '#a8a8a8', fontSize: 11, textShadow: '1px 1px 0 #000' }}>
          Von Grund auf neu gebaut — keine Original-Assets. Welten werden im Browser gespeichert.
        </div>
      </div>
    </DirtBackground>
  )
}

export function PauseMenu({
  onResume,
  onQuit,
  renderDistance,
  setRenderDistance,
  volume,
  setVolume,
}: {
  onResume: () => void
  onQuit: () => void
  renderDistance: number
  setRenderDistance: (n: number) => void
  volume: number
  setVolume: (v: number) => void
}) {
  return (
    <div className="absolute inset-0 mc-root flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className="flex flex-col gap-2.5 w-72">
        <div className="text-center text-white text-xl font-bold mb-2" style={{ textShadow: '2px 2px 0 #3f3f3f' }}>
          Spiel pausiert
        </div>
        <button className="mc-btn" onClick={onResume}>
          Zurück zum Spiel
        </button>
        <div className="mc-panel" style={{ padding: 10 }}>
          <label className="mc-label" style={{ color: '#3f3f3f', textShadow: 'none' }}>
            Sichtweite: {renderDistance} Chunks
          </label>
          <input
            type="range"
            min={MIN_RENDER_DISTANCE}
            max={MAX_RENDER_DISTANCE}
            value={renderDistance}
            onChange={(e) => setRenderDistance(parseInt(e.target.value, 10))}
            className="w-full"
          />
          <label className="mc-label mt-2" style={{ color: '#3f3f3f', textShadow: 'none' }}>
            Lautstärke: {Math.round(volume * 100)}%
          </label>
          <input
            type="range"
            min={0}
            max={100}
            value={volume * 100}
            onChange={(e) => setVolume(parseInt(e.target.value, 10) / 100)}
            className="w-full"
          />
        </div>
        <button className="mc-btn" onClick={onQuit}>
          Speichern & Hauptmenü
        </button>
      </div>
    </div>
  )
}

export function DeathScreen({ onRespawn, onQuit }: { onRespawn: () => void; onQuit: () => void }) {
  return (
    <div className="absolute inset-0 mc-root flex items-center justify-center" style={{ background: 'rgba(120,0,0,0.5)' }}>
      <div className="flex flex-col gap-3 w-80 items-center">
        <div className="text-white font-bold mb-4" style={{ fontSize: 36, textShadow: '3px 3px 0 #3f3f3f' }}>
          Du bist gestorben!
        </div>
        <button className="mc-btn" onClick={onRespawn}>
          Wiederbeleben
        </button>
        <button className="mc-btn" onClick={onQuit}>
          Hauptmenü
        </button>
      </div>
    </div>
  )
}

export function LoadingScreen({ progress }: { progress: number }) {
  return (
    <DirtBackground>
      <div className="flex flex-col items-center gap-4 w-80">
        <div className="text-white text-lg font-bold" style={{ textShadow: '2px 2px 0 #3f3f3f' }}>
          Welt wird generiert…
        </div>
        <div className="w-full h-4 border-2 border-white" style={{ background: '#000' }}>
          <div className="h-full" style={{ width: `${Math.round(progress * 100)}%`, background: '#4cd94c' }} />
        </div>
      </div>
    </DirtBackground>
  )
}
