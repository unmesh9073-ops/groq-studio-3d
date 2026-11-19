import { TokenItem } from '@/types/groq';

// Simple deterministic hash to simulate stable token IDs for words/subwords
function hashStringToInt(str: string): number {
  let hash = 5381;
  for (let i = 0; i < str.length; i++) {
    hash = (hash * 33) ^ str.charCodeAt(i);
  }
  return Math.abs(hash % 32000) + 100;
}

// BPE simulation regex roughly matching Llama / GPT regex tokenizer
// Groups: whitespace + letters, whitespace + numbers, individual punctuation, emoji, or remaining characters
const TOKEN_REGEX = /(?:'s|'t|'re|'ve|'m|'ll|'d)|[^\r\n\p{L}\p{N}]?\p{L}+|\p{N}{1,3}| ?[^\s\p{L}\p{N}]+[\r\n]*|\s*[\r\n]+|\s+(?!\S)|\s+/gu;

export function tokenizeText(text: string): TokenItem[] {
  if (!text) return [];

  const tokens: TokenItem[] = [];
  const matches = text.match(TOKEN_REGEX) || [text];

  let tokenIndex = 0;
  for (const match of matches) {
    // If a token is unusually long (e.g. unbroken text like "antidisestablishmentarianism" or random chars),
    // break it into 3-4 char subword chunks like real BPE does
    if (match.length > 5 && !match.startsWith(' ') && /^[a-zA-Z]+$/.test(match)) {
      const subwords = splitLongWord(match);
      for (const sub of subwords) {
        tokens.push(createTokenItem(sub, tokenIndex++));
      }
    } else {
      tokens.push(createTokenItem(match, tokenIndex++));
    }
  }

  return tokens;
}

function splitLongWord(word: string): string[] {
  const parts: string[] = [];
  let remaining = word;
  
  // Known common subword morphemes
  const prefixes = ['anti', 'dis', 'un', 'pre', 'non', 'sub', 'inter', 'straw', 'blue', 'pine'];
  const suffixes = ['berry', 'apple', 'ing', 'tion', 'ness', 'ment', 'able', 'arianism', 'ism', 'ized', 'ity'];

  for (const p of prefixes) {
    if (remaining.toLowerCase().startsWith(p) && remaining.length > p.length + 2) {
      parts.push(remaining.slice(0, p.length));
      remaining = remaining.slice(p.length);
      break;
    }
  }

  for (const s of suffixes) {
    if (remaining.toLowerCase().endsWith(s) && remaining.length > s.length + 2) {
      const main = remaining.slice(0, remaining.length - s.length);
      parts.push(main);
      parts.push(remaining.slice(remaining.length - s.length));
      return parts;
    }
  }

  if (parts.length > 0 && remaining.length > 0) {
    parts.push(remaining);
    return parts;
  }

  // Fallback chunking: 3-4 chars
  let i = 0;
  while (i < word.length) {
    const chunkSize = (word.length - i > 6) ? 3 : (word.length - i);
    parts.push(word.slice(i, i + chunkSize));
    i += chunkSize;
  }
  return parts;
}

function createTokenItem(rawText: string, index: number): TokenItem {
  const encoder = new TextEncoder();
  const byteLength = encoder.encode(rawText).length;
  const isSpaceOnly = /^\s+$/.test(rawText);
  const isPunct = /^[^\w\s]+$/.test(rawText);
  
  return {
    id: hashStringToInt(rawText),
    text: rawText,
    colorIndex: index % 8, // 8 distinct palette colors
    byteLength,
    isSpace: isSpaceOnly,
    isPunctuation: isPunct,
  };
}

export const TOKEN_COLOR_PALETTES = [
  { bg: 'bg-emerald-500/15', border: 'border-emerald-500/40', text: 'text-emerald-300', dot: 'bg-emerald-400' },
  { bg: 'bg-cyan-500/15', border: 'border-cyan-500/40', text: 'text-cyan-300', dot: 'bg-cyan-400' },
  { bg: 'bg-amber-500/15', border: 'border-amber-500/40', text: 'text-amber-300', dot: 'bg-amber-400' },
  { bg: 'bg-violet-500/15', border: 'border-violet-500/40', text: 'text-violet-300', dot: 'bg-violet-400' },
  { bg: 'bg-rose-500/15', border: 'border-rose-500/40', text: 'text-rose-300', dot: 'bg-rose-400' },
  { bg: 'bg-indigo-500/15', border: 'border-indigo-500/40', text: 'text-indigo-300', dot: 'bg-indigo-400' },
  { bg: 'bg-orange-500/15', border: 'border-orange-500/40', text: 'text-orange-300', dot: 'bg-orange-400' },
  { bg: 'bg-sky-500/15', border: 'border-sky-500/40', text: 'text-sky-300', dot: 'bg-sky-400' },
];
