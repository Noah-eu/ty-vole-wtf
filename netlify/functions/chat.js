const fs = require('fs');
const path = require('path');

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q) return resp(400, { error: 'Missing q' });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';
    const MODE = process.env.MODE || 'family_friendly';

    let cfg = null;
    try {
      const cfgPath = path.join(__dirname, '../../config/app.json');
      cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
    } catch (_) {}

    const systemPrompt =
      (cfg && cfg.modes && cfg.modes[MODE] && cfg.modes[MODE].systemPrompt) ||
      'Jsi přátelský český kamarád. Mluv stručně a užitečně.';

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: q },
        ],
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return resp(500, { error: 'OpenAI error', detail });
    }

    const json = await r.json();
    const reply =
      (json.choices &&
        json.choices[0] &&
        json.choices[0].message &&
        (json.choices[0].message.content || '').trim()) ||
      '…';

    return resp(200, { reply });
  } catch (e) {
    return resp(500, { error: 'Server error', detail: String(e) });
  }
};

function resp(statusCode, body) {
  return {
    statusCode,
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify(body),
  };
}
