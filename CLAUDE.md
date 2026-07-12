# Matematické výpravy — projektový brief (pro Claude Code)

## Co to je
Statický produktový web (6 stránek) pro dětské matematické pracovní listy s příběhem.
Dvě varianty: **piráti** / **jednorožci**, stejná matematika, jiné dobrodružství. Cílovka: rodiče dětí ~6–9 let, ČR.

## Stack
- Čisté **HTML + CSS** (inline styly), **žádný build step**, žádný framework.
- Deploy: **Vercel** (napojený na GitHub, auto-deploy při pushi).
- Checkout: **SimpleShop render formulář** vložený přímo do detailu produktu (ne externí redirect).

## Struktura
| Soubor | Účel |
|---|---|
| `index.html` | Homepage (hero, výběr, jak to funguje, FAQ, CTA) |
| `pirati.html` | Produkt: Pirátská výprava — 179 Kč |
| `jednorozci.html` | Produkt: Jednorožčí výprava — 179 Kč |
| `balicek.html` | Produkt: obě výpravy — 299 Kč |
| `gdpr.html` | Ochrana osobních údajů |
| `obchodni-podminky.html` | Obchodní podmínky |
| `assets/` | Hero obrázky (PNG) |

## Brand tokeny (drž konzistenci)
- CTA amber `#F5A623` · text/ink `#4A2E3E` · magenta `#B8336A` · teal `#0E7A6E` · pozadí `#FFF6EC`
- Nadpisy **Baloo 2**, text **Nunito** (Google Fonts)
- Tlačítka pilulka (radius 9999px), karty radius 16px

---

## ✅ ÚKOLY K DODĚLÁNÍ (v pořadí priority)

### 1. SimpleShop render formulář (BLOKER — bez toho web nevydělá)
V `pirati.html`, `jednorozci.html`, `balicek.html` je placeholder `href="#objednat"` a kotva sekce objednávky.
→ Nahradit **embed kódem SimpleShop formuláře** (iframe/JS) v detailu produktu.
→ Kód dodá Jitka pro každý produkt zvlášť. Zasadit do sekce objednávky, ne jako externí odkaz.

### 2. OG / meta tagy (sdílení na sítích)
Do `<head>` každé stránky: `og:title`, `og:description`, `og:image` (hero), `og:url`, `twitter:card`.

### 3. Measurement
GA4 nebo **Plausible** (lehčí, GDPR-friendly) snippet do `<head>`.

**Meta Conversions API (CAPI)** — hotovo, viz [README_CAPI.md](README_CAPI.md). Zbývá jen nastavit env proměnné ve Vercelu a Return URL formulářů v SimpleShopu (popsáno tam).

### 4. Cookie banner
Lehký GDPR banner (Cookiebot free / vlastní), navázaný na měření z bodu 3.

### 5. Favicon + touch ikony
Přidat favicon (✦ / logo), `<link rel="icon">`.

### 6. QA před deployem
- [ ] Mobil: zkontrolovat, že se nic neláme (hero překryvy, gridy)
- [ ] Všechny interní odkazy fungují (.html)
- [ ] Rychlost: obrázky optimalizovat (PNG → WebP, pokud těžké)
- [ ] Formuláře se renderují a odesílají

---

## Deploy pipeline (Fáze B — až po dokončení)
```
git init && git add . && git commit -m "init"
# → GitHub repo (matematicke-vypravy)
# → Vercel: Import from GitHub, Framework: Other, Build: none, Output: /
# → Custom domain: matika.podrouzkova.online
```

## Poznámka
Pro produktový landing, co se skoro nemění, je static optimální. Neřešit WordPress/CMS, dokud nebude reálná potřeba častých vizuálních úprav.
