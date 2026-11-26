import { useState } from 'react'
import { motion } from 'framer-motion'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'

function detectShortcutLabel(): string {
  if (typeof navigator === 'undefined') return '⌘J'
  const isApple = /Mac|iPhone|iPad|iPod/i.test(navigator.platform || navigator.userAgent)
  return isApple ? '⌘J' : 'Ctrl+J'
}

export function JarvisLauncherButton() {
  const isJarvisOpen = usePlaygroundStore((state) => state.isJarvisOpen)
  const highlightedControl = usePlaygroundStore((state) => state.highlightedControl)
  const toggleJarvisOpen = usePlaygroundStore((state) => state.toggleJarvisOpen)
  const [shortcutLabel] = useState(detectShortcutLabel)

  return (
    <motion.button
      type="button"
      onClick={toggleJarvisOpen}
      whileTap={{ scale: 0.96 }}
      whileHover={{ scale: 1.015 }}
      transition={{ type: 'spring', bounce: 0, duration: 0.22 }}
      aria-expanded={isJarvisOpen}
      aria-controls="jarvis-drawer"
      data-testid="jarvis-launcher"
      className={[
        'spatial-pill group relative flex h-9 shrink-0 items-center gap-2 rounded-full pl-2.5 pr-3 text-[13px] font-medium transition-[transform,border-color,box-shadow,color]',
        isJarvisOpen || highlightedControl === 'jarvisLauncher'
          ? 'border-[var(--accent-cyan)]/70 text-[var(--text-primary)] ring-2 ring-[var(--accent-cyan)]'
          : 'text-[var(--text-primary)] hover:border-[var(--glass-border-strong)]',
      ].join(' ')}
    >
      {/* Subtle Holographic Orb Indicator */}
      <span className="relative flex h-4 w-4 items-center justify-center" aria-hidden="true">
        <span
          className="absolute inset-0 rounded-full opacity-55 blur-[3px] transition-opacity group-hover:opacity-85"
          style={{
            background:
              'radial-gradient(circle at 35% 35%, var(--accent-cyan), var(--accent-amber))',
          }}
        />
        <span
          className="relative h-2.5 w-2.5 rounded-full border border-white/50 shadow-inner"
          style={{
            background:
              'radial-gradient(circle at 30% 30%, #ffffff 0%, var(--accent-cyan) 55%, var(--accent-sky) 100%)',
          }}
        />
      </span>

      <span className="tracking-[-0.01em] whitespace-nowrap">Ask J.A.R.V.I.S.</span>

      <kbd
        className="font-mono-metric hidden rounded-md border border-[var(--glass-border)] px-1.5 py-0.5 text-[10px] font-medium text-[var(--text-muted)] sm:inline-block"
        aria-hidden="true"
      >
        {shortcutLabel}
      </kbd>
    </motion.button>
  )
}
