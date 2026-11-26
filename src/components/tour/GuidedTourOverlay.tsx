import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, ArrowRight, Compass, Flame, Play, Sparkles, X } from 'lucide-react'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { runPlaygroundCompletion } from '@/services/playgroundRunner'
import { playChimeSuccess, playGlassTap } from '@/services/soundEngine'

interface TourStep {
  title: string
  subtitle: string
  body: string
  workspace: 'studio' | 'lab' | 'playground' | 'builder'
}

const TOUR_STEPS: TourStep[] = [
  {
    title: 'Welcome to Groq Studio 3D',
    subtitle: 'Step 1 of 5 · Spatial Hub',
    body: 'Explore deterministic LPU inference in a calm, distraction-free Apple Vision Pro spatial room. Switch workspaces anytime from the bottom dock.',
    workspace: 'studio',
  },
  {
    title: 'Master Concepts in 3D Lab',
    subtitle: 'Step 2 of 5 · Interactive 3D Lab',
    body: 'Each concept gets its own focused 3D stage and contextual bottom ornament. Try spiking Temperature to 1.85 to watch the probability pillars flatten.',
    workspace: 'lab',
  },
  {
    title: 'Test Live Speed in Playground',
    subtitle: 'Step 3 of 5 · Groq Playground',
    body: 'Stream tokens at LPU speed with live TTFT and tok/s telemetry. Open Tune anytime for Temperature, Top-P, Stop Sequences, and Prefill.',
    workspace: 'playground',
  },
  {
    title: 'Build & Export Code',
    subtitle: 'Step 4 of 5 · Builder Studio',
    body: 'Architect strict JSON Schemas, toggle server-side Browser Search & Code Sandbox, and copy production-ready Python, TypeScript, or cURL code.',
    workspace: 'builder',
  },
  {
    title: 'Summon J.A.R.V.I.S. Anytime',
    subtitle: 'Step 5 of 5 · Spatial AI Co-Pilot',
    body: 'Press Cmd/Ctrl + J or click Ask J.A.R.V.I.S. in the top bar for two-way voice, live stage explanations, and Hands-On Action Mode with Undo.',
    workspace: 'studio',
  },
]

export function GuidedTourOverlay() {
  const isTourActive = usePlaygroundStore((s) => s.isTourActive)
  const tourStepIndex = usePlaygroundStore((s) => s.tourStepIndex)
  const nextTourStep = usePlaygroundStore((s) => s.nextTourStep)
  const prevTourStep = usePlaygroundStore((s) => s.prevTourStep)
  const completeTour = usePlaygroundStore((s) => s.completeTour)

  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)
  const setActiveConcept = usePlaygroundStore((s) => s.setActiveConcept)
  const setTemperature = usePlaygroundStore((s) => s.setTemperature)
  const setJarvisOpen = usePlaygroundStore((s) => s.setJarvisOpen)

  const step = TOUR_STEPS[tourStepIndex] ?? TOUR_STEPS[0]

  useEffect(() => {
    if (!isTourActive) return
    setActiveWorkspace(step.workspace)
    if (tourStepIndex === 1) {
      setActiveConcept('temperature')
    }
  }, [isTourActive, tourStepIndex, step.workspace, setActiveWorkspace, setActiveConcept])

  if (!isTourActive) return null

  const handleFinish = () => {
    playChimeSuccess()
    setTemperature(0.7)
    setJarvisOpen(false)
    setActiveWorkspace('studio')
    completeTour()
  }

  return (
    <AnimatePresence>
      <motion.div
        key="v2-guided-tour"
        initial={{ opacity: 0, y: 16, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.97 }}
        transition={{ type: 'spring', stiffness: 320, damping: 28 }}
        className="pointer-events-auto fixed bottom-24 left-1/2 z-50 w-[calc(100vw-2rem)] max-w-md -translate-x-1/2 rounded-[24px] border border-[var(--glass-border)] bg-[var(--studio-bg)]/95 p-5 shadow-[0_24px_60px_-14px_rgba(0,0,0,0.55)] backdrop-blur-2xl"
      >
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <Compass className="h-4 w-4 text-[var(--accent-cyan)]" />
            <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--accent-cyan)]">
              {step.subtitle}
            </span>
          </div>
          <button
            type="button"
            onClick={handleFinish}
            aria-label="Skip tour"
            className="rounded-full p-1 text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <h3 className="mt-2 text-[16px] font-semibold text-[var(--text-primary)]">
          {step.title}
        </h3>
        <p className="mt-1.5 text-[13px] leading-relaxed text-[var(--text-secondary)]">
          {step.body}
        </p>

        {/* Interactive Step Actions */}
        {tourStepIndex === 1 && (
          <button
            type="button"
            onClick={() => {
              playGlassTap()
              setTemperature(1.85)
            }}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-[var(--accent-amber)]/50 bg-[var(--accent-amber)]/15 px-3.5 py-1.5 text-[12px] font-semibold text-[var(--accent-amber)] transition-transform hover:scale-[1.02]"
          >
            <Flame className="h-3.5 w-3.5" />
            <span>Spike Temp to 1.85</span>
          </button>
        )}

        {tourStepIndex === 2 && (
          <button
            type="button"
            onClick={() => {
              playGlassTap()
              void runPlaygroundCompletion()
            }}
            className="mt-3 flex items-center gap-1.5 rounded-full border border-[var(--accent-cyan)]/50 bg-[var(--accent-cyan)]/15 px-3.5 py-1.5 text-[12px] font-semibold text-[var(--accent-cyan)] transition-transform hover:scale-[1.02]"
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            <span>Run LPU Speed Demo</span>
          </button>
        )}

        {/* Footer Navigation */}
        <div className="mt-4 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
          <button
            type="button"
            onClick={() => {
              playGlassTap()
              prevTourStep()
            }}
            disabled={tourStepIndex === 0}
            className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)] disabled:opacity-35"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back</span>
          </button>

          {tourStepIndex < TOUR_STEPS.length - 1 ? (
            <button
              type="button"
              onClick={() => {
                playGlassTap()
                nextTourStep()
              }}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[12.5px] font-semibold text-slate-950"
            >
              <span>Next</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handleFinish}
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[12.5px] font-semibold text-slate-950"
            >
              <Sparkles className="h-3.5 w-3.5" />
              <span>Enter Studio</span>
            </button>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  )
}
