'use client';

import React, { useState } from 'react';
import { sound } from '@/lib/audio';
import {
  Sliders,
  Flame,
  Snowflake,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Layers,
  ArrowRight,
  Loader2,
  TrendingUp,
} from 'lucide-react';

interface TemperatureChaosDialProps {
  apiKey: string | null;
}

export function TemperatureChaosDial({ apiKey }: TemperatureChaosDialProps) {
  const [prompt, setPrompt] = useState('Write a 3-line poem about a spaceship that ran out of fuel:');
  const [tempA, setTempA] = useState(0.0);
  const [tempB, setTempB] = useState(1.8);
  const [topP, setTopP] = useState(1.0);

  const [outputA, setOutputA] = useState<string | null>(null);
  const [outputB, setOutputB] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // Generate simulated dynamic curve bars for visualization based on temperature
  const getCurveBars = (temp: number) => {
    // 6 sample token candidates with base logits [4.5, 3.2, 2.0, 1.2, 0.6, 0.1]
    const baseLogits = [4.5, 3.2, 2.0, 1.2, 0.6, 0.1];
    const safeTemp = Math.max(0.05, temp);

    // Apply softmax with temperature: exp(logit / temp) / sum(exp(logit / temp))
    const scaled = baseLogits.map((l) => Math.exp(l / safeTemp));
    const sum = scaled.reduce((acc, v) => acc + v, 0);
    return scaled.map((v) => Math.round((v / sum) * 100));
  };

  const curveA = getCurveBars(tempA);
  const curveB = getCurveBars(tempB);

  const handleRunDualChambers = async () => {
    sound.click();
    setIsLoading(true);
    setOutputA(null);
    setOutputB(null);

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 600));
        setOutputA(
          'Silent drift through endless night,\nEngines cold, no spark of light,\nAdrift beneath the stellar white.'
        );
        setOutputB(
          'Gasping thruster-lung hollow clanks,\nCosmic dust sneezes through our fractured tanks,\nNebula laughs in ultraviolet pranks.'
        );
        sound.success();
        return;
      }

      // Run both chambers simultaneously using Promise.all on Groq LPUs!
      const [resA, resB] = await Promise.all([
        fetch('/api/groq/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-groq-api-key': apiKey },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            temperature: tempA,
            top_p: topP,
            max_tokens: 100,
          }),
        }),
        fetch('/api/groq/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-groq-api-key': apiKey },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            temperature: tempB,
            top_p: topP,
            max_tokens: 100,
          }),
        }),
      ]);

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);
      setOutputA(dataA.text || 'Error in Chamber A');
      setOutputB(dataB.text || 'Error in Chamber B');
      sound.success();
    } catch {
      sound.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Sliders className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Station 3
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-400">Softmax Entropy Scaling</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                The Temperature & Chaos Dial: Cold Math vs Wild Dreams
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <span className="text-slate-400">Dual Comparator:</span>
            <span className="text-blue-400 font-bold">0.0 (Robot)</span>
            <span className="text-slate-600">vs</span>
            <span className="text-orange-400 font-bold">1.8 (Chaos)</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          &quot;Temperature&quot; does not make the AI smarter or warmer. It divides the raw score (logit) of every word by the temperature factor T. At <strong>0.0</strong>, the most probable word wins 100% of the time (deterministic robot). At <strong>1.8+</strong>, all words get an equal fighting chance, resulting in creative chaos and poetic fever dreams!
        </p>
      </div>

      {/* Shared Prompt Bar */}
      <div className="hardware-panel rounded-2xl p-5 border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
            <span>Experiment Prompt (Sent to both chambers simultaneously):</span>
          </label>
          <button
            onClick={handleRunDualChambers}
            disabled={isLoading}
            className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-amber-600/30"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Firing Dual Chambers...
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 fill-current" />
                Run Dual Experiment
              </>
            )}
          </button>
        </div>

        <input
          type="text"
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-amber-500/40 focus:border-amber-500 transition-all"
        />

        {/* Quick Presets */}
        <div className="flex items-center gap-2 pt-1 overflow-x-auto text-xs">
          <span className="text-slate-500 font-mono text-[11px] shrink-0">Try prompt:</span>
          {[
            'Write a 3-line poem about a spaceship that ran out of fuel:',
            'Invent 3 futuristic cocktail recipes:',
            'Explain gravity to a medieval blacksmith:',
          ].map((preset) => (
            <button
              key={preset}
              onClick={() => {
                sound.click();
                setPrompt(preset);
              }}
              className="px-2.5 py-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 whitespace-nowrap text-[11px]"
            >
              {preset.slice(0, 32)}...
            </button>
          ))}
        </div>
      </div>

      {/* Side-by-Side Dual Lab Chambers */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chamber A (Cold / Deterministic) */}
        <div className="hardware-panel rounded-2xl p-5 border border-blue-500/30 bg-blue-950/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
            <div className="flex items-center gap-2">
              <Snowflake className="w-5 h-5 text-blue-400" />
              <div>
                <h3 className="text-sm font-bold text-blue-200">Chamber A: The Cold Robot</h3>
                <span className="text-[10px] font-mono text-blue-400">Deterministic • Greedy Search</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-blue-300">{tempA.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">Temp</span>
            </div>
          </div>

          {/* Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Absolute Zero (0.0)</span>
              <span>Predictable (0.5)</span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.0"
              step="0.1"
              value={tempA}
              onChange={(e) => {
                sound.switchToggle();
                setTempA(parseFloat(e.target.value));
              }}
              className="w-full accent-blue-500 cursor-pointer"
            />
          </div>

          {/* Dynamic Probability Curve Visualization */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
              Probability Distribution Shape:
            </span>
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {curveA.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-blue-500 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(6, val)}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500">#{idx + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              Notice the sharp spike: token #1 takes almost ~{curveA[0]}% of the probability!
            </p>
          </div>

          {/* Output Chamber */}
          <div className="hardware-slot p-4 rounded-xl min-h-[140px] text-xs font-mono">
            <span className="text-[10px] font-mono uppercase text-blue-400 block mb-1">
              Chamber Output:
            </span>
            {outputA ? (
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{outputA}</p>
            ) : (
              <span className="text-slate-600 italic">Click &quot;Run Dual Experiment&quot; to generate...</span>
            )}
          </div>
        </div>

        {/* Chamber B (Hot / Creative / Chaos) */}
        <div className="hardware-panel rounded-2xl p-5 border border-orange-500/30 bg-orange-950/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <div>
                <h3 className="text-sm font-bold text-orange-200">Chamber B: The Wild Dreamer</h3>
                <span className="text-[10px] font-mono text-orange-400">High Entropy • Flatted Curve</span>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xl font-bold font-mono text-orange-300">{tempB.toFixed(1)}</span>
              <span className="text-[10px] text-slate-400 block font-mono">Temp</span>
            </div>
          </div>

          {/* Slider */}
          <div>
            <div className="flex justify-between text-xs font-mono text-slate-400 mb-1">
              <span>Balanced (0.7)</span>
              <span>Pure Chaos (2.0)</span>
            </div>
            <input
              type="range"
              min="0.5"
              max="2.0"
              step="0.1"
              value={tempB}
              onChange={(e) => {
                sound.switchToggle();
                setTempB(parseFloat(e.target.value));
              }}
              className="w-full accent-orange-500 cursor-pointer"
            />
          </div>

          {/* Dynamic Probability Curve Visualization */}
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800">
            <span className="text-[10px] font-mono uppercase text-slate-400 block mb-2">
              Probability Distribution Shape:
            </span>
            <div className="flex items-end gap-1.5 h-16 pt-2">
              {curveB.map((val, idx) => (
                <div key={idx} className="flex-1 flex flex-col items-center gap-1 h-full justify-end">
                  <div
                    className="w-full bg-orange-500 rounded-t transition-all duration-300"
                    style={{ height: `${Math.max(6, val)}%` }}
                  />
                  <span className="text-[9px] font-mono text-slate-500">#{idx + 1}</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-slate-400 mt-2 font-mono">
              The curve is flattened! Top tokens now have nearly equal probabilities (~{curveB[0]}% vs ~{curveB[1]}%).
            </p>
          </div>

          {/* Output Chamber */}
          <div className="hardware-slot p-4 rounded-xl min-h-[140px] text-xs font-mono">
            <span className="text-[10px] font-mono uppercase text-orange-400 block mb-1">
              Chamber Output:
            </span>
            {outputB ? (
              <p className="text-slate-200 whitespace-pre-wrap leading-relaxed">{outputB}</p>
            ) : (
              <span className="text-slate-600 italic">Click &quot;Run Dual Experiment&quot; to generate...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
