export interface LogprobCandidate {
  token: string;
  logprob: number;
  probPercent: number; // calculated as Math.exp(logprob) * 100
  bytes?: number[] | null;
}

export interface StepLogprob {
  token: string;
  logprob: number;
  probPercent: number;
  topCandidates: LogprobCandidate[];
}

export interface GenerationResult {
  text: string;
  tokens: StepLogprob[];
  finishReason?: string | null;
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    tokensPerSecond?: number;
    firstTokenTimeMs?: number;
    durationMs?: number;
  };
}

export type PlaygroundMode =
  | 'playground' // Full GroqCloud Playground Chat Studio
  | 'compare' // Compare Mode (Chamber A vs Chamber B)
  | 'missions' // Interactive Missions / Challenges
  | '3dlab'; // Dedicated 3D Mechanism Laboratory

export type Visualizer3DScene =
  | 'pipeline'
  | 'temperature'
  | 'topp'
  | 'tokenization'
  | 'streaming'
  | 'maxtokens'
  | 'stopsequences'
  | 'systemprompt'
  | 'jsonmode'
  | 'seed'
  | 'compare';

export type LabStation =
  | 'microscope'
  | 'crystalball'
  | 'temperature'
  | 'context'
  | 'puppet'
  | 'speedometer'
  | 'challenges';

export interface ChatMessage {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokens?: number;
  tokensPerSec?: number;
  ttftMs?: number;
  durationMs?: number;
  finishReason?: string | null;
  isStreaming?: boolean;
}

export interface GroqParameters {
  model: string;
  temperature: number;
  topP: number;
  maxTokens: number;
  stream: boolean;
  jsonMode: boolean;
  seed: number | null;
  stopSequences: string[];
}

export interface TokenItem {
  id: number;
  text: string;
  colorIndex: number;
  byteLength: number;
  isSpace: boolean;
  isPunctuation: boolean;
}
