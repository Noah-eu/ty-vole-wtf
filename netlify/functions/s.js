// netlify/functions/s.js
// GET ?id=<shortcode> → 302 redirect to stored target
import { getStore } from '@netlify/blobs';

export default async (req) => {
  const url = new URL(req.rawUrl || `https://${req.headers.host}${req.path}?${req.queryStringParameters ? new URLSearchParams(req.queryStringParameters).toString() : ''}`);
  const id = url.searchParams.get('id');

  if (!id) {
    return { 
      statusCode: 400, 
      body: 'Missing id parameter',
      headers: { 'Content-Type': 'text/plain' }
    };
  }

  // Retrieve from Netlify Blobs
  const store = getStore({ name: 'shortlinks', siteID: process.env.SITE_ID, token: process.env.NETLIFY_ACCESS_TOKEN });
  
  let target;
  try {
    target = await store.get(id, { type: 'text' });
  } catch (error) {
    console.error('[shortlink] Error retrieving:', error);
  }

  if (!target) {
    return { 
      statusCode: 404, 
      body: 'Short link not found',
      headers: { 'Content-Type': 'text/plain' }
    };
  }

  return { 
    statusCode: 302, 
    headers: { 
      Location: target,
      'Cache-Control': 'public, max-age=3600'
    }
  };
};
