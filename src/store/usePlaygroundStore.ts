import { create } from 'zustand'
import type {
  AppMode,
  BuiltInToolsConfig,
  BuilderSubTab,
  ConceptId,
  ControlHighlightKey,
  ErrorRecoveryAction,
  ExecutedToolTrace,
  ExecutionTelemetryExtension,
  ExperimentPreset,
  HotspotId,
  JarvisMessage,
  JarvisStatus,
  JarvisVoiceName,
  JsonMode,
  ModelId,
  PlaygroundState,
  ThemeMode,
  WorkspaceId,
} from '@/types/playground'
import { DEFAULT_JSON_SCHEMA_TEXT } from '@/utils/jsonSchema'

const STORAGE_KEYS = {
  theme: 'groq-studio-3d-theme',
  apiKey: 'groq-studio-3d-api-key',
  voiceAutoSpeak: 'groq-studio-3d-voice-auto-speak',
  voiceName: 'groq-studio-3d-voice-name',
  tourCompleted: 'groq_studio_tour_completed',
  soundEnabled: 'groq-studio-3d-sound-enabled',
  completedChallenges: 'groq_studio_v2_challenges',
} as const

function safeReadStorage(key: string): string | null {
  if (typeof window === 'undefined') return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function safeWriteStorage(key: string, value: string): void {
  if (typeof window === 'undefined') return
  try {
    if (value === '') {
      window.localStorage.removeItem(key)
    } else {
      window.localStorage.setItem(key, value)
    }
  } catch {
    // Ignore storage quota or private-browsing write failures cleanly
  }
}

function getInitialTheme(): ThemeMode {
  const stored = safeReadStorage(STORAGE_KEYS.theme)
  return stored === 'light' || stored === 'dark' ? stored : 'dark'
}

function getInitialApiKey(): string {
  return safeReadStorage(STORAGE_KEYS.apiKey) ?? ''
}

function getInitialVoiceAutoSpeak(): boolean {
  const stored = safeReadStorage(STORAGE_KEYS.voiceAutoSpeak)
  return stored === null ? true : stored === 'true'
}

const VALID_VOICES: JarvisVoiceName[] = [
  'daniel',
  'troy',
  'austin',
  'autumn',
  'diana',
  'hannah',
]

function getInitialVoiceName(): JarvisVoiceName {
  const stored = safeReadStorage(STORAGE_KEYS.voiceName) as JarvisVoiceName | null
  return stored && VALID_VOICES.includes(stored) ? stored : 'daniel'
}

function getInitialTourCompleted(): boolean {
  return safeReadStorage(STORAGE_KEYS.tourCompleted) === 'true'
}

function getInitialSoundEnabled(): boolean {
  const stored = safeReadStorage(STORAGE_KEYS.soundEnabled)
  return stored === null ? true : stored === 'true'
}

const VALID_CONCEPT_IDS: ConceptId[] = [
  'lpu-pipeline',
  'temperature',
  'top-p',
  'tokens-limits',
  'prompt-roles',
  'structured-json',
  'built-in-tools',
]

function getInitialCompletedChallenges(): ConceptId[] {
  const raw = safeReadStorage(STORAGE_KEYS.completedChallenges)
  if (!raw) return []
  try {
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((id): id is ConceptId => VALID_CONCEPT_IDS.includes(id as ConceptId))
  } catch {
    return []
  }
}

function syncDocumentTheme(theme: ThemeMode): void {
  if (typeof document === 'undefined') return
  document.documentElement.setAttribute('data-theme', theme)
  document.documentElement.classList.toggle('dark', theme === 'dark')
  const metaTheme = document.querySelector('meta[name="theme-color"]')
  if (metaTheme) {
    metaTheme.setAttribute('content', theme === 'dark' ? '#05070D' : '#F5F6FA')
  }
}

export function deriveAppMode(apiKey: string): AppMode {
  return apiKey.trim().length > 0 ? 'live' : 'demo'
}

export const selectAppMode = (state: Pick<PlaygroundState, 'apiKey'>): AppMode =>
  deriveAppMode(state.apiKey)

const DEFAULT_PARAMETERS = {
  model: 'openai/gpt-oss-120b' as ModelId,
  systemPrompt: 'You are a helpful, concise AI assistant.',
  assistantPrefill: '',
  temperature: 0.7,
  topP: 1.0,
  maxCompletionTokens: 512,
  stopSequences: [] as string[],
  streaming: true,
  jsonMode: 'off' as JsonMode,
  jsonSchemaName: 'lpu_summary',
  jsonSchemaStrict: true,
  jsonSchemaText: DEFAULT_JSON_SCHEMA_TEXT,
  builtInTools: {
    browserSearch: false,
    codeInterpreter: false,
  } as BuiltInToolsConfig,
}

const EMPTY_TELEMETRY: ExecutionTelemetryExtension = {
  ttftMs: null,
  tokensPerSecond: null,
  promptTokens: null,
  completionTokens: null,
  totalTimeMs: null,
  finishReason: null,
  triggeredStopSequence: null,
  source: null,
}

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value))

let spotlightTimerId: number | null = null

const DOCK_CONTROLS = new Set<string>([
  'model',
  'temperature',
  'topP',
  'maxCompletionTokens',
  'streaming',
  'stopSequences',
  'jsonMode',
  'builtInTools',
])

export const usePlaygroundStore = create<PlaygroundState>((set, get) => {
  const initialTheme = getInitialTheme()
  const initialTourCompleted = getInitialTourCompleted()
  syncDocumentTheme(initialTheme)

  return {
    theme: initialTheme,
    apiKey: getInitialApiKey(),
    activeWorkspace: 'studio',
    activeBuilderTab: 'schema',
    soundEnabled: getInitialSoundEnabled(),

    activeConcept: 'lpu-pipeline',
    selectedHotspot: null,
    cameraResetTick: 0,
    completedChallenges: getInitialCompletedChallenges(),
    challengeCelebrationTick: 0,

    ...DEFAULT_PARAMETERS,

    executionStatus: 'idle',
    userPrompt:
      'In 3 crisp sentences, explain to a beginner why Groq LPUs generate tokens so much faster than traditional GPUs.',
    responseText: '',
    prefillApplied: '',
    executedTools: [],
    reasoningTrace: null,
    errorMessage: null,
    errorRecoveryAction: null,
    tokenPulseCount: 0,
    telemetry: { ...EMPTY_TELEMETRY },
    isConsoleExpanded: initialTourCompleted,

    isControlDockCollapsed: false,
    isSettingsOpen: false,
    isSchemaModalOpen: false,
    isCodeModalOpen: false,
    isJarvisOpen: false,
    highlightedControl: null,
    jarvisStatus: 'standby',
    jarvisActionModeEnabled: true,
    jarvisMessages: [],
    jarvisVoiceAutoSpeak: getInitialVoiceAutoSpeak(),
    jarvisVoiceName: getInitialVoiceName(),
    jarvisListening: false,
    jarvisAudioLevel: 0,
    voiceStatusHint: null,
    hasCompletedTour: initialTourCompleted,
    isTourActive: !initialTourCompleted,
    tourStepIndex: 0,

    getMode: () => deriveAppMode(get().apiKey),

    setTheme: (theme: ThemeMode) => {
      safeWriteStorage(STORAGE_KEYS.theme, theme)
      syncDocumentTheme(theme)
      set({ theme })
    },

    toggleTheme: () => {
      const next: ThemeMode = get().theme === 'dark' ? 'light' : 'dark'
      safeWriteStorage(STORAGE_KEYS.theme, next)
      syncDocumentTheme(next)
      set({ theme: next })
    },

    setActiveWorkspace: (activeWorkspace: WorkspaceId) => {
      set({ activeWorkspace })
    },

    setActiveBuilderTab: (activeBuilderTab: BuilderSubTab) => {
      set({ activeBuilderTab })
    },

    setSoundEnabled: (soundEnabled: boolean) => {
      safeWriteStorage(STORAGE_KEYS.soundEnabled, String(soundEnabled))
      set({ soundEnabled })
    },

    toggleSound: () => {
      const next = !get().soundEnabled
      safeWriteStorage(STORAGE_KEYS.soundEnabled, String(next))
      set({ soundEnabled: next })
    },

    setApiKey: (rawKey: string) => {
      const cleaned = rawKey.trim()
      safeWriteStorage(STORAGE_KEYS.apiKey, cleaned)
      set({ apiKey: cleaned })
    },

    clearApiKey: () => {
      safeWriteStorage(STORAGE_KEYS.apiKey, '')
      set({ apiKey: '' })
    },

    setActiveConcept: (activeConcept: ConceptId) => {
      set((state) => ({
        activeConcept,
        selectedHotspot: null,
        cameraResetTick: state.cameraResetTick + 1,
      }))
    },

    completeChallenge: (conceptId: ConceptId) => {
      const current = get().completedChallenges
      if (current.includes(conceptId)) return
      const next = [...current, conceptId]
      safeWriteStorage(STORAGE_KEYS.completedChallenges, JSON.stringify(next))
      set((state) => ({
        completedChallenges: next,
        challengeCelebrationTick: state.challengeCelebrationTick + 1,
      }))
    },

    resetChallenges: () => {
      safeWriteStorage(STORAGE_KEYS.completedChallenges, '')
      set({ completedChallenges: [] })
    },

    setSelectedHotspot: (selectedHotspot: HotspotId | null) => {
      set({ selectedHotspot })
    },

    triggerCameraReset: () => {
      set((state) => ({
        selectedHotspot: null,
        cameraResetTick: state.cameraResetTick + 1,
      }))
    },

    setModel: (model: ModelId) => set({ model }),
    setSystemPrompt: (systemPrompt: string) => set({ systemPrompt }),
    setAssistantPrefill: (assistantPrefill: string) => set({ assistantPrefill }),

    setTemperature: (temperature: number) =>
      set({ temperature: Math.round(clamp(temperature, 0, 2) * 100) / 100 }),

    setTopP: (topP: number) =>
      set({ topP: Math.round(clamp(topP, 0.05, 1) * 100) / 100 }),

    setMaxCompletionTokens: (maxCompletionTokens: number) =>
      set({
        maxCompletionTokens: Math.round(clamp(maxCompletionTokens, 16, 4096)),
      }),

    setStopSequences: (stopSequences: string[]) =>
      set({ stopSequences: stopSequences.slice(0, 4) }),

    addStopSequence: (rawSequence: string) => {
      const normalized = rawSequence.replace(/\\n/g, '\n')
      if (!normalized || normalized.length === 0) return
      set((state) => {
        if (state.stopSequences.length >= 4 || state.stopSequences.includes(normalized)) {
          return state
        }
        return { stopSequences: [...state.stopSequences, normalized] }
      })
    },

    removeStopSequence: (sequence: string) =>
      set((state) => ({
        stopSequences: state.stopSequences.filter((item) => item !== sequence),
      })),

    setStreaming: (streaming: boolean) => set({ streaming }),

    setJsonMode: (jsonMode: JsonMode) =>
      set((state) => ({
        jsonMode,
        // Groq Built-In Tools cannot be combined with Structured Outputs
        builtInTools:
          jsonMode !== 'off'
            ? { browserSearch: false, codeInterpreter: false }
            : state.builtInTools,
      })),

    setJsonSchemaName: (jsonSchemaName: string) => set({ jsonSchemaName }),
    setJsonSchemaStrict: (jsonSchemaStrict: boolean) => set({ jsonSchemaStrict }),
    setJsonSchemaText: (jsonSchemaText: string) => set({ jsonSchemaText }),

    setBuiltInTools: (tools: Partial<BuiltInToolsConfig>) =>
      set((state) => {
        const nextTools = {
          ...state.builtInTools,
          ...tools,
        }
        const anyToolEnabled = nextTools.browserSearch || nextTools.codeInterpreter
        return {
          builtInTools: nextTools,
          // Groq Built-In Tools cannot be combined with Structured Outputs
          jsonMode: anyToolEnabled ? 'off' : state.jsonMode,
        }
      }),

    resetParameters: () => set({ ...DEFAULT_PARAMETERS }),

    applyExperimentPreset: (preset: ExperimentPreset) =>
      set((state) => {
        const nextConcept = preset.conceptId ?? state.activeConcept
        const conceptChanged = nextConcept !== state.activeConcept
        const nextTools = preset.builtInTools
          ? {
              browserSearch: Boolean(preset.builtInTools.browserSearch),
              codeInterpreter: Boolean(preset.builtInTools.codeInterpreter),
            }
          : { browserSearch: false, codeInterpreter: false }
        const nextJsonMode =
          nextTools.browserSearch || nextTools.codeInterpreter
            ? 'off'
            : (preset.jsonMode ?? 'off')

        return {
          activeConcept: nextConcept,
          selectedHotspot: conceptChanged ? null : state.selectedHotspot,
          cameraResetTick: conceptChanged ? state.cameraResetTick + 1 : state.cameraResetTick,
          model: preset.model ?? state.model,
          userPrompt: preset.userPrompt,
          systemPrompt: preset.systemPrompt ?? state.systemPrompt,
          assistantPrefill: preset.assistantPrefill ?? '',
          temperature:
            preset.temperature !== undefined
              ? Math.round(clamp(preset.temperature, 0, 2) * 100) / 100
              : state.temperature,
          topP:
            preset.topP !== undefined
              ? Math.round(clamp(preset.topP, 0.05, 1) * 100) / 100
              : state.topP,
          maxCompletionTokens:
            preset.maxCompletionTokens !== undefined
              ? Math.round(clamp(preset.maxCompletionTokens, 16, 4096))
              : state.maxCompletionTokens,
          stopSequences: preset.stopSequences ? preset.stopSequences.slice(0, 4) : [],
          streaming: preset.streaming ?? state.streaming,
          jsonMode: nextJsonMode,
          builtInTools: nextTools,
          isConsoleExpanded: true,
          errorMessage: null,
          errorRecoveryAction: null,
        }
      }),

    setUserPrompt: (userPrompt: string) => set({ userPrompt }),

    setConsoleExpanded: (isConsoleExpanded: boolean) => set({ isConsoleExpanded }),

    toggleConsoleExpanded: () =>
      set((state) => ({ isConsoleExpanded: !state.isConsoleExpanded })),

    beginExecution: (prefill: string, source: 'demo' | 'live') =>
      set({
        executionStatus: 'connecting',
        responseText: '',
        prefillApplied: prefill,
        executedTools: [],
        reasoningTrace: null,
        errorMessage: null,
        errorRecoveryAction: null,
        telemetry: {
          ...EMPTY_TELEMETRY,
          source,
        },
      }),

    markStreamingStarted: (ttftMs: number) =>
      set((state) => ({
        executionStatus: 'streaming',
        telemetry: {
          ...state.telemetry,
          ttftMs: Math.round(ttftMs),
        },
      })),

    appendResponseDelta: (
      delta: string,
      partialTelemetry?: Partial<ExecutionTelemetryExtension>
    ) =>
      set((state) => ({
        executionStatus: 'streaming',
        responseText: state.responseText + delta,
        tokenPulseCount: state.tokenPulseCount + 1,
        telemetry: partialTelemetry
          ? { ...state.telemetry, ...partialTelemetry }
          : state.telemetry,
      })),

    setExecutedTools: (executedTools: ExecutedToolTrace[]) => set({ executedTools }),

    setReasoningTrace: (reasoningTrace: string | null) => set({ reasoningTrace }),

    replaceResponseText: (responseText: string) => set({ responseText }),

    completeExecution: (
      status: 'completed' | 'aborted',
      finalTelemetry: Partial<ExecutionTelemetryExtension>
    ) =>
      set((state) => ({
        executionStatus: status,
        telemetry: {
          ...state.telemetry,
          ...finalTelemetry,
        },
      })),

    failExecution: (message: string, recoveryAction: ErrorRecoveryAction = null) =>
      set((state) => ({
        executionStatus: 'error',
        errorMessage: message,
        errorRecoveryAction: recoveryAction,
        telemetry: {
          ...state.telemetry,
          finishReason: null,
        },
      })),

    clearExecutionOutput: () =>
      set({
        executionStatus: 'idle',
        responseText: '',
        prefillApplied: '',
        executedTools: [],
        reasoningTrace: null,
        errorMessage: null,
        errorRecoveryAction: null,
        telemetry: { ...EMPTY_TELEMETRY },
      }),

    setControlDockCollapsed: (isControlDockCollapsed: boolean) =>
      set((state) => {
        const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024
        return {
          isControlDockCollapsed,
          isJarvisOpen: !isControlDockCollapsed && isNarrow ? false : state.isJarvisOpen,
        }
      }),

    toggleControlDock: () =>
      set((state) => {
        const nextCollapsed = !state.isControlDockCollapsed
        const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024
        return {
          isControlDockCollapsed: nextCollapsed,
          isJarvisOpen: !nextCollapsed && isNarrow ? false : state.isJarvisOpen,
        }
      }),

    setSettingsOpen: (isSettingsOpen: boolean) => set({ isSettingsOpen }),
    setSchemaModalOpen: (isSchemaModalOpen: boolean) => set({ isSchemaModalOpen }),
    setCodeModalOpen: (isCodeModalOpen: boolean) => set({ isCodeModalOpen }),
    toggleCodeModalOpen: () =>
      set((state) => ({ isCodeModalOpen: !state.isCodeModalOpen })),
    setJarvisOpen: (isJarvisOpen: boolean) =>
      set((state) => {
        const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024
        return {
          isJarvisOpen,
          isControlDockCollapsed: isJarvisOpen && isNarrow ? true : state.isControlDockCollapsed,
        }
      }),
    toggleJarvisOpen: () =>
      set((state) => {
        const nextOpen = !state.isJarvisOpen
        const isNarrow = typeof window !== 'undefined' && window.innerWidth < 1024
        return {
          isJarvisOpen: nextOpen,
          isControlDockCollapsed: nextOpen && isNarrow ? true : state.isControlDockCollapsed,
        }
      }),

    setHighlightedControl: (highlightedControl: ControlHighlightKey | null) =>
      set({ highlightedControl }),

    spotlightControl: (controlId: ControlHighlightKey, durationMs = 4500) => {
      if (typeof window !== 'undefined' && spotlightTimerId !== null) {
        window.clearTimeout(spotlightTimerId)
        spotlightTimerId = null
      }

      set((state) => ({
        highlightedControl: controlId,
        isControlDockCollapsed: DOCK_CONTROLS.has(controlId)
          ? false
          : state.isControlDockCollapsed,
      }))

      if (typeof window !== 'undefined' && durationMs > 0) {
        spotlightTimerId = window.setTimeout(() => {
          spotlightTimerId = null
          set((state) =>
            state.highlightedControl === controlId ? { highlightedControl: null } : state
          )
        }, durationMs)
      }
    },

    setJarvisStatus: (jarvisStatus: JarvisStatus) => set({ jarvisStatus }),
    setJarvisActionModeEnabled: (jarvisActionModeEnabled: boolean) =>
      set({ jarvisActionModeEnabled }),
    addJarvisMessage: (message: JarvisMessage) =>
      set((state) => ({
        jarvisMessages: [...state.jarvisMessages, message],
      })),
    revertJarvisAction: (messageId: string) =>
      set((state) => {
        const target = state.jarvisMessages.find((m) => m.id === messageId)
        if (!target?.preActionSnapshot || target.snapshotReverted) return state
        const snap = target.preActionSnapshot
        const conceptChanged = snap.activeConcept !== state.activeConcept
        return {
          activeWorkspace: snap.activeWorkspace ?? state.activeWorkspace,
          activeBuilderTab: snap.activeBuilderTab ?? state.activeBuilderTab,
          activeConcept: snap.activeConcept,
          selectedHotspot: conceptChanged ? null : state.selectedHotspot,
          cameraResetTick: conceptChanged ? state.cameraResetTick + 1 : state.cameraResetTick,
          model: snap.model,
          temperature: snap.temperature,
          topP: snap.topP,
          maxCompletionTokens: snap.maxCompletionTokens,
          streaming: snap.streaming,
          stopSequences: [...snap.stopSequences],
          systemPrompt: snap.systemPrompt,
          assistantPrefill: snap.assistantPrefill,
          userPrompt: snap.userPrompt,
          jsonMode: snap.jsonMode,
          builtInTools: { ...snap.builtInTools },
          jarvisMessages: state.jarvisMessages.map((m) =>
            m.id === messageId ? { ...m, snapshotReverted: true } : m
          ),
        }
      }),
    clearJarvisMessages: () => set({ jarvisMessages: [] }),

    setJarvisVoiceAutoSpeak: (jarvisVoiceAutoSpeak: boolean) => {
      safeWriteStorage(STORAGE_KEYS.voiceAutoSpeak, String(jarvisVoiceAutoSpeak))
      set({ jarvisVoiceAutoSpeak })
    },

    setJarvisVoiceName: (jarvisVoiceName: JarvisVoiceName) => {
      safeWriteStorage(STORAGE_KEYS.voiceName, jarvisVoiceName)
      set({ jarvisVoiceName })
    },

    setJarvisListening: (jarvisListening: boolean) => set({ jarvisListening }),
    setJarvisAudioLevel: (jarvisAudioLevel: number) =>
      set({ jarvisAudioLevel: clamp(jarvisAudioLevel, 0, 1) }),
    setVoiceStatusHint: (voiceStatusHint: string | null) => set({ voiceStatusHint }),

    startTour: () =>
      set({
        isTourActive: true,
        tourStepIndex: 0,
        isSettingsOpen: false,
        isJarvisOpen: false,
        selectedHotspot: null,
      }),

    nextTourStep: () =>
      set((state) => ({
        tourStepIndex: Math.min(4, state.tourStepIndex + 1),
      })),

    prevTourStep: () =>
      set((state) => ({
        tourStepIndex: Math.max(0, state.tourStepIndex - 1),
      })),

    completeTour: () => {
      safeWriteStorage(STORAGE_KEYS.tourCompleted, 'true')
      set({
        hasCompletedTour: true,
        isTourActive: false,
        highlightedControl: null,
        activeConcept: 'lpu-pipeline',
        temperature: 0.7,
        isConsoleExpanded: true,
      })
    },
  }
})
