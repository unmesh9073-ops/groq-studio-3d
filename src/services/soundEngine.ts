import { usePlaygroundStore } from '@/store/usePlaygroundStore'

let audioCtx: AudioContext | null = null

function getAudioContext(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (!usePlaygroundStore.getState().soundEnabled) return null

  try {
    if (!audioCtx) {
      const Ctx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext?: typeof AudioContext })
          .webkitAudioContext
      if (!Ctx) return null
      audioCtx = new Ctx()
    }
    if (audioCtx.state === 'suspended') {
      void audioCtx.resume().catch(() => {})
    }
    return audioCtx
  } catch {
    return null
  }
}

/**
 * Ultra-subtle soft crystalline tick when switching workspaces or hovering primary 3D cards.
 */
export function playGlassTap(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'sine'
    osc.frequency.setValueAtTime(1180, now)
    osc.frequency.exponentialRampToValueAtTime(640, now + 0.045)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.032, now + 0.004)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.05)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.055)
  } catch {
    // Never throw in headless or restricted audio environments
  }
}

/**
 * Delicate tactile detent sound when dragging controls.
 */
export function playSliderTick(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()

    osc.type = 'triangle'
    osc.frequency.setValueAtTime(920, now)
    osc.frequency.exponentialRampToValueAtTime(420, now + 0.022)

    gain.gain.setValueAtTime(0.0001, now)
    gain.gain.linearRampToValueAtTime(0.018, now + 0.002)
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.025)

    osc.connect(gain)
    gain.connect(ctx.destination)

    osc.start(now)
    osc.stop(now + 0.03)
  } catch {
    // Ignore audio errors cleanly
  }
}

/**
 * Warm minimalist harmonic chord when completing a run or entering a 3D module.
 */
export function playChimeSuccess(): void {
  const ctx = getAudioContext()
  if (!ctx) return

  try {
    const now = ctx.currentTime
    const freqs = [523.25, 659.25, 783.99] // C5, E5, G5

    freqs.forEach((freq, idx) => {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      const start = now + idx * 0.045

      osc.type = 'sine'
      osc.frequency.setValueAtTime(freq, start)

      gain.gain.setValueAtTime(0.0001, start)
      gain.gain.linearRampToValueAtTime(0.022, start + 0.015)
      gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34)

      osc.connect(gain)
      gain.connect(ctx.destination)

      osc.start(start)
      osc.stop(start + 0.36)
    })
  } catch {
    // Ignore audio errors cleanly
  }
}
