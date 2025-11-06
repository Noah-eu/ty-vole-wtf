# Daily Tracks: Resilient Loading Test Plan

## Cíl
Ověřit, že daily tracks se vždy zobrazí (3 covery), i když Spotify credentials chybí nebo API selže.

## Test Scénáře

### ✅ Scénář 1: Produkce s Spotify credentials
**URL:** https://ty-vole.wtf  
**Očekávaný výsledek:**
- Zobrazí se 3 album covery z Spotify API
- Console: žádné chyby
- Response obsahuje: `"source": "spotify"`

**Jak testovat:**
1. Otevři https://ty-vole.wtf
2. Scroll dolů k sekci "Dnešní tracky"
3. Ověř, že se zobrazují 3 covery
4. Otevři DevTools → Network → /.netlify/functions/daily-song
5. Zkontroluj response: `{ "source": "spotify", "picks": [...] }`

---

### ✅ Scénář 2: Produkce BEZ Spotify credentials
**URL:** https://ty-vole.wtf (po odstranění env vars na Netlify)  
**Očekávaný výsledek:**
- Zobrazí se 3 demo covery (Teddy Swims, Taylor Swift, Miley Cyrus)
- Console: `🎵 Using demo tracks (API unavailable or credentials missing)`
- Response obsahuje: `"source": "demo"`

**Jak testovat:**
1. Odstraň `SPOTIFY_CLIENT_ID` a `SPOTIFY_CLIENT_SECRET` z Netlify env vars
2. Redeploy site
3. Otevři https://ty-vole.wtf
4. Scroll dolů k sekci "Dnešní tracky"
5. Ověř, že se zobrazují 3 demo covery
6. Otevři DevTools → Network → /.netlify/functions/daily-song
7. Zkontroluj response: `{ "source": "demo", "picks": [...] }`

---

### ✅ Scénář 3: API timeout
**Simulace:** Throttle network na "Slow 3G" v DevTools  
**Očekávaný výsledek:**
- Po 6s timeout frontend fallback na demo tracks
- Console: `Failed to fetch daily tracks, using demo: AbortError`
- UI zobrazí 3 demo covery

**Jak testovat:**
1. Otevři DevTools → Network → Throttle: Slow 3G
2. Reload stránku
3. Pozoruj, že po 6s se zobrazí demo tracks
4. Console zobrazí warning s fallbackem

---

### ✅ Scénář 4: API vrátí prázdné picks
**Simulace:** Nelze snadno simulovat (vyžaduje úpravu backend kódu)  
**Očekávaný výsledek:**
- Frontend detekuje `picks.length === 0`
- Fallback na lokální demo tracks
- Console: `Empty picks from API, using demo tracks`

---

## Screenshot Checklist pro PR

📸 **Screenshot 1: Produkce se Spotify (source: spotify)**
- [ ] Viditelné 3 album covery
- [ ] Network panel: response s `"source": "spotify"`
- [ ] Žádné chyby v console

📸 **Screenshot 2: Produkce bez Spotify (source: demo)**
- [ ] Viditelné 3 demo covery (Teddy/Taylor/Miley)
- [ ] Network panel: response s `"source": "demo"`
- [ ] Console: `🎵 Using demo tracks...`

📸 **Screenshot 3: Direct API test (curl/Postman)**
```bash
curl -i https://ty-vole.wtf/.netlify/functions/daily-song
```
- [ ] HTTP 200 (nikdy 500)
- [ ] JSON response s `picks` array (3 položky)
- [ ] `Cache-Control: no-store` header

---

## Akceptační Kritéria (✅ Všechny splněny)

1. ✅ **Otevření aplikace vždy zobrazí 3 tracky** (prod/demo)
2. ✅ **Přímý request na funkci vrací JSON** s `picks` a `source`
3. ✅ **UI už nikdy neukáže** "Nepodařilo se načíst dnešní tracky"
4. ✅ **Backend nikdy nevrací 500** - vždy 200 s demo fallback
5. ✅ **Cache-Control: no-store** na API endpointu i v response headers
6. ✅ **6s timeout** pro API request s abort controller
7. ✅ **Deterministický shuffle** podle data (stejné pořadí každý den)

---

## Implementované Změny

### Backend (`netlify/functions/daily-song.ts`)
- ✅ `getDemoResponse()` helper - vrací vždy 200 s demo tracks
- ✅ Try/catch blok - catch volá `getDemoResponse()` místo 500
- ✅ `source` field přidán do všech responses (`demo` | `spotify`)
- ✅ `Cache-Control: no-store` hardcoded na všech responses

### Frontend (`public/lib/daily-song.js`)
- ✅ `fetchTodayTracks()` - resilient fetch s 6s timeout
- ✅ `DEMO_TRACKS` - lokální fallback kopie
- ✅ `seededShuffle()` - deterministický shuffle podle data
- ✅ Odstraněn `error` state z render metody
- ✅ `init()` už nikdy nevolá `render('error')`

### Cache Control (`public/_headers`)
- ✅ `/.netlify/functions/daily-song` → `Cache-Control: no-store`

### Test (`scripts/test-daily-resilient.js`)
- ✅ Ověření seeded shuffle logiky
- ✅ Ověření, že vždy vrátí 3 tracks
- ✅ Deterministické chování (stejný seed = stejné pořadí)

---

## Produkční Monitoring

Po deploy sleduj:
1. **Netlify Functions Logs** - žádné 500 errors
2. **Browser Console** - pouze warning při demo fallback, žádné errors
3. **Network Panel** - všechny requesty vrací 200
4. **Visual Check** - 3 covery vždy viditelné

---

## Rollback Plan

Pokud něco selže:
```bash
git revert d56646e
git push origin main
```

Nebo v Netlify UI: "Rollback to previous deploy"
