# ty-vole.wtf

## Environment Variables

### Daily Tracks Configuration

**SEED_TRACKS** (Backend - Netlify Functions)
- Comma-separated list of Spotify track URLs or IDs
- Used as primary source for daily tracks if set
- Deterministically shuffled based on UTC date
- Example:
  ```
  SEED_TRACKS=https://open.spotify.com/track/6usohdchdzW9oML7VC4Uhk,https://open.spotify.com/track/1BxfuPKGuaTgP7aM0Bbdwr,https://open.spotify.com/track/0yLdNVWF3Srea0uzk55zFn
  ```
- **Important:** Set in Netlify Environment Variables (Production context), NOT as `VITE_*`
- Requires redeploy after changing

**SPOTIFY_CLIENT_ID** & **SPOTIFY_CLIENT_SECRET** (Backend)
- Optional if SEED_TRACKS is set
- Used for Spotify API integration (recommendations, metadata)
- Falls back to SEED_TRACKS or demo if missing

### Daily Tracks Source Priority

1. **seed-env**: SEED_TRACKS env var (≥3 tracks) → Direct use
2. **spotify**: Spotify API with credentials → Recommendations/playlists
3. **seed-env:fallback**: SEED_TRACKS used when Spotify returns empty
4. **demo:no-creds**: Hardcoded demo tracks (no Spotify, no seeds)
5. **demo:empty-picks**: Demo tracks when Spotify returns 0 picks
6. **demo:catch**: Demo tracks on any backend error

### Source Field in API Response

```json
{
  "date": "2025-11-06",
  "mode": "seed-env",
  "source": "seed-env",
  "picks": [...]
}
```

Check `source` in DevTools Console or Network tab to see which source was used.
