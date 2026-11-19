'use client';

import React, { useState, useEffect } from 'react';
import { LabStation } from '@/types/groq';
import { Header } from '@/components/layout/Header';
import { ApiKeyModal } from '@/components/layout/ApiKeyModal';
import { VercelDeployModal } from '@/components/layout/VercelDeployModal';
import { TokenMicroscope } from '@/components/stations/TokenMicroscope';
import { NextTokenCrystalBall } from '@/components/stations/NextTokenCrystalBall';
import { TemperatureChaosDial } from '@/components/stations/TemperatureChaosDial';
import { ContextMemoryMeter } from '@/components/stations/ContextMemoryMeter';
import { SystemPuppetStrings } from '@/components/stations/SystemPuppetStrings';
import { GroqSpeedometer } from '@/components/stations/GroqSpeedometer';
import { LabChallenges } from '@/components/challenges/LabChallenges';
import { sound } from '@/lib/audio';
import {
  Microscope,
  Sparkles,
  Sliders,
  Database,
  Drama,
  Gauge,
  Trophy,
  ArrowRight,
  Zap,
  Info,
  ShieldCheck,
} from 'lucide-react';

export default function Home() {
  const [station, setStation] = useState<LabStation>('microscope');
  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);

  // Load client key from sessionStorage on mount & check server key
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('groq_api_key');
      if (stored) {
        setApiKey(stored);
      }
    } catch {}

    // Check server key configuration
    fetch('/api/groq/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasServerKey) {
          setHasServerKey(true);
        }
      })
      .catch(() => {});
  }, []);

  const handleSaveKey = (key: string) => {
    setApiKey(key);
    try {
      sessionStorage.setItem('groq_api_key', key);
    } catch {}
    setIsKeyModalOpen(false);
  };

  const handleClearKey = () => {
    setApiKey(null);
    try {
      sessionStorage.removeItem('groq_api_key');
    } catch {}
  };

  const handleToggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    sound.enabled = next;
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#080c14] text-slate-100 selection:bg-orange-500/30 selection:text-orange-200">
      {/* Navigation Header */}
      <Header
        currentStation={station}
        onSelectStation={setStation}
        apiKey={apiKey}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
        hasServerKey={hasServerKey}
      />

      {/* Main Lab Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Active Station View */}
        {station === 'microscope' && <TokenMicroscope apiKey={apiKey} />}
        {station === 'crystalball' && <NextTokenCrystalBall apiKey={apiKey} />}
        {station === 'temperature' && <TemperatureChaosDial apiKey={apiKey} />}
        {station === 'context' && <ContextMemoryMeter apiKey={apiKey} />}
        {station === 'puppet' && <SystemPuppetStrings apiKey={apiKey} />}
        {station === 'speedometer' && <GroqSpeedometer apiKey={apiKey} />}
        {station === 'challenges' && <LabChallenges />}
      </main>

      {/* Bottom Lab Footer / Quick Hardware Navigation */}
      <footer className="border-t border-slate-800/80 bg-slate-950/80 mt-12 py-6 text-xs text-slate-400">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded bg-orange-500/20 flex items-center justify-center text-orange-400">
              <Zap className="w-3 h-3 fill-current" />
            </div>
            <span className="font-mono text-slate-300">
              GroqLab • Powered by Groq LPUs & Next.js App Router
            </span>
          </div>

          <div className="flex items-center gap-4 text-[11px] font-mono text-slate-500">
            <span>Zero Server State</span>
            <span>•</span>
            <span>Client-Safe API Proxy</span>
            <span>•</span>
            <button
              onClick={() => setIsDeployModalOpen(true)}
              className="text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              1-Click Vercel Deploy Guide
            </button>
          </div>
        </div>
      </footer>

      {/* Modals */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        onClearKey={handleClearKey}
        hasServerKey={hasServerKey}
      />

      <VercelDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
