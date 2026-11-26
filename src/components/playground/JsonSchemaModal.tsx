import { useCallback, useMemo, useRef } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { AlertTriangle, Braces, CheckCircle2, X } from 'lucide-react'
import { JSON_SCHEMA_TEMPLATES } from '@/data/concepts'
import { useModalFocusTrap } from '@/hooks/useModalFocusTrap'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { validateJsonSchema } from '@/utils/jsonSchema'

function JsonSchemaDialog() {
  const setSchemaModalOpen = usePlaygroundStore((state) => state.setSchemaModalOpen)
  const jsonSchemaName = usePlaygroundStore((state) => state.jsonSchemaName)
  const jsonSchemaStrict = usePlaygroundStore((state) => state.jsonSchemaStrict)
  const jsonSchemaText = usePlaygroundStore((state) => state.jsonSchemaText)

  const setJsonSchemaName = usePlaygroundStore((state) => state.setJsonSchemaName)
  const setJsonSchemaStrict = usePlaygroundStore((state) => state.setJsonSchemaStrict)
  const setJsonSchemaText = usePlaygroundStore((state) => state.setJsonSchemaText)
  const dialogRef = useRef<HTMLDivElement>(null)

  const handleClose = useCallback(() => setSchemaModalOpen(false), [setSchemaModalOpen])
  useModalFocusTrap(dialogRef, handleClose)

  const validation = useMemo(
    () => validateJsonSchema(jsonSchemaText, jsonSchemaStrict),
    [jsonSchemaText, jsonSchemaStrict]
  )

  return (
    <motion.div
      role="dialog"
      aria-modal="true"
      aria-labelledby="schema-modal-title"
      data-testid="json-schema-modal"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
    >
      <div
        onClick={() => setSchemaModalOpen(false)}
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
        className="spatial-glass-elevated relative z-10 flex max-h-[88vh] w-full max-w-[640px] flex-col overflow-hidden rounded-[28px] p-6"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-[var(--glass-border-strong)] bg-[var(--glass-bg-pill)] text-[var(--accent-cyan)]">
              <Braces className="h-4.5 w-4.5" aria-hidden="true" />
            </div>
            <div>
              <h2
                id="schema-modal-title"
                className="text-[17px] font-semibold tracking-[-0.02em] text-[var(--text-primary)]"
              >
                JSON Schema Editor
              </h2>
              <p className="mt-0.5 text-[12px] text-[var(--text-secondary)]">
                Define the exact fields and types Groq must return. The 3D cage updates live.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setSchemaModalOpen(false)}
            aria-label="Close JSON Schema Editor"
            data-testid="schema-modal-close"
            className="flex h-8 w-8 items-center justify-center rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] text-[var(--text-secondary)] transition-colors hover:bg-[var(--glass-bg-pill-hover)] hover:text-[var(--text-primary)]"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>

        {/* Beginner Templates + Strict Toggle */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            {JSON_SCHEMA_TEMPLATES.map((tpl) => (
              <button
                key={tpl.id}
                type="button"
                onClick={() => {
                  setJsonSchemaName(tpl.name)
                  setJsonSchemaText(tpl.schemaText)
                }}
                data-testid={`schema-template-${tpl.id}`}
                className="rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-1 text-[11.5px] font-medium text-[var(--text-secondary)] transition-colors hover:border-[var(--glass-border-strong)] hover:text-[var(--text-primary)]"
              >
                {tpl.label}
              </button>
            ))}
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={jsonSchemaStrict}
            onClick={() => setJsonSchemaStrict(!jsonSchemaStrict)}
            data-testid="schema-modal-strict-toggle"
            className="flex items-center gap-2 rounded-full border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-3 py-1 text-[11.5px] font-medium text-[var(--text-primary)]"
          >
            <span>Strict Mode</span>
            <span
              className={[
                'h-2 w-2 rounded-full',
                jsonSchemaStrict ? 'bg-[var(--accent-emerald)]' : 'bg-[var(--text-muted)]',
              ].join(' ')}
            />
          </button>
        </div>

        {/* Schema Name + Validation Status */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <label
              htmlFor="schema-name-input"
              className="text-[12px] font-medium text-[var(--text-secondary)]"
            >
              Schema Name
            </label>
            <input
              id="schema-name-input"
              data-testid="schema-name-input"
              type="text"
              value={jsonSchemaName}
              onChange={(e) => setJsonSchemaName(e.target.value)}
              className="font-mono-metric rounded-xl border border-[var(--input-border)] bg-[var(--input-bg)] px-2.5 py-1 text-[12px] text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
            />
          </div>

          <div
            data-testid="schema-validation-badge"
            className={[
              'flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11.5px] font-medium',
              validation.valid
                ? 'border-[var(--accent-emerald)]/40 bg-[var(--accent-emerald)]/12 text-[var(--accent-emerald)]'
                : 'border-[var(--accent-amber)]/45 bg-[var(--accent-amber)]/12 text-[var(--accent-amber)]',
            ].join(' ')}
          >
            {validation.valid ? (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                <span>{jsonSchemaStrict ? 'Valid Strict Schema' : 'Valid JSON Schema'}</span>
              </>
            ) : (
              <>
                <AlertTriangle className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Schema Needs Fix</span>
              </>
            )}
          </div>
        </div>

        {/* Validation Error Hint */}
        {!validation.valid && validation.error && (
          <p
            data-testid="schema-validation-error"
            className="mt-2.5 rounded-xl border border-[var(--accent-amber)]/35 bg-[var(--accent-amber)]/10 px-3 py-2 text-[12px] text-[var(--text-primary)]"
          >
            {validation.error}
          </p>
        )}

        {/* Monospace Schema Editor */}
        <textarea
          value={jsonSchemaText}
          onChange={(e) => setJsonSchemaText(e.target.value)}
          data-testid="schema-text-editor"
          spellCheck={false}
          aria-label="JSON Schema definition"
          className="font-mono-metric spatial-scroll mt-3 min-h-[240px] flex-1 resize-none rounded-2xl border border-[var(--input-border)] bg-[var(--input-bg)] p-3.5 text-[12px] leading-relaxed text-[var(--text-primary)] focus:border-[var(--accent-cyan)] focus:outline-none"
        />

        {/* Synced 3D Slot Preview */}
        <div className="mt-3.5 flex flex-wrap items-center justify-between gap-2">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-[11px] text-[var(--text-muted)]">3D Lattice Slots:</span>
            {validation.slots.map((slot) => (
              <span
                key={slot.key}
                className="font-mono-metric rounded-lg border border-[var(--glass-border)] bg-[var(--glass-bg-pill)] px-2 py-0.5 text-[10.5px] text-[var(--accent-cyan)]"
              >
                &quot;{slot.key}&quot;: {slot.type}
              </span>
            ))}
          </div>

          <button
            type="button"
            onClick={() => setSchemaModalOpen(false)}
            data-testid="schema-modal-done"
            className="rounded-full bg-[var(--accent-cyan)] px-4 py-1.5 text-[12px] font-semibold text-slate-950 hover:opacity-90"
          >
            Done
          </button>
        </div>
      </motion.div>
    </motion.div>
  )
}

export function JsonSchemaModal() {
  const isSchemaModalOpen = usePlaygroundStore((state) => state.isSchemaModalOpen)

  return (
    <AnimatePresence>
      {isSchemaModalOpen && <JsonSchemaDialog key="json-schema-dialog" />}
    </AnimatePresence>
  )
}
