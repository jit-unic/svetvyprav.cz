# Matematické výpravy — static web (deploy-ready)

## Co to je
Kompletní statický web, 6 stránek. Žádný WordPress, žádné pluginy. Checkout řeší SimpleShop (externí odkazy).

Soubory:
- `index.html` (homepage), `pirati.html`, `jednorozci.html`, `balicek.html`, `gdpr.html`, `obchodni-podminky.html`
- `assets/` — hero obrázky

---

## ⚠️ UDĚLEJ PŘED NASAZENÍM (jinak web nevydělá)

**1) Napoj SimpleShop na nákupní tlačítka.**
Ve 3 souborech je placeholder `href="#objednat"`. Nahraď plnou SimpleShop URL:
- `pirati.html` → `#objednat` → SimpleShop odkaz na pirátskou výpravu (179 Kč)
- `jednorozci.html` → `#objednat` → jednorožčí výprava (179 Kč)
- `balicek.html` → `#objednat` → balíček obě (299 Kč)

(Homepage tlačítka vedou správně na produktové stránky — ty neřeš.)

**2) Zkontroluj obrázky.** Hero PNG jsou v `assets/`. Sedí.

**3) Cookie lišta / GDPR.** Static web = přidej jednoduchý cookie banner skript (např. Cookiebot free / vlastní), pokud sbíráš analytiku. Text GDPR už na `gdpr.html` je.

---

## DEPLOY (Cloudflare Pages — zdarma, ~15 min)

1. Založ **GitHub repo** (např. `matematicke-vypravy`), nahraj do něj obsah téhle složky.
2. **Cloudflare dashboard → Pages → Connect to Git** → vyber repo.
3. Build settings: **Framework = None**, Build command = *prázdné*, Output dir = `/`.
4. Deploy. Dostaneš `nazev.pages.dev`.
5. **Custom domain** → přidej `matika.podrouzkova.online` (nebo tvoji doménu), Cloudflare tě provede DNS.
6. HTTPS naskočí automaticky.

**Alternativy:** Netlify (drag-drop složky = hotovo), GitHub Pages, jsDelivr (znáš z premioveseno.sk).

---

## JAK UPRAVIT COPY / CENY POZDĚJI
- Otevři příslušný `.html`, najdi text, přepiš, ulož, pushni do GitHubu → Cloudflare redeployne sám.
- Nebo mi pošli soubor + co změnit — upravím za pár minut.

---

## KDYŽ BUDEŠ CHTÍT VÍC (rozhodni podle potřeby, ne teď)
- Blog / časté vizuální úpravy sama → dává smysl přejít na WordPress.
- A/B test hero → mám pro tebe 3 varianty v `hero-varianty_navrhy.html` z původního balíčku.
- Jinak: tenhle static web je pro produktový landing optimální. Neřeš over-engineering.
