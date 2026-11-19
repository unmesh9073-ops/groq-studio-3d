'use client';

import React, { useState, useEffect } from 'react';
import { sound } from '@/lib/audio';
import {
  Gauge,
  Zap,
  Play,
  RotateCcw,
  Sparkles,
  Info,
  Timer,
  Activity,
  Award,
  Loader2,
  ChevronRight,
} from 'lucide-react';

interface GroqSpeedometerProps {
  apiKey: string | null;
}

const RACE_TEXT =
  'Artificial intelligence on Groq LPUs operates at the speed of human thought. By eliminating the memory bandwidth bottleneck of traditional GPUs with ultra-fast on-chip SRAM, Groq generates hundreds of tokens per second in real-time!';

export function GroqSpeedometer({ apiKey }: GroqSpeedometerProps) {
  const [model, setModel] = useState('llama-3.1-8b-instant');
  const [prompt, setPrompt] = useState('Explain the difference between a GPU and a Groq LPU in 2 fast sentences.');
  const [liveTps, setLiveTps] = useState<number>(680);
  const [liveTtft, setLiveTtft] = useState<number>(115);
  const [totalTimeMs, setTotalTimeMs] = useState<number>(230);
  const [generatedTokens, setGeneratedTokens] = useState<number>(156);
  const [output, setOutput] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // The Great Speed Race State
  const [isRacing, setIsRacing] = useState(false);
  const [raceHumanText, setRaceHumanText] = useState('');
  const [raceGpuText, setRaceGpuText] = useState('');
  const [raceGroqText, setRaceGroqText] = useState('');

  const raceWords = RACE_TEXT.split(' ');

  const handleStartRace = () => {
    sound.click();
    setIsRacing(true);
    setRaceHumanText('');
    setRaceGpuText('');
    setRaceGroqText('');

    // Groq LPU: instant flash (~600 t/s)
    let groqIdx = 0;
    const groqTimer = setInterval(() => {
      if (groqIdx < raceWords.length) {
        setRaceGroqText(raceWords.slice(0, groqIdx + 3).join(' '));
        groqIdx += 3;
        sound.tokenPop(800);
      } else {
        clearInterval(groqTimer);
      }
    }, 15);

    // Traditional GPU: steady pace (~35 t/s)
    let gpuIdx = 0;
    const gpuTimer = setInterval(() => {
      if (gpuIdx < raceWords.length) {
        setRaceGpuText(raceWords.slice(0, gpuIdx + 1).join(' '));
        gpuIdx += 1;
      } else {
        clearInterval(gpuTimer);
      }
    }, 70);

    // Human Reader: slow reading pace (~4.5 t/s)
    let humanIdx = 0;
    const humanTimer = setInterval(() => {
      if (humanIdx < raceWords.length) {
        setRaceHumanText(raceWords.slice(0, humanIdx + 1).join(' '));
        humanIdx += 1;
      } else {
        clearInterval(humanTimer);
        setIsRacing(false);
      }
    }, 280);
  };

  const handleLiveSpeedTest = async () => {
    sound.click();
    setIsLoading(true);
    setOutput(null);

    const startTime = performance.now();

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 220));
        const simTps = model.includes('8b') ? 720 : 340;
        setLiveTps(simTps);
        setLiveTtft(110);
        setTotalTimeMs(220);
        setGeneratedTokens(98);
        setOutput(
          'GPUs were designed for rendering graphics and require high-bandwidth memory chips that create latency bottlenecks. Groq LPUs are purpose-built for AI models using direct on-chip SRAM, enabling data to flow at lightning speed without waiting in memory queues!'
        );
        sound.success();
        return;
      }

      // Live Groq Call
      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-groq-api-key': apiKey },
        body: JSON.stringify({
          messages: [{ role: 'user', content: prompt }],
          model,
          temperature: 0.7,
          max_tokens: 180,
        }),
      });

      const endTime = performance.now();
      const totalMs = Math.round(endTime - startTime);

      const data = await res.json();
      if (data.text) {
        setOutput(data.text);
        const compTokens = data.usage?.completionTokens || 100;
        const tps = data.usage?.tokensPerSecond || Math.round((compTokens / totalMs) * 1000);
        setLiveTps(tps);
        setLiveTtft(Math.round(totalMs * 0.35));
        setTotalTimeMs(totalMs);
        setGeneratedTokens(compTokens);
        sound.success();
      } else {
        setOutput(data.error || 'Speed test failed');
        sound.error();
      }
    } catch {
      sound.error();
    } finally {
      setIsLoading(false);
    }
  };

  // Speedometer needle angle calculation: 0 tps = -90deg, 1000 tps = 90deg
  const needleAngle = Math.min(90, Math.max(-90, -90 + (liveTps / 1000) * 180));

  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-orange-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-orange-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400 shrink-0">
              <Gauge className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-orange-400 font-bold">
                  Station 6
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-400">Tensor Streaming LPU Hardware</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                The Groq LPU Speedometer: The Need for Speed
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-950/80 px-3.5 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <Zap className="w-4 h-4 text-orange-400" />
            <span className="text-slate-400">Current Velocity:</span>
            <span className="text-orange-300 font-bold">{liveTps} Tok/s</span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          Traditional GPU clouds queue requests and battle High Bandwidth Memory (HBM) bottlenecks. Groq invented the <strong>LPU (Language Processing Unit)</strong> with on-chip SRAM, streaming tokens up to 10x-20x faster than traditional GPU servers!
        </p>
      </div>

      {/* The Great Speed Race (Side-by-Side Visual Track) */}
      <div className="hardware-panel rounded-2xl p-6 border border-orange-500/30 bg-orange-950/10 space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <Award className="w-5 h-5 text-orange-400" />
              <span>The Great Speed Race: Human vs GPU vs Groq LPU</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Watch all three racers generate the exact same text simultaneously!
            </p>
          </div>

          <button
            onClick={handleStartRace}
            disabled={isRacing}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-white font-bold text-xs flex items-center gap-2 shadow-lg shadow-orange-500/20 disabled:opacity-50 transition-all"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>{isRacing ? 'Race in Progress...' : 'Start The Race!'}</span>
          </button>
        </div>

        {/* 3 Race Tracks */}
        <div className="space-y-3 pt-2">
          {/* Lane 1: Groq LPU */}
          <div className="bg-slate-950/90 rounded-xl p-3.5 border border-orange-500/30 relative overflow-hidden">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2 font-bold text-orange-300">
                <Zap className="w-4 h-4 text-orange-400" />
                <span>⚡ Groq LPU (~650 tokens/sec)</span>
              </div>
              <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded border border-orange-500/30">
                1st Place (Lightning)
              </span>
            </div>
            <p className="text-xs font-mono text-orange-100 min-h-[40px] leading-relaxed">
              {raceGroqText || <span className="text-slate-600 italic">Click &quot;Start The Race!&quot; to test...</span>}
            </p>
          </div>

          {/* Lane 2: Traditional GPU */}
          <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2 font-semibold text-cyan-300">
                <span>☁️ Traditional Cloud GPU (~35 tokens/sec)</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                2nd Place (Average)
              </span>
            </div>
            <p className="text-xs font-mono text-cyan-100 min-h-[40px] leading-relaxed">
              {raceGpuText || <span className="text-slate-600 italic">Waiting for green light...</span>}
            </p>
          </div>

          {/* Lane 3: Human Reader */}
          <div className="bg-slate-950/90 rounded-xl p-3.5 border border-slate-800">
            <div className="flex items-center justify-between text-xs font-mono mb-2">
              <div className="flex items-center gap-2 font-semibold text-slate-300">
                <span>🧑 Human Reading Speed (~4.5 tokens/sec)</span>
              </div>
              <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-0.5 rounded">
                3rd Place (Baseline)
              </span>
            </div>
            <p className="text-xs font-mono text-slate-300 min-h-[40px] leading-relaxed">
              {raceHumanText || <span className="text-slate-600 italic">Waiting for green light...</span>}
            </p>
          </div>
        </div>
      </div>

      {/* Live Benchmark & Speedometer Console */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Tachometer & Hardware Metrics (Span 1) */}
        <div className="hardware-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
            <Activity className="w-4 h-4 text-orange-400" />
            <h3 className="text-sm font-bold text-white">LPU Tachometer Dial</h3>
          </div>

          {/* Analog Dial Gauge SVG */}
          <div className="flex flex-col items-center justify-center pt-2">
            <div className="relative w-48 h-28 flex items-end justify-center overflow-hidden">
              {/* Dial Arc */}
              <svg className="w-48 h-48 -mb-24" viewBox="0 0 100 100">
                {/* Background arc */}
                <path
                  d="M 15 50 A 35 35 0 0 1 85 50"
                  fill="none"
                  stroke="#1e293b"
                  strokeWidth="8"
                  strokeLinecap="round"
                />
                {/* Active gradient arc */}
                <path
                  d="M 15 50 A 35 35 0 0 1 85 50"
                  fill="none"
                  stroke="url(#dialGrad)"
                  strokeWidth="8"
                  strokeDasharray="110"
                  strokeDashoffset={110 - (liveTps / 1000) * 110}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
                <defs>
                  <linearGradient id="dialGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#06b6d4" />
                    <stop offset="50%" stopColor="#f59e0b" />
                    <stop offset="100%" stopColor="#f97316" />
                  </linearGradient>
                </defs>
              </svg>

              {/* Center Needle */}
              <div
                className="absolute bottom-0 w-1 h-20 bg-orange-500 origin-bottom rounded-full transition-transform duration-700 shadow-md shadow-orange-500/50"
                style={{ transform: `rotate(${needleAngle}deg)` }}
              />
              <div className="absolute bottom-0 w-4 h-4 rounded-full bg-white border-2 border-slate-900 shadow" />
            </div>

            <div className="text-center mt-2">
              <span className="text-3xl font-extrabold font-mono text-white tracking-tight">
                {liveTps}
              </span>
              <span className="text-xs font-mono text-orange-400 block font-semibold">
                TOKENS / SECOND
              </span>
            </div>
          </div>

          {/* Hardware Readouts */}
          <div className="space-y-2 text-xs font-mono pt-2">
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400">Time to First Token (TTFT)</span>
              <span className="text-emerald-400 font-bold">~{liveTtft} ms</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400">Total Generation Latency</span>
              <span className="text-cyan-400 font-bold">{totalTimeMs} ms</span>
            </div>
            <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-950/70 border border-slate-800">
              <span className="text-slate-400">Completion Tokens</span>
              <span className="text-amber-400 font-bold">{generatedTokens} tokens</span>
            </div>
          </div>
        </div>

        {/* Right: Live Benchmark Tester (Span 2) */}
        <div className="lg:col-span-2 hardware-panel rounded-2xl p-5 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <span>Interactive Benchmark Trigger</span>
            </h3>

            {/* Model Selector */}
            <div className="flex items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800 text-xs font-mono">
              <button
                onClick={() => {
                  sound.click();
                  setModel('llama-3.1-8b-instant');
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  model === 'llama-3.1-8b-instant'
                    ? 'bg-orange-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Llama 3.1 8B (Fastest)
              </button>
              <button
                onClick={() => {
                  sound.click();
                  setModel('llama-3.3-70b-versatile');
                }}
                className={`px-2.5 py-1 rounded transition-colors ${
                  model === 'llama-3.3-70b-versatile'
                    ? 'bg-orange-600 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Llama 3.3 70B (Deep Reasoning)
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs font-mono text-slate-300 block mb-1.5 font-medium">
              Benchmark Prompt:
            </label>
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/40 focus:border-orange-500"
            />
          </div>

          <div className="flex justify-end">
            <button
              onClick={handleLiveSpeedTest}
              disabled={isLoading || !prompt.trim()}
              className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-orange-600/30"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Clocking LPUs...
                </>
              ) : (
                <>
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Clock Groq LPU Speed
                </>
              )}
            </button>
          </div>

          {/* Generated Result */}
          <div className="hardware-slot p-4 rounded-xl min-h-[140px] text-xs font-mono leading-relaxed">
            <span className="text-[10px] font-mono uppercase text-orange-400 block mb-1">
              Live LPU Output Stream:
            </span>
            {output ? (
              <p className="text-slate-200 whitespace-pre-wrap">{output}</p>
            ) : (
              <span className="text-slate-600 italic">
                Click &quot;Clock Groq LPU Speed&quot; to test real-time tokens per second!
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
