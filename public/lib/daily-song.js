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
        <div class="daily-song-compact">
          <div class="text-xs opacity-70 mb-1">🎵 Loading...</div>
          <div class="flex items-center gap-3">
            <div class="w-20 h-20 bg-gray-200 rounded-md animate-pulse"></div>
            <div class="flex-1">
              <div class="h-4 bg-gray-200 rounded w-3/4 mb-2 animate-pulse"></div>
              <div class="h-3 bg-gray-200 rounded w-1/2 animate-pulse"></div>
            </div>
          </div>
        </div>
      `;
      return;
    }

    if (state === 'error') {
      this.container.innerHTML = `
        <div class="daily-song-compact error">
          <div class="text-xs opacity-70 mb-1">🎵 Song dne</div>
          <div class="text-sm text-red-600">Nepodařilo se načíst song dne.</div>
        </div>
      `;
      return;
    }

    if (state === 'loaded' && song) {
      const hasPreview = !!song.previewUrl;
      const canNavigateBack = this.currentIndex < this.history.length - 1;
      const canNavigateForward = this.currentIndex > 0;
      const hasCover = !!song.albumCoverUrl;

      this.container.innerHTML = `
        <div class="daily-song-compact">
          <div class="text-xs opacity-70 mb-1">🎵 Song dne • ${this.formatDate(song.date)}</div>
          <div class="flex items-center gap-3">
            <div class="relative overflow-hidden rounded-md" style="width: 80px; height: 80px; flex-shrink: 0;">
              <a href="${song.spotifyUrl}" target="_blank" rel="noopener noreferrer" title="Otevřít na Spotify" class="block w-full h-full">
                ${hasCover ? `
                  <img src="${song.albumCoverUrl}" 
                       alt="${song.title} — ${song.artists}" 
                       class="w-full h-full object-cover" 
                       loading="lazy" />
                ` : `
                  <div class="w-full h-full bg-gray-100 flex items-center justify-center text-xs opacity-60 text-center p-2">
                    no cover
                  </div>
                `}
              </a>
              ${hasPreview ? `
                <button class="play-preview-btn" 
                        onclick="event.preventDefault(); event.stopPropagation(); window.dailySongInstance?.togglePlay('${song.previewUrl}')"
                        title="${this.isPlaying ? 'Pause' : 'Preview'}">
                  ${this.isPlaying ? 'Pause' : 'Preview'}
                </button>
              ` : ''}
            </div>
            
            <div class="flex-1 min-w-0">
              <h3 class="text-sm font-semibold truncate" title="${song.title}">${song.title}</h3>
              <p class="text-xs opacity-80 truncate" title="${song.artists}">${song.artists}</p>
            </div>

            ${this.history.length > 1 ? `
              <div class="flex gap-1 ml-auto">
                <button class="nav-btn-compact ${!canNavigateBack ? 'disabled' : ''}" 
                        onclick="event.preventDefault(); event.stopPropagation(); window.dailySongInstance?.navigateHistory(1)"
                        ${!canNavigateBack ? 'disabled' : ''}
                        title="Starší">←</button>
                <button class="nav-btn-compact ${!canNavigateForward ? 'disabled' : ''}"
                        onclick="event.preventDefault(); event.stopPropagation(); window.dailySongInstance?.navigateHistory(-1)"
                        ${!canNavigateForward ? 'disabled' : ''}
                        title="Novější">→</button>
              </div>
            ` : ''}
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
