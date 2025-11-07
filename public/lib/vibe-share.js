// public/lib/vibe-share.js
// Render 1080x1080 JPG card with vibe text and branding

/**
 * Render a vibe card as 1080x1080 JPEG
 * @param {string} vibe - Main text (quote/hláška)
 * @param {object} [opts] - Options
 * @param {string} [opts.subtitle] - Optional subtitle (e.g., "ty-vole.wtf")
 * @param {string} [opts.logoSrc] - Optional logo image URL
 * @returns {Promise<Blob>} JPEG blob
 */
export async function renderVibeCard(vibe, opts = {}) {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Wait for fonts to load (critical for Safari)
  if ('fonts' in document) {
    try {
      await document.fonts.ready;
    } catch (e) {
      console.warn('[vibe-card] Font loading skipped:', e);
    }
  }

  // Background gradient - GREEN like "Bake it" (NOT transparent/dark!)
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#9dff00'); // Lime green
  gradient.addColorStop(1, '#00e5ff'); // Cyan
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Logo in top-left corner
  if (opts.logoSrc) {
    try {
      const img = await new Promise((resolve, reject) => {
        const i = new Image();
        i.crossOrigin = 'anonymous';
        i.onload = () => resolve(i);
        i.onerror = reject;
        i.src = opts.logoSrc;
      });
      const w = 180;
      const h = (img.height / img.width) * w;
      ctx.drawImage(img, 48, 48, w, h);
    } catch (e) {
      console.warn('[vibe-card] Logo load failed, using text:', e);
      // Fallback to text logo
      ctx.fillStyle = '#000';
      ctx.font = '700 48px system-ui, -apple-system, sans-serif';
      ctx.textBaseline = 'top';
      ctx.fillText('TY VOLE .wtf', 48, 48);
    }
  } else {
    // Text logo
    ctx.fillStyle = '#000';
    ctx.font = '700 48px system-ui, -apple-system, sans-serif';
    ctx.textBaseline = 'top';
    ctx.fillText('TY VOLE .wtf', 48, 64);
  }

  // Main vibe text - wrap lines
  const maxWidth = size - 128; // padding 64px each side
  ctx.fillStyle = '#000'; // Black text on bright gradient
  ctx.font = '700 64px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';

  // Word wrapping
  const lines = [];
  const words = vibe.trim().split(/\s+/);
  let line = '';
  
  for (const word of words) {
    const testLine = line ? line + ' ' + word : word;
    const metrics = ctx.measureText(testLine);
    
    if (metrics.width <= maxWidth) {
      line = testLine;
    } else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);

  // Draw wrapped text (max 7 lines)
  let y = 360;
  const lineHeight = 84;
  
  for (const textLine of lines.slice(0, 7)) {
    ctx.fillText(textLine, 64, y);
    y += lineHeight;
  }

  // Subtitle at bottom
  const subtitle = opts.subtitle || 'ty-vole.wtf';
  ctx.font = '500 32px system-ui, -apple-system, sans-serif';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.75)';
  ctx.textBaseline = 'bottom';
  ctx.fillText(subtitle, 64, size - 64);

  // Convert to JPEG blob
  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      },
      'image/jpeg',
      0.9
    );
  });
}

/**
 * Create a short link via backend
 * @param {string} targetUrl - Full URL to shorten
 * @returns {Promise<string>} Short URL
 */
export async function createShortLink(targetUrl) {
  try {
    const response = await fetch('/.netlify/functions/shorten', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target: targetUrl })
    });

    if (!response.ok) {
      throw new Error(`Shorten failed: ${response.status}`);
    }

    const data = await response.json();
    return data.short;
  } catch (error) {
    console.error('[vibe-share] Short link error:', error);
    // Fallback to original URL if shortening fails
    return targetUrl;
  }
}

/**
 * Share vibe with image and short link
 * @param {string} vibeText - Quote text
 * @param {string} targetUrl - Full URL to share
 * @returns {Promise<void>}
 */
export async function dropToChat(vibeText, targetUrl) {
  try {
    // Create short link
    const shortUrl = await createShortLink(targetUrl);
    
    // Render card image with GREEN gradient (same as Bake it)
    const blob = await renderVibeCard(vibeText, { subtitle: 'ty-vole.wtf' });
    const file = new File([blob], 'tvl-vibe.jpg', { type: 'image/jpeg' });

    // Try Web Share API with files
    if (navigator.canShare && navigator.canShare({ files: [file] })) {
      await navigator.share({
        files: [file],
        text: vibeText,
        url: shortUrl
      });
      return;
    }

    // Fallback: download image + copy link
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'tvl-vibe.jpg';
    a.click();

    // Try to copy short link to clipboard
    try {
      await navigator.clipboard.writeText(shortUrl);
      showToast('Obrázek stažen + odkaz zkopírován 📋');
    } catch (clipError) {
      showToast('Obrázek stažen 📥');
    }
  } catch (error) {
    console.error('[vibe-share] Drop error:', error);
    showToast('Chyba při sdílení 😞');
  }
}

/**
 * Simple toast notification
 * @param {string} message
 */
function showToast(message) {
  // Check if toast container exists
  let container = document.getElementById('toast-container');
  if (!container) {
    container = document.createElement('div');
    container.id = 'toast-container';
    container.style.cssText = `
      position: fixed;
      bottom: calc(24px + var(--safe-bottom, 0px));
      left: 50%;
      transform: translateX(-50%);
      z-index: 10000;
      pointer-events: none;
    `;
    document.body.appendChild(container);
  }

  const toast = document.createElement('div');
  toast.style.cssText = `
    background: rgba(18, 18, 18, 0.95);
    color: #fff;
    padding: 14px 20px;
    border-radius: 12px;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 6px 20px rgba(0, 0, 0, 0.4);
    backdrop-filter: blur(8px);
    margin-top: 8px;
    animation: toast-in 0.3s ease;
  `;
  toast.textContent = message;

  // Add animation
  const style = document.createElement('style');
  style.textContent = `
    @keyframes toast-in {
      from { opacity: 0; transform: translateY(10px); }
      to { opacity: 1; transform: translateY(0); }
    }
  `;
  if (!document.getElementById('toast-style')) {
    style.id = 'toast-style';
    document.head.appendChild(style);
  }

  container.appendChild(toast);

  // Remove after 3 seconds
  setTimeout(() => {
    toast.style.animation = 'toast-in 0.3s ease reverse';
    setTimeout(() => toast.remove(), 300);
  }, 3000);
}
