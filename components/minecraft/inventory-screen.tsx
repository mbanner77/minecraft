'use client'

// Inventar-, Werkbank-, Ofen- und Kreativ-Bildschirme mit klassischer Slot-Interaktion

import { useCallback, useEffect, useState, type MouseEvent as ReactMouseEvent } from 'react'
import type { GameEngine, UIState } from '@/lib/minecraft/engine'
import type { ItemStack } from '@/lib/minecraft/inventory'
import { CREATIVE_ITEMS, displayName, getItemDef } from '@/lib/minecraft/blocks'

type Container = 'inv' | 'craft' | 'craftResult' | 'furnaceIn' | 'furnaceFuel' | 'furnaceOut'

function Slot({
  stack,
  onClick,
  iconFor,
  onHover,
  large,
}: {
  stack: ItemStack | null
  onClick?: (button: 0 | 2, shift: boolean) => void
  iconFor: (id: number) => string
  onHover: (name: string | null) => void
  large?: boolean
}) {
  const def = stack ? getItemDef(stack.id) : undefined
  const maxDur = def?.tool?.durability
  return (
    <div
      className="mc-slot"
      style={large ? { width: 52, height: 52 } : undefined}
      onMouseDown={(e) => {
        e.preventDefault()
        if (onClick && (e.button === 0 || e.button === 2)) onClick(e.button as 0 | 2, e.shiftKey)
      }}
      onContextMenu={(e) => e.preventDefault()}
      onMouseEnter={() => onHover(stack ? displayName(stack.id) : null)}
      onMouseLeave={() => onHover(null)}
    >
      {stack && <img src={iconFor(stack.id)} alt="" draggable={false} />}
      {stack && stack.count > 1 && <span className="mc-count">{stack.count}</span>}
      {stack && stack.durability !== undefined && maxDur && stack.durability < maxDur && (
        <div className="mc-durability">
          <div
            style={{
              width: `${(stack.durability / maxDur) * 100}%`,
              background: stack.durability / maxDur > 0.5 ? '#4cd94c' : stack.durability / maxDur > 0.2 ? '#e8c832' : '#e04c30',
            }}
          />
        </div>
      )}
    </div>
  )
}

function InventoryRows({
  state,
  click,
  iconFor,
  onHover,
}: {
  state: UIState
  click: (c: Container, i: number, b: 0 | 2, s: boolean) => void
  iconFor: (id: number) => string
  onHover: (name: string | null) => void
}) {
  return (
    <div className="flex flex-col gap-2">
      {/* Hauptinventar 9-35 */}
      <div className="grid grid-cols-9 gap-0.5">
        {Array.from({ length: 27 }, (_, i) => (
          <Slot
            key={i + 9}
            stack={state.inventory[i + 9]}
            iconFor={iconFor}
            onHover={onHover}
            onClick={(b, s) => click('inv', i + 9, b, s)}
          />
        ))}
      </div>
      {/* Hotbar 0-8 */}
      <div className="grid grid-cols-9 gap-0.5">
        {Array.from({ length: 9 }, (_, i) => (
          <Slot
            key={i}
            stack={state.inventory[i]}
            iconFor={iconFor}
            onHover={onHover}
            onClick={(b, s) => click('inv', i, b, s)}
          />
        ))}
      </div>
    </div>
  )
}

export function InventoryScreen({ engine, state }: { engine: GameEngine; state: UIState }) {
  const [mouse, setMouse] = useState({ x: 0, y: 0 })
  const [hovered, setHovered] = useState<string | null>(null)
  const [creativeTab, setCreativeTab] = useState(false)

  useEffect(() => {
    const onMove = (e: MouseEvent) => setMouse({ x: e.clientX, y: e.clientY })
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  const click = useCallback(
    (c: Container, i: number, b: 0 | 2, s: boolean) => engine.clickSlot(c, i, b, s),
    [engine],
  )
  const iconFor = useCallback((id: number) => engine.iconFor(id), [engine])

  const creative = state.mode === 'creative'
  const isCrafting = state.screen === 'crafting'
  const isFurnace = state.screen === 'furnace'
  const craftSize = state.craftSize

  const overlayClick = (e: ReactMouseEvent) => {
    // Klick neben das Panel: Cursor-Stack fallenlassen (im Kreativ einfach löschen)
    if (e.target === e.currentTarget && state.cursor) engine.clearCursor()
  }

  return (
    <div
      className="absolute inset-0 mc-root flex items-center justify-center"
      style={{ background: 'rgba(0,0,0,0.55)' }}
      onMouseDown={overlayClick}
    >
      <div className="mc-panel" onContextMenu={(e) => e.preventDefault()}>
        {isFurnace && state.furnace ? (
          <>
            <h2>Ofen</h2>
            <div className="flex items-center gap-4 mb-4 justify-center">
              <div className="flex flex-col items-center gap-1">
                <Slot stack={state.furnace.input} iconFor={iconFor} onHover={setHovered} onClick={(b, s) => click('furnaceIn', 0, b, s)} />
                <div className="mc-flame">
                  <div style={{ height: `${state.furnace.fuelBurn * 100}%` }} />
                </div>
                <Slot stack={state.furnace.fuel} iconFor={iconFor} onHover={setHovered} onClick={(b, s) => click('furnaceFuel', 0, b, s)} />
              </div>
              <div className="mc-progress-arrow">
                <div style={{ width: `${state.furnace.progress * 100}%` }} />
              </div>
              <Slot large stack={state.furnace.output} iconFor={iconFor} onHover={setHovered} onClick={(b, s) => click('furnaceOut', 0, b, s)} />
            </div>
          </>
        ) : creative && !isCrafting ? (
          <>
            <div className="flex gap-2 mb-2">
              <button className="mc-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, opacity: creativeTab ? 0.6 : 1 }} onClick={() => setCreativeTab(false)}>
                Blöcke & Items
              </button>
              <button className="mc-btn" style={{ width: 'auto', padding: '6px 12px', fontSize: 12, opacity: creativeTab ? 1 : 0.6 }} onClick={() => setCreativeTab(true)}>
                Inventar
              </button>
            </div>
            {!creativeTab ? (
              <div
                className="mc-scrollbox grid grid-cols-9 gap-0.5 overflow-y-auto pr-1 mb-3"
                style={{ maxHeight: 44 * 6 + 10, width: 44.5 * 9 + 12 }}
              >
                {CREATIVE_ITEMS.map((id) => (
                  <div
                    key={id}
                    className="mc-slot"
                    onMouseDown={(e) => {
                      e.preventDefault()
                      engine.creativePick(id)
                    }}
                    onMouseEnter={() => setHovered(displayName(id))}
                    onMouseLeave={() => setHovered(null)}
                  >
                    <img src={iconFor(id)} alt="" draggable={false} />
                  </div>
                ))}
              </div>
            ) : null}
          </>
        ) : (
          <>
            <h2>{isCrafting ? 'Werkbank' : 'Inventar'}</h2>
            <div className="flex items-center gap-4 mb-4 justify-center">
              <div
                className="grid gap-0.5"
                style={{ gridTemplateColumns: `repeat(${craftSize}, 44px)` }}
              >
                {Array.from({ length: craftSize * craftSize }, (_, i) => (
                  <Slot
                    key={i}
                    stack={state.craftGrid[i]}
                    iconFor={iconFor}
                    onHover={setHovered}
                    onClick={(b, s) => click('craft', i, b, s)}
                  />
                ))}
              </div>
              <span className="text-2xl font-bold" style={{ color: '#3f3f3f' }}>→</span>
              <Slot large stack={state.craftResult} iconFor={iconFor} onHover={setHovered} onClick={(b, s) => click('craftResult', 0, b, s)} />
            </div>
          </>
        )}

        <InventoryRows state={state} click={click} iconFor={iconFor} onHover={setHovered} />
      </div>

      {/* Cursor-Stack folgt der Maus */}
      {state.cursor && (
        <div className="fixed pointer-events-none z-50" style={{ left: mouse.x - 18, top: mouse.y - 18 }}>
          <img src={iconFor(state.cursor.id)} alt="" width={36} height={36} draggable={false} />
          {state.cursor.count > 1 && (
            <span
              className="absolute text-white font-bold text-sm"
              style={{ right: -2, bottom: -2, textShadow: '2px 2px 0 #3f3f3f' }}
            >
              {state.cursor.count}
            </span>
          )}
        </div>
      )}

      {/* Tooltip */}
      {hovered && !state.cursor && (
        <div className="mc-tooltip" style={{ left: mouse.x + 14, top: mouse.y - 24 }}>
          {hovered}
        </div>
      )}
    </div>
  )
}
