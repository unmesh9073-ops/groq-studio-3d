'use client';

import React, { useState } from 'react';
import { GroqParameters, ChatMessage } from '@/types/groq';
import { sound } from '@/lib/audio';
import { Code2, Copy, Check, X, Terminal, FileCode } from 'lucide-react';

interface ViewCodeDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  parameters: GroqParameters;
  systemPrompt: string;
  messages: ChatMessage[];
}

export function ViewCodeDrawer({
  isOpen,
  onClose,
  parameters,
  systemPrompt,
  messages,
}: ViewCodeDrawerProps) {
  const [tab, setTab] = useState<'curl' | 'js' | 'python' | 'json'>('curl');
  const [copied, setCopied] = useState(false);

  if (!isOpen) return null;

  // Format messages array
  const fullMessages = [];
  if (systemPrompt.trim()) {
    fullMessages.push({ role: 'system', content: systemPrompt.trim() });
  }
  messages.forEach((m) => {
    fullMessages.push({ role: m.role, content: m.content });
  });
  if (fullMessages.length === 0) {
    fullMessages.push({ role: 'user', content: 'Explain quantum computing in one sentence.' });
  }

  // Generate cURL
  const curlCode = `curl https://api.groq.com/openai/v1/chat/completions \\
  -H "Content-Type: application/json" \\
  -H "Authorization: Bearer YOUR_GROQ_API_KEY" \\
  -d '{
    "model": "${parameters.model}",
    "messages": ${JSON.stringify(fullMessages, null, 6)},
    "temperature": ${parameters.temperature},
    "top_p": ${parameters.topP},
    "max_tokens": ${parameters.maxTokens},
    "stream": ${parameters.stream}${
    parameters.jsonMode ? ',\n    "response_format": { "type": "json_object" }' : ''
  }${
    parameters.seed !== null ? `,\n    "seed": ${parameters.seed}` : ''
  }${
    parameters.stopSequences.length > 0
      ? `,\n    "stop": ${JSON.stringify(parameters.stopSequences)}`
      : ''
  }
}'`;

  // Generate JavaScript / TypeScript (Groq SDK)
  const jsCode = `import Groq from "groq-sdk";

const groq = new Groq({ apiKey: process.env.GROQ_API_KEY || "YOUR_GROQ_API_KEY" });

async function main() {
  const chatCompletion = await groq.chat.completions.create({
    messages: ${JSON.stringify(fullMessages, null, 4)},
    model: "${parameters.model}",
    temperature: ${parameters.temperature},
    top_p: ${parameters.topP},
    max_tokens: ${parameters.maxTokens},
    stream: ${parameters.stream},${
    parameters.jsonMode ? '\n    response_format: { type: "json_object" },' : ''
  }${
    parameters.seed !== null ? `\n    seed: ${parameters.seed},` : ''
  }${
    parameters.stopSequences.length > 0
      ? `\n    stop: ${JSON.stringify(parameters.stopSequences)},`
      : ''
  }
  });

  ${
    parameters.stream
      ? `for await (const chunk of chatCompletion) {
    process.stdout.write(chunk.choices[0]?.delta?.content || "");
  }`
      : `console.log(chatCompletion.choices[0]?.message?.content);`
  }
}

main();`;

  // Generate Python (Groq SDK)
  const pythonCode = `import os
from groq import Groq

client = Groq(
    api_key=os.environ.get("GROQ_API_KEY", "YOUR_GROQ_API_KEY"),
)

chat_completion = client.chat.completions.create(
    messages=${JSON.stringify(fullMessages, null, 4).replace(/true/g, 'True').replace(/false/g, 'False')},
    model="${parameters.model}",
    temperature=${parameters.temperature},
    top_p=${parameters.topP},
    max_tokens=${parameters.maxTokens},
    stream=${parameters.stream ? 'True' : 'False'},${
    parameters.jsonMode ? '\n    response_format={"type": "json_object"},' : ''
  }${
    parameters.seed !== null ? `\n    seed=${parameters.seed},` : ''
  }${
    parameters.stopSequences.length > 0
      ? `\n    stop=${JSON.stringify(parameters.stopSequences)},`
      : ''
  }
)

${
  parameters.stream
    ? `for chunk in chat_completion:
    print(chunk.choices[0].delta.content or "", end="")`
    : `print(chat_completion.choices[0].message.content)`
}`;

  // Generate Raw JSON
  const rawJsonCode = JSON.stringify(
    {
      model: parameters.model,
      messages: fullMessages,
      temperature: parameters.temperature,
      top_p: parameters.topP,
      max_tokens: parameters.maxTokens,
      stream: parameters.stream,
      ...(parameters.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      ...(parameters.seed !== null ? { seed: parameters.seed } : {}),
      ...(parameters.stopSequences.length > 0 ? { stop: parameters.stopSequences } : {}),
    },
    null,
    2
  );

  const getActiveCode = () => {
    switch (tab) {
      case 'curl':
        return curlCode;
      case 'js':
        return jsCode;
      case 'python':
        return pythonCode;
      case 'json':
        return rawJsonCode;
    }
  };

  const handleCopy = () => {
    sound.click();
    navigator.clipboard.writeText(getActiveCode());
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-slate-900 border border-slate-700/80 rounded-2xl max-w-3xl w-full p-6 shadow-2xl relative hardware-panel flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-orange-500/20 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Code2 className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-white font-mono">View Code &amp; API Request</h2>
              <p className="text-[11px] text-slate-400">
                Synchronized live with current parameters &amp; chat payload
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

        {/* Tabs & Copy Button */}
        <div className="flex items-center justify-between py-3 border-b border-slate-800">
          <div className="flex items-center gap-1.5 font-mono text-xs">
            {(
              [
                { id: 'curl', label: 'cURL' },
                { id: 'js', label: 'JavaScript' },
                { id: 'python', label: 'Python' },
                { id: 'json', label: 'Raw JSON' },
              ] as const
            ).map((t) => (
              <button
                key={t.id}
                onClick={() => {
                  sound.click();
                  setTab(t.id);
                }}
                className={`px-3 py-1.5 rounded-lg transition-colors ${
                  tab === t.id
                    ? 'bg-orange-500/20 border border-orange-500/40 text-orange-300 font-bold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>

          <button
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-mono flex items-center gap-1.5 transition-colors border border-slate-700"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-300">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Code</span>
              </>
            )}
          </button>
        </div>

        {/* Code Snippet Container */}
        <div className="flex-1 overflow-y-auto mt-3 p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-slate-200 leading-relaxed">
          <pre className="whitespace-pre">{getActiveCode()}</pre>
        </div>

        {/* Security Footer Note */}
        <div className="mt-3 text-[11px] font-mono text-slate-500 flex items-center justify-between">
          <span>* API key placeholder used for safety. Replace with your actual key.</span>
          <span className="text-orange-400/80">Groq REST API v1 Compatible</span>
        </div>
      </div>
    </div>
  );
}
