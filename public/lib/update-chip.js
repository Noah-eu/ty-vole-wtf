// public/lib/update-chip.js
// PWA Update Detection and UI Chip

class UpdateChip {
  constructor(containerId, swUrl = '/sw.js') {
    this.container = document.getElementById(containerId);
    if (!this.container) {
      console.error(`UpdateChip: Container #${containerId} not found`);
      return;
    }

    this.swUrl = swUrl;
    this.registration = null;
    this.hasUpdate = false;
    this.updateCheckInterval = null;

    this.init();
  }

  async init() {
    if (!('serviceWorker' in navigator)) {
      console.warn('UpdateChip: Service Worker not supported');
      return;
    }

    try {
      // Register service worker
      this.registration = await navigator.serviceWorker.register(this.swUrl);
      console.log('[UpdateChip] SW registered:', this.registration);

      // Listen for updates
      this.setupUpdateDetection();

      // Check for updates periodically (every 15 seconds)
      this.updateCheckInterval = setInterval(() => {
        this.checkForUpdate();
      }, 15000);

      // Check for updates when page becomes visible
      document.addEventListener('visibilitychange', () => {
        if (!document.hidden) {
          this.checkForUpdate();
        }
      });

      // Initial check
      this.checkForUpdate();
    } catch (error) {
      console.error('[UpdateChip] SW registration failed:', error);
    }
  }

  setupUpdateDetection() {
    if (!this.registration) return;

    // Listen for waiting service worker
    if (this.registration.waiting) {
      console.log('[UpdateChip] SW already waiting');
      this.showUpdateChip();
    }

    // Listen for new service worker installing
    this.registration.addEventListener('updatefound', () => {
      console.log('[UpdateChip] Update found - new SW installing');
      const newWorker = this.registration.installing;

      if (newWorker) {
        newWorker.addEventListener('statechange', () => {
          console.log('[UpdateChip] New SW state:', newWorker.state);
          if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
            // New service worker is installed but waiting
            this.showUpdateChip();
          }
        });
      }
    });

    // Listen for controller change (after skipWaiting)
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      console.log('[UpdateChip] Controller changed - reloading');
      // Prevent multiple reloads
      if (!this.isReloading) {
        this.isReloading = true;
        window.location.reload();
      }
    });
  }

  async checkForUpdate() {
    if (!this.registration) return;

    try {
      await this.registration.update();
    } catch (error) {
      console.error('[UpdateChip] Update check failed:', error);
    }
  }

  showUpdateChip() {
    if (this.hasUpdate) return; // Already showing

    this.hasUpdate = true;
    console.log('[UpdateChip] Showing update chip');

    this.container.innerHTML = `
      <button
        id="update-chip-button"
        class="update-chip"
        aria-label="Aktualizovat aplikaci"
        title="Nová verze je k dispozici – klikni pro aktualizaci"
      >
        <span class="update-chip-icon">🔄</span>
        <span class="update-chip-text">Nová verze · Aktualizovat</span>
      </button>
    `;

    // Add click handler
    const button = document.getElementById('update-chip-button');
    if (button) {
      button.addEventListener('click', () => this.applyUpdate());
    }
  }

  applyUpdate() {
    if (!this.registration || !this.registration.waiting) {
      console.warn('[UpdateChip] No waiting service worker');
      return;
    }

    console.log('[UpdateChip] Applying update - sending SKIP_WAITING message');

    // Send message to waiting service worker to skip waiting
    this.registration.waiting.postMessage({ type: 'SKIP_WAITING' });

    // Hide the chip immediately
    this.container.innerHTML = '<div class="update-chip update-chip-updating">Aktualizuji...</div>';
  }

  destroy() {
    if (this.updateCheckInterval) {
      clearInterval(this.updateCheckInterval);
    }
  }
}

// Auto-initialize if container exists
if (typeof window !== 'undefined') {
  window.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('update-chip')) {
      window.updateChipInstance = new UpdateChip('update-chip');
    }
  });
}
