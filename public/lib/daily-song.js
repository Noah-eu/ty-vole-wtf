// public/lib/daily-song.js
// DailySong feature - displays Spotify Song of the Day

class DailySong {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`DailySong: Container #${containerId} not found`);
      return;
    }

    this.picks = []; // Array of 3 songs for today
    this.date = null;

    this.init();
  }

  isDev() {
    // Check if running on localhost or 127.0.0.1
    return window.location.hostname === 'localhost' || 
           window.location.hostname === '127.0.0.1' ||
           window.location.hostname === '';
  }

  async init() {
    this.render('loading');

    try {
      // Add cache-bust in dev mode
      const url = this.isDev() 
        ? '/.netlify/functions/daily-song?ts=' + Date.now()
        : '/.netlify/functions/daily-song';
      
      const response = await fetch(url);
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const data = await response.json();
      
      // Handle new format: { date, seed, picks: [...] }
      this.picks = data.picks || [];
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

  formatDate(dateString) {
    const date = new Date(dateString);
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}.${month}.${year}`;
  }

  truncate(text, maxLength) {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength - 1) + '…';
  }

  render(state) {
    if (state === 'loading') {
      this.container.innerHTML = `
        <div class="daily-song-compact">
          <div class="text-xs opacity-70 mb-1">🎵 Loading...</div>
          <div class="daily-tracks-row">
            <div class="w-20 h-20 bg-gray-200 rounded-md animate-pulse"></div>
            <div class="w-20 h-20 bg-gray-200 rounded-md animate-pulse"></div>
            <div class="w-20 h-20 bg-gray-200 rounded-md animate-pulse"></div>
          </div>
        </div>
      `;
      return;
    }

    if (state === 'error') {
      this.container.innerHTML = `
        <div class="daily-song-compact error">
          <div class="text-xs opacity-70 mb-1">🎵 Dnešní tracky</div>
          <div class="text-sm text-red-600">Nepodařilo se načíst dnešní tracky.</div>
        </div>
      `;
      return;
    }

    if (state === 'loaded' && this.picks.length > 0) {
      // Render all 3 picks in a row
      const tilesHTML = this.picks.map((pick) => {
        const hasCover = !!pick.albumCoverUrl;
        const hasPreview = !!pick.previewUrl;
        
        return `
          <div class="daily-track-tile">
            <div class="daily-track-cover">
              <a href="${pick.spotifyUrl}" target="_blank" rel="noopener noreferrer" title="Otevřít ve Spotify">
                ${hasCover ? `
                  <img src="${pick.albumCoverUrl}" 
                       alt="${pick.title} — ${pick.artists}" 
                       class="daily-track-img" 
                       loading="lazy" />
                ` : `
                  <div class="daily-track-placeholder">no cover</div>
                `}
              </a>
            </div>
            <div class="daily-track-meta">
              <div class="daily-track-title" title="${pick.title}">${pick.title}</div>
              <div class="daily-track-artists" title="${pick.artists}">${pick.artists}</div>
            </div>
          </div>
        `;
      }).join('');

      this.container.innerHTML = `
        <div class="daily-song-compact">
          <div class="text-xs opacity-70 mb-1">🎵 Dnešní tracky • ${this.formatDate(this.date)}</div>
          <div class="daily-tracks-row">
            ${tilesHTML}
          </div>
        </div>
      `;
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
