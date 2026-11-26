import { executeDemoCompletion } from '@/services/demoSimulator'
import {
  executeLiveGroqCompletion,
  GroqClientError,
  type ExecutionRequestParams,
} from '@/services/groqClient'
import { deriveAppMode, usePlaygroundStore } from '@/store/usePlaygroundStore'
import type { ExecutedToolTrace } from '@/types/playground'

let activeAbortController: AbortController | null = null
let activeRunId = 0

export function stopPlaygroundCompletion(): void {
  if (activeAbortController) {
    activeAbortController.abort()
    activeAbortController = null
  }
}

export async function runPlaygroundCompletion(): Promise<void> {
  const store = usePlaygroundStore.getState()
  if (store.userPrompt.trim().length === 0) {
    store.failExecution('Enter a prompt first before running the LPU.', null)
    return
  }

  stopPlaygroundCompletion()

  const runId = ++activeRunId
  const controller = new AbortController()
  activeAbortController = controller

  const mode = deriveAppMode(store.apiKey)
  const params: ExecutionRequestParams = {
    apiKey: store.apiKey,
    model: store.model,
    systemPrompt: store.systemPrompt,
    userPrompt: store.userPrompt,
    assistantPrefill: store.assistantPrefill,
    temperature: store.temperature,
    topP: store.topP,
    maxCompletionTokens: store.maxCompletionTokens,
    stopSequences: store.stopSequences,
    streaming: store.streaming,
    jsonMode: store.jsonMode,
    jsonSchemaName: store.jsonSchemaName,
    jsonSchemaStrict: store.jsonSchemaStrict,
    jsonSchemaText: store.jsonSchemaText,
    builtInTools: store.builtInTools,
  }

  store.beginExecution(store.assistantPrefill, mode)

  const isCurrentRun = () => activeRunId === runId

  const callbacks = {
    onFirstToken: (ttftMs: number) => {
      if (!isCurrentRun()) return
      usePlaygroundStore.getState().markStreamingStarted(ttftMs)
    },
    onDelta: (delta: string, partialTelemetry: Record<string, unknown>) => {
      if (!isCurrentRun()) return
      usePlaygroundStore.getState().appendResponseDelta(delta, partialTelemetry)
    },
    onToolsUpdate: (tools: ExecutedToolTrace[]) => {
      if (!isCurrentRun()) return
      usePlaygroundStore.getState().setExecutedTools(tools)
    },
    onReasoningUpdate: (reasoning: string | null) => {
      if (!isCurrentRun()) return
      usePlaygroundStore.getState().setReasoningTrace(reasoning)
    },
    onComplete: (finalTelemetry: Record<string, unknown>) => {
      if (!isCurrentRun()) return
      usePlaygroundStore.getState().completeExecution('completed', finalTelemetry)
    },
  }

  try {
    if (mode === 'live') {
      await executeLiveGroqCompletion(params, callbacks, controller.signal)
    } else {
      await executeDemoCompletion(params, callbacks, controller.signal)
    }
  } catch (error) {
    if (!isCurrentRun()) return

    if (error instanceof DOMException && error.name === 'AbortError') {
      usePlaygroundStore.getState().completeExecution('aborted', {
        finishReason: 'aborted',
      })
      return
    }

    if (error instanceof GroqClientError) {
      usePlaygroundStore.getState().failExecution(error.message, error.recoveryAction)
      return
    }

    const message =
      error instanceof Error
        ? error.message
        : 'Unexpected error communicating with Groq.'
    usePlaygroundStore.getState().failExecution(message, null)
  } finally {
    if (activeAbortController === controller) {
      activeAbortController = null
    }
  }
}
