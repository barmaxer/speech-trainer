// api/analyze.ts
export default async function handler(req: Request): Promise<Response> {
  try {
    const { prompt, transcript } = await req.json().catch(() => ({}));
    if (!transcript || String(transcript).trim().length < 10) {
      return new Response(JSON.stringify({ error: "short_input" }), { status: 400, headers: { "Content-Type": "application/json" }});
    }
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: "no_api_key" }), { status: 500, headers: { "Content-Type": "application/json" }});
    }

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${key}`;
    const payload = {
      systemInstruction: { parts: [{ text: String(prompt || "") }] },
      contents: [{ parts: [{ text: String(transcript) }]}],
      generationConfig: { responseMimeType: "application/json" }
    };

    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(payload) });
    const data = await r.json().catch(() => ({}));

    if (!r.ok) {
      return new Response(JSON.stringify({ error: "upstream_error", status: r.status, details: data }), { status: r.status, headers: { "Content-Type": "application/json" }});
    }

    const txt = (data?.candidates?.[0]?.content?.parts || []).map((p: any) => p?.text ?? "").join("\n")
      .trim().replace(/^```[a-zA-Z]*\s*/i, "").replace(/```$/, "");

    let parsed: any;
    try { parsed = JSON.parse(txt); }
    catch {
      parsed = { score: 0, analysis: "Модель вернула неожиданный формат.", strengths: [], improvements: ["Повторите анализ"], metrics: { pace: 0, fillerWords: 0, clarity: 0, vocabulary: 0 } };
    }

    return new Response(JSON.stringify(parsed), { status: 200, headers: { "Content-Type": "application/json" }});
  } catch (e: any) {
    return new Response(JSON.stringify({ error: "server_error", message: e?.message || String(e) }), { status: 500, headers: { "Content-Type": "application/json" }});
  }
}
