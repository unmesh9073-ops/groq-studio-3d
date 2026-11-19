'use client';

import React from 'react';
import { LabStation } from '@/types/groq';
import { sound } from '@/lib/audio';
import {
  Zap,
  Microscope,
  Sparkles,
  Sliders,
  Database,
  Drama,
  Gauge,
  Trophy,
  Key,
  Volume2,
  VolumeX,
  UploadCloud,
  FlaskConical,
} from 'lucide-react';

interface HeaderProps {
  currentStation: LabStation;
  onSelectStation: (station: LabStation) => void;
  apiKey: string | null;
  onOpenKeyModal: () => void;
  onOpenDeployModal: () => void;
  soundEnabled: boolean;
  onToggleSound: () => void;
  hasServerKey?: boolean;
}

export function Header({
  currentStation,
  onSelectStation,
  apiKey,
  onOpenKeyModal,
  onOpenDeployModal,
  soundEnabled,
  onToggleSound,
  hasServerKey,
}: HeaderProps) {
  const isConnected = Boolean(apiKey || hasServerKey);

  const stations: { id: LabStation; label: string; icon: React.ReactNode; color: string }[] = [
    { id: 'microscope', label: '1. Token Microscope', icon: <Microscope className="w-4 h-4" />, color: 'emerald' },
    { id: 'crystalball', label: '2. Next-Token Probabilities', icon: <Sparkles className="w-4 h-4" />, color: 'cyan' },
    { id: 'temperature', label: '3. Temperature & Chaos', icon: <Sliders className="w-4 h-4" />, color: 'amber' },
    { id: 'context', label: '4. Context Memory', icon: <Database className="w-4 h-4" />, color: 'violet' },
    { id: 'puppet', label: '5. System Prompts', icon: <Drama className="w-4 h-4" />, color: 'rose' },
    { id: 'speedometer', label: '6. Groq LPU Speed', icon: <Gauge className="w-4 h-4" />, color: 'orange' },
    { id: 'challenges', label: 'Lab Quizzes 🏆', icon: <Trophy className="w-4 h-4" />, color: 'yellow' },
  ];

  return (
    <header className="border-b border-slate-800/80 bg-slate-950/80 backdrop-blur-md sticky top-0 z-40">
      {/* Top Utility Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-2.5 flex items-center justify-between border-b border-slate-800/40 text-xs">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  isConnected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                  isConnected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <span className="font-mono text-slate-300">
              {isConnected ? (
                <span className="text-emerald-400 font-medium">⚡ Groq LPUs Active</span>
              ) : (
                <span className="text-amber-400 font-medium">🧪 Simulation Mode (No Key Required)</span>
              )}
            </span>
          </div>

          <span className="text-slate-600 hidden sm:inline">|</span>

          <span className="text-slate-400 hidden sm:inline font-mono">
            Zero API key exposure • Client headers & server routes only
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Sound FX Toggle */}
          <button
            onClick={() => {
              onToggleSound();
              sound.click();
            }}
            title={soundEnabled ? 'Sound FX On (click to mute)' : 'Sound FX Off (click to unmute)'}
            className={`p-1.5 rounded-md border text-xs flex items-center gap-1 transition-colors ${
              soundEnabled
                ? 'bg-slate-800/70 border-slate-700 text-slate-300 hover:text-white'
                : 'bg-slate-900 border-slate-800 text-slate-500 hover:text-slate-400'
            }`}
          >
            {soundEnabled ? <Volume2 className="w-3.5 h-3.5 text-orange-400" /> : <VolumeX className="w-3.5 h-3.5" />}
            <span className="hidden md:inline font-mono text-[11px]">SFX</span>
          </button>

          {/* Vercel Deploy Helper */}
          <button
            onClick={() => {
              sound.click();
              onOpenDeployModal();
            }}
            className="px-2.5 py-1 rounded-md border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors"
          >
            <UploadCloud className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Deploy to Vercel</span>
          </button>

          {/* API Key Modal Button */}
          <button
            onClick={() => {
              sound.click();
              onOpenKeyModal();
            }}
            className={`px-3 py-1 rounded-md border text-xs font-mono font-medium flex items-center gap-1.5 transition-all shadow-sm ${
              isConnected
                ? 'bg-emerald-950/40 border-emerald-500/50 text-emerald-300 hover:bg-emerald-900/50'
                : 'bg-orange-950/40 border-orange-500/50 text-orange-300 hover:bg-orange-900/50 hover:shadow-orange-500/10'
            }`}
          >
            <Key className="w-3.5 h-3.5" />
            <span>{isConnected ? 'Groq Key Active' : 'Connect Groq Key'}</span>
          </button>
        </div>
      </div>

      {/* Main Brand & Station Navigator */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          {/* Logo & Headline */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-500/20 ring-1 ring-white/20">
              <Zap className="w-5 h-5 text-white fill-white" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold tracking-tight text-white flex items-center gap-2">
                  GroqLab
                  <span className="text-[10px] font-mono uppercase tracking-widest px-1.5 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                    LPU Science
                  </span>
                </h1>
              </div>
              <p className="text-xs text-slate-400">
                Interactive playground to dissect how Large Language Models actually work under the hood.
              </p>
            </div>
          </div>

          {/* Station Switcher Tabs */}
          <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            {stations.map((st) => {
              const active = currentStation === st.id;
              return (
                <button
                  key={st.id}
                  onClick={() => {
                    sound.click();
                    onSelectStation(st.id);
                  }}
                  className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap flex items-center gap-2 transition-all ${
                    active
                      ? 'bg-slate-800 text-white border border-slate-600 shadow-md shadow-black/40 ring-1 ring-orange-500/40'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60 border border-transparent'
                  }`}
                >
                  <span className={active ? 'text-orange-400' : 'text-slate-400'}>{st.icon}</span>
                  <span>{st.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </header>
  );
}
