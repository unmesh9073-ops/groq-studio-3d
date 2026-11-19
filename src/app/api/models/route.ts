import { NextRequest, NextResponse } from 'next/server';
import { getGroqClient, CURATED_GROQ_MODELS, isAllowedTextModel } from '@/lib/groq';

export async function GET(req: NextRequest) {
  try {
    const userApiKey = req.headers.get('x-groq-api-key');
    let models = [...CURATED_GROQ_MODELS];

    if (userApiKey || process.env.GROQ_API_KEY) {
      try {
        const groq = getGroqClient(userApiKey);
        const list = await groq.models.list();
        if (list.data && Array.isArray(list.data)) {
          const fetchedFiltered = list.data
            .filter((m) => isAllowedTextModel(m.id))
            .map((m) => {
              const known = CURATED_GROQ_MODELS.find((c) => c.id === m.id);
              if (known) return known;
              return {
                id: m.id,
                name: m.id,
                desc: `Model ${m.id} on Groq LPUs`,
                contextWindow: (m as unknown as { context_window?: number }).context_window || 8192,
                tokensPerSecEstimate: 400,
                tier: 'fast' as const,
              };
            });

          // Ensure curated ones exist in list
          const existingIds = new Set(fetchedFiltered.map((f) => f.id));
          for (const c of CURATED_GROQ_MODELS) {
            if (!existingIds.has(c.id)) {
              fetchedFiltered.unshift(c);
            }
          }
          models = fetchedFiltered;
        }
      } catch {
        // Fallback to curated models
      }
    }

    return NextResponse.json({ models });
  } catch {
    return NextResponse.json({ models: CURATED_GROQ_MODELS });
  }
}
