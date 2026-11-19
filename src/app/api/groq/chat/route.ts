import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const userApiKey = req.headers.get('x-groq-api-key');
    const {
      messages,
      model = 'openai/gpt-oss-120b',
      temperature = 0.7,
      top_p = 1.0,
      max_tokens = 1024,
      stream = false,
      seed,
      stop,
      jsonMode = false,
    } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json({ error: 'Messages array is required' }, { status: 400 });
    }

    const groq = getGroqClient(userApiKey);
    const startTime = performance.now();

    const requestParams: Record<string, unknown> = {
      model,
      messages,
      temperature,
      top_p,
      max_tokens,
      stream: Boolean(stream),
    };

    if (typeof seed === 'number' && !isNaN(seed)) {
      requestParams.seed = seed;
    }

    if (stop && Array.isArray(stop) && stop.length > 0) {
      requestParams.stop = stop;
    }

    if (jsonMode) {
      requestParams.response_format = { type: 'json_object' };
    }

    // Handle Streaming via Server-Sent Events (SSE)
    if (stream) {
      const chatCompletionStream = await groq.chat.completions.create(
        requestParams as unknown as Parameters<typeof groq.chat.completions.create>[0]
      );

      const encoder = new TextEncoder();
      let firstTokenTimeMs = 0;
      let tokenCount = 0;

      const readable = new ReadableStream({
        async start(controller) {
          try {
            // @ts-expect-error groq-sdk stream iterable
            for await (const chunk of chatCompletionStream) {
              const delta = chunk.choices?.[0]?.delta?.content || '';
              const finishReason = chunk.choices?.[0]?.finish_reason || null;

              if (delta) {
                tokenCount += 1;
                if (!firstTokenTimeMs) {
                  firstTokenTimeMs = Math.round(performance.now() - startTime);
                }
              }

              const payload = JSON.stringify({
                delta,
                finishReason,
                firstTokenTimeMs,
                tokenCount,
              });

              controller.enqueue(encoder.encode(`data: ${payload}\n\n`));
            }

            const totalDurationMs = Math.round(performance.now() - startTime);
            const totalDurationSec = totalDurationMs / 1000;
            const tokensPerSecond =
              totalDurationSec > 0 ? Math.round(tokenCount / totalDurationSec) : 0;

            const finalPayload = JSON.stringify({
              done: true,
              usage: {
                completionTokens: tokenCount,
                durationMs: totalDurationMs,
                firstTokenTimeMs,
                tokensPerSecond,
              },
            });
            controller.enqueue(encoder.encode(`data: ${finalPayload}\n\n`));
            controller.close();
          } catch (err: unknown) {
            const errMsg = err instanceof Error ? err.message : 'Stream error';
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: errMsg })}\n\n`));
            controller.close();
          }
        },
      });

      return new Response(readable, {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache, no-transform',
          Connection: 'keep-alive',
        },
      });
    }

    // Non-streaming completion
    const response = await groq.chat.completions.create(
      requestParams as unknown as Parameters<typeof groq.chat.completions.create>[0]
    );

    const endTime = performance.now();
    const durationMs = Math.round(endTime - startTime);

    // @ts-expect-error non-stream response choice
    const choice = response.choices?.[0];
    const reply = choice?.message?.content || '';
    // @ts-expect-error non-stream response usage
    const completionTokens = response.usage?.completion_tokens || 0;
    // @ts-expect-error non-stream response usage
    const promptTokens = response.usage?.prompt_tokens || 0;
    // @ts-expect-error non-stream response usage
    const totalTokens = response.usage?.total_tokens || 0;

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
        firstTokenTimeMs: Math.round(durationMs * 0.35),
        tokensPerSecond,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    const status = message === 'NO_API_KEY' ? 401 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
