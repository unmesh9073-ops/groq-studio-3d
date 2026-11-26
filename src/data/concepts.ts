import type {
  ConceptId,
  ConceptMetadata,
  ExperimentPreset,
  HotspotMetadata,
  JsonSchemaTemplate,
  ModelCatalogItem,
  ModelId,
} from '@/types/playground'
import { DEFAULT_JSON_SCHEMA_TEXT } from '@/utils/jsonSchema'

export const MODEL_CATALOG: ModelCatalogItem[] = [
  {
    id: 'openai/gpt-oss-120b',
    label: 'GPT-OSS 120B',
    provider: 'OpenAI OSS',
    tier: 'Free / Dev Ready',
    shortTier: 'Free/Dev',
    nominalTps: 500,
    supportsBuiltInTools: true,
    summary: 'Deep reasoning, structured outputs, and built-in tools.',
    contextWindow: 131072,
  },
  {
    id: 'openai/gpt-oss-20b',
    label: 'GPT-OSS 20B',
    provider: 'OpenAI OSS',
    tier: 'Free / Dev Ready',
    shortTier: 'Free/Dev',
    nominalTps: 1000,
    supportsBuiltInTools: true,
    summary: 'Ultra-low-latency reasoning and built-in tools.',
    contextWindow: 131072,
  },
  {
    id: 'qwen/qwen3.8-27b',
    label: 'Qwen 3.8 27B',
    provider: 'Alibaba Cloud',
    tier: 'Preview · Free / Dev',
    shortTier: 'Preview',
    nominalTps: 450,
    supportsBuiltInTools: false,
    summary: 'Precision multilingual logic and strict schema adherence.',
    contextWindow: 131072,
  },
  {
    id: 'llama-3.3-70b-versatile',
    label: 'Llama 3.3 70B Versatile',
    provider: 'Meta',
    tier: 'Enterprise',
    shortTier: 'Enterprise',
    nominalTps: 280,
    supportsBuiltInTools: false,
    summary: 'Strong general-purpose writing, coding, and tool use.',
    contextWindow: 131072,
  },
  {
    id: 'llama-3.1-8b-instant',
    label: 'Llama 3.1 8B Instant',
    provider: 'Meta',
    tier: 'Enterprise',
    shortTier: 'Enterprise',
    nominalTps: 560,
    supportsBuiltInTools: false,
    summary: 'High-throughput model for snappy classification and lightweight chat.',
    contextWindow: 131072,
  },
]

export const JSON_SCHEMA_TEMPLATES: JsonSchemaTemplate[] = [
  {
    id: 'concept-card',
    label: 'Concept Card',
    name: 'lpu_summary',
    schemaText: DEFAULT_JSON_SCHEMA_TEXT,
  },
  {
    id: 'sentiment-analysis',
    label: 'Sentiment Analysis',
    name: 'sentiment_report',
    schemaText: JSON.stringify(
      {
        type: 'object',
        properties: {
          sentiment: { type: 'string', description: 'positive, neutral, or negative' },
          confidence: { type: 'number', description: 'Confidence score from 0 to 1' },
          keywords: {
            type: 'array',
            items: { type: 'string' },
            description: 'Key emotional phrases',
          },
        },
        required: ['sentiment', 'confidence', 'keywords'],
        additionalProperties: false,
      },
      null,
      2
    ),
  },
  {
    id: 'product-specs',
    label: 'Product Specs',
    name: 'product_specs',
    schemaText: JSON.stringify(
      {
        type: 'object',
        properties: {
          product_name: { type: 'string' },
          price_usd: { type: 'number' },
          in_stock: { type: 'boolean' },
          highlights: {
            type: 'array',
            items: { type: 'string' },
          },
        },
        required: ['product_name', 'price_usd', 'in_stock', 'highlights'],
        additionalProperties: false,
      },
      null,
      2
    ),
  },
]

export const EXPERIMENT_PRESETS: ExperimentPreset[] = [
  {
    id: 'lpu-speed',
    label: 'LPU Speed Demo',
    hint: 'See deterministic on-chip SRAM streaming in action.',
    userPrompt:
      'In 3 crisp sentences, explain to a beginner why Groq LPUs generate tokens so much faster than traditional GPUs.',
    systemPrompt: 'You are a helpful, concise AI assistant.',
    assistantPrefill: '',
    temperature: 0.5,
    topP: 1.0,
    maxCompletionTokens: 512,
    stopSequences: [],
    streaming: true,
    jsonMode: 'off',
    builtInTools: { browserSearch: false, codeInterpreter: false },
  },
  {
    id: 'temp-contrast',
    label: 'Temp 0.1 vs 1.8',
    hint: 'Try running at 1.80, then slide Temperature down to 0.10 to compare.',
    userPrompt: 'Describe a sunrise over a glass city on Mars in three vivid sentences.',
    systemPrompt: 'You are a helpful, concise AI assistant.',
    assistantPrefill: '',
    temperature: 1.8,
    topP: 1.0,
    maxCompletionTokens: 512,
    stopSequences: [],
    streaming: true,
    jsonMode: 'off',
    builtInTools: { browserSearch: false, codeInterpreter: false },
  },
  {
    id: 'prefill-hack',
    label: 'Prefill Hack',
    hint: 'Forces the assistant to continue straight from `{ "summary": "` with zero preamble.',
    userPrompt:
      'Summarize how Groq LPU deterministic execution eliminates memory bandwidth bottlenecks.',
    systemPrompt: 'Respond concisely with valid JSON.',
    assistantPrefill: '{ "summary": "',
    temperature: 0.3,
    topP: 1.0,
    maxCompletionTokens: 256,
    stopSequences: [],
    streaming: true,
    jsonMode: 'off',
    builtInTools: { browserSearch: false, codeInterpreter: false },
  },
  {
    id: 'stop-sequence-cut',
    label: 'Stop Sequence Cut',
    hint: 'Halts decoding the instant "Step 3" appears.',
    userPrompt:
      'Write a 4-step beginner checklist for brewing pour-over coffee, labeled Step 1, Step 2, Step 3, and Step 4.',
    systemPrompt: 'You are a helpful, concise AI assistant.',
    assistantPrefill: '',
    temperature: 0.4,
    topP: 1.0,
    maxCompletionTokens: 512,
    stopSequences: ['Step 3'],
    streaming: true,
    jsonMode: 'off',
    builtInTools: { browserSearch: false, codeInterpreter: false },
  },
  {
    id: 'strict-json-extract',
    label: 'Strict JSON Extract',
    hint: 'Switches to JSON Schema mode and extracts a strict typed Concept Card.',
    conceptId: 'structured-json',
    userPrompt:
      'Extract a concise concept card summarizing why Groq LPU deterministic on-chip SRAM delivers ultra-fast streaming.',
    systemPrompt: 'Extract structured JSON matching the provided schema.',
    assistantPrefill: '',
    temperature: 0.2,
    topP: 1.0,
    maxCompletionTokens: 512,
    stopSequences: [],
    streaming: true,
    jsonMode: 'json_schema',
    builtInTools: { browserSearch: false, codeInterpreter: false },
  },
  {
    id: 'lpu-tool-agent',
    label: 'LPU Tool Agent',
    hint: 'Enables Browser Search + Code Execution on gpt-oss-120b inside one API call.',
    conceptId: 'built-in-tools',
    model: 'openai/gpt-oss-120b',
    userPrompt:
      'Look up Groq GPT-OSS 120B nominal throughput and use Python to calculate how many 150-word summaries it can generate in 10 seconds.',
    systemPrompt:
      'Use browser search for facts and code interpreter for exact math, then give a concise final answer.',
    assistantPrefill: '',
    temperature: 0.4,
    topP: 1.0,
    maxCompletionTokens: 512,
    stopSequences: [],
    streaming: true,
    jsonMode: 'off',
    builtInTools: { browserSearch: true, codeInterpreter: true },
  },
]

export const CONCEPT_LENSES: ConceptMetadata[] = [
  {
    id: 'lpu-pipeline',
    label: 'LPU Pipeline',
    shortLabel: 'LPU Pipeline',
    tagline: 'Deterministic SRAM execution vs. batched GPU waits',
    previewSummary:
      'Watch input tokens travel into Groq’s deterministic LPU core and stream out sequentially at hundreds of tokens per second.',
    accentHex: '#22D3EE',
    cameraPosition: [0, 2.3, 9.6],
    cameraTarget: [0, 0.15, 0],
    phaseAvailable: true,
  },
  {
    id: 'prompt-roles',
    label: 'Roles & Prefill',
    shortLabel: 'Roles & Prefill',
    tagline: 'System, user, and assistant framing before generation starts',
    previewSummary:
      'Inspect how system rules steer behavior and how an assistant prefill locks the opening tokens of a reply.',
    accentHex: '#38BDF8',
    cameraPosition: [-0.8, 2.3, 9.4],
    cameraTarget: [0, 0.15, 0],
    phaseAvailable: true,
  },
  {
    id: 'temperature',
    label: 'Temperature',
    shortLabel: 'Temperature',
    tagline: 'Reshaping next-token probabilities from rigid to creative',
    previewSummary:
      'Explore how raising temperature flattens probability peaks so unexpected tokens get chosen more often.',
    accentHex: '#F59E0B',
    cameraPosition: [0.6, 2.5, 9.2],
    cameraTarget: [0, 0.35, 0],
    phaseAvailable: true,
  },
  {
    id: 'top-p',
    label: 'Top-P',
    shortLabel: 'Top-P',
    tagline: 'Nucleus sampling cutoff across ranked candidate tokens',
    previewSummary:
      'See how Top-P dynamically trims the long tail of unlikely words while keeping natural phrasing intact.',
    accentHex: '#0EA5E9',
    cameraPosition: [-0.4, 2.3, 9.3],
    cameraTarget: [0, 0.35, 0],
    phaseAvailable: true,
  },
  {
    id: 'tokens-limits',
    label: 'Token Limits',
    shortLabel: 'Token Limits',
    tagline: 'Context window budget, max completion tokens, and stop strings',
    previewSummary:
      'Visualize how prompt length, output caps, and stop sequences bound every generation run.',
    accentHex: '#10B981',
    cameraPosition: [0.5, 2.4, 9.5],
    cameraTarget: [0, 0.15, 0],
    phaseAvailable: true,
  },
  {
    id: 'structured-json',
    label: 'JSON Schema',
    shortLabel: 'JSON Schema',
    tagline: 'Constrained decoding that guarantees valid machine-readable syntax',
    previewSummary:
      'Discover how JSON Object and JSON Schema modes mask invalid tokens at every decoding step.',
    accentHex: '#06B6D4',
    cameraPosition: [0.2, 2.4, 9.5],
    cameraTarget: [0, 0.15, 0],
    phaseAvailable: true,
  },
  {
    id: 'built-in-tools',
    label: 'Built-In Tools',
    shortLabel: 'Built-In Tools',
    tagline: 'Live Browser Search and Code Interpreter execution loops',
    previewSummary:
      'Follow how the model pauses token output to run live web search or sandboxed Python code, then resumes.',
    accentHex: '#F97316',
    cameraPosition: [-0.4, 2.3, 9.6],
    cameraTarget: [-0.2, 0.15, 0],
    phaseAvailable: true,
  },
]

export const CONCEPT_HOTSPOTS: Record<ConceptId, HotspotMetadata[]> = {
  'lpu-pipeline': [
    {
      id: 'input-emitter',
      stepNumber: 1,
      title: 'Input Prompt Emitter',
      shortLabel: 'Input Prompt',
      anchorPosition: [-3.05, 1.42, 0],
      cameraPosition: [-3.35, 1.85, 6.7],
      cameraTarget: [-2.65, 0.1, 0],
      explanation:
        'Your prompt is sliced into numbered pieces called tokens and routed straight toward the processor. With Streaming enabled, token packets flow continuously instead of pausing for large batches.',
      accent: 'sky',
    },
    {
      id: 'lpu-core',
      stepNumber: 2,
      title: 'Groq LPU Deterministic Core',
      shortLabel: 'Groq LPU Core',
      anchorPosition: [0, 1.92, 0],
      cameraPosition: [-0.75, 2.05, 6.8],
      cameraTarget: [-0.55, 0.15, 0],
      explanation:
        'Unlike GPUs that constantly fetch data from slower external memory, Groq’s LPU runs token math on ultra-fast on-chip SRAM with predictable timing. Raising Temperature shifts the core warmer and widens its creative orbital spread.',
      accent: 'amber',
    },
    {
      id: 'output-stream',
      stepNumber: 3,
      title: 'Output Token Stream',
      shortLabel: 'Output Stream',
      anchorPosition: [3.05, 1.42, 0],
      cameraPosition: [2.45, 1.85, 6.7],
      cameraTarget: [1.95, 0.1, 0],
      explanation:
        'Generated tokens arrive sequentially at the prism array and assemble into words before your eyes. Switching Streaming off holds the completed tokens together and delivers them in a single burst.',
      accent: 'cyan',
    },
  ],
  'prompt-roles': [
    {
      id: 'roles-system',
      stepNumber: 1,
      title: 'System Prompt Lens',
      shortLabel: 'System Prompt',
      anchorPosition: [0, 2.25, 0],
      cameraPosition: [-0.4, 2.5, 6.9],
      cameraTarget: [0, 0.85, 0],
      explanation:
        'The System message sits above the conversation like an optical lens, setting rules, tone, and constraints before the user speaks. Every token generated below passes through its framing.',
      accent: 'sky',
    },
    {
      id: 'roles-user',
      stepNumber: 2,
      title: 'User Prompt Beam',
      shortLabel: 'User Prompt',
      anchorPosition: [-2.65, 1.35, 0],
      cameraPosition: [-2.4, 1.8, 6.7],
      cameraTarget: [-1.4, 0.25, 0],
      explanation:
        'Your User message supplies the actual question or task to solve. Its tokens travel through the System lens so the LPU blends your request with your standing instructions.',
      accent: 'cyan',
    },
    {
      id: 'roles-prefill',
      stepNumber: 3,
      title: 'Assistant Prefill Launch Rail',
      shortLabel: 'Assistant Prefill',
      anchorPosition: [2.55, 1.35, 0],
      cameraPosition: [2.1, 1.8, 6.7],
      cameraTarget: [1.5, 0.25, 0],
      explanation:
        'An Assistant Prefill places opening tokens directly at the start of the AI’s reply, locking the format before generation begins. Try the Prefill Hack preset to skip polite chatter and jump straight into JSON.',
      accent: 'amber',
    },
  ],
  temperature: [
    {
      id: 'temp-peak',
      stepNumber: 1,
      title: 'Deterministic Peak',
      shortLabel: 'Deterministic Peak',
      anchorPosition: [-2.65, 2.35, 0.3],
      cameraPosition: [-2.1, 2.2, 6.8],
      cameraTarget: [-1.5, 0.55, 0],
      explanation:
        'At Temperature near 0, the highest-scoring token ("fast") dominates nearly 100% of the probability mass. Every run picks the exact same predictable word.',
      accent: 'cyan',
    },
    {
      id: 'temp-curve',
      stepNumber: 2,
      title: 'Softmax Sampling Curve',
      shortLabel: 'Sampling Curve',
      anchorPosition: [0, 2.05, -0.35],
      cameraPosition: [0, 2.3, 7.2],
      cameraTarget: [0, 0.5, 0],
      explanation:
        'Temperature divides the model’s raw scores before converting them into probabilities. Raising the slider flattens the curve so runner-up synonyms compete more evenly.',
      accent: 'sky',
    },
    {
      id: 'temp-tail',
      stepNumber: 3,
      title: 'Creative Wild Tail',
      shortLabel: 'Wild Tail',
      anchorPosition: [2.65, 1.6, 0.3],
      cameraPosition: [2.1, 2.0, 6.8],
      cameraTarget: [1.4, 0.4, 0],
      explanation:
        'Unlikely words like "cosmic" or "banana" stay near zero at low temperature. Crank Temperature toward 2.0 and these long-tail pillars rise into contention, sparking surprising metaphors.',
      accent: 'amber',
    },
  ],
  'top-p': [
    {
      id: 'topp-core',
      stepNumber: 1,
      title: 'Core Candidate Pool',
      shortLabel: 'Core Probability',
      anchorPosition: [-2.3, 2.25, 0],
      cameraPosition: [-1.8, 2.1, 6.8],
      cameraTarget: [-1.2, 0.5, 0],
      explanation:
        'Candidate words are ranked left-to-right from most likely to least likely. Top-P adds their probabilities from the left until the cumulative total reaches your threshold.',
      accent: 'cyan',
    },
    {
      id: 'topp-curtain',
      stepNumber: 2,
      title: 'Nucleus Cutoff Curtain',
      shortLabel: 'Nucleus Cutoff',
      anchorPosition: [0.35, 2.45, 0.2],
      cameraPosition: [0.2, 2.2, 7.0],
      cameraTarget: [0.2, 0.5, 0],
      explanation:
        'This glass curtain marks the exact cumulative probability boundary set by Top-P. Lowering Top-P slides the curtain left to tighten focus even when Temperature is high.',
      accent: 'amber',
    },
    {
      id: 'topp-tail',
      stepNumber: 3,
      title: 'Pruned Long Tail',
      shortLabel: 'Pruned Tail',
      anchorPosition: [2.5, 1.45, 0],
      cameraPosition: [2.1, 1.9, 6.8],
      cameraTarget: [1.4, 0.35, 0],
      explanation:
        'Tokens to the right of the glass curtain are masked out completely before sampling. This prevents bizarre off-topic words while keeping natural variety intact.',
      accent: 'sky',
    },
  ],
  'tokens-limits': [
    {
      id: 'limits-stream',
      stepNumber: 1,
      title: 'Token Generation Runway',
      shortLabel: 'Token Stream',
      anchorPosition: [-2.6, 1.35, 0],
      cameraPosition: [-2.2, 1.9, 6.8],
      cameraTarget: [-1.4, 0.25, 0],
      explanation:
        'Each glowing cube represents an output token streaming off the LPU. Every token moves the generation cursor one step further down the runway.',
      accent: 'cyan',
    },
    {
      id: 'limits-stop-gate',
      stepNumber: 2,
      title: 'Stop Sequence Laser Gate',
      shortLabel: 'Stop Sequence Gate',
      anchorPosition: [0.75, 1.75, 0],
      cameraPosition: [0.6, 2.0, 6.7],
      cameraTarget: [0.5, 0.25, 0],
      explanation:
        'When you add a Stop Sequence, the LPU watches every incoming token for an exact match. The instant that sequence appears, decoding halts cleanly with finish_reason: stop_sequence.',
      accent: 'amber',
    },
    {
      id: 'limits-max-wall',
      stepNumber: 3,
      title: 'Max Completion Tokens Wall',
      shortLabel: 'Max Token Wall',
      anchorPosition: [2.75, 1.85, 0],
      cameraPosition: [2.2, 2.0, 6.9],
      cameraTarget: [1.6, 0.3, 0],
      explanation:
        'Max Completion Tokens sets a hard ceiling on reply length. If the model reaches this wall before finishing its thought, it stops immediately with finish_reason: length.',
      accent: 'sky',
    },
  ],
  'structured-json': [
    {
      id: 'json-raw',
      stepNumber: 1,
      title: 'Unconstrained Token Cloud',
      shortLabel: 'Raw Tokens',
      anchorPosition: [-2.75, 1.4, 0],
      cameraPosition: [-2.3, 1.9, 6.8],
      cameraTarget: [-1.4, 0.25, 0],
      explanation:
        'Normally, a language model can pick conversational filler, markdown ticks, or broken punctuation at any step. Without constraints, downstream code often breaks trying to parse it.',
      accent: 'sky',
    },
    {
      id: 'json-lattice',
      stepNumber: 2,
      title: 'Schema Lattice Cage',
      shortLabel: 'Schema Lattice',
      anchorPosition: [0, 1.9, 0],
      cameraPosition: [0, 2.1, 6.8],
      cameraTarget: [0, 0.25, 0],
      explanation:
        'JSON Schema mode compiles your structure into a grammar mask right inside the LPU decoder. At every single token step, invalid syntax tokens are masked to zero probability.',
      accent: 'cyan',
    },
    {
      id: 'json-output',
      stepNumber: 3,
      title: 'Type-Safe JSON Output',
      shortLabel: 'Type-Safe Output',
      anchorPosition: [2.75, 1.5, 0],
      cameraPosition: [2.2, 1.9, 6.8],
      cameraTarget: [1.5, 0.25, 0],
      explanation:
        'Every emitted block lands in its exact typed field on the very first pass. Edit your schema anytime in Playground Controls to reshape the slots live.',
      accent: 'amber',
    },
  ],
  'built-in-tools': [
    {
      id: 'tools-loop',
      stepNumber: 1,
      title: 'Single-Call LPU Orchestrator',
      shortLabel: 'Single-Call LPU Loop',
      anchorPosition: [-1.15, 1.85, 0],
      cameraPosition: [-1.1, 2.0, 6.9],
      cameraTarget: [-0.4, 0.25, 0],
      explanation:
        'GPT-OSS models on Groq can pause generation mid-thought, invoke built-in tools server-side, and weave fresh results back into the answer—all inside a single API request.',
      accent: 'amber',
    },
    {
      id: 'tools-search',
      stepNumber: 2,
      title: 'Browser Search Satellite',
      shortLabel: 'Browser Search',
      anchorPosition: [2.15, 2.1, 0],
      cameraPosition: [1.6, 2.3, 6.8],
      cameraTarget: [1.2, 0.85, 0],
      explanation:
        'When Browser Search is enabled, the LPU dispatches live web queries to fetch up-to-date facts beyond its training cutoff, then synthesizes a grounded answer.',
      accent: 'sky',
    },
    {
      id: 'tools-code',
      stepNumber: 3,
      title: 'Code Execution Sandbox',
      shortLabel: 'Code Execution Sandbox',
      anchorPosition: [2.15, -0.05, 0],
      cameraPosition: [1.6, 1.2, 6.8],
      cameraTarget: [1.2, -0.4, 0],
      explanation:
        'When Code Execution is enabled, the model writes and runs isolated Python for exact math, data parsing, or logic checks instead of guessing numbers in text.',
      accent: 'cyan',
    },
  ],
}

export const LPU_HOTSPOTS: HotspotMetadata[] = CONCEPT_HOTSPOTS['lpu-pipeline']

export function getConceptById(id: ConceptMetadata['id']): ConceptMetadata {
  return CONCEPT_LENSES.find((item) => item.id === id) ?? CONCEPT_LENSES[0]
}

export function getHotspotsForConcept(id: ConceptId): HotspotMetadata[] {
  return CONCEPT_HOTSPOTS[id] ?? CONCEPT_HOTSPOTS['lpu-pipeline']
}

export function getModelById(id: ModelId): ModelCatalogItem {
  return MODEL_CATALOG.find((item) => item.id === id) ?? MODEL_CATALOG[0]
}
