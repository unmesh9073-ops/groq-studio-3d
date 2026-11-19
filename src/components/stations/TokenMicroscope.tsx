'use client';

import React, { useState, useMemo } from 'react';
import { tokenizeText, TOKEN_COLOR_PALETTES } from '@/lib/tokenizer';
import { TokenItem } from '@/types/groq';
import { TOKEN_PRESETS } from '@/lib/presets';
import { sound } from '@/lib/audio';
import {
  Microscope,
  Info,
  Sparkles,
  Zap,
  CheckCircle,
  HelpCircle,
  Hash,
  Binary,
  Layers,
  ArrowRight,
  Send,
  Loader2,
} from 'lucide-react';

interface TokenMicroscopeProps {
  apiKey: string | null;
}

export function TokenMicroscope({ apiKey }: TokenMicroscopeProps) {
  const [inputText, setInputText] = useState(
    'How many r letters are in the word strawberry?'
  );
  const [selectedToken, setSelectedToken] = useState<TokenItem | null>(null);
  const [isLiveRunning, setIsLiveRunning] = useState(false);
  const [liveAnswer, setLiveAnswer] = useState<string | null>(null);

  const tokens = useMemo(() => tokenizeText(inputText), [inputText]);

  const charCount = inputText.length;
  const tokenCount = tokens.length;
  const ratio = tokenCount > 0 ? (charCount / tokenCount).toFixed(2) : '0';

  const handleTestGroq = async (promptToSend: string) => {
    sound.click();
    setIsLiveRunning(true);
    setLiveAnswer(null);

    try {
      if (!apiKey) {
        // High fidelity simulation
        await new Promise((r) => setTimeout(r, 600));
        if (promptToSend.toLowerCase().includes('letter by letter') || promptToSend.includes('s-t-r-a-w-b-e-r-r-y') || promptToSend.includes('s t r a w b e r r y')) {
          setLiveAnswer(
            '🍓 S-T-R-A-W-B-E-R-R-Y has 3 "r"s! (Position 3, 8, and 9). Breaking into single-character tokens gave me direct visibility into each letter!'
          );
        } else {
          setLiveAnswer(
            'The word "strawberry" has 2 "r"s. (Notice the common LLM hallucination! Because it only saw ["straw", "berry"] tokens instead of individual letters).'
          );
        }
        sound.success();
        return;
      }

      const res = await fetch('/api/groq/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-groq-api-key': apiKey,
        },
        body: JSON.stringify({
          messages: [{ role: 'user', content: promptToSend }],
          model: 'llama-3.3-70b-versatile',
          temperature: 0.1,
          max_tokens: 150,
        }),
      });

      const data = await res.json();
      if (data.text) {
        setLiveAnswer(data.text);
        sound.success();
      } else {
        setLiveAnswer(data.error || 'Failed to get answer');
        sound.error();
      }
    } catch (err: unknown) {
      setLiveAnswer(err instanceof Error ? err.message : 'Error calling Groq');
      sound.error();
    } finally {
      setIsLiveRunning(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Station Header Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-emerald-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center text-emerald-400 shrink-0">
              <Microscope className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400 font-bold">
                  Station 1
                </span>
                <span className="text-slate-600">•</span>
                <span className="text-[11px] font-mono text-slate-400">Byte Pair Encoding (BPE)</span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                The Token Microscope: Words are an Illusion
              </h2>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="flex items-center gap-3 bg-slate-950/80 p-2.5 rounded-xl border border-slate-800 font-mono text-xs">
            <div className="px-3 border-r border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Tokens</span>
              <span className="text-emerald-400 font-bold text-base">{tokenCount}</span>
            </div>
            <div className="px-3 border-r border-slate-800">
              <span className="text-slate-400 block text-[10px] uppercase">Characters</span>
              <span className="text-cyan-400 font-bold text-base">{charCount}</span>
            </div>
            <div className="px-3">
              <span className="text-slate-400 block text-[10px] uppercase">Chars/Token</span>
              <span className="text-amber-400 font-bold text-base">{ratio}</span>
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          AI language models <strong>never see words, letters, or pixels</strong>. Instead, before a model can process your prompt, the text is sliced into numeric chunks called <strong>Tokens</strong>. Hover over any token chip below to inspect its hidden numeric identity.
        </p>
      </div>

      {/* Preset Buttons */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <span className="text-xs font-mono text-slate-400 flex items-center gap-1 shrink-0">
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          Lab Presets:
        </span>
        {TOKEN_PRESETS.map((p) => (
          <button
            key={p.title}
            onClick={() => {
              sound.click();
              setInputText(p.text);
              setSelectedToken(null);
              setLiveAnswer(null);
            }}
            className="px-3 py-1.5 rounded-lg border border-slate-800 bg-slate-900/70 hover:bg-slate-800 hover:border-slate-700 text-slate-300 text-xs whitespace-nowrap transition-colors"
          >
            {p.title}
          </button>
        ))}
      </div>

      {/* Interactive Slicer Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left: Input Editor & Token Chips (Span 2) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-mono text-slate-300 font-semibold flex items-center gap-2">
                <span>Input Text (Type anything)</span>
              </label>
              <button
                onClick={() => {
                  sound.click();
                  setInputText('');
                  setSelectedToken(null);
                }}
                className="text-[11px] text-slate-500 hover:text-slate-300 font-mono"
              >
                Clear
              </button>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type any sentence, emoji, code, or syllables to see how AI dissects it..."
              rows={3}
              className="w-full bg-slate-950 border border-slate-700/80 rounded-xl p-3 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 focus:border-emerald-500 transition-all resize-none"
            />

            {/* Tokenized Stream Output */}
            <div className="mt-4">
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-mono text-slate-400 flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5 text-emerald-400" />
                  Visual Token Stream ({tokens.length} tokens):
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  Spaces indicated by leading dots <span className="text-slate-400">·</span>
                </span>
              </div>

              <div className="hardware-slot min-h-[140px] p-4 rounded-xl flex flex-wrap gap-1.5 items-center content-start">
                {tokens.length === 0 ? (
                  <div className="text-slate-600 text-xs italic font-mono p-4">
                    Type something above to inspect tokens...
                  </div>
                ) : (
                  tokens.map((tok, idx) => {
                    const palette = TOKEN_COLOR_PALETTES[tok.colorIndex];
                    const isSelected = selectedToken?.id === tok.id && selectedToken.text === tok.text;
                    const displayContent = tok.text.replace(/ /g, '·').replace(/\n/g, '↵\n');

                    return (
                      <button
                        key={`${idx}-${tok.text}`}
                        onClick={() => {
                          sound.tokenPop(400 + tok.colorIndex * 50);
                          setSelectedToken(tok);
                        }}
                        className={`group relative px-2.5 py-1 rounded-md border text-xs font-mono transition-all transform active:scale-95 ${
                          palette.bg
                        } ${palette.border} ${palette.text} ${
                          isSelected
                            ? 'ring-2 ring-white scale-105 shadow-lg shadow-emerald-500/20 z-10'
                            : 'hover:brightness-125'
                        }`}
                      >
                        <span className="relative z-10 whitespace-pre font-medium">
                          {displayContent}
                        </span>
                        <span className="text-[9px] opacity-60 ml-1 font-mono">#{tok.id}</span>
                      </button>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Strawberry Paradox Deep Dive Lab */}
          <div className="hardware-panel rounded-2xl p-5 border border-amber-500/20 bg-amber-950/10 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-base">🍓</span>
                <h3 className="text-sm font-bold text-amber-200">
                  Interactive Experiment: The &quot;Strawberry&quot; Letter Count Trap
                </h3>
              </div>
              <span className="text-[10px] font-mono bg-amber-500/20 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded">
                Why LLMs Fail
              </span>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              Why do even smart LLMs get confused when asked: <em>&quot;How many r&apos;s are in strawberry?&quot;</em>
              Because the word is processed as <strong>2 tokens</strong>: <code>[&quot;straw&quot;, &quot;berry&quot;]</code>.
              The model never inspects individual letters!
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <button
                onClick={() => handleTestGroq('How many r letters are in the word strawberry?')}
                disabled={isLiveRunning}
                className="p-3 rounded-xl border border-rose-900/50 bg-rose-950/20 hover:bg-rose-950/40 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-rose-300 flex items-center justify-between mb-1">
                  <span>Approach A: Standard Prompt</span>
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-400">
                  &quot;How many r letters are in the word strawberry?&quot;
                </p>
                <span className="mt-2 inline-block text-[10px] font-mono text-rose-400">
                  Tokens: [&quot;straw&quot;, &quot;berry&quot;]
                </span>
              </button>

              <button
                onClick={() =>
                  handleTestGroq(
                    'Spell the word strawberry letter-by-letter separated with hyphens, then count every letter "r".'
                  )
                }
                disabled={isLiveRunning}
                className="p-3 rounded-xl border border-emerald-900/50 bg-emerald-950/20 hover:bg-emerald-950/40 text-left transition-all group"
              >
                <div className="text-xs font-semibold text-emerald-300 flex items-center justify-between mb-1">
                  <span>Approach B: Force Sub-tokens</span>
                  <Send className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
                <p className="text-[11px] text-slate-400">
                  &quot;Spell strawberry letter-by-letter with hyphens...&quot;
                </p>
                <span className="mt-2 inline-block text-[10px] font-mono text-emerald-400">
                  Tokens: [&quot;s&quot;, &quot;-&quot;, &quot;t&quot;, &quot;-&quot;, &quot;r&quot;...]
                </span>
              </button>
            </div>

            {/* Test Result Display */}
            {(isLiveRunning || liveAnswer) && (
              <div className="mt-3 p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                {isLiveRunning ? (
                  <div className="flex items-center gap-2 text-slate-400">
                    <Loader2 className="w-4 h-4 animate-spin text-orange-400" />
                    <span>Querying Groq LPU in real-time...</span>
                  </div>
                ) : (
                  <div className="space-y-1">
                    <span className="font-mono text-[10px] text-slate-500 uppercase tracking-wider block">
                      AI Response:
                    </span>
                    <p className="text-slate-200 font-mono text-xs leading-relaxed">{liveAnswer}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Right: Token Inspector Card (Span 1) */}
        <div className="space-y-4">
          <div className="hardware-panel rounded-2xl p-5 border border-slate-800 sticky top-24">
            <div className="flex items-center gap-2 mb-4 pb-3 border-b border-slate-800">
              <Binary className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-white">Token Inspector</h3>
            </div>

            {selectedToken ? (
              <div className="space-y-4">
                <div className="text-center p-4 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-[10px] uppercase font-mono text-slate-400 block mb-1">
                    Selected Substring
                  </span>
                  <div className="text-2xl font-mono font-bold text-white tracking-wider">
                    &quot;{selectedToken.text}&quot;
                  </div>
                  <div className="text-[11px] font-mono text-emerald-400 mt-1">
                    Token ID: #{selectedToken.id}
                  </div>
                </div>

                <div className="space-y-2 text-xs font-mono">
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400">Raw Byte Length</span>
                    <span className="text-cyan-400 font-bold">{selectedToken.byteLength} bytes</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400">Character Length</span>
                    <span className="text-amber-400 font-bold">{selectedToken.text.length} chars</span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400">Contains Leading Space</span>
                    <span className="text-white font-bold">
                      {selectedToken.text.startsWith(' ') ? 'YES (·)' : 'NO'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80">
                    <span className="text-slate-400">Punctuation Only</span>
                    <span className="text-white font-bold">{selectedToken.isPunctuation ? 'YES' : 'NO'}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800 text-[11px] text-slate-400 space-y-1">
                  <div className="flex items-center gap-1.5 text-slate-300 font-semibold">
                    <Info className="w-3.5 h-3.5 text-emerald-400" />
                    <span>How it works:</span>
                  </div>
                  <p>
                    Every LLM vocabulary contains ~32,000 to 128,000 unique token numbers. Words that appear frequently
                    get single tokens, while rare words or code get fractured into smaller pieces.
                  </p>
                </div>
              </div>
            ) : (
              <div className="text-center py-10 px-4 text-slate-500 space-y-2">
                <Microscope className="w-8 h-8 mx-auto text-slate-600 mb-2 stroke-[1.5]" />
                <p className="text-xs font-mono">Click any token chip on the left to inspect its raw data.</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
