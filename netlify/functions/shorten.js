// netlify/functions/shorten.js
// POST JSON { target: string } → { id, short }
import { getStore } from '@netlify/blobs';

export default async (req) => {
  if (req.httpMethod !== 'POST') {
    return { 
      statusCode: 405, 
      body: JSON.stringify({ error: 'POST only' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  let target;
  try {
    const body = JSON.parse(req.body || '{}');
    target = body.target;
  } catch (error) {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Invalid JSON' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  if (!target || typeof target !== 'string') {
    return { 
      statusCode: 400, 
      body: JSON.stringify({ error: 'Missing target' }),
      headers: { 'Content-Type': 'application/json' }
    };
  }

  // Generate 6-character ID
  const id = Math.random().toString(36).slice(2, 8);
  
  // Store in Netlify Blobs
  const store = getStore({ name: 'shortlinks', siteID: process.env.SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN });
  await store.set(id, target, { metadata: { created: Date.now() } });

  // Build short URL
  const origin = process.env.URL || `https://${req.headers.host}`;
  const short = `${origin}/s/${id}`;

  return {
    statusCode: 200,
    headers: { 
      'Content-Type': 'application/json',
      'Cache-Control': 'no-store'
    },
    body: JSON.stringify({ id, short })
  };
};
