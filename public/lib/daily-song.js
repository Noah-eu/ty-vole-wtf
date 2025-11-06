// public/lib/daily-song.js
// DailySong feature - displays Spotify Song of the Day

// Idempotent initialization guard
if (window.__dailyTracksInit) {
  /* already wired */
} else {
  window.__dailyTracksInit = true;

  (function() {
    const isDev = location.hostname === 'localhost' || location.hostname.endsWith('.netlify.app');

    // Local demo fallback tracks
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

    function seededRandom(seed) {
      const x = Math.sin(seed) * 10000;
      return x - Math.floor(x);
    }

    function seededShuffle(array, seed) {
      const arr = [...array];
      for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom(seed + i) * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
      }
      return arr;
    }

    function getDailySeed() {
      const today = new Date();
      return parseInt(
        today.getUTCFullYear().toString() +
        (today.getUTCMonth() + 1).toString().padStart(2, '0') +
        today.getUTCDate().toString().padStart(2, '0')
      );
    }

    function apiUrlFor(dateISO) {
      const base = '/.netlify/functions/daily-song';
      const q = new URLSearchParams({ mode: 'seed', date: dateISO });
      if (isDev) q.set('ts', String(Date.now())); // bust cache
      return `${base}?${q.toString()}`;
    }

    function toWebUrl(id, url) {
      return (url && url.startsWith('http')) ? url : `https://open.spotify.com/track/${id}`;
    }

    function formatDate(dateString) {
      const date = new Date(dateString);
      const day = date.getDate().toString().padStart(2, '0');
      const month = (date.getMonth() + 1).toString().padStart(2, '0');
      const year = date.getFullYear();
      return `${day}.${month}.${year}`;
    }

    // Resilient fetch with timeout and fallback
    async function fetchTodayTracks() {
      const dateISO = new Date().toISOString().split('T')[0];
      const url = apiUrlFor(dateISO);
      
      const ac = new AbortController();
      const t = setTimeout(() => ac.abort(), 6000); // 6s timeout
      
      try {
        const r = await fetch(url, { 
          cache: 'no-store', 
          signal: ac.signal 
        });
        
        clearTimeout(t);
        
        if (!r.ok) {
          console.warn(`API returned ${r.status}, using local demo tracks`);
          return {
            date: dateISO,
            mode: 'demo',
            source: 'demo:client-error',
            picks: seededShuffle(DEMO_TRACKS, getDailySeed()).slice(0, 3)
          };
        }

        const data = await r.json().catch(() => ({}));
        const picks = Array.isArray(data?.picks) ? data.picks : [];
        
        // Log source for debugging
        console.info('📡 daily-song source:', data?.source || 'unknown', `(${picks.length} picks)`);
        
        // Validate response has picks
        if (picks.length === 0) {
          console.warn('Empty picks from API, using local demo tracks');
          return {
            date: dateISO,
            mode: 'demo',
            source: 'demo:empty-api',
            picks: seededShuffle(DEMO_TRACKS, getDailySeed()).slice(0, 3)
          };
        }
        
        return data;
      } catch (error) {
        clearTimeout(t);
        console.warn('Failed to fetch daily tracks, using local demo:', error.message);
        return {
          date: dateISO,
          mode: 'demo',
          source: 'demo:client-catch',
          picks: seededShuffle(DEMO_TRACKS, getDailySeed()).slice(0, 3)
        };
      }
    }

    class DailySong {
      constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
          console.error(`DailySong: Container #${containerId} not found`);
          return;
        }

        this.picks = [];
        this.date = null;
        this.source = 'unknown';
        this.init();
      }

      async init() {
        this.render('loading');

        // Always succeeds - either API or demo tracks
        const data = await fetchTodayTracks();
        
        this.picks = data.picks.slice(0, 3);
        this.date = data.date;
        this.source = data.source || 'unknown';
        
        // Log source for visibility
        const sourceEmoji = this.source.includes('seed-env') ? '🌱' : 
                            this.source.includes('spotify') ? '🎧' : 
                            this.source.includes('demo') ? '🎵' : '❓';
        console.log(`${sourceEmoji} Daily tracks source: ${this.source} (${this.picks.length} tracks)`);
        
        this.render('loaded');
      }

      render(state) {
        if (state === 'loading') {
          this.container.innerHTML = `
            <div class="daily-tracks">
              <div class="text-xs opacity-70 mb-1">🎵 Loading...</div>
              <div class="daily-tracks__row">
                <div class="dtile"><div class="dtile__cover bg-gray-200 animate-pulse"></div></div>
                <div class="dtile"><div class="dtile__cover bg-gray-200 animate-pulse"></div></div>
                <div class="dtile"><div class="dtile__cover bg-gray-200 animate-pulse"></div></div>
              </div>
            </div>
          `;
          return;
        }

        if (state === 'loaded' && this.picks.length > 0) {
          // Clear previous render completely
          const row = document.createElement('div');
          row.className = 'daily-tracks__row';
          
          // Render exactly 3 tiles
          this.picks.slice(0, 3).forEach((pick) => {
            const tile = document.createElement('div');
            tile.className = 'dtile';
            
            const cover = document.createElement('div');
            cover.className = 'dtile__cover';
            
            const a = document.createElement('a');
            const href = toWebUrl(pick.id, pick.spotifyUrl);
            a.href = href;
            a.target = '_blank';
            a.rel = 'noopener noreferrer';
            a.title = 'Otevřít ve Spotify';
            
            if (pick.albumCoverUrl) {
              const img = new Image();
              img.className = 'dtile__img';
              img.src = pick.albumCoverUrl;
              img.alt = `${pick.title} — ${pick.artists}`;
              img.loading = 'lazy';
              
              // onerror fallback
              img.onerror = () => {
                const ph = document.createElement('div');
                ph.className = 'daily-track-placeholder no-pointer';
                ph.textContent = 'no cover';
                a.innerHTML = '';
                a.appendChild(ph);
              };
              
              a.appendChild(img);
            } else {
              const ph = document.createElement('div');
              ph.className = 'daily-track-placeholder no-pointer';
              ph.textContent = 'no cover';
              a.appendChild(ph);
            }
            
            cover.appendChild(a);
            tile.appendChild(cover);
            
            // Meta
            const meta = document.createElement('div');
            meta.className = 'daily-track-meta';
            
            const title = document.createElement('div');
            title.className = 'daily-track-title';
            title.title = pick.title;
            title.textContent = pick.title;
            
            const artists = document.createElement('div');
            artists.className = 'daily-track-artists';
            artists.title = pick.artists;
            artists.textContent = pick.artists;
            
            meta.appendChild(title);
            meta.appendChild(artists);
            tile.appendChild(meta);
            
            row.appendChild(tile);
          });

          this.container.innerHTML = `
            <div class="daily-tracks">
              <div class="text-xs opacity-70 mb-1">🎵 Dnešní tracky • ${formatDate(this.date)}</div>
            </div>
          `;
          this.container.querySelector('.daily-tracks').appendChild(row);
        }
      }
    }

    // Auto-initialize if container exists
    if (typeof window !== 'undefined') {
      window.addEventListener('DOMContentLoaded', () => {
        if (document.getElementById('daily-song')) {
          window.dailySongInstance = new DailySong('daily-song');
        }
      });
    }

    // Debug helper for hard reset
    window.DAILY_DEBUG_RESET = async () => {
      localStorage.clear();
      const regs = await navigator.serviceWorker.getRegistrations();
      for (const r of regs) await r.unregister();
      location.reload();
    };
  })();
}
