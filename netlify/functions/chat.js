// netlify/functions/chat.js
export async function handler(event, context) {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q || typeof q !== 'string' || !q.trim()) {
      return resp(400, { error: 'Missing text' });
    }

    const modeParam = (event.queryStringParameters && event.queryStringParameters.mode) || '';
    const MODE = modeParam.toLowerCase() === 'family_friendly' ? 'family_friendly' : 'edgy';

    let cfg = null;
    try {
      cfg = (await import('../../config/app.json', { assert: { type: 'json' } })).default;
    } catch {}

    const DEFAULT_PROMPT =
      "Jsi 'Tykáč' – mluv česky se slangem Gen-Z. Krátké, trefné, trochu drzé, ale ne zlý. " +
      "Neptej se, pokud si uživatel výslovně neřekne o otázky. " +
      "Žádné 'jak ti můžu pomoct', žádné dlouhé eseje. " +
      "Skibidi používej jako filler/vatu (ne pochvalu) – např. 'skibidi... ok' nebo 'skibidi vata'. " +
      "Můžeš mixovat běžné anglicismy (based, cringe, rizz, mid, L, drip). " +
      "Vyhni se explicitním urážkám a obsahu 18+. " +
      "Odpověz MAX 1–2 krátkými větami. Žádné dlouhé odpovědi. Bez otázek, pokud to uživatel nechce.";

    const SYSTEM_PROMPT =
      (cfg?.modes?.[MODE]?.systemPrompt) || DEFAULT_PROMPT;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';
    if (!OPENAI_API_KEY) return resp(500, { error: 'Missing OPENAI_API_KEY' });

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_API_KEY}` },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.7,
        max_tokens: 150,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: "Nevyptávej se. Když už otázka, tak jen na explicitní žádost uživatele." },
          { role: 'user', content: q }
        ]
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => String(r.status));
      return resp(500, { error: 'OpenAI error', detail });
    }

    const j = await r.json();
    let reply = (j?.choices?.[0]?.message?.content || '').trim();

    // Post-processing: vyházet samovolné otázky na konci
    // – když model zakončí „?“ a nešlo o explicitní žádost o otázky.
    if (reply.endsWith('?')) {
      reply = reply.replace(/\?+$/,'').trim();
      if (reply.length < 2) reply = "Skibidi… ok, chápu.";
    }

    // Zkrátit přehnaně dlouhé odpovědi (obrana proti „sluníčkaření“)
    if (reply.length > 400) {
      reply = reply.slice(0, 380).trim() + "…";
    }

    return resp(200, { reply, mode: MODE });
  } catch (e) {
    return resp(500, { error: 'Server error', detail: String(e) });
  }
}

function resp(code, obj) {
  return {
    statusCode: code,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(obj)
  };
}
