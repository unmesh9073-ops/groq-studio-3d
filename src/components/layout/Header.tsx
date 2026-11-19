'use client';

import React from 'react';
import { PlaygroundMode, Visualizer3DScene } from '@/types/groq';
import { CURATED_GROQ_MODELS, GroqModelInfo } from '@/lib/groq';
import { sound } from '@/lib/audio';
import {
  Zap,
  Box,
  Code2,
  GraduationCap,
  Volume2,
  VolumeX,
  Key,
  UploadCloud,
  ChevronDown,
  Columns,
  Trophy,
  Sliders,
  Terminal,
  Activity,
  Sun,
  Moon,
} from 'lucide-react';

interface HeaderProps {
  currentMode: PlaygroundMode;
  onSelectMode: (mode: PlaygroundMode) => void;
  selectedModel: string;
  onSelectModel: (model: string) => void;
  availableModels: GroqModelInfo[];
  apiKey: string | null;
  hasServerKey?: boolean;
  onOpenKeyModal: () => void;
  onOpenDeployModal: () => void;
  onOpenViewCode: () => void;
  is3DOverlayOpen: boolean;
  onToggle3DOverlay: () => void;
  isAITutorOpen: boolean;
  onToggleAITutor: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
}

export function Header({
  currentMode,
  onSelectMode,
  selectedModel,
  onSelectModel,
  availableModels,
  apiKey,
  hasServerKey,
  onOpenKeyModal,
  onOpenDeployModal,
  onOpenViewCode,
  is3DOverlayOpen,
  onToggle3DOverlay,
  isAITutorOpen,
  onToggleAITutor,
  soundEnabled,
  onToggleSound,
}: HeaderProps) {
  const isConnected = Boolean(apiKey || hasServerKey);
  const activeModelInfo =
    availableModels.find((m) => m.id === selectedModel) || CURATED_GROQ_MODELS[0];

  const modeTabs: { id: PlaygroundMode; label: string; icon: React.ReactNode }[] = [
    { id: 'playground', label: 'Playground', icon: <Sliders className="w-3.5 h-3.5" /> },
    { id: 'compare', label: 'Compare Mode', icon: <Columns className="w-3.5 h-3.5" /> },
    { id: 'missions', label: 'Missions & Lab', icon: <Trophy className="w-3.5 h-3.5" /> },
    { id: '3dlab', label: '3D Mechanism Lab', icon: <Box className="w-3.5 h-3.5 text-orange-400" /> },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top Groq Sub-Header Notice */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2 flex items-center justify-between border-b border-slate-800/40 text-[11px] font-mono">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="text-slate-300">
              {isConnected ? (
                <span className="text-emerald-400 font-bold">⚡ Groq LPU Hardware Connected</span>
              ) : (
                <span className="text-amber-400 font-bold">🧪 Simulation Mode Active</span>
              )}
            </span>
          </div>

          <span className="text-slate-600 hidden md:inline">|</span>

          <span className="text-slate-400 hidden md:inline">
            GroqCloud Studio Engine • 3D Real-Time Physics Powered
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.click();
            }}
            title={soundEnabled ? 'Mute Sound FX' : 'Enable Sound FX'}
            className="p-1 rounded bg-slate-900 border border-slate-800 text-slate-400 hover:text-white"
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange-400" /> : <VolumeX className="w-3.5 h-3.5" />}
          </button>

          {/* Vercel Deploy */}
          <button
            onClick={() => {
              sound.click();
              onOpenDeployModal();
            }}
            className="px-2.5 py-1 rounded border border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-300 flex items-center gap-1.5 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Deploy</span>
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={() => {
              sound.click();
              onOpenKeyModal();
            }}
            className={`px-3 py-1 rounded border font-medium flex items-center gap-1.5 transition-all ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300'
                : 'bg-orange-950/40 border-orange-500/50 text-orange-300 hover:bg-orange-900/50'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isConnected ? 'Key Active' : 'Connect Groq Key'}</span>
          </button>
        </div>
      </div>

      {/* Main Studio Header */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex flex-col md:flex-row md:items-center justify-between gap-3">
        {/* Left: Branding & Model Selector */}
        <div className="flex items-center gap-4 flex-wrap">
          {/* Authentic GroqCloud Logo */}
          <div className="flex items-center gap-2.5 cursor-pointer" onClick={() => onSelectMode('playground')}>
            <div className="w-8 h-8 rounded-lg bg-[#F55036] flex items-center justify-center shadow-lg shadow-orange-600/30">
              <Zap className="w-4 h-4 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 font-mono">
                <span className="font-extrabold text-sm text-white tracking-tight">groq</span>
                <span className="text-[10px] text-orange-400 uppercase font-bold bg-orange-500/20 px-1 rounded border border-orange-500/30">
                  Cloud
                </span>
                <span className="text-slate-400 text-xs">/ Playground</span>
              </div>
            </div>
          </div>

          {/* Model Selector Dropdown */}
          <div className="relative">
            <select
              value={selectedModel}
              onChange={(e) => {
                sound.click();
                onSelectModel(e.target.value);
              }}
              className="bg-slate-900/90 border border-slate-700/80 hover:border-slate-600 text-xs text-white font-mono rounded-xl px-3 py-1.5 pr-8 appearance-none focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer shadow-sm"
            >
              {availableModels.map((m) => (
                <option key={m.id} value={m.id} className="bg-slate-900 text-slate-100">
                  {m.name} ({Math.round(m.contextWindow / 1024)}k ctx • ~{m.tokensPerSecEstimate} T/s)
                </option>
              ))}
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </div>

        {/* Center: Mode Switcher Tabs */}
        <nav className="flex items-center gap-1 bg-slate-900/60 p-1 rounded-xl border border-slate-800 overflow-x-auto scrollbar-none">
          {modeTabs.map((t) => {
            const isActive = currentMode === t.id;
            return (
              <button
                key={t.id}
                onClick={() => {
                  sound.click();
                  onSelectMode(t.id);
                }}
                className={`px-3 py-1.5 rounded-lg text-xs font-mono font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-orange-600 text-white shadow-md shadow-orange-600/30'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.icon}
                <span>{t.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Right: View Code, 3D Overlay Toggle, AI Tutor */}
        <div className="flex items-center gap-2">
          {/* View Code Button */}
          <button
            onClick={() => {
              sound.click();
              onOpenViewCode();
            }}
            className="px-3 py-1.5 rounded-xl border border-slate-700/80 bg-slate-900 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <Code2 className="w-3.5 h-3.5 text-cyan-400" />
            <span>View Code</span>
          </button>

          {/* 3D Visualizer Toggle Button */}
          <button
            onClick={() => {
              sound.click();
              onToggle3DOverlay();
            }}
            title="Toggle Live 3D Mechanism Stage"
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              is3DOverlayOpen
                ? 'bg-orange-500/20 border-orange-500/50 text-orange-300 shadow-md shadow-orange-500/20'
                : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Box className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">3D Stage</span>
          </button>

          {/* AI Tutor Toggle Button */}
          <button
            onClick={() => {
              sound.click();
              onToggleAITutor();
            }}
            title="Open Page-Aware AI Tutor"
            className={`px-3 py-1.5 rounded-xl border text-xs font-mono font-medium flex items-center gap-1.5 transition-all ${
              isAITutorOpen
                ? 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300 shadow-md shadow-emerald-500/20'
                : 'border-slate-800 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <GraduationCap className="w-3.5 h-3.5 text-emerald-400" />
            <span className="hidden sm:inline">AI Tutor</span>
          </button>
        </div>
      </div>
    </header>
  );
}
