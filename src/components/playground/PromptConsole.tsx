import { useEffect, useMemo, useRef, useState, type KeyboardEvent } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Code2,
  ExternalLink,
  Globe,
  Play,
  Sparkles,
  Square,
  Terminal,
  Trash2,
} from 'lucide-react'
import { EXPERIMENT_PRESETS, getModelById } from '@/data/concepts'
import { SpotlightBadge } from '@/components/layout/SpotlightBadge'
import { TelemetryBar } from '@/components/playground/TelemetryBar'
import { buildGroqChatPayload } from '@/services/groqClient'
import {
  runPlaygroundCompletion,
  stopPlaygroundCompletion,
} from '@/services/playgroundRunner'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { sanitizeHttpUrl } from '@/utils/url'

export function PromptConsole() {
  const apiKey = usePlaygroundStore((state) => state.apiKey)
  const model = usePlaygroundStore((state) => state.model)
  const systemPrompt = usePlaygroundStore((state) => state.systemPrompt)
  const assistantPrefill = usePlaygroundStore((state) => state.assistantPrefill)
  const userPrompt = usePlaygroundStore((state) => state.userPrompt)
  const temperature = usePlaygroundStore((state) => state.temperature)
  const topP = usePlaygroundStore((state) => state.topP)
  const maxCompletionTokens = usePlaygroundStore((state) => state.maxCompletionTokens)
  const stopSequences = usePlaygroundStore((state) => state.stopSequences)
  const streaming = usePlaygroundStore((state) => state.streaming)
  const jsonMode = usePlaygroundStore((state) => state.jsonMode)
  const jsonSchemaName = usePlaygroundStore((state) => state.jsonSchemaName)
  const jsonSchemaStrict = usePlaygroundStore((state) => state.jsonSchemaStrict)
  const jsonSchemaText = usePlaygroundStore((state) => state.jsonSchemaText)
  const builtInTools = usePlaygroundStore((state) => state.builtInTools)

  const executionStatus = usePlaygroundStore((state) => state.executionStatus)
  const responseText = usePlaygroundStore((state) => state.responseText)
  const prefillApplied = usePlaygroundStore((state) => state.prefillApplied)
  const executedTools = usePlaygroundStore((state) => state.executedTools)
  const reasoningTrace = usePlaygroundStore((state) => state.reasoningTrace)
  const errorMessage = usePlaygroundStore((state) => state.errorMessage)
  const errorRecoveryAction = usePlaygroundStore((state) => state.errorRecoveryAction)
  const telemetry = usePlaygroundStore((state) => state.telemetry)
  const isConsoleExpanded = usePlaygroundStore((state) => state.isConsoleExpanded)
  const isControlDockCollapsed = usePlaygroundStore((state) => state.isControlDockCollapsed)
  const isJarvisOpen = usePlaygroundStore((state) => state.isJarvisOpen)
  const highlightedControl = usePlaygroundStore((state) => state.highlightedControl)

  const setUserPrompt = usePlaygroundStore((state) => state.setUserPrompt)
  const setSystemPrompt = usePlaygroundStore((state) => state.setSystemPrompt)
  const setAssistantPrefill = usePlaygroundStore((state) => state.setAssistantPrefill)
  const applyExperimentPreset = usePlaygroundStore((state) => state.applyExperimentPreset)
  const toggleConsoleExpanded = usePlaygroundStore((state) => state.toggleConsoleExpanded)
  const clearExecutionOutput = usePlaygroundStore((state) => state.clearExecutionOutput)
  const setSettingsOpen = usePlaygroundStore((state) => state.setSettingsOpen)
  const setCodeModalOpen = usePlaygroundStore((state) => state.setCodeModalOpen)
  const clearApiKey = usePlaygroundStore((state) => state.clearApiKey)
  const setModel = usePlaygroundStore((state) => state.setModel)

  const [openRoleEditor, setOpenRoleEditor] = useState<'system' | 'prefill' | null>(null)
  const [payloadOpen, setPayloadOpen] = useState(false)
  const [toolTraceOpen, setToolTraceOpen] = useState(true)
  const [reasoningOpen, setReasoningOpen] = useState(false)
  const [jsonViewMode, setJsonViewMode] = useState<'pretty' | 'raw'>('pretty')

  const outputRef = useRef<HTMLDivElement>(null)
  const payloadRef = useRef<HTMLDivElement>(null)

  const isRunning = executionStatus === 'connecting' || executionStatus === 'streaming'
  const selectedModel = getModelById(model)
  const effectiveRoleEditor =
    highlightedControl === 'systemPrompt'
      ? 'system'
      : highlightedControl === 'assistantPrefill'
        ? 'prefill'
        : openRoleEditor

  useEffect(() => {
    const el = outputRef.current
    if (el && (isRunning || responseText.length > 0)) {
      el.scrollTop = el.scrollHeight
    }
  }, [responseText, isRunning])

  useEffect(() => {
    if (!payloadOpen) return
    const onOutside = (event: MouseEvent) => {
      if (payloadRef.current && !payloadRef.current.contains(event.target as Node)) {
        setPayloadOpen(false)
      }
    }
    const onEsc = (event: globalThis.KeyboardEvent) => {
      if (event.key === 'Escape') setPayloadOpen(false)
    }
    window.addEventListener('mousedown', onOutside)
    window.addEventListener('keydown', onEsc)
    return () => {
      window.removeEventListener('mousedown', onOutside)
      window.removeEventListener('keydown', onEsc)
    }
  }, [payloadOpen])

  const livePayloadPreview = useMemo(
    () =>
      JSON.stringify(
        buildGroqChatPayload({
          apiKey,
          model,
          systemPrompt,
          userPrompt,
          assistantPrefill,
          temperature,
          topP,
          maxCompletionTokens,
          stopSequences,
          streaming,
          jsonMode,
          jsonSchemaName,
          jsonSchemaStrict,
          jsonSchemaText,
          builtInTools,
        }),
        null,
        2
      ),
    [
      apiKey,
      model,
      systemPrompt,
      userPrompt,
      assistantPrefill,
      temperature,
      topP,
      maxCompletionTokens,
      stopSequences,
      streaming,
      jsonMode,
      jsonSchemaName,
      jsonSchemaStrict,
      jsonSchemaText,
      builtInTools,
    ]
  )

  const parsedJsonOutput = useMemo(() => {
    if (jsonMode === 'off' || responseText.trim().length === 0) return null
    try {
      const parsed = JSON.parse(responseText)
      return JSON.stringify(parsed, null, 2)
    } catch {
      return null
    }
  }, [jsonMode, responseText])

  const handlePromptKeyDown = (event: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((event.metaKey || event.ctrlKey) && event.key === 'Enter') {
      event.preventDefault()
      if (isRunning) {
        stopPlaygroundCompletion()
      } else {
        void runPlaygroundCompletion()
      }
    }
  }

  const handleErrorRecovery = () => {
    if (errorRecoveryAction === 'open-settings') {
      setSettingsOpen(true)
    } else if (errorRecoveryAction === 'switch-demo') {
      clearApiKey()
      clearExecutionOutput()
    } else if (errorRecoveryAction === 'switch-default-model') {
      setModel('openai/gpt-oss-120b')
      clearExecutionOutput()
    }
  }

  const recoveryButtonLabel =
    errorRecoveryAction === 'open-settings'
      ? 'Open Settings'
      : errorRecoveryAction === 'switch-demo'
        ? 'Switch to Demo Mode'
        : errorRecoveryAction === 'switch-default-model'
          ? 'Switch to openai/gpt-oss-120b'
          : null

  return (
    <div
      className={[
        'pointer-events-none fixed bottom-4 z-20 flex justify-center px-4 transition-all duration-300',
        'left-0 right-0',
        !isControlDockCollapsed ? 'lg:left-[332px]' : 'lg:left-0',
        isJarvisOpen ? 'lg:right-[396px]' : 'lg:right-0',
      ].join(' ')}
    >
      <AnimatePresence mode="wait" initial={false}>
        {!isConsoleExpanded ? (
          <motion.button
            key="console-collapsed"
            type="button"
            onClick={toggleConsoleExpanded}
            initial={{ opacity: 0, y: 12, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.96 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.25 }}
            whileTap={{ scale: 0.97 }}
            data-testid="console-expand-pill"
            className="pointer-events-auto spatial-pill select-none flex items-center gap-2.5 rounded-full px-4 py-2 text-[12.5px] font-medium text-[var(--text-primary)] hover:border-[var(--glass-border-strong)]"
          >
            <Sparkles className="h-3.5 w-3.5 text-[var(--accent-cyan)]" aria-hidden="true" />
            <span>Prompt Console</span>
            <span className="font-mono-metric text-[11px] text-[var(--text-muted)]">
              {selectedModel.label}
            </span>
            {telemetry.tokensPerSecond !== null && (
              <span className="font-mono-metric rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10.5px] text-[var(--accent-amber)]">
                {telemetry.tokensPerSecond} t/s
              </span>
            )}
            <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)]" aria-hidden="true" />
          </motion.button>
        ) : (
          <motion.section
            key="console-expanded"
            aria-label="Prompt Console"
            data-testid="prompt-console"
            initial={{ opacity: 0, y: 18, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 14, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.3 }}
            className="pointer-events-auto spatial-glass-elevated select-none relative flex w-full max-w-[740px] flex-col overflow-visible rounded-[24px]"
          >
            {/* Top Telemetry + View Code + Collapse Header */}
            <div className="flex items-center justify-between gap-2 pr-2.5">
              <div className="min-w-0 flex-1">
                <TelemetryBar />
              </div>

              <button
                type="button"
                onClick={() => setCodeModalOpen(true)}
                data-testid="console-view-code"
                title="View SDK Code (⌘/Ctrl + E)"
                className="flex h-7 shrink-0 items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2.5 text-[11px] font-medium text-[var(--text-primary)] transition-colors hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg-pill-hover)]"
              >
                <Code2 className="h-3 w-3 text-[var(--accent-cyan)]" aria-hidden="true" />
                <span>View Code</span>
              </button>

              <button
                type="button"
                onClick={toggleConsoleExpanded}
                aria-label="Collapse Prompt Console"
                title="Collapse Prompt Console to inspect full 3D stage"
                data-testid="console-collapse-button"
                className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
              >
                <ChevronDown className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>

            {/* Experiment Presets + Role Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[var(--glass-border)] px-4 py-2">
              <div className="no-scrollbar flex max-w-full items-center gap-1.5 overflow-x-auto">
                {EXPERIMENT_PRESETS.map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => applyExperimentPreset(preset)}
                    title={preset.hint}
                    data-testid={`preset-${preset.id}`}
                    className="shrink-0 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] whitespace-nowrap transition-colors hover:border-[var(--glass-border-strong)] hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              <div className="relative flex items-center gap-1.5" ref={payloadRef}>
                <button
                  type="button"
                  onClick={() =>
                    setOpenRoleEditor((prev) => (prev === 'system' ? null : 'system'))
                  }
                  data-testid="toggle-system-role"
                  className={[
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    openRoleEditor === 'system' || systemPrompt.trim().length > 0
                      ? 'border-[var(--accent-sky)]/40 bg-[var(--glass-bg-pill-hover)] text-[var(--text-primary)]'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  System
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setOpenRoleEditor((prev) => (prev === 'prefill' ? null : 'prefill'))
                  }
                  data-testid="toggle-prefill-role"
                  className={[
                    'rounded-full border px-2.5 py-1 text-[11px] font-medium transition-colors',
                    openRoleEditor === 'prefill' || assistantPrefill.trim().length > 0
                      ? 'border-[var(--accent-cyan)]/45 bg-[var(--glass-bg-pill-hover)] text-[var(--accent-cyan)]'
                      : 'border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-muted)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  Prefill
                </button>

                <button
                  type="button"
                  onClick={() => setPayloadOpen((prev) => !prev)}
                  data-testid="peek-payload-button"
                  title="Peek API Payload"
                  aria-expanded={payloadOpen}
                  className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-[var(--text-primary)]"
                >
                  <Code2 className="h-3 w-3" aria-hidden="true" />
                  <span>Peek Payload</span>
                </button>

                {/* Peek API Payload Popover */}
                <AnimatePresence>
                  {payloadOpen && (
                    <motion.div
                      data-testid="peek-payload-popover"
                      initial={{ opacity: 0, y: 8, scale: 0.97 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 8, scale: 0.97 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.2 }}
                      className="spatial-glass-elevated absolute right-0 bottom-[calc(100%+10px)] z-40 w-[340px] max-w-[88vw] rounded-2xl p-3.5"
                    >
                      <div className="flex items-center justify-between border-b border-[var(--glass-border)] pb-2">
                        <span className="font-mono-metric text-[11px] font-semibold text-[var(--accent-cyan)]">
                          POST /openai/v1/chat/completions
                        </span>
                        <span className="text-[10px] text-[var(--text-muted)]">JSON body</span>
                      </div>
                      <pre className="font-mono-metric spatial-scroll select-text mt-2 max-h-52 overflow-auto text-[10.5px] leading-relaxed text-[var(--text-secondary)]">
                        {livePayloadPreview}
                      </pre>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>

            {/* Collapsible Role Editor (System Prompt / Assistant Prefill) */}
            <AnimatePresence initial={false}>
              {effectiveRoleEditor && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ type: 'spring', bounce: 0, duration: 0.22 }}
                  className="overflow-hidden border-b border-[var(--glass-border)] px-4"
                >
                  <div className="py-2.5">
                    {effectiveRoleEditor === 'system' ? (
                      <div
                        className={[
                          'space-y-1',
                          highlightedControl === 'systemPrompt'
                            ? 'ring-2 ring-[var(--accent-cyan)] rounded-xl p-2'
                            : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="system-prompt-input"
                            className="font-mono-metric block text-[10.5px] font-medium text-[var(--accent-sky)]"
                          >
                            role: &quot;system&quot;
                          </label>
                          <SpotlightBadge
                            visible={highlightedControl === 'systemPrompt'}
                            target="systemPrompt"
                          />
                        </div>
                        <input
                          id="system-prompt-input"
                          data-testid="system-prompt-input"
                          type="text"
                          value={systemPrompt}
                          onChange={(e) => setSystemPrompt(e.target.value)}
                          placeholder="Instructions that steer how the model behaves…"
                          className="select-text w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)] focus:outline-none"
                        />
                      </div>
                    ) : (
                      <div
                        className={[
                          'space-y-1',
                          highlightedControl === 'assistantPrefill'
                            ? 'ring-2 ring-[var(--accent-cyan)] rounded-xl p-2'
                            : '',
                        ].join(' ')}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <label
                            htmlFor="assistant-prefill-input"
                            className="font-mono-metric block text-[10.5px] font-medium text-[var(--accent-cyan)]"
                          >
                            role: &quot;assistant&quot; (Prefill opening tokens)
                          </label>
                          <SpotlightBadge
                            visible={highlightedControl === 'assistantPrefill'}
                            target="assistantPrefill"
                          />
                        </div>
                        <input
                          id="assistant-prefill-input"
                          data-testid="assistant-prefill-input"
                          type="text"
                          value={assistantPrefill}
                          onChange={(e) => setAssistantPrefill(e.target.value)}
                          placeholder='e.g. { "summary": "'
                          className="font-mono-metric select-text w-full rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-1.5 text-[12px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)] focus:outline-none"
                        />
                      </div>
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            {/* Screen-Reader Execution Milestone Announcements */}
            <div className="sr-only" aria-live="polite" aria-atomic="true">
              {executionStatus === 'connecting'
                ? 'Connecting to Groq LPU…'
                : executionStatus === 'completed'
                  ? 'Response complete.'
                  : executionStatus === 'aborted'
                    ? 'Generation stopped.'
                    : executionStatus === 'error' && errorMessage
                      ? `Error: ${errorMessage}`
                      : ''}
            </div>

            {/* Output Area */}
            {(responseText.length > 0 ||
              prefillApplied.length > 0 ||
              executedTools.length > 0 ||
              isRunning ||
              errorMessage) && (
              <div
                ref={outputRef}
                data-testid="console-output-area"
                className="spatial-scroll select-text max-h-[180px] space-y-2.5 overflow-y-auto border-b border-[var(--glass-border)] px-4 py-3 text-[13px] leading-relaxed text-[var(--text-primary)]"
              >
                {/* Server-Side Tool Execution Trace */}
                {(executedTools.length > 0 || reasoningTrace) && (
                  <div
                    data-testid="tool-trace-inspector"
                    className="rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-2.5"
                  >
                    <div className="flex items-center justify-between gap-2">
                      <button
                        type="button"
                        onClick={() => setToolTraceOpen((prev) => !prev)}
                        className="flex items-center gap-2 text-[11.5px] font-semibold text-[var(--text-primary)]"
                      >
                        <Sparkles className="h-3.5 w-3.5 text-[var(--accent-amber)]" aria-hidden="true" />
                        <span>Server-Side Tool Trace ({executedTools.length})</span>
                        {toolTraceOpen ? (
                          <ChevronUp className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5 text-[var(--text-muted)]" />
                        )}
                      </button>

                      {reasoningTrace && (
                        <button
                          type="button"
                          onClick={() => setReasoningOpen((prev) => !prev)}
                          data-testid="toggle-reasoning-trace"
                          className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2 py-0.5 text-[10.5px] font-medium text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                        >
                          {reasoningOpen ? 'Hide Reasoning' : 'Model Reasoning'}
                        </button>
                      )}
                    </div>

                    {reasoningOpen && reasoningTrace && (
                      <p className="mt-2 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-2 text-[11.5px] italic text-[var(--text-secondary)]">
                        {reasoningTrace}
                      </p>
                    )}

                    {toolTraceOpen && executedTools.length > 0 && (
                      <div className="mt-2 space-y-2">
                        {executedTools.map((trace, idx) => (
                          <div
                            key={`${trace.type}-${idx}`}
                            data-testid={`tool-trace-item-${trace.type}`}
                            className="rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-2.5 text-[11.5px]"
                          >
                            <div className="flex items-center gap-1.5 font-medium text-[var(--text-primary)]">
                              {trace.type === 'browser_search' ? (
                                <Globe
                                  className="h-3.5 w-3.5 text-[var(--accent-sky)]"
                                  aria-hidden="true"
                                />
                              ) : (
                                <Terminal
                                  className="h-3.5 w-3.5 text-[var(--accent-amber)]"
                                  aria-hidden="true"
                                />
                              )}
                              <span>{trace.title}</span>
                            </div>

                            <pre className="font-mono-metric mt-1.5 overflow-x-auto rounded-lg bg-[var(--input-bg)] px-2 py-1.5 text-[10.5px] text-[var(--text-secondary)]">
                              {trace.input}
                            </pre>
                            <p className="font-mono-metric mt-1 text-[10.5px] text-[var(--accent-emerald)]">
                              → {trace.output}
                            </p>

                            {trace.sources && trace.sources.length > 0 && (
                              <div className="mt-1.5 flex flex-wrap gap-1.5">
                                {trace.sources.map((src, sIdx) => {
                                  const safeHref = sanitizeHttpUrl(src.url)
                                  if (!safeHref) {
                                    return (
                                      <span
                                        key={`${src.title}-${sIdx}`}
                                        className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10px] text-[var(--text-secondary)]"
                                      >
                                        <span>{src.title}</span>
                                      </span>
                                    )
                                  }
                                  return (
                                    <a
                                      key={`${safeHref}-${sIdx}`}
                                      href={safeHref}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center gap-1 rounded-full border border-[var(--glass-border)] px-2 py-0.5 text-[10px] text-[var(--accent-cyan)] hover:border-[var(--accent-cyan)]"
                                    >
                                      <span>{src.title}</span>
                                      <ExternalLink className="h-2.5 w-2.5" aria-hidden="true" />
                                    </a>
                                  )
                                })}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {/* Valid JSON Badge + Pretty/Raw Toggle */}
                {parsedJsonOutput && (
                  <div className="flex items-center justify-between gap-2">
                    <span
                      data-testid="valid-json-badge"
                      className="inline-flex items-center gap-1.5 rounded-full border border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald)]/12 px-2.5 py-0.5 text-[11px] font-semibold text-[var(--accent-emerald)]"
                    >
                      <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                      <span>Valid JSON</span>
                    </span>

                    <div className="flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-0.5 text-[10.5px]">
                      <button
                        type="button"
                        onClick={() => setJsonViewMode('pretty')}
                        className={[
                          'rounded-full px-2 py-0.5 font-medium',
                          jsonViewMode === 'pretty'
                            ? 'bg-[var(--accent-cyan)] text-slate-950'
                            : 'text-[var(--text-secondary)]',
                        ].join(' ')}
                      >
                        Pretty
                      </button>
                      <button
                        type="button"
                        onClick={() => setJsonViewMode('raw')}
                        className={[
                          'rounded-full px-2 py-0.5 font-medium',
                          jsonViewMode === 'raw'
                            ? 'bg-[var(--accent-cyan)] text-slate-950'
                            : 'text-[var(--text-secondary)]',
                        ].join(' ')}
                      >
                        Raw
                      </button>
                    </div>
                  </div>
                )}

                {errorMessage ? (
                  <div
                    data-testid="console-error-banner"
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-rose-500/35 bg-rose-500/10 px-3.5 py-2.5 text-[12px] text-[var(--text-primary)]"
                  >
                    <div className="flex items-start gap-2">
                      <AlertCircle
                        className="mt-0.5 h-4 w-4 shrink-0 text-rose-400"
                        aria-hidden="true"
                      />
                      <span>{errorMessage}</span>
                    </div>
                    {recoveryButtonLabel && (
                      <button
                        type="button"
                        onClick={handleErrorRecovery}
                        className="rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg)] px-3 py-1 text-[11px] font-semibold text-[var(--accent-cyan)] hover:bg-[var(--glass-bg-pill-hover)]"
                      >
                        {recoveryButtonLabel}
                      </button>
                    )}
                  </div>
                ) : parsedJsonOutput && jsonViewMode === 'pretty' ? (
                  <pre className="font-mono-metric whitespace-pre-wrap break-words rounded-xl border border-[var(--glass-border)] bg-[var(--input-bg)] p-2.5 text-[12px] text-[var(--accent-cyan)]">
                    {parsedJsonOutput}
                  </pre>
                ) : (
                  <div className="whitespace-pre-wrap break-words">
                    {prefillApplied.length > 0 && (
                      <span
                        data-testid="prefill-highlight"
                        className="mr-1 inline rounded-md border border-[var(--accent-cyan)]/35 bg-[var(--accent-cyan)]/14 px-1.5 py-0.5 font-mono-metric text-[12px] text-[var(--accent-cyan)]"
                      >
                        <span className="mr-1.5 text-[9.5px] font-semibold uppercase tracking-wider opacity-80">
                          Prefill
                        </span>
                        {prefillApplied}
                      </span>
                    )}
                    <span>{responseText}</span>
                    {executionStatus === 'connecting' && !streaming && (
                      <span className="inline-flex items-center gap-2 text-[12px] text-[var(--text-secondary)]">
                        <span className="h-2 w-2 animate-pulse rounded-full bg-[var(--accent-amber)]" />
                        Computing full response on LPU…
                      </span>
                    )}
                    {isRunning && streaming && (
                      <span
                        className="ml-0.5 inline-block h-3.5 w-1.5 animate-pulse rounded-xs bg-[var(--accent-cyan)] align-middle"
                        aria-hidden="true"
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Prompt Input + Run / Stop / Clear */}
            <div className="flex items-end gap-2.5 p-3">
              <textarea
                rows={2}
                value={userPrompt}
                onChange={(e) => setUserPrompt(e.target.value)}
                onKeyDown={handlePromptKeyDown}
                aria-label="Prompt input"
                data-testid="prompt-textarea"
                placeholder="Ask anything to watch the Groq LPU stream tokens… (⌘/Ctrl + Enter to run)"
                className={[
                  'select-text spatial-scroll min-h-[46px] max-h-28 flex-1 resize-none rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3.5 py-2 text-[13px] leading-snug text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)] focus:outline-none',
                  highlightedControl === 'promptInput' ? 'ring-2 ring-[var(--accent-cyan)]' : '',
                ].join(' ')}
              />

              <div className="flex shrink-0 items-center gap-1.5">
                {(responseText.length > 0 || executedTools.length > 0 || errorMessage) &&
                  !isRunning && (
                    <button
                      type="button"
                      onClick={clearExecutionOutput}
                      aria-label="Clear output"
                      title="Clear output"
                      data-testid="clear-output-button"
                      className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                    >
                      <Trash2 className="h-4 w-4" aria-hidden="true" />
                    </button>
                  )}

                {isRunning ? (
                  <motion.button
                    type="button"
                    onClick={stopPlaygroundCompletion}
                    whileTap={{ scale: 0.96 }}
                    data-testid="stop-prompt-button"
                    className="flex h-10 items-center gap-1.5 rounded-2xl border border-rose-500/45 bg-rose-500/15 px-4 text-[12.5px] font-semibold text-[var(--accent-rose)] transition-colors hover:bg-rose-500/25"
                  >
                    <Square className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Stop</span>
                  </motion.button>
                ) : (
                  <motion.button
                    type="button"
                    onClick={() => void runPlaygroundCompletion()}
                    whileTap={{ scale: 0.96 }}
                    disabled={userPrompt.trim().length === 0}
                    data-testid="run-prompt-button"
                    className="flex h-10 items-center gap-1.5 rounded-2xl bg-[var(--accent-cyan)] px-4.5 text-[12.5px] font-semibold text-slate-950 shadow-sm transition-opacity hover:opacity-90 disabled:opacity-40"
                  >
                    <Play className="h-3.5 w-3.5 fill-current" aria-hidden="true" />
                    <span>Run</span>
                  </motion.button>
                )}
              </div>
            </div>
          </motion.section>
        )}
      </AnimatePresence>
    </div>
  )
}
