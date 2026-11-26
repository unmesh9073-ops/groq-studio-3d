import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Braces,
  Check,
  ChevronDown,
  ChevronLeft,
  Globe,
  HelpCircle,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Terminal,
  X,
} from 'lucide-react'
import { getModelById, MODEL_CATALOG } from '@/data/concepts'
import { SpotlightBadge } from '@/components/layout/SpotlightBadge'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { ControlHighlightKey, JsonMode } from '@/types/playground'

interface HelpTooltipProps {
  label: string
  description: string
}

function HelpTooltip({ label, description }: HelpTooltipProps) {
  const [open, setOpen] = useState(false)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const [coords, setCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 })

  const updatePosition = () => {
    const el = triggerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const viewportWidth = window.innerWidth
    const prefersLeft = rect.right + 280 > viewportWidth
    setCoords({
      top: Math.max(82, Math.min(window.innerHeight - 140, rect.top - 10)),
      left: prefersLeft ? Math.max(16, rect.left - 264) : rect.right + 12,
    })
  }

  const handleOpen = () => {
    updatePosition()
    setOpen(true)
  }

  return (
    <span className="relative inline-flex items-center">
      <button
        ref={triggerRef}
        type="button"
        onMouseEnter={handleOpen}
        onMouseLeave={() => setOpen(false)}
        onFocus={handleOpen}
        onBlur={() => setOpen(false)}
        onClick={() => (open ? setOpen(false) : handleOpen())}
        aria-label={`What is ${label}?`}
        className="flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--accent-cyan)]"
      >
        <HelpCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </button>

      {typeof document !== 'undefined' &&
        createPortal(
          <AnimatePresence>
            {open && (
              <motion.div
                role="tooltip"
                initial={{ opacity: 0, x: -4, scale: 0.97 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -4, scale: 0.97 }}
                transition={{ type: 'spring', bounce: 0, duration: 0.18 }}
                style={{ top: coords.top, left: coords.left }}
                className="spatial-glass-elevated pointer-events-none fixed z-50 w-64 rounded-2xl p-3 text-left"
              >
                <p className="text-[11.5px] font-semibold text-[var(--text-primary)]">{label}</p>
                <p className="mt-1 text-[11.5px] leading-relaxed text-[var(--text-secondary)]">
                  {description}
                </p>
              </motion.div>
            )}
          </AnimatePresence>,
          document.body
        )}
    </span>
  )
}

function getControlHighlightClass(
  highlightedControl: ControlHighlightKey | null,
  target: ControlHighlightKey
): string {
  if (highlightedControl !== target) return ''
  return 'ring-2 ring-[var(--accent-cyan)] shadow-[0_0_22px_rgba(34,211,238,0.28)] bg-[var(--glass-bg-pill-hover)] rounded-2xl p-2.5 -mx-2.5 transition-[box-shadow,background-color]'
}

function formatStopChipLabel(seq: string): string {
  return seq.replace(/\n/g, '↵')
}

export function ControlDock() {
  const model = usePlaygroundStore((state) => state.model)
  const temperature = usePlaygroundStore((state) => state.temperature)
  const topP = usePlaygroundStore((state) => state.topP)
  const maxCompletionTokens = usePlaygroundStore((state) => state.maxCompletionTokens)
  const stopSequences = usePlaygroundStore((state) => state.stopSequences)
  const streaming = usePlaygroundStore((state) => state.streaming)
  const jsonMode = usePlaygroundStore((state) => state.jsonMode)
  const jsonSchemaStrict = usePlaygroundStore((state) => state.jsonSchemaStrict)
  const builtInTools = usePlaygroundStore((state) => state.builtInTools)
  const isCollapsed = usePlaygroundStore((state) => state.isControlDockCollapsed)
  const highlightedControl = usePlaygroundStore((state) => state.highlightedControl)

  const setModel = usePlaygroundStore((state) => state.setModel)
  const setTemperature = usePlaygroundStore((state) => state.setTemperature)
  const setTopP = usePlaygroundStore((state) => state.setTopP)
  const setMaxCompletionTokens = usePlaygroundStore((state) => state.setMaxCompletionTokens)
  const addStopSequence = usePlaygroundStore((state) => state.addStopSequence)
  const removeStopSequence = usePlaygroundStore((state) => state.removeStopSequence)
  const setStreaming = usePlaygroundStore((state) => state.setStreaming)
  const setJsonMode = usePlaygroundStore((state) => state.setJsonMode)
  const setJsonSchemaStrict = usePlaygroundStore((state) => state.setJsonSchemaStrict)
  const setSchemaModalOpen = usePlaygroundStore((state) => state.setSchemaModalOpen)
  const setBuiltInTools = usePlaygroundStore((state) => state.setBuiltInTools)
  const resetParameters = usePlaygroundStore((state) => state.resetParameters)
  const toggleControlDock = usePlaygroundStore((state) => state.toggleControlDock)

  const [modelMenuOpen, setModelMenuOpen] = useState(false)
  const [stopDraft, setStopDraft] = useState('')
  const modelDropdownRef = useRef<HTMLDivElement>(null)
  const dockBodyRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!highlightedControl || !dockBodyRef.current) return
    const target = dockBodyRef.current.querySelector<HTMLElement>(
      `[data-spotlight-id="${highlightedControl}"]`
    )
    target?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  }, [highlightedControl])

  const selectedModelMeta = getModelById(model)
  const anyBuiltInTool = builtInTools.browserSearch || builtInTools.codeInterpreter

  useEffect(() => {
    if (!modelMenuOpen) return
    const handleOutside = (event: MouseEvent) => {
      if (
        modelDropdownRef.current &&
        !modelDropdownRef.current.contains(event.target as Node)
      ) {
        setModelMenuOpen(false)
      }
    }
    const handleEsc = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setModelMenuOpen(false)
    }
    window.addEventListener('mousedown', handleOutside)
    window.addEventListener('keydown', handleEsc as unknown as EventListener)
    return () => {
      window.removeEventListener('mousedown', handleOutside)
      window.removeEventListener('keydown', handleEsc as unknown as EventListener)
    }
  }, [modelMenuOpen])

  const handleAddStop = () => {
    const trimmed = stopDraft.trim()
    if (!trimmed || stopSequences.length >= 4) return
    addStopSequence(trimmed)
    setStopDraft('')
  }

  const handleStopKeyDown = (event: KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'Enter') {
      event.preventDefault()
      handleAddStop()
    }
  }

  const tempPercent = (temperature / 2) * 100
  const topPPercent = ((topP - 0.05) / 0.95) * 100
  const maxTokensPercent = ((maxCompletionTokens - 16) / (4096 - 16)) * 100

  const temperatureTone =
    temperature <= 0.35
      ? 'Deterministic'
      : temperature <= 1.05
        ? 'Balanced'
        : 'Creative'

  const tierPillClass = (shortTier: string) =>
    shortTier === 'Enterprise'
      ? 'border-[var(--accent-amber)]/35 text-[var(--accent-amber)]'
      : shortTier === 'Preview'
        ? 'border-[var(--accent-sky)]/35 text-[var(--accent-sky)]'
        : 'border-[var(--accent-emerald)]/35 text-[var(--accent-emerald)]'

  return (
    <div className="pointer-events-none fixed left-4 top-[116px] lg:top-[78px] bottom-4 z-20 flex items-start">
      <AnimatePresence mode="wait" initial={false}>
        {isCollapsed ? (
          <motion.button
            key="dock-collapsed"
            type="button"
            onClick={toggleControlDock}
            initial={{ opacity: 0, x: -12, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -12, scale: 0.94 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
            whileTap={{ scale: 0.96 }}
            data-testid="control-dock-expand"
            className="pointer-events-auto spatial-pill flex items-center gap-2 rounded-full px-3.5 py-2 text-[12.5px] font-medium text-[var(--text-primary)] hover:border-[var(--glass-border-strong)]"
          >
            <SlidersHorizontal className="h-3.5 w-3.5 text-[var(--accent-cyan)]" aria-hidden="true" />
            <span>Playground Controls</span>
          </motion.button>
        ) : (
          <motion.aside
            key="dock-expanded"
            aria-label="Playground Controls"
            data-testid="control-dock"
            initial={{ opacity: 0, x: -18, scale: 0.98 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: -18, scale: 0.98 }}
            transition={{ type: 'spring', bounce: 0, duration: 0.32 }}
            className="pointer-events-auto spatial-glass select-none relative flex max-h-full w-[316px] max-w-[calc(100vw-2rem)] flex-col overflow-hidden rounded-[26px]"
          >
            {/* Dock Header */}
            <div className="flex items-center justify-between border-b border-[var(--glass-border)] px-4.5 py-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal
                  className="h-4 w-4 text-[var(--accent-cyan)]"
                  aria-hidden="true"
                />
                <h2 className="text-[13.5px] font-semibold tracking-[-0.015em] text-[var(--text-primary)]">
                  Playground Controls
                </h2>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={resetParameters}
                  title="Reset parameters to defaults"
                  aria-label="Reset playground parameters"
                  data-testid="reset-parameters"
                  className="flex h-7 items-center gap-1 rounded-full px-2 text-[11px] font-medium text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                >
                  <RotateCcw className="h-3 w-3" aria-hidden="true" />
                  <span>Reset</span>
                </button>
                <button
                  type="button"
                  onClick={toggleControlDock}
                  title="Collapse controls"
                  aria-label="Collapse playground controls"
                  data-testid="control-dock-collapse"
                  className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
                >
                  <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                </button>
              </div>
            </div>

            {/* Scrollable Controls Body */}
            <div
              ref={dockBodyRef}
              className="spatial-scroll flex flex-1 flex-col gap-3.5 overflow-y-auto px-4.5 pt-3.5 pb-7"
            >
              {/* Model Selector */}
              <div
                ref={modelDropdownRef}
                data-spotlight-id="model"
                className={[
                  'relative space-y-1.5',
                  getControlHighlightClass(highlightedControl, 'model'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="model-selector-btn"
                      className="text-[12.5px] font-medium text-[var(--text-primary)]"
                    >
                      Model
                    </label>
                    <HelpTooltip
                      label="Model"
                      description="Choose which AI model runs on the Groq LPU. Free/Dev models work out of the box; Enterprise models require an Enterprise GroqCloud plan."
                    />
                    <SpotlightBadge visible={highlightedControl === 'model'} target="model" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="font-mono-metric text-[10.5px] text-[var(--text-muted)]">
                      ~{selectedModelMeta.nominalTps} t/s
                    </span>
                    <span
                      className={[
                        'rounded-full border bg-[var(--glass-bg-pill)] px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
                        tierPillClass(selectedModelMeta.shortTier),
                      ].join(' ')}
                    >
                      {selectedModelMeta.shortTier}
                    </span>
                  </div>
                </div>

                <button
                  id="model-selector-btn"
                  type="button"
                  onClick={() => setModelMenuOpen((prev) => !prev)}
                  aria-haspopup="listbox"
                  aria-expanded={modelMenuOpen}
                  data-testid="model-select"
                  className="flex w-full items-center justify-between gap-2 rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] px-3 py-2 text-left transition-colors hover:border-[var(--glass-border-strong)]"
                >
                  <div className="min-w-0">
                    <span className="block truncate text-[12.5px] font-medium text-[var(--text-primary)]">
                      {selectedModelMeta.label}
                    </span>
                    <span className="font-mono-metric block truncate text-[10.5px] text-[var(--text-muted)]">
                      {selectedModelMeta.id}
                    </span>
                  </div>
                  <ChevronDown
                    className={[
                      'h-4 w-4 shrink-0 text-[var(--text-muted)] transition-transform duration-200',
                      modelMenuOpen ? 'rotate-180' : '',
                    ].join(' ')}
                    aria-hidden="true"
                  />
                </button>

                <AnimatePresence>
                  {modelMenuOpen && (
                    <motion.ul
                      role="listbox"
                      aria-label="Groq Model Catalog"
                      initial={{ opacity: 0, y: -6, scale: 0.98 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.98 }}
                      transition={{ type: 'spring', bounce: 0, duration: 0.22 }}
                      className="spatial-glass-elevated absolute left-0 right-0 top-[calc(100%+6px)] z-40 max-h-64 overflow-y-auto rounded-2xl p-1.5"
                    >
                      {MODEL_CATALOG.map((item) => {
                        const isSelected = item.id === model
                        return (
                          <li key={item.id}>
                            <button
                              type="button"
                              role="option"
                              aria-selected={isSelected}
                              data-testid={`model-option-${item.id}`}
                              onClick={() => {
                                setModel(item.id)
                                setModelMenuOpen(false)
                              }}
                              className={[
                                'flex w-full items-start justify-between gap-2 rounded-xl px-2.5 py-2 text-left transition-colors',
                                isSelected
                                  ? 'bg-[var(--glass-bg-pill-active)] text-[var(--text-primary)]'
                                  : 'text-[var(--text-secondary)] hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]',
                              ].join(' ')}
                            >
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between gap-1.5">
                                  <span className="truncate text-[12px] font-medium">
                                    {item.label}
                                  </span>
                                  <span className="font-mono-metric shrink-0 text-[10px] text-[var(--text-muted)]">
                                    ~{item.nominalTps} t/s
                                  </span>
                                </div>
                                <div className="mt-0.5 flex items-center justify-between gap-1.5">
                                  <span className="font-mono-metric truncate text-[10px] text-[var(--text-muted)]">
                                    {item.id}
                                  </span>
                                  <span
                                    className={[
                                      'shrink-0 rounded-md border px-1.5 py-0.5 text-[9.5px] font-medium',
                                      tierPillClass(item.shortTier),
                                    ].join(' ')}
                                  >
                                    {item.shortTier}
                                  </span>
                                </div>
                              </div>
                              {isSelected && (
                                <Check
                                  className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--accent-cyan)]"
                                  aria-hidden="true"
                                />
                              )}
                            </button>
                          </li>
                        )
                      })}
                    </motion.ul>
                  )}
                </AnimatePresence>
              </div>

              {/* Temperature Slider */}
              <div
                data-spotlight-id="temperature"
                className={[
                  'space-y-1.5',
                  getControlHighlightClass(highlightedControl, 'temperature'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="temperature-slider"
                      className="text-[12.5px] font-medium text-[var(--text-primary)]"
                    >
                      Temperature
                    </label>
                    <HelpTooltip
                      label="Temperature"
                      description="Controls randomness. Near 0 gives predictable, repeatable answers; higher values invite creative, surprising wording."
                    />
                    <SpotlightBadge
                      visible={highlightedControl === 'temperature'}
                      target="temperature"
                    />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="text-[10.5px] text-[var(--text-muted)]">
                      {temperatureTone}
                    </span>
                    <span
                      data-testid="temperature-value"
                      className="font-mono-metric rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-primary)]"
                    >
                      {temperature.toFixed(2)}
                    </span>
                  </div>
                </div>

                <input
                  id="temperature-slider"
                  data-testid="temperature-slider"
                  type="range"
                  min={0}
                  max={2}
                  step={0.05}
                  value={temperature}
                  onChange={(e) => setTemperature(parseFloat(e.target.value))}
                  aria-label="Temperature"
                  className="spatial-slider"
                  style={{
                    background: `linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-amber) ${tempPercent}%, var(--slider-track) ${tempPercent}%)`,
                  }}
                />
                <div className="flex justify-between text-[10.5px] text-[var(--text-muted)]">
                  <span>0.0 Exact</span>
                  <span>1.0</span>
                  <span>2.0 Wild</span>
                </div>
              </div>

              {/* Top-P Slider */}
              <div
                data-spotlight-id="topP"
                className={[
                  'space-y-1.5',
                  getControlHighlightClass(highlightedControl, 'topP'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="top-p-slider"
                      className="text-[12.5px] font-medium text-[var(--text-primary)]"
                    >
                      Top-P
                    </label>
                    <HelpTooltip
                      label="Top-P (Nucleus Sampling)"
                      description="Keeps only the top word choices whose combined probabilities add up to P. Lowering Top-P trims unlikely outliers."
                    />
                    <SpotlightBadge visible={highlightedControl === 'topP'} target="topP" />
                  </div>
                  <span
                    data-testid="top-p-value"
                    className="font-mono-metric rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-primary)]"
                  >
                    {topP.toFixed(2)}
                  </span>
                </div>

                <input
                  id="top-p-slider"
                  data-testid="top-p-slider"
                  type="range"
                  min={0.05}
                  max={1}
                  step={0.05}
                  value={topP}
                  onChange={(e) => setTopP(parseFloat(e.target.value))}
                  aria-label="Top-P"
                  className="spatial-slider"
                  style={{
                    background: `linear-gradient(90deg, var(--accent-sky) 0%, var(--accent-cyan) ${topPPercent}%, var(--slider-track) ${topPPercent}%)`,
                  }}
                />
              </div>

              {/* Max Completion Tokens Slider */}
              <div
                data-spotlight-id="maxCompletionTokens"
                className={[
                  'space-y-1.5',
                  getControlHighlightClass(highlightedControl, 'maxCompletionTokens'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="max-tokens-slider"
                      className="text-[12.5px] font-medium text-[var(--text-primary)]"
                    >
                      Max Completion Tokens
                    </label>
                    <HelpTooltip
                      label="Max Completion Tokens"
                      description="Sets the maximum length of the AI's reply in tokens (roughly ¾ of a word each) before generation stops."
                    />
                    <SpotlightBadge
                      visible={highlightedControl === 'maxCompletionTokens'}
                      target="maxCompletionTokens"
                    />
                  </div>
                  <span
                    data-testid="max-tokens-value"
                    className="font-mono-metric rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2 py-0.5 text-[11.5px] font-medium text-[var(--text-primary)]"
                  >
                    {maxCompletionTokens}
                  </span>
                </div>

                <input
                  id="max-tokens-slider"
                  data-testid="max-tokens-slider"
                  type="range"
                  min={16}
                  max={4096}
                  step={16}
                  value={maxCompletionTokens}
                  onChange={(e) => setMaxCompletionTokens(parseInt(e.target.value, 10))}
                  aria-label="Max Completion Tokens"
                  className="spatial-slider"
                  style={{
                    background: `linear-gradient(90deg, var(--accent-cyan) 0%, var(--accent-emerald) ${maxTokensPercent}%, var(--slider-track) ${maxTokensPercent}%)`,
                  }}
                />
              </div>

              {/* Streaming Toggle */}
              <div
                data-spotlight-id="streaming"
                className={[
                  'flex items-center justify-between rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3.5 py-2',
                  getControlHighlightClass(highlightedControl, 'streaming'),
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5">
                  <div>
                    <span className="block text-[12.5px] font-medium text-[var(--text-primary)]">
                      Streaming
                    </span>
                    <span className="block text-[11px] text-[var(--text-muted)]">
                      {streaming ? 'Continuous token stream' : 'Batched burst delivery'}
                    </span>
                  </div>
                  <HelpTooltip
                    label="Streaming"
                    description="When On, words appear token-by-token as the LPU produces them. When Off, the response arrives all at once after finishing."
                  />
                </div>

                <button
                  type="button"
                  role="switch"
                  aria-checked={streaming}
                  aria-label="Toggle Streaming"
                  data-testid="streaming-toggle"
                  onClick={() => setStreaming(!streaming)}
                  className={[
                    'relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full border p-0.5 transition-colors duration-200',
                    streaming
                      ? 'border-transparent bg-[var(--accent-cyan)]'
                      : 'border-[var(--glass-border-strong)] bg-[var(--slider-track)]',
                  ].join(' ')}
                >
                  <motion.span
                    layout
                    transition={{ type: 'spring', bounce: 0, duration: 0.24 }}
                    className={[
                      'block h-4.5 w-4.5 rounded-full bg-white shadow-sm',
                      streaming ? 'ml-auto' : 'mr-auto',
                    ].join(' ')}
                  />
                </button>
              </div>

              {/* Stop Sequences Tag-Chip Input */}
              <div
                data-spotlight-id="stopSequences"
                className={[
                  'space-y-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-3',
                  getControlHighlightClass(highlightedControl, 'stopSequences'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <label
                      htmlFor="stop-sequence-input"
                      className="text-[12.5px] font-medium text-[var(--text-primary)]"
                    >
                      Stop Sequences
                    </label>
                    <HelpTooltip
                      label="Stop Sequences"
                      description="Add up to 4 words or symbols (like Step 3, ###, or \\n\\n). The LPU stops generating the instant one of them appears."
                    />
                    <SpotlightBadge
                      visible={highlightedControl === 'stopSequences'}
                      target="stopSequences"
                    />
                  </div>
                  <span className="font-mono-metric text-[10.5px] text-[var(--text-muted)]">
                    {stopSequences.length}/4
                  </span>
                </div>

                <div className="flex items-center gap-1.5">
                  <input
                    id="stop-sequence-input"
                    data-testid="stop-sequence-input"
                    type="text"
                    value={stopDraft}
                    onChange={(e) => setStopDraft(e.target.value)}
                    onKeyDown={handleStopKeyDown}
                    disabled={stopSequences.length >= 4}
                    placeholder={
                      stopSequences.length >= 4 ? 'Max 4 sequences reached' : 'e.g. Step 3 or ###'
                    }
                    className="font-mono-metric select-text min-w-0 flex-1 rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1.5 text-[11.5px] text-[var(--text-primary)] placeholder:text-[var(--text-muted)] focus:border-[var(--accent-cyan)] focus:outline-none disabled:opacity-50"
                  />
                  <button
                    type="button"
                    onClick={handleAddStop}
                    disabled={!stopDraft.trim() || stopSequences.length >= 4}
                    aria-label="Add stop sequence"
                    data-testid="add-stop-sequence"
                    className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-primary)] transition-colors hover:border-[var(--glass-border-strong)] disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                  </button>
                </div>

                {stopSequences.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 pt-0.5" data-testid="stop-sequence-chips">
                    {stopSequences.map((seq) => (
                      <span
                        key={seq}
                        className="font-mono-metric inline-flex items-center gap-1 rounded-full border border-[var(--glass-border-strong)] bg-[var(--glass-bg)] px-2.5 py-0.5 text-[11px] text-[var(--text-primary)]"
                      >
                        <span>{formatStopChipLabel(seq)}</span>
                        <button
                          type="button"
                          onClick={() => removeStopSequence(seq)}
                          aria-label={`Remove stop sequence ${formatStopChipLabel(seq)}`}
                          className="-mr-1 flex h-6 w-6 items-center justify-center rounded-full text-[var(--text-muted)] transition-colors hover:text-[var(--text-primary)]"
                        >
                          <X className="h-3 w-3" aria-hidden="true" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Structured Outputs (response_format) */}
              <div
                data-spotlight-id="jsonMode"
                className={[
                  'space-y-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-3',
                  getControlHighlightClass(highlightedControl, 'jsonMode'),
                ].join(' ')}
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Braces className="h-3.5 w-3.5 text-[var(--accent-cyan)]" aria-hidden="true" />
                    <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
                      Structured Outputs
                    </span>
                    <HelpTooltip
                      label="Structured Outputs"
                      description="Forces the LPU to emit guaranteed valid JSON—either free-form JSON Object or strictly typed to your JSON Schema."
                    />
                    <SpotlightBadge visible={highlightedControl === 'jsonMode'} target="jsonMode" />
                  </div>
                </div>

                <div
                  className="grid grid-cols-[0.6fr_1.15fr_1.25fr] gap-1 rounded-xl border border-[var(--glass-border)] bg-[var(--glass-bg)] p-0.5"
                  role="group"
                  aria-label="Structured Output Mode"
                >
                  {(
                    [
                      { id: 'off', label: 'Off' },
                      { id: 'json_object', label: 'JSON Object' },
                      { id: 'json_schema', label: 'JSON Schema' },
                    ] as Array<{ id: JsonMode; label: string }>
                  ).map((opt) => {
                    const active = jsonMode === opt.id
                    return (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setJsonMode(opt.id)}
                        data-testid={`dock-json-mode-${opt.id}`}
                        aria-pressed={active}
                        className={[
                          'rounded-lg px-1.5 py-1 text-[10.5px] font-medium transition-colors whitespace-nowrap',
                          active
                            ? 'bg-[var(--accent-cyan)] text-slate-950'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                        ].join(' ')}
                      >
                        {opt.label}
                      </button>
                    )
                  })}
                </div>

                {jsonMode === 'json_object' && (
                  <p className="text-[10.5px] leading-snug text-[var(--text-muted)]">
                    Tip: Include the word &quot;JSON&quot; in your system or user prompt.
                  </p>
                )}

                {jsonMode === 'json_schema' && (
                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <button
                      type="button"
                      role="switch"
                      aria-checked={jsonSchemaStrict}
                      onClick={() => setJsonSchemaStrict(!jsonSchemaStrict)}
                      data-testid="dock-strict-toggle"
                      className="flex items-center gap-1.5 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg)] px-2.5 py-1 text-[11px] font-medium text-[var(--text-primary)]"
                    >
                      <span>Strict</span>
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full',
                          jsonSchemaStrict
                            ? 'bg-[var(--accent-emerald)]'
                            : 'bg-[var(--text-muted)]',
                        ].join(' ')}
                      />
                    </button>

                    <button
                      type="button"
                      onClick={() => setSchemaModalOpen(true)}
                      data-testid="edit-schema-button"
                      className="rounded-full border border-[var(--accent-cyan)]/40 bg-[var(--glass-bg)] px-3 py-1 text-[11px] font-medium text-[var(--accent-cyan)] transition-colors hover:bg-[var(--glass-bg-pill-hover)]"
                    >
                      Edit Schema
                    </button>
                  </div>
                )}
              </div>

              {/* Built-In Tools (tools) */}
              <div
                data-spotlight-id="builtInTools"
                className={[
                  'space-y-2 rounded-2xl border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-3',
                  getControlHighlightClass(highlightedControl, 'builtInTools'),
                ].join(' ')}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-[12.5px] font-medium text-[var(--text-primary)]">
                    Built-In Tools
                  </span>
                  <HelpTooltip
                    label="Built-In Tools"
                    description="Groq executes Browser Search and Python Code Execution server-side inside a single LPU API call on GPT-OSS models."
                  />
                  <SpotlightBadge
                    visible={highlightedControl === 'builtInTools'}
                    target="builtInTools"
                  />
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      setBuiltInTools({ browserSearch: !builtInTools.browserSearch })
                    }
                    aria-pressed={builtInTools.browserSearch}
                    data-testid="dock-tool-browser-search"
                    className={[
                      'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-medium transition-colors',
                      builtInTools.browserSearch
                        ? 'border-transparent bg-[var(--accent-sky)] text-slate-950'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    <Globe className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Search</span>
                  </button>

                  <button
                    type="button"
                    onClick={() =>
                      setBuiltInTools({ codeInterpreter: !builtInTools.codeInterpreter })
                    }
                    aria-pressed={builtInTools.codeInterpreter}
                    data-testid="dock-tool-code-interpreter"
                    className={[
                      'flex items-center justify-center gap-1.5 rounded-xl border px-2 py-1.5 text-[11px] font-medium transition-colors',
                      builtInTools.codeInterpreter
                        ? 'border-transparent bg-[var(--accent-amber)] text-slate-950'
                        : 'border-[var(--glass-border)] bg-[var(--glass-bg)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                    ].join(' ')}
                  >
                    <Terminal className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
                    <span className="truncate">Code</span>
                  </button>
                </div>

                {jsonMode !== 'off' && (
                  <p className="text-[10.5px] leading-snug text-[var(--text-muted)]">
                    Groq Built-In Tools cannot be combined with Structured Outputs in the same
                    request.
                  </p>
                )}

                {anyBuiltInTool && !selectedModelMeta.supportsBuiltInTools && (
                  <div className="flex items-center justify-between gap-2 rounded-xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber)]/10 px-2.5 py-1.5">
                    <span className="text-[10.5px] text-[var(--text-primary)]">
                      Requires GPT-OSS
                    </span>
                    <button
                      type="button"
                      onClick={() => setModel('openai/gpt-oss-120b')}
                      data-testid="switch-gpt-oss-pill"
                      className="shrink-0 rounded-full bg-[var(--accent-amber)] px-2.5 py-0.5 text-[10px] font-semibold text-slate-950"
                    >
                      Switch to gpt-oss-120b
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Subtle Bottom Scroll Affordance */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-x-0 bottom-0 h-7 rounded-b-[26px] bg-gradient-to-t from-[var(--glass-solid-fallback)]/85 to-transparent"
            />
          </motion.aside>
        )}
      </AnimatePresence>
    </div>
  )
}
