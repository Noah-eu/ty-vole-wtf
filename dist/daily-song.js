"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
// Fallback hits (global, no Czech/Slovak, no explicit)
const FALLBACK_SONGS = [
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
function seededRandom(seed) {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
}
function getDailyIndex(arrayLength) {
    const today = new Date();
    const seed = parseInt(today.getUTCFullYear().toString() +
        (today.getUTCMonth() + 1).toString().padStart(2, "0") +
        today.getUTCDate().toString().padStart(2, "0"));
    return Math.floor(seededRandom(seed) * arrayLength);
}
async function getSpotifyToken(clientId, clientSecret) {
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
    const data = await response.json();
    return data.access_token;
}
async function fetchPlaylistTracks(playlistId, token) {
    const response = await fetch(`https://api.spotify.com/v1/playlists/${playlistId}/tracks?limit=50`, {
        headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) {
        console.error(`Failed to fetch playlist ${playlistId}: ${response.status}`);
        return [];
    }
    const data = await response.json();
    return data.items
        .filter((item) => item.track && item.track.id)
        .map((item) => item.track);
}
function filterTrack(track, disallowExplicit) {
    // Exclude explicit if flag is on
    if (disallowExplicit && track.explicit)
        return false;
    // Only tracks playable in CZ
    if (!track.available_markets.includes("CZ"))
        return false;
    // Popularity >= 70
    if (track.popularity < 70)
        return false;
    // Exclude Czech/Slovak artists (simple check on artist names)
    const artistNames = track.artists.map(a => a.name.toLowerCase()).join(" ");
    if (artistNames.includes("czech") || artistNames.includes("slovak"))
        return false;
    return true;
}
function scoreTrack(track) {
    const popularity = track.popularity;
    // Recency boost (≤18 months)
    const releaseDate = new Date(track.album.release_date);
    const now = new Date();
    const monthsAgo = (now.getTime() - releaseDate.getTime()) / (1000 * 60 * 60 * 24 * 30);
    const recencyBoost = monthsAgo <= 18 ? (18 - monthsAgo) / 18 * 100 : 0;
    // Score: 0.6*popularity + 0.25*recency + 0.1*diversity(0) + 0.05*novelty(0)
    return 0.6 * popularity + 0.25 * recencyBoost + 0.1 * 0 + 0.05 * 0;
}
function selectDailyTrack(tracks) {
    // Score all tracks
    const scored = tracks.map(track => ({
        track,
        score: scoreTrack(track)
    }));
    // Sort by score descending
    scored.sort((a, b) => b.score - a.score);
    // Take top 20% as candidates
    const topCandidates = scored.slice(0, Math.max(1, Math.floor(scored.length * 0.2)));
    // Use deterministic daily selection from top candidates
    const index = getDailyIndex(topCandidates.length);
    return topCandidates[index].track;
}
function formatTrackResponse(track) {
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
const handler = async (event, context) => {
    // CORS headers
    const headers = {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Headers": "Content-Type",
        "Access-Control-Allow-Methods": "GET, OPTIONS",
        "Content-Type": "application/json",
        "Cache-Control": "public, max-age=300, s-maxage=3600, stale-while-revalidate=86400"
    };
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
            const fallbackSong = FALLBACK_SONGS[getDailyIndex(FALLBACK_SONGS.length)];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fallbackSong)
            };
        }
        // Get Spotify access token
        const token = await getSpotifyToken(clientId, clientSecret);
        // Fetch tracks from all playlists
        const playlistIdArray = playlistIds.split(",").map(id => id.trim());
        const allTracks = [];
        for (const playlistId of playlistIdArray) {
            const tracks = await fetchPlaylistTracks(playlistId, token);
            allTracks.push(...tracks);
        }
        // Filter tracks
        const filteredTracks = allTracks.filter(track => filterTrack(track, disallowExplicit));
        if (filteredTracks.length === 0) {
            console.warn("No tracks passed filters, using fallback");
            const fallbackSong = FALLBACK_SONGS[getDailyIndex(FALLBACK_SONGS.length)];
            return {
                statusCode: 200,
                headers,
                body: JSON.stringify(fallbackSong)
            };
        }
        // Select daily track
        const selectedTrack = selectDailyTrack(filteredTracks);
        const response = formatTrackResponse(selectedTrack);
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(response)
        };
    }
    catch (error) {
        console.error("Daily song error:", error);
        // Return fallback on error
        const fallbackSong = FALLBACK_SONGS[getDailyIndex(FALLBACK_SONGS.length)];
        return {
            statusCode: 200,
            headers,
            body: JSON.stringify(fallbackSong)
        };
    }
};
exports.handler = handler;
