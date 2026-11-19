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
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    tokensPerSecond?: number;
    timeToFirstTokenMs?: number;
    totalTimeMs?: number;
  };
}

export type LabStation =
  | 'microscope' // Station 1: Token Microscope
  | 'crystalball' // Station 2: Next-Token Crystal Ball
  | 'temperature' // Station 3: Temperature & Chaos
  | 'context' // Station 4: Context Memory Meter
  | 'puppet' // Station 5: System Prompt Puppet Strings
  | 'speedometer' // Station 6: Groq LPU Speedometer
  | 'challenges'; // Bonus: Lab Challenges & Quizzes

export interface TokenItem {
  id: number;
  text: string;
  colorIndex: number;
  byteLength: number;
  isSpace: boolean;
  isPunctuation: boolean;
}
