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
    images: { url: string; height: number; width: number }[];
    release_date: string;
  };
  artists: { id: string; name: string; genres?: string[] }[];
}

interface DailySongResponse {
  id: string;
  title: string;
  artists: string;
  albumCoverUrl: string;
  spotifyUrl: string;
  previewUrl: string | null;
  date: string;
}

interface DailyPicksResponse {
  date: string;
  seed: number;
  picks: DailySongResponse[];
}

// Fallback hits (global, no Czech/Slovak, no explicit)
const FALLBACK_SONGS: DailySongResponse[] = [
  {
    id: "3n3Ppam7vgaVa1iaRUc9Lp",
    title: "Mr. Brightside",
    artists: "The Killers",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273ccdddd46119a4ff53eaf1f5d",
    spotifyUrl: "https://open.spotify.com/track/3n3Ppam7vgaVa1iaRUc9Lp",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "0VjIjW4GlUZAMYd2vXMi3b",
    title: "Blinding Lights",
    artists: "The Weeknd",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b2738863bc11d2aa12b54f5aeb36",
    spotifyUrl: "https://open.spotify.com/track/0VjIjW4GlUZAMYd2vXMi3b",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "7qiZfU4dY1lWllzX7mPBI",
    title: "Shape of You",
    artists: "Ed Sheeran",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273ba5db46f4b838ef6027e6f96",
    spotifyUrl: "https://open.spotify.com/track/7qiZfU4dY1lWllzX7mPBI",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "3WMj8moIAXJhHsyLaqIIHI",
    title: "Levitating",
    artists: "Dua Lipa",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273be841ba4bc24340152e3a79a",
    spotifyUrl: "https://open.spotify.com/track/3WMj8moIAXJhHsyLaqIIHI",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "0DiWol3AO6WpXZgp0goxAV",
    title: "One Dance",
    artists: "Drake, WizKid, Kyla",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273f46b9d202509a8f7384b90de",
    spotifyUrl: "https://open.spotify.com/track/0DiWol3AO6WpXZgp0goxAV",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "6habFhsOp2NvshLv26DqMb",
    title: "Someone You Loved",
    artists: "Lewis Capaldi",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b2737b2e74a4a4f98f87fdfdf1ba",
    spotifyUrl: "https://open.spotify.com/track/6habFhsOp2NvshLv26DqMb",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "3cfOd4CMv2snFaKAnMdnvK",
    title: "Starboy",
    artists: "The Weeknd, Daft Punk",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b2734718e2b124f79258be7bc452",
    spotifyUrl: "https://open.spotify.com/track/3cfOd4CMv2snFaKAnMdnvK",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "5Z01UMMf7V1o0MzF86s6WJ",
    title: "Bad Guy",
    artists: "Billie Eilish",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b2732a038d3bf875d23e4aeaa84e",
    spotifyUrl: "https://open.spotify.com/track/5Z01UMMf7V1o0MzF86s6WJ",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "6DCZcSspjsKoFjzjrWoCdn",
    title: "God's Plan",
    artists: "Drake",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273f907de96b9a4fbc04accc0d5",
    spotifyUrl: "https://open.spotify.com/track/6DCZcSspjsKoFjzjrWoCdn",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  },
  {
    id: "60nZcImufyMA1MKQY3dcCH",
    title: "Heat Waves",
    artists: "Glass Animals",
    albumCoverUrl: "https://i.scdn.co/image/ab67616d0000b273e5d6426e25d6fcedf0cd4c22",
    spotifyUrl: "https://open.spotify.com/track/60nZcImufyMA1MKQY3dcCH",
    previewUrl: null,
    date: new Date().toISOString().split("T")[0]
  }
];

// Simple seeded random for deterministic daily selection
function seededRandom(seed: number): number {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function getDailyIndex(arrayLength: number): number {
  const today = new Date();
  const seed = parseInt(
    today.getUTCFullYear().toString() +
    (today.getUTCMonth() + 1).toString().padStart(2, "0") +
    today.getUTCDate().toString().padStart(2, "0")
  );
  return Math.floor(seededRandom(seed) * arrayLength);
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

async function ensureAlbumCovers(
  accessToken: string,
  tracks: SpotifyTrack[]
): Promise<Record<string, string | null>> {
  const map: Record<string, string | null> = {};
  
  // First pass: collect existing covers
  for (const t of tracks) {
    const cover = t.album?.images?.[0]?.url || null;
    map[t.id] = cover;
  }
  
  // Find tracks without covers
  const needCovers = tracks.filter(t => !t.album?.images?.length);
  
  // Fetch missing covers
  for (const track of needCovers) {
    try {
      const response = await fetch(
        `https://api.spotify.com/v1/tracks/${track.id}`,
        { headers: { Authorization: `Bearer ${accessToken}` } }
      );
      
      if (response.ok) {
        const data = await response.json() as SpotifyTrack;
        map[track.id] = data?.album?.images?.[0]?.url || null;
      }
    } catch (error) {
      console.error(`Failed to fetch cover for track ${track.id}:`, error);
    }
  }
  
  return map;
}

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

function filterTrack(
  track: SpotifyTrack,
  disallowExplicit: boolean
): boolean {
  // Exclude explicit if flag is on
  if (disallowExplicit && track.explicit) return false;

  // Only tracks playable in CZ
  if (!track.available_markets.includes("CZ")) return false;

  // Popularity >= 70
  if (track.popularity < 70) return false;

  // Recency filter: ≤ 3 months
  const monthsOld = monthsBetweenUTC(track.album?.release_date);
  if (monthsOld > 3) return false;

  // Exclude Czech/Slovak artists (simple check on artist names)
  const artistNames = track.artists.map(a => a.name.toLowerCase()).join(" ");
  if (artistNames.includes("czech") || artistNames.includes("slovak")) return false;

  return true;
}

function scoreTrack(track: SpotifyTrack): number {
  const popularity = track.popularity;
  
  // Recency boost (≤3 months)
  const releaseDate = new Date(track.album.release_date);
  const now = new Date();
  const monthsAgo = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
  const recencyBoost = monthsAgo <= 3 ? (3 - monthsAgo) / 3 * 100 : 0;

  // Score: 0.6*popularity + 0.25*recency + 0.1*diversity(0) + 0.05*novelty(0)
  return 0.6 * popularity + 0.25 * recencyBoost + 0.1 * 0 + 0.05 * 0;
}

function selectDailyTracks(tracks: SpotifyTrack[], coverMap: Record<string, string | null>): SpotifyTrack[] {
  // Score all tracks
  const scored = tracks.map(track => ({
    track,
    score: scoreTrack(track),
    albumCoverUrl: coverMap[track.id] || ""
  }));

  // Filter out tracks without covers and sort by score descending
  const top = scored
    .filter(s => s.albumCoverUrl)
    .sort((a, b) => b.score - a.score)
    .slice(0, 30);

  if (top.length === 0) {
    // Fallback if no tracks with covers
    return tracks.slice(0, 3);
  }

  // Shuffle top candidates with daily seed
  const dailySeed = getDailySeed();
  const shuffled = seededShuffle(top, dailySeed);

  // Return exactly 3 winners
  const winners = shuffled.slice(0, Math.min(3, shuffled.length));
  return winners.map(w => w.track);
}

function formatTrackResponse(track: SpotifyTrack): DailySongResponse {
  const albumCover = track.album.images.find(img => img.height >= 300) || track.album.images[0];
  
  return {
    id: track.id,
    title: track.name,
    artists: track.artists.map(a => a.name).join(", "),
    albumCoverUrl: albumCover?.url || "",
    spotifyUrl: track.external_urls.spotify,
    previewUrl: track.preview_url,
    date: new Date().toISOString().split("T")[0]
  };
}

function getCacheHeaders() {
  const debugNoCache = process.env.DEBUG_NO_CACHE === "true";
  
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "GET, OPTIONS",
    "Content-Type": "application/json",
    "Cache-Control": debugNoCache 
      ? "no-store, no-cache, must-revalidate, proxy-revalidate"
      : "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
  };
}

export const handler: Handler = async (
  event: HandlerEvent,
  context: HandlerContext
) => {
  // CORS headers
  const headers = getCacheHeaders();

  // Handle OPTIONS preflight
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 204, headers, body: "" };
  }

  try {
    const clientId = process.env.SPOTIFY_CLIENT_ID;
    const clientSecret = process.env.SPOTIFY_CLIENT_SECRET;
    const playlistIds = process.env.SPOTIFY_PLAYLIST_IDS || 
      "37i9dQZF1DXcBWIGoYBM5M,37i9dQZEVXbMDoHDwVN2tF,37i9dQZF1DWUa8ZRTfalHk,37i9dQZF1DX4JAvHpjipBk";
    const disallowExplicit = process.env.DISALLOW_EXPLICIT !== "false";

    if (!clientId || !clientSecret) {
      console.warn("Spotify credentials not configured, using fallback");
      const dailySeed = getDailySeed();
      const shuffled = seededShuffle(FALLBACK_SONGS, dailySeed);
      const fallbackPicks = shuffled.slice(0, 3);
      
      const response: DailyPicksResponse = {
        date: new Date().toISOString().split("T")[0],
        seed: dailySeed,
        picks: fallbackPicks
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };
    }

    // Get Spotify access token
    const token = await getSpotifyToken(clientId, clientSecret);

    // Fetch tracks from all playlists
    const playlistIdArray = playlistIds.split(",").map(id => id.trim());
    const allTracks: SpotifyTrack[] = [];

    for (const playlistId of playlistIdArray) {
      const tracks = await fetchPlaylistTracks(playlistId, token);
      allTracks.push(...tracks);
    }

    // Filter tracks
    const filteredTracks = allTracks.filter(track =>
      filterTrack(track, disallowExplicit)
    );

    if (filteredTracks.length === 0) {
      console.warn("No tracks passed filters, using fallback");
      const dailySeed = getDailySeed();
      const shuffled = seededShuffle(FALLBACK_SONGS, dailySeed);
      const fallbackPicks = shuffled.slice(0, 3);
      
      const response: DailyPicksResponse = {
        date: new Date().toISOString().split("T")[0],
        seed: dailySeed,
        picks: fallbackPicks
      };
      
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify(response)
      };
    }

    // Ensure all tracks have album covers
    const coverMap = await ensureAlbumCovers(token, filteredTracks);

    // Select 3 daily tracks
    const selectedTracks = selectDailyTracks(filteredTracks, coverMap);
    
    // Format response with ensured covers
    const dailySeed = getDailySeed();
    const dateISO = new Date().toISOString().split("T")[0];
    
    const response: DailyPicksResponse = {
      date: dateISO,
      seed: dailySeed,
      picks: selectedTracks.map(track => ({
        id: track.id,
        title: track.name,
        artists: track.artists.map((a: { name: string }) => a.name).join(", "),
        albumCoverUrl: coverMap[track.id] || "",
        spotifyUrl: track.external_urls.spotify,
        previewUrl: track.preview_url,
        date: dateISO
      }))
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  } catch (error) {
    console.error("Daily song error:", error);

    // Return fallback on error
    const dailySeed = getDailySeed();
    const shuffled = seededShuffle(FALLBACK_SONGS, dailySeed);
    const fallbackPicks = shuffled.slice(0, 3);
    
    const response: DailyPicksResponse = {
      date: new Date().toISOString().split("T")[0],
      seed: dailySeed,
      picks: fallbackPicks
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response)
    };
  }
};
