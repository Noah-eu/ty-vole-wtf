// A/B Testing system for CTA variants
// 50/50 split between variant A and B

class ABTest {
  constructor(testName, variants) {
    this.testName = testName;
    this.variants = variants;
    this.storageKey = `ab_${testName}`;
    this.variant = this.getOrAssignVariant();
  }
  
  getOrAssignVariant() {
    // Check if already assigned
    const stored = localStorage.getItem(this.storageKey);
    if (stored && this.variants.includes(stored)) {
      return stored;
    }
    
    // Assign randomly (50/50)
    const variant = this.variants[Math.floor(Math.random() * this.variants.length)];
    localStorage.setItem(this.storageKey, variant);
    
    return variant;
  }
  
  getVariant() {
    return this.variant;
  }
  
  isVariant(variantName) {
    return this.variant === variantName;
  }
  
  // Force set variant (for testing)
  setVariant(variantName) {
    if (this.variants.includes(variantName)) {
      this.variant = variantName;
      localStorage.setItem(this.storageKey, variantName);
      return true;
    }
    return false;
  }
}

// Initialize CTA A/B test
// Variant A: "Drop in chat" / "Hoď to do chatu"
// Variant B: "Copy & share" / "Zkopírovat & sdílet"
const ctaTest = new ABTest('cta_variant', ['A', 'B']);

// Get appropriate CTA text based on variant and language
function getCTAText() {
  const variant = ctaTest.getVariant();
  const key = variant === 'A' ? 'cta.share' : 'cta.copyShare';
  return window.i18n.t(key);
}

// Track variant in analytics
function trackCTAVariant() {
  window.analytics.event('ab_test_assigned', {
    test: 'cta_variant',
    variant: ctaTest.getVariant(),
    language: window.i18n.getCurrentLanguage()
  });
}

// Export globally
window.abTest = {
  cta: ctaTest,
  getCTAText,
  trackCTAVariant
};

// Show dev indicator if on localhost
if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
  window.addEventListener('load', () => {
    const indicator = document.createElement('div');
    indicator.className = 'ab-indicator';
    indicator.textContent = `A/B: Variant ${ctaTest.getVariant()}`;
    indicator.title = 'A/B test variant (dev only)';
    document.body.appendChild(indicator);
  });
}
