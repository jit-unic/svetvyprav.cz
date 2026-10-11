# Můj AI Chief of Staff — prototyp

Osobní aplikace: Dnes · Projekty · Úkoly · Schůzky (AI zpracování poznámek) · Rozhodnutí · AI kouč.

- Adresa po nasazení: `https://<doména>/chief-of-staff/` (skryto před vyhledávači: `noindex` + `robots.txt`).
- Frontend: `chief-of-staff/` (čisté HTML/CSS/JS, bez build kroku).
- AI: serverová funkce `api/cos-ai.js` (Claude API, model `claude-opus-5-5`).
- Data: ukládají se **jen v prohlížeči** (localStorage). Záloha = Nastavení → Stáhnout zálohu.

## Zapnutí AI (Vercel → Settings → Environment Variables)
| Proměnná | Hodnota |
|---|---|
| `ANTHROPIC_API_KEY` | API klíč z console.anthropic.com |
| `COS_APP_PASSWORD` | vlastní dlouhé heslo; stejné pak zadáš v aplikaci (Nastavení) |
| `COS_AI_MODEL` | nepovinné, výchozí `claude-opus-5-5` |

Po přidání proměnných udělej Redeploy. Bez nich aplikace běží v **ukázkovém režimu** (pravidla, jasně označeno).

## Pojistky proti vymýšlení
- AI dostává jen tvoje poznámky/data; chybějící údaje vrací jako `null` → v aplikaci „neuvedeno“.
- Každý návrh má doslovnou citaci zdroje; aplikace ověří, že citace v poznámkách opravdu je (jinak ⚠).
- Termín se převezme jen z konkrétního data v poznámkách („do pátku“ se nepřevádí).
- AI kouč smí odkazovat jen na existující ID; neexistující odkazy aplikace vyřadí a upozorní.
- Navržené úkoly a rozhodnutí se uloží až po potvrzení.

## Fáze 2 (připraveno, nepřipojeno)
Google Kalendář (dnešní schůzky), Gmail (návrhy úkolů z e-mailů), synchronizace dat mezi zařízeními + přihlášení.
