// Prozedurale Sounds über WebAudio — kurze synthetische Klänge im Stil des Originals

export type SoundName =
  | 'dig'
  | 'place'
  | 'step'
  | 'hurt'
  | 'eat'
  | 'pop'
  | 'splash'
  | 'explosion'
  | 'click'
  | 'levelup'

export class SoundEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  volume = 0.5

  private ensure(): AudioContext | null {
    if (typeof window === 'undefined') return null
    if (!this.ctx) {
      try {
        this.ctx = new AudioContext()
        this.master = this.ctx.createGain()
        this.master.gain.value = this.volume
        this.master.connect(this.ctx.destination)
      } catch {
        return null
      }
    }
    if (this.ctx.state === 'suspended') void this.ctx.resume()
    return this.ctx
  }

  setVolume(v: number): void {
    this.volume = v
    if (this.master) this.master.gain.value = v
  }

  private noiseBuffer(ctx: AudioContext, seconds: number): AudioBuffer {
    const buf = ctx.createBuffer(1, Math.max(1, (ctx.sampleRate * seconds) | 0), ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1
    return buf
  }

  play(name: SoundName, pitch = 1): void {
    const ctx = this.ensure()
    if (!ctx || !this.master) return
    const t = ctx.currentTime

    const noise = (dur: number, freq: number, gain: number, type: BiquadFilterType = 'lowpass') => {
      const src = ctx.createBufferSource()
      src.buffer = this.noiseBuffer(ctx, dur)
      const filter = ctx.createBiquadFilter()
      filter.type = type
      filter.frequency.value = freq * pitch
      const g = ctx.createGain()
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      src.connect(filter).connect(g).connect(this.master!)
      src.start(t)
      src.stop(t + dur)
    }

    const tone = (dur: number, f0: number, f1: number, gain: number, type: OscillatorType = 'square') => {
      const osc = ctx.createOscillator()
      osc.type = type
      osc.frequency.setValueAtTime(f0 * pitch, t)
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, f1 * pitch), t + dur)
      const g = ctx.createGain()
      g.gain.setValueAtTime(gain, t)
      g.gain.exponentialRampToValueAtTime(0.001, t + dur)
      osc.connect(g).connect(this.master!)
      osc.start(t)
      osc.stop(t + dur)
    }

    switch (name) {
      case 'dig':
        noise(0.12, 900, 0.5)
        break
      case 'place':
        noise(0.09, 1400, 0.4)
        tone(0.06, 220, 160, 0.15, 'triangle')
        break
      case 'step':
        noise(0.07, 700, 0.18)
        break
      case 'hurt':
        tone(0.18, 320, 120, 0.35, 'sawtooth')
        break
      case 'eat':
        noise(0.1, 1800, 0.25, 'bandpass')
        tone(0.08, 500, 300, 0.1, 'triangle')
        break
      case 'pop':
        tone(0.07, 500, 900, 0.25, 'sine')
        break
      case 'splash':
        noise(0.35, 1200, 0.35)
        break
      case 'explosion':
        noise(0.9, 300, 0.9)
        tone(0.5, 120, 30, 0.5, 'sine')
        break
      case 'click':
        tone(0.04, 800, 600, 0.2, 'square')
        break
      case 'levelup':
        tone(0.1, 520, 520, 0.2, 'sine')
        setTimeout(() => tone(0.15, 780, 780, 0.2, 'sine'), 90)
        break
    }
  }
}

export const sounds = new SoundEngine()
