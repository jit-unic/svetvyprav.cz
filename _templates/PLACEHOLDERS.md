# Placeholdery v landing.template.html

Šablona vznikla z `2-trida.html` (matematika, 2. třída — refresh po sjednocení URL na
`/2-trida` a evergreen textaci, commitováno společně s touto verzí `PLACEHOLDERS.md`,
viz `git log` pro přesný commit). Struktura je rozdělená do `<!-- BLOCK: … -->` sekcí
(viz `grep -n "BLOCK:" landing.template.html`).

**Co se od předchozí verze šablony (commit a4760c9) změnilo:** přibyla sekce
sample-gallery (ukázky listů, blok `sample-gallery` — čistě obsahová, netemplatovaná,
viz sekce "Co NEJDE templatovat" níže), opraven dead-click na produktových kartách,
odstraněna sezónní "letní/prázdninová" textace a countdown na konec prázdnin (nahrazeno
evergreen variantami — hero H1/podnadpis, promo lišta, finální CTA, patička, FAQ
odpověď + nová FAQ otázka, emoční karta v sekci "problem").

Čeština skloňuje, takže některé placeholdery nesou pád přímo v názvu — dosaď rovnou
tvar v daném pádě, žádná další gramatika se v šabloně neděje.

## Obsahové placeholdery (Fáze 2 — vyplňuje Jitka)

| Placeholder | Co to je / pád | Příklad: matematika, 3. třída | Příklad: čeština, 1. třída |
|---|---|---|---|
| `{{SUBJECT}}` | předmět, 1. pád, malé písmeno | matematika | čeština |
| `{{SUBJECT_CAP}}` | předmět, 1. pád, velké písmeno (věta začíná) | Matematika | Čeština |
| `{{SUBJECT_ADJ}}` | přídavné jméno, žen. mn. č. 1. pád (shoduje se s "výpravy") | Matematické | Jazykové |
| `{{SUBJECT_ADJ_PL}}` | přídavné jméno, množné číslo (shoduje se s "úkoly") | matematické | jazykové |
| `{{SUBJECT_ADJ_SG}}` | přídavné jméno, žen. jedn. č. 1. pád (shoduje se s "výprava" v alt textu obrázku) | matematická | jazyková |
| `{{SUBJECT_ADJ_GEN_PL}}` | přídavné jméno, mn. č. 2. pád (shoduje se s "výprav" — "autorka X výprav"); stejný tvar funguje i pro "23 X úkolů" v meta description (gen. pl. přídavných jmen se v češtině neliší podle rodu) | Matematických | Jazykových |
| `{{SUBJECT_ADJ_NEUT_PL}}` | přídavné jméno, stř. mn. č. 1. pád (shoduje se s "dobrodružství" v patičce — jiný tvar než `SUBJECT_ADJ`, který je žen. mn. č.!) | Matematická | Jazyková |
| `{{SUBJECT_COLLOQ}}` | hovorové/zkrácené označení předmětu | Matika | Čeština |
| `{{SUBJECT_VERB_NOUN}}` | slovesné podstatné jméno (gerundium) | počítání | psaní / čtení |
| `{{SUBJECT_VERB}}` | infinitiv | počítat | psát / číst |
| `{{GRADE_ACC}}` | ročník, 4. pád ("pro/na X") | 3. třídu | 1. třídu |
| `{{GRADE_GEN}}` | ročník, 2. pád ("učivo X") | 3. třídy | 1. třídy |
| `{{GRADE_LOC}}` | ročník, 6. pád BEZ předložky (za "po") | třetí třídě | první třídě |
| `{{GRADE_COLLOQ}}` | hovorové označení žáků daného ročníku, mn. č. | třeťáky | prvňáčky |
| `{{NEXT_GRADE_LOC}}` | NÁSLEDUJÍCÍ ročník, 6. pád BEZ předložky (za "ve") — drž číselný formát jako u `GRADE_ACC`/`GRADE_GEN` (originál používal "3. třídě", ne "třetí třídě") | 4. třídě | 2. třídě |
| `{{NEXT_GRADE_GEN}}` | NÁSLEDUJÍCÍ ročník, 2. pád BEZ předložky (za "do" — FAQ "před postupem do X", ř. ~534) — jiný pád než `NEXT_GRADE_LOC`, nepleť si je | 4. třídy | 2. třídy |
| `{{CURRICULUM_TOPIC}}` | konkrétní učivo (ne obecné "matematika") | násobení a dělení v oboru do 100 | vyjmenovaná slova |
| `{{PAIN_OBJECT}}` | fyzický/pojmový objekt bolesti rodiče (problem sekce, ř. ~198) | sloupeček příkladů | stránka diktátů |
| `{{HERO_PAIN_OBJECT_INTRO}}` | celá úvodní věta hero sekce (ř. ~167) — potřebuje přepsat, ne jen dosadit slovo | Žádné násobilky, žádné přemlouvání, žádné slzy. | Žádné diktáty, žádné biflování, žádné slzy. |
| `{{PAIN_FEAR_PHRASE}}` | krátká fráze strachu (value-comparison, ř. ~303) | strach z násobilky | strach z diktátů |
| `{{PAIN_FEAR_INTRO}}` | celá věta strachu (final-cta, ř. ~510) | Se strachem z násobilky | Se strachem z diktátů |

**Poznámka k `{{HERO_PAIN_OBJECT_INTRO}}` a `{{PAIN_FEAR_INTRO}}`:** tohle jsou celé věty,
ne jednotlivá slova — u jiného předmětu než matematika (např. čeština) může být bolestivá
scéna úplně jiná (diktáty/čtení nahlas místo sloupečků), takže je nepiš mechanickým
dosazením do stejné věty, ale rozmysli si vlastní formulaci.

**⚠️ Zvláštní případ — nejvyšší nabízený ročník:** `{{NEXT_GRADE_LOC}}` v odstavci o
"letním zapomínání" (ř. ~214, blok `problem`) odkazuje na ročník o jeden vyšší, než je
aktuální stránka. To funguje i pro 3. třídu (odkazuje na 4. třídu) — sentiment "zapomenu
přes prázdniny a v další třídě začnu od nuly" platí bez ohledu na to, jestli 4. třídu
prodáváte. Nic tu neřeš navíc, jen dosaď správný ročník.

## Technické placeholdery (Fáze 0/3 — konfigurace stránky)

| Placeholder | Co to je | Příklad |
|---|---|---|
| `{{PAGE_URL}}` | cesta stránky pro `og:url` (bez domény, začíná `/`) | `/matematika-3-trida` |
| `{{PRODUCT_ID_PREFIX}}` | prefix pro `content_ids`/`item_id` v GTM/Meta Pixel/CAPI — musí být per stránka unikátní, jinak splynou konverze napříč ročníky/předměty do jednoho SKU | `mat3` |
| `{{SIMPLESHOP_ID_PIRATI}}` | embed ID SimpleShop formuláře pro pirátskou výpravu tohoto ročníku/předmětu — **musí se založit nový produkt v SimpleShopu, ID dodá Jitka** | (nový, zatím neexistuje) |
| `{{SIMPLESHOP_ID_JEDNOROZCI}}` | totéž pro jednorožčí výpravu | (nový) |
| `{{SIMPLESHOP_ID_BALICEK}}` | totéž pro balíček obou výprav | (nový) |

**Připomínka k novým SimpleShop formulářům:** pro každý nový formulář je potřeba znovu
proklikat Pixel/CAPI napojení (potvrzeno v konverzaci — nový formulář = nové ověření
trackingu, ne automatické převzetí ze stávajících produktů).

## Co se NEMĚNÍ napříč stránkami (záměrně)

- Piráti/jednorožci jako světy, hero obrázky (`pirati-hero.jpg`, `jednorozci-hero.jpg`) —
  Fáze 0 rozhodnutí: světy zůstávají stejné napříč ročníky i předměty.
- Ceny (299 / 449 / 598 Kč), struktura balíčku, garance 14 dní, GTM/Pixel ID (celoweb).

## Co NEJDE templatovat — obsahová práce navíc (Fáze 2 — vyplňuje Jitka)

- **Sekce sample-gallery** (blok `sample-gallery`, "Nahlédněte dovnitř výpravy") — 5
  ukázkových obrázků listů + popisky, vázané na konkrétní PDF daného předmětu/ročníku
  (u matematiky 2. třídy: sčítání, slovní úlohy, dělení, mapa pokladu, diplom). Pro
  novou stránku je potřeba nahrát nové náhledy a přepsat popisky ručně přímo v HTML —
  není to placeholder, protože se neopakuje podle vzorce.

## ⚠️ OTEVŘENÝ BOD — content_ids napříč stránkami (zatím NEVYŘEŠENO)

`content_ids`/`item_id` posílané do Pixelu/GTM/CAPI na `2-trida.html` **nejsou** teď
prefixované (posílají čisté `pirati`/`jednorozci`/`balicek`). Jitka chce, aby každá
stránka (ročník/předmět) měla vlastní konverze v Pixelu, aby šlo rozlišit, co se
prodalo odkud — to vyžaduje prefix (např. `mat2_pirati`).

Zádrhel: `dekujeme.html` je JEDNA sdílená děkovací stránka pro celý web (SimpleShop na
ni posílá po zaplacení), a pozná produkt buď z `?p=` parametru (Return URL v
SimpleShopu), nebo ze `sessionStorage` zapsané při checkoutu. Její vlastní `PRODUCTS`
objekt zná zatím jen holé klíče. Pokud se zavede prefix jen na `2-trida.html`, ale
`dekujeme.html` o něm neví, Purchase event se špatně přiřadí (spadne na fallback
`balicek`) — bez chybové hlášky, jen tiše špatná data v Pixelu.

Jitka řekla, že tohle je pravděpodobně ošetřené na straně SimpleShopu — **potřeba
ověřit před zavedením prefixu**, ne slepě předpokládat. Až se to bude řešit, počítej s:
technickým placeholderem `{{PRODUCT_ID_PREFIX}}` (viz tabulka výše), úpravou
`dekujeme.html`, aby uměla plně prefixované klíče, a přenastavením Return URL u všech
SimpleShop formulářů (u stávajících pro 2. třídu i budoucích).

## Interní JS klíče

`pirati`/`jednorozci`/`balicek` (DOM id, data-atributy, `PRODUCTS` objekt) zůstávají
stejné na každé stránce — jsou to jen interní klíče, ne to, co jde do trackingu.
