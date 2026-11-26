export interface SchemaSlot {
  key: string
  type: string
}

export interface SchemaValidationResult {
  valid: boolean
  error: string | null
  parsed: Record<string, unknown> | null
  slots: SchemaSlot[]
}

export const DEFAULT_SCHEMA_SLOTS: SchemaSlot[] = [
  { key: 'title', type: 'string' },
  { key: 'score', type: 'number' },
  { key: 'tags', type: 'array' },
]

export const DEFAULT_JSON_SCHEMA_TEXT = JSON.stringify(
  {
    type: 'object',
    properties: {
      title: { type: 'string', description: 'Short concept headline' },
      score: { type: 'number', description: 'Clarity or speed score from 1 to 100' },
      tags: {
        type: 'array',
        items: { type: 'string' },
        description: 'Key takeaways',
      },
    },
    required: ['title', 'score', 'tags'],
    additionalProperties: false,
  },
  null,
  2
)

function extractSlots(parsed: Record<string, unknown> | null): SchemaSlot[] {
  if (!parsed || typeof parsed.properties !== 'object' || parsed.properties === null) {
    return DEFAULT_SCHEMA_SLOTS
  }

  const props = parsed.properties as Record<string, Record<string, unknown>>
  const entries = Object.entries(props).slice(0, 3)
  if (entries.length === 0) return DEFAULT_SCHEMA_SLOTS

  return entries.map(([key, def]) => ({
    key,
    type: typeof def?.type === 'string' ? def.type : 'any',
  }))
}

export function validateJsonSchema(
  schemaText: string,
  strict: boolean
): SchemaValidationResult {
  let parsedUnknown: unknown
  try {
    parsedUnknown = JSON.parse(schemaText)
  } catch (err) {
    return {
      valid: false,
      error:
        err instanceof Error ? `Invalid JSON: ${err.message}` : 'Invalid JSON syntax.',
      parsed: null,
      slots: DEFAULT_SCHEMA_SLOTS,
    }
  }

  if (typeof parsedUnknown !== 'object' || parsedUnknown === null || Array.isArray(parsedUnknown)) {
    return {
      valid: false,
      error: 'Root schema must be a JSON object.',
      parsed: null,
      slots: DEFAULT_SCHEMA_SLOTS,
    }
  }

  const parsed = parsedUnknown as Record<string, unknown>
  const slots = extractSlots(parsed)

  if (parsed.type !== 'object') {
    return {
      valid: false,
      error: 'Root schema must include `"type": "object"`.',
      parsed,
      slots,
    }
  }

  if (typeof parsed.properties !== 'object' || parsed.properties === null) {
    return {
      valid: false,
      error: 'Include a `"properties"` object defining your output fields.',
      parsed,
      slots,
    }
  }

  if (strict) {
    if (parsed.additionalProperties !== false) {
      return {
        valid: false,
        error: 'Strict Mode requires `"additionalProperties": false` at the root object.',
        parsed,
        slots,
      }
    }

    const propKeys = Object.keys(parsed.properties as Record<string, unknown>)
    const required = Array.isArray(parsed.required)
      ? (parsed.required as unknown[]).filter((item): item is string => typeof item === 'string')
      : []

    const missingRequired = propKeys.filter((k) => !required.includes(k))
    if (missingRequired.length > 0) {
      return {
        valid: false,
        error: `Strict Mode requires all properties in \`"required"\`: missing ${missingRequired.join(', ')}.`,
        parsed,
        slots,
      }
    }
  }

  return {
    valid: true,
    error: null,
    parsed,
    slots,
  }
}

export function generateSampleJsonFromSchema(
  schemaText: string,
  userPrompt: string
): string {
  const { parsed } = validateJsonSchema(schemaText, false)
  if (!parsed || typeof parsed.properties !== 'object' || parsed.properties === null) {
    return JSON.stringify(
      {
        title: 'Groq LPU Deterministic Execution',
        score: 98,
        tags: ['on-chip-sram', 'zero-hbm-stalls', 'streaming'],
      },
      null,
      2
    )
  }

  const props = parsed.properties as Record<string, Record<string, unknown>>
  const promptLower = userPrompt.toLowerCase()
  const out: Record<string, unknown> = {}

  for (const [key, def] of Object.entries(props)) {
    const type = typeof def?.type === 'string' ? def.type : 'string'
    const keyLower = key.toLowerCase()

    if (type === 'number' || type === 'integer') {
      if (keyLower.includes('confidence')) out[key] = 0.94
      else if (keyLower.includes('price')) out[key] = 299
      else if (keyLower.includes('score')) out[key] = 97
      else out[key] = 42
    } else if (type === 'boolean') {
      out[key] = true
    } else if (type === 'array') {
      const itemType =
        typeof (def?.items as Record<string, unknown> | undefined)?.type === 'string'
          ? ((def.items as Record<string, unknown>).type as string)
          : 'string'
      if (itemType === 'number' || itemType === 'integer') {
        out[key] = [500, 1000, 98]
      } else if (keyLower.includes('keyword') || keyLower.includes('highlight')) {
        out[key] = ['deterministic-sram', 'sub-200ms-ttft', 'type-safe']
      } else {
        out[key] = ['on-chip-sram', 'low-latency', 'groq-lpu']
      }
    } else {
      if (keyLower.includes('sentiment')) {
        out[key] = 'positive'
      } else if (keyLower.includes('product')) {
        out[key] = 'GroqRack LPU Node'
      } else if (keyLower.includes('title') || keyLower.includes('name')) {
        out[key] = promptLower.includes('sram') || promptLower.includes('lpu')
          ? 'Groq LPU Deterministic SRAM'
          : 'Structured Output Summary'
      } else {
        out[key] = 'Compiled deterministically on Groq LPU on-chip SRAM.'
      }
    }
  }

  return JSON.stringify(out, null, 2)
}
