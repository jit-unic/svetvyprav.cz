/*
 * Můj AI Chief of Staff — serverová AI funkce (Claude API).
 *
 * Klient (chief-of-staff/app.js) sem posílá:
 *   GET  → { configured: true|false }  (jestli je AI připojená)
 *   POST { mode: "meeting", notes, meeting }        → návrh shrnutí, rozhodnutí, otázek, úkolů
 *   POST { mode: "coach", question, context }       → doporučený další krok
 *
 * Env proměnné (Vercel → Settings → Environment Variables):
 *   ANTHROPIC_API_KEY   — API klíč z console.anthropic.com (tajný, nikdy do gitu)
 *   COS_APP_PASSWORD    — heslo, které zadáš v aplikaci (Nastavení). Bez něj
 *                         by AI (a tvůj kredit) mohl volat kdokoli.
 *   COS_AI_MODEL        — volitelné, výchozí claude-opus-5-5
 */

const { Anthropic } = require('@anthropic-ai/sdk');

const MODEL = process.env.COS_AI_MODEL || 'claude-opus-5-5';
const MAX_INPUT_CHARS = 60000;

const nullableString = { anyOf: [{ type: 'string' }, { type: 'null' }] };

const MEETING_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['summary', 'decisions', 'open_questions', 'tasks'],
  properties: {
    summary: { type: 'string' },
    decisions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'reason', 'source_quote'],
        properties: { text: { type: 'string' }, reason: nullableString, source_quote: { type: 'string' } },
      },
    },
    open_questions: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['text', 'source_quote'],
        properties: { text: { type: 'string' }, source_quote: { type: 'string' } },
      },
    },
    tasks: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['title', 'owner', 'due_text', 'due_date', 'priority', 'source_quote'],
        properties: {
          title: { type: 'string' },
          owner: nullableString,
          due_text: nullableString,
          due_date: nullableString,
          priority: { anyOf: [{ type: 'string', enum: ['vysoká', 'střední', 'nízká'] }, { type: 'null' }] },
          source_quote: { type: 'string' },
        },
      },
    },
  },
};

const COACH_SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['recommendation', 'why', 'first_step', 'task_ids', 'project_ids', 'decision_ids', 'goal_indexes', 'risks', 'missing_info'],
  properties: {
    recommendation: { type: 'string' },
    why: { type: 'string' },
    first_step: { type: 'string' },
    task_ids: { type: 'array', items: { type: 'string' } },
    project_ids: { type: 'array', items: { type: 'string' } },
    decision_ids: { type: 'array', items: { type: 'string' } },
    goal_indexes: { type: 'array', items: { type: 'integer' } },
    risks: { type: 'array', items: { type: 'string' } },
    missing_info: { type: 'array', items: { type: 'string' } },
  },
};

const MEETING_SYSTEM = `Jsi pečlivý asistent (chief of staff) české podnikatelky. Zpracováváš její poznámky ze schůzky.
Pravidla — dodržuj je striktně:
- Používej VÝHRADNĚ informace z poznámek. Nic si nedomýšlej: žádné termíny, lidi, čísla ani fakta, která v poznámkách nejsou.
- Každá položka musí mít "source_quote" = DOSLOVNÝ úryvek z poznámek (zkopírovaný beze změny), ze kterého vychází.
- owner: jen pokud je osoba v poznámkách výslovně uvedená u daného úkolu, jinak null.
- due_text: doslovné znění termínu z poznámek (např. "do pátku"), jinak null.
- due_date: ISO datum YYYY-MM-DD JEN pokud poznámky obsahují konkrétní kalendářní datum (např. "15. 10." nebo "15.10.2026"). Relativní výrazy ("do pátku", "příští týden") NEPŘEVÁDĚJ — due_date nech null.
- priority: jen pokud z poznámek jasně plyne (např. "urgentní", "priorita"), jinak null.
- reason u rozhodnutí: jen pokud je důvod v poznámkách, jinak null.
- summary: 2–4 věty česky, jen to, co v poznámkách skutečně je.
- Když nic z dané kategorie v poznámkách není, vrať prázdné pole.`;

const COACH_SYSTEM = `Jsi věcný AI kouč a chief of staff české podnikatelky. Pomáháš jí vybrat JEDEN nejlepší další krok.
Myslíš na výsledek, návratnost (čas/peníze/energie) a na to, aby se nezahltila.
Pravidla:
- Vycházej VÝHRADNĚ z dodaných dat (cíle, projekty, úkoly, rozhodnutí, dnešní schůzky). Nic si nevymýšlej.
- V task_ids, project_ids, decision_ids uváděj jen ID, která v datech skutečně jsou a o která se doporučení opírá. goal_indexes = pořadová čísla cílů (od 0).
- Pokud ti chybí informace pro dobré rozhodnutí, napiš je do missing_info a nedomýšlej je.
- first_step: konkrétní akce na 15–30 minut, kterou může začít hned.
- Piš česky, stručně, přímo, bez omáčky. Upozorni na riziko, pokud nějaké vidíš.`;

function checkPassword(req) {
  const expected = process.env.COS_APP_PASSWORD;
  if (!expected) return false;
  return req.headers['x-cos-key'] === expected;
}

function firstText(message) {
  const block = (message.content || []).find((b) => b.type === 'text');
  return block ? block.text : '';
}

async function callClaude(system, userContent, schema) {
  const client = new Anthropic();
  const message = await client.beta.messages.create({
    model: MODEL,
    max_tokens: 16000,
    system,
    messages: [{ role: 'user', content: userContent }],
    output_config: { effort: 'medium', format: { type: 'json_schema', schema } },
    // Když bezpečnostní filtr požadavek odmítne, API ho zkusí na záložním modelu.
    betas: ['server-side-fallback-2026-07-01'],
    fallbacks: 'default',
  });
  if (message.stop_reason === 'refusal') {
    const err = new Error('AI požadavek odmítla.');
    err.status = 422;
    throw err;
  }
  if (message.stop_reason === 'max_tokens') {
    const err = new Error('Odpověď AI byla příliš dlouhá a useknutá. Zkus kratší poznámky.');
    err.status = 422;
    throw err;
  }
  return { data: JSON.parse(firstText(message)), model: message.model };
}

module.exports = async (req, res) => {
  const configured = Boolean(process.env.ANTHROPIC_API_KEY && process.env.COS_APP_PASSWORD);

  if (req.method === 'GET') {
    return res.status(200).json({ configured, model: configured ? MODEL : null });
  }
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }
  if (!configured) {
    return res.status(503).json({ error: 'AI není nastavená (chybí ANTHROPIC_API_KEY nebo COS_APP_PASSWORD).' });
  }
  if (!checkPassword(req)) {
    return res.status(401).json({ error: 'Špatné heslo k AI. Zadej ho v Nastavení.' });
  }

  const body = req.body || {};
  try {
    if (body.mode === 'meeting') {
      const notes = String(body.notes || '').slice(0, MAX_INPUT_CHARS);
      if (!notes.trim()) return res.status(400).json({ error: 'Chybí poznámky.' });
      const meta = body.meeting || {};
      const content =
        `Schůzka: ${meta.title || 'neuvedeno'}\nDatum schůzky: ${meta.date || 'neuvedeno'}\n` +
        `Účastníci: ${meta.people || 'neuvedeno'}\n\nPoznámky:\n"""\n${notes}\n"""`;
      const out = await callClaude(MEETING_SYSTEM, content, MEETING_SCHEMA);
      return res.status(200).json(out);
    }

    if (body.mode === 'coach') {
      const context = JSON.stringify(body.context || {}).slice(0, MAX_INPUT_CHARS);
      const question = String(body.question || '').slice(0, 2000);
      const content =
        `Dnešní datum: ${body.today || 'neuvedeno'}\n\nData (JSON):\n${context}\n\n` +
        `Otázka: ${question || 'Co je teď můj nejlepší další krok?'}`;
      const out = await callClaude(COACH_SYSTEM, content, COACH_SCHEMA);
      return res.status(200).json(out);
    }

    return res.status(400).json({ error: 'Neznámý režim.' });
  } catch (e) {
    console.error('cos-ai error', e && e.message);
    const status = e.status && e.status < 500 && e.status !== 401 ? e.status : 502;
    return res.status(status).json({ error: e.status === 422 ? e.message : 'Volání AI selhalo. Zkus to znovu.' });
  }
};
