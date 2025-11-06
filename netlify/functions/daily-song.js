// netlify/functions/daily-song.js
// Robust Daily Song picks with diagnostics and fallback

const DEFAULT_POP_MIN = Number(process.env.POP_MIN ?? 70);
const WINDOWS = [3, 6, 12, 24]; // měsíce – postupné uvolňování
const REQUIRE_CZ = (process.env.REQUIRE_CZ ?? "true").toLowerCase() === "true";
const DEBUG_NO_CACHE = (process.env.DEBUG_NO_CACHE || "false") === "true";

// Fallback tracks když Spotify selže
const FALLBACK_TRACKS = [
  {
    id: "fallback1",
    title: "Lose Control",
    artists: "Teddy Swims",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273e841e1c0b3a9f3c43e8a8d60",
    spotifyUrl: "https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk",
    previewUrl: null
  },
  {
    id: "fallback2",
    title: "Cruel Summer",
    artists: "Taylor Swift",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647",
    spotifyUrl: "https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr",
    previewUrl: null
  },
  {
    id: "fallback3",
    title: "Flowers",
    artists: "Miley Cyrus",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273f58248221b6fafb93e1c44be",
    spotifyUrl: "https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn",
    previewUrl: null
  }
];

function cacheHeaders() {
  return DEBUG_NO_CACHE
    ? { "content-type": "application/json", "cache-control": "no-store" }
    : { "content-type": "application/json", "cache-control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400" };
}

function resp(code, data) {
  return { statusCode: code, headers: cacheHeaders(), body: JSON.stringify(data) };
}

// Seeded shuffle for deterministic randomness
function seededShuffle(arr, seed) {
  const copy = [...arr];
  let rng = seed;
  for (let i = copy.length - 1; i > 0; i--) {
    rng = (rng * 9301 + 49297) % 233280;
    const j = Math.floor((rng / 233280) * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

// Normalizace 0-100 → 0-1
function normalize(val, max = 100) {
  return Math.max(0, Math.min(1, val / max));
}

// Recency boost (čerstvější = vyšší)
function recency_boost(releaseDate, windowMonths = 18) {
  if (!releaseDate) return 0;
  const age = monthsBetweenUTC(releaseDate);
  if (age > windowMonths) return 0;
  return 1 - (age / windowMonths);
}

function monthsBetweenUTC(isoDate) {
  if (!isoDate) return 999;
  const release = new Date(isoDate + 'T00:00:00Z');
  const now = new Date();
  const diffMs = now.getTime() - release.getTime();
  return Math.floor(diffMs / (1000 * 60 * 60 * 24 * 30.44));
}

// Load seed tracks from SEED_TRACKS env var
function loadSeedTracks() {
  const raw = process.env.SEED_TRACKS || '';
  if (!raw.trim()) return [];
  
  const ids = new Set();
  
  // Regex pro URL: /track/([A-Za-z0-9]{22})
  const urlMatches = raw.matchAll(/track\/([A-Za-z0-9]{22})/g);
  for (const match of urlMatches) {
    ids.add(match[1]);
  }
  
  // Regex pro bare IDs: ^[A-Za-z0-9]{22}$
  const tokens = raw.split(/[\s,]+/);
  for (const token of tokens) {
    const trimmed = token.trim();
    if (/^[A-Za-z0-9]{22}$/.test(trimmed)) {
      ids.add(trimmed);
    }
  }
  
  // Dedupe, cap to 100
  return Array.from(ids).slice(0, 100);
}

// Spotify OAuth
async function getSpotifyToken() {
  const clientId = process.env.SPOTIFY_CLIENT_ID;
  const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
  
  if (!clientId || !clientSecret) {
    throw new Error('Missing Spotify credentials');
  }

  const auth = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
  const response = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${auth}`,
      'Content-Type': 'application/x-www-form-urlencoded'
    },
    body: 'grant_type=client_credentials'
  });

  if (!response.ok) throw new Error('Spotify auth failed');
  const data = await response.json();
  return data.access_token;
}

// Fetch playlist tracks
async function fetchPlaylistTracks(accessToken, playlistId) {
  const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.items.map(item => item.track).filter(t => t && t.id);
}

// Get recommendations from seed tracks
async function fetchRecommendations(accessToken, seedIds, dailySeed) {
  // Deterministically sample up to 5 seed IDs
  const shuffled = seededShuffle(seedIds, dailySeed);
  const seeds = shuffled.slice(0, Math.min(5, seedIds.length));
  
  const params = new URLSearchParams({
    seed_tracks: seeds.join(','),
    market: 'CZ',
    limit: '100',
    min_popularity: '0'
  });
  
  const response = await fetch(`https://api.spotify.com/v1/recommendations?${params}`, {
    headers: { 'Authorization': `Bearer ${accessToken}` }
  });
  
  if (!response.ok) return [];
  const data = await response.json();
  return data.tracks || [];
}

// Fetch audio features for similarity scoring
async function fetchAudioFeatures(accessToken, trackIds) {
  const chunks = [];
  for (let i = 0; i < trackIds.length; i += 100) {
    chunks.push(trackIds.slice(i, i + 100));
  }
  
  const featuresMap = {};
  for (const chunk of chunks) {
    const response = await fetch(`https://api.spotify.com/v1/audio-features?ids=${chunk.join(',')}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      data.audio_features.forEach(f => {
        if (f) featuresMap[f.id] = f;
      });
    }
  }
  return featuresMap;
}

// Calculate similarity score from audio features
function calculateSimilarity(features) {
  if (!features) return 0;
  
  // Jednoduchý similarity score založený na "danceability" a "energy"
  // (doporučení od Spotify API už jsou relevantní, takže jen lehká váha)
  const danceability = features.danceability ?? 0.5;
  const energy = features.energy ?? 0.5;
  const valence = features.valence ?? 0.5;
  
  // Průměr klíčových vlastností (všechny 0-1)
  return (danceability + energy + valence) / 3;
}

// Fetch artist genres
async function fetchArtistGenres(accessToken, artistIds) {
  const chunks = [];
  for (let i = 0; i < artistIds.length; i += 50) {
    chunks.push(artistIds.slice(i, i + 50));
  }
  
  const genresMap = {};
  for (const chunk of chunks) {
    const response = await fetch(`https://api.spotify.com/v1/artists?ids=${chunk.join(',')}`, {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (response.ok) {
      const data = await response.json();
      data.artists.forEach(a => {
        if (a) genresMap[a.id] = a.genres || [];
      });
    }
  }
  return genresMap;
}

// 3-stupňový fallback pro album covers
async function ensureAlbumCovers(accessToken, tracks) {
  const coverMap = {};
  const missing = [];
  const albumIds = new Set();
  
  // Stupeň 1: track.album.images[0]?.url
  for (const t of tracks) {
    const cover = t.album?.images?.[0]?.url;
    if (cover && cover.startsWith('http')) {
      coverMap[t.id] = cover;
    } else {
      missing.push(t);
      if (t.album?.id) albumIds.add(t.album.id);
    }
  }
  
  // Stupeň 2: GET /v1/tracks/{id} → album.images
  if (missing.length > 0) {
    const chunks = [];
    for (let i = 0; i < missing.length; i += 50) {
      chunks.push(missing.slice(i, i + 50));
    }
    
    for (const chunk of chunks) {
      const ids = chunk.map(t => t.id).join(',');
      const response = await fetch(`https://api.spotify.com/v1/tracks?ids=${ids}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        data.tracks.forEach(t => {
          if (t?.album?.images?.[0]?.url) {
            const url = t.album.images[0].url;
            if (url.startsWith('http')) {
              coverMap[t.id] = url;
              albumIds.delete(t.album.id); // už máme cover
            }
          }
        });
      }
    }
  }
  
  // Stupeň 3: GET /v1/albums/{id} pro zbylé album IDs
  if (albumIds.size > 0) {
    const albumChunks = [];
    const albumArr = Array.from(albumIds);
    for (let i = 0; i < albumArr.length; i += 20) {
      albumChunks.push(albumArr.slice(i, i + 20));
    }
    
    const albumCovers = {};
    for (const chunk of albumChunks) {
      const ids = chunk.join(',');
      const response = await fetch(`https://api.spotify.com/v1/albums?ids=${ids}`, {
        headers: { 'Authorization': `Bearer ${accessToken}` }
      });
      if (response.ok) {
        const data = await response.json();
        data.albums.forEach(a => {
          if (a?.images?.[0]?.url) {
            const url = a.images[0].url;
            if (url.startsWith('http')) {
              albumCovers[a.id] = url;
            }
          }
        });
      }
    }
    
    // Mapuj zpět na tracky
    for (const t of missing) {
      if (!coverMap[t.id] && t.album?.id && albumCovers[t.album.id]) {
        coverMap[t.id] = albumCovers[t.album.id];
      }
    }
  }
  
  return coverMap;
}

export async function handler(event, context) {
  try {
    const debug = event?.queryStringParameters?.debug === '1';
    const disallowExplicit = true; // always filter explicit
    
    // Parametr date=YYYY-MM-DD (default: dnes UTC)
    const dateParam = event?.queryStringParameters?.date;
    let targetDate;
    
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      // Validuj rozsah (max 7 dní zpět)
      const requested = new Date(dateParam + 'T00:00:00Z');
      const now = new Date();
      const diffDays = Math.floor((now - requested) / (1000 * 60 * 60 * 24));
      
      if (diffDays >= 0 && diffDays <= 6) {
        targetDate = requested;
      } else {
        targetDate = new Date(); // fallback na dnes
      }
    } else {
      targetDate = new Date();
    }
    
    const dateISO = targetDate.toISOString().split('T')[0];
    const dailySeed = parseInt(dateISO.replace(/-/g, ''), 10);
    
    // Get Spotify token
    const accessToken = await getSpotifyToken();
    
    // Load seed tracks from env
    const seedIds = loadSeedTracks();
    const mode = seedIds.length >= 1 ? 'seed' : 'playlist';
    
    let allTracks = [];
    
    if (mode === 'seed') {
      // SEED MODE: Use Spotify Recommendations API
      allTracks = await fetchRecommendations(accessToken, seedIds, dailySeed);
    } else {
      // PLAYLIST MODE: Original behavior
      const playlistIds = (process.env.SPOTIFY_PLAYLIST_IDS || '37i9dQZF1DXcBWIGoYBM5M').split(',').map(s => s.trim());
      
      for (const pid of playlistIds) {
        const tracks = await fetchPlaylistTracks(accessToken, pid);
        allTracks.push(...tracks);
      }
    }
    
    for (const pid of playlistIds) {
      const tracks = await fetchPlaylistTracks(accessToken, pid);
      allTracks.push(...tracks);
    }
    
    // Deduplicate by ID
    const uniq = Array.from(new Map(allTracks.map(t => [t.id, t])).values());
    
    // Get artist genres for filtering
    const artistIds = [...new Set(uniq.flatMap(t => t.artists?.map(a => a.id) || []))];
    const artistGenresMap = await fetchArtistGenres(accessToken, artistIds);
    
    // Diagnostika filtrů
    let counts = { total: 0, noExplicit: 0, pop: 0, market: 0, czech: 0, kept: 0 };
    counts.total = uniq.length;
    
    const filtered = uniq.filter(t => {
      if (disallowExplicit && t.explicit) { counts.noExplicit++; return false; }
      // V seed mode neaplikujeme DEFAULT_POP_MIN (recommendations už jsou relevantní)
      if (mode === 'playlist' && (t.popularity ?? 0) < DEFAULT_POP_MIN) { counts.pop++; return false; }
      const playableCZ = (t.available_markets?.includes("CZ") || t.album?.available_markets?.includes("CZ"));
      if (REQUIRE_CZ && !playableCZ) { counts.market++; return false; }
      const isCzech = t.artists.some(a => ((artistGenresMap[a.id] || []).join(" ").toLowerCase()).match(/czech|slovak|\bcz\b/));
      if (isCzech) { counts.czech++; return false; }
      return true;
    });
    counts.kept = filtered.length;
    
    // Prefer fresh tracks (3/6/12/24 months windows)
    const ageMonths = (iso) => monthsBetweenUTC(iso);
    let pool = [];
    
    for (const w of WINDOWS) {
      pool = filtered.filter(t => ageMonths(t.album?.release_date) <= w);
      if (pool.length >= 3) break;
    }
    
    // Fallback: lower popularity threshold (jen v playlist mode)
    if (pool.length < 3 && mode === 'playlist') {
      const lo = filtered.filter(t => (t.popularity ?? 0) >= Math.min(60, DEFAULT_POP_MIN));
      pool = lo.filter(t => ageMonths(t.album?.release_date) <= WINDOWS[WINDOWS.length - 1]);
    }
    
    // Last resort: ignore CZ market requirement
    if (pool.length < 3 && REQUIRE_CZ) {
      pool = uniq.filter(t =>
        (mode === 'seed' || (t.popularity ?? 0) >= Math.min(60, DEFAULT_POP_MIN)) &&
        ageMonths(t.album?.release_date) <= WINDOWS[WINDOWS.length - 1] &&
        !(t.explicit && disallowExplicit) &&
        !t.artists.some(a => ((artistGenresMap[a.id] || []).join(" ").toLowerCase()).match(/czech|slovak|\bcz\b/))
      );
    }
    
    // Ensure album covers
    const coverMap = await ensureAlbumCovers(accessToken, pool);
    
    // Fetch audio features for seed mode scoring
    let featuresMap = {};
    if (mode === 'seed') {
      const trackIds = pool.map(t => t.id);
      featuresMap = await fetchAudioFeatures(accessToken, trackIds);
    }
    
    // Score and rank
    const scored = pool.map(t => {
      let score;
      if (mode === 'seed') {
        // Seed mode: similarity + recency + popularity
        const similarity = calculateSimilarity(featuresMap[t.id]);
        score = 0.7 * similarity + 0.25 * recency_boost(t.album?.release_date, 18) + 0.05 * normalize(t.popularity || 0);
      } else {
        // Playlist mode: original scoring
        score = 0.6 * normalize(t.popularity || 0) + 0.25 * recency_boost(t.album?.release_date, 18);
      }
      
      return {
        track: t,
        albumCoverUrl: coverMap[t.id] || null,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);
    
    // Deterministic shuffle and pick 3
    const shuffled = seededShuffle(scored, dailySeed);
    let winners = shuffled.slice(0, 3);
    
    // Fill with scored if not enough
    if (winners.length < 3) {
      const extra = scored.filter(x => !winners.some(w => w.track.id === x.track.id)).slice(0, 3 - winners.length);
      winners = winners.concat(extra);
    }
    
    // Fallback to hardcoded tracks
    if (winners.length < 3) {
      const fb = seededShuffle(FALLBACK_TRACKS, dailySeed).slice(0, 3 - winners.length).map(f => ({
        track: {
          id: f.id,
          name: f.title,
          artists: f.artists.split(", ").map(n => ({ id: n, name: n })),
          external_urls: { spotify: f.spotifyUrl },
          preview_url: f.previewUrl
        },
        albumCoverUrl: f.albumCoverUrl,
        score: 0
      }));
      winners = winners.concat(fb);
    }
    
    // Format response - vždy https URL
    const toWebUrl = (id, url) => {
      if (url && url.startsWith("https://")) return url;
      return `https://open.spotify.com/track/${id}`;
    };
    
    const body = {
      date: dateISO,
      picks: winners.map(w => ({
        id: w.track.id,
        title: w.track.name,
        artists: w.track.artists.map(a => a.name).join(", "),
        albumCoverUrl: w.albumCoverUrl || null, // ensure fallback to null
        spotifyUrl: toWebUrl(w.track.id, w.track.external_urls?.spotify),
        previewUrl: (w.track.preview_url && w.track.preview_url.startsWith('http')) ? w.track.preview_url : null
      })),
      ...(debug ? { debug: { mode, seedCount: seedIds.length, seed: dailySeed, counts, pool: pool.length } } : {})
    };
    
    return resp(200, body);
    
  } catch (error) {
    console.error('[daily-song] Error:', error);
    
    // Return fallback tracks on error
    return resp(200, {
      date: new Date().toISOString().split('T')[0],
      picks: FALLBACK_TRACKS,
      error: error.message
    });
  }
}
