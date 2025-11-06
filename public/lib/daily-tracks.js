// public/lib/daily-tracks.js
// Daily tracks s 30s preview, 7-day browsing, localStorage cache, oEmbed covers
// iOS-safe: absolute URLs, no AbortController, demo fallback

(function() {
  'use strict';
  
  const root = document.getElementById('daily-tracks');
  if (!root) return;
  
  const isDev = location.hostname === 'localhost' || location.hostname.endsWith('.netlify.app');
  
  // Absolute API URL for iOS Safari compatibility
  const API_DAILY_SONG = `${window.location.origin}/.netlify/functions/daily-song`;
  
  // Demo fallback tracks (always available)
  const DEMO_TRACKS = [
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
  
  let currentOffset = 0; // 0=dnes, 1=včera, ... max 6
  let activeAudio = null; // pouze jeden Audio instance současně
  const cache = JSON.parse(localStorage.getItem('dailyTracksCache') || '{}');
  let isLoading = false; // Guard against double-loading
  let didInit = false; // Guard against double init (React StrictMode)
  
  // --- Helpers ---
  
  function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text || '';
    return div.innerHTML;
  }
  
  function isoForOffset(off) {
    const d = new Date();
    d.setUTCDate(d.getUTCDate() - off);
    return d.toISOString().slice(0, 10);
  }
  
  function fmtCZ(iso) {
    // YYYY-MM-DD → DD.MM.RRRR
    const [y, m, d] = iso.split('-');
    return `${d}.${m}.${y}`;
  }
  
  // --- iOS-safe fetch with timeout (no AbortController) ---
  
  async function fetchWithTimeout(url, options = {}, timeoutMs = 7000) {
    return await Promise.race([
      fetch(url, { ...options, cache: 'no-store' }),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('timeout')), timeoutMs)
      )
    ]);
  }
  
  // --- Cover cache (oEmbed) ---
  
  const COVER_CACHE_KEY = "coverCache.v1";
  
  function loadCoverCache() {
    try {
      return JSON.parse(localStorage.getItem(COVER_CACHE_KEY) || "{}");
    } catch {
      return {};
    }
  }
  
  function saveCoverCache(map) {
    try {
      localStorage.setItem(COVER_CACHE_KEY, JSON.stringify(map));
    } catch (error) {
      console.warn('[cover-cache] Failed to save:', error);
    }
  }
  
  async function getCover(url) {
    if (!url || !url.includes("open.spotify.com/track")) {
      return null;
    }
    
    const cache = loadCoverCache();
    if (cache[url]) return cache[url];
    
    try {
      const q = encodeURIComponent(url);
      const r = await fetch(`https://open.spotify.com/oembed?url=${q}`, { cache: "no-store" });
      if (!r.ok) return null;
      
      const json = await r.json();
      const cover = json?.thumbnail_url || null;
      
      if (cover) {
        cache[url] = cover;
        saveCoverCache(cache);
      }
      
      return cover;
    } catch (error) {
      console.warn('[cover-cache] oEmbed error:', error.message);
      return null;
    }
  }
  
  async function enrichTracks(picks) {
    if (!Array.isArray(picks)) return [];
    
    const tasks = picks.map(async (track) => {
      const enriched = { ...track };
      enriched.title = enriched.title || "Unknown Track";
      enriched.artists = enriched.artists || "Unknown Artist";
      
      if (!enriched.albumCoverUrl && enriched.spotifyUrl) {
        const cover = await getCover(enriched.spotifyUrl);
        if (cover) enriched.albumCoverUrl = cover;
      }
      
      return enriched;
    });
    
    return Promise.all(tasks);
  }
  
  function dedupeBy(arr, keyFn) {
    const seen = new Set();
    return arr.filter(item => {
      const key = keyFn(item);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }
  
  // --- Render tiles ---
  
  function renderTiles(picks, container) {
    container.innerHTML = '';
    
    picks.slice(0, 3).forEach((p) => {
      const tile = document.createElement('div');
      tile.className = 'dtile';
      
      const cover = document.createElement('div');
      cover.className = 'dtile__cover';
      
      const a = document.createElement('a');
      a.href = (p.spotifyUrl && p.spotifyUrl.startsWith('http')) ? p.spotifyUrl : `https://open.spotify.com/track/${p.id}`;
      a.target = '_blank';
      a.rel = 'noreferrer noopener';
      a.title = 'Otevřít ve Spotify';
      
      if (p.albumCoverUrl) {
        const img = document.createElement('img');
        img.className = 'dtile__img';
        img.src = p.albumCoverUrl;
        img.alt = `${p.title} — ${p.artists}`;
        img.loading = 'lazy';
        
        // Fallback pro rozbité obrázky
        img.onerror = () => {
          const ph = document.createElement('div');
          ph.className = 'dtile__placeholder';
          ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;opacity:.6;background:#f1f3f5;border-radius:8px;color:#868e96';
          ph.textContent = 'no cover';
          a.replaceChild(ph, img);
        };
        
        a.appendChild(img);
      } else {
        // Žádný cover od backendu
        const ph = document.createElement('div');
        ph.className = 'dtile__placeholder';
        ph.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;font-size:10px;opacity:.6;background:#f1f3f5;border-radius:8px;color:#868e96';
        ph.textContent = 'no cover';
        a.appendChild(ph);
      }
      
      cover.appendChild(a);
      
      // 30s preview badge
      if (p.previewUrl) {
        const btn = document.createElement('button');
        btn.className = 'preview-badge';
        btn.textContent = 'Preview';
        btn.setAttribute('aria-label', 'Přehrát 30s preview');
        
        let audio = null;
        
        btn.addEventListener('click', (e) => {
          e.preventDefault();
          e.stopPropagation();
          
          // Stopni předchozí audio
          if (activeAudio && activeAudio !== audio) {
            activeAudio.pause();
            activeAudio.currentTime = 0;
          }
          
          if (!audio) {
            audio = new Audio(p.previewUrl);
            audio.addEventListener('ended', () => {
              btn.textContent = 'Preview';
            });
            audio.addEventListener('error', () => {
              btn.textContent = 'N/A';
              btn.disabled = true;
            });
          }
          
          if (audio.paused) {
            audio.currentTime = 0;
            audio.play().then(() => {
              btn.textContent = 'Pause';
              activeAudio = audio;
            }).catch(() => {
              btn.textContent = 'Error';
            });
          } else {
            audio.pause();
            btn.textContent = 'Preview';
          }
        });
        
        cover.appendChild(btn);
      }
      
      tile.appendChild(cover);
      
      const meta = document.createElement('div');
      meta.className = 'dtile__meta';
      
      const title = document.createElement('div');
      title.className = 'dtile__title';
      title.textContent = p.title;
      
      const artists = document.createElement('div');
      artists.className = 'dtile__artists';
      artists.textContent = p.artists;
      
      meta.appendChild(title);
      meta.appendChild(artists);
      tile.appendChild(meta);
      
      container.appendChild(tile);
    });
  }
  
  // --- Load day ---
  
  async function loadDay(off) {
    // Guard against double-loading
    if (isLoading) return;
    isLoading = true;
    
    try {
      const date = isoForOffset(off);
      
      // Update heading
      const subtitle = root.querySelector('.subtitle');
      if (subtitle) {
        const dayLabel = off === 0 ? 'Dnešní tracky' : off === 1 ? 'Včerejší tracky' : 'Tracky';
        subtitle.textContent = `${dayLabel} • ${fmtCZ(date)} 🎵`;
      }
      
      // Update nav buttons
      const leftBtn = root.querySelector('.daily-nav-left');
      const rightBtn = root.querySelector('.daily-nav-right');
      if (leftBtn) leftBtn.disabled = (off >= 6);
      if (rightBtn) rightBtn.disabled = (off <= 0);
      
      // Check cache
      if (cache[date]) {
        const container = root.querySelector('.daily-tracks-grid');
        if (!cache[date].length) {
          root.style.display = 'none';
          return;
        }
        root.style.display = '';
        renderTiles(cache[date], container);
        return;
      }
      
      // Fetch from API with iOS-safe timeout
      const params = new URLSearchParams({ date });
      if (isDev) params.set('ts', Date.now());
      const url = `${API_DAILY_SONG}?${params.toString()}`;
      
      let picks = [];
      
      try {
        const response = await fetchWithTimeout(url, {
          headers: { 'Accept': 'application/json' }
        }, 7000);
        
        if (!response.ok) {
          console.warn('[daily-tracks] Fetch failed:', response.status);
          // Fallback to demo for today
          if (off === 0) {
            picks = DEMO_TRACKS;
          }
        } else {
          const data = await response.json().catch(() => ({}));
          console.info('[daily-tracks] API source:', data?.source || 'unknown');
          picks = Array.isArray(data.picks) ? data.picks : [];
          
          // Fallback to demo if empty
          if (picks.length === 0 && off === 0) {
            console.info('[daily-tracks] Using demo fallback');
            picks = DEMO_TRACKS;
          }
        }
      } catch (error) {
        console.warn('[daily-tracks] Fetch error:', error.message);
        // Always show demo for today on error
        if (off === 0) {
          picks = DEMO_TRACKS;
        }
      }
      
      // Deduplicate by id or url
      picks = dedupeBy(picks, (p) => p.id || p.url || p.spotifyUrl).slice(0, 3);
      
      // Enrich with covers from oEmbed
      picks = await enrichTracks(picks);
      
      // Replace cache (never append)
      cache[date] = picks;
      localStorage.setItem('dailyTracksCache', JSON.stringify(cache));
      
      if (!picks.length) {
        root.style.display = 'none';
        return;
      }
      
      root.style.display = '';
      const container = root.querySelector('.daily-tracks-grid');
      renderTiles(picks, container);
      
    } catch (error) {
      console.error('[daily-tracks] Error:', error);
      root.style.display = 'none';
    } finally {
      isLoading = false;
    }
  }
  
  // --- Init navigation ---
  
  function initNavigation() {
    const subtitle = root.querySelector('.subtitle');
    if (!subtitle) return;
    
    const nav = document.createElement('div');
    nav.className = 'daily-nav';
    nav.innerHTML = `
      <button class="daily-nav-left" aria-label="Starší" title="Starší">←</button>
      <button class="daily-nav-right" aria-label="Novější" title="Novější">→</button>
    `;
    
    subtitle.parentNode.insertBefore(nav, subtitle.nextSibling);
    
    const leftBtn = nav.querySelector('.daily-nav-left');
    const rightBtn = nav.querySelector('.daily-nav-right');
    
    leftBtn.addEventListener('click', () => {
      if (currentOffset < 6) {
        currentOffset++;
        loadDay(currentOffset);
      }
    });
    
    rightBtn.addEventListener('click', () => {
      if (currentOffset > 0) {
        currentOffset--;
        loadDay(currentOffset);
      }
    });
  }
  
  // --- Init ---
  
  function init() {
    if (didInit) return;
    didInit = true;
    initNavigation();
    loadDay(0);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
