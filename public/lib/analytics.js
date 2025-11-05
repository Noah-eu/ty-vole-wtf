// Analytics tracking for TY VOLE .wtf
// Lightweight interface with fallback for missing analytics

// Check for existing analytics (Plausible, Simple Analytics, GA4)
function detectAnalytics() {
  if (window.plausible) return 'plausible';
  if (window.sa_event) return 'simple';
  if (window.gtag) return 'ga4';
  return null;
}

const analyticsProvider = detectAnalytics();

// Event tracking function
function trackEvent(name, payload = {}) {
  // Console log in development
  if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
    console.log('[Analytics]', name, payload);
  }
  
  try {
    switch(analyticsProvider) {
      case 'plausible':
        window.plausible(name, { props: payload });
        break;
      case 'simple':
        window.sa_event(name, payload);
        break;
      case 'ga4':
        window.gtag('event', name, payload);
        break;
      default:
        // No-op fallback - store in window for potential future use
        window._analyticsQueue = window._analyticsQueue || [];
        window._analyticsQueue.push({ name, payload, timestamp: Date.now() });
        break;
    }
  } catch (e) {
    console.warn('[Analytics] Error tracking event:', e);
  }
}

// Convenience methods
const analytics = {
  event: trackEvent,
  
  ctaClick(variant) {
    trackEvent('cta_click', { variant });
  },
  
  shareSuccess(method) {
    trackEvent('share_success', { method });
  },
  
  previewGenerated(type = 'quote') {
    trackEvent('preview_generated', { type });
  },
  
  downloadCard() {
    trackEvent('download_card');
  },
  
  copyLink() {
    trackEvent('copy_link');
  }
};

// Export globally
window.analytics = analytics;

// Export provider info for debugging
window.analytics.provider = analyticsProvider;

// Global button click tracking
document.addEventListener("click", (event) => {
  const target = event.target.closest("button");
  if (!target) return;

  // Get meaningful label
  const label =
    target.id ||
    target.name ||
    target.dataset?.action ||
    target.innerText?.trim().slice(0, 50) ||
    "unknown_button";

  // Track button click with Plausible
  trackEvent("button_click", { label });
});

