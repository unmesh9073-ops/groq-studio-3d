import { CONCEPT_LENSES, getConceptById, getHotspotsForConcept, MODEL_CATALOG } from '@/data/concepts'
import { runPlaygroundCompletion } from '@/services/playgroundRunner'
import { usePlaygroundStore } from '@/store/usePlaygroundStore'
import type {
  ConceptId,
  ControlHighlightKey,
  JarvisActionReceipt,
  JsonMode,
  ModelId,
  PlaygroundActionSnapshot,
} from '@/types/playground'

export interface ConfigurePlaygroundArgs {
  activeConcept?: ConceptId
  model?: ModelId
  temperature?: number
  topP?: number
  maxCompletionTokens?: number
  streaming?: boolean
  stopSequences?: string[]
  systemPrompt?: string
  assistantPrefill?: string
  userPrompt?: string
  jsonMode?: JsonMode
  browserSearch?: boolean
  codeInterpreter?: boolean
  spotlightControlId?: ControlHighlightKey
  expandConsole?: boolean
  runDemo?: boolean
}

export interface InspectHotspotArgs {
  hotspotId: string
  activeConcept?: ConceptId
}

export interface OpenStudioModalArgs {
  modal: 'code_export' | 'json_schema' | 'settings'
}

export interface JarvisToolExecutionResult {
  receipts: JarvisActionReceipt[]
  summary: string
  didMutate: boolean
}

export const JARVIS_TOOL_DEFINITIONS = [
  {
    type: 'function' as const,
    function: {
      name: 'configure_playground',
      description:
        'Configure one or more Groq Playground controls, switch the 3D concept scene, spotlight a UI control, and optionally run a live demo.',
      parameters: {
        type: 'object',
        properties: {
          activeConcept: {
            type: 'string',
            enum: [
              'lpu-pipeline',
              'prompt-roles',
              'temperature',
              'top-p',
              'tokens-limits',
              'structured-json',
              'built-in-tools',
            ],
          },
          model: {
            type: 'string',
            enum: MODEL_CATALOG.map((m) => m.id),
          },
          temperature: { type: 'number', minimum: 0, maximum: 2 },
          topP: { type: 'number', minimum: 0.05, maximum: 1 },
          maxCompletionTokens: { type: 'number', minimum: 16, maximum: 4096 },
          streaming: { type: 'boolean' },
          stopSequences: {
            type: 'array',
            items: { type: 'string' },
            maxItems: 4,
          },
          systemPrompt: { type: 'string' },
          assistantPrefill: { type: 'string' },
          userPrompt: { type: 'string' },
          jsonMode: {
            type: 'string',
            enum: ['off', 'json_object', 'json_schema'],
          },
          browserSearch: { type: 'boolean' },
          codeInterpreter: { type: 'boolean' },
          spotlightControlId: {
            type: 'string',
            enum: [
              'model',
              'temperature',
              'topP',
              'maxCompletionTokens',
              'streaming',
              'stopSequences',
              'jsonMode',
              'builtInTools',
              'systemPrompt',
              'assistantPrefill',
              'promptInput',
              'codeExport',
            ],
          },
          expandConsole: { type: 'boolean' },
          runDemo: { type: 'boolean' },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'inspect_hotspot',
      description:
        'Focus the 3D camera on a specific hotspot on the current or specified 3D concept scene.',
      parameters: {
        type: 'object',
        properties: {
          hotspotId: { type: 'string' },
          activeConcept: {
            type: 'string',
            enum: [
              'lpu-pipeline',
              'prompt-roles',
              'temperature',
              'top-p',
              'tokens-limits',
              'structured-json',
              'built-in-tools',
            ],
          },
        },
        required: ['hotspotId'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'open_studio_modal',
      description: 'Open one of the studio modals: code_export, json_schema, or settings.',
      parameters: {
        type: 'object',
        properties: {
          modal: {
            type: 'string',
            enum: ['code_export', 'json_schema', 'settings'],
          },
        },
        required: ['modal'],
        additionalProperties: false,
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reset_playground_defaults',
      description: 'Reset all Playground parameters back to calm default settings.',
      parameters: {
        type: 'object',
        properties: {},
        additionalProperties: false,
      },
    },
  },
]

const VALID_CONCEPT_IDS = new Set<string>(CONCEPT_LENSES.map((c) => c.id))
const VALID_MODEL_IDS = new Set<string>(MODEL_CATALOG.map((m) => m.id))
const VALID_JSON_MODES = new Set<string>(['off', 'json_object', 'json_schema'])
const VALID_MODAL_IDS = new Set<string>(['code_export', 'json_schema', 'settings'])
const VALID_SPOTLIGHT_IDS = new Set<string>([
  'model',
  'temperature',
  'topP',
  'maxCompletionTokens',
  'streaming',
  'stopSequences',
  'jsonMode',
  'builtInTools',
  'systemPrompt',
  'assistantPrefill',
  'promptInput',
  'codeExport',
])

const isFiniteNum = (v: unknown): v is number => typeof v === 'number' && Number.isFinite(v)
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

export function capturePlaygroundSnapshot(): PlaygroundActionSnapshot {
  const s = usePlaygroundStore.getState()
  return {
    activeConcept: s.activeConcept,
    model: s.model,
    temperature: s.temperature,
    topP: s.topP,
    maxCompletionTokens: s.maxCompletionTokens,
    streaming: s.streaming,
    stopSequences: [...s.stopSequences],
    systemPrompt: s.systemPrompt,
    assistantPrefill: s.assistantPrefill,
    userPrompt: s.userPrompt,
    jsonMode: s.jsonMode,
    builtInTools: { ...s.builtInTools },
  }
}

function makeReceiptId(): string {
  return `act-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export async function executeJarvisTool(
  toolName: string,
  rawArgs: Record<string, unknown>,
  signal?: AbortSignal
): Promise<JarvisToolExecutionResult> {
  const store = usePlaygroundStore.getState()
  const receipts: JarvisActionReceipt[] = []
  const validationErrors: string[] = []
  let didMutate = false

  if (toolName === 'configure_playground') {
    if (rawArgs.activeConcept !== undefined) {
      if (typeof rawArgs.activeConcept === 'string' && VALID_CONCEPT_IDS.has(rawArgs.activeConcept)) {
        const conceptId = rawArgs.activeConcept as ConceptId
        store.setActiveConcept(conceptId)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: '3D Stage',
          detail: getConceptById(conceptId).label,
          status: 'done',
        })
      } else {
        validationErrors.push(`Unknown activeConcept "${String(rawArgs.activeConcept)}".`)
      }
    }

    if (rawArgs.model !== undefined) {
      if (typeof rawArgs.model === 'string' && VALID_MODEL_IDS.has(rawArgs.model)) {
        const modelId = rawArgs.model as ModelId
        store.setModel(modelId)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Model',
          detail: modelId,
          status: 'done',
        })
      } else {
        validationErrors.push(`Unsupported model "${String(rawArgs.model)}".`)
      }
    }

    if (rawArgs.temperature !== undefined) {
      if (isFiniteNum(rawArgs.temperature)) {
        const clamped = Math.round(clamp(rawArgs.temperature, 0, 2) * 100) / 100
        store.setTemperature(clamped)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Temperature',
          detail: clamped.toFixed(2),
          status: 'done',
        })
      } else {
        validationErrors.push('temperature must be a finite number between 0 and 2.')
      }
    }

    if (rawArgs.topP !== undefined) {
      if (isFiniteNum(rawArgs.topP)) {
        const clamped = Math.round(clamp(rawArgs.topP, 0.05, 1) * 100) / 100
        store.setTopP(clamped)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Top-P',
          detail: clamped.toFixed(2),
          status: 'done',
        })
      } else {
        validationErrors.push('topP must be a finite number between 0.05 and 1.')
      }
    }

    if (rawArgs.maxCompletionTokens !== undefined) {
      if (isFiniteNum(rawArgs.maxCompletionTokens)) {
        const clamped = Math.round(clamp(rawArgs.maxCompletionTokens, 16, 4096))
        store.setMaxCompletionTokens(clamped)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Max Tokens',
          detail: String(clamped),
          status: 'done',
        })
      } else {
        validationErrors.push('maxCompletionTokens must be a finite number between 16 and 4096.')
      }
    }

    if (rawArgs.streaming !== undefined) {
      if (typeof rawArgs.streaming === 'boolean') {
        store.setStreaming(rawArgs.streaming)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Streaming',
          detail: rawArgs.streaming ? 'On' : 'Off',
          status: 'done',
        })
      } else {
        validationErrors.push('streaming must be a boolean.')
      }
    }

    if (rawArgs.stopSequences !== undefined) {
      if (Array.isArray(rawArgs.stopSequences)) {
        const validStops = rawArgs.stopSequences
          .filter((s): s is string => typeof s === 'string' && s.length > 0)
          .slice(0, 4)
        store.setStopSequences(validStops)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Stop Sequences',
          detail: validStops.length > 0 ? validStops.join(', ') : 'Cleared',
          status: 'done',
        })
      } else {
        validationErrors.push('stopSequences must be an array of non-empty strings.')
      }
    }

    if (rawArgs.systemPrompt !== undefined) {
      if (typeof rawArgs.systemPrompt === 'string') {
        store.setSystemPrompt(rawArgs.systemPrompt)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'System Prompt',
          detail: 'Updated',
          status: 'done',
        })
      } else {
        validationErrors.push('systemPrompt must be a string.')
      }
    }

    if (rawArgs.assistantPrefill !== undefined) {
      if (typeof rawArgs.assistantPrefill === 'string') {
        store.setAssistantPrefill(rawArgs.assistantPrefill)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Assistant Prefill',
          detail: rawArgs.assistantPrefill || 'Cleared',
          status: 'done',
        })
      } else {
        validationErrors.push('assistantPrefill must be a string.')
      }
    }

    if (rawArgs.userPrompt !== undefined) {
      if (typeof rawArgs.userPrompt === 'string') {
        store.setUserPrompt(rawArgs.userPrompt)
        didMutate = true
      } else {
        validationErrors.push('userPrompt must be a string.')
      }
    }

    if (rawArgs.jsonMode !== undefined) {
      if (typeof rawArgs.jsonMode === 'string' && VALID_JSON_MODES.has(rawArgs.jsonMode)) {
        const mode = rawArgs.jsonMode as JsonMode
        store.setJsonMode(mode)
        didMutate = true
        receipts.push({
          id: makeReceiptId(),
          label: 'Structured Outputs',
          detail: mode,
          status: 'done',
        })
      } else {
        validationErrors.push(`Invalid jsonMode "${String(rawArgs.jsonMode)}".`)
      }
    }

    if (rawArgs.browserSearch !== undefined || rawArgs.codeInterpreter !== undefined) {
      const hasValidSearch =
        rawArgs.browserSearch === undefined || typeof rawArgs.browserSearch === 'boolean'
      const hasValidCode =
        rawArgs.codeInterpreter === undefined || typeof rawArgs.codeInterpreter === 'boolean'

      if (hasValidSearch && hasValidCode) {
        const browserSearch =
          typeof rawArgs.browserSearch === 'boolean' ? rawArgs.browserSearch : undefined
        const codeInterpreter =
          typeof rawArgs.codeInterpreter === 'boolean' ? rawArgs.codeInterpreter : undefined
        store.setBuiltInTools({
          ...(browserSearch !== undefined ? { browserSearch } : {}),
          ...(codeInterpreter !== undefined ? { codeInterpreter } : {}),
        })
        didMutate = true
        const activeTools = [
          browserSearch ? 'Browser Search' : null,
          codeInterpreter ? 'Code Sandbox' : null,
        ].filter(Boolean)
        receipts.push({
          id: makeReceiptId(),
          label: 'Built-In Tools',
          detail: activeTools.length > 0 ? activeTools.join(' + ') : 'Off',
          status: 'done',
        })
      } else {
        validationErrors.push('browserSearch and codeInterpreter must be booleans.')
      }
    }

    if (typeof rawArgs.expandConsole === 'boolean') {
      store.setConsoleExpanded(rawArgs.expandConsole)
    } else if (rawArgs.runDemo === true) {
      store.setConsoleExpanded(true)
    }

    if (
      typeof rawArgs.spotlightControlId === 'string' &&
      VALID_SPOTLIGHT_IDS.has(rawArgs.spotlightControlId)
    ) {
      store.spotlightControl(rawArgs.spotlightControlId as ControlHighlightKey, 5000)
    }

    if (rawArgs.runDemo === true) {
      await new Promise<void>((resolve, reject) => {
        if (signal?.aborted) {
          reject(new DOMException('Aborted', 'AbortError'))
          return
        }
        const timer = window.setTimeout(() => {
          signal?.removeEventListener('abort', onAbort)
          resolve()
        }, 250)
        function onAbort() {
          window.clearTimeout(timer)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        signal?.addEventListener('abort', onAbort, { once: true })
      })
      void runPlaygroundCompletion()
      receipts.push({
        id: makeReceiptId(),
        label: 'Playground',
        detail: 'Running live demo',
        status: 'done',
      })
    }

    const baseSummary =
      receipts.length > 0
        ? receipts.map((r) => `${r.label}: ${r.detail}`).join('; ')
        : 'No valid changes applied.'
    const summary =
      validationErrors.length > 0
        ? `${baseSummary} Validation errors: ${validationErrors.join(' ')}`
        : baseSummary

    return { receipts, summary, didMutate }
  }

  if (toolName === 'inspect_hotspot') {
    let targetConcept = store.activeConcept
    if (rawArgs.activeConcept !== undefined) {
      if (typeof rawArgs.activeConcept === 'string' && VALID_CONCEPT_IDS.has(rawArgs.activeConcept)) {
        targetConcept = rawArgs.activeConcept as ConceptId
        if (targetConcept !== store.activeConcept) {
          store.setActiveConcept(targetConcept)
        }
      } else {
        return {
          receipts: [],
          summary: `Invalid activeConcept "${String(rawArgs.activeConcept)}".`,
          didMutate: false,
        }
      }
    }

    const hotspots = getHotspotsForConcept(targetConcept)
    const hotspotId = typeof rawArgs.hotspotId === 'string' ? rawArgs.hotspotId : ''
    const match = hotspots.find((h) => h.id === hotspotId)
    if (!match) {
      return {
        receipts: [],
        summary: `Invalid hotspotId "${hotspotId}" for concept "${targetConcept}". Valid IDs: ${hotspots.map((h) => h.id).join(', ')}.`,
        didMutate: false,
      }
    }

    store.setSelectedHotspot(match.id)
    receipts.push({
      id: makeReceiptId(),
      label: '3D Hotspot',
      detail: match.title,
      status: 'done',
    })
    return {
      receipts,
      summary: `Focused hotspot: ${match.title}`,
      didMutate: false,
    }
  }

  if (toolName === 'open_studio_modal') {
    const modal = typeof rawArgs.modal === 'string' ? rawArgs.modal : ''
    if (!VALID_MODAL_IDS.has(modal)) {
      return {
        receipts: [],
        summary: `Invalid modal "${modal}". Must be one of: code_export, json_schema, settings.`,
        didMutate: false,
      }
    }

    if (modal === 'code_export') {
      store.setCodeModalOpen(true)
      store.spotlightControl('codeExport', 4500)
      receipts.push({
        id: makeReceiptId(),
        label: 'Modal',
        detail: 'View Code Exporter',
        status: 'done',
      })
    } else if (modal === 'json_schema') {
      store.setJsonMode('json_schema')
      store.setSchemaModalOpen(true)
      didMutate = true
      receipts.push({
        id: makeReceiptId(),
        label: 'Modal',
        detail: 'JSON Schema Editor',
        status: 'done',
      })
    } else if (modal === 'settings') {
      store.setSettingsOpen(true)
      receipts.push({
        id: makeReceiptId(),
        label: 'Modal',
        detail: 'Studio Settings',
        status: 'done',
      })
    }
    return {
      receipts,
      summary: `Opened ${modal} modal.`,
      didMutate,
    }
  }

  if (toolName === 'reset_playground_defaults') {
    store.resetParameters()
    receipts.push({
      id: makeReceiptId(),
      label: 'Parameters',
      detail: 'Reset to calm defaults',
      status: 'done',
    })
    return {
      receipts,
      summary: 'Reset Playground parameters to defaults.',
      didMutate: true,
    }
  }

  return { receipts: [], summary: `Unknown tool: ${toolName}`, didMutate: false }
}
