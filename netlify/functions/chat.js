// netlify/functions/chat.js  (CommonJS)
const fs = require('fs');
const path = require('path');

exports.handler = async function (event) {
  // jen POST
  if (event.httpMethod !== 'POST') {
    return resp(405, { error: 'Method not allowed' });
  }

  try {
    const body = JSON.parse(event.body || '{}');
    const q = body.q || '';
    if (!q) return resp(400, { error: 'Missing q' });

    // --- ENV & mód ---
    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';

    // preferuj URL ?mode=..., pak header x-mode, pak ENV, pak config.defaultMode, jinak 'genz'
    const urlMode = (new URL(event.rawUrl).searchParams.get('mode') || '').trim();
    const headerMode = (event.headers['x-mode'] || '').trim();
    let mode = urlMode || headerMode || (process.env.MODE || '');
    let cfg = null;

    try {
      const cfgPath = path.join(__dirname, '../../config/app.json');
      cfg = JSON.parse(fs.readFileSync(cfgPath, 'utf8'));
      if (!mode) mode = cfg.defaultMode || 'genz';
    } catch (_) {
      if (!mode) mode = 'genz';
    }

    const systemPrompt =
      (cfg && cfg.modes && cfg.modes[mode] && cfg.modes[mode].systemPrompt) ||
      'Jsi kámoš z Gen Z. Mluv hovorově, krátce a s anglicismy, ale ne toxicky.';

    // --- OpenAI call ---
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${OPENAI_API_KEY}`,
      },
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.65,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: q }
        ]
      }),
    });

    if (!r.ok) {
      const detail = await r.text();
      return resp(500, { error: 'OpenAI error', detail });
    }

    const json = await r.json();
    const reply =
      (json.choices && json.choices[0] && json.choices[0].message &&
        (json.choices[0].message.content || '').trim()) || '…';

    return resp(200, { reply, mode });

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
