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

    // ---- přepínání módu ----
    const modeParam = (event.queryStringParameters && event.queryStringParameters.mode) || '';
    const MODE = modeParam.toLowerCase() === 'family_friendly' ? 'family_friendly' : 'edgy';

    // ---- konfigurace ----
    let cfg = null;
    try {
      cfg = (await import('../../config/app.json', { assert: { type: 'json' } })).default;
    } catch (e) {
      // ignore
    }

    // ---- systémový prompt (Gen-Z styl, bez „pomůžu“ řečí) ----
    const DEFAULT_PROMPT =
      "Jsi 'Tykáč' – kámoš, co mluví Gen-Z česky. Krátké, trefné, trochu drzé, ale ne zlý. " +
      "Žádné omluvy, žádné 'jak ti můžu pomoct', žádné dlouhé eseje. " +
      "Mluv česky, ale klidně mixuj běžné anglicismy (based, cringe, rizz, lowkey, skibidi). " +
      "Jestli potřebuješ upřesnění, polož jednu stručnou otázku. " +
      "Vyhni se sprostým urážkám a explicitnímu obsahu; buď přístupný 15+. " +
      "Formát: 1–3 krátké věty nebo odrážky. Udrž rytmus a šťávu.";

    const SYSTEM_PROMPT =
      (cfg?.modes?.[MODE]?.systemPrompt) || DEFAULT_PROMPT;

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';

    if (!OPENAI_API_KEY) {
      return resp(500, { error: 'Missing OPENAI_API_KEY' });
    }

    // ---- dotaz na OpenAI ----
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.8,
        messages: [
          { role: 'system', content: SYSTEM_PROMPT },
          { role: 'system', content: "Drž se věci, nevyptávej se opakovaně. Nepoučuj. Bez omluv." },
          { role: 'user', content: q }
        ]
      })
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => String(r.status));
      return resp(500, { error: 'OpenAI error', detail });
    }

    const j = await r.json();
    const reply = j?.choices?.[0]?.message?.content?.trim?.() || 'Mid. Zkus přesněji.';

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
