// netlify/functions/daily-song.ts
import { Handler, HandlerEvent, HandlerContext } from "@netlify/functions";

interface SpotifyTrack {
  id: string;
  name: string;
  popularity: number;
  explicit: boolean;
  available_markets: string[];
  preview_url: string | null;
  external_urls: { spotify: string };
  album: {
    id?: string;
    images: { url: string; height: number; width: number }[];
    release_date: string;
  };
  artists: { id: string; name: string; genres?: string[] }[];
}

interface AudioFeatures {
  id: string;
  danceability: number;
  energy: number;
  valence: number;
  tempo: number;
}

interface DailySongResponse {
  id: string;
  title: string;
  artists: string;
  albumCoverUrl: string | null;
  spotifyUrl: string;
  previewUrl: string | null;
}

interface DailyPicksResponse {
  date: string;
  mode: 'seed' | 'global';
  picks: DailySongResponse[];
  debug?: {
    seedCount: number;
    candidates: number;
    window?: number;
  };
}

// Demo fallback tracks (when no Spotify credentials)
const DEMO_TRACKS: DailySongResponse[] = [
  {
    id: "6usohdchdzW9oML7VC4Uhk",
    title: "Lose Control",
    artists: "Teddy Swims",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273e841e1c0b3a9f3c43e8a8d60",
    spotifyUrl: "https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk",
    previewUrl: null
  },
  {
    id: "1BxfuPKGuaTgP7aM0Bbdwr",
    title: "Cruel Summer",
    artists: "Taylor Swift",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273e787cffec20aa2a396a61647",
    spotifyUrl: "https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr",
    previewUrl: null
  },
  {
    id: "0yLdNVWF3Srea0uzk55zFn",
    title: "Flowers",
    artists: "Miley Cyrus",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273f58248221b6fafb93e1c44be",
    spotifyUrl: "https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn",
    previewUrl: null
  }
];

// Parse SEED_TRACKS from env
function parseSeeds(str?: string): string[] {
  if (!str) return [];
  return Array.from(new Set(
    str.split(/[,\s]+/).map(s => s.trim()).filter(Boolean).map(s => {
      const m = s.match(/track\/([A-Za-z0-9]{22})/);
      if (m) return m[1];
      return /^[A-Za-z0-9]{22}$/.test(s) ? s : '';
    }).filter(Boolean)
  )).slice(0, 100);
}

function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDailySeed(): number {
  const today = new Date();
  return parseInt(
    today.getUTCFullYear().toString() +
    (today.getUTCMonth() + 1).toString().padStart(2, "0") +
    today.getUTCDate().toString().padStart(2, "0")
  );
}

function seededShuffle<T>(array: T[], seed: number): T[] {
  const arr = [...array];
  let currentSeed = seed;
  
  for (let i = arr.length - 1; i > 0; i--) {
    currentSeed = (currentSeed * 9301 + 49297) % 233280;
    const j = Math.floor((currentSeed / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  
  return arr;
}

function monthsBetweenUTC(releaseDate?: string): number {
  if (!releaseDate) return 999;
  try {
    const release = new Date(releaseDate);
    const now = new Date();
    const diffMs = now.getTime() - release.getTime();
    return diffMs / (1000 * 60 * 60 * 24 * 30.44);
  } catch {
    return 999;
  }
}

function withinMonths(dateISO?: string, limit = 3): boolean {
  const m = monthsBetweenUTC(dateISO);
  return m >= 0 && m <= limit;
}

// 3-step cover fallback: track → album → null
async function ensureAlbumCovers(
  accessToken: string,
  tracks: SpotifyTrack[]
): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {};
  const need: string[] = [];
  
  for (const t of tracks) {
    const u = t?.album?.images?.[0]?.url || t?.album?.images?.slice(-1)[0]?.url || null;
    map[t.id] = u;
    if (!u) need.push(t.id);
  }
  
  // Fetch missing covers from /v1/tracks
  for (const id of need) {
    try {
      const r = await fetch(`https://api.spotify.com/v1/tracks/${id}`, {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (r.ok) {
        const j = await r.json() as SpotifyTrack;
        map[id] = j?.album?.images?.[0]?.url || j?.album?.images?.slice(-1)[0]?.url || map[id] || null;
        
        // If still no cover and we have album ID, try /v1/albums
        if (!map[id] && j?.album?.id) {
          const r2 = await fetch(`https://api.spotify.com/v1/albums/${j.album.id}`, {
            headers: { Authorization: `Bearer ${accessToken}` }
          });
          if (r2.ok) {
            const a = await r2.json() as { images: { url: string }[] };
            map[id] = a?.images?.[0]?.url || a?.images?.slice(-1)[0]?.url || null;
          }
        }
      }
    } catch {
      // Keep null
    }
  }
  
  return map;
}

const toWebUrl = (id: string, url?: string) => 
  (url && url.startsWith('http')) ? url : `https://open.spotify.com/track/${id}`;

async function getSpotifyToken(
  clientId: string,
  clientSecret: string
): Promise<string> {
  const response = await fetch("https://accounts.spotify.com/api/token", {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${Buffer.from(`${clientId}:${clientSecret}`).toString("base64")}`
    },
    body: "grant_type=client_credentials"
  });

  if (!response.ok) {
    throw new Error(`Spotify auth failed: ${response.status}`);
  }

  const data = await response.json() as { access_token: string };
  return data.access_token;
}

async function fetchPlaylistTracks(
  playlistId: string,
  token: string
): Promise<SpotifyTrack[]> {
  const response = await fetch(
    `https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch playlist ${playlistId}: ${response.status}`);
    return [];
  }

  const data = await response.json() as { items: Array<{ track: SpotifyTrack }> };
  return data.items
    .filter((item: any) => item.track && item.track.id)
    .map((item: any) => item.track);
}

// Fetch recommendations based on seed tracks
async function fetchRecommendations(
  seedIds: string[],
  token: string
): Promise<SpotifyTrack[]> {
  const seedParam = seedIds.slice(0, 5).join(',');
  const response = await fetch(
    `https://api.spotify.com/v1/recommendations?seed_tracks=${seedParam}&market=CZ&limit=100&min_popularity=0`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch recommendations: ${response.status}`);
    return [];
  }

  const data = await response.json() as { tracks: SpotifyTrack[] };
  return data.tracks || [];
}

// Fetch audio features for tracks
async function fetchAudioFeatures(
  trackIds: string[],
  token: string
): Promise<Record<string, AudioFeatures>> {
  if (trackIds.length === 0) return {};
  
  const ids = trackIds.slice(0, 100).join(',');
  const response = await fetch(
    `https://api.spotify.com/v1/audio-features?ids=${ids}`,
    {
      headers: { Authorization: `Bearer ${token}` }
    }
  );

  if (!response.ok) {
    console.error(`Failed to fetch audio features: ${response.status}`);
    return {};
  }

  const data = await response.json() as { audio_features: (AudioFeatures | null)[] };
  const map: Record<string, AudioFeatures> = {};
  
  for (const feat of data.audio_features || []) {
    if (feat) map[feat.id] = feat;
  }
  
  return map;
}

// Compute cosine similarity
function cosineSimilarity(a: AudioFeatures, b: AudioFeatures): number {
  const v1 = [a.danceability, a.energy, a.valence, a.tempo / 200];
  const v2 = [b.danceability, b.energy, b.valence, b.tempo / 200];
  
  let dot = 0, mag1 = 0, mag2 = 0;
  for (let i = 0; i < v1.length; i++) {
    dot += v1[i] * v2[i];
    mag1 += v1[i] * v1[i];
    mag2 += v2[i] * v2[i];
  }
  
  return mag1 && mag2 ? dot / (Math.sqrt(mag1) * Math.sqrt(mag2)) : 0;
}

function filterTrack(
  track: SpotifyTrack,
  disallowExplicit: boolean
): boolean {
  // Exclude explicit if flag is on
  if (disallowExplicit && track.explicit) return false;

  // Only tracks playable in CZ
  if (!track.available_markets.includes("CZ")) return false;

  // Popularity >= 70 (for global mode) - in seed mode we allow min_popularity=0
  // So we'll skip this for seed mode

  // Exclude Czech/Slovak artists (simple check on artist names)
  const artistNames = track.artists.map(a => a.name.toLowerCase()).join(" ");
  if (artistNames.includes("czech") || artistNames.includes("slovak")) return false;

  return true;
}

function scoreTrack(track: SpotifyTrack, similarity: number = 0): number {
  const popularity = track.popularity;
  
  // Recency boost
  const monthsAgo = monthsBetweenUTC(track.album?.release_date);
  const recencyBoost = monthsAgo <= 3 ? (3 - monthsAgo) / 3 * 100 : 0;

  // Score: similarity + recency + some popularity
  return similarity * 100 + 0.25 * recencyBoost + 0.1 * popularity;
}

function selectDailyTracks(
  tracks: SpotifyTrack[],
  coverMap: Record<string, string | null>,
  seedFeatures: Record<string, AudioFeatures>,
  candidateFeatures: Record<string, AudioFeatures>
): { track: SpotifyTrack; albumCoverUrl: string | null }[] {
  const dailySeed = getDailySeed();
  
  // Compute average seed features
  const seedVals = Object.values(seedFeatures);
  const avgSeed: AudioFeatures = seedVals.length > 0 ? {
    id: 'avg',
    danceability: seedVals.reduce((s, f) => s + f.danceability, 0) / seedVals.length,
    energy: seedVals.reduce((s, f) => s + f.energy, 0) / seedVals.length,
    valence: seedVals.reduce((s, f) => s + f.valence, 0) / seedVals.length,
    tempo: seedVals.reduce((s, f) => s + f.tempo, 0) / seedVals.length,
  } : { id: 'avg', danceability: 0.5, energy: 0.5, valence: 0.5, tempo: 120 };
  
  // Score tracks by similarity
  const scored = tracks.map(track => {
    const features = candidateFeatures[track.id];
    const similarity = features ? cosineSimilarity(avgSeed, features) : 0;
    return {
      track,
      score: scoreTrack(track, similarity),
      albumCoverUrl: coverMap[track.id] ?? null
    };
  });

  // Sort by score descending and take top 30
  const top = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  const shuffled = seededShuffle(top, dailySeed);

  // Pick up to 3 winners from shuffled
  let winners = shuffled.slice(0, Math.min(3, shuffled.length));

  // If we have fewer than 3, fill from top (highest score) excluding already chosen
  if (winners.length < 3) {
    const extra = top
      .filter(x => !winners.some(w => w.track.id === x.track.id))
      .slice(0, 3 - winners.length);
    winners = winners.concat(extra);
  }

  // Ensure we always return exactly 3 picks (pad if needed)
  if (winners.length < 3) {
    const best = top[0];
    while (winners.length < 3 && best) {
      winners.push(best);
    }
  }

  return winners;
}

function getCacheHeaders(noCache: boolean) {
  return noCache
    ? {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
        "Cache-Control": "no-store, max-age=0"
      }
    : {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
      };
}

// Helper to return demo tracks with deterministic shuffle
function getDemoResponse(qp: any): { statusCode: number; headers: any; body: string } {
  const noCache = (process.env.DEBUG_NO_CACHE === 'true') || ('debug' in qp) || ('ts' in qp);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0"
  };
  
  const dateISO = new Date().toISOString().split("T")[0];
  const dailySeed = getDailySeed();
  const shuffled = seededShuffle(DEMO_TRACKS, dailySeed);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      date: dateISO,
      mode: 'demo' as const,
      source: 'demo',
      picks: shuffled.slice(0, 3)
    })
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  const qp = event?.queryStringParameters || {};
  const noCache = (process.env.DEBUG_NO_CACHE === 'true') || ('debug' in qp) || ('ts' in qp);
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": "no-store, max-age=0"
  };

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const disallowExplicit = process.env.DISALLOW_EXPLICIT !== "false";

    if (!clientId || !clientSecret) {
      console.warn("Spotify credentials not configured, using demo tracks");
      return getDemoResponse(qp);
    }

    // Parse seed tracks from env
    const ENV_SEEDS = parseSeeds(process.env.SEED_TRACKS);
    const forcedMode = (qp.mode || '').toLowerCase();
    let mode: 'seed' | 'global' = forcedMode === 'seed' ? 'seed' : 
                                    forcedMode === 'global' ? 'global' : 
                                    (ENV_SEEDS.length ? 'seed' : 'global');

    const token = await getSpotifyToken(clientId, clientSecret);
    const dateISO = new Date().toISOString().split("T")[0];
    const dailySeed = getDailySeed();

    let pool: SpotifyTrack[] = [];
    let windowUsed: number | undefined = undefined;

    if (mode === 'seed' && ENV_SEEDS.length > 0) {
      // Select up to 5 seed IDs deterministically
      const shuffledSeeds = seededShuffle(ENV_SEEDS, dailySeed);
      const selectedSeeds = shuffledSeeds.slice(0, 5);

      // Fetch recommendations
      const recommendations = await fetchRecommendations(selectedSeeds, token);
      
      // Filter candidates
      let filtered = recommendations.filter(track => filterTrack(track, disallowExplicit));
      
      // Never consider tracks older than 24 months
      filtered = filtered.filter(t => monthsBetweenUTC(t.album?.release_date) <= 24);

      // Staged windowing: 3 -> 6 -> 12 -> 24
      pool = filtered.filter(t => withinMonths(t.album?.release_date, 3));
      windowUsed = 3;
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 6));
        windowUsed = 6;
      }
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 12));
        windowUsed = 12;
      }
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 24));
        windowUsed = 24;
      }
      if (pool.length < 3) {
        pool = filtered;
      }

      // If still < 3, fall back to global mode
      if (pool.length < 3) {
        console.log(`Seed mode yielded ${pool.length} candidates, switching to global`);
        mode = 'global';
      }
    }

    if (mode === 'global') {
      // Global playlist mode (existing logic)
      const playlistIds = process.env.SPOTIFY_PLAYLIST_IDS || 
        "37i9dQZF1DXcBWIGoYBM5M,37i9dQZEVXbMDoHDwVN2tF,37i9dQZF1DWUa8ZRTfalHk,37i9dQZF1DX4JAvHpjipBk";
      const playlistIdArray = playlistIds.split(",").map(id => id.trim());
      const allTracks: SpotifyTrack[] = [];

      for (const playlistId of playlistIdArray) {
        const tracks = await fetchPlaylistTracks(playlistId, token);
        allTracks.push(...tracks);
      }

      // Filter tracks - add popularity >= 70 for global mode
      let filtered = allTracks.filter(track => {
        if (!filterTrack(track, disallowExplicit)) return false;
        return track.popularity >= 70;
      });
      
      // Never consider tracks older than 24 months
      filtered = filtered.filter(t => monthsBetweenUTC(t.album?.release_date) <= 24);

      // Staged windowing
      pool = filtered.filter(t => withinMonths(t.album?.release_date, 3));
      windowUsed = 3;
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 6));
        windowUsed = 6;
      }
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 12));
        windowUsed = 12;
      }
      if (pool.length < 3) {
        pool = filtered.filter(t => withinMonths(t.album?.release_date, 24));
        windowUsed = 24;
      }
      if (pool.length < 3) {
        pool = filtered;
      }
    }

    // Ensure album covers for pool
    const coverMap = await ensureAlbumCovers(token, pool);

    // Fetch audio features for seed mode
    let seedFeatures: Record<string, AudioFeatures> = {};
    let candidateFeatures: Record<string, AudioFeatures> = {};
    
    if (mode === 'seed' && ENV_SEEDS.length > 0) {
      const shuffledSeeds = seededShuffle(ENV_SEEDS, dailySeed);
      const selectedSeeds = shuffledSeeds.slice(0, 5);
      seedFeatures = await fetchAudioFeatures(selectedSeeds, token);
      candidateFeatures = await fetchAudioFeatures(pool.map(t => t.id), token);
    }

    // Select 3 daily tracks
    const winners = selectDailyTracks(pool, coverMap, seedFeatures, candidateFeatures);

    const body: DailyPicksResponse = {
      date: dateISO,
      mode,
      picks: winners.slice(0, 3).map(w => ({
        id: w.track.id,
        title: w.track.name,
        artists: w.track.artists.map(a => a.name).join(', '),
        albumCoverUrl: w.albumCoverUrl || null,
        spotifyUrl: toWebUrl(w.track.id, w.track.external_urls?.spotify),
        previewUrl: w.track.preview_url ?? null
      })),
      ...(qp.debug ? { 
        debug: { 
          seedCount: ENV_SEEDS.length, 
          candidates: pool.length,
          ...(windowUsed ? { window: windowUsed } : {})
        } 
      } : {})
    };

    // If we got no picks from Spotify, fallback to demo
    if (body.picks.length === 0) {
      console.warn("Spotify returned 0 picks, using demo tracks");
      return getDemoResponse(qp);
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        ...body,
        source: 'spotify'
      })
    };
  } catch (error) {
    console.error("Daily song error (falling back to demo):", error);
    // Always return 200 with demo tracks - never fail
    return getDemoResponse(qp);
  }
};
