'use client';

import React, { useState } from 'react';
import { GroqParameters, Visualizer3DScene } from '@/types/groq';
import { sound } from '@/lib/audio';
import {
  Sliders,
  Box,
  RotateCcw,
  Sparkles,
  Info,
  Flame,
  Shield,
  Zap,
  Slash,
  Eye,
  GitBranch,
  Check,
  Plus,
  X,
} from 'lucide-react';

interface ParametersSidebarProps {
  parameters: GroqParameters;
  onChange: (params: GroqParameters) => void;
  onInspect3D: (scene: Visualizer3DScene) => void;
  onResetDefaults: () => void;
  active3DScene?: Visualizer3DScene;
}

export function ParametersSidebar({
  parameters,
  onChange,
  onInspect3D,
  onResetDefaults,
  active3DScene,
}: ParametersSidebarProps) {
  const [stopInput, setStopInput] = useState('');

  const updateParam = <K extends keyof GroqParameters>(key: K, value: GroqParameters[K]) => {
    onChange({ ...parameters, [key]: value });
  };

  const handleAddStop = () => {
    const trimmed = stopInput.trim();
    if (!trimmed || parameters.stopSequences.includes(trimmed)) return;
    sound.click();
    updateParam('stopSequences', [...parameters.stopSequences, trimmed]);
    setStopInput('');
  };

  const handleRemoveStop = (seq: string) => {
    sound.click();
    updateParam(
      'stopSequences',
      parameters.stopSequences.filter((s) => s !== seq)
    );
  };

  return (
    <aside className="w-80 shrink-0 hardware-panel rounded-2xl p-5 border border-slate-800 space-y-6 flex flex-col overflow-y-auto max-h-[calc(100vh-140px)] sticky top-20">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
        <div className="flex items-center gap-2">
          <Sliders className="w-4 h-4 text-orange-400" />
          <h3 className="text-xs font-bold text-white font-mono uppercase tracking-wider">
            Model Parameters
          </h3>
        </div>

        <button
          onClick={() => {
            sound.click();
            onResetDefaults();
          }}
          title="Reset Parameters to Default"
          className="p-1 rounded-md text-slate-500 hover:text-slate-300 hover:bg-slate-800 transition-colors"
        >
          <RotateCcw className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 1. Temperature */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold">Temperature</span>
            <button
              onClick={() => {
                sound.click();
                onInspect3D('temperature');
              }}
              title="Inspect Temperature in 3D"
              className={`p-1 rounded transition-colors ${
                active3DScene === 'temperature'
                  ? 'bg-orange-500/20 text-orange-400'
                  : 'text-slate-500 hover:text-orange-400'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-orange-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {parameters.temperature.toFixed(2)}
          </span>
        </div>

        <input
          type="range"
          min="0.0"
          max="2.0"
          step="0.01"
          value={parameters.temperature}
          onChange={(e) => {
            sound.switchToggle();
            updateParam('temperature', parseFloat(e.target.value));
          }}
          className="w-full accent-orange-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>0.0 (Robot)</span>
          <span>0.7 (Balanced)</span>
          <span>2.0 (Chaos)</span>
        </div>
      </div>

      {/* 2. Top-P (Nucleus Sampling) */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold">Top P</span>
            <button
              onClick={() => {
                sound.click();
                onInspect3D('topp');
              }}
              title="Inspect Top-P Forcefield in 3D"
              className={`p-1 rounded transition-colors ${
                active3DScene === 'topp'
                  ? 'bg-cyan-500/20 text-cyan-400'
                  : 'text-slate-500 hover:text-cyan-400'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-cyan-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {parameters.topP.toFixed(2)}
          </span>
        </div>

        <input
          type="range"
          min="0.0"
          max="1.0"
          step="0.01"
          value={parameters.topP}
          onChange={(e) => {
            sound.switchToggle();
            updateParam('topP', parseFloat(e.target.value));
          }}
          className="w-full accent-cyan-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />

        <div className="flex justify-between text-[10px] font-mono text-slate-500">
          <span>0.1 (Strict Nucleus)</span>
          <span>1.0 (Full Mass)</span>
        </div>
      </div>

      {/* 3. Max Completion Tokens */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold">Max Tokens</span>
            <button
              onClick={() => {
                sound.click();
                onInspect3D('maxtokens');
              }}
              title="Inspect Max Token Laser Gate in 3D"
              className={`p-1 rounded transition-colors ${
                active3DScene === 'maxtokens'
                  ? 'bg-rose-500/20 text-rose-400'
                  : 'text-slate-500 hover:text-rose-400'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-rose-400 font-bold bg-slate-950 px-2 py-0.5 rounded border border-slate-800">
            {parameters.maxTokens}
          </span>
        </div>

        <input
          type="range"
          min="16"
          max="4096"
          step="16"
          value={parameters.maxTokens}
          onChange={(e) => {
            sound.switchToggle();
            updateParam('maxTokens', parseInt(e.target.value));
          }}
          className="w-full accent-rose-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg"
        />
      </div>

      {/* 4. Streaming Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-200 font-semibold">Streaming</span>
          <button
            onClick={() => {
              sound.click();
              onInspect3D('streaming');
            }}
            title="Inspect Accelerator Tunnel in 3D"
            className={`p-1 rounded transition-colors ${
              active3DScene === 'streaming'
                ? 'bg-yellow-500/20 text-yellow-400'
                : 'text-slate-500 hover:text-yellow-400'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => {
            sound.switchToggle();
            updateParam('stream', !parameters.stream);
          }}
          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
            parameters.stream ? 'bg-orange-600' : 'bg-slate-800'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              parameters.stream ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 5. JSON Mode Toggle */}
      <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950/70 border border-slate-800">
        <div className="flex items-center gap-1.5 text-xs font-mono">
          <span className="text-slate-200 font-semibold">JSON Mode</span>
          <button
            onClick={() => {
              sound.click();
              onInspect3D('jsonmode');
            }}
            title="Inspect Structural Blueprint in 3D"
            className={`p-1 rounded transition-colors ${
              active3DScene === 'jsonmode'
                ? 'bg-blue-500/20 text-blue-400'
                : 'text-slate-500 hover:text-blue-400'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
          </button>
        </div>

        <button
          onClick={() => {
            sound.switchToggle();
            updateParam('jsonMode', !parameters.jsonMode);
          }}
          className={`w-11 h-6 rounded-full transition-colors relative p-0.5 ${
            parameters.jsonMode ? 'bg-blue-600' : 'bg-slate-800'
          }`}
        >
          <div
            className={`w-5 h-5 rounded-full bg-white transition-transform ${
              parameters.jsonMode ? 'translate-x-5' : 'translate-x-0'
            }`}
          />
        </button>
      </div>

      {/* 6. Seed (Deterministic Reproducibility) */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold">Seed</span>
            <button
              onClick={() => {
                sound.click();
                onInspect3D('seed');
              }}
              title="Inspect Seed Lattice in 3D"
              className={`p-1 rounded transition-colors ${
                active3DScene === 'seed'
                  ? 'bg-teal-500/20 text-teal-400'
                  : 'text-slate-500 hover:text-teal-400'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
          {parameters.seed !== null && (
            <button
              onClick={() => updateParam('seed', null)}
              className="text-[10px] text-slate-500 hover:text-slate-300"
            >
              Clear
            </button>
          )}
        </div>

        <input
          type="number"
          placeholder="e.g. 42 (optional)"
          value={parameters.seed ?? ''}
          onChange={(e) => {
            const val = e.target.value.trim() === '' ? null : parseInt(e.target.value);
            updateParam('seed', isNaN(val as number) ? null : val);
          }}
          className="w-full bg-slate-950 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-teal-500"
        />
      </div>

      {/* 7. Stop Sequences */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-1.5">
            <span className="text-slate-200 font-semibold">Stop Sequences</span>
            <button
              onClick={() => {
                sound.click();
                onInspect3D('stopsequences');
              }}
              title="Inspect Laser Tripwires in 3D"
              className={`p-1 rounded transition-colors ${
                active3DScene === 'stopsequences'
                  ? 'bg-violet-500/20 text-violet-400'
                  : 'text-slate-500 hover:text-violet-400'
              }`}
            >
              <Box className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <input
            type="text"
            placeholder="e.g. \n or User:"
            value={stopInput}
            onChange={(e) => setStopInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddStop()}
            className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-2.5 py-1.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-violet-500"
          />
          <button
            onClick={handleAddStop}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Tag pills */}
        {parameters.stopSequences.length > 0 && (
          <div className="flex flex-wrap gap-1.5 pt-1">
            {parameters.stopSequences.map((seq) => (
              <span
                key={seq}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-violet-950/40 border border-violet-500/30 text-violet-300 text-[10px] font-mono"
              >
                <span>{seq}</span>
                <button
                  onClick={() => handleRemoveStop(seq)}
                  className="hover:text-white"
                >
                  <X className="w-3 h-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>
    </aside>
  );
}
