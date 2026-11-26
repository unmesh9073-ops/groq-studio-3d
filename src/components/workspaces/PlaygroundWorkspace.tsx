import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  ArrowRight,
  Braces,
  ChevronDown,
  ExternalLink,
  Play,
  SlidersHorizontal,
  Sparkles,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import {
  EXPERIMENT_PRESETS,
  MODEL_CATALOG,
  getModelById,
} from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import {
  runPlaygroundCompletion,
  stopPlaygroundCompletion,
} from '@/services/playgroundRunner'
import { playChimeSuccess, playGlassTap, playSliderTick } from '@/services/soundEngine'
import { TelemetryBar } from '@/components/playground/TelemetryBar'
import { sanitizeHttpUrl } from '@/utils/url'
import type { ModelId } from '@/types/playground'

export function PlaygroundWorkspace() {
  const [isModelMenuOpen, setIsModelMenuOpen] = useState(false)
  const [isPresetsOpen, setIsPresetsOpen] = useState(false)
  const [isTuneOpen, setIsTuneOpen] = useState(false)
  const [isPayloadOpen, setIsPayloadOpen] = useState(false)
  const [isRolesExpanded, setIsRolesExpanded] = useState(false)
  const [isToolsExpanded, setIsToolsExpanded] = useState(true)
  const [isReasoningExpanded, setIsReasoningExpanded] = useState(false)
  const [jsonPretty, setJsonPretty] = useState(true)
  const [stopInput, setStopInput] = useState('')

  const model = usePlaygroundStore((s) => s.model)
  const setModel = usePlaygroundStore((s) => s.setModel)
  const temperature = usePlaygroundStore((s) => s.temperature)
  const setTemperature = usePlaygroundStore((s) => s.setTemperature)
  const topP = usePlaygroundStore((s) => s.topP)
  const setTopP = usePlaygroundStore((s) => s.setTopP)
  const maxCompletionTokens = usePlaygroundStore((s) => s.maxCompletionTokens)
  const setMaxCompletionTokens = usePlaygroundStore((s) => s.setMaxCompletionTokens)
  const streaming = usePlaygroundStore((s) => s.streaming)
  const setStreaming = usePlaygroundStore((s) => s.setStreaming)
  const stopSequences = usePlaygroundStore((s) => s.stopSequences)
  const addStopSequence = usePlaygroundStore((s) => s.addStopSequence)
  const removeStopSequence = usePlaygroundStore((s) => s.removeStopSequence)
  const systemPrompt = usePlaygroundStore((s) => s.systemPrompt)
  const setSystemPrompt = usePlaygroundStore((s) => s.setSystemPrompt)
  const assistantPrefill = usePlaygroundStore((s) => s.assistantPrefill)
  const setAssistantPrefill = usePlaygroundStore((s) => s.setAssistantPrefill)
  const jsonMode = usePlaygroundStore((s) => s.jsonMode)
  const builtInTools = usePlaygroundStore((s) => s.builtInTools)
  const applyExperimentPreset = usePlaygroundStore((s) => s.applyExperimentPreset)

  const userPrompt = usePlaygroundStore((s) => s.userPrompt)
  const setUserPrompt = usePlaygroundStore((s) => s.setUserPrompt)
  const responseText = usePlaygroundStore((s) => s.responseText)
  const prefillApplied = usePlaygroundStore((s) => s.prefillApplied)
  const executedTools = usePlaygroundStore((s) => s.executedTools)
  const reasoningTrace = usePlaygroundStore((s) => s.reasoningTrace)
  const errorMessage = usePlaygroundStore((s) => s.errorMessage)
  const executionStatus = usePlaygroundStore((s) => s.executionStatus)
  const clearExecutionOutput = usePlaygroundStore((s) => s.clearExecutionOutput)
  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)

  const isRunning =
    executionStatus === 'connecting' || executionStatus === 'streaming'
  const prevStatusRef = useRef(executionStatus)
  const lastTickRef = useRef(0)

  useEffect(() => {
    if (
      prevStatusRef.current !== 'completed' &&
      executionStatus === 'completed'
    ) {
      playChimeSuccess()
    }
    prevStatusRef.current = executionStatus
  }, [executionStatus])

  const playThrottledTick = () => {
    const now = performance.now()
    if (now - lastTickRef.current > 45) {
      lastTickRef.current = now
      playSliderTick()
    }
  }

  const activeModelMeta = getModelById(model)
  const hasNonDefaultTune =
    Math.abs(temperature - 0.7) > 0.01 ||
    Math.abs(topP - 1.0) > 0.01 ||
    maxCompletionTokens !== 512 ||
    !streaming ||
    stopSequences.length > 0 ||
    assistantPrefill.trim().length > 0

  const parsedJson = useMemo(() => {
    if (jsonMode === 'off' || !responseText.trim()) return null
    try {
      return JSON.parse(responseText)
    } catch {
      return null
    }
  }, [jsonMode, responseText])

  const displayedResponse = useMemo(() => {
    if (jsonPretty && parsedJson !== null) {
      return JSON.stringify(parsedJson, null, 2)
    }
    return responseText
  }, [jsonPretty, parsedJson, responseText])

  const payloadPreview = useMemo(() => {
    const messages: { role: string; content: string }[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ]
    if (assistantPrefill.trim()) {
      messages.push({ role: 'assistant', content: assistantPrefill })
    }
    return JSON.stringify(
      {
        model,
        messages,
        temperature,
        top_p: topP,
        max_completion_tokens: maxCompletionTokens,
        stream: streaming,
        ...(stopSequences.length > 0 ? { stop: stopSequences } : {}),
        ...(jsonMode !== 'off' ? { response_format: { type: jsonMode } } : {}),
        ...(builtInTools.browserSearch || builtInTools.codeInterpreter
          ? {
              tools: [
                ...(builtInTools.browserSearch ? [{ type: 'browser_search' }] : []),
                ...(builtInTools.codeInterpreter ? [{ type: 'code_interpreter' }] : []),
              ],
            }
          : {}),
      },
      null,
      2
    )
  }, [
    model,
    systemPrompt,
    userPrompt,
    assistantPrefill,
    temperature,
    topP,
    maxCompletionTokens,
    streaming,
    stopSequences,
    jsonMode,
    builtInTools,
  ])

  const handleRunOrStop = () => {
    if (isRunning) {
      playGlassTap()
      stopPlaygroundCompletion()
      return
    }
    playGlassTap()
    void runPlaygroundCompletion()
  }

  return (
    <section
      aria-label="Groq Playground Workspace"
      className="pointer-events-none fixed inset-x-0 bottom-24 top-16 z-20 flex justify-center px-4 sm:px-8"
    >
      <div
        className="pointer-events-auto relative flex h-full w-full max-w-4xl flex-col overflow-hidden rounded-[26px] border border-[var(--glass-border)] bg-[var(--glass-surface)] shadow-[0_24px_64px_-16px_rgba(0,0,0,0.48)]"
        style={{
          backdropFilter: 'blur(30px) saturate(180%)',
          WebkitBackdropFilter: 'blur(30px) saturate(180%)',
        }}
      >
        {/* Top Utility Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border)] px-4 py-3 sm:px-5">
          <div className="flex items-center gap-2">
            {/* Model Selector Pill */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playGlassTap()
                  setIsModelMenuOpen((v) => !v)
                  setIsPresetsOpen(false)
                  setIsTuneOpen(false)
                  setIsPayloadOpen(false)
                }}
                className="spatial-pill flex items-center gap-2 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-primary)]"
              >
                <span>{activeModelMeta.label}</span>
                <span className="font-mono-metric text-[11px] text-[var(--accent-cyan)]">
                  {activeModelMeta.nominalTps} tok/s
                </span>
                <ChevronDown className="h-3.5 w-3.5 text-[var(--text-secondary)]" />
              </button>

              {isModelMenuOpen && (
                <div className="absolute left-0 top-11 z-40 w-72 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] p-1.5 shadow-2xl backdrop-blur-2xl">
                  {MODEL_CATALOG.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        playGlassTap()
                        setModel(m.id as ModelId)
                        setIsModelMenuOpen(false)
                      }}
                      className={`flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-[12px] transition-colors ${
                        model === m.id
                          ? 'bg-[var(--accent-cyan)]/15 text-[var(--text-primary)]'
                          : 'text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]'
                      }`}
                    >
                      <div>
                        <div className="font-semibold text-[var(--text-primary)]">
                          {m.label}
                        </div>
                        <div className="text-[10.5px] text-[var(--text-muted)]">
                          {m.shortTier}
                        </div>
                      </div>
                      <span className="font-mono-metric text-[11px] text-[var(--accent-cyan)]">
                        {m.nominalTps} t/s
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Presets Popover */}
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playGlassTap()
                  setIsPresetsOpen((v) => !v)
                  setIsModelMenuOpen(false)
                  setIsTuneOpen(false)
                  setIsPayloadOpen(false)
                }}
                className="spatial-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              >
                <Sparkles className="h-3.5 w-3.5 text-[var(--accent-amber)]" />
                <span>Presets</span>
              </button>

              {isPresetsOpen && (
                <div className="absolute left-0 top-11 z-40 w-72 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-surface-strong)] p-1.5 shadow-2xl backdrop-blur-2xl">
                  {EXPERIMENT_PRESETS.map((preset) => (
                    <button
                      key={preset.id}
                      type="button"
                      onClick={() => {
                        playGlassTap()
                        applyExperimentPreset(preset)
                        setIsPresetsOpen(false)
                      }}
                      className="flex w-full flex-col rounded-xl px-3 py-2 text-left transition-colors hover:bg-white/10"
                    >
                      <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {preset.label}
                      </span>
                      <span className="text-[11px] text-[var(--text-secondary)]">
                        {preset.hint}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Center/Right: TelemetryBar + Tune + Peek Payload */}
          <div className="flex flex-wrap items-center gap-2">
            <TelemetryBar />

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setIsTuneOpen((v) => !v)
                setIsPayloadOpen(false)
                setIsModelMenuOpen(false)
                setIsPresetsOpen(false)
              }}
              className={`spatial-pill relative flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isTuneOpen
                  ? 'border-[var(--accent-cyan)]/60 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Tune</span>
              {hasNonDefaultTune && (
                <span className="h-1.5 w-1.5 rounded-full bg-[var(--accent-cyan)]" />
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setIsPayloadOpen((v) => !v)
                setIsTuneOpen(false)
                setIsModelMenuOpen(false)
                setIsPresetsOpen(false)
              }}
              className={`spatial-pill flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[12px] font-medium transition-colors ${
                isPayloadOpen
                  ? 'border-[var(--accent-cyan)]/60 text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              <Braces className="h-3.5 w-3.5" />
              <span className="hidden sm:inline">Peek Payload</span>
            </button>
          </div>
        </div>

        {/* Floating Tune Glass Popover */}
        <AnimatePresence>
          {isTuneOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="absolute right-4 top-16 z-50 w-[340px] max-w-[calc(100%-2rem)] rounded-2xl border border-[var(--glass-border)] bg-[var(--studio-bg)]/95 p-4 shadow-2xl backdrop-blur-2xl"
            >
              <div className="mb-3 flex items-center justify-between">
                <span className="text-[12px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                  Tune Parameters
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playGlassTap()
                    setIsTuneOpen(false)
                  }}
                  aria-label="Close Tune popover"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/10 hover:text-[var(--text-primary)]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>

              <div className="space-y-3 text-[12px]">
                {/* Temperature */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Temperature</span>
                    <span className="font-mono-metric font-semibold text-[var(--text-primary)]">
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Tune Temperature"
                    min={0}
                    max={2}
                    step={0.05}
                    value={temperature}
                    onChange={(e) => {
                      playThrottledTick()
                      setTemperature(parseFloat(e.target.value))
                    }}
                    className="h-1.5 w-full cursor-pointer accent-[var(--accent-cyan)]"
                  />
                </div>

                {/* Top-P */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Top-P</span>
                    <span className="font-mono-metric font-semibold text-[var(--text-primary)]">
                      {topP.toFixed(2)}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Tune Top-P"
                    min={0.05}
                    max={1}
                    step={0.05}
                    value={topP}
                    onChange={(e) => {
                      playThrottledTick()
                      setTopP(parseFloat(e.target.value))
                    }}
                    className="h-1.5 w-full cursor-pointer accent-[var(--accent-cyan)]"
                  />
                </div>

                {/* Max Completion Tokens */}
                <div>
                  <div className="mb-1 flex justify-between">
                    <span className="text-[var(--text-secondary)]">Max Tokens</span>
                    <span className="font-mono-metric font-semibold text-[var(--text-primary)]">
                      {maxCompletionTokens}
                    </span>
                  </div>
                  <input
                    type="range"
                    aria-label="Tune Max Completion Tokens"
                    min={16}
                    max={4096}
                    step={16}
                    value={maxCompletionTokens}
                    onChange={(e) => {
                      playThrottledTick()
                      setMaxCompletionTokens(parseInt(e.target.value, 10))
                    }}
                    className="h-1.5 w-full cursor-pointer accent-[var(--accent-cyan)]"
                  />
                </div>

                {/* Streaming Toggle */}
                <div className="flex items-center justify-between pt-1">
                  <span className="text-[var(--text-secondary)]">Streaming</span>
                  <button
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setStreaming(!streaming)
                    }}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold transition-colors ${
                      streaming
                        ? 'bg-[var(--accent-cyan)] text-slate-950'
                        : 'border border-[var(--glass-border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {streaming ? 'On' : 'Off'}
                  </button>
                </div>

                {/* Stop Sequences */}
                <div>
                  <span className="text-[var(--text-secondary)]">Stop Sequences</span>
                  <div className="mt-1.5 flex gap-1.5">
                    <input
                      type="text"
                      value={stopInput}
                      onChange={(e) => setStopInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && stopInput.trim()) {
                          e.preventDefault()
                          addStopSequence(stopInput.trim())
                          setStopInput('')
                        }
                      }}
                      placeholder="Add stop sequence…"
                      className="min-w-0 flex-1 rounded-lg border border-[var(--glass-border)] bg-black/20 px-2.5 py-1 text-[11.5px] text-[var(--text-primary)] outline-none"
                    />
                  </div>
                  {stopSequences.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {stopSequences.map((seq) => (
                        <span
                          key={seq}
                          className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-white/10 pl-2.5 pr-1 text-[11px] text-[var(--text-primary)]"
                        >
                          <span>{seq}</span>
                          <button
                            type="button"
                            onClick={() => removeStopSequence(seq)}
                            aria-label={`Remove stop sequence ${seq}`}
                            className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/15 hover:text-[var(--text-primary)]"
                          >
                            <X className="h-3 w-3" />
                          </button>
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Collapsible System Prompt & Prefill */}
                <div className="border-t border-[var(--glass-border)] pt-2">
                  <button
                    type="button"
                    onClick={() => setIsRolesExpanded((v) => !v)}
                    className="flex w-full items-center justify-between text-[11.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    <span>System Prompt &amp; Prefill</span>
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${
                        isRolesExpanded ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  {isRolesExpanded && (
                    <div className="mt-2 space-y-2">
                      <textarea
                        rows={2}
                        value={systemPrompt}
                        onChange={(e) => setSystemPrompt(e.target.value)}
                        placeholder="System prompt…"
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-black/20 p-2 text-[11.5px] text-[var(--text-primary)] outline-none"
                      />
                      <input
                        type="text"
                        value={assistantPrefill}
                        onChange={(e) => setAssistantPrefill(e.target.value)}
                        placeholder="Assistant prefill (optional)…"
                        className="w-full rounded-lg border border-[var(--glass-border)] bg-black/20 px-2.5 py-1.5 text-[11.5px] text-[var(--text-primary)] outline-none"
                      />
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Floating Peek Payload Popover */}
        <AnimatePresence>
          {isPayloadOpen && (
            <motion.div
              initial={{ opacity: 0, y: -8, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -8, scale: 0.98 }}
              transition={{ type: 'spring', stiffness: 360, damping: 28 }}
              className="absolute right-4 top-16 z-50 w-[400px] max-w-[calc(100%-2rem)] rounded-2xl border border-[var(--glass-border)] bg-[var(--studio-bg)]/95 p-4 shadow-2xl backdrop-blur-2xl"
            >
              <div className="mb-2 flex items-center justify-between">
                <span className="font-mono-metric text-[11px] font-semibold text-[var(--accent-cyan)]">
                  POST /openai/v1/chat/completions
                </span>
                <button
                  type="button"
                  onClick={() => setIsPayloadOpen(false)}
                  aria-label="Close payload preview"
                  className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-secondary)] hover:bg-white/10"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
              <pre className="font-mono-metric max-h-64 overflow-auto rounded-xl bg-black/30 p-3 text-[11px] leading-relaxed text-[var(--text-primary)]">
                {payloadPreview}
              </pre>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Main Output Canvas (Internal Scroll) */}
        <div className="flex-1 overflow-y-auto px-5 py-4">
          <div aria-live="polite" className="sr-only">
            {executionStatus === 'streaming'
              ? 'Streaming response from Groq LPU'
              : executionStatus === 'completed'
                ? 'Completion finished'
                : ''}
          </div>

          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2">
              {prefillApplied && (
                <span className="rounded-full border border-[var(--accent-cyan)]/40 bg-[var(--accent-cyan)]/15 px-2.5 py-0.5 text-[11px] font-medium text-[var(--accent-cyan)]">
                  Prefill: {prefillApplied}
                </span>
              )}
              {jsonMode !== 'off' && parsedJson !== null && (
                <div className="flex items-center gap-1.5">
                  <span className="rounded-full border border-emerald-400/40 bg-emerald-400/15 px-2.5 py-0.5 text-[11px] font-semibold text-emerald-300">
                    Valid JSON
                  </span>
                  <button
                    type="button"
                    onClick={() => setJsonPretty((v) => !v)}
                    className="rounded-full border border-[var(--glass-border)] px-2.5 py-0.5 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  >
                    {jsonPretty ? 'Raw' : 'Pretty'}
                  </button>
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                setActiveWorkspace('lab')
              }}
              className="flex items-center gap-1 text-[11.5px] font-medium text-[var(--text-secondary)] transition-colors hover:text-[var(--accent-cyan)]"
            >
              <span>Visualize in 3D Lab</span>
              <ArrowRight className="h-3 w-3" />
            </button>
          </div>

          {errorMessage && (
            <div className="mb-3 rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-[13px] text-rose-300">
              {errorMessage}
            </div>
          )}

          {executedTools.length > 0 && (
            <div className="mb-3 rounded-xl border border-[var(--glass-border)] bg-black/15 p-3">
              <button
                type="button"
                onClick={() => setIsToolsExpanded((v) => !v)}
                className="flex w-full items-center justify-between text-[12px] font-semibold text-[var(--text-primary)]"
              >
                <span>Server-Side Tool Trace ({executedTools.length})</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isToolsExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isToolsExpanded && (
                <div className="mt-2 space-y-2">
                  {executedTools.map((tool, idx) => (
                    <div
                      key={`${tool.type}-${idx}`}
                      className="rounded-lg border border-[var(--glass-border)] bg-black/20 p-2.5 text-[11.5px]"
                    >
                      <div className="font-semibold text-[var(--accent-cyan)]">
                        {tool.title}
                      </div>
                      <div className="mt-1 text-[var(--text-secondary)]">
                        {tool.output}
                      </div>
                      {tool.sources && tool.sources.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap gap-2">
                          {tool.sources.map((src, sIdx) => {
                            const safeUrl = sanitizeHttpUrl(src.url)
                            return safeUrl ? (
                              <a
                                key={sIdx}
                                href={safeUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-[11px] text-[var(--accent-cyan)] underline"
                              >
                                <span>{src.title}</span>
                                <ExternalLink className="h-2.5 w-2.5" />
                              </a>
                            ) : null
                          })}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {reasoningTrace && (
            <div className="mb-3 rounded-xl border border-[var(--glass-border)] bg-black/15 p-3">
              <button
                type="button"
                onClick={() => setIsReasoningExpanded((v) => !v)}
                className="flex w-full items-center justify-between text-[12px] font-semibold text-[var(--text-secondary)]"
              >
                <span>Model Reasoning</span>
                <ChevronDown
                  className={`h-3.5 w-3.5 transition-transform ${
                    isReasoningExpanded ? 'rotate-180' : ''
                  }`}
                />
              </button>
              {isReasoningExpanded && (
                <p className="mt-2 whitespace-pre-wrap text-[12px] text-[var(--text-secondary)]">
                  {reasoningTrace}
                </p>
              )}
            </div>
          )}

          {responseText ? (
            <pre className="whitespace-pre-wrap font-sans text-[14px] leading-relaxed text-[var(--text-primary)]">
              {displayedResponse}
            </pre>
          ) : (
            <div className="flex h-36 items-center justify-center text-center text-[13px] text-[var(--text-muted)]">
              Press Run or Cmd/Ctrl + Enter to stream deterministic tokens from Groq LPU.
            </div>
          )}
        </div>

        {/* Bottom Prompt Composer */}
        <div className="border-t border-[var(--glass-border)] p-3 sm:px-5 sm:py-3.5">
          <div className="flex items-end gap-2.5">
            <textarea
              rows={2}
              value={userPrompt}
              onChange={(e) => setUserPrompt(e.target.value)}
              onKeyDown={(e) => {
                if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
                  e.preventDefault()
                  handleRunOrStop()
                }
              }}
              placeholder="Ask Groq LPU anything… (Cmd/Ctrl + Enter to run)"
              className="min-h-[48px] flex-1 resize-none rounded-2xl border border-[var(--glass-border)] bg-black/20 px-4 py-2.5 text-[13.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] outline-none focus:border-[var(--accent-cyan)]/60"
            />

            <button
              type="button"
              onClick={() => {
                playGlassTap()
                clearExecutionOutput()
              }}
              aria-label="Clear output"
              title="Clear output"
              className="spatial-pill flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
            >
              <Trash2 className="h-4 w-4" />
            </button>

            <button
              type="button"
              onClick={handleRunOrStop}
              style={
                isRunning
                  ? { backgroundColor: 'var(--accent-rose)' }
                  : undefined
              }
              className={`flex h-11 shrink-0 items-center gap-2 rounded-2xl px-5 text-[13px] font-semibold transition-transform hover:scale-[1.02] active:scale-[0.98] ${
                isRunning
                  ? 'text-white shadow-[0_0_20px_rgba(244,63,94,0.35)]'
                  : 'bg-[var(--accent-cyan)] text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)]'
              }`}
            >
              {isRunning ? (
                <>
                  <Square className="h-3.5 w-3.5 fill-current" />
                  <span>Stop</span>
                </>
              ) : (
                <>
                  <Play className="h-3.5 w-3.5 fill-current" />
                  <span>Run</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
