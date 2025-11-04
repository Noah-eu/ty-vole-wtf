// Simple i18n system for TY VOLE .wtf
// Supports CZ (default) and EN

const translations = {
  cz: {
    'cta.share': 'Drop do chatu 💀',
    'cta.copyShare': 'Drop do chatu 💀',
    'cta.download': 'Bake it 🍰',
    'cta.copyLink': 'Boomer sharing mode',
    // Random variants for button texts (Gen-Z vibes)
    'cta.share.random': [
      'Drop do chatu 💀',
      'Pošli to bestie 👻',
      'Send to bestie 🚀',
      'Hoď to do DMs 📲',
      'Sdílej nebo L 💅',
      'Share to slay 🔥',
      'Spready the tea ☕',
      'Drop the bomb 💣'
    ],
    'cta.download.random': [
      'Bake it 🍰',
      'Screenshot moment 📸',
      'Download fr fr 💾',
      'Save to gallery 🖼️',
      'Stáhni vibe 📥',
      'Get the pic 🎨',
      'Grab it now 🤌',
      'Take screenshot 🤳'
    ],
    'cta.copyLink.random': [
      'Boomer sharing mode',
      'Copy link (old school) 🔗',
      'Zkopíruj URL 🗿',
      'Klasika - copy link 👴',
      'Link mode activated 🦖',
      'Copy paste gang 📋',
      'Manual share lol 🤓',
      'Old but gold 💎'
    ],
    'toast.copied': 'Zkopírováno — běž to poslat 🔥',
    'toast.downloaded': 'Baked! 📥',
    'toast.shareSuccess': 'Dropped! 🎉',
    'microcopy.random': [
      'Tohle ukončí přátelství.',
      'Posílej s rozvahou.',
      '🔥 Brutál.',
      'Kámoš to nepřežije.',
      'Riziko: mega cringe.',
      'No cap, tohle je fire.',
      'Based vibes only.',
      'Send it, nebo to někdo udělá za tebe.',
      'Skill issue? Share issue.',
      'Peak content moment.'
    ],
    'share.whatsapp': 'WhatsApp',
    'share.telegram': 'Telegram',
    'share.messenger': 'Messenger',
    'share.twitter': 'X / Twitter',
    'share.copy': 'Kopírovat',
    'share.fallbackTitle': 'Sdílet přes:',
    'card.watermark': 'TY VOLE .wtf — instant vibe generator'
  },
  en: {
    'cta.share': 'Drop to chat 💀',
    'cta.copyShare': 'Drop to chat 💀',
    'cta.download': 'Bake it 🍰',
    'cta.copyLink': 'Boomer sharing mode',
    // Random variants for button texts (Gen-Z vibes)
    'cta.share.random': [
      'Drop to chat 💀',
      'Send to bestie 👻',
      'Share the vibe 🚀',
      'Hit the DMs 📲',
      'Share or L 💅',
      'Share to slay 🔥',
      'Spill the tea ☕',
      'Drop the bomb 💣'
    ],
    'cta.download.random': [
      'Bake it 🍰',
      'Screenshot moment 📸',
      'Download fr fr 💾',
      'Save to gallery 🖼️',
      'Get the vibe 📥',
      'Grab the pic 🎨',
      'Snag it now 🤌',
      'Take screenshot 🤳'
    ],
    'cta.copyLink.random': [
      'Boomer sharing mode',
      'Copy link (old school) 🔗',
      'Copy URL 🗿',
      'Classic copy link 👴',
      'Link mode activated 🦖',
      'Copy paste gang 📋',
      'Manual share lol 🤓',
      'Old but gold 💎'
    ],
    'toast.copied': 'Copied — go roast someone 🔥',
    'toast.downloaded': 'Baked! 📥',
    'toast.shareSuccess': 'Dropped! 🎉',
    'microcopy.random': [
      'This one ends friendships.',
      'Send responsibly.',
      '🔥 Spicy.',
      'Your friend won\'t survive this.',
      'Risk level: mega cringe.',
      'No cap, this is fire.',
      'Based vibes only.',
      'Send it, or someone else will.',
      'Skill issue? Share issue.',
      'Peak content moment.'
    ],
    'share.whatsapp': 'WhatsApp',
    'share.telegram': 'Telegram',
    'share.messenger': 'Messenger',
    'share.twitter': 'X / Twitter',
    'share.copy': 'Copy',
    'share.fallbackTitle': 'Share via:',
    'card.watermark': 'TY VOLE .wtf — instant vibe generator'
  }
};

// Detect language from navigator or localStorage
function detectLanguage() {
  const stored = localStorage.getItem('lang');
  if (stored && translations[stored]) return stored;
  
  const nav = navigator.language || navigator.userLanguage || 'cz';
  const lang = nav.toLowerCase().startsWith('cs') || nav.toLowerCase().startsWith('cz') ? 'cz' : 'en';
  
  localStorage.setItem('lang', lang);
  return lang;
}

let currentLang = detectLanguage();

// Translation function
function t(key) {
  const keys = key.split('.');
  let value = translations[currentLang];
  
  for (const k of keys) {
    if (value && typeof value === 'object') {
      value = value[k];
    } else {
      break;
    }
  }
  
  // Fallback to CZ if not found
  if (!value && currentLang !== 'cz') {
    value = translations.cz;
    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        break;
      }
    }
  }
  
  return value || key;
}

// Get random microcopy
function getRandomMicrocopy() {
  const options = t('microcopy.random');
  return options[Math.floor(Math.random() * options.length)];
}

// Get random button text (Gen-Z variants)
function getRandomButtonText(buttonType) {
  const key = `cta.${buttonType}.random`;
  const options = t(key);
  if (Array.isArray(options)) {
    return options[Math.floor(Math.random() * options.length)];
  }
  // Fallback to static text
  return t(`cta.${buttonType}`);
}

// Switch language
function setLanguage(lang) {
  if (translations[lang]) {
    currentLang = lang;
    localStorage.setItem('lang', lang);
    return true;
  }
  return false;
}

function getCurrentLanguage() {
  return currentLang;
}

// Export for use in other scripts
window.i18n = {
  t,
  getRandomMicrocopy,
  getRandomButtonText,
  setLanguage,
  getCurrentLanguage
};
