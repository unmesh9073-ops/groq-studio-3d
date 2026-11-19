'use client';

import React, { useState } from 'react';
import { GroqParameters, Visualizer3DScene } from '@/types/groq';
import { sound } from '@/lib/audio';
import {
  Columns,
  Play,
  RotateCcw,
  Sparkles,
  Zap,
  Clock,
  Box,
  Loader2,
  Snowflake,
  Flame,
} from 'lucide-react';

interface CompareModeProps {
  apiKey: string | null;
  onInspect3D: (scene: Visualizer3DScene) => void;
}

export function CompareMode({ apiKey, onInspect3D }: CompareModeProps) {
  const [prompt, setPrompt] = useState('Invent a futuristic product that solves morning fatigue:');

  // Chamber A settings (e.g. Robot / Low Temp)
  const [modelA, setModelA] = useState('llama-3.3-70b-versatile');
  const [tempA, setTempA] = useState(0.0);
  const [outputA, setOutputA] = useState<string | null>(null);
  const [metricsA, setMetricsA] = useState<{ tps: number; ttft: number; ms: number } | null>(null);

  // Chamber B settings (e.g. Creative / High Temp)
  const [modelB, setModelB] = useState('llama-3.1-8b-instant');
  const [tempB, setTempB] = useState(1.6);
  const [outputB, setOutputB] = useState<string | null>(null);
  const [metricsB, setMetricsB] = useState<{ tps: number; ttft: number; ms: number } | null>(null);

  const [isLoading, setIsLoading] = useState(false);

  const handleRunCompare = async () => {
    if (!prompt.trim() || isLoading) return;
    sound.click();
    setIsLoading(true);
    setOutputA(null);
    setOutputB(null);
    setMetricsA(null);
    setMetricsB(null);

    const start = performance.now();

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 450));
        const total = Math.round(performance.now() - start);

        setOutputA(
          'Product: ChronoSync Neuro-Pillow\nDescription: An ergonomic memory foam pillow integrated with micro-current electromagnetic pulse emitters that stimulate slow-wave delta sleep cycles, gently elevating alpha brainwaves 15 minutes before waking to naturally suppress melatonin.'
        );
        setMetricsA({ tps: 340, ttft: 110, ms: total });

        setOutputB(
          'Product: The Solar-Mist Photon Lung!\nDescription: A neon-hued inhaler that nebulizes crystallized caffeine particles encapsulated in bioluminescent algae. One puff fills your lungs with strawberry light, instantly supercharging your mitochondria while playing 80s synthwave in your skull!'
        );
        setMetricsB({ tps: 760, ttft: 90, ms: total });

        sound.success();
        return;
      }

      // Live simultaneous calls to Groq LPUs
      const [resA, resB] = await Promise.all([
        fetch('/api/groq/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-groq-api-key': apiKey },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: modelA,
            temperature: tempA,
            max_tokens: 200,
          }),
        }),
        fetch('/api/groq/chat', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-groq-api-key': apiKey },
          body: JSON.stringify({
            messages: [{ role: 'user', content: prompt }],
            model: modelB,
            temperature: tempB,
            max_tokens: 200,
          }),
        }),
      ]);

      const [dataA, dataB] = await Promise.all([resA.json(), resB.json()]);

      setOutputA(dataA.text || 'Error in Chamber A');
      setMetricsA({
        tps: dataA.usage?.tokensPerSecond || 300,
        ttft: dataA.usage?.firstTokenTimeMs || 120,
        ms: dataA.usage?.durationMs || 300,
      });

      setOutputB(dataB.text || 'Error in Chamber B');
      setMetricsB({
        tps: dataB.usage?.tokensPerSecond || 700,
        ttft: dataB.usage?.firstTokenTimeMs || 100,
        ms: dataB.usage?.durationMs || 250,
      });

      sound.success();
    } catch {
      sound.error();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Shared Prompt Bar */}
      <div className="hardware-panel rounded-2xl p-6 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Columns className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white font-mono">
                Compare Mode: Side-by-Side LPU Benchmark
              </h2>
              <p className="text-xs text-slate-400">
                Run two models or temperatures simultaneously to observe speed and variance differences.
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              sound.click();
              onInspect3D('compare');
            }}
            className="px-3 py-1.5 rounded-xl border border-indigo-500/40 bg-indigo-950/30 hover:bg-indigo-900/40 text-indigo-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Box className="w-3.5 h-3.5" />
            <span>Inspect Compare in 3D</span>
          </button>
        </div>

        {/* Prompt Input */}
        <div className="flex items-center gap-2 pt-1">
          <input
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Type prompt to send to both chambers..."
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />
          <button
            onClick={handleRunCompare}
            disabled={isLoading || !prompt.trim()}
            className="px-5 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white font-bold text-xs font-mono flex items-center gap-2 shadow-lg shadow-orange-600/30 transition-all"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Firing Both...
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                Run Compare
              </>
            )}
          </button>
        </div>
      </div>

      {/* Dual Chambers Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Chamber A */}
        <div className="hardware-panel rounded-2xl p-5 border border-blue-500/30 bg-blue-950/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-blue-500/20">
            <div className="flex items-center gap-2">
              <Snowflake className="w-4 h-4 text-blue-400" />
              <span className="text-xs font-bold text-blue-200 font-mono">Chamber A (Deterministic)</span>
            </div>
            <span className="text-xs font-mono text-blue-400 font-bold">
              Temp: {tempA.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Model Selection:</label>
              <select
                value={modelA}
                onChange={(e) => setModelA(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant</option>
                <option value="openai/gpt-oss-120b">GPT-OSS 120B</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Temperature</span>
                <span>{tempA.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.0"
                max="1.0"
                step="0.05"
                value={tempA}
                onChange={(e) => setTempA(parseFloat(e.target.value))}
                className="w-full accent-blue-500"
              />
            </div>
          </div>

          {/* Output & Badges */}
          <div className="hardware-slot p-4 rounded-xl min-h-[220px] text-xs font-mono leading-relaxed space-y-3">
            {outputA ? (
              <>
                <p className="text-slate-200 whitespace-pre-wrap">{outputA}</p>
                {metricsA && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="text-blue-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      {metricsA.tps} T/s
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {metricsA.ttft}ms TTFT
                    </span>
                    <span>{metricsA.ms}ms total</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-600 italic">Output for Chamber A will appear here...</span>
            )}
          </div>
        </div>

        {/* Chamber B */}
        <div className="hardware-panel rounded-2xl p-5 border border-orange-500/30 bg-orange-950/10 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-orange-500/20">
            <div className="flex items-center gap-2">
              <Flame className="w-4 h-4 text-orange-400" />
              <span className="text-xs font-bold text-orange-200 font-mono">Chamber B (Creative)</span>
            </div>
            <span className="text-xs font-mono text-orange-400 font-bold">
              Temp: {tempB.toFixed(2)}
            </span>
          </div>

          <div className="space-y-3 font-mono text-xs">
            <div>
              <label className="text-[11px] text-slate-400 block mb-1">Model Selection:</label>
              <select
                value={modelB}
                onChange={(e) => setModelB(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-2 text-xs text-white"
              >
                <option value="llama-3.1-8b-instant">Llama 3.1 8B Instant (750+ T/s)</option>
                <option value="llama-3.3-70b-versatile">Llama 3.3 70B Versatile</option>
                <option value="openai/gpt-oss-20b">GPT-OSS 20B High Speed</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Temperature</span>
                <span>{tempB.toFixed(2)}</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="2.0"
                step="0.05"
                value={tempB}
                onChange={(e) => setTempB(parseFloat(e.target.value))}
                className="w-full accent-orange-500"
              />
            </div>
          </div>

          {/* Output & Badges */}
          <div className="hardware-slot p-4 rounded-xl min-h-[220px] text-xs font-mono leading-relaxed space-y-3">
            {outputB ? (
              <>
                <p className="text-slate-200 whitespace-pre-wrap">{outputB}</p>
                {metricsB && (
                  <div className="pt-2 border-t border-slate-800 flex items-center gap-3 text-[10px] text-slate-400">
                    <span className="text-orange-400 font-bold flex items-center gap-1">
                      <Zap className="w-3 h-3 fill-current" />
                      {metricsB.tps} T/s
                    </span>
                    <span className="text-emerald-400 flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {metricsB.ttft}ms TTFT
                    </span>
                    <span>{metricsB.ms}ms total</span>
                  </div>
                )}
              </>
            ) : (
              <span className="text-slate-600 italic">Output for Chamber B will appear here...</span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
