// netlify/functions/chat.js
const fs = require('fs');
const path = require('path');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405, { error: 'Method not allowed' });

  try {
    const { q } = JSON.parse(event.body || '{}');
    if (!q || !q.trim()) return json(400, { error: 'Missing q' });

    // --- načti slovník a config (kvůli tónu) ---
    const lex = safeRead('../../public/config/lexicon.json');
    const cfg  = safeRead('../../config/app.json') || {};
    const modeFromUrl = new URL(event.rawUrl).searchParams.get('mode');
    const MODE = (modeFromUrl || process.env.MODE || cfg.defaultMode || 'genz');

    // --- style guide (žádné otravné otázky) + few-shoty ---
    const STYLE = `
Jsi kámoš z Gen Z. Mluv krátce, přátelsky, hovorově. Používej anglicismy (no cap, lowkey, based, rizz…), ale ne toxicky.
Nesmíš klást generické otázky typu "Co máš dnes v plánu?" / "S čím ti mohu pomoci?" / "Jak ti mohu zpříjemnit den?". Vyhni se klišé.
Raději navrhni mini-akci (e.g. "dej 3-min focus, pak shipni"), tip, nebo vtipnou poznámku související s promptem.
Max 2 věty. Pokud se uživatel ptá, odpověz věcně, ale stále ve stylu. Nepoužívej emoji častěji než 1×.
Dostupný slang (vybírej, co se hodí): ${(lex?.tones_pos||[]).slice(0,10).join(', ')}, ${(lex?.tones_neg||[]).slice(0,8).join(', ')}.
`;

    const FEWSHOT = [
      { role: 'user',   content: 'Jsem unavený a nic se mi nechce.' },
      { role: 'assistant', content: 'Understandable, bro. Dej 5 min break, napij se, a pak mini-task 10 min. Lowkey win → momentum.' },
      { role: 'user',   content: 'Mám milion věcí a nevím, kde začít.' },
      { role: 'assistant', content: 'Pick 1 věc, kterou shipneš do 15 min. Všechno ostatní mute. No cap, tohle je W move.' },
      { role: 'user',   content: 'Je to celé mid.' },
      { role: 'assistant', content: 'Mid is fine, iteruj. Nerfni scope o 30 % a pushni verzi 0.1. Pak buff.' }
    ];

    const messages = [
      { role: 'system', content: STYLE },
      ...FEWSHOT,
      { role: 'user', content: q }
    ];

    const body = {
      model: process.env.MODEL_NAME || 'gpt-4o-mini',
      temperature: 0.9,
      presence_penalty: 0.4,
      frequency_penalty: 0.6,
      messages
    };

    const r = await fetch(OPENAI_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify(body)
    });

    if (!r.ok) {
      const detail = await r.text();
      return json(500, { error: 'OpenAI error', detail });
    }

    const out = await r.json();
    const reply = out?.choices?.[0]?.message?.content?.trim() || '…';
    return json(200, { reply, mode: MODE });

  } catch (e) {
    return json(500, { error: 'Server error', detail: String(e) });
  }
};

function json(statusCode, body) {
  return { statusCode, headers: { 'Content-Type': 'application/json; charset=utf-8' }, body: JSON.stringify(body) };
}
function safeRead(rel){
  try{
    const p = path.join(__dirname, rel);
    return JSON.parse(fs.readFileSync(p,'utf8'));
  }catch{ return null; }
}
