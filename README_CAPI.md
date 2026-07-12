# Meta Conversions API (CAPI) — svetvyprav.cz

Server-side tracking pro kampaň „SV | Matematické výpravy | Prodeje | 07-2026", deduplikované s browser Pixelem.

## Co bylo přidáno

| Soubor | Účel |
|---|---|
| `api/meta-event.js` | Vercel serverless funkce — přijme event z klienta, hashuje e-mail (SHA-256), doplní IP/User-Agent/`_fbp`/`_fbc` a pošle na Meta Graph API `v21.0`. |
| `dekujeme.html` | Nová děkovací stránka. Fire `Purchase` (Pixel + CAPI) se stejným `event_id` → v Events Manageru se zobrazí jako 1 deduplikovaný event, ne 2. |
| `landing.html` | Přidán `SvCapi` helper (generuje `event_id`, čte souhlas z cookie lišty, volá `/api/meta-event`). `InitiateCheckout` teď letí z Pixelu i CAPI se stejným ID. |
| `.env` / `.env.example` | Env proměnné pro CAPI. `.env` je v `.gitignore` — **nikdy negitovat**. |

## Nasazení — co je potřeba udělat na Vercelu

1. **Vercel → Project → Settings → Environment Variables**, přidat (Production i Preview):
   - `META_PIXEL_ID` = `1541113114212456`
   - `META_CAPI_ACCESS_TOKEN` = (token z `.env`, nekopírovat nikam jinam)
   - `META_CAPI_TEST_EVENT_CODE` = `TEST66731` — **jen dokud testuješ**. Až bude vše ověřené v Events Manageru, tuhle proměnnou ve Vercelu smaž/nech prázdnou, jinak produkční eventy zůstanou označené jako testovací a nezapočtou se do kampaně.

2. **SimpleShop → nastavení formuláře → Return/Thank-you URL** (pro každý ze 3 formulářů zvlášť) nastavit na:
   - Piráti (`w0onD`) → `https://svetvyprav.cz/dekujeme?p=pirati`
   - Jednorožci (`QNzle`) → `https://svetvyprav.cz/dekujeme?p=jednorozci`
   - Balíček (`qGanN`) → `https://svetvyprav.cz/dekujeme?p=balicek`

   Pokud SimpleShop umožňuje do return URL vložit placeholdery pro ID objednávky a e-mail zákazníka (zkontroluj v jejich dokumentaci/administraci), přidej je jako `&order_id={id}&email={email}` — zlepší to Event Match Quality. Bez nich řešení funguje taky (fallback: produkt se dohledá ze session, vygeneruje se vlastní `event_id`), jen s nižším skóre shody.

   **Bez tohoto kroku se `Purchase` event vůbec neodešle** — to je jediný způsob, jak se prohlížeč po zaplacení dostane na `dekujeme.html`.

## Jak funguje deduplikace

- `InitiateCheckout`: `event_id` se vygeneruje v `landing.html` při kliknutí na produktovou záložku a pošle se **stejný** do `fbq('track', 'InitiateCheckout', ..., {eventID: id})` i do CAPI.
- `Purchase`: `event_id` se vygeneruje na `dekujeme.html` (nebo se použije `order_id` z URL, pokud ho SimpleShop pošle) a stejně tak letí do Pixelu i CAPI.
- CAPI eventy se odesílají **jen pokud uživatel udělil marketingový souhlas** v cookie liště (stejná podmínka jako u Pixelu) — kontroluje se dvakrát: v prohlížeči (`SvCapi.hasMarketingConsent`) i na serveru (`consent !== true` → 200 `{skipped:'no_consent'}`).
- Guard proti duplicitě při refreshi děkovací stránky: `sessionStorage` klíč `sv_purchase_sent_<produkt nebo order_id>`.

## Testování (před ostrým provozem)

1. Meta Events Manager → **Datasets → svetvyprav.cz → Test events**, nech otevřené.
2. Projdi flow: landing → přijmi cookies → vyber produkt (fire `InitiateCheckout`) → dokonči platbu → měl by tě přesměrovat na `dekujeme.html` (fire `Purchase`).
3. V Test events by se měly objevit oba eventy, u `Purchase` prohlížeč i server se stejným Event ID (Meta je sloučí do jednoho záznamu s poznámkou "Deduplicated").
4. Ověřeno i mimo prohlížeč: přímé volání `POST /api/meta-event` vrací `{"events_received":1}` z Graph API (potvrzeno funkčním access tokenem a pixel ID).

## Po nasazení

- Smazat `META_CAPI_TEST_EVENT_CODE` z Vercel env, jakmile test projde.
- Events Manager → Overview → zkontrolovat **Event Match Quality** pro `Purchase` (cíl 6+/10).
- Ads Manager → po pár dnech porovnat Results (nákupy) s reálnými objednávkami v adminu.

## Bezpečnost

- `META_CAPI_ACCESS_TOKEN` je jen v `.env` (negitováno) a ve Vercel env proměnných. Nikdy není v kódu ani v gitu.
- `api/meta-event.js` přijímá jen `Purchase` a `InitiateCheckout`, validuje `event_id`, limituje délku `fbclid`/`content_ids`.
