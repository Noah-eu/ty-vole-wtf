// public/lib/daily-song.js
// DailySong feature - displays Spotify Song of the Day

class DailySong {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`DailySong: Container #${containerId} not found`);
      return;
    }

    this.currentIndex = 0;
    this.history = this.loadHistory();
    this.audio = null;
    this.isPlaying = false;

    this.init();
  }

  loadHistory() {
    try {
      const stored = localStorage.getItem('dailySongHistory');
      return stored ? JSON.parse(stored) : [];
    } catch (e) {
      return [];
    }
  }

  saveHistory(song) {
    try {
      // Add to beginning, keep max 7 entries
      const history = [song, ...this.history.filter(s => s.date !== song.date)].slice(0, 7);
      this.history = history;
      localStorage.setItem('dailySongHistory', JSON.stringify(history));
    } catch (e) {
      console.error('Failed to save song history:', e);
    }
  }

  async init() {
    this.render('loading');

    try {
      const response = await fetch('/.netlify/functions/daily-song');
      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const song = await response.json();
      this.saveHistory(song);
      this.currentIndex = 0;
      this.render('loaded', song);
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

  togglePlay(previewUrl) {
    if (!previewUrl) return;

    if (this.isPlaying) {
      this.audio?.pause();
      this.isPlaying = false;
      this.updatePlayButton(false);
    } else {
      if (!this.audio || this.audio.src !== previewUrl) {
        if (this.audio) this.audio.pause();
        this.audio = new Audio(previewUrl);
        this.audio.addEventListener('ended', () => {
          this.isPlaying = false;
          this.updatePlayButton(false);
        });
      }
      this.audio.play();
      this.isPlaying = true;
      this.updatePlayButton(true);
    }
  }

  updatePlayButton(playing) {
    const btn = this.container.querySelector('.play-btn');
    if (!btn) return;

    btn.innerHTML = playing
      ? '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zM7 8a1 1 0 012 0v4a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v4a1 1 0 102 0V8a1 1 0 00-1-1z" clip-rule="evenodd"></path></svg>'
      : '<svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20"><path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path></svg>';
  }

  navigateHistory(direction) {
    const newIndex = this.currentIndex + direction;
    if (newIndex < 0 || newIndex >= this.history.length) return;

    this.currentIndex = newIndex;
    const song = this.history[this.currentIndex];

    // Stop playing if switching songs
    if (this.audio) {
      this.audio.pause();
      this.isPlaying = false;
    }

    this.render('loaded', song);
  }

  render(state, song = null) {
    if (state === 'loading') {
      this.container.innerHTML = `
        <div class="daily-song-card loading">
          <div class="daily-song-label">
            <span class="label-text skeleton">Loading...</span>
          </div>
          <div class="album-cover-wrapper">
            <div class="album-cover skeleton"></div>
          </div>
          <div class="song-info">
            <div class="song-title skeleton">Loading title...</div>
            <div class="song-artist skeleton">Loading artist...</div>
          </div>
        </div>
      `;
      return;
    }

    if (state === 'error') {
      this.container.innerHTML = `
        <div class="daily-song-card error">
          <div class="daily-song-label">
            <span class="label-text">Song dne</span>
          </div>
          <div class="error-message">
            <svg class="error-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"></path>
            </svg>
            <p>Nepodařilo se načíst song dne.</p>
          </div>
        </div>
      `;
      return;
    }

    if (state === 'loaded' && song) {
      const hasPreview = !!song.previewUrl;
      const canNavigateBack = this.currentIndex < this.history.length - 1;
      const canNavigateForward = this.currentIndex > 0;

      this.container.innerHTML = `
        <div class="daily-song-card">
          <div class="daily-song-header">
            <div class="daily-song-label">
              <span class="label-text">Song dne</span>
              <span class="label-separator">•</span>
              <span class="label-date">${this.formatDate(song.date)}</span>
            </div>
            ${this.history.length > 1 ? `
              <div class="history-nav">
                <button class="nav-btn ${!canNavigateBack ? 'disabled' : ''}" 
                        onclick="window.dailySongInstance?.navigateHistory(1)"
                        ${!canNavigateBack ? 'disabled' : ''}>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15 19l-7-7 7-7"></path>
                  </svg>
                </button>
                <button class="nav-btn ${!canNavigateForward ? 'disabled' : ''}"
                        onclick="window.dailySongInstance?.navigateHistory(-1)"
                        ${!canNavigateForward ? 'disabled' : ''}>
                  <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7"></path>
                  </svg>
                </button>
              </div>
            ` : ''}
          </div>

          <div class="album-cover-wrapper">
            <a href="${song.spotifyUrl}" target="_blank" rel="noopener noreferrer" class="album-cover-link">
              <img src="${song.albumCoverUrl}" alt="${song.title}" class="album-cover" loading="lazy" />
              ${hasPreview ? `
                <button class="play-btn" onclick="event.preventDefault(); event.stopPropagation(); window.dailySongInstance?.togglePlay('${song.previewUrl}')">
                  <svg class="w-6 h-6" fill="currentColor" viewBox="0 0 20 20">
                    <path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clip-rule="evenodd"></path>
                  </svg>
                </button>
              ` : ''}
            </a>
          </div>

          <div class="song-info">
            <a href="${song.spotifyUrl}" target="_blank" rel="noopener noreferrer" class="song-title-link">
              <h3 class="song-title" title="${song.title}">${this.truncate(song.title, 50)}</h3>
            </a>
            <p class="song-artist" title="${song.artists}">${this.truncate(song.artists, 60)}</p>
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
