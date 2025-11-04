## Cíl
Krátké a konkrétní instrukce pro AI coding agenty, aby byli rychle produktivní v tomto repozitáři.

## Velký obrázek (architecture)
- Statická webová aplikace v `public/` (HTML + JS + CSS). Hlavní stránka: `public/index.html`.
- Serverless funkce pro překlad/chat v `netlify/functions/` a `api/` (Netlify Functions). `netlify.toml` řídí nasazení.
- Konfigurace / lexikon: `config/` a `public/config/` (např. `app.json`, `lexicon.json`).
- Klíčové knihovny a systémy jsou v `public/lib/`: `share.js`, `i18n.js`, `analytics.js`, `ab-test.js`.

Proč to tak je: projekt je navržen jako lehká PWA / static site s malými serverless endpointy pro pokročilé překlady a chat.

## Důležité integrační body
- Lokalní překládání se provádí v `public/index.html` v `translateLocal()`; pokud lokální přepis nic nevrátí, fallback je volání Netlify funkce `/.netlify/functions/translate`.
- Sdílecí logika a generování karty jsou v `public/lib/share.js` (metody: `generateCardImage`, `shareNative`, `copyLink`, `showFallbackModal`). Používá `html2canvas` z CDN.
- Globální objekty používané napříč kódem: `window.i18n`, `window.analytics`, `window.shareSystem`, `window.abTest`. Mnoho částí spoléhá na jejich existenci → při změnách preferovat "guardy" (kontrola existence) před přístupem.

## Projektové konvence a vzory
- Způsob inicializace: skripty jsou načítány s `defer`; stránka čeká na `DOMContentLoaded` nebo volá `init()` přímo v inline skriptu.
- Manipulace DOM elementů probíhá přes ID. Pokud měníš handlery, vždy zkontroluj `document.getElementById(...)` na null a použij fallbacky.
- Lokalní přepis a slovník: `config/lexicon.json` + inline regex mapy v `index.html` (`CZ2GZ_WORDS`, `GZ2CZ_WORDS`). Pokud přidáš pravidla, pořadí má význam (delší fráze dřív).
- UI identifikátory, na které se často odkazuje:
  - `#btnSheet` — tlačítko „Skibidi překladač"
  - `#sheet`, `#backdrop`, `#closeSheet` — bottom sheet
  - `#tNorm`, `#tGenz`, `#bTranslate`, `#bClear` — translator controls
  - `#quote`, `#quoteTranslated`, `#next`, `#copy`, `#shareMain`, `#downloadCard` — hlavní CTA

## Jak bezpečně dělat změny (pravidla pro AI agenty)
- Neodstraňuj nebo nepřesouvej inline `defer` skripty bez kontroly pořadí načítání — pořadí závislostí je důležité.
- Před přístupem ke `window.*` objektům vždy ověř existenci: `if (window.shareSystem) ...`.
- Při úpravách překladu preferuj úpravy v `config/lexicon.json` nebo v příslušných regex seznamech v `index.html` (delší fráze nejdřív).
- Pokud přidáváš nové UI handlery, ošetři chybové stavy (element může chybět v jiných šablonách) => guard a safe-fallback.

## Rychlé příklady (konkrétní místa k editaci)
- Chování sdílení: uprav `public/lib/share.js` — metody `share()`, `shareNative()` a `generateCardImage()`.
- Překladní pravidla: `public/index.html` — pole `CZ2GZ_WORDS`, `CZ2GZ_PHRASES`, `GZ2CZ_WORDS`.
- A/B texty a i18n: `public/lib/i18n.js` a `public/config/app.json`.

## Spuštění a debug (lokální ověření)
- Nejrychlejší: serve `public/` jako statický server a otevři v prohlížeči:
  - `cd public && python3 -m http.server 8000` — otevři `http://localhost:8000`
- Pro serverless funkce: nasazení/test pomocí Netlify CLI (`netlify dev`) je doporučené, pokud máš nainstalovaný Netlify CLI a autorizované prostředí. Pokud není dostupné, testovat frontend bez funkcí (lokální fallbacky fungují) a volat funkce na nasazeném prostředí.
- Kontrola chyb: DevTools Console — common bug: nezabezpečené `document.getElementById('...').onclick = ...` způsobí TypeError a zruší další inicializaci.

## Testovací checklist pro PR
- Otevři `http://localhost:8000` a ověř: hlavní stránka renderuje, klik `#btnSheet` otevře sheet, `#bTranslate` přeloží text, CTA tlačítka (`#shareMain`, `#downloadCard`, `#copy`) nereportují chybu v konzoli.
- Ověř chování při chybě `window.i18n` / `window.shareSystem` (měl by být graceful fallback nebo aspoň žádný crash).

## Poznámky pro agenty / co ne měnit bez souhlasu
- Nezasahuj do `netlify.toml` a do serverless funkcí bez jasného důvodu — mohou obsahovat nasazovací nastavení nebo API klíče (i když nejsou v repu).
- Nepřepisuj velké části CSS v `index.html`; preferuj drobné úpravy UI v samostatných CSS souborech.

---
Prosím o zpětnou vazbu: co dalšího bys chtěl, aby agenty věděli (specifické workflowy, CLI příkazy, nebo citlivé soubory)?
## Cíl
Krátké a konkrétní instrukce pro AI coding agenty, aby byli rychle produktivní v tomto repozitáři.

## Velký obrázek (architecture)
- Statická webová aplikace v `public/` (HTML + JS + CSS). Hlavní stránka: `public/index.html`.
- Serverless funkce pro překlad/chat v `netlify/functions/` a `api/` (Netlify Functions). `netlify.toml` řídí nasazení.
- Konfigurace / lexikon: `config/` a `public/config/` (např. `app.json`, `lexicon.json`).
- Klíčové knihovny a systémy jsou v `public/lib/`: `share.js`, `i18n.js`, `analytics.js`, `ab-test.js`.

Proč to tak je: projekt je navržen jako lehká PWA / static site s malými serverless endpointy pro pokročilé překlady a chat.

## Důležité integrační body
- Lokalní překládání se provádí v `public/index.html` v `translateLocal()`; pokud lokální přepis nic nevrátí, fallback je volání Netlify funkce `/.netlify/functions/translate`.
- Sdílecí logika a generování karty jsou v `public/lib/share.js` (metody: `generateCardImage`, `shareNative`, `copyLink`, `showFallbackModal`). Používá `html2canvas` z CDN.
- Globální objekty používané napříč kódem: `window.i18n`, `window.analytics`, `window.shareSystem`, `window.abTest`. Mnoho částí spoléhá na jejich existenci -> při změnách preferovat „guardy" (kontrola existence) před přístupem.

## Projektové konvence a vzory
- Způsob inicializace: skripty jsou načítány s `defer`; stránka čeká na `DOMContentLoaded` nebo volá `init()` přímo v inline skriptu.
- Manipulace DOM elementů probíhá přes ID. Pokud měníš handlery, vždy zkontroluj `document.getElementById(...)` na null a použij fallbacky.
- Lokalní přepis a slovník: `config/lexicon.json` + inline regex mapy v `index.html` (`CZ2GZ_WORDS`, `GZ2CZ_WORDS`). Pokud přidáš pravidla, pořadí má význam (delší fráze dřív).
- UI identifikátory, na které se často odkazuje:
  - `#btnSheet` — tlačítko „Skibidi překladač"
  - `#sheet`, `#backdrop`, `#closeSheet` — bottom sheet
  - `#tNorm`, `#tGenz`, `#bTranslate`, `#bClear` — translator controls
  - `#quote`, `#quoteTranslated`, `#next`, `#copy`, `#shareMain`, `#downloadCard` — hlavní CTA

## Jak bezpečně dělat změny (pravidla pro AI agenty)
- Neodstraňuj nebo nepřesouvej inline `defer` skripty bez kontroly pořadí načítání — pořadí závislostí je důležité.
- Před přístupem ke `window.*` objektům vždy ověř existenci: `if (window.shareSystem) ...`.
- Při úpravách překladu preferuj úpravy v `config/lexicon.json` nebo v příslušných regex seznamech v `index.html` (delší fráze nejdřív).
- Pokud přidáváš nové UI handlery, ošetři chybové stavy (element může chybět v jiných šablonách) => guard a safe-fallback.

## Rychlé příklady (konkrétní místa k editaci)
- Chování sdílení: uprav `public/lib/share.js` — metody `share()`, `shareNative()` a `generateCardImage()`.
- Překladní pravidla: `public/index.html` — pole `CZ2GZ_WORDS`, `CZ2GZ_PHRASES`, `GZ2CZ_WORDS`.
- A/B texty a i18n: `public/lib/i18n.js` a `public/config/app.json`.

## Spuštění a debug (lokální ověření)
- Nejrychlejší: serve `public/` jako statický server a otevři v prohlížeči:
  - `cd public && python3 -m http.server 8000` — otevři `http://localhost:8000`
- Pro serverless funkce: nasazení/test pomocí Netlify CLI (`netlify dev`) je doporučené, pokud máš nainstalovaný Netlify CLI a autorizované prostředí. Pokud není dostupné, testovat frontend bez funkcí (lokální fallbacky fungují) a volat funkce na nasazeném prostředí.
- Kontrola chyb: DevTools Console — common bug: nezabezpečené `document.getElementById('...').onclick = ...` způsobí TypeError a zruší další inicializaci.

## Testovací checklist pro PR
- Otevři `http://localhost:8000` a ověř: hlavní stránka renderuje, klik `#btnSheet` otevře sheet, `#bTranslate` přeloží text, CTA tlačítka (`#shareMain`, `#downloadCard`, `#copy`) nereportují chybu v konzoli.
- Ověř chování při chybě `window.i18n` / `window.shareSystem` (měl by být graceful fallback nebo aspoň žádný crash).

## Poznámky pro agenty / co ne měnit bez souhlasu
- Nezasahuj do `netlify.toml` a do serverless funkcí bez jasného důvodu — mohou obsahovat nasazovací nastavení nebo API klíče (i když nejsou v repu).
- Nepřepisuj velké části CSS v `index.html`; preferuj drobné úpravy UI v samostatných CSS souborech.

---
Prosím o zpětnou vazbu: co dalšího bys chtěl, aby agenty věděli (specifické workflowy, CLI příkazy, nebo citlivé soubory)?
