// public/lib/vibe-share.js
// Render 1080x1080 JPG card with vibe text and branding

/**
 * Render a vibe card as 1080x1080 JPEG
 * @param {string} vibe - Main text (quote/hláška)
 * @param {string} [subtitle] - Optional subtitle (e.g., "ty-vole.wtf")
 * @returns {Promise<Blob>} JPEG blob
 */
export async function renderVibeCard(vibe, subtitle) {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context not available');
  }

  // Background gradient (dark)
  const gradient = ctx.createLinearGradient(0, 0, 0, size);
  gradient.addColorStop(0, '#0B0B0F');
  gradient.addColorStop(1, '#1A1A22');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);

  // Logo "TVL" in top-left corner
  ctx.fillStyle = '#B8FF4D'; // Lime green
  ctx.font = 'bold 56px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';
  ctx.fillText('TVL', 56, 56);

  // Main vibe text - wrap lines
  const maxWidth = size - 128; // padding 64px each side
  ctx.fillStyle = '#FFFFFF';
  ctx.font = '700 68px system-ui, -apple-system, sans-serif';
  ctx.textBaseline = 'top';

  // Word wrapping
  const lines = [];
  const words = vibe.split(/\s+/);
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
  let y = 220;
  const lineHeight = 88;
  
  for (const textLine of lines.slice(0, 7)) {
    ctx.fillText(textLine, 64, y);
    y += lineHeight;
  }

  // Subtitle at bottom
  if (subtitle) {
    ctx.font = '400 40px system-ui, -apple-system, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.75)';
    ctx.textBaseline = 'bottom';
    ctx.fillText(subtitle, 64, size - 56);
  }

  // Convert to JPEG blob
  return new Promise((resolve) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          throw new Error('Failed to create blob');
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
    
    // Render card image
    const blob = await renderVibeCard(vibeText, 'ty-vole.wtf');
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
