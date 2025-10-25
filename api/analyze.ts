// api/analyze.ts
export default async function handler(req: Request): Promise<Response> {
  try {
    const { prompt, transcript } = await req.json().catch(() => ({}));
    if (!transcript || String(transcript).trim().length < 10) {
      return new Response(JSON.stringify({ error: 'short_input' }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 });
    }

    const model = 'gemini-2.0-flash'; // стабильная и лёгкая
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    const payload = {
      systemInstruction: { parts: [{ text: prompt || '' }] },
      contents: [{ parts: [{ text: String(transcript) }]}],
      generationConfig: { temperature: 0.7, responseMimeType: 'application/json' }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await r.json().catch(() => ({}));
    if (!r.ok) {
      return new Response(JSON.stringify({ error: 'upstream_error', status: r.status, details: data }), { status: r.status, headers: { 'Content-Type': 'application/json' }});
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => p?.text ?? '')
      .join('\n')
      .trim()
      .replace(/^```[a-zA-Z]*\s*/i, '')
      .replace(/```$/, '');

    let parsed: any;
    try { parsed = JSON.parse(text); }
    catch {
      parsed = {
        score: 0,
        analysis: 'Модель вернула неожиданный формат. Попробуйте ещё раз.',
        strengths: [],
        improvements: ['Повторите попытку анализа'],
        metrics: { pace: 0, fillerWords: 0, clarity: 0, vocabulary: 0 }
      };
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { 'Content-Type': 'application/json' }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'server_error', message: e?.message || String(e) }), { status: 500, headers: { 'Content-Type': 'application/json' }});
  }
}
