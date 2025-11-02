// netlify/functions/translate.js
const OPENAI_URL = 'https://api.openai.com/v1/chat/completions';
const MODEL = process.env.MODEL_NAME || 'gpt-4o-mini';

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') return json(405,{error:'Method not allowed'});
  try{
    const { text, direction } = JSON.parse(event.body||'{}');
    if(!text || !direction) return json(400,{error:'Missing params'});

    const sys = direction === 'gz_to_normal'
      ? 'Přelož Gen-Z/slang CZ+EN do běžné češtiny, stručně a srozumitelně. Max 1–2 věty.'
      : 'Přepiš běžnou češtinu do stylu Gen-Z (hovorově, krátce, rozumně slang, bez toxicity). Max 1–2 věty.';

    const r = await fetch(OPENAI_URL,{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${process.env.OPENAI_API_KEY}`},
      body: JSON.stringify({ model: MODEL, temperature: 0.6, messages: [{role:'system',content:sys},{role:'user',content:text}] })
    });
    if(!r.ok){ return json(500,{error:'OpenAI error', detail: await r.text()}); }
    const j = await r.json();
    const out = j?.choices?.[0]?.message?.content?.trim() || '';
    return json(200,{ ok:true, translated: out });
  }catch(e){
    return json(500,{error:String(e)});
  }
};

function json(statusCode, body){ return { statusCode, headers:{'Content-Type':'application/json; charset=utf-8'}, body: JSON.stringify(body) }; }
