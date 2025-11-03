# Viral CTA + Share System — Testing Guide

## 🎯 Implementované funkce

### 1. **CTA Text & Microcopy**
- ✅ A/B test: Variant A ("Hoď to do chatu") vs Variant B ("Zkopírovat & sdílet")
- ✅ Lokalizace CZ/EN (auto-detekce z `navigator.language`)
- ✅ Náhodný microcopy pod CTA (10 variant pro CZ, 10 pro EN)
- ✅ Rotace microcopy po každé generaci

### 2. **Share Preview Card**
- ✅ Generování PNG karty 1200×630px
- ✅ Využití `html2canvas` (CDN)
- ✅ Gradient pozadí, logo, badge, watermark
- ✅ Download funkce
- ✅ Preload při načtení stránky

### 3. **Sdílecí Mechaniky**
- ✅ Web Share API s PNG attachment (pokud podporováno)
- ✅ Fallback modal s tlačítky:
  - WhatsApp
  - Telegram
  - Messenger
  - X/Twitter
  - Copy to clipboard
- ✅ Toast notifikace (CZ/EN)
- ✅ Clipboard API s fallback

### 4. **Event Tracking**
- ✅ `analytics.event()` interface
- ✅ Auto-detekce: Plausible / Simple Analytics / GA4
- ✅ No-op fallback pro dev
- ✅ Tracking events:
  - `cta_click` (s variant)
  - `share_success` (s method)
  - `preview_generated`
  - `download_card`
  - `copy_link`
  - `ab_test_assigned`

### 5. **Lokalizace**
- ✅ Lehký i18n systém (`lib/i18n.js`)
- ✅ CZ (default) a EN
- ✅ Auto-detekce jazyka
- ✅ Persistence v localStorage

### 6. **UI/UX**
- ✅ ButtonGroup layout
- ✅ Optimistic feedback (toast)
- ✅ CSS transitions & animations
- ✅ Focus states (a11y)
- ✅ Mobile responsive
- ✅ Hover effects s shine animation

### 7. **SEO & OG**
- ✅ Open Graph meta tagy
- ✅ Twitter Card meta tagy
- ✅ Dynamic `document.title` možnost
- ⚠️ OG image: placeholder (potřebuje statický soubor na serveru)

### 8. **A/B Test**
- ✅ Client-side 50/50 split
- ✅ Persistence v localStorage
- ✅ Dev indicator (zobrazí se na localhost)
- ✅ Force set variant pro testování

---

## 🧪 How to Test Locally

### 1. **Spuštění dev serveru**

```bash
cd /workspaces/ty-vole-wtf/public
python3 -m http.server 8080
```

Nebo použij existující dev server.

### 2. **Otevři v prohlížeči**

```
http://localhost:8080
```

### 3. **Testování A/B varianty**

**Automatické přiřazení:**
- Otevři v inkognito/private módu
- Varianta se přiřadí náhodně (50/50)
- V dev módu uvidíš indikátor v pravém horním rohu

**Ruční přepnutí:**
```javascript
// V konzoli prohlížeče:
window.abTest.cta.setVariant('A'); // "Hoď to do chatu"
window.abTest.cta.setVariant('B'); // "Zkopírovat & sdílet"
location.reload();
```

**Vymazání A/B cache:**
```javascript
localStorage.removeItem('ab_cta_variant');
location.reload();
```

### 4. **Testování Share funkce**

**Web Share API (s files):**
- ✅ **Android Chrome/Edge** - plná podpora včetně PNG attachmentu
- ✅ **iOS Safari 15+** - plná podpora
- ❌ **Desktop Chrome/Firefox** - základní share bez files
- ❌ **Desktop Safari** - bez podpory

**Fallback modal:**
- Zobrazí se automaticky když Web Share API není dostupné nebo uživatel zruší sdílení
- Testuj tlačítka: WhatsApp, Telegram, Messenger, Twitter, Copy

**Download PNG:**
- Klikni "📥 Stáhnout"
- PNG se stáhne (1200×630px)
- Otevři a zkontroluj kvalitu

### 5. **Testování Microco py**

- Klikni "Další shot 🔥"
- Pod tlačítky by se měl objevit náhodný text
- Zkontroluj různé varianty (10 možností)

### 6. **Testování Lokalizace**

**Přepnout jazyk:**
```javascript
// V konzoli:
window.i18n.setLanguage('en');
location.reload();
```

**Zkontrolovat aktuální jazyk:**
```javascript
window.i18n.getCurrentLanguage(); // 'cz' nebo 'en'
```

### 7. **Testování Analytics**

**V konzoli prohlížeče:**
```javascript
// Zkontroluj provider
console.log('Analytics provider:', window.analytics.provider);

// Zobraz queue (pokud není reálná analytika)
console.log(window._analyticsQueue);

// Manuální trigger události
window.analytics.event('test_event', { foo: 'bar' });
```

### 8. **Mobile Testing**

**Android Chrome:**
1. Otevři DevTools
2. Toggle Device Toolbar (Ctrl+Shift+M)
3. Vyber "Android" device
4. Testuj Web Share API
5. Zkontroluj touch interactions

**iOS Safari (real device):**
1. Deploy na testovací server (Netlify atd.)
2. Otevři na iPhonu
3. Testuj Web Share s PNG attachmentem
4. Add to Home Screen (PWA)

---

## 📊 Analytics Events

| Event Name | Kdy se triggeruje | Payload |
|------------|-------------------|---------|
| `ab_test_assigned` | Při načtení stránky | `{ test, variant, language }` |
| `cta_click` | Klik na hlavní CTA | `{ variant }` |
| `share_success` | Úspěšné sdílení | `{ method }` |
| `preview_generated` | Generování PNG karty | `{ type }` |
| `download_card` | Stažení PNG | - |
| `copy_link` | Kopírování linku | - |

---

## 🔧 Dev Tools & Debugging

### A/B Test Indikátor
Na `localhost` se zobrazí v pravém horním rohu:
```
A/B: Variant A
```

### Console Logs
```javascript
[Analytics] cta_click { variant: 'A' }
[Share] Card preloaded
[Share] Web Share API available: true
```

### Inspect Share Card
```javascript
// Vygeneruj kartu a zobraz v novém tabu
const dataUrl = await window.shareSystem.generateCardImage('Test text');
window.open(dataUrl);
```

---

## 🌐 Web Share API Support Matrix

| Platform | Share Dialog | Image Attachment | Fallback |
|----------|--------------|------------------|----------|
| **Android Chrome 89+** | ✅ | ✅ | N/A |
| **Android Edge** | ✅ | ✅ | N/A |
| **iOS Safari 15+** | ✅ | ✅ | N/A |
| **iOS Chrome** | ✅ | ✅ | N/A |
| **Desktop Chrome** | ✅ | ❌ | Fallback modal |
| **Desktop Firefox** | ❌ | ❌ | Fallback modal |
| **Desktop Safari** | ❌ | ❌ | Fallback modal |

**Note:** Desktop browsery typicky nepodporují Web Share API nebo neumožňují připojit soubory. V těchto případech se automaticky zobrazí fallback modal s alternativními metodami sdílení.

---

## 🚀 Production Deployment

### Před nasazením:

1. **Vytvoř statický OG image:**
   ```bash
   # Umísti do /public/icons/og-image.png (1200×630px)
   # Obsahující logo + tagline
   ```

2. **Nastav správnou doménu v OG tazích:**
   - V `index.html` nahraď `https://ty-vole.wtf/` skutečnou doménou

3. **Přidej real analytics:**
   - Plausible: `<script defer data-domain="ty-vole.wtf" src="https://plausible.io/js/script.js"></script>`
   - Nebo Simple Analytics / GA4

4. **Test na real devices:**
   - Android + iOS
   - Ověř PWA install
   - Testuj share do WhatsApp, Telegram

### Build check:
```bash
# Žádné chyby v konzoli
# Všechny assety načteny (200 status)
# ServiceWorker registrován
```

---

## 📝 Soubory změněny

```
/public/
  index.html              # Upraveno (OG tags, CTA buttons, scripts)
  lib/
    i18n.js               # NOVÝ
    analytics.js          # NOVÝ
    ab-test.js            # NOVÝ
    share.js              # NOVÝ
    share.css             # NOVÝ
/docs/
  SHARE-TESTING.md        # NOVÝ (tento soubor)
```

---

## ❓ Troubleshooting

**Share button nic nedělá:**
- Zkontroluj konzoli (možné chyby při načítání html2canvas)
- Zkus refresh stránky
- Zkontroluj, že `window.shareSystem` existuje

**PNG karta vypadá divně:**
- html2canvas má omezení s některými CSS vlastnostmi
- Gradient by měl fungovat
- Fonty musí být načteny (fallback: system fonts)

**Analytics se nereportují:**
- V dev módu (localhost) se pouze logují do konzole
- Na production zkontroluj přítomnost analytics scriptu
- Zkontroluj `window.analytics.provider`

**A/B varianta se nemění:**
- Vymaž localStorage: `localStorage.clear()`
- Nebo nastav ručně: `window.abTest.cta.setVariant('B')`

---

## 🎉 Done!

Všechny akceptační kritéria splněna. Připraveno k testování a PR.
