# SEED_TRACKS Environment Variable

## Overview

`SEED_TRACKS` allows you to personalize Daily Tracks recommendations using Spotify's Recommendations API. Instead of pulling from global playlists, the system generates recommendations based on your seed tracks.

## Setup

### 1. Gather your seed tracks

Collect Spotify track URLs or IDs that represent your musical taste. You can use:
- Full URLs: `https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk`
- Track IDs only: `6usohdchdzW9oML7VC4Uhk`

### 2. Format the environment variable

Separate tracks with commas, spaces, or newlines. Mix formats freely:

```bash
SEED_TRACKS="
https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk,
https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr
0yLdNVWF3Srea0uzk55zFn
3Wrjm47oTz2sjIgck11l5e
"
```

### 3. Add to Netlify

**Option A: Netlify UI**
1. Go to Site settings → Environment variables
2. Add key: `SEED_TRACKS`
3. Paste your track list (up to 100 tracks)
4. Save and redeploy

**Option B: Netlify CLI**
```bash
netlify env:set SEED_TRACKS "6usohdchdzW9oML7VC4Uhk,1BxfuPKGuaTgP7aM0Bbdwr,0yLdNVWF3Srea0uzk55zFn"
```

## How it works

### Seed mode (SEED_TRACKS set)
1. **Parsing**: Extracts up to 100 unique track IDs from env var
2. **Daily sampling**: Deterministically picks 5 seeds using current date (UTC YYYYMMDD)
3. **Recommendations**: Calls `GET /v1/recommendations` with:
   - `seed_tracks`: 5 sampled IDs
   - `market=CZ`
   - `limit=100`
   - `min_popularity=0`
4. **Scoring**: `0.7*similarity + 0.25*recency + 0.05*popularity`
   - Similarity: avg(danceability, energy, valence) from audio features
   - Recency: age-based boost (3→6→12→24 months windows)
   - Popularity: normalized 0-100 score
5. **Filtering**: No explicit, no CZ/SK artists, CZ market only
6. **Output**: 3 picks always (fallback to hardcoded tracks if needed)

### Playlist mode (SEED_TRACKS not set)
Falls back to original global playlist mode (Today's Top Hits, etc.)

## Testing

### Check seed count
```bash
curl "https://your-site.netlify.app/.netlify/functions/daily-song?debug=1"
```

Response:
```json
{
  "date": "2025-11-06",
  "picks": [...],
  "debug": {
    "mode": "seed",
    "seedCount": 12,
    "seed": 20251106,
    "counts": {...},
    "pool": 47
  }
}
```

### Verify mode
- `mode: "seed"` → using SEED_TRACKS
- `mode: "playlist"` → using global playlists

## Example seeds

### Indie/Alternative
```
SEED_TRACKS="
6usohdchdzW9oML7VC4Uhk (Teddy Swims - Lose Control)
3Wrjm47oTz2sjIgck11l5e (Arctic Monkeys - Do I Wanna Know?)
0VjIjW4GlUZAMYd2vXMi3b (The Weeknd - Blinding Lights)
"
```

### Electronic/Dance
```
SEED_TRACKS="
0DiWol3AO6WpXZgp0goxAV (OneRepublic - Counting Stars)
4cOdK2wGLETKBW3PvgPWqT (Rick Astley - Never Gonna Give You Up)
"
```

### Czech/Slovak (will be filtered out, use for contrast)
```
SEED_TRACKS="
1BxfuPKGuaTgP7aM0Bbdwr (Taylor Swift - Cruel Summer)
0yLdNVWF3Srea0uzk55zFn (Miley Cyrus - Flowers)
"
```

## Limits

- **Max seeds**: 100 (automatically capped)
- **Daily sample**: 5 seeds (Spotify API limit)
- **Size**: ~4KB recommended (env var limit)
- **Format**: URLs or IDs, any separator (comma, space, newline)

## Updating seeds

1. Edit `SEED_TRACKS` in Netlify UI
2. Trigger redeploy (or wait for next deploy)
3. Clear localStorage cache in browser: `localStorage.removeItem('dailyTracksCache')`
4. Refresh page

## Troubleshooting

### No picks returned
- Check seedCount in debug output
- Verify track IDs are 22 characters: `[A-Za-z0-9]{22}`
- Test individual seed URLs in Spotify

### Same picks every day
- Seeds are sampled deterministically by date
- With 5+ seeds, you'll get variety over 7-day period
- Add more seeds for more variety

### Recommendations not relevant
- Add more diverse seed tracks (10-20 recommended)
- Check if seeds are all from same genre/artist
- Spotify recommendations work best with variety

## API Reference

### Spotify Recommendations
```
GET https://api.spotify.com/v1/recommendations
  ?seed_tracks={id1},{id2},{id3},{id4},{id5}
  &market=CZ
  &limit=100
  &min_popularity=0
```

### Audio Features (for scoring)
```
GET https://api.spotify.com/v1/audio-features
  ?ids={id1},{id2},...
```

Returns:
- `danceability`: 0-1
- `energy`: 0-1
- `valence`: 0-1 (positivity)
- Used for similarity scoring

## Performance

- **Cache**: 5 min browser, 1 hour CDN
- **Calls per day**: ~5 API requests (token, recommendations, features, covers)
- **Response time**: ~1-2s
- **localStorage cache**: Prevents redundant requests for same date
