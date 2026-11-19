'use client';

import React, { useState } from 'react';
import { StepLogprob, LogprobCandidate } from '@/types/groq';
import { SIMULATED_STORY_STEPS } from '@/lib/presets';
import { sound } from '@/lib/audio';
import {
  Sparkles,
  GitBranch,
  Play,
  RotateCcw,
  Info,
  Loader2,
  TrendingUp,
  Cpu,
  BarChart3,
  Flame,
} from 'lucide-react';

interface NextTokenCrystalBallProps {
  apiKey: string | null;
}

const PRESET_STORIES = [
  {
    title: '🕵️ The Detective Mystery',
    prompt: 'The detective slowly turned the creaky brass doorknob and',
  },
  {
    title: '🌌 The Space Exploration',
    prompt: 'Upon landing on the violet surface of Kepler-442b, the astronauts discovered',
  },
  {
    title: '🧠 The Secret of Life',
    prompt: 'The single most important rule to achieving true happiness is to',
  },
];

export function NextTokenCrystalBall({ apiKey }: NextTokenCrystalBallProps) {
  const [prompt, setPrompt] = useState(
    'The detective slowly turned the creaky brass doorknob and'
  );
  const [tokens, setTokens] = useState<StepLogprob[]>(SIMULATED_STORY_STEPS);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number>(4);
  const [isLoading, setIsLoading] = useState(false);
  const [historyBranchCount, setHistoryBranchCount] = useState(0);

  const activeStep = tokens[selectedStepIndex] || tokens[0];

  const handleGenerate = async (customPrompt?: string) => {
    const textPrompt = customPrompt || prompt;
    sound.click();
    setIsLoading(true);

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 600));
        setTokens(SIMULATED_STORY_STEPS);
        setSelectedStepIndex(4);
        sound.success();
        return;
      }

      const res = await fetch('/api/groq/logprobs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': apiKey,
        },
        body: JSON.stringify({
          prompt: textPrompt,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.7,
          max_tokens: 30,
        }),
      });

      const data = await res.json();
      if (data.tokens && data.tokens.length > 0) {
        setTokens(data.tokens);
        setSelectedStepIndex(0);
        sound.success();
      } else {
        sound.error();
      }
    } catch {
      sound.error();
    } finally {
      setIsLoading(false);
    }
  };

  // The Multiverse Fork: replace the token at selectedStepIndex with alternative, truncate rest, and continue generating!
  const handleForkCandidate = async (candidate: LogprobCandidate) => {
    sound.switchToggle();
    setHistoryBranchCount((prev) => prev + 1);

    // Build the new prompt up to the selected token + the chosen alternative token
    const prefixTokens = tokens.slice(0, selectedStepIndex).map((t) => t.token);
    const newHistory = prompt + prefixTokens.join('') + candidate.token;

    setPrompt(newHistory);
    await handleGenerate(newHistory);
  };

  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
              <Sparkles className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-cyan-400 font-bold">
                  Station 2
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-400">Logprobs & Sampling</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                The Next-Token Crystal Ball: Inside the Prediction Engine
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <GitBranch className="w-4 h-4 text-cyan-400" />
            <span className="text-slate-400">Timeline Forks:</span>
            <span className="text-cyan-300 font-bold">{historyBranchCount}</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          At every single step, the AI calculates a percentage probability for thousands of words. Click any generated token below to see the <strong>Top 5 alternative candidates</strong> it almost chose, or click <strong>Fork Timeline</strong> to force reality down another branch!
        </p>
      </div>

      {/* Preset Starters */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Flame className="w-3.5 h-3.5 text-orange-400" />
          Starter Scenarios:
        </span>
        {PRESET_STORIES.map((item) => (
          <button
            key={item.title}
            onClick={() => {
              sound.click();
              setPrompt(item.prompt);
              handleGenerate(item.prompt);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs whitespace-nowrap transition-colors"
          >
            {item.title}
          </button>
        ))}
      </div>

      {/* Main Lab Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Prompt & Interactive Sentence (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 font-semibold">
                Story Prompt (The Beginning):
              </label>
              <button
                onClick={() => handleGenerate()}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-600/20"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Predicting...
                  </>
                ) : (
                  <>
                    <Play className="w-3.5 h-3.5 fill-current" />
                    Predict Next Tokens
                  </>
                )}
              </button>
            </div>

            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-cyan-500/40 focus:border-cyan-500 transition-all"
            />

            {/* Generated Stream with Clickable Probabilities */}
            <div className="mt-4 pt-3 border-t border-slate-800">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                  Generated Tokens (Click any token to inspect alternative paths):
                </span>
                <span className="text-[11px] font-mono text-cyan-400">
                  {tokens.length} tokens generated
                </span>
              </div>

              <div className="hardware-slot p-5 rounded-xl min-h-[160px] leading-relaxed text-sm font-mono flex flex-wrap gap-1.5 items-baseline">
                <span className="text-slate-500 font-normal">{prompt}</span>

                {tokens.map((step, idx) => {
                  const isSelected = selectedStepIndex === idx;
                  const prob = step.probPercent;

                  // Color code based on model certainty
                  let probColor = 'border-emerald-500/40 bg-emerald-500/10 text-emerald-300';
                  if (prob < 40) {
                    probColor = 'border-rose-500/40 bg-rose-500/10 text-rose-300';
                  } else if (prob < 75) {
                    probColor = 'border-amber-500/40 bg-amber-500/10 text-amber-300';
                  }

                  return (
                    <button
                      key={`${idx}-${step.token}`}
                      onClick={() => {
                        sound.click();
                        setSelectedStepIndex(idx);
                      }}
                      className={`relative px-2 py-0.5 rounded border text-xs font-mono transition-all transform active:scale-95 ${probColor} ${
                        isSelected
                          ? 'ring-2 ring-white scale-110 shadow-lg shadow-cyan-500/30 z-10 brightness-125'
                          : 'hover:scale-105 hover:brightness-125'
                      }`}
                    >
                      <span className="font-semibold whitespace-pre">{step.token}</span>
                      <span className="text-[9px] opacity-70 ml-1">
                        {Math.round(prob)}%
                      </span>
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="flex items-center gap-4 mt-3 text-[11px] font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                  High Confidence (&gt;75%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                  Moderate (40-75%)
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                  Wild Guess / Uncertain (&lt;40%)
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Right: Alternative Candidates & Multiverse Fork (Span 1) */}
        <div className="space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 sticky top-24">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Candidates Considered</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                Step #{selectedStepIndex + 1}
              </span>
            </div>

            {activeStep ? (
              <div className="mt-4 space-y-4">
                <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
                  <div className="text-[10px] font-mono uppercase text-slate-500">
                    Selected by Model:
                  </div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-lg font-bold font-mono text-cyan-300">
                      &quot;{activeStep.token}&quot;
                    </span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-400 border border-cyan-500/30">
                      {activeStep.probPercent}% confidence
                    </span>
                  </div>
                </div>

                {/* Top 5 Candidates Bar Chart */}
                <div className="space-y-2.5">
                  <span className="text-xs font-mono text-slate-400 block font-medium">
                    Top 5 Alternatives at this Millisecond:
                  </span>

                  {activeStep.topCandidates.map((cand, cIdx) => {
                    const isWinner = cand.token === activeStep.token;
                    return (
                      <div
                        key={cIdx}
                        className={`p-2.5 rounded-xl border transition-all ${
                          isWinner
                            ? 'bg-cyan-950/30 border-cyan-500/40'
                            : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'
                        }`}
                      >
                        <div className="flex items-center justify-between text-xs font-mono mb-1.5">
                          <span
                            className={`font-semibold ${
                              isWinner ? 'text-cyan-300' : 'text-slate-200'
                            }`}
                          >
                            &quot;{cand.token}&quot;
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-slate-400 text-[11px]">
                              {cand.probPercent.toFixed(1)}%
                            </span>

                            {/* Fork Timeline Button */}
                            {!isWinner && (
                              <button
                                onClick={() => handleForkCandidate(cand)}
                                title="Branch into an alternate universe using this word!"
                                className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-500 text-cyan-300 hover:text-white border border-cyan-500/40 text-[10px] flex items-center gap-1 transition-all"
                              >
                                <GitBranch className="w-2.5 h-2.5" />
                                <span>Fork</span>
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Animated Probability Bar */}
                        <div className="w-full bg-slate-900 h-2 rounded-full overflow-hidden border border-slate-800">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isWinner
                                ? 'bg-gradient-to-r from-cyan-500 to-blue-500'
                                : 'bg-slate-600'
                            }`}
                            style={{ width: `${Math.max(4, cand.probPercent)}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Info className="w-3.5 h-3.5 text-cyan-400" />
                    <span>What is a Logprob?</span>
                  </div>
                  <p>
                    Log probability (logprob) represents the logarithmic likelihood ln(P) assigned by the neural network. We convert it back to a percentage via e^(logprob) &times; 100%.
                  </p>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
