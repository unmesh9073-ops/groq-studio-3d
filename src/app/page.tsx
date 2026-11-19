'use client';

import React, { useState, useEffect } from 'react';
import {
  PlaygroundMode,
  Visualizer3DScene,
  GroqParameters,
  ChatMessage,
  LabStation,
} from '@/types/groq';
import { CURATED_GROQ_MODELS, GroqModelInfo } from '@/lib/groq';
import { Header } from '@/components/layout/Header';
import { GroqPlayground } from '@/components/playground/GroqPlayground';
import { ParametersSidebar } from '@/components/playground/ParametersSidebar';
import { ViewCodeDrawer } from '@/components/playground/ViewCodeDrawer';
import { Visualizer3DOverlay } from '@/components/visualizer3d/Visualizer3DOverlay';
import { PageAwareAITutor } from '@/components/tutor/PageAwareAITutor';
import { CompareMode } from '@/components/compare/CompareMode';
import { ApiKeyModal } from '@/components/layout/ApiKeyModal';
import { VercelDeployModal } from '@/components/layout/VercelDeployModal';

// Keep all interactive learning stations
import { TokenMicroscope } from '@/components/stations/TokenMicroscope';
import { NextTokenCrystalBall } from '@/components/stations/NextTokenCrystalBall';
import { TemperatureChaosDial } from '@/components/stations/TemperatureChaosDial';
import { ContextMemoryMeter } from '@/components/stations/ContextMemoryMeter';
import { SystemPuppetStrings } from '@/components/stations/SystemPuppetStrings';
import { GroqSpeedometer } from '@/components/stations/GroqSpeedometer';
import { LabChallenges } from '@/components/challenges/LabChallenges';

import { sound } from '@/lib/audio';

const DEFAULT_PARAMETERS: GroqParameters = {
  model: 'llama-3.3-70b-versatile',
  temperature: 0.7,
  topP: 1.0,
  maxTokens: 1024,
  stream: true,
  jsonMode: false,
  seed: null,
  stopSequences: [],
};

export default function Home() {
  const [mode, setMode] = useState<PlaygroundMode>('playground');
  const [active3DScene, setActive3DScene] = useState<Visualizer3DScene>('pipeline');
  const [is3DOverlayOpen, setIs3DOverlayOpen] = useState<boolean>(true);
  const [is3DExpanded, setIs3DExpanded] = useState<boolean>(false);
  const [isAITutorOpen, setIsAITutorOpen] = useState<boolean>(false);
  const [isViewCodeOpen, setIsViewCodeOpen] = useState<boolean>(false);
  const [isKeyModalOpen, setIsKeyModalOpen] = useState<boolean>(false);
  const [isDeployModalOpen, setIsDeployModalOpen] = useState<boolean>(false);

  const [parameters, setParameters] = useState<GroqParameters>(DEFAULT_PARAMETERS);
  const [systemPrompt, setSystemPrompt] = useState('You are a helpful, brilliant AI assistant.');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [availableModels, setAvailableModels] = useState<GroqModelInfo[]>(CURATED_GROQ_MODELS);

  const [apiKey, setApiKey] = useState<string | null>(null);
  const [hasServerKey, setHasServerKey] = useState<boolean>(false);
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Real-time 3D token pulse
  const [incomingTokenPulse, setIncomingTokenPulse] = useState(0);
  const [lastTokenText, setLastTokenText] = useState('token');

  // Sub-station tab for Missions & Lab mode
  const [labStation, setLabStation] = useState<LabStation>('microscope');

  // Load client key from sessionStorage & fetch models
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem('groq_api_key');
      if (stored) setApiKey(stored);
    } catch {}

    fetch('/api/groq/verify')
      .then((res) => res.json())
      .then((data) => {
        if (data.hasServerKey) setHasServerKey(true);
      })
      .catch(() => {});

    // Fetch filtered models list
    fetch('/api/models')
      .then((res) => res.json())
      .then((data) => {
        if (data.models && Array.isArray(data.models)) {
          setAvailableModels(data.models);
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

  const handleInspect3D = (scene: Visualizer3DScene) => {
    sound.click();
    setActive3DScene(scene);
    setIs3DOverlayOpen(true);
  };

  const handleTokenPulse = (tokenText: string) => {
    setIncomingTokenPulse((prev) => prev + 1);
    setLastTokenText(tokenText);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#070b14] text-slate-100 selection:bg-orange-500/30 selection:text-orange-200">
      {/* Authentic GroqCloud Playground Header */}
      <Header
        currentMode={mode}
        onSelectMode={(m) => {
          setMode(m);
          if (m === '3dlab') {
            setActive3DScene('pipeline');
          }
        }}
        selectedModel={parameters.model}
        onSelectModel={(model) => setParameters({ ...parameters, model })}
        availableModels={availableModels}
        apiKey={apiKey}
        hasServerKey={hasServerKey}
        onOpenKeyModal={() => setIsKeyModalOpen(true)}
        onOpenDeployModal={() => setIsDeployModalOpen(true)}
        onOpenViewCode={() => setIsViewCodeOpen(true)}
        is3DOverlayOpen={is3DOverlayOpen}
        onToggle3DOverlay={() => setIs3DOverlayOpen(!is3DOverlayOpen)}
        isAITutorOpen={isAITutorOpen}
        onToggleAITutor={() => setIsAITutorOpen(!isAITutorOpen)}
        soundEnabled={soundEnabled}
        onToggleSound={handleToggleSound}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* 1. Full Playground Studio Mode */}
        {mode === 'playground' && (
          <div className="space-y-6">
            {/* Split layout: Chat & Controls */}
            <div className="flex flex-col lg:flex-row gap-6 items-start">
              {/* Left / Center: Main Playground Chat Workspace */}
              <div className="flex-1 w-full space-y-4">
                <GroqPlayground
                  parameters={parameters}
                  apiKey={apiKey}
                  onTokenPulse={handleTokenPulse}
                  systemPrompt={systemPrompt}
                  onSystemPromptChange={setSystemPrompt}
                  messages={messages}
                  onMessagesChange={setMessages}
                />

                {/* Docked 3D Visualizer Stage */}
                {is3DOverlayOpen && (
                  <Visualizer3DOverlay
                    currentScene={active3DScene}
                    onSelectScene={setActive3DScene}
                    parameters={parameters}
                    onClose={() => setIs3DOverlayOpen(false)}
                    isExpanded={is3DExpanded}
                    onToggleExpand={() => setIs3DExpanded(!is3DExpanded)}
                    incomingTokenPulse={incomingTokenPulse}
                    lastTokenText={lastTokenText}
                    isDocked={true}
                  />
                )}
              </div>

              {/* Right: Authentic Groq Parameters Sidebar */}
              <ParametersSidebar
                parameters={parameters}
                onChange={setParameters}
                onInspect3D={handleInspect3D}
                onResetDefaults={() => setParameters(DEFAULT_PARAMETERS)}
                active3DScene={active3DScene}
              />
            </div>
          </div>
        )}

        {/* 2. Compare Mode */}
        {mode === 'compare' && (
          <div className="space-y-6">
            <CompareMode apiKey={apiKey} onInspect3D={handleInspect3D} />
            {is3DOverlayOpen && (
              <Visualizer3DOverlay
                currentScene={active3DScene}
                onSelectScene={setActive3DScene}
                parameters={parameters}
                onClose={() => setIs3DOverlayOpen(false)}
                isExpanded={is3DExpanded}
                onToggleExpand={() => setIs3DExpanded(!is3DExpanded)}
                incomingTokenPulse={incomingTokenPulse}
                lastTokenText={lastTokenText}
              />
            )}
          </div>
        )}

        {/* 3. Missions & Educational Lab Mode */}
        {mode === 'missions' && (
          <div className="space-y-6">
            {/* Station Switcher */}
            <div className="flex items-center gap-2 overflow-x-auto pb-1 font-mono text-xs">
              {(
                [
                  { id: 'microscope', label: '1. Token Microscope' },
                  { id: 'crystalball', label: '2. Logprobs & Multiverse' },
                  { id: 'temperature', label: '3. Temperature & Chaos' },
                  { id: 'context', label: '4. Context Memory' },
                  { id: 'puppet', label: '5. System Prompts' },
                  { id: 'speedometer', label: '6. Groq LPU Speed' },
                  { id: 'challenges', label: 'Lab Quizzes 🏆' },
                ] as const
              ).map((st) => (
                <button
                  key={st.id}
                  onClick={() => {
                    sound.click();
                    setLabStation(st.id);
                  }}
                  className={`px-3 py-1.5 rounded-xl border whitespace-nowrap transition-colors ${
                    labStation === st.id
                      ? 'bg-orange-600 text-white font-bold border-orange-500 shadow-md shadow-orange-600/30'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {labStation === 'microscope' && <TokenMicroscope apiKey={apiKey} />}
            {labStation === 'crystalball' && <NextTokenCrystalBall apiKey={apiKey} />}
            {labStation === 'temperature' && <TemperatureChaosDial apiKey={apiKey} />}
            {labStation === 'context' && <ContextMemoryMeter apiKey={apiKey} />}
            {labStation === 'puppet' && <SystemPuppetStrings apiKey={apiKey} />}
            {labStation === 'speedometer' && <GroqSpeedometer apiKey={apiKey} />}
            {labStation === 'challenges' && <LabChallenges />}
          </div>
        )}

        {/* 4. Full-View Dedicated 3D Mechanism Laboratory Tab */}
        {mode === '3dlab' && (
          <div className="space-y-4">
            <Visualizer3DOverlay
              currentScene={active3DScene}
              onSelectScene={setActive3DScene}
              parameters={parameters}
              isExpanded={true}
              incomingTokenPulse={incomingTokenPulse}
              lastTokenText={lastTokenText}
            />
          </div>
        )}
      </main>

      {/* Floating/Slide-Over Page-Aware AI Tutor Drawer */}
      <PageAwareAITutor
        isOpen={isAITutorOpen}
        onClose={() => setIsAITutorOpen(false)}
        currentMode={mode}
        current3DScene={active3DScene}
        onFocus3DScene={handleInspect3D}
        parameters={parameters}
        onApplyPreset={(p) => setParameters((prev) => ({ ...prev, ...p }))}
        apiKey={apiKey}
      />

      {/* Full "View Code" Drawer */}
      <ViewCodeDrawer
        isOpen={isViewCodeOpen}
        onClose={() => setIsViewCodeOpen(false)}
        parameters={parameters}
        systemPrompt={systemPrompt}
        messages={messages}
      />

      {/* API Key Pass Modal */}
      <ApiKeyModal
        isOpen={isKeyModalOpen}
        onClose={() => setIsKeyModalOpen(false)}
        apiKey={apiKey}
        onSaveKey={handleSaveKey}
        onClearKey={handleClearKey}
        hasServerKey={hasServerKey}
      />

      {/* Vercel Deploy Helper Modal */}
      <VercelDeployModal
        isOpen={isDeployModalOpen}
        onClose={() => setIsDeployModalOpen(false)}
      />
    </div>
  );
}
