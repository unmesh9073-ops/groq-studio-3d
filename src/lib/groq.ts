import Groq from 'groq-sdk';

export interface GroqModelInfo {
  id: string;
  name: string;
  desc: string;
  contextWindow: number;
  tokensPerSecEstimate: number;
  tier: 'flagship' | 'fast' | 'reasoning' | 'experimental';
}

export const CURATED_GROQ_MODELS: GroqModelInfo[] = [
  {
    id: 'llama-3.3-70b-versatile',
    name: 'Llama 3.3 70B Versatile',
    desc: 'Flagship open-source intelligence with versatile capabilities',
    contextWindow: 131072,
    tokensPerSecEstimate: 320,
    tier: 'flagship',
  },
  {
    id: 'llama-3.1-8b-instant',
    name: 'Llama 3.1 8B Instant',
    desc: 'Ultra-fast inference (750+ tok/s) on Groq LPUs',
    contextWindow: 131072,
    tokensPerSecEstimate: 750,
    tier: 'fast',
  },
  {
    id: 'openai/gpt-oss-120b',
    name: 'GPT-OSS 120B (Reasoning)',
    desc: 'Open weights high-parameter deep reasoning architecture',
    contextWindow: 131072,
    tokensPerSecEstimate: 280,
    tier: 'reasoning',
  },
  {
    id: 'openai/gpt-oss-20b',
    name: 'GPT-OSS 20B (High-Speed)',
    desc: 'Balanced reasoning and blazing response speed',
    contextWindow: 131072,
    tokensPerSecEstimate: 620,
    tier: 'fast',
  },
  {
    id: 'mixtral-8x7b-32768',
    name: 'Mixtral 8x7B (MoE)',
    desc: 'Mixture-of-Experts high capacity instruction model',
    contextWindow: 32768,
    tokensPerSecEstimate: 450,
    tier: 'fast',
  },
  {
    id: 'gemma2-9b-it',
    name: 'Gemma 2 9B IT',
    desc: 'Google lightweight high-efficiency instruction tuned model',
    contextWindow: 8192,
    tokensPerSecEstimate: 580,
    tier: 'fast',
  },
];

export function isAllowedTextModel(id: string): boolean {
  const lower = id.toLowerCase();
  // Filter out audio, speech, TTS, STT, and moderation/guard models
  if (
    lower.includes('whisper') ||
    lower.includes('orpheus') ||
    lower.includes('guard') ||
    lower.includes('safeguard') ||
    lower.includes('tts') ||
    lower.includes('stt') ||
    lower.includes('distil-whisper') ||
    lower.includes('vision') ||
    lower.includes('clip')
  ) {
    return false;
  }
  return true;
}

export function getGroqClient(clientKey?: string | null): Groq {
  const apiKey = clientKey?.trim() || process.env.GROQ_API_KEY?.trim();
  if (!apiKey) {
    throw new Error('NO_API_KEY');
  }
  return new Groq({ apiKey });
}

export function hasServerGroqKey(): boolean {
  return Boolean(process.env.GROQ_API_KEY && process.env.GROQ_API_KEY.trim().length > 0);
}
