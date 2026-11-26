import { useEffect, useRef, useState } from 'react'
import type { JarvisStatus, ThemeMode } from '@/types/playground'

interface JarvisOrbProps {
  status: JarvisStatus
  theme: ThemeMode
  size?: number
  audioLevel?: number
}

export function JarvisOrb({
  status,
  theme,
  size = 44,
  audioLevel = 0,
}: JarvisOrbProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const propsRef = useRef({ status, theme, audioLevel })
  const [reducedMotion, setReducedMotion] = useState(() =>
    typeof window !== 'undefined' && typeof window.matchMedia === 'function'
      ? window.matchMedia('(prefers-reduced-motion: reduce)').matches
      : false
  )

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const onChange = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', onChange)
    return () => mq.removeEventListener('change', onChange)
  }, [])

  useEffect(() => {
    propsRef.current = { status, theme, audioLevel }
  }, [status, theme, audioLevel])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    canvas.width = size * dpr
    canvas.height = size * dpr
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

    let animId = 0
    let phase = 0

    const drawFrame = (curStatus: JarvisStatus, curTheme: ThemeMode, level: number) => {
      const isDark = curTheme === 'dark'
      const cx = size / 2
      const cy = size / 2
      const baseR = size * 0.34

      ctx.clearRect(0, 0, size, size)

      const primaryRgb =
        curStatus === 'acting'
          ? '245, 158, 11'
          : isDark
            ? '34, 211, 238'
            : '2, 132, 199'
      const secondaryRgb =
        curStatus === 'acting'
          ? '34, 211, 238'
          : isDark
            ? '56, 189, 248'
            : '8, 145, 178'

      const haloPulse =
        1 +
        (reducedMotion ? 0 : Math.sin(phase * 2) * (curStatus === 'standby' ? 0.06 : 0.14)) +
        level * 0.25
      const grad = ctx.createRadialGradient(cx, cy, baseR * 0.2, cx, cy, baseR * 1.45 * haloPulse)
      grad.addColorStop(0, `rgba(${primaryRgb}, 0.52)`)
      grad.addColorStop(0.6, `rgba(${secondaryRgb}, 0.18)`)
      grad.addColorStop(1, `rgba(${secondaryRgb}, 0)`)
      ctx.fillStyle = grad
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 1.45 * haloPulse, 0, Math.PI * 2)
      ctx.fill()

      for (let rIdx = 0; rIdx < 3; rIdx++) {
        ctx.save()
        ctx.translate(cx, cy)
        ctx.rotate(phase * (rIdx % 2 === 0 ? 1 : -1.3) + rIdx * 1.05)
        const rx = baseR * (0.95 + rIdx * 0.14)
        const ry = rx * (0.48 + Math.sin(phase + rIdx) * 0.12)
        ctx.strokeStyle = `rgba(${rIdx === 1 && curStatus === 'acting' ? '245, 158, 11' : primaryRgb}, ${0.7 - rIdx * 0.15})`
        ctx.lineWidth = 1.25
        ctx.beginPath()
        ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2)
        ctx.stroke()
        ctx.restore()
      }

      if (curStatus === 'speaking') {
        ctx.strokeStyle = `rgba(${primaryRgb}, 0.65)`
        ctx.lineWidth = 1.2
        ctx.beginPath()
        for (let a = 0; a <= Math.PI * 2 + 0.1; a += 0.2) {
          const wave = Math.sin(a * 6 + phase * 6) * (2 + level * 4)
          const r = baseR * 1.15 + wave
          const x = cx + Math.cos(a) * r
          const y = cy + Math.sin(a) * r
          if (a === 0) ctx.moveTo(x, y)
          else ctx.lineTo(x, y)
        }
        ctx.closePath()
        ctx.stroke()
      }

      const coreGrad = ctx.createRadialGradient(
        cx - baseR * 0.18,
        cy - baseR * 0.18,
        1,
        cx,
        cy,
        baseR * 0.56
      )
      coreGrad.addColorStop(0, '#FFFFFF')
      coreGrad.addColorStop(0.5, `rgba(${primaryRgb}, 0.95)`)
      coreGrad.addColorStop(1, `rgba(${secondaryRgb}, 0.75)`)
      ctx.fillStyle = coreGrad
      ctx.beginPath()
      ctx.arc(cx, cy, baseR * 0.54, 0, Math.PI * 2)
      ctx.fill()
    }

    if (reducedMotion) {
      drawFrame(status, theme, audioLevel)
      return
    }

    const tick = () => {
      const { status: curStatus, theme: curTheme, audioLevel: level } = propsRef.current
      const speed =
        curStatus === 'acting'
          ? 0.07
          : curStatus === 'thinking'
            ? 0.05
            : curStatus === 'speaking'
              ? 0.045
              : 0.02

      phase += speed
      drawFrame(curStatus, curTheme, level)
      animId = window.requestAnimationFrame(tick)
    }

    animId = window.requestAnimationFrame(tick)
    return () => window.cancelAnimationFrame(animId)
  }, [size, reducedMotion, status, theme, audioLevel])

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      aria-hidden="true"
      className="shrink-0"
    />
  )
}
