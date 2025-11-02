// netlify/functions/chat.js
const fs = require('fs');
const path = require('path');

const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.MODEL_NAME || 'gpt-4o-mini';

exports.handler = async function (event) {
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  try{
    const body = JSON.parse(event.body||'{}');
    const q = (body.q||'').trim();
    if(!q) return json(400,{error:'Missing q'});

    const inputStyle = body.inputStyle==='genz' ? 'genz' : 'normal';
    const replyStyle = body.replyStyle==='normal' ? 'normal' : 'genz';
    const withTranslation = !!body.withTranslation;

    const lex = safeRead('../../public/config/lexicon.json') || {};
    const slangPos = (lex.tones_pos||[]).slice(0,12).join(', ');
    const slangNeg = (lex.tones_neg||[]).slice(0,10).join(', ');

    const STYLE = (replyStyle==='genz')
      ? `Jsi kámoš z Gen Z. Hovorově, krátce, přátelsky. Rozumně anglicismy (no cap, lowkey, based, rizz, drip…), ale srozumitelně.
         NIKDY nekladej generické otázky (např. "Co máš v plánu?", "Jak ti mohu zpříjemnit den?"). Pokud se uživatel výslovně nezeptá,
         neptej se – raději dej krátký tip nebo mini-akci související s tématem. Max 1–2 věty, max 1 emoji. Povolený slang: ${slangPos}, ${slangNeg}.`
      : `Piš srozumitelnou, běžnou češtinou. Stručně, přímo, bez generických otázek. Max 1–2 věty.`;

    const FEWSHOT = [
      { role:'user', content:'Jsem unavený a nic se mi nechce.' },
      { role:'assistant', content: replyStyle==='genz' ? 'Understandable, bro. Dej 5 min pauzu, napi se, pak 10 min mini-task. Lowkey win → momentum.' : 'Dej si 5 minut pauzu, napij se a pak udělej jeden malý úkol na 10 minut. Získáš tempo.' },
      { role:'user', content:'Mám milion věcí a nevím, kde začít.' },
      { role:'assistant', content: replyStyle==='genz' ? 'Vyber 1 věc na 15 min, zbytek mute. W move, no cap.' : 'Vyber si jednu věc na 15 minut a zbytek ignoruj. Nejrychlejší způsob, jak se rozjet.' }
    ];

    const reply = await openai({
      model: MODEL,
      temperature: 0.9,
      presence_penalty: 0.4,
      frequency_penalty: 0.7,
      messages: [
        { role:'system', content: STYLE },
        ...FEWSHOT,
        { role:'user', content: q }
      ]
    }) || '…';

    let translation = '';
    if (withTranslation) {
      const direction = (replyStyle==='genz') ? 'gz_to_normal' : 'normal_to_gz';
      translation = await runTranslate(reply, direction);
    }

    return json(200,{ reply, translation, replyStyle });

  }catch(e){
    return json(500,{error:'Server error', detail:String(e)});
  }
};

async function openai(payload){
  const r = await fetch(OPENAI_URL,{
    method:'POST',
    headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
    body: JSON.stringify(payload)
  });
  if(!r.ok){ throw new Error(await r.text()); }
  const j = await r.json();
  return j?.choices?.[0]?.message?.content?.trim();
}

async function runTranslate(text, direction){
  const sys = (direction==='gz_to_normal')
    ? 'Přelož Gen-Z/slang češtinu smíchanou s anglicismy do běžné srozumitelné češtiny. Buď stručný (1–2 věty).'
    : 'Přepiš běžnou češtinu do stylu Gen-Z (hovorově, krátce, rozumně slang, bez toxicity). 1–2 věty.';
  try{
    return await openai({ model: MODEL, temperature: 0.6, messages:[{role:'system',content:sys},{role:'user',content:text}] }) || '';
  }catch{ return ''; }
}

function json(statusCode, body){ return { statusCode, headers:{'Content-Type':'application/json; charset=utf-8'}, body: JSON.stringify(body) }; }
function safeRead(rel){ try{ const p=path.join(__dirname,rel); return JSON.parse(fs.readFileSync(p,'utf8')); }catch{ return null; } }
