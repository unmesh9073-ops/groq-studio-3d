import { Compass, Settings, Sparkles, Volume2, VolumeX, Sun, Moon } from 'lucide-react'
import { motion } from 'framer-motion'
import { selectAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'
import { playGlassTap } from '@/services/soundEngine'

export function SpatialHeader() {
  const theme = usePlaygroundStore((s) => s.theme)
  const toggleTheme = usePlaygroundStore((s) => s.toggleTheme)
  const soundEnabled = usePlaygroundStore((s) => s.soundEnabled)
  const toggleSound = usePlaygroundStore((s) => s.toggleSound)
  const setSettingsOpen = usePlaygroundStore((s) => s.setSettingsOpen)
  const startTour = usePlaygroundStore((s) => s.startTour)
  const toggleJarvisOpen = usePlaygroundStore((s) => s.toggleJarvisOpen)
  const isJarvisOpen = usePlaygroundStore((s) => s.isJarvisOpen)
  const mode = usePlaygroundStore(selectAppMode)

  return (
    <header className="pointer-events-none fixed inset-x-0 top-0 z-40 flex items-center justify-between px-6 py-5 sm:px-10">
      {/* Left: Refined wordmark + minimal Demo/Live status dot pill */}
      <div className="pointer-events-auto flex items-center gap-3">
        <span className="text-[15px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]">
          Groq Studio
        </span>

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            startTour()
          }}
          aria-label="Replay 3D Spatial Tour"
          title="Replay 3D Spatial Tour"
          className="spatial-pill flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Compass className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            setSettingsOpen(true)
          }}
          className="spatial-pill flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-all hover:text-[var(--text-primary)]"
          title="Open API & Studio Settings"
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{
              backgroundColor: mode === 'live' ? '#10B981' : '#22D3EE',
              boxShadow:
                mode === 'live'
                  ? '0 0 8px rgba(16, 185, 129, 0.7)'
                  : '0 0 8px rgba(34, 211, 238, 0.7)',
            }}
          />
          <span>{mode === 'live' ? 'Live' : 'Demo'}</span>
        </button>
      </div>

      {/* Right: Clean icon-only glass pills + compact J.A.R.V.I.S. orb */}
      <div className="pointer-events-auto flex items-center gap-2">
        <button
          type="button"
          onClick={() => {
            toggleSound()
            if (!soundEnabled) {
              setTimeout(() => playGlassTap(), 20)
            }
          }}
          aria-label={soundEnabled ? 'Mute UI sounds' : 'Enable UI sounds'}
          title={soundEnabled ? 'Sound On' : 'Sound Muted'}
          className="spatial-pill flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            toggleTheme()
          }}
          aria-label={theme === 'dark' ? 'Switch to Light Studio' : 'Switch to Dark Obsidian'}
          title={theme === 'dark' ? 'Light Studio' : 'Dark Obsidian'}
          className="spatial-pill flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          {theme === 'dark' ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            startTour()
          }}
          aria-label="Replay 3D Spatial Tour"
          title="Replay 3D Spatial Tour"
          className="spatial-pill flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Compass className="h-4 w-4" />
        </button>

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            setSettingsOpen(true)
          }}
          aria-label="Open Settings"
          title="Settings"
          className="spatial-pill flex h-9 w-9 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
        >
          <Settings className="h-4 w-4" />
        </button>

        <motion.button
          type="button"
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.96 }}
          onClick={() => {
            playGlassTap()
            toggleJarvisOpen()
          }}
          aria-label="Ask J.A.R.V.I.S."
          title="Ask J.A.R.V.I.S."
          className={`spatial-pill flex h-9 items-center gap-2 rounded-full px-3.5 text-[12px] font-medium transition-all ${
            isJarvisOpen
              ? 'border-[var(--accent-cyan)]/60 text-[var(--text-primary)] shadow-[0_0_20px_rgba(34,211,238,0.28)]'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
          }`}
        >
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[var(--accent-cyan)] opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-[var(--accent-cyan)]" />
          </span>
          <Sparkles className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
          <span className="hidden sm:inline">Ask J.A.R.V.I.S.</span>
        </motion.button>
      </div>
    </header>
  )
}
