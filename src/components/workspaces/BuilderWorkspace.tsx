import { useMemo, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowRight,
  Braces,
  Check,
  Code2,
  Copy,
  Globe,
  Terminal,
  Wrench,
} from 'lucide-react'
import {
  EXPERIMENT_PRESETS,
  JSON_SCHEMA_TEMPLATES,
  getModelById,
} from '@/data/concepts'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import { SpatialGlassCard } from '@/components/spatial/SpatialGlassCard'
import { generateExportCode } from '@/services/codeGenerator'
import { runPlaygroundCompletion } from '@/services/playgroundRunner'
import { playChimeSuccess, playGlassTap } from '@/services/soundEngine'
import { validateJsonSchema } from '@/utils/jsonSchema'
import type { BuilderSubTab, ExportFormatExtension, JsonMode } from '@/types/playground'

const SUB_TABS: { id: BuilderSubTab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'schema', label: 'JSON Schema', icon: Braces },
  { id: 'tools', label: 'Built-In Tools', icon: Wrench },
  { id: 'code', label: 'Export Code', icon: Code2 },
]

const SDK_TABS: { id: ExportFormatExtension; label: string }[] = [
  { id: 'python', label: 'Python groq' },
  { id: 'typescript', label: 'TypeScript groq-sdk' },
  { id: 'openai-compat', label: 'OpenAI Compat' },
  { id: 'curl', label: 'cURL' },
]

export function BuilderWorkspace() {
  const activeTab = usePlaygroundStore((s) => s.activeBuilderTab)
  const setActiveTab = usePlaygroundStore((s) => s.setActiveBuilderTab)
  const [sdkFormat, setSdkFormat] = useState<ExportFormatExtension>('python')
  const [explainCode, setExplainCode] = useState(true)
  const [copied, setCopied] = useState(false)

  const model = usePlaygroundStore((s) => s.model)
  const setModel = usePlaygroundStore((s) => s.setModel)
  const systemPrompt = usePlaygroundStore((s) => s.systemPrompt)
  const userPrompt = usePlaygroundStore((s) => s.userPrompt)
  const assistantPrefill = usePlaygroundStore((s) => s.assistantPrefill)
  const temperature = usePlaygroundStore((s) => s.temperature)
  const topP = usePlaygroundStore((s) => s.topP)
  const maxCompletionTokens = usePlaygroundStore((s) => s.maxCompletionTokens)
  const stopSequences = usePlaygroundStore((s) => s.stopSequences)
  const streaming = usePlaygroundStore((s) => s.streaming)
  const jsonMode = usePlaygroundStore((s) => s.jsonMode)
  const setJsonMode = usePlaygroundStore((s) => s.setJsonMode)
  const jsonSchemaName = usePlaygroundStore((s) => s.jsonSchemaName)
  const setJsonSchemaName = usePlaygroundStore((s) => s.setJsonSchemaName)
  const jsonSchemaStrict = usePlaygroundStore((s) => s.jsonSchemaStrict)
  const setJsonSchemaStrict = usePlaygroundStore((s) => s.setJsonSchemaStrict)
  const jsonSchemaText = usePlaygroundStore((s) => s.jsonSchemaText)
  const setJsonSchemaText = usePlaygroundStore((s) => s.setJsonSchemaText)
  const builtInTools = usePlaygroundStore((s) => s.builtInTools)
  const setBuiltInTools = usePlaygroundStore((s) => s.setBuiltInTools)
  const applyExperimentPreset = usePlaygroundStore((s) => s.applyExperimentPreset)
  const setActiveWorkspace = usePlaygroundStore((s) => s.setActiveWorkspace)

  const schemaValidation = useMemo(
    () => validateJsonSchema(jsonSchemaText, jsonSchemaStrict),
    [jsonSchemaText, jsonSchemaStrict]
  )

  const activeModelMeta = getModelById(model)
  const supportsTools = activeModelMeta.supportsBuiltInTools

  const exportedCode = useMemo(
    () =>
      generateExportCode(
        {
          apiKey: '',
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
        sdkFormat,
        explainCode
      ),
    [
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
      sdkFormat,
      explainCode,
    ]
  )

  const handleCopyCode = async () => {
    try {
      await navigator.clipboard.writeText(exportedCode)
      playChimeSuccess()
      setCopied(true)
      setTimeout(() => setCopied(false), 1800)
    } catch {
      // Ignore clipboard errors in restricted environments
    }
  }

  const handleTestSchemaInPlayground = () => {
    playGlassTap()
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === 'strict-json')
    if (preset) {
      applyExperimentPreset(preset)
    } else {
      setJsonMode('json_schema')
    }
    setActiveWorkspace('playground')
  }

  const handleRunToolAgentDemo = () => {
    playGlassTap()
    const preset = EXPERIMENT_PRESETS.find((p) => p.id === 'tool-agent')
    if (preset) {
      applyExperimentPreset(preset)
    }
    setActiveWorkspace('playground')
    void runPlaygroundCompletion()
  }

  return (
    <section
      aria-label="Groq Builder Workspace"
      className="pointer-events-none fixed inset-x-0 bottom-24 top-16 z-20 flex flex-col items-center px-4 sm:px-8"
    >
      {/* Top Sub-Tab Pill Bar */}
      <div
        className="pointer-events-auto mb-4 flex items-center gap-1 rounded-full border border-[var(--glass-border)] bg-[var(--glass-surface)] p-1 shadow-[0_12px_32px_-8px_rgba(0,0,0,0.35)]"
        style={{
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      >
        {SUB_TABS.map((tab) => {
          const Icon = tab.icon
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                if (activeTab !== tab.id) {
                  playGlassTap()
                  setActiveTab(tab.id)
                }
              }}
              className={`relative flex items-center gap-2 rounded-full px-4 py-1.5 text-[12.5px] font-medium transition-colors ${
                isActive
                  ? 'text-[var(--text-primary)]'
                  : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
              }`}
            >
              {isActive && (
                <motion.span
                  layoutId="builder-subtab-pill"
                  transition={{ type: 'spring', stiffness: 420, damping: 32 }}
                  className="absolute inset-0 rounded-full border border-white/20 bg-white/15 dark:bg-white/12"
                />
              )}
              <Icon className="relative z-10 h-3.5 w-3.5" />
              <span className="relative z-10">{tab.label}</span>
            </button>
          )
        })}
      </div>

      {/* Main Centered Builder Content */}
      <div className="pointer-events-auto min-h-0 w-full max-w-5xl flex-1 overflow-y-auto">
        {activeTab === 'schema' && (
          <div className="grid gap-4 lg:grid-cols-12">
            <SpatialGlassCard interactive={false} className="p-5 lg:col-span-5">
              <h2 className="text-[15px] font-semibold text-[var(--text-primary)]">
                Structured Outputs Architect
              </h2>
              <p className="mt-1 text-[12px] text-[var(--text-secondary)]">
                Enforce deterministic JSON payloads directly on the Groq LPU.
              </p>

              <div className="mt-4 space-y-4">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    JSON Mode
                  </span>
                  <div className="mt-1.5 flex rounded-full border border-[var(--glass-border)] p-0.5">
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
                        className={`flex-1 rounded-full py-1.5 text-[11.5px] font-medium transition-colors ${
                          jsonMode === opt.id
                            ? 'bg-[var(--accent-cyan)] text-slate-950'
                            : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span className="text-[12px] text-[var(--text-secondary)]">
                    Strict Mode
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setJsonSchemaStrict(!jsonSchemaStrict)
                    }}
                    className={`rounded-full px-3 py-1 text-[11.5px] font-semibold transition-colors ${
                      jsonSchemaStrict
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : 'border border-[var(--glass-border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {jsonSchemaStrict ? 'Strict: On' : 'Strict: Off'}
                  </button>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-secondary)]">
                    Beginner Templates
                  </span>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    {JSON_SCHEMA_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => {
                          playGlassTap()
                          setJsonSchemaName(tpl.name)
                          setJsonSchemaText(tpl.schemaText)
                        }}
                        className="spatial-pill rounded-full px-3 py-1 text-[11.5px] font-medium text-[var(--text-primary)] hover:border-[var(--accent-cyan)]/50"
                      >
                        {tpl.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex items-center justify-between rounded-xl border border-[var(--glass-border)] bg-black/20 px-3 py-2">
                  <span className="text-[11.5px] text-[var(--text-secondary)]">
                    Validation
                  </span>
                  <span
                    className={`text-[11.5px] font-semibold ${
                      schemaValidation.valid ? 'text-emerald-400' : 'text-rose-400'
                    }`}
                  >
                    {schemaValidation.valid
                      ? 'Valid JSON Schema'
                      : schemaValidation.error ?? 'Invalid Schema'}
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleTestSchemaInPlayground}
                  className="flex w-full items-center justify-center gap-2 rounded-full bg-[var(--accent-cyan)] px-4 py-2 text-[12.5px] font-semibold text-slate-950 shadow-[0_0_20px_rgba(34,211,238,0.28)] transition-transform hover:scale-[1.02]"
                >
                  <span>Test Schema in Playground</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </div>
            </SpatialGlassCard>

            <SpatialGlassCard interactive={false} className="p-5 lg:col-span-7">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                  Schema Editor ({jsonSchemaName})
                </span>
                <span className="font-mono-metric text-[11px] text-[var(--text-muted)]">
                  application/json
                </span>
              </div>
              <textarea
                rows={14}
                value={jsonSchemaText}
                onChange={(e) => setJsonSchemaText(e.target.value)}
                spellCheck={false}
                className="font-mono-metric w-full rounded-xl border border-[var(--glass-border)] bg-black/30 p-3.5 text-[12px] leading-relaxed text-[var(--text-primary)] outline-none focus:border-[var(--accent-cyan)]/60"
              />
            </SpatialGlassCard>
          </div>
        )}

        {activeTab === 'tools' && (
          <div className="space-y-4">
            {!supportsTools && (
              <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-400/40 bg-amber-400/10 px-4 py-3 text-[12.5px] text-amber-200">
                <span>
                  Built-in server-side tools require a <strong>gpt-oss</strong> model.
                </span>
                <button
                  type="button"
                  onClick={() => {
                    playGlassTap()
                    setModel('openai/gpt-oss-120b')
                  }}
                  className="rounded-full bg-amber-400 px-3.5 py-1 text-[12px] font-semibold text-slate-950"
                >
                  Switch to gpt-oss-120b
                </button>
              </div>
            )}

            {jsonMode !== 'off' && (
              <div className="rounded-2xl border border-[var(--glass-border)] bg-white/5 px-4 py-2.5 text-[12px] text-[var(--text-secondary)]">
                Note: Built-in tools and JSON Output Mode are mutually exclusive on Groq.
              </div>
            )}

            <div className="grid gap-4 md:grid-cols-2">
              <SpatialGlassCard
                accentHex="#22D3EE"
                interactive={false}
                className="p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-cyan)]/15 text-[var(--accent-cyan)]">
                      <Globe className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                        Browser Search
                      </h3>
                      <span className="font-mono-metric text-[11px] text-[var(--text-muted)]">
                        browser_search
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setBuiltInTools({ browserSearch: !builtInTools.browserSearch })
                    }}
                    className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition-colors ${
                      builtInTools.browserSearch
                        ? 'bg-[var(--accent-cyan)] text-slate-950'
                        : 'border border-[var(--glass-border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {builtInTools.browserSearch ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                  Lets the model search the live web and cite verified sources inside a
                  single server-side LPU call—no client-side round-trip needed.
                </p>
              </SpatialGlassCard>

              <SpatialGlassCard
                accentHex="#F59E0B"
                interactive={false}
                className="p-5"
              >
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[var(--accent-amber)]/15 text-[var(--accent-amber)]">
                      <Terminal className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-[14px] font-semibold text-[var(--text-primary)]">
                        Code Execution Sandbox
                      </h3>
                      <span className="font-mono-metric text-[11px] text-[var(--text-muted)]">
                        code_interpreter
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setBuiltInTools({ codeInterpreter: !builtInTools.codeInterpreter })
                    }}
                    className={`rounded-full px-3.5 py-1 text-[12px] font-semibold transition-colors ${
                      builtInTools.codeInterpreter
                        ? 'bg-[var(--accent-amber)] text-slate-950'
                        : 'border border-[var(--glass-border)] text-[var(--text-secondary)]'
                    }`}
                  >
                    {builtInTools.codeInterpreter ? 'Enabled' : 'Disabled'}
                  </button>
                </div>
                <p className="mt-3 text-[12.5px] leading-relaxed text-[var(--text-secondary)]">
                  Executes Python calculations and data analysis in an isolated sandbox
                  during inference, returning exact computed results.
                </p>
              </SpatialGlassCard>
            </div>

            <div className="flex justify-end">
              <button
                type="button"
                onClick={handleRunToolAgentDemo}
                className="flex items-center gap-2 rounded-full bg-[var(--accent-cyan)] px-5 py-2.5 text-[13px] font-semibold text-slate-950 shadow-[0_0_24px_rgba(34,211,238,0.3)] transition-transform hover:scale-[1.02]"
              >
                <span>Run Tool Agent Demo</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {activeTab === 'code' && (
          <SpatialGlassCard interactive={false} className="p-5">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div className="flex flex-wrap items-center gap-1.5">
                {SDK_TABS.map((sdk) => (
                  <button
                    key={sdk.id}
                    type="button"
                    onClick={() => {
                      playGlassTap()
                      setSdkFormat(sdk.id)
                    }}
                    className={`rounded-full px-3 py-1 text-[12px] font-medium transition-colors ${
                      sdkFormat === sdk.id
                        ? 'bg-[var(--accent-cyan)] text-slate-950'
                        : 'border border-[var(--glass-border)] text-[var(--text-secondary)] hover:text-[var(--text-primary)]'
                    }`}
                  >
                    {sdk.label}
                  </button>
                ))}
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    playGlassTap()
                    setExplainCode((v) => !v)
                  }}
                  className={`rounded-full border px-3 py-1 text-[11.5px] font-medium transition-colors ${
                    explainCode
                      ? 'border-[var(--accent-cyan)]/60 bg-[var(--accent-cyan)]/15 text-[var(--text-primary)]'
                      : 'border-[var(--glass-border)] text-[var(--text-secondary)]'
                  }`}
                >
                  Explain This Code
                </button>

                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="flex items-center gap-1.5 rounded-full bg-white/15 px-3.5 py-1 text-[12px] font-semibold text-[var(--text-primary)] transition-colors hover:bg-white/20"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5 text-emerald-400" />
                      <span>Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-3.5 w-3.5" />
                      <span>Copy Code</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            <pre className="font-mono-metric max-h-[340px] overflow-auto rounded-xl border border-[var(--glass-border)] bg-black/35 p-4 text-[12px] leading-relaxed text-[var(--text-primary)]">
              {exportedCode}
            </pre>

            <p className="mt-2.5 text-[11.5px] text-[var(--text-muted)]">
              Note: <code className="font-mono-metric">GROQ_API_KEY</code> is read safely
              from environment variables—never hardcoded.
            </p>
          </SpatialGlassCard>
        )}
      </div>
    </section>
  )
}
