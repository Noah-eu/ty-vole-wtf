// Share system for TY VOLE .wtf
// Handles Web Share API, fallbacks, and card generation

class ShareSystem {
  constructor() {
    this.canvas = null;
    this.cardImageDataUrl = null;
    this.currentQuote = '';
    this.loadHtml2Canvas();
  }
  
  // Load html2canvas from CDN
  loadHtml2Canvas() {
    if (window.html2canvas) {
      this.html2canvasReady = Promise.resolve();
      return;
    }
    
    this.html2canvasReady = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
      script.integrity = 'sha512-BNaRQnYJYiPSqHHDb58B0yaPfCu+Wgds8Gp/gU33kqBtgNS4tSPHuGibyoeqMV/TJlSKda6FXzoEyYGjTe+vXA==';
      script.crossOrigin = 'anonymous';
      script.onload = () => resolve();
      script.onerror = () => reject(new Error('Failed to load html2canvas'));
      document.head.appendChild(script);
    });
  }
  
  // Create share card HTML
  createCardElement(text, isGenZ = true) {
    const card = document.createElement('div');
    card.className = 'share-card';
    card.style.cssText = `
      position: absolute;
      left: -9999px;
      top: 0;
      width: 1200px;
      height: 630px;
      background: linear-gradient(135deg, #9dff00 0%, #00e5ff 100%);
      display: flex;
      flex-direction: column;
      justify-content: center;
      align-items: center;
      padding: 60px;
      box-sizing: border-box;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    `;
    
    // Logo in corner
    const logo = document.createElement('div');
    logo.style.cssText = `
      position: absolute;
      top: 40px;
      left: 40px;
      font-size: 32px;
      font-weight: 900;
      color: #000;
      letter-spacing: -1px;
    `;
    logo.textContent = 'TY VOLE.wtf';
    card.appendChild(logo);
    
    // Main text
    const mainText = document.createElement('div');
    mainText.style.cssText = `
      font-size: 56px;
      font-weight: 700;
      line-height: 1.3;
      color: #000;
      text-align: center;
      max-width: 1000px;
      word-wrap: break-word;
      text-shadow: 2px 2px 0 rgba(255,255,255,0.5);
    `;
    mainText.textContent = text;
    card.appendChild(mainText);
    
    // Badge
    const badge = document.createElement('div');
    badge.style.cssText = `
      position: absolute;
      top: 40px;
      right: 40px;
      background: #000;
      color: #9dff00;
      padding: 12px 24px;
      border-radius: 24px;
      font-size: 20px;
      font-weight: 700;
    `;
    badge.textContent = isGenZ ? '🔥 GEN-Z' : '💭 NORMAL';
    card.appendChild(badge);
    
    // Watermark
    const watermark = document.createElement('div');
    watermark.style.cssText = `
      position: absolute;
      bottom: 40px;
      left: 50%;
      transform: translateX(-50%);
      font-size: 18px;
      color: rgba(0,0,0,0.6);
      font-weight: 600;
    `;
    watermark.textContent = window.i18n.t('card.watermark');
    card.appendChild(watermark);
    
    return card;
  }
  
  // Generate PNG from card
  async generateCardImage(text, isGenZ = true) {
    await this.html2canvasReady;
    
    const card = this.createCardElement(text, isGenZ);
    document.body.appendChild(card);
    
    try {
      const canvas = await html2canvas(card, {
        backgroundColor: null,
        scale: 1,
        width: 1200,
        height: 630,
        logging: false
      });
      
      this.canvas = canvas;
      this.cardImageDataUrl = canvas.toDataURL('image/png');
      this.currentQuote = text;
      
      window.analytics.previewGenerated('card');
      
      return this.cardImageDataUrl;
    } finally {
      document.body.removeChild(card);
    }
  }
  
  // Download card as PNG
  async downloadCard() {
    if (!this.cardImageDataUrl) {
      await this.generateCardImage(this.currentQuote || 'No quote available');
    }
    
    const link = document.createElement('a');
    link.download = `ty-vole-wtf-${Date.now()}.png`;
    link.href = this.cardImageDataUrl;
    link.click();
    
    window.analytics.downloadCard();
    this.showToast(window.i18n.t('toast.downloaded'));
  }
  
  // Convert data URL to Blob
  dataURLtoBlob(dataURL) {
    const parts = dataURL.split(',');
    const mime = parts[0].match(/:(.*?);/)[1];
    const bstr = atob(parts[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
      u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
  }
  
  // Get clean URL without query parameters
  getCleanURL() {
    const url = new URL(window.location.href);
    // Return base URL without query string
    return url.origin + url.pathname;
  }
  
  // Web Share API
  async shareNative() {
    if (!navigator.share) {
      return false;
    }
    
    const text = this.currentQuote || document.getElementById('quote')?.textContent || 'Check this out!';
    const url = this.getCleanURL();
    const title = 'TY VOLE .wtf';
    
    const shareData = {
      title,
      text,
      url
    };
    
    // Try to include image if supported
    if (navigator.canShare && this.cardImageDataUrl) {
      try {
        const blob = this.dataURLtoBlob(this.cardImageDataUrl);
        const file = new File([blob], 'ty-vole-wtf.png', { type: 'image/png' });
        
        const testData = { ...shareData, files: [file] };
        if (navigator.canShare(testData)) {
          shareData.files = [file];
        }
      } catch (e) {
        console.warn('[Share] Cannot include image:', e);
      }
    }
    
    try {
      await navigator.share(shareData);
      window.analytics.shareSuccess('web_share');
      this.showToast(window.i18n.t('toast.shareSuccess'));
      return true;
    } catch (err) {
      if (err.name !== 'AbortError') {
        console.warn('[Share] Error:', err);
      }
      return false;
    }
  }
  
  // Fallback share methods
  shareWhatsApp() {
    const cleanURL = this.getCleanURL();
    const text = encodeURIComponent(this.currentQuote + '\n\n' + cleanURL);
    window.open(`https://wa.me/?text=${text}`, '_blank');
    window.analytics.shareSuccess('whatsapp');
  }
  
  shareTelegram() {
    const text = encodeURIComponent(this.currentQuote);
    const url = encodeURIComponent(this.getCleanURL());
    window.open(`https://t.me/share/url?url=${url}&text=${text}`, '_blank');
    window.analytics.shareSuccess('telegram');
  }
  
  shareMessenger() {
    const url = encodeURIComponent(this.getCleanURL());
    window.open(`fb-messenger://share/?link=${url}`, '_blank');
    window.analytics.shareSuccess('messenger');
  }
  
  shareTwitter() {
    const text = encodeURIComponent(this.currentQuote);
    const url = encodeURIComponent(this.getCleanURL());
    window.open(`https://twitter.com/intent/tweet?text=${text}&url=${url}`, '_blank');
    window.analytics.shareSuccess('twitter');
  }
  
  async copyLink() {
    const cleanURL = this.getCleanURL();
    try {
      await navigator.clipboard.writeText(cleanURL);
      window.analytics.copyLink();
      this.showToast(window.i18n.t('toast.copied'));
    } catch (err) {
      console.error('[Share] Copy failed:', err);
      // Fallback
      const input = document.createElement('input');
      input.value = cleanURL;
      document.body.appendChild(input);
      input.select();
      document.execCommand('copy');
      document.body.removeChild(input);
      this.showToast(window.i18n.t('toast.copied'));
    }
  }
  
  // Show fallback modal
  showFallbackModal() {
    const existing = document.getElementById('share-fallback-modal');
    if (existing) existing.remove();
    
    const modal = document.createElement('div');
    modal.id = 'share-fallback-modal';
    modal.className = 'share-modal';
    modal.innerHTML = `
      <div class="share-modal-overlay"></div>
      <div class="share-modal-content">
        <h3>${window.i18n.t('share.fallbackTitle')}</h3>
        <div class="share-buttons">
          <button class="share-btn share-whatsapp" data-method="whatsapp">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413Z"/>
            </svg>
            ${window.i18n.t('share.whatsapp')}
          </button>
          <button class="share-btn share-telegram" data-method="telegram">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="m20.665 3.717-17.73 6.837c-1.21.486-1.203 1.161-.222 1.462l4.552 1.42 10.532-6.645c.498-.303.953-.14.579.192l-8.533 7.701h-.002l.002.001-.314 4.692c.46 0 .663-.211.921-.46l2.211-2.15 4.599 3.397c.848.467 1.457.227 1.668-.785l3.019-14.228c.309-1.239-.473-1.8-1.282-1.434z"/>
            </svg>
            ${window.i18n.t('share.telegram')}
          </button>
          <button class="share-btn share-messenger" data-method="messenger">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M12 0C5.373 0 0 4.974 0 11.111c0 3.498 1.744 6.614 4.469 8.654V24l4.088-2.242c1.092.3 2.246.464 3.443.464 6.627 0 12-4.974 12-11.111C24 4.974 18.627 0 12 0zm1.191 14.963-3.055-3.26-5.963 3.26L10.732 8l3.131 3.259L19.752 8l-6.561 6.963z"/>
            </svg>
            ${window.i18n.t('share.messenger')}
          </button>
          <button class="share-btn share-twitter" data-method="twitter">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
              <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
            </svg>
            ${window.i18n.t('share.twitter')}
          </button>
          <button class="share-btn share-copy" data-method="copy">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect>
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path>
            </svg>
            ${window.i18n.t('share.copy')}
          </button>
        </div>
        <button class="share-modal-close">×</button>
      </div>
    `;
    
    document.body.appendChild(modal);
    
    // Event listeners
    modal.querySelector('.share-modal-overlay').onclick = () => modal.remove();
    modal.querySelector('.share-modal-close').onclick = () => modal.remove();
    
    modal.querySelector('[data-method="whatsapp"]').onclick = () => {
      this.shareWhatsApp();
      modal.remove();
    };
    modal.querySelector('[data-method="telegram"]').onclick = () => {
      this.shareTelegram();
      modal.remove();
    };
    modal.querySelector('[data-method="messenger"]').onclick = () => {
      this.shareMessenger();
      modal.remove();
    };
    modal.querySelector('[data-method="twitter"]').onclick = () => {
      this.shareTwitter();
      modal.remove();
    };
    modal.querySelector('[data-method="copy"]').onclick = () => {
      this.copyLink();
      modal.remove();
    };
  }
  
  // Toast notification
  showToast(message) {
    const existing = document.querySelector('.share-toast');
    if (existing) existing.remove();
    
    const toast = document.createElement('div');
    toast.className = 'share-toast';
    toast.textContent = message;
    document.body.appendChild(toast);
    
    setTimeout(() => toast.classList.add('show'), 10);
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }
  
  // Main share function
  async share(text) {
    this.currentQuote = text || document.getElementById('quote')?.textContent || '';
    
    // Generate card first
    await this.generateCardImage(this.currentQuote, window.looksGenZ ? window.looksGenZ(this.currentQuote) : true);
    
    // Try native share first
    const shared = await this.shareNative();
    
    // Show fallback if native failed
    if (!shared) {
      this.showFallbackModal();
    }
  }
}

// Initialize globally
window.shareSystem = new ShareSystem();
