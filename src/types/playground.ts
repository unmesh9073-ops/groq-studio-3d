export type ThemeMode = 'dark' | 'light'

export type AppMode = 'demo' | 'live'

export type WorkspaceId = 'studio' | 'lab' | 'playground' | 'builder'

export type BuilderSubTab = 'schema' | 'tools' | 'code'

export type ConceptId =
  | 'lpu-pipeline'
  | 'temperature'
  | 'top-p'
  | 'tokens-limits'
  | 'prompt-roles'
  | 'structured-json'
  | 'built-in-tools'

export type ModelId =
  | 'openai/gpt-oss-120b'
  | 'openai/gpt-oss-20b'
  | 'llama-3.3-70b-versatile'
  | 'llama-3.1-8b-instant'
  | 'qwen/qwen3.8-27b'

export type ModelTier = 'Free / Dev Ready' | 'Preview · Free / Dev' | 'Enterprise'

export type JsonMode = 'off' | 'json_object' | 'json_schema'

export interface BuiltInToolsConfig {
  browserSearch: boolean
  codeInterpreter: boolean
}

export type HotspotId = string

export type ControlHighlightKey =
  | 'model'
  | 'temperature'
  | 'topP'
  | 'maxCompletionTokens'
  | 'stopSequences'
  | 'streaming'
  | 'systemPrompt'
  | 'assistantPrefill'
  | 'promptInput'
  | 'jsonMode'
  | 'builtInTools'
  | 'codeExport'
  | 'jarvisLauncher'
  | 'modeStatusPill'
  | (string & {})

export interface ModelCatalogItem {
  id: ModelId
  label: string
  provider: string
  tier: ModelTier
  shortTier: string
  nominalTps: number
  supportsBuiltInTools: boolean
  summary: string
  contextWindow: number
}

export interface ConceptMetadata {
  id: ConceptId
  label: string
  shortLabel: string
  tagline: string
  previewSummary: string
  accentHex: string
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  phaseAvailable: boolean
}

export interface HotspotMetadata {
  id: HotspotId
  stepNumber: number
  title: string
  shortLabel: string
  anchorPosition: [number, number, number]
  cameraPosition: [number, number, number]
  cameraTarget: [number, number, number]
  explanation: string
  accent: 'cyan' | 'amber' | 'sky'
}

export interface ExperimentPreset {
  id: string
  label: string
  hint: string
  userPrompt: string
  conceptId?: ConceptId
  model?: ModelId
  systemPrompt?: string
  assistantPrefill?: string
  temperature?: number
  topP?: number
  maxCompletionTokens?: number
  stopSequences?: string[]
  streaming?: boolean
  jsonMode?: JsonMode
  builtInTools?: Partial<BuiltInToolsConfig>
}

export interface JsonSchemaTemplate {
  id: string
  label: string
  name: string
  schemaText: string
}

export interface ExecutedToolSource {
  title: string
  url: string | null
}

export interface ExecutedToolTrace {
  type: 'browser_search' | 'code_interpreter'
  title: string
  input: string
  output: string
  sources?: ExecutedToolSource[]
}

export type ExecutionStatus =
  | 'idle'
  | 'connecting'
  | 'streaming'
  | 'completed'
  | 'aborted'
  | 'error'

export type FinishReason = 'stop' | 'length' | 'stop_sequence' | 'aborted' | null

export type ErrorRecoveryAction =
  | 'open-settings'
  | 'switch-demo'
  | 'switch-default-model'
  | null

/**
 * Phase 2 live execution telemetry contract.
 */
export interface ExecutionTelemetryExtension {
  ttftMs: number | null
  tokensPerSecond: number | null
  promptTokens: number | null
  completionTokens: number | null
  totalTimeMs: number | null
  finishReason: FinishReason
  triggeredStopSequence: string | null
  source: 'demo' | 'live' | null
}

/**
 * Phase 4 Code Exporter target formats.
 */
export type ExportFormatExtension =
  | 'python'
  | 'typescript'
  | 'openai-compat'
  | 'curl'

/**
 * Phase 5 J.A.R.V.I.S. Co-Pilot & Action Mode contracts.
 */
export type JarvisStatus = 'standby' | 'thinking' | 'acting' | 'speaking'

export type JarvisVoiceName =
  | 'daniel'
  | 'troy'
  | 'austin'
  | 'autumn'
  | 'diana'
  | 'hannah'

export interface JarvisActionReceipt {
  id: string
  label: string
  detail: string
  status: 'done' | 'running'
}

export interface PlaygroundActionSnapshot {
  activeWorkspace?: WorkspaceId
  activeBuilderTab?: BuilderSubTab
  activeConcept: ConceptId
  model: ModelId
  temperature: number
  topP: number
  maxCompletionTokens: number
  streaming: boolean
  stopSequences: string[]
  systemPrompt: string
  assistantPrefill: string
  userPrompt: string
  jsonMode: JsonMode
  builtInTools: BuiltInToolsConfig
}

export interface JarvisMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: number
  actions?: JarvisActionReceipt[]
  preActionSnapshot?: PlaygroundActionSnapshot
  snapshotReverted?: boolean
  suggestedFollowUps?: string[]
}

export interface JarvisActionBridgeExtension {
  type: 'highlight_control' | 'switch_concept' | 'set_parameter'
  target: string
  value?: unknown
}

export interface PlaygroundState {
  // Appearance & Auth
  theme: ThemeMode
  apiKey: string
  activeWorkspace: WorkspaceId
  activeBuilderTab: BuilderSubTab
  soundEnabled: boolean

  // Active 3D Educational Lens
  activeConcept: ConceptId
  selectedHotspot: HotspotId | null
  cameraResetTick: number
  completedChallenges: ConceptId[]
  challengeCelebrationTick: number

  // Playground Parameters
  model: ModelId
  systemPrompt: string
  assistantPrefill: string
  temperature: number
  topP: number
  maxCompletionTokens: number
  stopSequences: string[]
  streaming: boolean
  jsonMode: JsonMode
  jsonSchemaName: string
  jsonSchemaStrict: boolean
  jsonSchemaText: string
  builtInTools: BuiltInToolsConfig

  // Execution & Output State
  executionStatus: ExecutionStatus
  userPrompt: string
  responseText: string
  prefillApplied: string
  executedTools: ExecutedToolTrace[]
  reasoningTrace: string | null
  errorMessage: string | null
  errorRecoveryAction: ErrorRecoveryAction
  tokenPulseCount: number
  telemetry: ExecutionTelemetryExtension
  isConsoleExpanded: boolean

  // UI & Modals State
  isControlDockCollapsed: boolean
  isSettingsOpen: boolean
  isSchemaModalOpen: boolean
  isCodeModalOpen: boolean
  isJarvisOpen: boolean
  highlightedControl: ControlHighlightKey | null

  // Phase 5 & 6 J.A.R.V.I.S. & Voice State
  jarvisStatus: JarvisStatus
  jarvisActionModeEnabled: boolean
  jarvisMessages: JarvisMessage[]
  jarvisVoiceAutoSpeak: boolean
  jarvisVoiceName: JarvisVoiceName
  jarvisListening: boolean
  jarvisAudioLevel: number
  voiceStatusHint: string | null

  // Phase 6 Guided 3D Tour State
  hasCompletedTour: boolean
  isTourActive: boolean
  tourStepIndex: number

  // Derived helper
  getMode: () => AppMode

  // Navigation & Theme Actions
  setTheme: (theme: ThemeMode) => void
  toggleTheme: () => void
  setActiveWorkspace: (workspace: WorkspaceId) => void
  setActiveBuilderTab: (tab: BuilderSubTab) => void
  setSoundEnabled: (enabled: boolean) => void
  toggleSound: () => void
  setApiKey: (apiKey: string) => void
  clearApiKey: () => void
  setActiveConcept: (concept: ConceptId) => void
  setSelectedHotspot: (hotspot: HotspotId | null) => void
  triggerCameraReset: () => void
  completeChallenge: (conceptId: ConceptId) => void
  resetChallenges: () => void

  // Parameter Actions
  setModel: (model: ModelId) => void
  setSystemPrompt: (systemPrompt: string) => void
  setAssistantPrefill: (assistantPrefill: string) => void
  setTemperature: (temperature: number) => void
  setTopP: (topP: number) => void
  setMaxCompletionTokens: (maxCompletionTokens: number) => void
  setStopSequences: (stopSequences: string[]) => void
  addStopSequence: (sequence: string) => void
  removeStopSequence: (sequence: string) => void
  setStreaming: (streaming: boolean) => void
  setJsonMode: (jsonMode: JsonMode) => void
  setJsonSchemaName: (name: string) => void
  setJsonSchemaStrict: (strict: boolean) => void
  setJsonSchemaText: (text: string) => void
  setBuiltInTools: (tools: Partial<BuiltInToolsConfig>) => void
  resetParameters: () => void
  applyExperimentPreset: (preset: ExperimentPreset) => void

  // Execution Actions
  setUserPrompt: (prompt: string) => void
  setConsoleExpanded: (expanded: boolean) => void
  toggleConsoleExpanded: () => void
  beginExecution: (prefill: string, source: 'demo' | 'live') => void
  markStreamingStarted: (ttftMs: number) => void
  appendResponseDelta: (
    delta: string,
    partialTelemetry?: Partial<ExecutionTelemetryExtension>
  ) => void
  setExecutedTools: (tools: ExecutedToolTrace[]) => void
  setReasoningTrace: (reasoning: string | null) => void
  replaceResponseText: (text: string) => void
  completeExecution: (
    status: 'completed' | 'aborted',
    finalTelemetry: Partial<ExecutionTelemetryExtension>
  ) => void
  failExecution: (message: string, recoveryAction?: ErrorRecoveryAction) => void
  clearExecutionOutput: () => void

  // UI & Modal Actions
  setControlDockCollapsed: (collapsed: boolean) => void
  toggleControlDock: () => void
  setSettingsOpen: (open: boolean) => void
  setSchemaModalOpen: (open: boolean) => void
  setCodeModalOpen: (open: boolean) => void
  toggleCodeModalOpen: () => void
  setJarvisOpen: (open: boolean) => void
  toggleJarvisOpen: () => void
  setHighlightedControl: (control: ControlHighlightKey | null) => void
  spotlightControl: (controlId: ControlHighlightKey, durationMs?: number) => void
  setJarvisStatus: (status: JarvisStatus) => void
  setJarvisActionModeEnabled: (enabled: boolean) => void
  addJarvisMessage: (message: JarvisMessage) => void
  revertJarvisAction: (messageId: string) => void
  clearJarvisMessages: () => void
  setJarvisVoiceAutoSpeak: (enabled: boolean) => void
  setJarvisVoiceName: (voice: JarvisVoiceName) => void
  setJarvisListening: (listening: boolean) => void
  setJarvisAudioLevel: (level: number) => void
  setVoiceStatusHint: (hint: string | null) => void
  startTour: () => void
  nextTourStep: () => void
  prevTourStep: () => void
  completeTour: () => void
}
