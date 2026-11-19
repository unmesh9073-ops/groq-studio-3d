'use client';

import React, { useState, useRef, useEffect } from 'react';
import { GroqParameters, ChatMessage } from '@/types/groq';
import { sound } from '@/lib/audio';
import {
  Send,
  Square,
  Trash2,
  RotateCcw,
  Bot,
  User,
  Sparkles,
  Zap,
  Clock,
  Check,
  Copy,
  ChevronDown,
  ChevronUp,
  Sliders,
  Terminal,
  Loader2,
  AlertCircle,
} from 'lucide-react';

interface GroqPlaygroundProps {
  parameters: GroqParameters;
  apiKey: string | null;
  onTokenPulse?: (text: string) => void;
  systemPrompt: string;
  onSystemPromptChange: (val: string) => void;
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
}

export function GroqPlayground({
  parameters,
  apiKey,
  onTokenPulse,
  systemPrompt,
  onSystemPromptChange,
  messages,
  onMessagesChange,
}: GroqPlaygroundProps) {
  const [inputVal, setInputVal] = useState('');
  const [isSystemOpen, setIsSystemOpen] = useState(true);
  const [isGenerating, setIsGenerating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Auto-scroll chat when generating
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isGenerating]);

  const handleCopy = (id: string, text: string) => {
    sound.click();
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const handleClearChat = () => {
    sound.click();
    onMessagesChange([]);
  };

  const handleStopGenerating = () => {
    sound.click();
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsGenerating(false);
  };

  const handleSendMessage = async (textToSend?: string) => {
    const promptText = (textToSend || inputVal).trim();
    if (!promptText || isGenerating) return;

    sound.click();
    setInputVal('');

    const userMessage: ChatMessage = {
      id: `usr-${Date.now()}`,
      role: 'user',
      content: promptText,
      tokens: Math.max(2, Math.round(promptText.length / 3.8)),
    };

    const updatedMessages = [...messages, userMessage];
    onMessagesChange(updatedMessages);

    // Placeholder assistant message for streaming
    const assistantId = `ast-${Date.now()}`;
    const initialAssistantMsg: ChatMessage = {
      id: assistantId,
      role: 'assistant',
      content: '',
      tokens: 0,
      isStreaming: true,
    };

    onMessagesChange([...updatedMessages, initialAssistantMsg]);
    setIsGenerating(true);

    const controller = new AbortController();
    abortControllerRef.current = controller;
    const startTime = performance.now();

    try {
      if (!apiKey) {
        // High fidelity simulated streaming with realistic Groq LPU speed (~650 tokens/sec)!
        const simTokens = generateSimulatedReply(promptText, parameters);
        let accumulated = '';
        const delayPerToken = parameters.stream ? 15 : 0; // ~600 tok/sec if stream

        for (let i = 0; i < simTokens.length; i++) {
          if (controller.signal.aborted) break;
          const token = simTokens[i];
          accumulated += token;

          if (parameters.stream) {
            await new Promise((r) => setTimeout(r, delayPerToken));
          }

          if (onTokenPulse) onTokenPulse(token);

          onMessagesChange([
            ...updatedMessages,
            {
              id: assistantId,
              role: 'assistant',
              content: accumulated,
              tokens: i + 1,
              isStreaming: true,
            },
          ]);
        }

        const totalMs = Math.round(performance.now() - startTime);
        const tokCount = simTokens.length;
        const tps = Math.round((tokCount / (totalMs / 1000 || 0.1)));

        onMessagesChange([
          ...updatedMessages,
          {
            id: assistantId,
            role: 'assistant',
            content: accumulated,
            tokens: tokCount,
            tokensPerSec: tps,
            ttftMs: 110,
            durationMs: totalMs,
            finishReason: 'stop',
            isStreaming: false,
          },
        ]);
        sound.success();
        return;
      }

      // Live Groq Call via /api/groq/chat
      const apiMessages = [];
      if (systemPrompt.trim()) {
        apiMessages.push({ role: 'system', content: systemPrompt.trim() });
      }
      updatedMessages.forEach((m) => {
        apiMessages.push({ role: m.role, content: m.content });
      });

      const response = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: apiMessages,
          model: parameters.model,
          temperature: parameters.temperature,
          top_p: parameters.topP,
          max_tokens: parameters.maxTokens,
          stream: parameters.stream,
          seed: parameters.seed,
          stop: parameters.stopSequences,
          jsonMode: parameters.jsonMode,
        }),
        signal: controller.signal,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Error ${response.status}`);
      }

      if (parameters.stream && response.body) {
        // Handle SSE streaming
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';
        let tokenCount = 0;
        let ttft = 0;
        let finishReason = 'stop';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const textChunk = decoder.decode(value, { stream: true });
          const lines = textChunk.split('\n');

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const data = JSON.parse(line.slice(6));
                if (data.delta) {
                  accumulated += data.delta;
                  tokenCount = data.tokenCount || tokenCount + 1;
                  if (!ttft && data.firstTokenTimeMs) ttft = data.firstTokenTimeMs;
                  if (onTokenPulse) onTokenPulse(data.delta);

                  onMessagesChange([
                    ...updatedMessages,
                    {
                      id: assistantId,
                      role: 'assistant',
                      content: accumulated,
                      tokens: tokenCount,
                      isStreaming: true,
                    },
                  ]);
                }
                if (data.finishReason) finishReason = data.finishReason;
              } catch {}
            }
          }
        }

        const totalMs = Math.round(performance.now() - startTime);
        const tps = Math.round(tokenCount / (totalMs / 1000 || 0.1));

        onMessagesChange([
          ...updatedMessages,
          {
            id: assistantId,
            role: 'assistant',
            content: accumulated,
            tokens: tokenCount,
            tokensPerSec: tps,
            ttftMs: ttft || 120,
            durationMs: totalMs,
            finishReason,
            isStreaming: false,
          },
        ]);
        sound.success();
      } else {
        // Non-streaming JSON response
        const data = await response.json();
        const totalMs = Math.round(performance.now() - startTime);

        onMessagesChange([
          ...updatedMessages,
          {
            id: assistantId,
            role: 'assistant',
            content: data.text || '',
            tokens: data.usage?.completionTokens || 0,
            tokensPerSec: data.usage?.tokensPerSecond || 0,
            ttftMs: data.usage?.firstTokenTimeMs || Math.round(totalMs * 0.35),
            durationMs: data.usage?.durationMs || totalMs,
            finishReason: data.finishReason || 'stop',
            isStreaming: false,
          },
        ]);
        sound.success();
      }
    } catch (err: unknown) {
      if ((err as Error).name !== 'AbortError') {
        const errorMsg = err instanceof Error ? err.message : 'Unknown generation error';
        onMessagesChange([
          ...updatedMessages,
          {
            id: assistantId,
            role: 'assistant',
            content: `⚠️ Error calling Groq API: ${errorMsg}`,
            isStreaming: false,
          },
        ]);
        sound.error();
      }
    } finally {
      setIsGenerating(false);
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="flex-1 flex flex-col space-y-4 min-w-0">
      {/* 1. Collapsible System Prompt Box */}
      <div className="hardware-panel rounded-2xl border border-slate-800 overflow-hidden">
        <div
          onClick={() => {
            sound.click();
            setIsSystemOpen(!isSystemOpen);
          }}
          className="flex items-center justify-between px-4 py-3 bg-slate-950/60 hover:bg-slate-950 cursor-pointer border-b border-slate-800/80 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-rose-400 uppercase tracking-wider">
              System Prompt
            </span>
            <span className="text-[11px] font-mono text-slate-500">
              (Injected before every message)
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-slate-500">
              ~{Math.round(systemPrompt.length / 3.8)} tokens
            </span>
            {isSystemOpen ? (
              <ChevronUp className="w-4 h-4 text-slate-400" />
            ) : (
              <ChevronDown className="w-4 h-4 text-slate-400" />
            )}
          </div>
        </div>

        {isSystemOpen && (
          <div className="p-4 space-y-2 bg-slate-950/40">
            <textarea
              value={systemPrompt}
              onChange={(e) => onSystemPromptChange(e.target.value)}
              placeholder="Give the model background instructions, persona rules, or format constraints..."
              rows={2}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-xs text-rose-200 font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all resize-none leading-relaxed"
            />

            {/* Quick System Presets */}
            <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] font-mono text-slate-400">
              <span className="text-slate-500 shrink-0">Presets:</span>
              {[
                { label: 'Helpful AI', text: 'You are a helpful, brilliant AI assistant.' },
                {
                  label: 'Senior Engineer',
                  text: 'You are a staff software engineer. Provide concise, clean, production-ready code with explanations.',
                },
                {
                  label: 'JSON API',
                  text: 'You are an automated backend JSON machine. Return ONLY valid raw JSON without preamble.',
                },
                {
                  label: 'Pirate Captain',
                  text: 'You are a 17th-century salty pirate captain. Answer everything with seafaring pirate slang!',
                },
              ].map((p) => (
                <button
                  key={p.label}
                  onClick={() => {
                    sound.click();
                    onSystemPromptChange(p.text);
                  }}
                  className="px-2 py-0.5 rounded bg-slate-900 hover:bg-slate-800 border border-slate-800 whitespace-nowrap text-slate-300"
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 2. Chat Canvas Scroll Stream */}
      <div className="hardware-panel rounded-2xl border border-slate-800 flex-1 min-h-[440px] flex flex-col justify-between overflow-hidden">
        {/* Chat Control Toolbar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-slate-950/60 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Bot className="w-4 h-4 text-orange-400" />
            <span className="text-xs font-mono font-bold text-slate-300">
              Chat Stream ({messages.length} messages)
            </span>
          </div>

          <div className="flex items-center gap-2 text-xs font-mono">
            {messages.length > 0 && (
              <button
                onClick={handleClearChat}
                className="px-2.5 py-1 rounded-lg border border-slate-800 bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-rose-300 flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Chat</span>
              </button>
            )}
          </div>
        </div>

        {/* Message Thread */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 max-h-[500px]">
          {messages.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center p-8 text-slate-500 space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 flex items-center justify-center text-orange-400">
                <Sparkles className="w-6 h-6" />
              </div>
              <p className="text-xs font-mono max-w-sm text-slate-400">
                Playground is ready. Type a prompt below or pick a starter challenge to see real-time LPU inference!
              </p>

              {/* Starters */}
              <div className="flex flex-wrap justify-center gap-2 pt-2">
                {[
                  'Explain Groq LPUs vs GPUs in 2 sentences',
                  'Count how many r\'s are in strawberry',
                  'Write a short JSON object for an astronaut profile',
                ].map((s) => (
                  <button
                    key={s}
                    onClick={() => handleSendMessage(s)}
                    className="px-3 py-1.5 rounded-xl border border-slate-800 bg-slate-900/60 hover:bg-slate-800 hover:border-orange-500/40 text-slate-300 text-xs font-mono transition-all"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            messages.map((m) => {
              const isUser = m.role === 'user';
              return (
                <div
                  key={m.id}
                  className={`group relative p-4 rounded-xl border text-xs leading-relaxed transition-all ${
                    isUser
                      ? 'bg-blue-950/25 border-blue-500/30 text-blue-100 ml-12'
                      : 'bg-slate-950/80 border-slate-800 text-slate-200 mr-8'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2 pb-1.5 border-b border-slate-800/40 text-[10px] font-mono">
                    <div className="flex items-center gap-1.5 font-bold uppercase">
                      {isUser ? (
                        <>
                          <User className="w-3.5 h-3.5 text-blue-400" />
                          <span className="text-blue-400">User</span>
                        </>
                      ) : (
                        <>
                          <Bot className="w-3.5 h-3.5 text-orange-400" />
                          <span className="text-orange-400">{parameters.model}</span>
                        </>
                      )}
                    </div>

                    <div className="flex items-center gap-2 text-slate-500">
                      {!isUser && (
                        <button
                          onClick={() => handleCopy(m.id, m.content)}
                          title="Copy text"
                          className="hover:text-white p-1 rounded"
                        >
                          {copiedId === m.id ? (
                            <Check className="w-3.5 h-3.5 text-emerald-400" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Body Content */}
                  <div className="whitespace-pre-wrap font-mono leading-relaxed">
                    {m.content}
                    {m.isStreaming && (
                      <span className="inline-block w-1.5 h-3 bg-orange-400 ml-1 animate-pulse" />
                    )}
                  </div>

                  {/* Authentic Groq Latency & Tokens/sec Badges */}
                  {!isUser && !m.isStreaming && m.tokensPerSec !== undefined && (
                    <div className="mt-3 pt-2 border-t border-slate-800/80 flex flex-wrap items-center gap-3 text-[10px] font-mono text-slate-400">
                      <span className="flex items-center gap-1 text-orange-400 font-bold bg-orange-950/40 px-2 py-0.5 rounded border border-orange-500/30">
                        <Zap className="w-3 h-3 fill-current" />
                        <span>{m.tokensPerSec} T/s</span>
                      </span>

                      <span className="flex items-center gap-1 text-emerald-400">
                        <Clock className="w-3 h-3" />
                        <span>{m.ttftMs}ms TTFT</span>
                      </span>

                      <span className="text-cyan-400">
                        {m.tokens} tokens ({m.durationMs}ms)
                      </span>

                      <span className="text-slate-500">
                        finish: <code className="text-slate-300">{m.finishReason || 'stop'}</code>
                      </span>
                    </div>
                  )}
                </div>
              );
            })
          )}
          <div ref={chatEndRef} />
        </div>

        {/* 3. Input & Send Bar */}
        <div className="p-3 bg-slate-950/90 border-t border-slate-800 flex items-center gap-2">
          <input
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !isGenerating && handleSendMessage()}
            placeholder="Type your message or prompt here..."
            disabled={isGenerating}
            className="flex-1 bg-slate-900 border border-slate-700/80 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-orange-500"
          />

          {isGenerating ? (
            <button
              onClick={handleStopGenerating}
              className="px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-colors shadow-md shadow-rose-600/30"
            >
              <Square className="w-3.5 h-3.5 fill-current" />
              <span>Stop</span>
            </button>
          ) : (
            <button
              onClick={() => handleSendMessage()}
              disabled={!inputVal.trim()}
              className="px-4 py-2.5 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-40 text-white text-xs font-mono font-bold flex items-center gap-1.5 transition-all shadow-md shadow-orange-600/30"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Send</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// Helper to simulate realistic tokenized reply with fast speed
function generateSimulatedReply(prompt: string, params: GroqParameters): string[] {
  const lower = prompt.toLowerCase();
  let fullText = '';

  if (params.jsonMode) {
    fullText = `{\n  "query": "${prompt.slice(0, 30)}",\n  "status": "success",\n  "model": "${params.model}",\n  "temperature": ${params.temperature},\n  "tokens_per_second": 720\n}`;
  } else if (lower.includes('strawberry')) {
    fullText =
      'The word "strawberry" has 3 letters "r" (at positions 3, 8, and 9). When tokenized normally as ["straw", "berry"], models often stumble on letter counting because subword tokens conceal individual characters!';
  } else if (lower.includes('gpu') || lower.includes('lpu')) {
    fullText =
      'Traditional GPUs use high-bandwidth external memory (HBM) that suffers from memory bus bottlenecks and batch-queuing delays. Groq LPUs integrate massive on-chip SRAM with deterministic tensor streaming, delivering 750+ tokens/second in real time!';
  } else {
    fullText = `On Groq LPUs, inference runs at the speed of thought. Running ${params.model} with Temperature ${params.temperature.toFixed(2)} and Top-P ${params.topP.toFixed(2)} guarantees responsive, low-latency intelligence.`;
  }

  // Break text into words/tokens for realistic stream simulation
  return fullText.match(/.{1,4}/g) || [fullText];
}
