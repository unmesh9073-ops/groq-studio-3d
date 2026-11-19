'use client';

import React, { useState } from 'react';
import confetti from 'canvas-confetti';
import { sound } from '@/lib/audio';
import {
  Trophy,
  CheckCircle2,
  HelpCircle,
  Sparkles,
  ArrowRight,
  Award,
  Star,
  RefreshCw,
  Lightbulb,
} from 'lucide-react';

interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

const QUIZ_QUESTIONS: QuizQuestion[] = [
  {
    id: 'q1',
    question: 'How do Large Language Models actually process your input text?',
    options: [
      'They read complete words and store them in memory like human neurons.',
      'They slice text into numeric chunks called "tokens" using Byte Pair Encoding.',
      'They convert each word into image pixels and run OCR.',
      'They search Google and summarize the top web pages.',
    ],
    correctIndex: 1,
    explanation:
      'Correct! AI models operate entirely on numeric token IDs. A vocabulary of ~32,000 to 128,000 token numbers represents common words, subwords, and punctuation.',
  },
  {
    id: 'q2',
    question: 'Why does a model fail when asked "How many r\'s are in strawberry?"',
    options: [
      'The model has bad spelling.',
      'Because "strawberry" is tokenized as 2 chunks ["straw", "berry"] so it never inspects individual letters.',
      'Because the model was trained only on numbers.',
      'Because Groq LPUs run too fast to count.',
    ],
    correctIndex: 1,
    explanation:
      'Spot on! The model sees the token "straw" and the token "berry", but never sees individual characters unless you explicitly force it to spell letter-by-letter.',
  },
  {
    id: 'q3',
    question: 'What happens when you slide Temperature to 0.0?',
    options: [
      'The AI shuts down into sleep mode.',
      'The AI picks words completely at random.',
      'The generation becomes 100% deterministic, choosing the #1 most probable token every time.',
      'The model generates text backwards.',
    ],
    correctIndex: 2,
    explanation:
      'Exactly! At Temperature 0.0 (Greedy search), the token with the highest probability wins every single time, giving reproducible, robot-like responses.',
  },
  {
    id: 'q4',
    question: 'Does an LLM remember who you are across different chat turns?',
    options: [
      'Yes, it saves your memories into its long-term neural weights.',
      'No, LLMs are stateless functions with amnesia; the app re-sends the entire past conversation every turn.',
      'Only if you have an active Groq API key.',
      'Yes, models have human-like continuous consciousness.',
    ],
    correctIndex: 1,
    explanation:
      'Bingo! Models have zero memory between requests. To maintain a conversation, the software bundles the entire transcript and feeds it back into the context window.',
  },
];

export function LabChallenges() {
  const [selectedAnswers, setSelectedAnswers] = useState<Record<string, number>>({});
  const [submitted, setSubmitted] = useState<Record<string, boolean>>({});
  const [completedCount, setCompletedCount] = useState(0);

  const handleSelectOption = (questionId: string, optionIdx: number) => {
    sound.click();
    setSelectedAnswers((prev) => ({ ...prev, [questionId]: optionIdx }));
  };

  const handleSubmitQuestion = (q: QuizQuestion) => {
    const chosen = selectedAnswers[q.id];
    if (chosen === undefined) return;

    const isCorrect = chosen === q.correctIndex;
    setSubmitted((prev) => ({ ...prev, [q.id]: true }));

    if (isCorrect) {
      sound.success();
      setCompletedCount((c) => c + 1);
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 },
      });
    } else {
      sound.error();
    }
  };

  const handleResetAll = () => {
    sound.click();
    setSelectedAnswers({});
    setSubmitted({});
    setCompletedCount(0);
  };

  return (
    <div className="space-y-6">
      {/* Banner */}
      <div className="hardware-panel rounded-2xl p-6 border border-amber-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400 shrink-0">
              <Trophy className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[11px] font-mono uppercase tracking-wider text-amber-400 font-bold">
                  Knowledge Certification
                </span>
              </div>
              <h2 className="text-xl font-bold text-white tracking-tight">
                Lab Challenges & Discovery Quizzes
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-3 bg-slate-950/80 px-4 py-2 rounded-xl border border-slate-800 text-xs font-mono">
            <Star className="w-4 h-4 text-amber-400 fill-amber-400" />
            <span className="text-slate-400">Mastery Score:</span>
            <span className="text-amber-300 font-bold text-base">
              {completedCount} / {QUIZ_QUESTIONS.length}
            </span>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 max-w-3xl leading-relaxed">
          Test your newfound understanding of how Large Language Models actually work under the hood. Complete the 4 discovery challenges below to earn your AI Science Lab Explorer badge!
        </p>
      </div>

      {/* Quiz Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {QUIZ_QUESTIONS.map((q, idx) => {
          const isSubmitted = submitted[q.id];
          const chosen = selectedAnswers[q.id];
          const isCorrect = chosen === q.correctIndex;

          return (
            <div
              key={q.id}
              className={`hardware-panel rounded-2xl p-5 border transition-all ${
                isSubmitted && isCorrect
                  ? 'border-emerald-500/50 bg-emerald-950/10'
                  : isSubmitted && !isCorrect
                  ? 'border-rose-500/50 bg-rose-950/10'
                  : 'border-slate-800'
              }`}
            >
              <div className="flex items-center justify-between pb-3 border-b border-slate-800 mb-3">
                <span className="text-xs font-mono text-amber-400 font-bold">
                  Challenge #{idx + 1}
                </span>
                {isSubmitted && (
                  <span
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded ${
                      isCorrect
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}
                  >
                    {isCorrect ? 'PASSED ✅' : 'INCORRECT ❌'}
                  </span>
                )}
              </div>

              <h3 className="text-sm font-semibold text-white mb-4 leading-snug">{q.question}</h3>

              {/* Options */}
              <div className="space-y-2 mb-4">
                {q.options.map((opt, oIdx) => {
                  const isSelected = chosen === oIdx;
                  let optStyle =
                    'border-slate-800 bg-slate-950/70 hover:bg-slate-900 text-slate-300';

                  if (isSubmitted) {
                    if (oIdx === q.correctIndex) {
                      optStyle = 'border-emerald-500/60 bg-emerald-950/30 text-emerald-200 font-medium';
                    } else if (isSelected && !isCorrect) {
                      optStyle = 'border-rose-500/60 bg-rose-950/30 text-rose-200';
                    }
                  } else if (isSelected) {
                    optStyle = 'border-amber-500 bg-amber-950/30 text-amber-200 font-medium';
                  }

                  return (
                    <button
                      key={oIdx}
                      disabled={isSubmitted}
                      onClick={() => handleSelectOption(q.id, oIdx)}
                      className={`w-full text-left p-3 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${optStyle}`}
                    >
                      <span className="w-4 h-4 rounded-full border border-slate-700 flex items-center justify-center text-[10px] font-mono shrink-0 mt-0.5">
                        {String.fromCharCode(65 + oIdx)}
                      </span>
                      <span>{opt}</span>
                    </button>
                  );
                })}
              </div>

              {/* Explanation upon submission */}
              {isSubmitted && (
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-300 mb-3 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-400">
                    <Lightbulb className="w-3.5 h-3.5" />
                    <span>Lab Explanation:</span>
                  </div>
                  <p>{q.explanation}</p>
                </div>
              )}

              {/* Submit Button */}
              {!isSubmitted ? (
                <button
                  disabled={chosen === undefined}
                  onClick={() => handleSubmitQuestion(q)}
                  className="w-full py-2 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2"
                >
                  <span>Submit Answer</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              ) : null}
            </div>
          );
        })}
      </div>

      {/* Completion Banner */}
      {completedCount === QUIZ_QUESTIONS.length && (
        <div className="hardware-panel rounded-2xl p-6 border border-emerald-500/40 bg-emerald-950/20 text-center space-y-3">
          <Award className="w-12 h-12 text-emerald-400 mx-auto" />
          <h3 className="text-lg font-bold text-emerald-200">
            🎉 Congratulations! You are a Certified LLM Lab Scientist!
          </h3>
          <p className="text-xs text-slate-300 max-w-xl mx-auto">
            You now understand how tokens chunk characters, how next-token probabilities guide generation, how temperature alters entropy, and how context windows create the illusion of memory.
          </p>
          <button
            onClick={handleResetAll}
            className="px-4 py-2 rounded-xl bg-slate-900 border border-slate-700 text-slate-300 hover:text-white text-xs font-mono inline-flex items-center gap-2"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retake Challenges</span>
          </button>
        </div>
      )}
    </div>
  );
}
