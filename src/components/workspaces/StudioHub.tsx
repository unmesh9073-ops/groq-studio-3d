import {
  ArrowRight,
  Braces,
  Cpu,
  Flame,
  Gauge,
  Globe,
  Layers,
  MessageSquare,
  Play,
} from 'lucide-react'
import { motion } from 'framer-motion'
import { CONCEPT_LENSES } from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { SpatialGlassCard } from '@/components/spatial/SpatialGlassCard'
import { playChimeSuccess, playGlassTap } from '@/services/soundEngine'
import type { ConceptId } from '@/types/playground'

const CONCEPT_ICONS: Record<ConceptId, React.ComponentType<{ className?: string }>> = {
  'lpu-pipeline': Cpu,
  temperature: Flame,
  'top-p': Layers,
  'tokens-limits': Gauge,
  'prompt-roles': MessageSquare,
  'structured-json': Braces,
  'built-in-tools': Globe,
}

const CONCEPT_PROMISES: Record<ConceptId, string> = {
  'lpu-pipeline': 'Deterministic speed in 3D',
  temperature: 'Bend AI creativity',
  'top-p': 'Shape token probability',
  'tokens-limits': 'Control length & stops',
  'prompt-roles': 'Steer system & prefill',
  'structured-json': 'Enforce strict schemas',
  'built-in-tools': 'Search & execute live',
}

export function StudioHub() {
  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)
  const setActiveConcept = usePlaygroundStore((s) => s.setActiveConcept)

  const handleEnterLab = (conceptId?: ConceptId) => {
    playChimeSuccess()
    if (conceptId) {
      setActiveConcept(conceptId)
    }
    setActiveWorkspace('lab')
  }

  return (
    <section
      aria-label="Groq Studio Home Hub"
      className="pointer-events-none relative z-20 flex h-full w-full flex-col justify-between px-6 pb-24 pt-20 sm:px-10"
    >
      {/* Upper Center: Editorial Typography floating cleanly over the unobstructed 3D LPU Core */}
      <motion.div
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 280, damping: 28 }}
        className="mx-auto mt-2 flex max-w-2xl flex-col items-center text-center sm:mt-4"
      >
        <h1 className="text-[36px] font-semibold leading-[1.08] tracking-[-0.03em] text-[var(--text-primary)] sm:text-[52px]">
          Inference at the speed of thought.
        </h1>
        <p className="mt-3 max-w-lg text-[15px] leading-relaxed text-[var(--text-secondary)] sm:text-[16px]">
          Explore deterministic LPU architecture in spatial 3D, tune parameters live, and ship
          structured outputs.
        </p>

        <div className="pointer-events-auto mt-6 flex flex-wrap items-center justify-center gap-3">
          <button
            type="button"
            onClick={() => handleEnterLab('lpu-pipeline')}
            className="flex items-center gap-2 rounded-full bg-[var(--accent-cyan)] px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.35)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <span>Enter 3D Lab</span>
            <ArrowRight className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => {
              playGlassTap()
              setActiveWorkspace('playground')
            }}
            className="spatial-pill flex items-center gap-2 rounded-full px-5 py-2.5 text-[13px] font-medium text-[var(--text-primary)] transition-transform hover:scale-[1.03] active:scale-[0.98]"
          >
            <Play className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
            <span>Open Playground</span>
          </button>
        </div>
      </motion.div>

      {/* Lower Stage: Spacious 7 Interactive 3D Concept Portal Cards */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 28, delay: 0.08 }}
        className="pointer-events-auto mx-auto w-full max-w-6xl"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:grid-cols-7">
          {CONCEPT_LENSES.map((concept) => {
            const Icon = CONCEPT_ICONS[concept.id]
            return (
              <SpatialGlassCard
                key={concept.id}
                accentHex={concept.accentHex}
                tiltStrength={8}
                onClick={() => handleEnterLab(concept.id)}
                onMouseEnter={() => playGlassTap()}
                className="p-3.5"
              >
                <div className="flex flex-col gap-2.5">
                  <div
                    className="flex h-8 w-8 items-center justify-center rounded-xl border border-white/15 bg-white/10"
                    style={{ color: concept.accentHex }}
                  >
                    <Icon className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-[13px] font-semibold tracking-[-0.01em] text-[var(--text-primary)]">
                      {concept.shortLabel}
                    </div>
                    <div className="mt-0.5 text-[11px] leading-snug text-[var(--text-secondary)]">
                      {CONCEPT_PROMISES[concept.id]}
                    </div>
                  </div>
                </div>
              </SpatialGlassCard>
            )
          })}
        </div>
      </motion.div>
    </section>
  )
}
