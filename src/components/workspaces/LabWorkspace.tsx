import { useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  CheckCircle2,
  ChevronDown,
  Globe,
  Sparkles,
  Terminal,
  Trophy,
  Zap,
} from 'lucide-react'
import { CONCEPT_LENSES } from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { SpatialGlassCard } from '@/components/spatial/SpatialGlassCard'
import { getIncludedTokenCount } from '@/components/stage3d/scenes/TopPScene'
import { playChimeSuccess, playGlassTap, playSliderTick } from '@/services/soundEngine'
import type { ConceptId, JsonMode } from '@/types/playground'

const SHORT_LABELS: Record<ConceptId, string> = {
  'lpu-pipeline': 'LPU',
  'prompt-roles': 'Roles',
  temperature: 'Temp',
  'top-p': 'Top-P',
  'tokens-limits': 'Limits',
  'structured-json': 'JSON',
  'built-in-tools': 'Tools',
}

interface ChallengeSpec {
  prompt: string
  insight: string
}

const CHALLENGE_SPECS: Record<ConceptId, ChallengeSpec> = {
  'lpu-pipeline': {
    prompt: 'Switch Streaming OFF to see batched bursts, then pulse the LPU.',
    insight: 'Groq LPUs stream tokens deterministically with zero batching overhead.',
  },
  'prompt-roles': {
    prompt: 'Activate Assistant Prefill to lock the launch rail.',
    insight: 'Prefilling the assistant turn steers output format from token zero.',
  },
  temperature: {
    prompt: 'Push Temperature above 1.60 to flatten the probability pillars.',
    insight: 'Higher temperature flattens logits, trading determinism for creativity.',
  },
  'top-p': {
    prompt: 'Slide Top-P below 0.40 to prune the tail tokens.',
    insight: 'Nucleus sampling cuts off low-probability tail tokens dynamically.',
  },
  'tokens-limits': {
    prompt: 'Activate the Stop Gate and lower Max Tokens under 256.',
    insight: 'Hard token caps and stop sequences keep latency and cost predictable.',
  },
  'structured-json': {
    prompt: 'Lock in JSON Schema mode to snap tokens into typed slots.',
    insight: 'Strict schemas guarantee valid, parseable payloads every single run.',
  },
  'built-in-tools': {
    prompt: 'Enable both Browser Search and Code Sandbox to light up the dual orbital loop.',
    insight: 'Compound models orchestrate live search and Python execution in one loop.',
  },
}

const STRICT_SYSTEM_PROMPT =
  'You are a strict, ultra-concise Groq LPU systems expert. Respond with precision.'
const DEFAULT_SYSTEM_PROMPT = 'You are a helpful, concise AI assistant.'
const PREFILL_SNIPPET = '{ "answer": "'

function LabConceptRail() {
  const activeConcept = usePlaygroundStore((s) => s.activeConcept)
  const setActiveConcept = usePlaygroundStore((s) => s.setActiveConcept)
  const completedChallenges = usePlaygroundStore((s) => s.completedChallenges)

  return (
    <div className="pointer-events-none fixed inset-x-0 top-16 z-30 flex justify-center px-4">
      <div
        className="pointer-events-auto flex max-w-full items-center gap-1 overflow-x-auto rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-2 py-1.5 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]"
        style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {CONCEPT_LENSES.map((concept) => {
          const isActive = activeConcept === concept.id
          const isMastered = completedChallenges.includes(concept.id)

          return (
            <button
              key={concept.id}
              type="button"
              onClick={() => {
                if (activeConcept !== concept.id) {
                  playGlassTap()
                  setActiveConcept(concept.id)
                }
              }}
              className={`relative flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="lab-concept-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full border border-white/20 bg-white/15 dark:bg-white/12"
                />
              )}
              <span className="relative z-10">{SHORT_LABELS[concept.id]}</span>
              {isMastered && (
                <span
                  aria-label="Mastered"
                  className="relative z-10 h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-[0_0_6px_rgba(16,185,129,0.8)]"
                />
              )}
            </button>
          )
        })}

        <div className="mx-1 h-4 w-px shrink-0 bg-[var(--glass-border)]" />

        <div className="flex shrink-0 items-center gap-1.5 pr-2 text-[11px] font-medium text-[var(--text-secondary)]">
          <Trophy className="h-3.5 w-3.5 text-emerald-400" />
          <span>{completedChallenges.length} / 7 Mastered</span>
        </div>
      </div>
    </div>
  )
}

function LabOrnament({
  onPulseLpu,
}: {
  onPulseLpu: () => void
}) {
  const activeConcept = usePlaygroundStore((s) => s.activeConcept)
  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)

  const streaming = usePlaygroundStore((s) => s.streaming)
  const setStreaming = usePlaygroundStore((s) => s.setStreaming)

  const assistantPrefill = usePlaygroundStore((s) => s.assistantPrefill)
  const setAssistantPrefill = usePlaygroundStore((s) => s.setAssistantPrefill)
  const systemPrompt = usePlaygroundStore((s) => s.systemPrompt)
  const setSystemPrompt = usePlaygroundStore((s) => s.setSystemPrompt)

  const temperature = usePlaygroundStore((s) => s.temperature)
  const setTemperature = usePlaygroundStore((s) => s.setTemperature)

  const topP = usePlaygroundStore((s) => s.topP)
  const setTopP = usePlaygroundStore((s) => s.setTopP)

  const maxCompletionTokens = usePlaygroundStore((s) => s.maxCompletionTokens)
  const setMaxCompletionTokens = usePlaygroundStore((s) => s.setMaxCompletionTokens)
  const stopSequences = usePlaygroundStore((s) => s.stopSequences)
  const setStopSequences = usePlaygroundStore((s) => s.setStopSequences)

  const jsonMode = usePlaygroundStore((s) => s.jsonMode)
  const setJsonMode = usePlaygroundStore((s) => s.setJsonMode)

  const builtInTools = usePlaygroundStore((s) => s.builtInTools)
  const setBuiltInTools = usePlaygroundStore((s) => s.setBuiltInTools)

  const lastTickRef = useRef(0)
  const playThrottledTick = () => {
    const now = performance.now()
    if (now - lastTickRef.current > 45) {
      lastTickRef.current = now
      playSliderTick()
    }
  }

  const tempVibe =
    temperature < 0.45 ? 'Deterministic' : temperature < 1.25 ? 'Balanced' : 'Wild'
  const isPrefillActive = assistantPrefill.trim().length > 0
  const isStrictSystem = systemPrompt === STRICT_SYSTEM_PROMPT
  const isStopGateActive = stopSequences.length > 0

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-20 z-30 flex justify-center px-4">
      <motion.div
        layout
        transition={{ type: 'spring', stiffness: 360, damping: 30 }}
        className="pointer-events-auto flex flex-wrap items-center justify-center gap-3 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] px-4 py-2 shadow-[0_16px_40px_-10px_rgba(0,0,0,0.42)]"
        style={{
          backdropFilter: 'blur(28px) saturate(180%)',
          WebkitBackdropFilter: 'blur(28px) saturate(180%)',
        }}
      >
        {activeConcept === 'lpu-pipeline' && (
          <>
            <div className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] p-0.5">
              <button
                type="button"
                onClick={() => {
                  playGlassTap()
                  setStreaming(true)
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  streaming
                    ? 'bg-[var(--accent-cyan)] text-slate-950'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Stream
              </button>
              <button
                type="button"
                onClick={() => {
                  playGlassTap()
                  setStreaming(false)
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  !streaming
                    ? 'bg-[var(--accent-amber)] text-slate-950'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                Batch
              </button>
            </div>

            <button
              type="button"
              onClick={onPulseLpu}
              className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-[12px] font-semibold text-[var(--text-primary)] transition-transform hover:scale-[1.03] active:scale-[0.97]"
            >
              <Zap className="h-3.5 w-3.5 text-[var(--accent-cyan)]" />
              <span>Pulse LPU</span>
            </button>
          </>
        )}

        {activeConcept === 'prompt-roles' && (
          <>
            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setAssistantPrefill(isPrefillActive ? '' : PREFILL_SNIPPET)
              }}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                isPrefillActive
                  ? 'border-[var(--accent-cyan)]/60 bg-[var(--accent-cyan)]/20 text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isPrefillActive ? 'Prefill: { "answer": "' : 'Prefill: Off'}
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setSystemPrompt(isStrictSystem ? DEFAULT_SYSTEM_PROMPT : STRICT_SYSTEM_PROMPT)
              }}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                isStrictSystem
                  ? 'border-emerald-400/60 bg-emerald-400/20 text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              System: {isStrictSystem ? 'Strict Expert' : 'Default'}
            </button>
          </>
        )}

        {activeConcept === 'temperature' && (
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Temp
            </span>
            <input
              type="range"
              aria-label="Temperature"
              min={0}
              max={2}
              step={0.05}
              value={temperature}
              onChange={(e) => {
                playThrottledTick()
                setTemperature(parseFloat(e.target.value))
              }}
              className="h-1.5 w-32 cursor-pointer accent-[var(--accent-cyan)]"
            />
            <span className="font-mono-metric w-10 text-[12px] font-semibold text-[var(--text-primary)]">
              {temperature.toFixed(2)}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-cyan)]">
              {tempVibe}
            </span>
          </div>
        )}

        {activeConcept === 'top-p' && (
          <div className="flex items-center gap-3">
            <span className="text-[12px] font-medium text-[var(--text-secondary)]">
              Top-P
            </span>
            <input
              type="range"
              aria-label="Top-P"
              min={0.05}
              max={1}
              step={0.05}
              value={topP}
              onChange={(e) => {
                playThrottledTick()
                setTopP(parseFloat(e.target.value))
              }}
              className="h-1.5 w-32 cursor-pointer accent-[var(--accent-cyan)]"
            />
            <span className="font-mono-metric w-10 text-[12px] font-semibold text-[var(--text-primary)]">
              {topP.toFixed(2)}
            </span>
            <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-cyan)]">
              Pool: {getIncludedTokenCount(topP)} / 8
            </span>
          </div>
        )}

        {activeConcept === 'tokens-limits' && (
          <>
            <div className="flex items-center gap-2.5">
              <span className="text-[12px] font-medium text-[var(--text-secondary)]">
                Max Tokens
              </span>
              <input
                type="range"
                aria-label="Max Completion Tokens"
                min={16}
                max={4096}
                step={16}
                value={maxCompletionTokens}
                onChange={(e) => {
                  playThrottledTick()
                  setMaxCompletionTokens(parseInt(e.target.value, 10))
                }}
                className="h-1.5 w-28 cursor-pointer accent-[var(--accent-cyan)]"
              />
              <span className="font-mono-metric w-11 text-[12px] font-semibold text-[var(--text-primary)]">
                {maxCompletionTokens}
              </span>
            </div>

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setStopSequences(isStopGateActive ? [] : ['Step 3'])
              }}
              className={`rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                isStopGateActive
                  ? 'border-[var(--accent-amber)]/60 bg-[var(--accent-amber)]/20 text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              Stop Gate: {isStopGateActive ? 'Step 3' : 'Off'}
            </button>
          </>
        )}

        {activeConcept === 'structured-json' && (
          <div className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] p-0.5">
            {(
              [
                { id: 'off', label: 'Off' },
                { id: 'json_object', label: 'JSON Object' },
                { id: 'json_schema', label: 'JSON Schema' },
              ] as { id: JsonMode; label: string }[]
            ).map((opt) => (
              <button
                key={opt.id}
                type="button"
                onClick={() => {
                  playGlassTap()
                  setJsonMode(opt.id)
                }}
                className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                  jsonMode === opt.id
                    ? 'bg-[var(--accent-cyan)] text-slate-950'
                    : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        )}

        {activeConcept === 'built-in-tools' && (
          <>
            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setBuiltInTools({ browserSearch: !builtInTools.browserSearch })
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                builtInTools.browserSearch
                  ? 'border-[var(--accent-cyan)]/60 bg-[var(--accent-cyan)]/20 text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Globe className="h-3.5 w-3.5" />
              <span>Browser Search</span>
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setBuiltInTools({ codeInterpreter: !builtInTools.codeInterpreter })
              }}
              className={`flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12px] font-medium transition-colors ${
                builtInTools.codeInterpreter
                  ? 'border-[var(--accent-amber)]/60 bg-[var(--accent-amber)]/20 text-[var(--text-primary)]'
                  : 'border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Terminal className="h-3.5 w-3.5" />
              <span>Code Sandbox</span>
            </button>
          </>
        )}

        <div className="h-4 w-px bg-[var(--glass-border)]" />

        <button
          type="button"
          onClick={() => {
            playGlassTap()
            setActiveWorkspace('playground')
          }}
          className="flex items-center gap-1 text-[12px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-cyan)]"
        >
          <span>Try in Playground</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </button>
      </motion.div>
    </div>
  )
}

function LabChallengeCard({ hasPulsedLpu }: { hasPulsedLpu: boolean }) {
  const [isCollapsed, setIsCollapsed] = useState(false)

  const activeConcept = usePlaygroundStore((s) => s.activeConcept)
  const setActiveConcept = usePlaygroundStore((s) => s.setActiveConcept)
  const completedChallenges = usePlaygroundStore((s) => s.completedChallenges)
  const completeChallenge = usePlaygroundStore((s) => s.completeChallenge)

  const streaming = usePlaygroundStore((s) => s.streaming)
  const assistantPrefill = usePlaygroundStore((s) => s.assistantPrefill)
  const temperature = usePlaygroundStore((s) => s.temperature)
  const topP = usePlaygroundStore((s) => s.topP)
  const maxCompletionTokens = usePlaygroundStore((s) => s.maxCompletionTokens)
  const stopSequences = usePlaygroundStore((s) => s.stopSequences)
  const jsonMode = usePlaygroundStore((s) => s.jsonMode)
  const builtInTools = usePlaygroundStore((s) => s.builtInTools)

  const isCompleted = completedChallenges.includes(activeConcept)
  const spec = CHALLENGE_SPECS[activeConcept]

  useEffect(() => {
    if (isCompleted) return

    let satisfied = false
    switch (activeConcept) {
      case 'lpu-pipeline':
        satisfied = !streaming && hasPulsedLpu
        break
      case 'prompt-roles':
        satisfied = assistantPrefill.trim().length > 0
        break
      case 'temperature':
        satisfied = temperature > 1.6
        break
      case 'top-p':
        satisfied = topP < 0.4
        break
      case 'tokens-limits':
        satisfied = stopSequences.length > 0 && maxCompletionTokens < 256
        break
      case 'structured-json':
        satisfied = jsonMode === 'json_schema'
        break
      case 'built-in-tools':
        satisfied = builtInTools.browserSearch && builtInTools.codeInterpreter
        break
    }

    if (satisfied) {
      completeChallenge(activeConcept)
      playChimeSuccess()
    }
  }, [
    isCompleted,
    activeConcept,
    streaming,
    hasPulsedLpu,
    assistantPrefill,
    temperature,
    topP,
    maxCompletionTokens,
    stopSequences,
    jsonMode,
    builtInTools,
    completeChallenge,
  ])

  const currentIndex = CONCEPT_LENSES.findIndex((c) => c.id === activeConcept)
  const nextConcept = CONCEPT_LENSES[(currentIndex + 1) % CONCEPT_LENSES.length]

  return (
    <div className="pointer-events-none fixed right-6 top-20 z-30">
      <AnimatePresence mode="wait">
        {isCollapsed ? (
          <motion.button
            key="challenge-pill"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
            type="button"
            onClick={() => {
              playGlassTap()
              setIsCollapsed(false)
            }}
            className="spatial-pill pointer-events-auto flex items-center gap-2 rounded-full px-3.5 py-2 text-[12px] font-medium text-[var(--text-primary)]"
          >
            <Trophy
              className={`h-3.5 w-3.5 ${
                isCompleted ? 'text-emerald-400' : 'text-[var(--accent-cyan)]'
              }`}
            />
            <span>Challenge</span>
          </motion.button>
        ) : (
          <motion.div
            key="challenge-card"
            initial={{ opacity: 0, y: -8, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -8, scale: 0.96 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            className="pointer-events-auto w-[290px]"
          >
            <SpatialGlassCard
              accentHex={isCompleted ? '#10B981' : '#22D3EE'}
              interactive={false}
              className="p-4"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {isCompleted ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                  ) : (
                    <Sparkles className="h-4 w-4 text-[var(--accent-cyan)]" />
                  )}
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    {isCompleted ? 'Challenge Mastered' : 'Mini-Challenge'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={() => {
                    playGlassTap()
                    setIsCollapsed(true)
                  }}
                  aria-label="Collapse challenge card"
                  className="rounded-full p-1 text-[var(--text-secondary)] transition-colors hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <ChevronDown className="h-3.5 w-3.5" />
                </button>
              </div>

              <p className="mt-2.5 text-[13px] leading-relaxed text-[var(--text-primary)]">
                {spec.prompt}
              </p>

              {isCompleted && (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-3 border-t border-[var(--glass-border)] pt-3"
                >
                  <p className="text-[11.5px] leading-relaxed text-emerald-300 dark:text-emerald-300">
                    {spec.insight}
                  </p>
                  <button
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setActiveConcept(nextConcept.id)
                    }}
                    className="mt-2.5 flex w-full items-center justify-center gap-1.5 rounded-full bg-emerald-500/20 px-3 py-1.5 text-[12px] font-semibold text-emerald-300 transition-colors hover:bg-emerald-500/30"
                  >
                    <span>Next Concept</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </motion.div>
              )}
            </SpatialGlassCard>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export function LabWorkspace() {
  const [hasPulsedLpu, setHasPulsedLpu] = useState(false)
  const beginExecution = usePlaygroundStore((s) => s.beginExecution)
  const appendResponseDelta = usePlaygroundStore((s) => s.appendResponseDelta)
  const completeExecution = usePlaygroundStore((s) => s.completeExecution)

  const handlePulseLpu = () => {
    playGlassTap()
    setHasPulsedLpu(true)
    beginExecution('', 'demo')
    appendResponseDelta('LPU deterministic pulse complete.')
    completeExecution('completed', { tokensPerSecond: 840, ttftMs: 14 })
  }

  return (
    <div className="pointer-events-none absolute inset-0">
      <LabConceptRail />
      <LabChallengeCard hasPulsedLpu={hasPulsedLpu} />
      <LabOrnament onPulseLpu={handlePulseLpu} />
    </div>
  )
}
