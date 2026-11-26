import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Check, Code2, Copy, Sparkles, X } from 'lucide-react'
import { isTextInputFocused, useModalFocusTrap } from '@/hooks/useModalFocusTrap'
import { generateExportCode } from '@/services/codeGenerator'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { ExportFormatExtension } from '@/types/playground'

const EXPORT_TABS: Array<{ id: ExportFormatExtension; label: string }> = [
  { id: 'python', label: 'Python (groq)' },
  { id: 'typescript', label: 'TypeScript (groq-sdk)' },
  { id: 'openai-compat', label: 'OpenAI SDK (Compat)' },
  { id: 'curl', label: 'cURL' },
]

function highlightLine(line: string, idx: number): ReactNode {
  const trimmed = line.trimStart()
  if (trimmed.startsWith('#') || trimmed.startsWith('//')) {
    return (
      <div key={idx} className="text-[var(--text-muted)] italic">
        {line || ' '}
      </div>
    )
  }

  // Lightweight token highlighting for strings, keywords, and numbers
  const parts = line.split(/("[^"]*"|'[^']*'|\b(?:import|from|const|async|function|await|for|in|of|return|True|False|None|true|false|null|export)\b|\b\d+(?:\.\d+)?\b)/g)

  return (
    <div key={idx}>
      {parts.map((part, pIdx) => {
        if (!part) return null
        if (part.startsWith('"') || part.startsWith("'")) {
          return (
            <span key={pIdx} className="text-[var(--accent-emerald)]">
              {part}
            </span>
          )
        }
        if (
          /^(import|from|const|async|function|await|for|in|of|return|True|False|None|true|false|null|export)$/.test(
            part
          )
        ) {
          return (
            <span key={pIdx} className="font-semibold text-[var(--accent-cyan)]">
              {part}
            </span>
          )
        }
        if (/^\d+(?:\.\d+)?$/.test(part)) {
          return (
            <span key={pIdx} className="text-[var(--accent-amber)]">
              {part}
            </span>
          )
        }
        return <span key={pIdx}>{part}</span>
      })}
    </div>
  )
}

function CodeExportDialog() {
  const setCodeModalOpen = usePlaygroundStore((state) => state.setCodeModalOpen)
  const apiKey = usePlaygroundStore((state) => state.apiKey)
  const model = usePlaygroundStore((state) => state.model)
  const systemPrompt = usePlaygroundStore((state) => state.systemPrompt)
  const userPrompt = usePlaygroundStore((state) => state.userPrompt)
  const assistantPrefill = usePlaygroundStore((state) => state.assistantPrefill)
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

  const [activeTab, setActiveTab] = useState<ExportFormatExtension>('python')
  const [explainCode, setExplainCode] = useState(true)
  const [copied, setCopied] = useState(false)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => setCodeModalOpen(false), [setCodeModalOpen])
  useModalFocusTrap(dialogRef, handleClose)

  const code = useMemo(
    () =>
      generateExportCode(
        {
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
        },
        activeTab,
        explainCode
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
      activeTab,
      explainCode,
    ]
  )

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="code-export-title"
      data-testid="code-export-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={() => setCodeModalOpen(false)}
        className="absolute inset-0 backdrop-blur-sm"
        style={{ backgroundColor: 'var(--glass-scrim)' }}
        aria-hidden="true"
      />

      <motion.div
        ref={dialogRef}
        tabIndex={-1}
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ type: 'spring', bounce: 0, duration: 0.28 }}
        className="spatial-glass-elevated relative z-10 flex max-h-[88vh] w-full max-w-[740px] flex-col overflow-hidden rounded-[28px] p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)] text-[var(--accent-cyan)]">
              <Code2 className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="code-export-title"
                className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
              >
                Export Playground Code
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                Live-generated snippet matching every parameter, schema, and tool you configured.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setCodeModalOpen(false)}
            aria-label="Close View Code Modal"
            data-testid="code-modal-close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Tabs & Controls */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2.5">
          <div
            className="flex flex-wrap items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] p-1"
            role="tablist"
            aria-label="SDK Language"
          >
            {EXPORT_TABS.map((tab) => {
              const active = activeTab === tab.id
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setActiveTab(tab.id)}
                  data-testid={`export-tab-${tab.id}`}
                  className={[
                    'rounded-full px-3 py-1 text-[11.5px] font-medium transition-colors whitespace-nowrap',
                    active
                      ? 'bg-[var(--accent-cyan)] text-slate-950'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]',
                  ].join(' ')}
                >
                  {tab.label}
                </button>
              )
            })}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              role="switch"
              aria-checked={explainCode}
              onClick={() => setExplainCode((prev) => !prev)}
              data-testid="explain-code-toggle"
              className={[
                'flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-[11.5px] font-medium transition-colors',
                explainCode
                  ? 'border-[var(--accent-amber)]/45 bg-[var(--accent-amber)]/12 text-[var(--accent-amber)]'
                  : 'border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)]',
              ].join(' ')}
            >
              <Sparkles className="h-3.5 w-3.5" aria-hidden="true" />
              <span>Explain This Code</span>
            </button>

            <motion.button
              type="button"
              onClick={() => void handleCopy()}
              whileTap={{ scale: 0.95 }}
              data-testid="copy-code-button"
              className="flex items-center gap-1.5 rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[12px] font-semibold text-slate-950 shadow-sm hover:opacity-90"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copied</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" aria-hidden="true" />
                  <span>Copy Code</span>
                </>
              )}
            </motion.button>
          </div>
        </div>

        {/* Highlighted Code Block */}
        <pre
          data-testid="exported-code-block"
          className="font-mono-metric spatial-scroll select-text mt-4 max-h-[420px] flex-1 overflow-auto rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] p-4 text-[12px] leading-relaxed text-[var(--text-primary)]"
        >
          <code>{code.split('\n').map((line, idx) => highlightLine(line, idx))}</code>
        </pre>
      </motion.div>
    </motion.div>
  )
}

export function CodeExportModal() {
  const isCodeModalOpen = usePlaygroundStore((state) => state.isCodeModalOpen)

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'e') {
        if (event.ctrlKey && !event.metaKey && isTextInputFocused()) return
        event.preventDefault()
        usePlaygroundStore.getState().toggleCodeModalOpen()
      }
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  return (
    <AnimatePresence>
      {isCodeModalOpen && <CodeExportDialog key="code-export-dialog" />}
    </AnimatePresence>
  )
}
