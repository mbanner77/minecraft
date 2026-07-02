'use client'

import dynamic from 'next/dynamic'

// Das Spiel nutzt WebGL, Pointer-Lock und localStorage → nur im Client rendern
const MinecraftGame = dynamic(() => import('@/components/minecraft/game'), {
  ssr: false,
  loading: () => (
    <div className="fixed inset-0 flex items-center justify-center bg-black text-white font-mono">
      Lade Minicraft…
    </div>
  ),
})

export default function Page() {
  return <MinecraftGame />
}
