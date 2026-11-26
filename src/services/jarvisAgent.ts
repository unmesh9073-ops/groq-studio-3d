import { getConceptById } from '@/data/concepts'
import {
  capturePlaygroundSnapshot,
  executeJarvisTool,
  JARVIS_TOOL_DEFINITIONS,
} from '@/services/jarvisTools'
import { deriveAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { ConceptId, JarvisActionReceipt, JarvisMessage } from '@/types/playground'

let activeJarvisController: AbortController | null = null

export function stopJarvisTurn(): void {
  if (activeJarvisController) {
    activeJarvisController.abort()
    activeJarvisController = null
  }
  const store = usePlaygroundStore.getState()
  if (store.jarvisStatus === 'thinking' || store.jarvisStatus === 'acting') {
    store.setJarvisStatus('standby')
  }
}

function makeMsgId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
}

export function buildStageContextSnapshot(): string {
  const s = usePlaygroundStore.getState()
  const concept = getConceptById(s.activeConcept)
  return JSON.stringify({
    activeWorkspace: s.activeWorkspace,
    completedChallenges: `${s.completedChallenges.length} / 7`,
    activeConcept: s.activeConcept,
    activeConceptLabel: concept.label,
    selectedHotspot: s.selectedHotspot,
    model: s.model,
    temperature: s.temperature,
    topP: s.topP,
    maxCompletionTokens: s.maxCompletionTokens,
    streaming: s.streaming,
    stopSequences: s.stopSequences,
    jsonMode: s.jsonMode,
    builtInTools: s.builtInTools,
    assistantPrefill: s.assistantPrefill || null,
    userPrompt: s.userPrompt.slice(0, 180),
    executionStatus: s.executionStatus,
    responsePreview: s.responseText ? s.responseText.slice(0, 240) : null,
    telemetry: s.telemetry,
    errorMessage: s.errorMessage,
    actionModeEnabled: s.jarvisActionModeEnabled,
  })
}

export function getDynamicQuickAsks(activeConcept: ConceptId): string[] {
  const ws = usePlaygroundStore.getState().activeWorkspace
  if (ws === 'studio') {
    return [
      'Take me to Temperature 3D',
      'Show me the Python code',
      'Explain what I’m looking at',
    ]
  }
  if (ws === 'playground') {
    return [
      'Run a Stop Sequence cutoff demo',
      'Show me why high temperature makes AI ramble',
      'Explain what I’m looking at',
    ]
  }
  if (ws === 'builder') {
    return [
      'Explain the exported Python code',
      'Edit the JSON schema',
      'Explain what I’m looking at',
    ]
  }
  switch (activeConcept) {
    case 'temperature':
      return [
        'Show me why high temperature makes AI ramble',
        'Demo deterministic temperature at 0.1',
        'Explain what I’m looking at',
      ]
    case 'top-p':
      return [
        'Demo Top-P nucleus filtering at 0.35',
        'Explain what I’m looking at',
        'Show me the exported SDK code',
      ]
    case 'tokens-limits':
      return [
        'Demo a Stop Sequence cutoff',
        'Why did my last run stop?',
        'Explain what I’m looking at',
      ]
    case 'prompt-roles':
      return [
        'Demo an Assistant Prefill hack',
        'Explain what I’m looking at',
        'Show me the exported SDK code',
      ]
    case 'structured-json':
      return [
        'Run a Strict JSON Schema demo',
        'Explain what I’m looking at',
        'Show me the exported SDK code',
      ]
    case 'built-in-tools':
      return [
        'Run a Built-In Tools agent demo',
        'Explain what I’m looking at',
        'Reset settings to defaults',
      ]
    default:
      return [
        'Show me why high temperature makes AI ramble',
        'Explain what I’m looking at',
        'Demo a Stop Sequence cutoff',
      ]
  }
}

const JARVIS_SYSTEM_PROMPT = `You are J.A.R.V.I.S., the calm, articulate, slightly witty British-style spatial co-pilot inside Groq Studio 3D.
Your sole mission is teaching complete beginners how the Groq Developer Playground works (LPU deterministic SRAM speed, models, System/User/Assistant Prefill roles, Temperature, Top-P, Max Completion Tokens, Stop Sequences, Streaming, Structured JSON Outputs, Built-In Tools, and SDK Code Export).

Rules:
- Keep every reply concise (2 to 4 crisp sentences) in plain, welcoming English.
- You receive a live JSON snapshot of the user's Playground stage on every turn—always reference what is actually on screen when relevant.
- If Action Mode is enabled and the user asks to see, demonstrate, test, or switch something, call the appropriate tool (prefer a single compound \`configure_playground\` call) and then briefly explain what changed on stage.
- If Action Mode is disabled, never call mutation tools—just explain clearly how the user can adjust the controls themselves.
- If the user asks about unrelated off-topic subjects, politely steer back to the Groq Playground with dry Jarvis wit.`

async function runLiveJarvisTurn(
  userText: string,
  signal: AbortSignal
): Promise<{
  content: string
  actions: JarvisActionReceipt[]
  didMutate: boolean
  followUps: string[]
}> {
  const store = usePlaygroundStore.getState()
  const history = store.jarvisMessages.slice(-6).map((m) => ({
    role: m.role,
    content: m.content,
  }))

  const messages: Array<Record<string, unknown>> = [
    {
      role: 'system',
      content: `${JARVIS_SYSTEM_PROMPT}\n\nLIVE_STAGE_SNAPSHOT: ${buildStageContextSnapshot()}`,
    },
    ...history,
    { role: 'user', content: userText },
  ]

  const allReceipts: JarvisActionReceipt[] = []
  let didMutate = false
  let finalReply = ''

  // Cap tool execution at 2 rounds; round 2 omits tools to force a final written summary.
  for (let round = 0; round < 3; round++) {
    if (signal.aborted) throw new DOMException('Aborted', 'AbortError')

    const body: Record<string, unknown> = {
      model: 'openai/gpt-oss-120b',
      messages,
      temperature: 0.4,
      max_completion_tokens: 450,
    }

    if (store.jarvisActionModeEnabled && round < 2) {
      body.tools = JARVIS_TOOL_DEFINITIONS
      body.tool_choice = 'auto'
    }

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${store.apiKey.trim()}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal,
    })

    if (!res.ok) {
      if (res.status === 401) {
        return {
          content:
            'It appears your Groq API key was declined (401). Open Settings to update it, or clear the key to continue in Instant Demo Mode—I operate smoothly in both.',
          actions: allReceipts,
          didMutate,
          followUps: ['Open Settings', 'Explain what I’m looking at'],
        }
      }
      if (res.status === 429) {
        return {
          content:
            'We have momentarily reached the Groq Free Tier rate limit (429). Give the LPU a few seconds to breathe, or clear your key in Settings for uninterrupted Demo Mode.',
          actions: allReceipts,
          didMutate,
          followUps: ['Explain what I’m looking at'],
        }
      }
      throw new Error(`Groq API returned HTTP ${res.status}`)
    }

    const json = (await res.json()) as {
      choices?: Array<{
        message?: {
          content?: string | null
          tool_calls?: Array<{
            id: string
            function: { name: string; arguments: string }
          }>
        }
      }>
    }

    const msg = json.choices?.[0]?.message
    const toolCalls = msg?.tool_calls

    if (toolCalls && toolCalls.length > 0 && store.jarvisActionModeEnabled && round < 2) {
      usePlaygroundStore.getState().setJarvisStatus('acting')
      messages.push({
        role: 'assistant',
        content: msg?.content ?? '',
        tool_calls: toolCalls,
      })

      for (const tc of toolCalls) {
        let parsedArgs: Record<string, unknown>
        try {
          const raw = JSON.parse(tc.function.arguments || '{}')
          parsedArgs =
            raw && typeof raw === 'object' && !Array.isArray(raw)
              ? (raw as Record<string, unknown>)
              : {}
        } catch {
          parsedArgs = {}
        }
        const execResult = await executeJarvisTool(tc.function.name, parsedArgs, signal)
        allReceipts.push(...execResult.receipts)
        if (execResult.didMutate) didMutate = true
        messages.push({
          role: 'tool',
          tool_call_id: tc.id,
          name: tc.function.name,
          content: JSON.stringify({
            ok: execResult.receipts.length > 0,
            summary: execResult.summary,
          }),
        })
      }
      continue
    }

    finalReply = msg?.content?.trim() || 'Stage updated, sir.'
    break
  }

  return {
    content: finalReply || 'Ready when you are.',
    actions: allReceipts,
    didMutate,
    followUps: getDynamicQuickAsks(usePlaygroundStore.getState().activeConcept).slice(0, 2),
  }
}

async function runDemoJarvisTurn(
  userText: string,
  signal: AbortSignal
): Promise<{
  content: string
  actions: JarvisActionReceipt[]
  didMutate?: boolean
  followUps: string[]
}> {
  const lower = userText.toLowerCase()
  const store = usePlaygroundStore.getState()
  const actionAllowed = store.jarvisActionModeEnabled

  await new Promise<void>((resolve, reject) => {
    if (signal.aborted) {
      reject(new DOMException('Aborted', 'AbortError'))
      return
    }
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, 240)
    function onAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }
    signal.addEventListener('abort', onAbort, { once: true })
  })

  // 1. Open Settings request
  if (lower.includes('open settings') || lower.includes('api key')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('open_studio_modal', { modal: 'settings' })
      return {
        content:
          'I have opened Studio Settings for you. Paste a free Groq API key to unlock live LPU inference, or keep exploring with zero setup in Instant Demo Mode.',
        actions: res.receipts,
        followUps: ['Explain what I’m looking at'],
      }
    }
    return {
      content:
        'Click the Settings gear in the top-right bar whenever you are ready to paste a free Groq API key. Until then, Instant Demo Mode simulates every dial faithfully.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 2. View Code / Export
  if (lower.includes('code') && (lower.includes('show') || lower.includes('export') || lower.includes('sdk'))) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('open_studio_modal', { modal: 'code_export' })
      return {
        content:
          'Here is your live SDK exporter. Every slider, stop sequence, schema, and tool you configured in the studio is already wired into Python, TypeScript, OpenAI-compatible, and cURL snippets.',
        actions: res.receipts,
        followUps: ['Explain what I’m looking at', 'Reset settings to defaults'],
      }
    }
    return {
      content:
        'Action Mode is currently set to Advice Only, so I left the stage untouched. Click the `</>` View Code button in the top bar or press ⌘/Ctrl + E to inspect your live SDK snippets.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 3. Reset defaults
  if (lower.includes('reset')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('reset_playground_defaults', {})
      return {
        content:
          'Done—everything is back to calm defaults (`temperature: 0.70`, `topP: 1.00`, `streaming: On`), ready for your next experiment.',
        actions: res.receipts,
        followUps: [
          'Show me why high temperature makes AI ramble',
          'Demo a Stop Sequence cutoff',
        ],
      }
    }
    return {
      content:
        'I am in Advice Only mode, so I have not reset your dials. Click the Reset button at the top of Playground Controls to return to defaults.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 4. Deterministic / Low Temperature demo
  if (
    lower.includes('low temp') ||
    lower.includes('deterministic') ||
    lower.includes('0.1')
  ) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'temperature',
        temperature: 0.1,
        topP: 1.0,
        jsonMode: 'off',
        browserSearch: false,
        codeInterpreter: false,
        userPrompt: 'Describe a sunrise over a glass city on Mars in three vivid sentences.',
        spotlightControlId: 'temperature',
        runDemo: true,
      })
      return {
        content:
          'I dialed Temperature down to `0.10` and spotlighted the slider. Watch the first cyan pillar shoot upward—with almost zero randomness, the model reliably picks the highest-scoring tokens every time.',
        actions: res.receipts,
        followUps: ['Show me why high temperature makes AI ramble', 'Explain what I’m looking at'],
      }
    }
    return {
      content:
        'At a low Temperature like `0.10`, the model concentrates nearly 100% of its probability on the single most likely word, giving crisp, repeatable answers. Slide Temperature down in the left dock to see the first pillar spike.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 5. High Temperature / Rambling demo
  if (lower.includes('ramble') || lower.includes('high temp') || lower.includes('temperature')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'temperature',
        temperature: 1.85,
        topP: 1.0,
        jsonMode: 'off',
        browserSearch: false,
        codeInterpreter: false,
        userPrompt: 'Describe a sunrise over a glass city on Mars in three vivid sentences.',
        spotlightControlId: 'temperature',
        runDemo: true,
      })
      return {
        content:
          'I switched the stage to the 3D Softmax landscape, raised Temperature to `1.85`, and started a live run. Notice how the probability pillars flatten upward into warm amber—giving unlikely, poetic words a much higher chance of being picked.',
        actions: res.receipts,
        followUps: ['Demo deterministic temperature at 0.1', 'Demo Top-P nucleus filtering at 0.35'],
      }
    }
    return {
      content:
        'With Action Mode set to Advice Only, I have kept your sliders intact. Raising Temperature toward `1.85` flattens the softmax probability curve so unusual words compete with obvious ones—causing creative tangents or rambling.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 6. Top-P / Nucleus sampling demo
  if (lower.includes('top-p') || lower.includes('top p') || lower.includes('nucleus')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'top-p',
        topP: 0.35,
        jsonMode: 'off',
        browserSearch: false,
        codeInterpreter: false,
        userPrompt:
          'In 3 crisp sentences, explain to a beginner why Groq LPUs generate tokens so much faster than traditional GPUs.',
        spotlightControlId: 'topP',
        runDemo: true,
      })
      return {
        content:
          'I opened the Top-P Nucleus stage, slid `topP` to `0.35`, and started a run. See how the glass curtain sweeps left, keeping only the top core words whose probabilities sum to 35% and masking out the noisy tail.',
        actions: res.receipts,
        followUps: ['Show me why high temperature makes AI ramble', 'Show me the exported SDK code'],
      }
    }
    return {
      content:
        'Top-P trims the long tail of unlikely words by keeping only the smallest group of top candidates whose probabilities add up to P. Lowering Top-P to `0.35` keeps wording tight even if Temperature is high.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 7. Stop Sequence / Token Limit / Why did it cut off?
  if (lower.includes('cut off') || lower.includes('why did') || lower.includes('stop')) {
    if (lower.includes('why') && store.telemetry.finishReason === 'length') {
      if (actionAllowed) store.spotlightControl('maxCompletionTokens', 4500)
      return {
        content: `Your last run stopped early because \`finish_reason\` was \`length\`—it hit your \`Max Completion Tokens\` ceiling of ${store.maxCompletionTokens}. Raise that slider in the left dock if you want longer replies.`,
        actions: [],
        followUps: ['Demo a Stop Sequence cutoff', 'Reset settings to defaults'],
      }
    }

    if (lower.includes('why') && store.telemetry.finishReason === 'stop_sequence') {
      if (actionAllowed) store.spotlightControl('stopSequences', 4500)
      return {
        content: `The LPU halted cleanly because it generated your stop sequence (${store.stopSequences.join(', ') || 'custom'}). Stop sequences act like an instant laser gate before extra chatter leaks out.`,
        actions: [],
        followUps: ['Reset settings to defaults', 'Explain what I’m looking at'],
      }
    }

    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'tokens-limits',
        stopSequences: ['Step 3'],
        maxCompletionTokens: 512,
        jsonMode: 'off',
        browserSearch: false,
        codeInterpreter: false,
        userPrompt:
          'Write a 4-step beginner checklist for brewing pour-over coffee, labeled Step 1, Step 2, Step 3, and Step 4.',
        spotlightControlId: 'stopSequences',
        runDemo: true,
      })
      return {
        content:
          'I switched to Token Limits, armed `Step 3` as a Stop Sequence, and launched the coffee checklist. Watch the cubes halt cleanly at the laser gate the instant `Step 3` appears.',
        actions: res.receipts,
        followUps: ['Explain what I’m looking at', 'Reset settings to defaults'],
      }
    }
    return {
      content:
        'Stop Sequences halt generation the instant a specific word or symbol appears, while Max Completion Tokens caps total reply length. Add `Step 3` in the left dock to watch it cut off mid-list.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 8. Assistant Prefill / Roles demo
  if (lower.includes('prefill') || lower.includes('role') || lower.includes('system')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'prompt-roles',
        assistantPrefill: '{ "summary": "',
        temperature: 0.3,
        jsonMode: 'off',
        browserSearch: false,
        codeInterpreter: false,
        userPrompt:
          'Summarize how Groq LPU deterministic execution eliminates memory bandwidth bottlenecks.',
        spotlightControlId: 'assistantPrefill',
        runDemo: true,
      })
      return {
        content:
          'I switched to Roles & Prefill and loaded `{ "summary": "` as the Assistant Prefill. By placing the opening tokens yourself, the LPU skips polite preamble and continues straight into your structure.',
        actions: res.receipts,
        followUps: ['Run a Strict JSON Schema demo', 'Show me the exported SDK code'],
      }
    }
    return {
      content:
        'System prompts set standing rules, User prompts ask the question, and Assistant Prefill seeds the opening words of the AI’s reply so it never wastes tokens on intro chatter.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 9. Structured JSON demo
  if (lower.includes('json') || lower.includes('schema')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'structured-json',
        jsonMode: 'json_schema',
        temperature: 0.2,
        userPrompt:
          'Extract a concise concept card summarizing why Groq LPU deterministic on-chip SRAM delivers ultra-fast streaming.',
        spotlightControlId: 'jsonMode',
        runDemo: true,
      })
      return {
        content:
          'I engaged `JSON Schema` mode on the 3D Schema Lattice and ran an extraction. At every token step, the LPU masks out invalid syntax so the output lands cleanly in your typed fields.',
        actions: res.receipts,
        followUps: ['Show me the exported SDK code', 'Run a Built-In Tools agent demo'],
      }
    }
    return {
      content:
        'Structured Outputs (`json_object` and `json_schema`) constrain token decoding so the model is guaranteed to emit valid JSON matching your schema.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 10. Built-in tools demo
  if (lower.includes('tool') || lower.includes('search') || lower.includes('python') || lower.includes('agent')) {
    if (actionAllowed) {
      store.setJarvisStatus('acting')
      const res = await executeJarvisTool('configure_playground', {
        activeConcept: 'built-in-tools',
        model: 'openai/gpt-oss-120b',
        browserSearch: true,
        codeInterpreter: true,
        temperature: 0.4,
        userPrompt:
          'Look up Groq GPT-OSS 120B nominal throughput and use Python to calculate how many 150-word summaries it can generate in 10 seconds.',
        spotlightControlId: 'builtInTools',
        runDemo: true,
      })
      return {
        content:
          'I activated both Browser Search and Code Sandbox on `openai/gpt-oss-120b` and started an agent run. Watch both satellites pulse as Groq executes live search and Python server-side inside one API call.',
        actions: res.receipts,
        followUps: ['Show me the exported SDK code', 'Explain what I’m looking at'],
      }
    }
    return {
      content:
        'On `openai/gpt-oss-120b` and `20b`, Groq runs Browser Search and Python Code Execution server-side inside a single request—check the Server-Side Tool Trace in the console to inspect each step.',
      actions: [],
      followUps: ['Explain what I’m looking at'],
    }
  }

  // 11. Explain what I'm looking at (Context-aware stage briefing)
  if (lower.includes('explain') || lower.includes('looking at') || lower.includes('screen') || lower.includes('this')) {
    const concept = getConceptById(store.activeConcept)
    const tpsText =
      store.telemetry.tokensPerSecond !== null
        ? ` Your last run clocked **${store.telemetry.tokensPerSecond} tok/s** with a **${store.telemetry.ttftMs ?? '—'} ms** TTFT.`
        : ''
    return {
      content: `You are currently viewing **${concept.label}** (${concept.tagline}) running \`${store.model}\` at Temperature \`${store.temperature.toFixed(2)}\`, Top-P \`${store.topP.toFixed(2)}\`, and Max Tokens \`${store.maxCompletionTokens}\`.${tpsText} Click any numbered 3D hotspot pill on stage to zoom in, or ask me to run a live demo.`,
      actions: [],
      followUps: getDynamicQuickAsks(store.activeConcept).slice(0, 2),
    }
  }

  // 12. Off-topic or general greeting fallback with dry Stark Jarvis wit
  return {
    content:
      'While I admire the curiosity, my sensors are calibrated strictly for the Groq Developer Playground—LPU inference speed, sampling dials, JSON schemas, and server-side tools. Ask me to demonstrate Temperature, Top-P, Stop Sequences, or explain anything on stage.',
    actions: [],
    followUps: getDynamicQuickAsks(store.activeConcept).slice(0, 2),
  }
}

export async function sendJarvisMessage(rawText: string): Promise<void> {
  const userText = rawText.trim()
  if (!userText) return

  const store = usePlaygroundStore.getState()
  if (store.jarvisStatus === 'thinking' || store.jarvisStatus === 'acting') {
    return
  }

  stopJarvisTurn()
  const controller = new AbortController()
  activeJarvisController = controller

  const preActionSnapshot = capturePlaygroundSnapshot()

  const userMsg: JarvisMessage = {
    id: makeMsgId('usr'),
    role: 'user',
    content: userText,
    timestamp: Date.now(),
  }

  store.addJarvisMessage(userMsg)
  store.setJarvisStatus('thinking')

  try {
    const mode = deriveAppMode(store.apiKey)
    const result =
      mode === 'live'
        ? await runLiveJarvisTurn(userText, controller.signal)
        : await runDemoJarvisTurn(userText, controller.signal)

    if (activeJarvisController !== controller || controller.signal.aborted) return

    const didMutate =
      result.didMutate ??
      result.actions.some(
        (a) => a.label !== 'Modal' && a.label !== '3D Hotspot'
      )

    const assistantMsg: JarvisMessage = {
      id: makeMsgId('jvs'),
      role: 'assistant',
      content: result.content,
      timestamp: Date.now(),
      actions: result.actions.length > 0 ? result.actions : undefined,
      preActionSnapshot: didMutate ? preActionSnapshot : undefined,
      suggestedFollowUps: result.followUps,
    }
    usePlaygroundStore.getState().addJarvisMessage(assistantMsg)
  } catch (err) {
    if (
      activeJarvisController !== controller ||
      (err instanceof DOMException && err.name === 'AbortError')
    ) {
      return
    }
    const msg =
      err instanceof Error
        ? err.message
        : 'I encountered an unexpected snag reaching Groq.'
    usePlaygroundStore.getState().addJarvisMessage({
      id: makeMsgId('jvs-err'),
      role: 'assistant',
      content: `Apologies—${msg} You can always clear the API key in Settings to use Instant Demo Mode.`,
      timestamp: Date.now(),
      suggestedFollowUps: ['Explain what I’m looking at'],
    })
  } finally {
    if (activeJarvisController === controller) {
      activeJarvisController = null
      usePlaygroundStore.getState().setJarvisStatus('standby')
    }
  }
}
