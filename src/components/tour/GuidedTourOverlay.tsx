import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowLeft,
  ArrowRight,
  Flame,
  Play,
  Square,
  Volume2,
  X,
} from 'lucide-react'
import { EXPERIMENT_PRESETS } from '@/data/concepts'
import { JarvisOrb } from '@/components/jarvis/JarvisOrb'
import { speakJarvisText, stopJarvisSpeaking } from '@/services/jarvisVoice'
import { runPlaygroundCompletion } from '@/services/playgroundRunner'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { ConceptId, ControlHighlightKey } from '@/types/playground'

interface TourStepSpec {
  title: string
  body: string
  concept: ConceptId
  expandConsole: boolean
  spotlight: ControlHighlightKey | null
}

const TOUR_STEPS: TourStepSpec[] = [
  {
    title: 'Welcome to Groq Studio 3D',
    body: 'Explore how the Groq Developer Playground works in real time. Drag anywhere to orbit the 3D LPU Deterministic Core or click any numbered hotspot pill to inspect how tokens flow.',
    concept: 'lpu-pipeline',
    expandConsole: false,
    spotlight: null,
  },
  {
    title: 'Send Your First LPU Prompt',
    body: 'Use the Prompt Console below to test prompts in Instant Demo Mode or with your own Groq API key. Click Try It Now to watch sub-200ms TTFT, live tokens/sec, and 3D ring acceleration.',
    concept: 'lpu-pipeline',
    expandConsole: true,
    spotlight: 'promptInput',
  },
  {
    title: 'Bend AI Creativity in 3D',
    body: 'Every Playground dial reshapes the model. Temperature controls randomness—click Spike Temp to 1.85 to watch these 8 probability pillars flatten upward into warm creative amber.',
    concept: 'temperature',
    expandConsole: false,
    spotlight: 'temperature',
  },
  {
    title: 'Summon J.A.R.V.I.S. Anytime',
    body: 'J.A.R.V.I.S. stays quietly out of your way until you click Ask J.A.R.V.I.S. or press Cmd/Ctrl + J. Ask questions by text or voice and let Action Mode demonstrate any parameter live.',
    concept: 'built-in-tools',
    expandConsole: false,
    spotlight: 'jarvisLauncher',
  },
  {
    title: 'Export Real Code & Unlock Live LPU',
    body: 'Every dial, schema, and tool compiles straight into Python, TypeScript, OpenAI-compatible, and cURL code via View Code—and you can paste a free Groq key anytime in Studio Connection.',
    concept: 'lpu-pipeline',
    expandConsole: false,
    spotlight: 'codeExport',
  },
]

export function GuidedTourOverlay() {
  const theme = usePlaygroundStore((state) => state.theme)
  const isTourActive = usePlaygroundStore((state) => state.isTourActive)
  const tourStepIndex = usePlaygroundStore((state) => state.tourStepIndex)
  const jarvisStatus = usePlaygroundStore((state) => state.jarvisStatus)
  const jarvisAudioLevel = usePlaygroundStore((state) => state.jarvisAudioLevel)
  const isConsoleExpanded = usePlaygroundStore((state) => state.isConsoleExpanded)

  const nextTourStep = usePlaygroundStore((state) => state.nextTourStep)
  const prevTourStep = usePlaygroundStore((state) => state.prevTourStep)
  const completeTour = usePlaygroundStore((state) => state.completeTour)
  const applyExperimentPreset = usePlaygroundStore((state) => state.applyExperimentPreset)
  const setTemperature = usePlaygroundStore((state) => state.setTemperature)
  const spotlightControl = usePlaygroundStore((state) => state.spotlightControl)

  const [isReadingStep, setIsReadingStep] = useState(false)
  const step = TOUR_STEPS[tourStepIndex] ?? TOUR_STEPS[0]

  // Synchronize 3D stage, console, and spotlight when step changes
  useEffect(() => {
    if (!isTourActive) return
    const current = TOUR_STEPS[tourStepIndex]
    if (!current) return

    const store = usePlaygroundStore.getState()
    if (store.activeConcept !== current.concept) {
      store.setActiveConcept(current.concept)
    }
    store.setConsoleExpanded(current.expandConsole)
    if (current.spotlight) {
      store.spotlightControl(current.spotlight, 6000)
    } else {
      store.setHighlightedControl(null)
    }
  }, [isTourActive, tourStepIndex])

  // Escape key skips tour cleanly only when no higher-priority modal or drawer is open
  useEffect(() => {
    if (!isTourActive) return
    const onEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        const s = usePlaygroundStore.getState()
        if (s.isSettingsOpen || s.isCodeModalOpen || s.isSchemaModalOpen || s.isJarvisOpen) {
          return
        }
        stopJarvisSpeaking()
        completeTour()
      }
    }
    window.addEventListener('keydown', onEsc)
    return () => window.removeEventListener('keydown', onEsc)
  }, [isTourActive, completeTour])

  const handleSkip = () => {
    stopJarvisSpeaking()
    setIsReadingStep(false)
    completeTour()
  }

  const handleReadAloud = () => {
    if (isReadingStep && jarvisStatus === 'speaking') {
      stopJarvisSpeaking()
      setIsReadingStep(false)
      return
    }
    setIsReadingStep(true)
    void speakJarvisText(`${step.title}. ${step.body}`).finally(() => {
      setIsReadingStep(false)
    })
  }

  const handleTryItNow = () => {
    applyExperimentPreset(EXPERIMENT_PRESETS[0])
    void runPlaygroundCompletion()
  }

  const handleSpikeTemp = () => {
    setTemperature(1.85)
    spotlightControl('temperature', 5000)
  }

  const handleStepNav = (dir: -1 | 1) => {
    stopJarvisSpeaking()
    setIsReadingStep(false)
    if (dir === -1) prevTourStep()
    else nextTourStep()
  }

  return (
    <AnimatePresence>
      {isTourActive && (
        <motion.aside
          role="region"
          aria-label="Interactive 3D Welcome Tour"
          data-testid="guided-tour-card"
          initial={{ opacity: 0, y: 16, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
          className={[
            'spatial-glass-elevated select-none fixed right-4 z-30 w-[calc(100vw-2rem)] max-w-[420px] rounded-[24px] p-4.5',
            isConsoleExpanded ? 'top-[124px]' : 'bottom-16',
          ].join(' ')}
        >
          {/* Header */}
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5">
              <JarvisOrb
                status={isReadingStep ? 'speaking' : 'standby'}
                theme={theme}
                size={32}
                audioLevel={jarvisAudioLevel}
              />
              <div>
                <span
                  data-testid="tour-step-counter"
                  className="font-mono-metric block text-[10.5px] font-semibold text-[var(--accent-cyan)]"
                >
                  Step {tourStepIndex + 1} of {TOUR_STEPS.length}
                </span>
                <h3 className="text-[14px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                  {step.title}
                </h3>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={handleReadAloud}
                data-testid="tour-read-aloud"
                title={isReadingStep ? 'Stop Narration' : 'Read Aloud'}
                aria-label={isReadingStep ? 'Stop reading step aloud' : 'Read step aloud'}
                className="flex h-7 w-7 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--accent-cyan)] transition-colors hover:border-[var(--glass-border-strong)]"
              >
                {isReadingStep ? (
                  <Square className="h-3 w-3 fill-current text-[var(--accent-amber)]" />
                ) : (
                  <Volume2 className="h-3.5 w-3.5" aria-hidden="true" />
                )}
              </button>

              <button
                type="button"
                onClick={handleSkip}
                data-testid="tour-skip"
                className="flex h-7 items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2.5 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                <span>Skip Tour</span>
                <X className="h-3 w-3" aria-hidden="true" />
              </button>
            </div>
          </div>

          {/* Body */}
          <p className="mt-2.5 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
            {step.body}
          </p>

          {/* Interactive Step Actions */}
          {tourStepIndex === 1 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleTryItNow}
                data-testid="tour-try-it-now"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-cyan)]/45 bg-[var(--accent-cyan)]/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--accent-cyan)] transition-colors hover:bg-[var(--accent-cyan)]/25"
              >
                <Play className="h-3 w-3 fill-current" aria-hidden="true" />
                <span>Try It Now</span>
              </button>
            </div>
          )}

          {tourStepIndex === 2 && (
            <div className="mt-3">
              <button
                type="button"
                onClick={handleSpikeTemp}
                data-testid="tour-spike-temp"
                className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-amber)]/45 bg-[var(--accent-amber)]/15 px-3.5 py-1.5 text-[11.5px] font-semibold text-[var(--accent-amber)] transition-colors hover:bg-[var(--accent-amber)]/25"
              >
                <Flame className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Spike Temp to 1.85</span>
              </button>
            </div>
          )}

          {/* Footer Navigation */}
          <div className="mt-3.5 flex items-center justify-between border-t border-[var(--glass-border)] pt-3">
            <div className="flex items-center gap-1">
              {TOUR_STEPS.map((_, idx) => (
                <span
                  key={idx}
                  className={[
                    'h-1.5 rounded-full transition-all',
                    idx === tourStepIndex
                      ? 'w-5 bg-[var(--accent-cyan)]'
                      : 'w-1.5 bg-[var(--glass-border-strong)]',
                  ].join(' ')}
                />
              ))}
            </div>

            <div className="flex items-center gap-1.5">
              {tourStepIndex > 0 && (
                <button
                  type="button"
                  onClick={() => handleStepNav(-1)}
                  data-testid="tour-prev"
                  className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-1.5 text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                >
                  <ArrowLeft className="h-3 w-3" aria-hidden="true" />
                  <span>Back</span>
                </button>
              )}

              {tourStepIndex < TOUR_STEPS.length - 1 ? (
                <button
                  type="button"
                  onClick={() => handleStepNav(1)}
                  data-testid="tour-next"
                  className="flex items-center gap-1 rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[11.5px] font-semibold text-slate-950 hover:opacity-90"
                >
                  <span>Next</span>
                  <ArrowRight className="h-3 w-3" aria-hidden="true" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleSkip}
                  data-testid="tour-enter-studio"
                  className="rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[11.5px] font-semibold text-slate-950 hover:opacity-90"
                >
                  Enter Studio
                </button>
              )}
            </div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  )
}
