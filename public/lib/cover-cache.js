// public/lib/cover-cache.js
// Spotify oEmbed cover fetching with localStorage cache

const CACHE_KEY = "coverCache.v1";

function loadCache() {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}");
  } catch {
    return {};
  }
}

function saveCache(map) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(map));
  } catch (error) {
    console.warn('[cover-cache] Failed to save cache:', error);
  }
}

/**
 * Fetch cover image URL from Spotify oEmbed API
 * @param {string} url - Spotify track URL
 * @returns {Promise<string|null>} - Cover image URL or null
 */
export async function getCover(url) {
  if (!url || !url.includes("open.spotify.com/track")) {
    return null;
  }
  
  const cache = loadCache();
  
  // Return cached value
  if (cache[url]) {
    return cache[url];
  }
  
  try {
    const q = encodeURIComponent(url);
    const response = await fetch(`https://open.spotify.com/oembed?url=${q}`, {
      cache: "no-store"
    });
    
    if (!response.ok) {
      console.warn(`[cover-cache] oEmbed failed for ${url}: ${response.status}`);
      return null;
    }
    
    const json = await response.json();
    const coverUrl = json?.thumbnail_url || null;
    
    // Cache the result (even if null to avoid repeated failures)
    if (coverUrl) {
      cache[url] = coverUrl;
      saveCache(cache);
    }
    
    return coverUrl;
  } catch (error) {
    console.warn('[cover-cache] oEmbed error:', error.message);
    return null;
  }
}

/**
 * Enrich tracks with cover images from oEmbed
 * @param {Array} picks - Array of track objects
 * @returns {Promise<Array>} - Enriched tracks with image field
 */
export async function enrichTracks(picks) {
  if (!Array.isArray(picks)) {
    return [];
  }
  
  // Process in parallel with limit to avoid spam
  const tasks = picks.map(async (track) => {
    const enriched = { ...track };
    
    // Set defaults
    enriched.title = enriched.title || "Unknown Track";
    enriched.artists = enriched.artists || "Unknown Artist";
    
    // Fetch cover if missing
    if (!enriched.albumCoverUrl && enriched.spotifyUrl) {
      const cover = await getCover(enriched.spotifyUrl);
      if (cover) {
        enriched.albumCoverUrl = cover;
      }
    }
    
    return enriched;
  });
  
  return Promise.all(tasks);
}

/**
 * Deduplicate array by key function
 * @param {Array} arr - Input array
 * @param {Function} keyFn - Function to extract unique key
 * @returns {Array} - Deduplicated array
 */
export function dedupeBy(arr, keyFn) {
  const seen = new Set();
  return arr.filter(item => {
    const key = keyFn(item);
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}
