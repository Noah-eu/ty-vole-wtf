// public/lib/daily-tracks.js
// Fetch and render daily song picks

(async function initDailyTracks() {
  const root = document.getElementById('daily-tracks');
  if (!root) return;

  try {
    // Cache buster v dev/preview
    const isDev = location.hostname === 'localhost' || location.hostname.endsWith('.netlify.app');
    const url = isDev
      ? '/.netlify/functions/daily-song?debug=1&ts=' + Date.now()
      : '/.netlify/functions/daily-song';

    const response = await fetch(url);
    if (!response.ok) {
      console.error('[DailySong] Fetch failed:', response.status);
      root.style.display = 'none';
      return;
    }

    const data = await response.json();
    const picks = Array.isArray(data.picks) ? data.picks.slice(0, 3) : [];

    // Skryj sekci pokud žádné picks
    if (!picks.length) {
      root.style.display = 'none';
      console.info('[DailySong] No picks', data.debug || data.error);
      return;
    }

    // Zobraz sekci
    root.style.display = '';

    // Debug info
    if (data.debug) {
      console.info('[DailySong] Debug:', data.debug);
    }

    // Render 3 tiles (80×80)
    const container = root.querySelector('.daily-tracks-grid') || root;
    container.innerHTML = picks.map(track => `
      <a href="${track.spotifyUrl}" target="_blank" rel="noopener" class="daily-track-tile" title="${track.title} - ${track.artists}">
        <img src="${track.albumCoverUrl}" alt="${track.title}" width="80" height="80" loading="lazy" />
        <div class="daily-track-info">
          <div class="daily-track-title">${escapeHtml(track.title)}</div>
          <div class="daily-track-artists">${escapeHtml(track.artists)}</div>
        </div>
      </a>
    `).join('');

  } catch (error) {
    console.error('[DailySong] Error:', error);
    root.style.display = 'none';
  }
})();

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
