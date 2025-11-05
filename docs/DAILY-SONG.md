# Daily Song Feature - Implementation Summary

## ✅ Implementováno

DailySong feature zobrazuje jeden globální Spotify hit každý den nad vibe generátorem.

## 📋 Co bylo přidáno

### 1. **Serverless funkce** (`netlify/functions/daily-song.ts`)
- Používá Spotify Client Credentials API
- Stahuje tracky z globálních playlistů (Top 50 Global, Viral, atd.)
- Filtruje:
  - ❌ Explicit obsah (pokud `DISALLOW_EXPLICIT=true`)
  - ❌ Tracky nehrající v CZ
  - ❌ Popularita < 70
  - ❌ Umělci s žánry "czech" nebo "slovak"
- Scoring algoritmus: `0.6*popularity + 0.25*recency + 0.1*diversity + 0.05*novelty`
- Deterministický výběr podle UTC data (stejný song celý den)
- Fallback na 10 globálních hitů při chybě API
- Cache headers: `max-age=300, s-maxage=3600, stale-while-revalidate=86400`

### 2. **Frontend komponenta** (`public/lib/daily-song.js`)
- Načítá song z `/.netlify/functions/daily-song`
- Zobrazuje:
  - Label: "🎵 Song dne • DD.MM.YYYY"
  - Velký album cover (celý je klikatelný → Spotify)
  - Název + umělci (truncate na 1 řádek)
  - Play/pause overlay pro 30s preview (pokud dostupný)
- Historie: ukládá posledních 7 dnů do `localStorage`
- Navigace: ←/→ tlačítka pro procházení historie
- Loading skeleton + error state

### 3. **CSS styling** (`public/lib/daily-song.css`)
- Glassmorphism design (`backdrop-filter: blur(12px)`)
- Responsive layout (max-width: 28rem)
- Smooth animations a transitions
- Play button overlay s hover efekty
- Dark theme (#111, rgba(18,18,18,0.72))

### 4. **Integrace**
- ✅ Přidáno do `index.html` nad vibe generator
- ✅ CSS import v `<head>`
- ✅ JS script s `defer`
- ✅ Container `<div id="daily-song"></div>`

### 5. **Environment Setup**
- ✅ `.env.example` s template pro Spotify credentials
- ✅ `tsconfig.json` pro TypeScript kompilaci
- ✅ `netlify.toml` s cache headers pro `/daily-song` endpoint
- ✅ Dependencies: `@netlify/functions`, `@types/node`, `typescript`

## 🔧 Nastavení

### 1. Spotify API Credentials

1. Jdi na [Spotify Developer Dashboard](https://developer.spotify.com/dashboard)
2. Vytvoř novou aplikaci
3. Zkopíruj **Client ID** a **Client Secret**
4. Přidej do Netlify Environment Variables:

```bash
SPOTIFY_CLIENT_ID=your_client_id_here
SPOTIFY_CLIENT_SECRET=your_client_secret_here
```

### 2. Volitelné konfigurace

```bash
# Spotify playlisty (výchozí: Top 50 Global, Viral Global)
SPOTIFY_PLAYLIST_IDS=37i9dQZF1DXcBWIGoYBM5M,37i9dQZEVXbMDoHDwVN2tF,37i9dQZF1DWUa8ZRTfalHk,37i9dQZF1DX4JAvHpjipBk

# Filtrovat explicit obsah (výchozí: true)
DISALLOW_EXPLICIT=true
```

### 3. Deployment

```bash
# Build TypeScript
npm run build

# nebo jen zkompiluj funkce
npx tsc

# Deploy na Netlify (automaticky při push na main)
git push origin main
```

## 📊 API Response Format

```typescript
{
  id: string;              // Spotify track ID
  title: string;           // Název tracku
  artists: string;         // Umělci (oddělení čárkou)
  albumCoverUrl: string;   // URL album coveru (640x640)
  spotifyUrl: string;      // Link na Spotify
  previewUrl: string | null; // 30s preview URL (může být null)
  date: string;            // ISO date (YYYY-MM-DD)
}
```

## 🎯 Features

- ✅ Deterministický výběr (stejný song celý den)
- ✅ Fallback při chybě API
- ✅ 30s preview přehrávání
- ✅ Historie posledních 7 dnů
- ✅ Navigace v historii (←/→)
- ✅ localStorage persistence
- ✅ Loading states
- ✅ Error handling
- ✅ Responsive design
- ✅ Accessibility (ARIA labels, keyboard navigation)

## 🚀 Testování

1. **Lokálně s Netlify Dev:**
```bash
netlify dev
```

2. **Test funkce:**
```bash
curl http://localhost:8888/.netlify/functions/daily-song
```

3. **Produkce:**
```
https://ty-vole.wtf
```

## 📝 Poznámky

- Funkce cachuje response na 5 minut (CDN 1 hodinu)
- History se ukládá do `localStorage['dailySongHistory']`
- Fallback obsahuje 10 známých globálních hitů
- Bez Spotify credentials funguje s fallback songy
- TypeScript kompiluje do `/dist` složky (git ignored)

## 🐛 Troubleshooting

**Funkce vrací fallback místo Spotify tracků:**
- Zkontroluj Spotify credentials v Netlify Environment Variables
- Ověř, že máš platné Client ID a Secret
- Zkontroluj Netlify function logs

**Preview se nehraje:**
- Některé tracky nemají preview URL
- Play button se zobrazí jen když `previewUrl !== null`

**Daily song se nemění:**
- Očekávané chování - song se mění jednou denně (UTC midnight)
- Pro test můžeš použít `debug-clean.html` a smazat localStorage

## 📦 Soubory

```
├── netlify/functions/
│   └── daily-song.ts          # Serverless funkce
├── public/lib/
│   ├── daily-song.js          # Frontend komponenta
│   └── daily-song.css         # Styling
├── public/index.html          # Integrace
├── .env.example               # Environment variables template
├── tsconfig.json              # TypeScript config
└── netlify.toml              # Netlify config (cache headers)
```

## ✨ Live Demo

🔗 **https://ty-vole.wtf**

Daily Song se zobrazuje jako první sekce nad vibe generátorem.
