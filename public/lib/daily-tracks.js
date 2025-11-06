// public/lib/daily-tracks.js
// Daily tracks s 30s preview, 7-day browsing, localStorage cache

(function() {
  'use strict';
  
  const root = document.getElementById('daily-tracks');
  if (!root) return;
  
  const isDev = location.hostname === 'localhost' || location.hostname.endsWith('.netlify.app');
  
  let currentOffset = 0; // 0=dnes, 1=včera, ... max 6
  let activeAudio = null; // pouze jeden Audio instance současně
  const cache = JSON.parse(localStorage.getItem('dailyTracksCache') || '{}');
  
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
    
    // Fetch from API
    try {
      const url = `/.netlify/functions/daily-song?date=${date}` + (isDev ? `&ts=${Date.now()}` : '');
      const response = await fetch(url);
      
      if (!response.ok) {
        console.warn('[daily-tracks] Fetch failed:', response.status);
        root.style.display = 'none';
        return;
      }
      
      const data = await response.json();
      const picks = Array.isArray(data.picks) ? data.picks : [];
      
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
    initNavigation();
    loadDay(0);
  }
  
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
