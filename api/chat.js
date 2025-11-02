export default async function handler(req, res){
  if(req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  try{
    const { q } = req.body || {};
    if(!q) return res.status(400).json({ error: 'Missing q' });

    const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
    const MODEL_NAME = process.env.MODEL_NAME || 'gpt-4o-mini';
    const MODE = process.env.MODE || 'family_friendly';

    // načti konfig
    let cfg;
    try {
      cfg = await import('../config/app.json', { assert: { type: 'json' } }).then(m=>m.default);
    } catch { cfg = null; }
    const systemPrompt = cfg?.modes?.[MODE]?.systemPrompt || 'Jsi přátelský český kamarád.';

    const r = await fetch('https://api.openai.com/v1/chat/completions',{
      method:'POST',
      headers:{'Content-Type':'application/json','Authorization':`Bearer ${OPENAI_API_KEY}`},
      body: JSON.stringify({
        model: MODEL_NAME,
        temperature: 0.6,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: q }
        ]
      })
    });

    if(!r.ok){
      const detail = await r.text();
      return res.status(500).json({ error:'OpenAI error', detail });
    }
    const json = await r.json();
    const reply = json.choices?.[0]?.message?.content?.trim() || '…';
    res.status(200).json({ reply });
  }catch(e){
    res.status(500).json({ error:'Server error', detail:String(e) });
  }
}
