import { motion } from 'framer-motion'
import { Code2, Compass, Settings } from 'lucide-react'
import { CONCEPT_LENSES } from '@/data/concepts'
import { selectAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'
import { JarvisLauncherButton } from '@/components/jarvis/JarvisLauncherButton'
import { ModeToggle } from '@/components/layout/ModeToggle'

export function TopNav() {
  const mode = usePlaygroundStore(selectAppMode)
  const activeConcept = usePlaygroundStore((state) => state.activeConcept)
  const setActiveConcept = usePlaygroundStore((state) => state.setActiveConcept)
  const setSettingsOpen = usePlaygroundStore((state) => state.setSettingsOpen)
  const setCodeModalOpen = usePlaygroundStore((state) => state.setCodeModalOpen)
  const startTour = usePlaygroundStore((state) => state.startTour)
  const highlightedControl = usePlaygroundStore((state) => state.highlightedControl)
  const isLive = mode === 'live'

  return (
    <header className="pointer-events-none fixed inset-x-0 top-3.5 z-30 select-none px-4">
      <div className="mx-auto flex max-w-[1640px] flex-wrap items-center justify-between gap-2 lg:flex-nowrap lg:gap-2 xl:gap-3">
        {/* Left: Brand Mark + Mode Status Pill */}
        <div className="pointer-events-auto order-1 flex shrink-0 items-center gap-2">
          <div className="spatial-pill flex h-10 items-center gap-2 rounded-full pl-2 pr-3 xl:gap-2.5 xl:pl-2.5 xl:pr-3.5">
            {/* Faceted LPU Brand Emblem */}
            <span
              className="flex h-6 w-6 items-center justify-center rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)]"
              aria-hidden="true"
            >
              <svg viewBox="0 0 24 24" className="h-3.5 w-3.5" fill="none">
                <polygon
                  points="12,2 21,12 12,22 3,12"
                  stroke="var(--accent-cyan)"
                  strokeWidth="2"
                  fill="rgba(34,211,238,0.18)"
                />
                <circle cx="12" cy="12" r="2.6" fill="var(--accent-amber)" />
              </svg>
            </span>

            <span className="text-[13.5px] font-semibold tracking-[-0.02em] text-[var(--text-primary)] whitespace-nowrap">
              Groq Studio 3D
            </span>

            <span className="h-3.5 w-px bg-[var(--glass-border)]" aria-hidden="true" />

            <motion.button
              type="button"
              onClick={() => setSettingsOpen(true)}
              whileTap={{ scale: 0.96 }}
              data-testid="mode-status-pill"
              title="Configure Groq API key or Demo Mode"
              className={[
                'flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11.5px] font-medium transition-colors hover:bg-[var(--glass-bg-pill-hover)]',
                highlightedControl === 'modeStatusPill'
                  ? 'ring-2 ring-[var(--accent-cyan)]'
                  : '',
              ].join(' ')}
            >
              <span
                className={[
                  'h-2 w-2 rounded-full',
                  isLive
                    ? 'bg-[var(--accent-emerald)] shadow-[0_0_8px_var(--accent-emerald)]'
                    : 'bg-[var(--accent-amber)] shadow-[0_0_8px_var(--accent-amber)]',
                ].join(' ')}
                aria-hidden="true"
              />
              <span className="text-[var(--text-secondary)] whitespace-nowrap">
                {isLive ? 'Live Groq API' : 'Demo Mode'}
              </span>
            </motion.button>
          </div>
        </div>

        {/* Center: 7 Concept Lenses Segmented Pill */}
        <nav
          aria-label="Groq Playground 3D concepts"
          className="pointer-events-auto spatial-pill no-scrollbar order-3 flex w-full min-w-0 items-center justify-start gap-0.5 overflow-x-auto rounded-full p-1 sm:justify-center lg:order-2 lg:w-auto lg:max-w-full"
        >
          {CONCEPT_LENSES.map((concept) => {
            const isActive = activeConcept === concept.id
            return (
              <button
                key={concept.id}
                type="button"
                onClick={() => setActiveConcept(concept.id)}
                aria-current={isActive ? 'page' : undefined}
                data-testid={`concept-tab-${concept.id}`}
                className={[
                  'relative shrink-0 rounded-full px-2.5 py-1.5 text-[11.5px] font-medium tracking-[-0.005em] transition-colors whitespace-nowrap xl:px-3 xl:text-[12px]',
                  isActive
                    ? 'text-[var(--text-primary)]'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                ].join(' ')}
              >
                {isActive && (
                  <motion.span
                    layoutId="active-concept-pill"
                    transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
                    className="absolute inset-0 rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill-active)] shadow-sm"
                    aria-hidden="true"
                  />
                )}
                <span className="relative z-10">{concept.shortLabel}</span>
              </button>
            )
          })}
        </nav>

        {/* Right: Tour, View Code, Theme Toggle, Settings, J.A.R.V.I.S. Launcher */}
        <div className="pointer-events-auto order-2 flex shrink-0 items-center gap-1.5 lg:order-3 xl:gap-2">
          <motion.button
            type="button"
            onClick={startTour}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            aria-label="Replay 3D Welcome Tour"
            title="3D Welcome Tour"
            data-testid="topnav-tour-button"
            className="spatial-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-[var(--text-primary)]"
          >
            <Compass className="h-4 w-4" aria-hidden="true" />
          </motion.button>

          <motion.button
            type="button"
            onClick={() => setCodeModalOpen(true)}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            aria-label="View SDK Code"
            title="View Code (⌘/Ctrl + E)"
            data-testid="topnav-view-code"
            className={[
              'spatial-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--accent-cyan)] transition-colors hover:border-[var(--glass-border-strong)]',
              highlightedControl === 'codeExport' ? 'ring-2 ring-[var(--accent-cyan)]' : '',
            ].join(' ')}
          >
            <Code2 className="h-4 w-4" aria-hidden="true" />
          </motion.button>

          <ModeToggle />

          <motion.button
            type="button"
            onClick={() => setSettingsOpen(true)}
            whileTap={{ scale: 0.94 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
            aria-label="Open Playground Settings"
            title="Settings & API Key"
            data-testid="settings-button"
            className="spatial-pill flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-[var(--text-secondary)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-[var(--text-primary)]"
          >
            <Settings className="h-4 w-4" aria-hidden="true" />
          </motion.button>

          <JarvisLauncherButton />
        </div>
      </div>
    </header>
  )
}
