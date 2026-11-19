'use client';

import React from 'react';
import { Visualizer3DScene, GroqParameters } from '@/types/groq';
import { Shared3DStage } from './Shared3DStage';
import { sound } from '@/lib/audio';
import {
  Maximize2,
  Minimize2,
  X,
  Sparkles,
  Sliders,
  Shield,
  Layers,
  Zap,
  Slash,
  Eye,
  Box,
  GitBranch,
  Columns,
  HelpCircle,
  Activity,
  Flame,
} from 'lucide-react';

interface Visualizer3DOverlayProps {
  currentScene: Visualizer3DScene;
  onSelectScene: (scene: Visualizer3DScene) => void;
  parameters: GroqParameters;
  onClose?: () => void;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
  isStreamingActive?: boolean;
  incomingTokenPulse?: number;
  lastTokenText?: string;
  isDocked?: boolean;
}

const SCENE_DESCRIPTIONS: Record<
  Visualizer3DScene,
  { title: string; subtitle: string; explanation: string; tip: string }
> = {
  pipeline: {
    title: 'End-to-End LLM Pipeline Overview',
    subtitle: 'From User Prompt to Ultra-Fast LPU Streaming Tokens',
    explanation:
      'A complete visual conveyor showing how text flows through the System Prompt Lens, gets fractured in the Subword Prism, accelerates through the Groq LPU Core, gets filtered in Sampling, and hits the Laser Gate.',
    tip: 'Click on any 3D stage or pedestal to zoom right into its dedicated physical scene!',
  },
  temperature: {
    title: 'Temperature (0.0 – 2.0): Probability Skyline',
    subtitle: 'Softmax Entropy & Risk Scaling',
    explanation:
      'At 0.0, the tallest peak locks in at 100% (greedy deterministic robot). As you slide Temperature up, the peaks flatten into a level plateau, and glowing selection orbs bounce toward riskier, creative words.',
    tip: 'Move the Temperature slider on the right to watch the 3D towers physically morph in real time!',
  },
  topp: {
    title: 'Top-P (Nucleus Sampling): Dynamic Force-Field Dome',
    subtitle: 'Cumulative Probability Mass Filtering',
    explanation:
      'Tokens are ranked from highest to lowest probability. Top-P draws a glowing force-field dome that captures tokens until their cumulative mass hits P. Outside tokens dim into transparent glass.',
    tip: 'Slide Top-P down to 0.2 to constrict the dome; slide it up to 1.0 to include all tokens.',
  },
  tokenization: {
    title: 'Tokenization: Subword Optical Prism',
    subtitle: 'Byte Pair Encoding (BPE) Slicer',
    explanation:
      'Raw incoming text enters the triangular optical prism and refracts into color-coded 3D crystal blocks (e.g. "strawberry" -> ["straw", "berry"]). The model only interacts with these numerical blocks.',
    tip: 'Notice how spaces and prefixes bind directly to subword blocks with stable token IDs.',
  },
  streaming: {
    title: 'Token Accelerator: Streaming vs Burst',
    subtitle: 'Groq Tensor Streaming Architecture',
    explanation:
      'With Streaming ON, tokens fire continuously down the magnetic accelerator tunnel as fast as Groq LPUs calculate them. With Streaming OFF, tokens are held in a glowing pressure chamber and released all at once.',
    tip: 'Toggle Streaming on the right to see the tunnel rings illuminate and fire token particles!',
  },
  maxtokens: {
    title: 'Max Completion Tokens: Physical Laser Gate',
    subtitle: 'Hardware Generation Boundary',
    explanation:
      'The laser gate sits along the token conveyor track. If the model output collides with this boundary before concluding naturally, generation stops immediately with finish_reason: "length".',
    tip: 'Drag Max Tokens to see the laser gate physically translate along the conveyor track.',
  },
  stopsequences: {
    title: 'Stop Sequences: Laser Tripwires',
    subtitle: 'Real-Time Generation Interceptors',
    explanation:
      'Configured stop sequences place physical laser tripwires across the output track. The moment a matching token hits the beam, the sensor flashes and halts generation.',
    tip: 'Add custom stop sequences like "\\n" or "User:" to see new tripwires deployed in 3D.',
  },
  systemprompt: {
    title: 'System Prompt: Persona Gravity Lens',
    subtitle: 'Deep Cognitive Steering Field',
    explanation:
      'A dense optical gravity field floating ahead of the model core. It visibly bends incoming prompt trajectories so they strike the neural network through the lens of a specific persona or ruleset.',
    tip: 'Edit the System Prompt to change the refractive index and color of the steering lens.',
  },
  jsonmode: {
    title: 'JSON Mode: Structural Blueprint Grid',
    subtitle: 'Constrained Decoding Architecture',
    explanation:
      'When JSON Mode is enabled, free-flowing organic token spheres are forced into rigid, crystalline key-value geometric cubes, guaranteeing valid parseable syntax.',
    tip: 'Toggle JSON Mode on the right to watch organic spheres snap into rigid cubic slots.',
  },
  seed: {
    title: 'Seed: Deterministic Probability Lattice',
    subtitle: 'Reproducibility & Controlled Sampling',
    explanation:
      'Setting a numeric seed locks the pseudo-random number generator onto a single golden rail, ensuring identical answers every run. Leaving it empty allows branching quantum-like paths.',
    tip: 'Enter an integer into Seed to lock the glowing golden rail in 3D space.',
  },
  compare: {
    title: 'Compare Mode 3D Sync: Dual Chamber Energy',
    subtitle: 'Simultaneous Side-by-Side Verification',
    explanation:
      'Side-by-side 3D comparison showing Chamber A (deterministic robot, blue peak) vs Chamber B (creative explorer, orange towers) running simultaneously on Groq LPUs.',
    tip: 'Compare different temperatures side-by-side to understand why determinism matters.',
  },
};

export function Visualizer3DOverlay({
  currentScene,
  onSelectScene,
  parameters,
  onClose,
  isExpanded = false,
  onToggleExpand,
  isStreamingActive = false,
  incomingTokenPulse = 0,
  lastTokenText = 'token',
  isDocked = false,
}: Visualizer3DOverlayProps) {
  const sceneInfo = SCENE_DESCRIPTIONS[currentScene] || SCENE_DESCRIPTIONS.pipeline;

  const scenesList: { id: Visualizer3DScene; label: string; icon: React.ReactNode }[] = [
    { id: 'pipeline', label: '1. Pipeline Overview', icon: <Activity className="w-3.5 h-3.5 text-orange-400" /> },
    { id: 'temperature', label: '2. Temperature Skyline', icon: <Flame className="w-3.5 h-3.5 text-amber-400" /> },
    { id: 'topp', label: '3. Top-P Dome', icon: <Shield className="w-3.5 h-3.5 text-cyan-400" /> },
    { id: 'tokenization', label: '4. Subword Prism', icon: <Layers className="w-3.5 h-3.5 text-emerald-400" /> },
    { id: 'streaming', label: '5. Accelerator Tunnel', icon: <Zap className="w-3.5 h-3.5 text-yellow-400" /> },
    { id: 'maxtokens', label: '6. Laser Gate', icon: <Slash className="w-3.5 h-3.5 text-rose-400" /> },
    { id: 'stopsequences', label: '7. Stop Tripwires', icon: <Eye className="w-3.5 h-3.5 text-violet-400" /> },
    { id: 'systemprompt', label: '8. Persona Lens', icon: <Sparkles className="w-3.5 h-3.5 text-pink-400" /> },
    { id: 'jsonmode', label: '9. JSON Blueprint', icon: <Box className="w-3.5 h-3.5 text-blue-400" /> },
    { id: 'seed', label: '10. Seed Lattice', icon: <GitBranch className="w-3.5 h-3.5 text-teal-400" /> },
    { id: 'compare', label: '11. Compare 3D', icon: <Columns className="w-3.5 h-3.5 text-indigo-400" /> },
  ];

  return (
    <div
      className={`hardware-panel rounded-2xl border border-slate-800 flex flex-col overflow-hidden transition-all duration-300 ${
        isExpanded ? 'h-[750px]' : 'h-[480px]'
      }`}
    >
      {/* Top Header Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/80 border-b border-slate-800/80">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Box className="w-3.5 h-3.5" />
          </div>
          <span className="text-xs font-bold text-white font-mono tracking-wide">
            3D Mechanism Visualizer
          </span>
          <span className="text-[10px] bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded font-mono border border-orange-500/30">
            Interactive Orbit &amp; Zoom
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {onToggleExpand && (
            <button
              onClick={() => {
                sound.click();
                onToggleExpand();
              }}
              title={isExpanded ? 'Contract View' : 'Expand View'}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              {isExpanded ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
            </button>
          )}

          {onClose && (
            <button
              onClick={() => {
                sound.click();
                onClose();
              }}
              title="Close 3D View"
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Horizontal Mechanism Tabs */}
      <div className="flex items-center gap-1 px-3 py-1.5 bg-slate-950/40 border-b border-slate-800/60 overflow-x-auto scrollbar-none text-xs">
        {scenesList.map((sc) => {
          const isActive = currentScene === sc.id;
          return (
            <button
              key={sc.id}
              onClick={() => {
                sound.click();
                onSelectScene(sc.id);
              }}
              className={`px-2.5 py-1 rounded-md whitespace-nowrap font-mono text-[11px] flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-orange-500/20 text-orange-300 border border-orange-500/40 font-semibold'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900 border border-transparent'
              }`}
            >
              {sc.icon}
              <span>{sc.label}</span>
            </button>
          );
        })}
      </div>

      {/* 3D Canvas Body */}
      <div className="flex-1 relative min-h-0">
        <Shared3DStage
          sceneType={currentScene}
          parameters={parameters}
          onSelectScene={onSelectScene}
          isStreamingActive={isStreamingActive}
          incomingTokenPulse={incomingTokenPulse}
          lastTokenText={lastTokenText}
          className="w-full h-full"
        />
      </div>

      {/* Bottom Educational Briefing Card */}
      <div className="p-3 bg-slate-950/90 border-t border-slate-800/80 text-xs font-mono space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="font-bold text-orange-400 text-sm">{sceneInfo.title}</span>
            <span className="text-slate-500">•</span>
            <span className="text-slate-400 text-[11px]">{sceneInfo.subtitle}</span>
          </div>
        </div>
        <p className="text-slate-300 text-[11px] leading-relaxed">{sceneInfo.explanation}</p>
        <p className="text-cyan-400/90 text-[10px] flex items-center gap-1">
          <HelpCircle className="w-3 h-3 shrink-0" />
          <span>Interactive Tip: {sceneInfo.tip}</span>
        </p>
      </div>
    </div>
  );
}
