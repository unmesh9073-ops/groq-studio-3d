import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, hasServerGroqKey } from '@/lib/groq';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const userApiKey = req.headers.get('x-groq-api-key') || body.apiKey;

    const groq = getGroqClient(userApiKey);
    
    // Quick test: list models
    const list = await groq.models.list();
    const available = list.data?.slice(0, 5).map(m => m.id) || [];

    return NextResponse.json({
      valid: true,
      hasServerKey: hasServerGroqKey(),
      availableModels: available,
      message: 'Groq API Key verified successfully! Connected to Groq LPUs 🚀',
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    if (message === 'NO_API_KEY') {
      return NextResponse.json(
        {
          valid: false,
          hasServerKey: hasServerGroqKey(),
          message: 'No API key provided. Add your key or test with Simulated Lab Mode.',
        },
        { status: 401 }
      );
    }
    return NextResponse.json(
      {
        valid: false,
        hasServerKey: hasServerGroqKey(),
        message: `Groq authentication error: ${message}`,
      },
      { status: 401 }
    );
  }
}

export async function GET() {
  return NextResponse.json({
    hasServerKey: hasServerGroqKey(),
    message: hasServerGroqKey()
      ? 'Server has a configured GROQ_API_KEY.'
      : 'No server key configured. Provide client key via modal or x-groq-api-key header.',
  });
}
