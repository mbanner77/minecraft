// Inventar: ItemStacks, Hotbar (0-8) + Hauptinventar (9-35), Stack-Operationen

import { maxStackOf, getItemDef } from './blocks'

export interface ItemStack {
  id: number
  count: number
  durability?: number // verbleibende Haltbarkeit bei Werkzeugen
}

export const HOTBAR_SIZE = 9
export const INVENTORY_SIZE = 36

export function makeStack(id: number, count = 1): ItemStack {
  const def = getItemDef(id)
  const stack: ItemStack = { id, count }
  if (def?.tool) stack.durability = def.tool.durability
  return stack
}

export function stacksEqual(a: ItemStack | null, b: ItemStack | null): boolean {
  if (!a || !b) return false
  return a.id === b.id && a.durability === b.durability
}

export class Inventory {
  slots: Array<ItemStack | null>

  constructor(size = INVENTORY_SIZE) {
    this.slots = new Array(size).fill(null)
  }

  // Fügt Items hinzu (erst auffüllen, dann leere Slots — Hotbar zuerst). Rückgabe: Rest
  add(id: number, count: number): number {
    const max = maxStackOf(id)
    // vorhandene Stapel auffüllen (Werkzeuge stapeln nie)
    if (max > 1) {
      for (let i = 0; i < this.slots.length && count > 0; i++) {
        const s = this.slots[i]
        if (s && s.id === id && s.count < max) {
          const take = Math.min(max - s.count, count)
          s.count += take
          count -= take
        }
      }
    }
    // leere Slots
    for (let i = 0; i < this.slots.length && count > 0; i++) {
      if (!this.slots[i]) {
        const take = Math.min(max, count)
        this.slots[i] = makeStack(id, take)
        count -= take
      }
    }
    return count
  }

  // Anzahl eines Items im gesamten Inventar
  countOf(id: number): number {
    let n = 0
    for (const s of this.slots) if (s && s.id === id) n += s.count
    return n
  }

  // Entfernt bis zu count Items, Rückgabe: tatsächlich entfernt
  remove(id: number, count: number): number {
    let removed = 0
    for (let i = 0; i < this.slots.length && removed < count; i++) {
      const s = this.slots[i]
      if (s && s.id === id) {
        const take = Math.min(s.count, count - removed)
        s.count -= take
        removed += take
        if (s.count <= 0) this.slots[i] = null
      }
    }
    return removed
  }

  // Einen Gegenstand aus Slot i verbrauchen
  consumeOne(i: number): void {
    const s = this.slots[i]
    if (!s) return
    s.count--
    if (s.count <= 0) this.slots[i] = null
  }

  serialize(): Array<{ id: number; count: number; durability?: number } | null> {
    return this.slots.map((s) => (s ? { ...s } : null))
  }

  static deserialize(data: Array<{ id: number; count: number; durability?: number } | null>, size = INVENTORY_SIZE): Inventory {
    const inv = new Inventory(size)
    for (let i = 0; i < Math.min(data.length, size); i++) {
      const d = data[i]
      if (d && d.id > 0 && d.count > 0) inv.slots[i] = { id: d.id, count: d.count, durability: d.durability }
    }
    return inv
  }
}
