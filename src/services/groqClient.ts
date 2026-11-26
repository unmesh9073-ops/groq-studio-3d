import type {
  BuiltInToolsConfig,
  ErrorRecoveryAction,
  ExecutedToolTrace,
  ExecutionTelemetryExtension,
  FinishReason,
  JsonMode,
  ModelId,
} from '@/types/playground'
import { validateJsonSchema } from '@/utils/jsonSchema'
import { sanitizeHttpUrl } from '@/utils/url'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface ExecutionRequestParams {
  apiKey: string
  model: ModelId
  systemPrompt: string
  userPrompt: string
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
}

export type GroqToolSpec = { type: 'browser_search' } | { type: 'code_interpreter' }

export type GroqResponseFormat =
  | { type: 'json_object' }
  | {
      type: 'json_schema'
      json_schema: {
        name: string
        strict: boolean
        schema: Record<string, unknown>
      }
    }

export interface GroqChatPayload {
  model: ModelId
  messages: ChatMessage[]
  temperature: number
  top_p: number
  max_completion_tokens: number
  stream: boolean
  stop?: string[]
  response_format?: GroqResponseFormat
  tools?: GroqToolSpec[]
}

export interface ExecutionCallbacks {
  onFirstToken: (ttftMs: number) => void
  onDelta: (delta: string, telemetry: Partial<ExecutionTelemetryExtension>) => void
  onToolsUpdate?: (tools: ExecutedToolTrace[]) => void
  onReasoningUpdate?: (reasoning: string | null) => void
  onComplete: (telemetry: Partial<ExecutionTelemetryExtension>) => void
}

export class GroqClientError extends Error {
  recoveryAction: ErrorRecoveryAction

  constructor(message: string, recoveryAction: ErrorRecoveryAction = null) {
    super(message)
    this.name = 'GroqClientError'
    this.recoveryAction = recoveryAction
  }
}

export function estimateTokenCount(text: string): number {
  const trimmed = text.trim()
  if (!trimmed) return 0
  return Math.max(1, Math.ceil(trimmed.length / 4))
}

export function buildGroqChatPayload(params: ExecutionRequestParams): GroqChatPayload {
  const messages: ChatMessage[] = []
  let sysText = params.systemPrompt.trim()
  const userText = params.userPrompt.trim()

  // Groq requires "json" to appear in messages when response_format is json_object
  if (
    params.jsonMode === 'json_object' &&
    !/json/i.test(sysText) &&
    !/json/i.test(userText)
  ) {
    sysText = sysText.length > 0 ? `${sysText} Respond in valid JSON.` : 'Respond in valid JSON.'
  }

  if (sysText.length > 0) {
    messages.push({ role: 'system', content: sysText })
  }

  messages.push({ role: 'user', content: userText })

  if (params.assistantPrefill.trim().length > 0) {
    messages.push({ role: 'assistant', content: params.assistantPrefill })
  }

  const payload: GroqChatPayload = {
    model: params.model,
    messages,
    temperature: params.temperature,
    top_p: params.topP,
    max_completion_tokens: params.maxCompletionTokens,
    stream: params.streaming,
  }

  if (params.stopSequences.length > 0) {
    payload.stop = params.stopSequences.slice(0, 4)
  }

  if (params.jsonMode === 'json_object') {
    payload.response_format = { type: 'json_object' }
  } else if (params.jsonMode === 'json_schema') {
    const validation = validateJsonSchema(params.jsonSchemaText, params.jsonSchemaStrict)
    if (validation.valid && validation.parsed) {
      payload.response_format = {
        type: 'json_schema',
        json_schema: {
          name: params.jsonSchemaName.trim() || 'lpu_summary',
          strict: params.jsonSchemaStrict,
          schema: validation.parsed,
        },
      }
    }
  } else if (
    params.model.startsWith('openai/gpt-oss-') &&
    (params.builtInTools.browserSearch || params.builtInTools.codeInterpreter)
  ) {
    const tools: GroqToolSpec[] = []
    if (params.builtInTools.browserSearch) tools.push({ type: 'browser_search' })
    if (params.builtInTools.codeInterpreter) tools.push({ type: 'code_interpreter' })
    payload.tools = tools
  }

  return payload
}

function mapFinishReason(rawReason: string | null | undefined): FinishReason {
  if (rawReason === 'length') return 'length'
  if (rawReason === 'stop') return 'stop'
  return 'stop'
}

function normalizeExecutedTools(rawTools: unknown): ExecutedToolTrace[] {
  if (!Array.isArray(rawTools)) return []
  const traces: ExecutedToolTrace[] = []

  for (const item of rawTools) {
    if (!item || typeof item !== 'object') continue
    const rec = item as Record<string, unknown>
    const rawType = typeof rec.type === 'string' ? rec.type : ''
    const isCode = rawType.includes('code') || rawType.includes('python')
    const type: ExecutedToolTrace['type'] = isCode ? 'code_interpreter' : 'browser_search'

    const args =
      typeof rec.arguments === 'string'
        ? rec.arguments
        : rec.arguments
          ? JSON.stringify(rec.arguments, null, 2)
          : ''

    const output =
      typeof rec.output === 'string'
        ? rec.output
        : rec.output
          ? JSON.stringify(rec.output, null, 2)
          : ''

    const searchResults = (rec.search_results as Record<string, unknown> | undefined)?.results
    const sources = Array.isArray(searchResults)
      ? searchResults
          .filter((s): s is Record<string, unknown> => Boolean(s && typeof s === 'object'))
          .slice(0, 4)
          .map((s) => ({
            title: typeof s.title === 'string' && s.title.trim() ? s.title.trim() : 'Source',
            url: sanitizeHttpUrl(s.url),
          }))
      : undefined

    traces.push({
      type,
      title: isCode ? 'Python Sandbox' : 'Browser Search',
      input: args || (isCode ? 'Executed Python snippet' : 'Web query'),
      output: output || 'Completed tool execution.',
      sources,
    })
  }

  return traces
}

function buildFriendlyHttpError(status: number, model: ModelId, rawBody: string): GroqClientError {
  if (status === 401) {
    return new GroqClientError(
      'Your Groq API key was rejected (401 Unauthorized). Check your key in Settings or switch back to Instant Demo Mode.',
      'open-settings'
    )
  }

  if (status === 429) {
    return new GroqClientError(
      'Groq Free Tier rate limit reached (429 RPM/TPM). Wait a few seconds and retry, or switch to Demo Mode.',
      'switch-demo'
    )
  }

  if ((status === 403 || status === 404) && model.startsWith('llama-')) {
    return new GroqClientError(
      `${model} requires Enterprise access on GroqCloud. Switch to openai/gpt-oss-120b to run immediately on Free / Dev Ready.`,
      'switch-default-model'
    )
  }

  let detail = `Groq API returned HTTP ${status}.`
  try {
    const parsed = JSON.parse(rawBody) as { error?: { message?: string } }
    if (parsed?.error?.message) {
      detail = parsed.error.message
    }
  } catch {
    // Use default detail
  }

  return new GroqClientError(detail, null)
}

interface GroqUsageShape {
  prompt_tokens?: number
  completion_tokens?: number
  completion_time?: number
}

interface GroqStreamChunk {
  choices?: Array<{
    delta?: {
      content?: string
      reasoning?: string
      reasoning_content?: string
      executed_tools?: unknown[]
    }
    finish_reason?: string | null
  }>
  usage?: GroqUsageShape
  x_groq?: { usage?: GroqUsageShape }
}

interface GroqJsonCompletion {
  choices?: Array<{
    message?: {
      content?: string
      reasoning?: string
      reasoning_content?: string
      executed_tools?: unknown[]
    }
    finish_reason?: string | null
  }>
  usage?: GroqUsageShape
  x_groq?: { usage?: GroqUsageShape }
}

export async function executeLiveGroqCompletion(
  params: ExecutionRequestParams,
  callbacks: ExecutionCallbacks,
  signal: AbortSignal
): Promise<void> {
  const payload = buildGroqChatPayload(params)
  const requestStart = performance.now()

  const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${params.apiKey.trim()}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
    signal,
  })

  if (!response.ok) {
    const bodyText = await response.text().catch(() => '')
    throw buildFriendlyHttpError(response.status, params.model, bodyText)
  }

  const estimatedPromptTokens =
    estimateTokenCount(params.systemPrompt) +
    estimateTokenCount(params.userPrompt) +
    estimateTokenCount(params.assistantPrefill) +
    8

  if (!params.streaming) {
    const data = (await response.json()) as GroqJsonCompletion
    const totalTimeMs = Math.round(performance.now() - requestStart)
    const msg = data.choices?.[0]?.message
    const content = msg?.content ?? ''
    const usage = data.x_groq?.usage ?? data.usage
    const completionTokens = usage?.completion_tokens ?? estimateTokenCount(content)
    const promptTokens = usage?.prompt_tokens ?? estimatedPromptTokens
    const finishReason = mapFinishReason(data.choices?.[0]?.finish_reason)
    const tps =
      usage?.completion_time && usage.completion_time > 0
        ? Math.round(completionTokens / usage.completion_time)
        : Math.round((completionTokens / Math.max(1, totalTimeMs)) * 1000)

    const tools = normalizeExecutedTools(msg?.executed_tools)
    if (tools.length > 0) callbacks.onToolsUpdate?.(tools)
    const reasoning = msg?.reasoning ?? msg?.reasoning_content ?? null
    if (reasoning) callbacks.onReasoningUpdate?.(reasoning)

    callbacks.onFirstToken(totalTimeMs)
    callbacks.onDelta(content, {
      promptTokens,
      completionTokens,
      tokensPerSecond: tps,
    })
    callbacks.onComplete({
      ttftMs: totalTimeMs,
      totalTimeMs,
      promptTokens,
      completionTokens,
      tokensPerSecond: tps,
      finishReason,
      triggeredStopSequence: null,
      source: 'live',
    })
    return
  }

  if (!response.body) {
    throw new GroqClientError('Streaming response body was empty.', null)
  }

  const reader = response.body.getReader()
  const decoder = new TextDecoder('utf-8')
  let buffer = ''
  let accumulated = ''
  let accumulatedReasoning = ''
  const accumulatedTools: ExecutedToolTrace[] = []
  let firstTokenTime: number | null = null
  let serverUsage: GroqUsageShape | undefined
  let finalFinishReason: FinishReason = 'stop'

  const processSseLine = (rawLine: string) => {
    const line = rawLine.trim()
    if (!line || !line.startsWith('data:')) return
    const dataStr = line.slice(5).trim()
    if (dataStr === '[DONE]') return

    let chunk: GroqStreamChunk
    try {
      chunk = JSON.parse(dataStr) as GroqStreamChunk
    } catch {
      return
    }

    const usage = chunk.x_groq?.usage ?? chunk.usage
    if (usage) serverUsage = usage

    const choice = chunk.choices?.[0]
    if (choice?.finish_reason) {
      finalFinishReason = mapFinishReason(choice.finish_reason)
    }

    const deltaTools = choice?.delta?.executed_tools
    if (deltaTools && deltaTools.length > 0) {
      const normalized = normalizeExecutedTools(deltaTools)
      if (normalized.length > 0) {
        accumulatedTools.push(...normalized)
        callbacks.onToolsUpdate?.([...accumulatedTools])
      }
    }

    const reasoningChunk = choice?.delta?.reasoning ?? choice?.delta?.reasoning_content
    if (reasoningChunk) {
      accumulatedReasoning += reasoningChunk
      callbacks.onReasoningUpdate?.(accumulatedReasoning)
    }

    const delta = choice?.delta?.content
    if (delta && delta.length > 0) {
      const now = performance.now()
      if (firstTokenTime === null) {
        firstTokenTime = now
        callbacks.onFirstToken(now - requestStart)
      }
      accumulated += delta
      const estCompletion = estimateTokenCount(accumulated)
      const elapsedSec = Math.max(0.015, (now - firstTokenTime) / 1000)
      const liveTps = Math.round(estCompletion / elapsedSec)

      callbacks.onDelta(delta, {
        promptTokens: serverUsage?.prompt_tokens ?? estimatedPromptTokens,
        completionTokens: serverUsage?.completion_tokens ?? estCompletion,
        tokensPerSecond: liveTps,
      })
    }
  }

  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break

      buffer += decoder.decode(value, { stream: true })
      const lines = buffer.split('\n')
      buffer = lines.pop() ?? ''

      for (const rawLine of lines) {
        processSseLine(rawLine)
      }
    }

    buffer += decoder.decode()
    if (buffer.trim().length > 0) {
      processSseLine(buffer)
    }
  } finally {
    reader.releaseLock()
  }

  const totalTimeMs = Math.round(performance.now() - requestStart)
  const ttftMs = firstTokenTime !== null ? Math.round(firstTokenTime - requestStart) : totalTimeMs
  const completionTokens = serverUsage?.completion_tokens ?? estimateTokenCount(accumulated)
  const promptTokens = serverUsage?.prompt_tokens ?? estimatedPromptTokens
  const decodeSec =
    serverUsage?.completion_time && serverUsage.completion_time > 0
      ? serverUsage.completion_time
      : Math.max(0.02, (totalTimeMs - ttftMs) / 1000)

  callbacks.onComplete({
    ttftMs,
    totalTimeMs,
    promptTokens,
    completionTokens,
    tokensPerSecond: Math.round(completionTokens / decodeSec),
    finishReason: finalFinishReason,
    triggeredStopSequence: null,
    source: 'live',
  })
}
