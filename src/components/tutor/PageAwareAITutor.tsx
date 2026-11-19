'use client';

import React, { useState } from 'react';
import { Visualizer3DScene, GroqParameters, PlaygroundMode } from '@/types/groq';
import { sound } from '@/lib/audio';
import {
  GraduationCap,
  Sparkles,
  X,
  Send,
  Box,
  Flame,
  Shield,
  Zap,
  Layers,
  ChevronRight,
  Lightbulb,
  Check,
  Bot,
  User,
} from 'lucide-react';

interface PageAwareAITutorProps {
  isOpen: boolean;
  onClose: () => void;
  currentMode: PlaygroundMode;
  current3DScene: Visualizer3DScene;
  onFocus3DScene: (scene: Visualizer3DScene) => void;
  parameters: GroqParameters;
  onApplyPreset: (params: Partial<GroqParameters>) => void;
  apiKey: string | null;
}

interface TutorMessage {
  id: string;
  sender: 'tutor' | 'user';
  text: string;
  suggestedAction?: {
    label: string;
    action: () => void;
  };
}

export function PageAwareAITutor({
  isOpen,
  onClose,
  currentMode,
  current3DScene,
  onFocus3DScene,
  parameters,
  onApplyPreset,
  apiKey,
}: PageAwareAITutorProps) {
  const [messages, setMessages] = useState<TutorMessage[]>([
    {
      id: 'welcome',
      sender: 'tutor',
      text: "👋 Hi! I'm your Page-Aware AI Tutor. I watch your sliders and models in real time to help you understand how LLMs think. What would you like to explore?",
    },
  ]);
  const [inputVal, setInputVal] = useState('');

  if (!isOpen) return null;

  const handleAsk = (userQuery: string) => {
    const q = userQuery.trim();
    if (!q) return;
    sound.click();

    const newMsgs: TutorMessage[] = [
      ...messages,
      { id: `u-${Date.now()}`, sender: 'user', text: q },
    ];
    setMessages(newMsgs);
    setInputVal('');

    // Generate context-aware reply
    setTimeout(() => {
      sound.success();
      const lower = q.toLowerCase();
      let replyText = '';
      let action: { label: string; action: () => void } | undefined = undefined;

      if (lower.includes('temp') || lower.includes('temperature') || lower.includes('creative')) {
        replyText = `🌡️ Temperature currently is ${parameters.temperature.toFixed(2)}. In the 3D Probability Skyline, Temperature flattens the energy landscape so rare words get chosen!`;
        action = {
          label: 'Inspect Temperature in 3D',
          action: () => onFocus3DScene('temperature'),
        };
      } else if (lower.includes('top-p') || lower.includes('topp') || lower.includes('nucleus')) {
        replyText = `🛡️ Top-P is currently ${parameters.topP.toFixed(2)}. It draws a 3D glowing force-field dome that trims away low-probability long-tail words.`;
        action = {
          label: 'Inspect Top-P Force-Field in 3D',
          action: () => onFocus3DScene('topp'),
        };
      } else if (lower.includes('stream') || lower.includes('fast') || lower.includes('speed') || lower.includes('lpu')) {
        replyText = `⚡ Groq LPUs achieve 700+ tokens/sec because they use on-chip SRAM instead of waiting on external memory buses. Streaming sends words to you the millisecond they are predicted!`;
        action = {
          label: 'Inspect Accelerator Tunnel in 3D',
          action: () => onFocus3DScene('streaming'),
        };
      } else if (lower.includes('token') || lower.includes('strawberry')) {
        replyText = `🔬 Models never see letters—they see numeric Token IDs. "strawberry" splits into 2 tokens: ["straw", "berry"], which is why counting letters confuses them!`;
        action = {
          label: 'Inspect Subword Prism in 3D',
          action: () => onFocus3DScene('tokenization'),
        };
      } else {
        replyText = `💡 You are currently working with ${parameters.model}. Feel free to adjust any slider on the right and click its 3D cube icon to see the underlying mathematics in action!`;
        action = {
          label: 'View 3D Pipeline Overview',
          action: () => onFocus3DScene('pipeline'),
        };
      }

      setMessages((prev) => [
        ...prev,
        {
          id: `t-${Date.now()}`,
          sender: 'tutor',
          text: replyText,
          suggestedAction: action,
        },
      ]);
    }, 400);
  };

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-96 max-w-full hardware-panel border-l border-slate-800 shadow-2xl flex flex-col animate-in slide-in-from-right duration-200">
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-950/80">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <GraduationCap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white font-mono flex items-center gap-1.5">
              <span>Page-Aware AI Tutor</span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </h3>
            <p className="text-[10px] text-slate-400 font-mono">
              Watching active mode: <span className="text-orange-400">{currentMode}</span>
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Quick Action Pills */}
      <div className="p-3 border-b border-slate-800/80 bg-slate-950/40 space-y-2">
        <span className="text-[10px] uppercase font-mono text-slate-400 block font-semibold">
          Instant 3D &amp; Learning Shortcuts:
        </span>
        <div className="flex flex-wrap gap-1.5">
          <button
            onClick={() => {
              sound.click();
              onFocus3DScene('pipeline');
            }}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
          >
            <Box className="w-3 h-3 text-orange-400" />
            <span>3D Pipeline</span>
          </button>
          <button
            onClick={() => {
              sound.click();
              onFocus3DScene('temperature');
            }}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
          >
            <Flame className="w-3 h-3 text-amber-400" />
            <span>3D Temperature</span>
          </button>
          <button
            onClick={() => {
              sound.click();
              onFocus3DScene('topp');
            }}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
          >
            <Shield className="w-3 h-3 text-cyan-400" />
            <span>3D Top-P</span>
          </button>
          <button
            onClick={() => {
              sound.click();
              onFocus3DScene('tokenization');
            }}
            className="px-2 py-1 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 text-[11px] font-mono text-slate-300 flex items-center gap-1"
          >
            <Layers className="w-3 h-3 text-emerald-400" />
            <span>3D Tokens</span>
          </button>
        </div>

        {/* Quick Parameter Presets */}
        <div className="pt-1 flex items-center gap-2">
          <span className="text-[10px] font-mono text-slate-500">Apply:</span>
          <button
            onClick={() => {
              sound.click();
              onApplyPreset({ temperature: 0.1, topP: 0.95 });
            }}
            className="text-[10px] font-mono text-blue-400 hover:underline"
          >
            Strict/Code (T:0.1)
          </button>
          <span className="text-slate-600">•</span>
          <button
            onClick={() => {
              sound.click();
              onApplyPreset({ temperature: 1.2, topP: 0.9 });
            }}
            className="text-[10px] font-mono text-amber-400 hover:underline"
          >
            Creative (T:1.2)
          </button>
        </div>
      </div>

      {/* Message Stream */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3 font-mono text-xs">
        {messages.map((m) => (
          <div
            key={m.id}
            className={`p-3 rounded-xl border leading-relaxed ${
              m.sender === 'user'
                ? 'bg-orange-950/30 border-orange-500/30 text-orange-200 ml-6'
                : 'bg-slate-950/80 border-slate-800 text-slate-300 mr-4'
            }`}
          >
            <div className="flex items-center gap-1.5 text-[10px] font-bold text-slate-500 uppercase mb-1">
              {m.sender === 'user' ? (
                <>
                  <User className="w-3 h-3 text-orange-400" />
                  <span>You</span>
                </>
              ) : (
                <>
                  <Bot className="w-3 h-3 text-orange-400" />
                  <span>AI Tutor</span>
                </>
              )}
            </div>
            <p className="whitespace-pre-wrap text-xs">{m.text}</p>

            {m.suggestedAction && (
              <button
                onClick={() => {
                  sound.click();
                  m.suggestedAction?.action();
                }}
                className="mt-2.5 px-2.5 py-1 rounded bg-orange-600/30 hover:bg-orange-600 border border-orange-500/40 text-orange-200 hover:text-white text-[11px] font-bold flex items-center gap-1 transition-all"
              >
                <span>{m.suggestedAction.label}</span>
                <ChevronRight className="w-3 h-3" />
              </button>
            )}
          </div>
        ))}
      </div>

      {/* Input Form */}
      <div className="p-3 border-t border-slate-800 bg-slate-950/80 flex items-center gap-2">
        <input
          type="text"
          value={inputVal}
          onChange={(e) => setInputVal(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleAsk(inputVal)}
          placeholder="Ask why streaming is faster, how temp works..."
          className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-3 py-2 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
        />
        <button
          onClick={() => handleAsk(inputVal)}
          disabled={!inputVal.trim()}
          className="p-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white transition-colors"
        >
          <Send className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
