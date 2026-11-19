'use client';

import React from 'react';
import { sound } from '@/lib/audio';
import {
  UploadCloud,
  CheckCircle2,
  ExternalLink,
  X,
  Code2,
  ShieldCheck,
  Terminal,
} from 'lucide-react';

interface VercelDeployModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function VercelDeployModal({ isOpen, onClose }: VercelDeployModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-xl w-full p-6 shadow-2xl relative hardware-panel max-h-[90vh] overflow-y-auto">
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
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-bold text-white">Deploy GroqLab to Vercel</h2>
            <p className="text-xs text-slate-400">
              Publish your personal AI Science Lab in under 2 minutes
            </p>
          </div>
        </div>

        {/* Beginner Guide Steps */}
        <div className="space-y-4 text-xs">
          {/* Step 1 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">
                1
              </span>
              Push Code to GitHub
            </div>
            <p className="text-slate-300 leading-relaxed">
              Create a new repository on your GitHub account and push this project:
            </p>
            <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[11px] text-slate-300 border border-slate-800 flex items-center gap-2">
              <Terminal className="w-3.5 h-3.5 text-orange-400 shrink-0" />
              <span>git init && git add . && git commit -m &quot;Initial commit&quot;</span>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-cyan-400 font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-cyan-500/20 flex items-center justify-center text-xs">
                2
              </span>
              Import into Vercel
            </div>
            <p className="text-slate-300 leading-relaxed">
              Log into <a href="https://vercel.com" target="_blank" rel="noreferrer" className="text-cyan-400 underline">vercel.com</a>, click <strong>&quot;Add New... &gt; Project&quot;</strong>, and select your repository. Vercel automatically detects Next.js!
            </p>
          </div>

          {/* Step 3 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-emerald-500/20 flex items-center justify-center text-xs">
                3
              </span>
              Add Environment Variable (Optional)
            </div>
            <p className="text-slate-300 leading-relaxed">
              Under <strong>&quot;Environment Variables&quot;</strong> in your Vercel project settings, you can optionally add:
            </p>
            <div className="bg-slate-900 rounded-lg p-2.5 font-mono text-[11px] text-emerald-300 border border-slate-800 flex items-center justify-between">
              <span>GROQ_API_KEY = gsk_...</span>
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
            </div>
            <p className="text-[11px] text-slate-400">
              *If you don&apos;t set it on Vercel, visitors can still test everything using Simulation Mode or paste their own key in the UI!
            </p>
          </div>

          {/* Step 4 */}
          <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 space-y-2">
            <div className="flex items-center gap-2 text-orange-400 font-semibold text-sm">
              <span className="w-5 h-5 rounded-full bg-orange-500/20 flex items-center justify-center text-xs">
                4
              </span>
              Click Deploy & Celebrate 🚀
            </div>
            <p className="text-slate-300 leading-relaxed">
              Vercel will build and assign you a global HTTPS domain (e.g. <code>groqlab.vercel.app</code>) with sub-second LPU speeds worldwide.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="mt-5 pt-3 border-t border-slate-800 flex items-center justify-between">
          <a
            href="https://vercel.com/new"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1.5 text-cyan-400 hover:text-cyan-300 text-xs font-semibold"
          >
            Open Vercel Dashboard
            <ExternalLink className="w-3.5 h-3.5" />
          </a>

          <button
            onClick={() => {
              sound.click();
              onClose();
            }}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Got It!
          </button>
        </div>
      </div>
    </div>
  );
}
