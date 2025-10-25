// api/analyze.ts
export default async function handler(req: Request): Promise<Response> {
  try {
    const { prompt, transcript } = await req.json().catch(() => ({}));
    if (!transcript || transcript.trim().length < 10) {
      return new Response(JSON.stringify({ error: 'short_input' }), { status: 400 });
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return new Response(JSON.stringify({ error: 'no_api_key' }), { status: 500 });
    }

    // СТАБИЛЬНАЯ и простая модель 2.0
    const model = 'gemini-2.0-flash';

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

    // Просим сразу JSON без форматирования
    const payload = {
      systemInstruction: { parts: [{ text: prompt || '' }] },
      contents: [{ parts: [{ text: transcript }]}],
      generationConfig: {
        temperature: 0.7,
        responseMimeType: 'application/json'
        // при желании можно добавить responseSchema
      }
    };

    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    const data = await r.json();

    if (!r.ok) {
      // пробросим диагностическую инфу чтобы понять 403/429/… на сервере
      return new Response(JSON.stringify({ error: 'upstream_error', status: r.status, details: data }), { status: r.status });
    }

    // Сшиваем все parts в строку (модель иногда шлёт несколько)
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p: any) => p?.text ?? '').join('\n') ?? '';

    // Снимаем возможные ```json …
    const cleaned = text.trim().replace(/^```[a-zA-Z]*\s*/i, '').replace(/```$/, '');

    let parsed: any;
    try {
      parsed = JSON.parse(cleaned);
    } catch {
      // если модель отдала невалид — дадим минимально полезный ответ,
      // чтобы фронт не падал
      parsed = {
        score: 0,
        analysis: 'Модель вернула неожиданный формат. Попробуйте ещё раз.',
        strengths: [],
        improvements: ['Повторите попытку анализа'],
        metrics: { pace: 0, fillerWords: 0, clarity: 0, vocabulary: 0 }
      };
    }

    return new Response(JSON.stringify(parsed), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });
  } catch (e: any) {
    return new Response(JSON.stringify({ error: 'server_error', message: e?.message || String(e) }), { status: 500 });
  }
}
