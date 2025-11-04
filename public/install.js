// install.js - PWA Install Banner with iOS support
(() => {
  let deferredPrompt = null;
  const STORAGE_KEY = 'pwaInstallDismissed';
  const isIOS = /iphone|ipad|ipod/i.test(navigator.userAgent);
  const isStandalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true;

  // Vytvoř nenápadný banner
  const banner = document.createElement('div');
  banner.id = 'pwa-install-banner';
  banner.style.cssText = `
    position: fixed; inset: auto 1rem 1rem 1rem; z-index: 9999;
    background: #111; color: #fff; border: 1px solid #333; border-radius: 12px;
    padding: .875rem; display: none; box-shadow: 0 10px 30px rgba(0,0,0,.4);
    font: 14px/1.4 system-ui, -apple-system, Segoe UI, Roboto, Inter, Arial, sans-serif;
  `;
  banner.innerHTML = `
    <div style="display:flex; align-items:center; gap:.75rem; justify-content:space-between;">
      <div>
        <strong>Instalovat aplikaci?</strong><br/>
        <span>Přidej si ty-vole.wtf na plochu pro rychlý přístup a offline.</span>
      </div>
      <div style="display:flex; gap:.5rem;">
        <button id="pwa-install-btn" style="padding:.5rem .8rem; border-radius:10px; border:0; background:#B8FF4D; color:#000; cursor:pointer; font-weight:700;">Nainstalovat</button>
        <button id="pwa-dismiss-btn" style="padding:.5rem .8rem; border-radius:10px; border:0; background:#262626; color:#fff; cursor:pointer;">Později</button>
      </div>
    </div>
  `;
  
  function showBanner() {
    if (localStorage.getItem('pwaInstalled') === '1') return;
    if (sessionStorage.getItem(STORAGE_KEY) === '1') return;
    banner.style.display = 'block';
  }
  
  function hideBanner() {
    banner.style.display = 'none';
  }

  // Append banner when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => document.body.appendChild(banner));
  } else {
    document.body.appendChild(banner);
  }

  // Android/Chromium: beforeinstallprompt
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    if (isStandalone) return; // už nainstalováno
    deferredPrompt = e;
    console.log('[PWA Install] beforeinstallprompt event - showing banner');
    showBanner();
  });

  // iOS: není beforeinstallprompt → ukaž návod jen na iOS Safari
  if (isIOS && !isStandalone) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', () => {
        const installBtn = document.getElementById('pwa-install-btn');
        if (installBtn) installBtn.textContent = 'Jak na iOS';
        showBanner();
      });
    } else {
      const installBtn = document.getElementById('pwa-install-btn');
      if (installBtn) installBtn.textContent = 'Jak na iOS';
      showBanner();
    }
  }

  // Klik na instalovat
  document.addEventListener('click', async (ev) => {
    const id = (ev.target && ev.target.id) || '';
    
    if (id === 'pwa-install-btn') {
      if (deferredPrompt) {
        hideBanner();
        console.log('[PWA Install] Showing native prompt');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('[PWA Install] User choice:', outcome);
        deferredPrompt = null;
        
        if (outcome !== 'accepted') {
          // pokud odmítnuto, neschovávej banner navždy
          sessionStorage.setItem(STORAGE_KEY, '1');
        }
      } else if (isIOS) {
        alert('Na iOS otevři Safari, klepni na ikonu sdílení a zvol „Přidat na plochu".');
        hideBanner();
        sessionStorage.setItem(STORAGE_KEY, '1');
      }
    }
    
    if (id === 'pwa-dismiss-btn') {
      console.log('[PWA Install] Banner dismissed for this session');
      hideBanner();
      sessionStorage.setItem(STORAGE_KEY, '1');
    }
  });

  // Když je aplikace nainstalovaná
  window.addEventListener('appinstalled', () => {
    console.log('[PWA Install] App installed successfully');
    localStorage.setItem('pwaInstalled', '1');
    hideBanner();
  });
})();
