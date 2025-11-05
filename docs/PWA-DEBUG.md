# PWA Install Button - Debugging Guide

## Problém
Install tlačítko "📲 Nainstalovat appku" se nezobrazuje.

## Možné příčiny

### 1. **Podmínky pro `beforeinstallprompt` event**
Chrome/Edge vyvolají `beforeinstallprompt` pouze pokud:
- ✅ Stránka běží na **HTTPS** (nebo localhost)
- ✅ Existuje **validní manifest.json** s ikonami
- ✅ Je **registrován Service Worker**
- ✅ Uživatel **není na iOS** (Safari nemá beforeinstallprompt)
- ✅ Appka **ještě není nainstalovaná**
- ✅ Uživatel **navštívil stránku aspoň 2x v průběhu 5 minut** (Chrome engagement heuristic)

### 2. **Jak debugovat (Rychle)**

#### A) Lokální test s debug módem:
```bash
cd public
python3 -m http.server 8000
# Otevři: http://localhost:8000/?debug
```

Přidej `?debug` do URL → zobrazí se "🔧 PWA Debug" tlačítko v pravém dolním rohu.

**Klikni na něj** → v Console uvidíš:
```
=== PWA Debug Info ===
Install button exists: true
Install button display: none
ServiceWorker supported: true
ServiceWorker controller: <object>
SW registration: <ServiceWorkerRegistration>
Manifest link: http://localhost:8000/manifest.webmanifest
HTTPS: false (localhost je OK)
beforeinstallprompt fired: false
```

#### B) Chrome DevTools diagnostika:
```
1. Otevři DevTools → Application tab
2. Manifest: Zkontroluj ikony (192/512/1024), purpose "maskable any"
3. Service Workers: Měl by být "active" status
4. chrome://app-install-internals → uvidíš proč install nejde
```

#### C) Console logy:
Normálně při načtení stránky uvidíš:
```javascript
[PWA] Initial state: {sw: true, https: true, installButton: true}
[PWA] Install button click handler attached
```

Když přijde `beforeinstallprompt`:
```javascript
[PWA] beforeinstallprompt event fired
[PWA] Showing install button
```

### 3. **Nejčastější důvody proč event nepřijde**

#### Na **produkci (HTTPS)**:
- **Appka už je nainstalovaná** → odinstaluj a zkus znovu
- **Nedostatek engagement** → obnovuj stránku 2-3x, klikej, počkej 30s
- **Service Worker nefunguje** → DevTools → Application → Service Workers → měl by být zelený
- **Manifest je broken** → DevTools → Application → Manifest → zkontroluj chyby

#### Na **localhost**:
- `beforeinstallprompt` **nefunguje na HTTP** (jen localhost je výjimka)
- Použij **Chrome/Edge** (ne Firefox)
- iOS Safari **nemá tento event vůbec** (použij Share → Add to Home Screen)

### 4. **Force show tlačítka (pro testování stylu)**

V console:
```javascript
document.getElementById('install-app').style.display = 'inline-flex'
```

Nebo klikni na "🔧 PWA Debug" tlačítko (když máš `?debug` v URL).

### 5. **iOS Safari workaround**

iOS nemá `beforeinstallprompt`. Řešení:
1. Detekuj iOS: `const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent)`
2. Zobraz instrukce: "Klikni Share → Add to Home Screen"
3. Nebo použij knihovnu jako [pwa-install-handler](https://www.npmjs.com/package/pwa-install-handler)

### 6. **Production checklist**

Před nasazením ověř:
```bash
# 1. Zkontroluj manifest
curl https://ty-vole.wtf/manifest.webmanifest | jq .

# 2. Zkontroluj service worker
curl -I https://ty-vole.wtf/sw.js

# 3. Zkontroluj ikony
curl -I https://ty-vole.wtf/brand/icon-1024.png
```

### 7. **Simulace engagement v Chrome**

```javascript
// DevTools → Console
// Force trigger (funguje jen pokud SW + manifest jsou OK)
window.dispatchEvent(new Event('beforeinstallprompt'))
```

**Nebo:**
```
chrome://flags/#bypass-app-banner-engagement-checks
→ Enable
→ Restart browser
```

### 8. **Quick fix: Vyčisti vše a zkus znovu**

```javascript
// DevTools → Console
// 1. Odregistruj SW
navigator.serviceWorker.getRegistrations().then(r => r.forEach(x => x.unregister()))

// 2. Vyčisti cache
caches.keys().then(k => Promise.all(k.map(c => caches.delete(c))))

// 3. Clear storage
// DevTools → Application → Clear storage → Clear site data

// 4. Zavři tab, otevři znovu
// 5. Počkaj 30s + interaguj se stránkou
```

---

## Aktuální implementace má:

✅ Debug logging v console  
✅ Race condition fix (čeká na DOM)  
✅ Debug tlačítko (`?debug` param)  
✅ Analytics tracking  
✅ iOS meta tags  

## Co zkusit teď:

1. **Otevři live site**: https://ty-vole.wtf/?debug
2. **Otevři DevTools Console**
3. **Klikni "🔧 PWA Debug"** (pravý dolní roh)
4. **Podívej se co píše v console**
5. **Nasdílej mi screenshot/output** z console

---

**Poznámka pro další vývoj:**

Pokud event opravdu nikdy nepřijde na produkci (ani po engagement), možná Chrome má blacklist nebo má problémy s ikony/manifest. Pak použij fallback:

```javascript
// Zobraz install button staticky pokud není iOS a appka není installed
if (!isIOS && !window.matchMedia('(display-mode: standalone)').matches) {
  document.getElementById('install-app').style.display = 'inline-flex';
}
```
