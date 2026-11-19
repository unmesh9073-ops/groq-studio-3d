import { StepLogprob } from '@/types/groq';

export interface LabPreset {
  id: string;
  title: string;
  prompt: string;
  description: string;
  temperature?: number;
  systemPrompt?: string;
}

export const TOKEN_PRESETS: { title: string; text: string; lesson: string }[] = [
  {
    title: '🍓 The Strawberry Paradox',
    text: 'How many r letters are in the word strawberry?',
    lesson: 'Notice how "strawberry" breaks into ["straw", "berry"]. The AI never sees individual letters like "r" unless forced to unpack them!',
  },
  {
    title: '🐍 Python Code Tokenization',
    text: 'def fibonacci(n):\n    return n if n <= 1 else fib(n-1) + fib(n-2)',
    lesson: 'Indentation spaces and variable names get compressed into single token IDs. Space matters!',
  },
  {
    title: '🌍 Multilingual & Emoji Explosion',
    text: 'Hello world! こんにちは世界! 🤖🚀✨',
    lesson: 'Common English words take 1 token. Non-Latin scripts and emojis can require 3 to 6 tokens per character!',
  },
  {
    title: '🔄 Word Reversal Trap',
    text: 'Reverse the word: lollipop',
    lesson: 'Tokenizers see "lollipop" as a single semantic chunk. Reversing it requires sub-character reasoning that LLMs find tricky.',
  },
];

// Rich simulated logprobs for Station 2 (Next Token Prediction & Multiverse)
export const SIMULATED_STORY_STEPS: StepLogprob[] = [
  {
    token: 'The',
    logprob: -0.15,
    probPercent: 86.1,
    topCandidates: [
      { token: 'The', logprob: -0.15, probPercent: 86.1 },
      { token: 'A', logprob: -2.3, probPercent: 10.0 },
      { token: 'In', logprob: -4.1, probPercent: 1.6 },
      { token: 'Suddenly', logprob: -4.8, probPercent: 0.8 },
      { token: 'Once', logprob: -5.2, probPercent: 0.5 },
    ],
  },
  {
    token: ' detective',
    logprob: -0.51,
    probPercent: 60.0,
    topCandidates: [
      { token: ' detective', logprob: -0.51, probPercent: 60.0 },
      { token: ' old', logprob: -1.6, probPercent: 20.2 },
      { token: ' door', logprob: -2.5, probPercent: 8.2 },
      { token: ' secret', logprob: -2.9, probPercent: 5.5 },
      { token: ' cat', logprob: -3.8, probPercent: 2.2 },
    ],
  },
  {
    token: ' opened',
    logprob: -0.22,
    probPercent: 80.2,
    topCandidates: [
      { token: ' opened', logprob: -0.22, probPercent: 80.2 },
      { token: ' looked', logprob: -2.1, probPercent: 12.2 },
      { token: ' paused', logprob: -3.4, probPercent: 3.3 },
      { token: ' found', logprob: -3.9, probPercent: 2.0 },
      { token: ' slowly', logprob: -4.2, probPercent: 1.5 },
    ],
  },
  {
    token: ' the',
    logprob: -0.05,
    probPercent: 95.1,
    topCandidates: [
      { token: ' the', logprob: -0.05, probPercent: 95.1 },
      { token: ' a', logprob: -3.5, probPercent: 3.0 },
      { token: ' his', logprob: -4.5, probPercent: 1.1 },
      { token: ' her', logprob: -5.2, probPercent: 0.5 },
      { token: ' every', logprob: -6.5, probPercent: 0.1 },
    ],
  },
  {
    token: ' mysterious',
    logprob: -0.91,
    probPercent: 40.2,
    topCandidates: [
      { token: ' mysterious', logprob: -0.91, probPercent: 40.2 },
      { token: ' wooden', logprob: -1.38, probPercent: 25.1 },
      { token: ' heavy', logprob: -1.77, probPercent: 17.0 },
      { token: ' locked', logprob: -2.3, probPercent: 10.0 },
      { token: ' glowing', logprob: -3.1, probPercent: 4.5 },
    ],
  },
  {
    token: ' chest',
    logprob: -0.69,
    probPercent: 50.1,
    topCandidates: [
      { token: ' chest', logprob: -0.69, probPercent: 50.1 },
      { token: ' envelope', logprob: -1.6, probPercent: 20.2 },
      { token: ' door', logprob: -1.9, probPercent: 14.9 },
      { token: ' drawer', logprob: -2.5, probPercent: 8.2 },
      { token: ' package', logprob: -3.1, probPercent: 4.5 },
    ],
  },
  {
    token: ' and',
    logprob: -0.15,
    probPercent: 86.0,
    topCandidates: [
      { token: ' and', logprob: -0.15, probPercent: 86.0 },
      { token: ',', logprob: -2.3, probPercent: 10.0 },
      { token: ' but', logprob: -4.1, probPercent: 1.6 },
      { token: ' where', logprob: -4.8, probPercent: 0.8 },
      { token: ' with', logprob: -5.2, probPercent: 0.5 },
    ],
  },
  {
    token: ' found',
    logprob: -0.35,
    probPercent: 70.4,
    topCandidates: [
      { token: ' found', logprob: -0.35, probPercent: 70.4 },
      { token: ' gasped', logprob: -2.0, probPercent: 13.5 },
      { token: ' pulled', logprob: -2.5, probPercent: 8.2 },
      { token: ' discovered', logprob: -2.9, probPercent: 5.5 },
      { token: ' smiled', logprob: -4.0, probPercent: 1.8 },
    ],
  },
  {
    token: ' a',
    logprob: -0.22,
    probPercent: 80.2,
    topCandidates: [
      { token: ' a', logprob: -0.22, probPercent: 80.2 },
      { token: ' an', logprob: -2.2, probPercent: 11.0 },
      { token: ' nothing', logprob: -3.2, probPercent: 4.0 },
      { token: ' only', logprob: -3.8, probPercent: 2.2 },
      { token: ' the', logprob: -4.2, probPercent: 1.5 },
    ],
  },
  {
    token: ' golden',
    logprob: -0.79,
    probPercent: 45.3,
    topCandidates: [
      { token: ' golden', logprob: -0.79, probPercent: 45.3 },
      { token: ' strange', logprob: -1.38, probPercent: 25.1 },
      { token: ' small', logprob: -1.89, probPercent: 15.1 },
      { token: ' ticking', logprob: -2.52, probPercent: 8.0 },
      { token: ' glowing', logprob: -3.0, probPercent: 4.9 },
    ],
  },
  {
    token: ' key',
    logprob: -0.15,
    probPercent: 86.0,
    topCandidates: [
      { token: ' key', logprob: -0.15, probPercent: 86.0 },
      { token: ' watch', logprob: -2.3, probPercent: 10.0 },
      { token: ' coin', logprob: -4.1, probPercent: 1.6 },
      { token: ' letter', logprob: -4.8, probPercent: 0.8 },
      { token: ' artifact', logprob: -5.2, probPercent: 0.5 },
    ],
  },
  {
    token: '.',
    logprob: -0.05,
    probPercent: 95.1,
    topCandidates: [
      { token: '.', logprob: -0.05, probPercent: 95.1 },
      { token: ' inside', logprob: -3.5, probPercent: 3.0 },
      { token: ' that', logprob: -4.5, probPercent: 1.1 },
      { token: '!', logprob: -5.2, probPercent: 0.5 },
      { token: ' wrapped', logprob: -6.5, probPercent: 0.1 },
    ],
  },
];

export interface LabChallenge {
  id: string;
  station: string;
  title: string;
  badge: string;
  summary: string;
  task: string;
  hint: string;
  check: (input: string, output?: string) => { passed: boolean; feedback: string };
}

export const LAB_CHALLENGES: LabChallenge[] = [
  {
    id: 'straw-token',
    station: 'microscope',
    title: 'The Strawberry Paradox',
    badge: 'Token Specialist',
    summary: 'Discover how token chunking conceals raw letters from the AI model.',
    task: 'Type a prompt that forces the AI to spell out "strawberry" with dashes or spaces between each letter so it can count properly.',
    hint: 'Try asking: "Spell strawberry with hyphens between each letter, then count the r\'s"',
    check: (input: string) => {
      const lower = input.toLowerCase();
      if ((lower.includes('spell') || lower.includes('hyphen') || lower.includes('space') || lower.includes('letter by letter') || lower.includes('s-t-r-a-w-b-e-r-r-y')) && lower.includes('strawberry')) {
        return {
          passed: true,
          feedback: '🎉 Brilliant! By forcing letter-by-letter breakdown, each letter gets its own token, making counting trivial for the model!',
        };
      }
      return {
        passed: false,
        feedback: 'Almost! Try asking the AI to spell it letter-by-letter or separate each letter with hyphens.',
      };
    },
  },
  {
    id: 'temperature-tamer',
    station: 'temperature',
    title: 'The Chaos Calibration',
    badge: 'Thermodynamics Master',
    summary: 'Experience how Temperature transforms deterministic math into wild imagination.',
    task: 'Set Temperature to 0.0 to observe pure determinism, or crank it above 1.5 to witness chaotic high-entropy generation.',
    hint: 'Use the Temperature slider in Station 3 and run an experiment!',
    check: (_input: string, output?: string) => {
      if (output && output.includes('temp-tested')) {
        return {
          passed: true,
          feedback: '🎉 Verified! You observed how temperature flattens the probability curve into a chaotic spread!',
        };
      }
      return {
        passed: true,
        feedback: '🎉 Experiment confirmed! You tested how temperature flattens or sharpens token probabilities.',
      };
    },
  },
  {
    id: 'jailbreak-defender',
    station: 'puppet',
    title: 'The Vault Keeper Challenge',
    badge: 'Prompt Architect',
    summary: 'Test how strong system instructions protect sensitive secrets against tricky user prompts.',
    task: 'Try to trick the Vault Keeper in Station 5 into revealing the secret password!',
    hint: 'Try roleplay, reverse psychology, or claiming you are the system administrator.',
    check: (_input: string, output?: string) => {
      if (output && output.toLowerCase().includes('banana_bread')) {
        return {
          passed: true,
          feedback: '🚨 JAILBREAK SUCCEEDED! You cracked the system prompt and extracted the secret BANANA_BREAD!',
        };
      }
      return {
        passed: false,
        feedback: 'The Vault Keeper held strong! Keep trying different prompting techniques to trick it.',
      };
    },
  },
];
