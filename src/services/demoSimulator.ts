import { getModelById } from '@/data/concepts'
import {
  estimateTokenCount,
  type ExecutionCallbacks,
  type ExecutionRequestParams,
} from '@/services/groqClient'
import type { ExecutedToolTrace, FinishReason } from '@/types/playground'
import { generateSampleJsonFromSchema } from '@/utils/jsonSchema'

function sleepWithAbort(ms: number, signal: AbortSignal): Promise<void> {
  if (signal.aborted) {
    return Promise.reject(new DOMException('Aborted', 'AbortError'))
  }
  return new Promise((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', onAbort)
      resolve()
    }, ms)

    function onAbort() {
      window.clearTimeout(timer)
      reject(new DOMException('Aborted', 'AbortError'))
    }

    signal.addEventListener('abort', onAbort, { once: true })
  })
}

function buildSimulatedToolTraces(params: ExecutionRequestParams): ExecutedToolTrace[] {
  const traces: ExecutedToolTrace[] = []
  if (params.builtInTools.browserSearch) {
    traces.push({
      type: 'browser_search',
      title: 'Browser Search',
      input: 'query: "Groq GPT-OSS 120B LPU throughput tok/s benchmark"',
      output:
        'Found GroqCloud model specs: openai/gpt-oss-120b averages ~500 tok/s on Groq LPU on-chip SRAM; 1 word ≈ 1.33 tokens.',
      sources: [
        { title: 'GroqCloud Models', url: 'https://console.groq.com/docs/models' },
        { title: 'Groq LPU Architecture', url: 'https://groq.com' },
      ],
    })
  }
  if (params.builtInTools.codeInterpreter) {
    traces.push({
      type: 'code_interpreter',
      title: 'Python Sandbox',
      input: [
        'tps = 500',
        'tokens_per_summary = 150 * 1.33  # ~200 tokens',
        'total_tokens_10s = tps * 10',
        'summaries = total_tokens_10s / tokens_per_summary',
        'print(f"{total_tokens_10s} tokens -> {summaries:.1f} summaries")',
      ].join('\n'),
      output: '5000 tokens -> 25.0 summaries',
    })
  }
  return traces
}

function generateSimulatedText(params: ExecutionRequestParams): string {
  if (params.jsonMode === 'json_schema') {
    return generateSampleJsonFromSchema(params.jsonSchemaText, params.userPrompt)
  }

  if (params.jsonMode === 'json_object') {
    return JSON.stringify(
      {
        mode: 'json_object',
        topic: 'Groq LPU Streaming',
        summary:
          'Deterministic on-chip SRAM execution eliminates memory stalls for sub-200ms TTFT.',
        valid: true,
      },
      null,
      2
    )
  }

  if (params.builtInTools.browserSearch || params.builtInTools.codeInterpreter) {
    if (params.builtInTools.browserSearch && params.builtInTools.codeInterpreter) {
      return (
        'Based on live GroqCloud benchmarks, `openai/gpt-oss-120b` runs at roughly **500 tokens/sec** on Groq LPUs. ' +
        'In 10 seconds, that produces **5,000 tokens**—and at ~200 tokens per 150-word summary, the Python sandbox calculated **25 complete summaries** in a single 10-second window.'
      )
    }
    if (params.builtInTools.browserSearch) {
      return (
        'Live search confirms that `openai/gpt-oss-120b` averages ~500 tokens/sec on GroqCloud, while `openai/gpt-oss-20b` reaches ~1,000 tokens/sec using deterministic on-chip SRAM.'
      )
    }
    return (
      'Python sandbox execution verified the math: at 500 tokens/sec over 10 seconds (5,000 tokens), the LPU outputs **25 summaries** of ~150 words each.'
    )
  }

  const promptLower = params.userPrompt.toLowerCase()
  const prefill = params.assistantPrefill.trim()
  const temp = params.temperature
  const topP = params.topP
  const tightNucleus = topP < 0.5

  // 1. Assistant Prefill continuation
  if (prefill.length > 0) {
    if (prefill.includes('"summary"')) {
      return (
        'Groq LPUs execute each transformer layer deterministically on ultra-fast on-chip SRAM, ' +
        'eliminating external memory stalls for sub-second streaming.", ' +
        '"key_advantage": "predictable_sram_throughput" }'
      )
    }
    if (temp <= 0.3 || tightNucleus) {
      return ' deterministic SRAM execution keeps every token step aligned with zero batching overhead.'
    }
    return ' the LPU streams tokens straight from on-chip memory, turning prefill framing into instant structured output.'
  }

  // 2. Coffee / Step-by-step prompts (for Stop Sequence Cut demo)
  if (
    promptLower.includes('pour-over') ||
    promptLower.includes('step 1') ||
    params.stopSequences.some((seq) => seq.toLowerCase().includes('step'))
  ) {
    return [
      'Step 1: Rinse the paper filter with hot water to preheat your dripper and remove papery taste.',
      'Step 2: Add 20g of medium-fine ground coffee and pour 40g of water to bloom for 35 seconds.',
      'Step 3: Slowly spiral-pour the remaining water up to 320g in steady circular passes.',
      'Step 4: Let the bed drain cleanly around 2:45 and serve immediately.',
    ].join('\n\n')
  }

  // 3. Mars sunrise / creative contrast prompts (Temperature & Top-P demo)
  if (promptLower.includes('mars') || promptLower.includes('sunrise')) {
    if (tightNucleus) {
      return (
        'Pale rose light crosses the glass domes of Mars at dawn. ' +
        'Solar panels wake along the ridge while dust settles in the cold air. ' +
        'With Top-P narrowed, only the highest-probability words pass through the filter.'
      )
    }
    if (temp <= 0.35) {
      return (
        'At Martian dawn, pale blue-amber sunlight refracts through pressurized silicate domes. ' +
        'Thermal regulators warm the outer glass skin while thin red dust settles across the valley floor. ' +
        'Low temperature keeps the description factual, steady, and repeatable.'
      )
    }
    if (temp <= 1.1) {
      return (
        'First light spills over Jezero’s rim, turning the city’s geodesic glass domes into glowing amber lanterns. ' +
        'Inside the concourse, morning mist clings to hydroponic ferns while commuters watch pink dust drift outside. ' +
        'A quiet hum of solar turbines marks another Martian morning.'
      )
    }
    return (
      'A tangerine comet of dawn cracks open the Martian frost, painting sky-cathedrals in electric marmalade and stardust! ' +
      'Glass spires sing like tuned crystal goblets as sleepy rover-taxis tiptoe across cinnamon dunes, chasing wild violet shadows. ' +
      'Even the gravity feels poetic—half dream, half kaleidoscope, spinning wild metaphors at high temperature!'
    )
  }

  // 4. Default / LPU Speed Demo & general prompts
  if (tightNucleus) {
    return (
      'Groq LPUs store model weights and run math directly inside fast on-chip SRAM. ' +
      'Because there is no slow external memory trip between tokens, output streams at steady high speed. ' +
      'Narrow Top-P keeps word selection crisp and tightly focused.'
    )
  }

  if (temp <= 0.35) {
    return (
      '1. Deterministic hardware scheduling eliminates GPU thread contention and batching delays.\n' +
      '2. On-chip SRAM keeps weights close to compute units, avoiding HBM memory bandwidth bottlenecks.\n' +
      '3. Sequential tokens stream immediately, delivering consistent low Time-to-First-Token (TTFT).'
    )
  }

  if (temp <= 1.1) {
    return (
      'Traditional GPUs constantly shuttle huge model weights back and forth from external memory, which slows down every single word. ' +
      'Groq’s Language Processing Unit keeps computation on ultra-fast on-chip SRAM with a compiler-scheduled, deterministic pipeline. ' +
      'That means your answer starts in milliseconds and streams smoothly at hundreds of tokens per second.'
    )
  }

  return (
    'Imagine an express bullet train where every single rail switch was choreographed before departure—zero traffic lights, zero hesitation! ' +
    'While conventional GPUs juggle chaotic memory errands, the Groq LPU dances through on-chip SRAM like a lightning conductor spinning pure syntax. ' +
    'Raise the temperature dial and watch each token leap sideways into vibrant, unexpected constellations of language!'
  )
}

function tokenizeForStream(text: string): string[] {
  const tokens = text.match(/\S+\s*|\n+/g)
  return tokens && tokens.length > 0 ? tokens : [text]
}

export async function executeDemoCompletion(
  params: ExecutionRequestParams,
  callbacks: ExecutionCallbacks,
  signal: AbortSignal
): Promise<void> {
  const modelMeta = getModelById(params.model)
  const requestStart = performance.now()
  const promptTokens =
    estimateTokenCount(params.systemPrompt) +
    estimateTokenCount(params.userPrompt) +
    estimateTokenCount(params.assistantPrefill) +
    8

  const toolTraces =
    params.jsonMode === 'off' ? buildSimulatedToolTraces(params) : []
  const fullText = generateSimulatedText(params)
  const simulatedTtft = Math.round(95 + (1000 / modelMeta.nominalTps) * 28)

  if (!params.streaming) {
    const batchWaitMs = Math.round(simulatedTtft + 340 + (1000 / modelMeta.nominalTps) * 90)
    await sleepWithAbort(batchWaitMs, signal)

    if (toolTraces.length > 0) {
      callbacks.onToolsUpdate?.(toolTraces)
      callbacks.onReasoningUpdate?.(
        'Selected server-side tools to gather verified benchmarks and run exact arithmetic before composing the final answer.'
      )
    }

    let output = fullText
    let finishReason: FinishReason = 'stop'
    let triggeredStop: string | null = null

    for (const seq of params.stopSequences) {
      const idx = output.indexOf(seq)
      if (idx !== -1) {
        output = output.slice(0, idx)
        finishReason = 'stop_sequence'
        triggeredStop = seq
        break
      }
    }

    const tokenPieces = tokenizeForStream(output)
    let completionTokens = tokenPieces.length
    if (completionTokens > params.maxCompletionTokens) {
      output = tokenPieces.slice(0, params.maxCompletionTokens).join('')
      completionTokens = params.maxCompletionTokens
      finishReason = 'length'
      triggeredStop = null
    }

    const totalTimeMs = Math.round(performance.now() - requestStart)
    callbacks.onFirstToken(totalTimeMs)
    callbacks.onDelta(output, {
      promptTokens,
      completionTokens,
      tokensPerSecond: modelMeta.nominalTps,
    })
    callbacks.onComplete({
      ttftMs: totalTimeMs,
      totalTimeMs,
      promptTokens,
      completionTokens,
      tokensPerSecond: modelMeta.nominalTps,
      finishReason,
      triggeredStopSequence: triggeredStop,
      source: 'demo',
    })
    return
  }

  await sleepWithAbort(simulatedTtft, signal)
  const ttftMs = Math.round(performance.now() - requestStart)
  callbacks.onFirstToken(ttftMs)

  // Stream simulated server-side tool traces sequentially before final answer
  if (toolTraces.length > 0) {
    callbacks.onReasoningUpdate?.(
      'Planning server-side tool calls on Groq LPU: gathering facts via Browser Search and verifying numbers in the Python Sandbox.'
    )
    const activeTools: ExecutedToolTrace[] = []
    for (const trace of toolTraces) {
      activeTools.push(trace)
      callbacks.onToolsUpdate?.([...activeTools])
      await sleepWithAbort(140, signal)
    }
  }

  const pieces = tokenizeForStream(fullText)
  let accumulated = ''
  let completionTokens = 0
  let finishReason: FinishReason = 'stop'
  let triggeredStop: string | null = null

  const chunkSize = modelMeta.nominalTps >= 800 ? 2 : 1
  const intervalMs = Math.max(14, Math.round(28 * (500 / modelMeta.nominalTps)))

  for (let i = 0; i < pieces.length; i += chunkSize) {
    const batch = pieces.slice(i, i + chunkSize)

    for (const piece of batch) {
      if (completionTokens >= params.maxCompletionTokens) {
        finishReason = 'length'
        break
      }

      const candidate = accumulated + piece

      let matchedSeq: string | null = null
      let earliestIndex = -1
      for (const seq of params.stopSequences) {
        const idx = candidate.indexOf(seq)
        if (idx !== -1 && (earliestIndex === -1 || idx < earliestIndex)) {
          earliestIndex = idx
          matchedSeq = seq
        }
      }

      if (matchedSeq !== null && earliestIndex !== -1) {
        const allowedSlice = candidate.slice(accumulated.length, earliestIndex)
        if (allowedSlice.length > 0) {
          accumulated += allowedSlice
          completionTokens += 1
          callbacks.onDelta(allowedSlice, {
            promptTokens,
            completionTokens,
            tokensPerSecond: modelMeta.nominalTps,
          })
        }
        finishReason = 'stop_sequence'
        triggeredStop = matchedSeq
        break
      }

      accumulated = candidate
      completionTokens += 1
      callbacks.onDelta(piece, {
        promptTokens,
        completionTokens,
        tokensPerSecond: modelMeta.nominalTps,
      })
    }

    if (finishReason !== 'stop') break
    await sleepWithAbort(intervalMs, signal)
  }

  const totalTimeMs = Math.round(performance.now() - requestStart)
  callbacks.onComplete({
    ttftMs,
    totalTimeMs,
    promptTokens,
    completionTokens,
    tokensPerSecond: modelMeta.nominalTps,
    finishReason,
    triggeredStopSequence: triggeredStop,
    source: 'demo',
  })
}
