import {
  buildGroqChatPayload,
  type ExecutionRequestParams,
  type GroqChatPayload,
} from '@/services/groqClient'
import type { ExportFormatExtension } from '@/types/playground'

function indentBlock(text: string, spaces: number): string {
  const pad = ' '.repeat(spaces)
  return text
    .split('\n')
    .map((line) => `${pad}${line}`)
    .join('\n')
}

function toPythonLiteral(value: unknown, indent = 0): string {
  if (value === null) return 'None'
  if (value === true) return 'True'
  if (value === false) return 'False'
  if (typeof value === 'number') return String(value)
  if (typeof value === 'string') return JSON.stringify(value)

  const pad = ' '.repeat(indent)
  const childPad = ' '.repeat(indent + 4)

  if (Array.isArray(value)) {
    if (value.length === 0) return '[]'
    const items = value.map((item) => `${childPad}${toPythonLiteral(item, indent + 4)}`)
    return `[\n${items.join(',\n')}\n${pad}]`
  }

  if (typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
    if (entries.length === 0) return '{}'
    const lines = entries.map(
      ([k, v]) => `${childPad}${JSON.stringify(k)}: ${toPythonLiteral(v, indent + 4)}`
    )
    return `{\n${lines.join(',\n')}\n${pad}}`
  }

  return String(value)
}

function generatePythonCode(payload: GroqChatPayload, explain: boolean): string {
  const lines: string[] = []
  if (explain) {
    lines.push('# Official Groq Python SDK — reads GROQ_API_KEY from your environment')
  }
  lines.push('import os')
  lines.push('from groq import Groq')
  lines.push('')
  lines.push('client = Groq(api_key=os.environ.get("GROQ_API_KEY"))')
  lines.push('')
  if (explain) {
    lines.push('# Send chat completion with your exact Playground parameters')
  }
  lines.push('completion = client.chat.completions.create(')
  lines.push(`    model=${JSON.stringify(payload.model)},`)
  lines.push(`    messages=${toPythonLiteral(payload.messages, 4)},`)
  lines.push(
    `    temperature=${payload.temperature},${explain ? '  # Randomness: 0=focused, 2=creative' : ''}`
  )
  lines.push(
    `    top_p=${payload.top_p},${explain ? '  # Nucleus sampling probability cutoff' : ''}`
  )
  lines.push(
    `    max_completion_tokens=${payload.max_completion_tokens},${explain ? '  # Hard output length limit' : ''}`
  )
  lines.push(
    `    stream=${payload.stream ? 'True' : 'False'},${explain ? '  # Stream tokens incrementally vs single batch' : ''}`
  )

  if (payload.stop && payload.stop.length > 0) {
    lines.push(
      `    stop=${toPythonLiteral(payload.stop, 4)},${explain ? '  # Halt immediately if matched' : ''}`
    )
  }
  if (payload.response_format) {
    lines.push(
      `    response_format=${toPythonLiteral(payload.response_format, 4)},${explain ? '  # Constrained JSON output' : ''}`
    )
  }
  if (payload.tools && payload.tools.length > 0) {
    lines.push(
      `    tools=${toPythonLiteral(payload.tools, 4)},${explain ? '  # Server-side Groq tools' : ''}`
    )
  }

  lines.push(')')
  lines.push('')

  if (payload.stream) {
    if (explain) lines.push('# Print each token as soon as the LPU produces it')
    lines.push('for chunk in completion:')
    lines.push('    print(chunk.choices[0].delta.content or "", end="", flush=True)')
  } else {
    if (explain) lines.push('# Print the full batched message once complete')
    lines.push('print(completion.choices[0].message.content)')
  }

  return lines.join('\n')
}

function generateTypeScriptCode(
  payload: GroqChatPayload,
  explain: boolean,
  openAiCompat: boolean
): string {
  const lines: string[] = []
  if (explain) {
    lines.push(
      openAiCompat
        ? '// Drop-in OpenAI SDK pointed at Groq — reads GROQ_API_KEY from env'
        : '// Official Groq TypeScript SDK — reads GROQ_API_KEY from env'
    )
  }

  if (openAiCompat) {
    lines.push('import OpenAI from "openai";')
    lines.push('')
    lines.push('const client = new OpenAI({')
    lines.push('  apiKey: process.env.GROQ_API_KEY,')
    lines.push('  baseURL: "https://api.groq.com/openai/v1",')
    lines.push('});')
  } else {
    lines.push('import Groq from "groq-sdk";')
    lines.push('')
    lines.push('const client = new Groq({')
    lines.push('  apiKey: process.env.GROQ_API_KEY,')
    lines.push('});')
  }

  lines.push('')
  lines.push('async function main() {')
  lines.push('  const completion = await client.chat.completions.create({')
  lines.push(`    model: ${JSON.stringify(payload.model)},`)
  lines.push(`    messages: ${indentBlock(JSON.stringify(payload.messages, null, 2), 4).trimStart()},`)
  lines.push(
    `    temperature: ${payload.temperature},${explain ? ' // Randomness (0–2)' : ''}`
  )
  lines.push(`    top_p: ${payload.top_p},${explain ? ' // Nucleus cutoff (0.05–1)' : ''}`)
  lines.push(
    `    max_completion_tokens: ${payload.max_completion_tokens},${explain ? ' // Max output tokens' : ''}`
  )
  lines.push(
    `    stream: ${payload.stream},${explain ? ' // Continuous token stream' : ''}`
  )

  if (payload.stop && payload.stop.length > 0) {
    lines.push(
      `    stop: ${JSON.stringify(payload.stop)},${explain ? ' // Stop sequences' : ''}`
    )
  }
  if (payload.response_format) {
    lines.push(
      `    response_format: ${indentBlock(JSON.stringify(payload.response_format, null, 2), 4).trimStart()},${explain ? ' // Structured JSON output' : ''}`
    )
  }
  if (payload.tools && payload.tools.length > 0) {
    lines.push(
      `    tools: ${indentBlock(JSON.stringify(payload.tools, null, 2), 4).trimStart()},${explain ? ' // Built-in server tools' : ''}`
    )
  }

  lines.push('  });')
  lines.push('')

  if (payload.stream) {
    lines.push('  for await (const chunk of completion) {')
    lines.push('    process.stdout.write(chunk.choices[0]?.delta?.content ?? "");')
    lines.push('  }')
  } else {
    lines.push('  console.log(completion.choices[0]?.message?.content);')
  }

  lines.push('}')
  lines.push('')
  lines.push('main();')

  return lines.join('\n')
}

function generateCurlCode(payload: GroqChatPayload, explain: boolean): string {
  const lines: string[] = []
  if (explain) {
    lines.push('# Direct HTTPS call to Groq OpenAI-compatible Chat Completions endpoint')
    lines.push('# Export your key first: export GROQ_API_KEY="gsk_..."')
  }
  lines.push('curl -X POST "https://api.groq.com/openai/v1/chat/completions" \\')
  lines.push('  -H "Authorization: Bearer $GROQ_API_KEY" \\')
  lines.push('  -H "Content-Type: application/json" \\')
  const escapedPayload = JSON.stringify(payload, null, 2).replace(/'/g, "'\\''")
  lines.push(`  -d '${escapedPayload}'`)
  return lines.join('\n')
}

export function generateExportCode(
  params: ExecutionRequestParams,
  format: ExportFormatExtension,
  explain: boolean
): string {
  const payload = buildGroqChatPayload(params)

  switch (format) {
    case 'python':
      return generatePythonCode(payload, explain)
    case 'typescript':
      return generateTypeScriptCode(payload, explain, false)
    case 'openai-compat':
      return generateTypeScriptCode(payload, explain, true)
    case 'curl':
      return generateCurlCode(payload, explain)
  }
}
