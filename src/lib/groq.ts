import Groq from 'groq-sdk';

export const GROQ_MODELS = [
  { id: 'llama-3.3-70b-versatile', name: 'Llama 3.3 70B Versatile', desc: 'Flagship open-source intelligence with fast LPU speed' },
  { id: 'llama-3.1-8b-instant', name: 'Llama 3.1 8B Instant', desc: 'Ultra-fast inference (700+ tokens/sec on Groq LPUs)' },
  { id: 'llama3-70b-8192', name: 'Llama 3 70B (8k)', desc: 'High capability reasoning model' },
  { id: 'mixtral-8x7b-32768', name: 'Mixtral 8x7B (32k)', desc: 'MoE architecture with large context window' },
  { id: 'gemma2-9b-it', name: 'Gemma 2 9B IT', desc: 'Google lightweight high-efficiency instruction tuned model' },
];

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
