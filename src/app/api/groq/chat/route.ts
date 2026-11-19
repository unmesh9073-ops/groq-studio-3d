import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const userApiKey = req.headers.get('x-groq-api-key');
    const {
      messages,
      model = 'llama-3.3-70b-versatile',
      temperature = 0.7,
      top_p = 1.0,
      max_tokens = 500,
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const groq = getGroqClient(userApiKey);
    const startTime = performance.now();

    const response = await groq.chat.completions.create({
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
    });

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    const choice = response.choices[0];
    const reply = choice?.message?.content || '';
    const completionTokens = response.usage?.completion_tokens || 0;
    const promptTokens = response.usage?.prompt_tokens || 0;
    const totalTokens = response.usage?.total_tokens || 0;

    // Tokens per second calculation
    const durationSec = durationMs / 1000;
    const tokensPerSecond = durationSec > 0 ? Math.round(completionTokens / durationSec) : 0;

    return NextResponse.json({
      text: reply,
      finishReason: choice?.finish_reason,
      usage: {
        promptTokens,
        completionTokens,
        totalTokens,
        durationMs,
        tokensPerSecond,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'NO_API_KEY' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
