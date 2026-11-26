import { useCallback, useRef, useState } from 'react'
import {
  motion,
  useMotionTemplate,
  useMotionValue,
  useReducedMotion,
  useSpring,
} from 'framer-motion'
import type { HTMLMotionProps } from 'framer-motion'
import { twMerge } from 'tailwind-merge'

interface SpatialGlassCardProps
  extends Omit<HTMLMotionProps<'div'>, 'onMouseMove' | 'onMouseLeave'> {
  accentHex?: string
  tiltStrength?: number
  interactive?: boolean
  children: React.ReactNode
}

const SPRING_CONFIG = { stiffness: 320, damping: 28, mass: 0.8 }

export function SpatialGlassCard({
  accentHex = '#22D3EE',
  tiltStrength = 7,
  interactive = true,
  className,
  children,
  style,
  ...rest
}: SpatialGlassCardProps) {
  const cardRef = useRef<HTMLDivElement | null>(null)
  const prefersReducedMotion = useReducedMotion()
  const [isHovered, setIsHovered] = useState(false)

  const rawRotateX = useMotionValue(0)
  const rawRotateY = useMotionValue(0)
  const rawSpotX = useMotionValue(50)
  const rawSpotY = useMotionValue(50)

  const rotateX = useSpring(rawRotateX, SPRING_CONFIG)
  const rotateY = useSpring(rawRotateY, SPRING_CONFIG)
  const spotX = useSpring(rawSpotX, { stiffness: 260, damping: 30 })
  const spotY = useSpring(rawSpotY, { stiffness: 260, damping: 30 })

  const spotlightBg = useMotionTemplate`radial-gradient(240px circle at ${spotX}% ${spotY}%, rgba(255, 255, 255, 0.14), transparent 70%)`

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLDivElement>) => {
      if (!interactive || prefersReducedMotion || !cardRef.current) return
      const rect = cardRef.current.getBoundingClientRect()
      if (rect.width === 0 || rect.height === 0) return

      const px = (e.clientX - rect.left) / rect.width
      const py = (e.clientY - rect.top) / rect.height

      rawRotateY.set((px - 0.5) * 2 * tiltStrength)
      rawRotateX.set((0.5 - py) * 2 * tiltStrength)
      rawSpotX.set(px * 100)
      rawSpotY.set(py * 100)
    },
    [interactive, prefersReducedMotion, rawRotateX, rawRotateY, rawSpotX, rawSpotY, tiltStrength]
  )

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false)
    rawRotateX.set(0)
    rawRotateY.set(0)
    rawSpotX.set(50)
    rawSpotY.set(50)
  }, [rawRotateX, rawRotateY, rawSpotX, rawSpotY])

  const handleMouseEnter = useCallback(() => {
    if (interactive) setIsHovered(true)
  }, [interactive])

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      whileHover={
        interactive && !prefersReducedMotion
          ? { y: -4, scale: 1.012 }
          : undefined
      }
      whileTap={
        interactive && !prefersReducedMotion ? { scale: 0.985 } : undefined
      }
      transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      style={{
        transformPerspective: 1000,
        rotateX: prefersReducedMotion ? 0 : rotateX,
        rotateY: prefersReducedMotion ? 0 : rotateY,
        backdropFilter: 'blur(28px) saturate(180%)',
        WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        boxShadow: isHovered
          ? `0 22px 48px -12px rgba(0, 0, 0, 0.42), 0 0 0 1px ${accentHex}44, inset 0 1px 0 0 rgba(255, 255, 255, 0.24)`
          : '0 14px 36px -10px rgba(0, 0, 0, 0.32), 0 0 0 1px rgba(255, 255, 255, 0.12), inset 0 1px 0 0 rgba(255, 255, 255, 0.18)',
        ...style,
      }}
      className={twMerge(
        'relative overflow-hidden rounded-[22px] bg-[var(--glass-surface)] transition-colors duration-200',
        interactive && 'cursor-pointer',
        className
      )}
      {...rest}
    >
      {/* Dynamic cursor-tracked specular sheen */}
      {interactive && !prefersReducedMotion && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-0 transition-opacity duration-300"
          style={{
            background: spotlightBg,
            opacity: isHovered ? 1 : 0,
          }}
        />
      )}

      {/* Subtle top-lit luminous specular edge */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-4 top-0 z-0 h-px opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${accentHex}88, rgba(255,255,255,0.5), ${accentHex}88, transparent)`,
        }}
      />

      <div className="relative z-10">{children}</div>
    </motion.div>
  )
}
