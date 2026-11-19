'use client';

import React, { useState } from 'react';
import { sound } from '@/lib/audio';
import {
  Key,
  ShieldCheck,
  ExternalLink,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Trash2,
  X,
  Lock,
} from 'lucide-react';

interface ApiKeyModalProps {
  isOpen: boolean;
  onClose: () => void;
  apiKey: string | null;
  onSaveKey: (key: string) => void;
  onClearKey: () => void;
  hasServerKey?: boolean;
}

export function ApiKeyModal({
  isOpen,
  onClose,
  apiKey,
  onSaveKey,
  onClearKey,
  hasServerKey,
}: ApiKeyModalProps) {
  const [inputValue, setInputValue] = useState(apiKey || '');
  const [isVerifying, setIsVerifying] = useState(false);
  const [verifyStatus, setVerifyStatus] = useState<{
    success?: boolean;
    message?: string;
  } | null>(null);

  if (!isOpen) return null;

  const handleVerifyAndSave = async () => {
    const trimmed = inputValue.trim();
    if (!trimmed) {
      setVerifyStatus({
        success: false,
        message: 'Please paste your Groq API key first.',
      });
      sound.error();
      return;
    }

    setIsVerifying(true);
    setVerifyStatus(null);

    try {
      const res = await fetch('/api/groq/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: trimmed }),
      });

      const data = await res.json();
      if (res.ok && data.valid) {
        sound.success();
        setVerifyStatus({
          success: true,
          message: data.message || 'Key verified successfully!',
        });
        onSaveKey(trimmed);
      } else {
        sound.error();
        setVerifyStatus({
          success: false,
          message: data.message || 'Key verification failed. Please check the key.',
        });
      }
    } catch {
      sound.error();
      setVerifyStatus({
        success: false,
        message: 'Could not connect to verification server. Please try again.',
      });
    } finally {
      setIsVerifying(false);
    }
  };

  const handleClear = () => {
    sound.click();
    setInputValue('');
    setVerifyStatus(null);
    onClearKey();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-lg w-full p-6 shadow-2xl relative hardware-panel">
        {/* Close Button */}
        <button
          onClick={() => {
            sound.click();
            onClose();
          }}
          className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <Key className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Groq API Key Pass</h2>
            <p className="text-xs text-slate-400">
              Unlock live, ultra-fast LPU inference (or keep using Simulation Mode!)
            </p>
          </div>
        </div>

        {/* Security Notice */}
        <div className="bg-emerald-950/30 border border-emerald-500/30 rounded-xl p-3.5 mb-5 flex items-start gap-3 text-xs text-emerald-300">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-emerald-200">Strict Client-Side Security</p>
            <p className="text-slate-300 text-[11px] leading-relaxed">
              Your API key is <strong>never logged or stored in any database</strong>. It stays in your browser memory
              and is sent only to Next.js server route proxies via secure headers.
            </p>
          </div>
        </div>

        {/* Server Key Indicator if configured */}
        {hasServerKey && (
          <div className="bg-cyan-950/30 border border-cyan-500/30 rounded-xl p-3 mb-4 flex items-center gap-2 text-xs text-cyan-300">
            <Lock className="w-4 h-4 text-cyan-400 shrink-0" />
            <span>A server-level Groq API key is already configured on this instance!</span>
          </div>
        )}

        {/* Input Form */}
        <div className="space-y-4">
          <div>
            <label className="block text-xs font-mono text-slate-300 mb-1.5 font-medium">
              Your Groq API Key (starts with <code className="text-orange-400">gsk_...</code>)
            </label>
            <div className="relative">
              <input
                type="password"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                placeholder="gsk_..."
                className="w-full bg-slate-950 border border-slate-700 rounded-xl px-3.5 py-2.5 text-sm text-white font-mono placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500"
              />
            </div>
          </div>

          {/* Verification Status feedback */}
          {verifyStatus && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-start gap-2 ${
                verifyStatus.success
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              {verifyStatus.success ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              )}
              <span>{verifyStatus.message}</span>
            </div>
          )}

          {/* How to get a key */}
          <div className="bg-slate-950/60 rounded-xl p-3 border border-slate-800 text-xs text-slate-400 space-y-1.5">
            <p className="font-medium text-slate-300">Don&apos;t have a Groq API key?</p>
            <p className="text-[11px] text-slate-400">
              Groq provides free high-speed API keys for developers with generous free tiers.
            </p>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-orange-400 hover:text-orange-300 text-xs font-medium underline underline-offset-2"
            >
              Get a free API key at console.groq.com/keys
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Action Buttons */}
          <div className="flex items-center justify-between pt-2">
            {apiKey ? (
              <button
                type="button"
                onClick={handleClear}
                className="px-3 py-2 rounded-xl border border-rose-900/60 bg-rose-950/30 text-rose-300 hover:bg-rose-900/40 text-xs font-medium flex items-center gap-1.5 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Clear Key
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  sound.click();
                  onClose();
                }}
                className="px-4 py-2 rounded-xl text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
              >
                Close
              </button>
              <button
                type="button"
                disabled={isVerifying}
                onClick={handleVerifyAndSave}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition-all shadow-md shadow-orange-600/30"
              >
                {isVerifying ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Testing Key...
                  </>
                ) : (
                  'Test & Save Pass'
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
