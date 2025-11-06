// public/lib/daily-song.js
// DailySong feature - displays Spotify Song of the Day

// Idempotent initialization guard
if (window.__dailyTracksInit) {
  /* already wired */
} else {
  window.__dailyTracksInit = true;

  (function() {
    const isDev = location.hostname === 'localhost' || location.hostname.endsWith('.netlify.app');

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

    class DailySong {
      constructor(containerId) {
        this.container = document.getElementById(containerId);
        if (!this.container) {
          console.error(`DailySong: Container #${containerId} not found`);
          return;
        }

        this.picks = [];
        this.date = null;
        this.init();
      }

      async init() {
        this.render('loading');

        try {
          const dateISO = new Date().toISOString().split('T')[0];
          const url = apiUrlFor(dateISO);
          
          const response = await fetch(url);
          if (!response.ok) throw new Error(`HTTP ${response.status}`);

          const data = await response.json();
          
          // Handle new format: { date, mode, picks: [...] }
          this.picks = Array.isArray(data.picks) ? data.picks.slice(0, 3) : [];
          this.date = data.date;
          
          if (this.picks.length === 0) {
            throw new Error('No picks received');
          }
          
          this.render('loaded');
        } catch (error) {
          console.error('Failed to load daily song:', error);
          this.render('error');
        }
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

        if (state === 'error') {
          this.container.innerHTML = `
            <div class="daily-tracks error">
              <div class="text-xs opacity-70 mb-1">🎵 Dnešní tracky</div>
              <div class="text-sm text-red-600">Nepodařilo se načíst dnešní tracky.</div>
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
