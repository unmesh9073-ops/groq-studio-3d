'use client';

import React, { useState } from 'react';
import { sound } from '@/lib/audio';
import {
  Database,
  Trash2,
  Send,
  Scissors,
  HelpCircle,
  Info,
  Layers,
  Sparkles,
  Loader2,
  Bot,
  User,
  Shield,
} from 'lucide-react';

interface ContextMemoryMeterProps {
  apiKey: string | null;
}

interface MessageItem {
  id: string;
  role: 'system' | 'user' | 'assistant';
  content: string;
  tokensEstimate: number;
}

export function ContextMemoryMeter({ apiKey }: ContextMemoryMeterProps) {
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      id: 'sys-1',
      role: 'system',
      content: 'You are a friendly, helpful AI science assistant.',
      tokensEstimate: 12,
    },
    {
      id: 'msg-1',
      role: 'user',
      content: 'Hello! My name is Jordan and my favorite food is mango sushi.',
      tokensEstimate: 16,
    },
    {
      id: 'msg-2',
      role: 'assistant',
      content: 'Hello Jordan! Nice to meet you. Mango sushi sounds like a very creative and delicious dish!',
      tokensEstimate: 21,
    },
  ]);

  const [inputVal, setInputVal] = useState('What is my name and what do I like to eat?');
  const [isLoading, setIsLoading] = useState(false);

  // Total context tokens estimate
  const totalTokens = messages.reduce((acc, m) => acc + m.tokensEstimate, 0);
  const contextMax = 8192;
  const percentUsed = Math.min(100, Math.max(0.5, (totalTokens / contextMax) * 100));

  const handleSendMessage = async () => {
    if (!inputVal.trim() || isLoading) return;
    const userText = inputVal.trim();
    setInputVal('');
    sound.click();

    const userMsg: MessageItem = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: userText,
      tokensEstimate: Math.max(2, Math.round(userText.length / 3.8)),
    };

    const updated = [...messages, userMsg];
    setMessages(updated);
    setIsLoading(true);

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 600));

        // Check if Jordan message exists in context
        const hasJordan = updated.some(
          (m) => m.role === 'user' && m.content.toLowerCase().includes('jordan')
        );

        let reply = '';
        if (hasJordan) {
          reply = 'Your name is Jordan, and you told me your favorite food is mango sushi!';
        } else {
          reply = "I apologize, but I don't know your name or what you like to eat. You haven't mentioned that in our conversation yet!";
        }

        setMessages((prev) => [
          ...prev,
          {
            id: `ast-${Date.now()}`,
            role: 'assistant',
            content: reply,
            tokensEstimate: Math.round(reply.length / 3.8),
          },
        ]);
        sound.success();
        return;
      }

      // Live Groq Call
      const apiMessages = updated.map((m) => ({
        role: m.role,
        content: m.content,
      }));

      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: 'llama-3.3-70b-versatile',
          temperature: 0.3,
          max_tokens: 150,
        }),
      });

      const data = await res.json();
      const replyText = data.text || 'Error communicating with Groq.';

      setMessages((prev) => [
        ...prev,
        {
          id: `ast-${Date.now()}`,
          role: 'assistant',
          content: replyText,
          tokensEstimate: data.usage?.completionTokens || Math.round(replyText.length / 3.8),
        },
      ]);
      sound.success();
    } catch {
      sound.error();
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteMessage = (id: string) => {
    sound.switchToggle();
    setMessages((prev) => prev.filter((m) => m.id !== id));
  };

  const handleReset = () => {
    sound.click();
    setMessages([
      {
        id: 'sys-1',
        role: 'system',
        content: 'You are a friendly, helpful AI science assistant.',
        tokensEstimate: 12,
      },
      {
        id: 'msg-1',
        role: 'user',
        content: 'Hello! My name is Jordan and my favorite food is mango sushi.',
        tokensEstimate: 16,
      },
      {
        id: 'msg-2',
        role: 'assistant',
        content: 'Hello Jordan! Nice to meet you. Mango sushi sounds like a very creative and delicious dish!',
        tokensEstimate: 21,
      },
    ]);
  };

  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-violet-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-violet-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-violet-500/20 border border-violet-500/30 flex items-center justify-center text-violet-400 shrink-0">
              <Database className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-violet-400 font-bold">
                  Station 4
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-400">Context Window & Statelessness</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                The Context Memory Meter: The Infinite Amnesia Machine
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleReset}
              className="px-3 py-1.5 rounded-xl border border-slate-700 bg-slate-900/80 hover:bg-slate-800 text-slate-300 text-xs font-mono flex items-center gap-1.5 transition-colors"
            >
              Reset Chat
            </button>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          AI does <strong>not have memory</strong>. Between every single message you send, the model completely forgets you ever existed! To give the illusion of memory, the app bundles the entire past conversation and re-sends all of it on every turn.
        </p>
      </div>

      {/* Main Lab Canvas */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Interactive Chat Simulation (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 space-y-4 flex flex-col h-[520px]">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <span className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
                <span>Active Conversation Stream</span>
              </span>
              <span className="text-[11px] font-mono text-violet-400">
                {messages.length} messages in payload
              </span>
            </div>

            {/* Messages Scroll Area */}
            <div className="flex-1 overflow-y-auto space-y-3 pr-2">
              {messages.map((m) => {
                const isSystem = m.role === 'system';
                const isUser = m.role === 'user';
                const isAssistant = m.role === 'assistant';

                return (
                  <div
                    key={m.id}
                    className={`group relative p-3 rounded-xl border text-xs leading-relaxed transition-all ${
                      isSystem
                        ? 'bg-slate-950/80 border-slate-800 text-slate-400'
                        : isUser
                        ? 'bg-blue-950/30 border-blue-500/30 text-blue-200 ml-8'
                        : 'bg-violet-950/30 border-violet-500/30 text-violet-200 mr-8'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5 text-[10px] font-mono">
                      <div className="flex items-center gap-1.5 font-bold uppercase">
                        {isSystem && (
                          <>
                            <Shield className="w-3 h-3 text-slate-400" />
                            <span className="text-slate-400">System Instruction</span>
                          </>
                        )}
                        {isUser && (
                          <>
                            <User className="w-3 h-3 text-blue-400" />
                            <span className="text-blue-400">User Prompt</span>
                          </>
                        )}
                        {isAssistant && (
                          <>
                            <Bot className="w-3 h-3 text-violet-400" />
                            <span className="text-violet-400">Assistant Reply</span>
                          </>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-slate-500">~{m.tokensEstimate} tokens</span>

                        {/* Amnesia Scissors (Delete message) */}
                        {!isSystem && (
                          <button
                            onClick={() => handleDeleteMessage(m.id)}
                            title="Snip this message out of context to give the AI amnesia!"
                            className="p-1 rounded hover:bg-rose-950/60 text-slate-500 hover:text-rose-400 transition-colors opacity-75 group-hover:opacity-100"
                          >
                            <Scissors className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>

                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                );
              })}

              {isLoading && (
                <div className="p-3 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs text-violet-300 flex items-center gap-2 mr-8">
                  <Loader2 className="w-4 h-4 animate-spin text-violet-400" />
                  <span>Groq LPU reading context and generating next tokens...</span>
                </div>
              )}
            </div>

            {/* Input Bar */}
            <div className="pt-3 border-t border-slate-800 flex items-center gap-2">
              <input
                type="text"
                value={inputVal}
                onChange={(e) => setInputVal(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Ask what your name is, or share another detail..."
                className="flex-1 bg-slate-950 border border-slate-700/80 rounded-xl px-3.5 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-violet-500/40 focus:border-violet-500"
              />
              <button
                onClick={handleSendMessage}
                disabled={isLoading || !inputVal.trim()}
                className="px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-md shadow-violet-600/30"
              >
                <Send className="w-3.5 h-3.5" />
                <span>Send</span>
              </button>
            </div>
          </div>
        </div>

        {/* Right: X-Ray Context Inspector (Span 1) */}
        <div className="space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 sticky top-24 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-violet-400" />
                <h3 className="text-sm font-bold text-white">X-Ray Context Tank</h3>
              </div>
              <span className="text-[10px] font-mono text-slate-400">
                {totalTokens} / {contextMax} Tokens
              </span>
            </div>

            {/* Visual Tank Meter */}
            <div>
              <div className="flex justify-between text-xs font-mono text-slate-400 mb-1.5">
                <span>Memory Meter</span>
                <span className="text-violet-400 font-bold">{percentUsed.toFixed(1)}% full</span>
              </div>
              <div className="w-full bg-slate-950 h-3 rounded-full border border-slate-800 overflow-hidden p-0.5">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-400 transition-all duration-500"
                  style={{ width: `${percentUsed}%` }}
                />
              </div>
            </div>

            {/* Break Down of Payload Sent */}
            <div className="space-y-2 pt-2">
              <span className="text-[10px] uppercase font-mono text-slate-500 block">
                Actual Payload Re-Sent This Turn:
              </span>

              <div className="space-y-1.5 font-mono text-xs">
                {messages.map((m, idx) => (
                  <div
                    key={m.id}
                    className="flex items-center justify-between p-2 rounded-lg bg-slate-950/70 border border-slate-800 text-[11px]"
                  >
                    <span className="truncate max-w-[170px] text-slate-300">
                      #{idx + 1} [{m.role}] {m.content}
                    </span>
                    <span className="text-violet-400 font-bold shrink-0 ml-2">
                      {m.tokensEstimate} tok
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* The Amnesia Lesson Box */}
            <div className="p-3.5 rounded-xl bg-violet-950/20 border border-violet-500/30 text-xs text-slate-300 space-y-2">
              <div className="flex items-center gap-2 font-bold text-violet-300">
                <Scissors className="w-4 h-4 text-violet-400" />
                <span>Try the Amnesia Experiment!</span>
              </div>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                Click the ✂️ scissor icon next to the first user message where you said <em>&quot;My name is Jordan...&quot;</em>. Then ask <em>&quot;What is my name?&quot;</em>.
              </p>
              <p className="text-[11px] text-slate-400 leading-relaxed">
                The AI will have <strong>zero recollection</strong> of you, proving that &quot;memory&quot; is just resending past messages!
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
