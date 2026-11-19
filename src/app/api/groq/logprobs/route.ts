import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';
import { StepLogprob, LogprobCandidate } from '@/types/groq';

export async function POST(req: NextRequest) {
  try {
    const userApiKey = req.headers.get('x-groq-api-key');
    const {
      prompt,
      model = 'openai/gpt-oss-120b',
      temperature = 0.7,
      max_tokens = 40,
      systemPrompt,
    } = await req.json();

    if (!prompt) {
      return NextResponse.json({ error: 'Prompt is required' }, { status: 400 });
    }

    const groq = getGroqClient(userApiKey);
    const messages = [];
    if (systemPrompt) {
      messages.push({ role: 'system' as const, content: systemPrompt });
    }
    messages.push({ role: 'user' as const, content: prompt });

    const startTime = performance.now();

    // Request logprobs from Groq
    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      max_tokens,
      logprobs: true,
      top_logprobs: 5,
    });

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const choice = response.choices[0];
    const logprobsContent = choice?.logprobs?.content;

    const steps: StepLogprob[] = [];

    if (logprobsContent && Array.isArray(logprobsContent)) {
      for (const item of logprobsContent) {
        const prob = Math.min(100, Math.max(0.01, Math.round(Math.exp(item.logprob) * 1000) / 10));
        
        const topCandidates: LogprobCandidate[] = (item.top_logprobs || []).map((c) => ({
          token: c.token,
          logprob: c.logprob,
          probPercent: Math.min(100, Math.max(0.01, Math.round(Math.exp(c.logprob) * 1000) / 10)),
          bytes: c.bytes,
        }));

        // Sort top candidates descending by probability
        topCandidates.sort((a, b) => b.probPercent - a.probPercent);

        steps.push({
          token: item.token,
          logprob: item.logprob,
          probPercent: prob,
          topCandidates,
        });
      }
    }

    const completionTokens = response.usage?.completion_tokens || steps.length;
    const durationSec = durationMs / 1000;
    const tokensPerSecond = durationSec > 0 ? Math.round(completionTokens / durationSec) : 0;

    return NextResponse.json({
      text: choice?.message?.content || '',
      tokens: steps,
      usage: {
        promptTokens: response.usage?.prompt_tokens || 0,
        completionTokens,
        totalTokens: response.usage?.total_tokens || 0,
        tokensPerSecond,
        durationMs,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'NO_API_KEY' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
