'use client'

// HUD: Fadenkreuz, Herzen, Hunger, Luftblasen, Hotbar, Item-Name-Einblendung

import { useEffect, useRef, useState } from 'react'
import type { UIState } from '@/lib/minecraft/engine'
import { displayName, getItemDef } from '@/lib/minecraft/blocks'

// Pixel-Grafiken als Koordinatenlisten (x,y) auf 8x8-Raster
const HEART_PIXELS = [
  [1, 1], [2, 1], [4, 1], [5, 1],
  [0, 2], [1, 2], [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [0, 3], [1, 3], [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [1, 4], [2, 4], [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5], [4, 5],
  [3, 6],
]

const DRUMSTICK_PIXELS = [
  [3, 1], [4, 1], [5, 1],
  [2, 2], [3, 2], [4, 2], [5, 2], [6, 2],
  [2, 3], [3, 3], [4, 3], [5, 3], [6, 3],
  [3, 4], [4, 4], [5, 4],
  [2, 5], [3, 5],
  [1, 6], [2, 6],
]

const BUBBLE_PIXELS = [
  [2, 1], [3, 1], [4, 1],
  [1, 2], [2, 2], [5, 2],
  [1, 3], [4, 3], [5, 3],
  [1, 4], [2, 4], [5, 4],
  [2, 5], [3, 5], [4, 5],
]

function PixelIcon({ pixels, color, dim, half }: { pixels: number[][]; color: string; dim?: boolean; half?: boolean }) {
  return (
    <svg viewBox="0 0 8 8" className="mc-stat-icon">
      {pixels.map(([x, y], i) => {
        const isHalf = half && x > 3
        return (
          <rect
            key={i}
            x={x}
            y={y}
            width={1}
            height={1}
            fill={dim || isHalf ? 'rgba(40,40,40,0.85)' : color}
          />
        )
      })}
    </svg>
  )
}

export function Hud({
  state,
  iconFor,
}: {
  state: UIState
  iconFor: (id: number) => string
}) {
  const [hurtFlash, setHurtFlash] = useState(0)
  const prevHealth = useRef(state.health)
  const [nameFlash, setNameFlash] = useState<string | null>(null)
  const prevSlot = useRef(state.selectedSlot)
  const nameTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (state.health < prevHealth.current) setHurtFlash((n) => n + 1)
    prevHealth.current = state.health
  }, [state.health])

  useEffect(() => {
    if (state.selectedSlot !== prevSlot.current) {
      prevSlot.current = state.selectedSlot
      const stack = state.inventory[state.selectedSlot]
      if (stack) {
        setNameFlash(displayName(stack.id))
        if (nameTimeout.current) clearTimeout(nameTimeout.current)
        nameTimeout.current = setTimeout(() => setNameFlash(null), 1500)
      } else {
        setNameFlash(null)
      }
    }
  }, [state.selectedSlot, state.inventory])

  const survival = state.mode === 'survival'
  const hearts = Math.ceil(state.health / 2)
  const halfHeart = state.health % 2 === 1
  const drums = Math.ceil(state.hunger / 2)
  const halfDrum = state.hunger % 2 === 1
  const bubbles = Math.ceil((state.air / 300) * 10)

  return (
    <div className="pointer-events-none absolute inset-0 mc-root">
      {/* Fadenkreuz */}
      <svg className="mc-crosshair" width="22" height="22" viewBox="0 0 22 22">
        <rect x="10" y="2" width="2" height="18" fill="#ddd" />
        <rect x="2" y="10" width="18" height="2" fill="#ddd" />
      </svg>

      {hurtFlash > 0 && <div key={hurtFlash} className="mc-hurt" />}
      {state.underwater && <div className="mc-underwater" />}

      {/* Item-Name über der Hotbar */}
      {nameFlash && (
        <div
          className="absolute left-1/2 -translate-x-1/2 text-white text-base font-bold"
          style={{ bottom: 92, textShadow: '2px 2px 0 #3f3f3f' }}
        >
          {nameFlash}
        </div>
      )}

      {/* Statusleisten */}
      {survival && (
        <div className="absolute left-1/2 -translate-x-1/2 flex justify-between" style={{ bottom: 62, width: 442 }}>
          <div className="flex">
            {Array.from({ length: 10 }, (_, i) => (
              <PixelIcon
                key={i}
                pixels={HEART_PIXELS}
                color="#e02f2f"
                dim={i >= hearts}
                half={i === hearts - 1 && halfHeart}
              />
            ))}
          </div>
          <div className="flex flex-col items-end gap-0.5">
            {state.underwater && (
              <div className="flex flex-row-reverse">
                {Array.from({ length: 10 }, (_, i) => (
                  <PixelIcon key={i} pixels={BUBBLE_PIXELS} color="#4f9ff0" dim={i >= bubbles} />
                ))}
              </div>
            )}
            <div className="flex flex-row-reverse">
              {Array.from({ length: 10 }, (_, i) => (
                <PixelIcon
                  key={i}
                  pixels={DRUMSTICK_PIXELS}
                  color="#b56d3c"
                  dim={i >= drums}
                  half={i === drums - 1 && halfDrum}
                />
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Hotbar */}
      <div className="absolute left-1/2 -translate-x-1/2" style={{ bottom: 8 }}>
        <div className="mc-hotbar">
          {Array.from({ length: 9 }, (_, i) => {
            const stack = state.inventory[i]
            const def = stack ? getItemDef(stack.id) : undefined
            const maxDur = def?.tool?.durability
            return (
              <div key={i} className={`mc-hotslot ${i === state.selectedSlot ? 'selected' : ''}`}>
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
          })}
        </div>
      </div>
    </div>
  )
}
