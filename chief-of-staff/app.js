/*
 * Můj AI Chief of Staff — prototyp.
 * Čisté JS bez frameworku. Data se ukládají do prohlížeče (localStorage).
 * AI běží přes /api/cos-ai (Claude). Když není připojená, aplikace použije
 * jednoduchá pravidla a výstupy jasně označí jako UKÁZKU.
 */
(function () {
  'use strict';

  const STORE_KEY = 'cos-data-v1';
  const PW_KEY = 'cos-ai-key';
  const PRIORITIES = ['vysoká', 'střední', 'nízká'];
  const TASK_STATUSES = ['k udělání', 'rozpracováno', 'čeká na někoho', 'hotovo'];
  const PROJECT_STATUSES = ['aktivní', 'pozastaveno', 'hotovo'];
  const NA = '<span class="missing">neuvedeno</span>';

  // ---------- Pomocné funkce ----------
  const $ = (sel, root = document) => root.querySelector(sel);
  const uid = (p) => p + '_' + Math.random().toString(36).slice(2, 9);
  const esc = (s) => String(s == null ? '' : s)
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');

  function isoDate(d) {
    const z = (n) => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + z(d.getMonth() + 1) + '-' + z(d.getDate());
  }
  const today = () => isoDate(new Date());
  function addDays(iso, n) {
    const [y, m, d] = iso.split('-').map(Number);
    return isoDate(new Date(y, m - 1, d + n));
  }
  function daysBetween(a, b) {
    const pa = a.split('-').map(Number), pb = b.split('-').map(Number);
    return Math.round((new Date(pb[0], pb[1] - 1, pb[2]) - new Date(pa[0], pa[1] - 1, pa[2])) / 86400000);
  }
  function fmtDate(iso, withWeekday = true) {
    if (!iso) return null;
    const [y, m, d] = iso.split('-').map(Number);
    const dt = new Date(y, m - 1, d);
    const wd = ['ne', 'po', 'út', 'st', 'čt', 'pá', 'so'][dt.getDay()];
    const yr = y !== new Date().getFullYear() ? ' ' + y : '';
    return (withWeekday ? wd + ' ' : '') + d + '. ' + m + '.' + yr;
  }
  function relDue(iso) {
    if (!iso) return null;
    const diff = daysBetween(today(), iso);
    if (diff === 0) return 'dnes';
    if (diff === 1) return 'zítra';
    if (diff === -1) return 'včera';
    if (diff < 0) return 'před ' + (-diff) + ' dny';
    if (diff < 7) return 'za ' + diff + ' dní';
    return fmtDate(iso);
  }
  const norm = (s) => String(s || '').toLowerCase().replace(/[\s ]+/g, ' ').replace(/[„“"”]/g, '"').trim();

  function toast(msg) {
    const el = $('#toast');
    el.textContent = msg;
    el.classList.add('show');
    clearTimeout(toast._t);
    toast._t = setTimeout(() => el.classList.remove('show'), 2600);
  }

  // ---------- Ukázková data ----------
  function sampleData() {
    const t = today();
    const p1 = 'p_eshop', p2 = 'p_agentura', p3 = 'p_kurz', p4 = 'p_procesy';
    const m1 = 'm_sample1';
    return {
      version: 1,
      isSample: true,
      goals: [
        'Zvýšit ziskovost e-shopu (marže, ne jen obrat)',
        'Získat 3 nové klienty agentury do konce roku',
        'Spustit první digitální produkt (kurz / e-book)',
        'Nastavit procesy, aby firma běžela i beze mě',
      ],
      projects: [
        { id: p1, name: 'E-shop: ziskovost Q4', goal: 'Zvýšit marži e-shopu a snížit PNO kampaní', status: 'aktivní', deadline: addDays(t, 40) },
        { id: p2, name: 'Agentura: noví klienti', goal: 'Naplnit obchodní pipeline a uzavřít nové zakázky', status: 'aktivní', deadline: addDays(t, 75) },
        { id: p3, name: 'Online kurz — Shoptet pro začátečníky', goal: 'Připravit a spustit první placený kurz', status: 'aktivní', deadline: null },
        { id: p4, name: 'Procesy a role ve firmě', goal: 'Sepsat klíčové procesy a předat opakovanou práci', status: 'pozastaveno', deadline: null },
      ],
      tasks: [
        { id: 't1', title: 'Zkontrolovat PNO kampaní za září a vypnout ztrátové sestavy', projectId: p1, priority: 'vysoká', due: addDays(t, -2), status: 'k udělání' },
        { id: 't2', title: 'Spočítat marži u TOP 10 produktů', projectId: p1, priority: 'vysoká', due: t, status: 'rozpracováno' },
        { id: 't3', title: 'Připravit nabídku pro poptávku z webu', projectId: p2, priority: 'vysoká', due: addDays(t, -1), status: 'k udělání' },
        { id: 't4', title: 'Napsat follow-up e-mail po úvodní schůzce', projectId: p2, priority: 'střední', due: addDays(t, 1), status: 'k udělání' },
        { id: 't5', title: 'Sepsat osnovu kurzu (moduly a lekce)', projectId: p3, priority: 'střední', due: addDays(t, 6), status: 'k udělání' },
        { id: 't6', title: 'Vybrat platformu pro kurz', projectId: p3, priority: 'nízká', due: null, status: 'čeká na někoho' },
        { id: 't7', title: 'Sepsat proces vyřízení objednávky (krok za krokem)', projectId: p4, priority: 'střední', due: null, status: 'k udělání' },
        { id: 't8', title: 'Vyfakturovat zářijové služby', projectId: null, priority: 'vysoká', due: addDays(t, -4), status: 'k udělání' },
        { id: 't9', title: 'Nahrát nové produktové fotky na e-shop', projectId: p1, priority: 'nízká', due: addDays(t, -10), status: 'hotovo' },
      ],
      meetings: [
        { id: m1, title: 'Porada marketing — e-shop', date: t, time: '10:00', people: 'marketing, já', notes:
          'Kampaně: PNO v září vyšlo nad cílem.\nRozhodli jsme, že pozastavíme kampaň na příslušenství, protože je dlouhodobě ztrátová.\nMarketing připraví nové kreativy na hlavní produkty do 20. 10.\nMusím schválit rozpočet na listopad.\nOtázka: vyplatí se Black Friday sleva 20 %, nebo jen doprava zdarma?\nZjistit, zda Shoptet umí množstevní slevy bez doplňku.',
          analysis: null },
        { id: 'm_sample2', title: 'Úvodní call s potenciálním klientem', date: t, time: '14:30', people: 'neuvedeno', notes: '', analysis: null },
        { id: 'm_sample3', title: 'Týdenní plánování', date: addDays(t, 1), time: '08:30', people: 'já', notes: '', analysis: null },
      ],
      decisions: [
        { id: 'd1', what: 'Nezvyšovat rozpočet Meta Ads, dokud PNO není pod cílem', why: 'Škálování ztrátových kampaní by zvýšilo ztrátu', date: addDays(t, -20), revisit: addDays(t, -1), projectId: p1, source: null },
        { id: 'd2', what: 'Procesy řešit až po Black Friday', why: 'Do konce listopadu má prioritu obrat a cashflow', date: addDays(t, -12), revisit: addDays(t, 50), projectId: p4, source: null },
      ],
      todayPicks: { date: t, ids: ['t1', 't3'] },
      lastCoach: null,
    };
  }

  function emptyData() {
    return { version: 1, isSample: false, goals: [], projects: [], tasks: [], meetings: [], decisions: [], todayPicks: { date: today(), ids: [] }, lastCoach: null };
  }

  // ---------- Stav ----------
  let state;
  function load() {
    try {
      const raw = localStorage.getItem(STORE_KEY);
      state = raw ? JSON.parse(raw) : sampleData();
    } catch (e) {
      state = sampleData();
    }
    if (!state.todayPicks || state.todayPicks.date !== today()) state.todayPicks = { date: today(), ids: [] };
  }
  function save() {
    try { localStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch (e) { toast('Uložení se nepovedlo (plné úložiště prohlížeče?)'); }
  }
  const getPassword = () => { try { return localStorage.getItem(PW_KEY) || ''; } catch (e) { return ''; } };

  const projectById = (id) => state.projects.find((p) => p.id === id);
  const taskById = (id) => state.tasks.find((t) => t.id === id);
  const meetingById = (id) => state.meetings.find((m) => m.id === id);
  const openTasks = () => state.tasks.filter((t) => t.status !== 'hotovo');
  const isOverdue = (t) => t.status !== 'hotovo' && t.due && t.due < today();

  // ---------- AI připojení ----------
  const ai = { configured: null, model: null, reachable: null };
  async function checkAI() {
    try {
      const r = await fetch('/api/cos-ai', { method: 'GET' });
      if (!r.ok) throw new Error('status ' + r.status);
      const j = await r.json();
      ai.reachable = true; ai.configured = !!j.configured; ai.model = j.model;
    } catch (e) {
      ai.reachable = false; ai.configured = false;
    }
    renderAIStatus();
  }
  const aiReady = () => ai.configured && !!getPassword();
  function renderAIStatus() {
    const el = $('#aiStatus');
    if (!el) return;
    el.innerHTML = aiReady()
      ? '<span class="badge b-ai">● AI připojená</span>'
      : '<span class="badge b-demo">● Ukázkový režim (bez AI)</span>';
  }
  async function callAI(payload) {
    const r = await fetch('/api/cos-ai', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-cos-key': getPassword() },
      body: JSON.stringify(payload),
    });
    let j = {};
    try { j = await r.json(); } catch (e) { /* prázdná odpověď */ }
    if (!r.ok) throw new Error(j.error || 'AI odpověděla chybou ' + r.status);
    return j;
  }

  // ---------- Pravidla pro priority (bez AI) ----------
  function scoreTask(t) {
    const reasons = [];
    let s = 0;
    const td = today();
    if (t.due) {
      const diff = daysBetween(td, t.due);
      if (diff < 0) { s += 100 + Math.min(-diff, 14) * 2; reasons.push('je ' + (-diff) + ' ' + (-diff === 1 ? 'den' : 'dní') + ' po termínu'); }
      else if (diff === 0) { s += 60; reasons.push('termín je dnes'); }
      else if (diff <= 3) { s += 30; reasons.push('termín je ' + relDue(t.due)); }
    }
    if (t.priority === 'vysoká') { s += 40; reasons.push('má vysokou prioritu'); }
    else if (t.priority === 'střední') s += 20;
    if (t.status === 'rozpracováno') { s += 10; reasons.push('je rozpracovaný'); }
    if (t.status === 'čeká na někoho') { s -= 60; }
    const p = projectById(t.projectId);
    if (p) {
      if (p.status === 'pozastaveno') s -= 25;
      if (p.status === 'aktivní' && p.deadline && daysBetween(td, p.deadline) <= 14) { s += 15; reasons.push('projekt „' + p.name + '“ má blízký termín'); }
    }
    return { score: s, reasons };
  }
  function rankedOpen() {
    return openTasks().map((t) => ({ t, ...scoreTask(t) })).sort((a, b) => b.score - a.score);
  }
  function todayPriorities() {
    const picked = state.todayPicks.ids.map(taskById).filter((t) => t && t.status !== 'hotovo');
    const suggested = [];
    if (picked.length < 3) {
      for (const r of rankedOpen()) {
        if (picked.length + suggested.length >= 3) break;
        if (!picked.includes(r.t) && r.t.status !== 'čeká na někoho') suggested.push(r.t);
      }
    }
    return { picked, suggested };
  }

  // ---------- Šablony ----------
  function prioBadge(p) {
    if (!p) return '<span class="badge">priorita: ' + NA + '</span>';
    const cls = p === 'vysoká' ? 'b-high' : p === 'střední' ? 'b-mid' : 'b-low';
    return '<span class="badge ' + cls + '">' + esc(p) + '</span>';
  }
  function dueBadge(t) {
    if (!t.due) return '<span class="small muted">termín: ' + NA + '</span>';
    if (isOverdue(t)) return '<span class="badge b-overdue">po termínu · ' + esc(fmtDate(t.due)) + '</span>';
    return '<span class="small">📅 ' + esc(relDue(t.due)) + '</span>';
  }
  function taskRow(t, opts = {}) {
    const p = projectById(t.projectId);
    const done = t.status === 'hotovo';
    const starred = state.todayPicks.ids.includes(t.id);
    const src = t.source && meetingById(t.source.meetingId)
      ? '<span class="small muted">· ze schůzky „' + esc(meetingById(t.source.meetingId).title) + '“</span>' : '';
    return '<li class="task' + (done ? ' done' : '') + '">' +
      '<button class="task-check" data-act="toggle-task" data-id="' + t.id + '" aria-label="' + (done ? 'Vrátit mezi otevřené' : 'Označit jako hotové') + '">' + (done ? '✓' : '') + '</button>' +
      '<div class="task-body">' +
        '<div class="task-title">' + esc(t.title) + '</div>' +
        '<div class="task-meta">' +
          (opts.hideProject ? '' : (p ? '<span class="badge b-accent">' + esc(p.name) + '</span>' : '<span class="badge">bez projektu</span>')) +
          prioBadge(t.priority) + dueBadge(t) +
          (t.status !== 'k udělání' && !done ? '<span class="badge">' + esc(t.status) + '</span>' : '') +
          (opts.suggested ? '<span class="badge b-demo">navrženo pravidlem</span>' : '') + src +
        '</div>' +
        (opts.reason ? '<div class="small muted" style="margin-top:4px">Proč: ' + esc(opts.reason) + '</div>' : '') +
      '</div>' +
      '<div class="task-actions">' +
        (done ? '' : '<button class="btn-ghost btn star' + (starred ? ' on' : '') + '" data-act="star-task" data-id="' + t.id + '" title="' + (starred ? 'Odebrat z priorit dne' : 'Přidat do 3 priorit dne') + '" aria-label="Priorita dne">★</button>') +
        '<button class="btn-ghost btn" data-act="edit-task" data-id="' + t.id + '" title="Upravit" aria-label="Upravit úkol">✎</button>' +
      '</div></li>';
  }
  const sampleBanner = () => state.isSample
    ? '<div class="banner banner-warn">Prohlížíš <b>ukázková data</b>. Až budeš chtít začít naostro, smaž je v <a href="#nastaveni">Nastavení</a>.</div>' : '';
  const demoBanner = (what) =>
    '<div class="banner banner-demo"><b>UKÁZKA — AI není připojená.</b> ' + what + ' Výstup vznikl jednoduchými pravidly (klíčová slova), ne umělou inteligencí. Jak AI připojit: <a href="#nastaveni">Nastavení</a>.</div>';
  const aiBanner = (model) =>
    '<div class="banner banner-ai"><b>Návrh AI</b>' + (model ? ' (' + esc(model) + ')' : '') + ' — vychází jen z tvých dat, ale před uložením ho zkontroluj.</div>';

  // ---------- Router ----------
  const ui = { taskStatus: 'otevřené', taskProject: 'all', taskSort: 'priorita' };
  function route() {
    const hash = (location.hash || '#dnes').slice(1);
    const [page, arg] = hash.split('/');
    document.querySelectorAll('.nav a').forEach((a) => a.classList.toggle('active', a.dataset.route === page));
    const view = $('#view');
    const pages = { dnes: renderToday, projekty: renderProjects, ukoly: renderTasks, schuzky: renderMeetings, rozhodnuti: renderDecisions, kouc: renderCoach, nastaveni: renderSettings };
    (pages[page] || renderToday)(view, arg ? decodeURIComponent(arg) : null);
  }
  function rerender() { route(); }

  // ---------- DNES ----------
  function greeting() {
    const h = new Date().getHours();
    return h < 10 ? 'Dobré ráno' : h < 18 ? 'Dobrý den' : 'Dobrý večer';
  }
  function renderToday(view) {
    const td = today();
    const { picked, suggested } = todayPriorities();
    const meetingsToday = state.meetings.filter((m) => m.date === td).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
    const overdue = openTasks().filter(isOverdue).sort((a, b) => a.due.localeCompare(b.due));
    const ranked = rankedOpen().filter((r) => r.t.status !== 'čeká na někoho');
    const next = ranked[0];
    const revisit = state.decisions.filter((d) => d.revisit && d.revisit <= td && !d.revisited);

    const reasonFor = (t) => scoreTask(t).reasons.join(', ');
    view.innerHTML =
      '<div class="page-head"><div><h1>' + greeting() + '</h1><p class="muted">' + esc(fmtDate(td)) + ' · ' +
        openTasks().length + ' otevřených úkolů · ' + overdue.length + ' po termínu</p></div>' +
        '<button class="btn btn-primary" data-act="new-task">+ Nový úkol</button></div>' +
      sampleBanner() +
      '<section class="card next-step">' +
        '<div class="row-between"><h2 style="margin:0">Doporučený další krok</h2><span class="badge b-demo">pravidla, ne AI</span></div>' +
        (next
          ? '<div class="big">' + esc(next.t.title) + '</div>' +
            '<p class="small muted"><b>Proč:</b> ' + esc(next.reasons.join(', ') || 'nejvyšší skóre mezi otevřenými úkoly') + '.</p>' +
            '<p class="small muted"><b>Zdroj:</b> úkol' + (projectById(next.t.projectId) ? ' v projektu „' + esc(projectById(next.t.projectId).name) + '“' : ' bez projektu') +
            ' · priorita ' + esc(next.t.priority || 'neuvedena') + ' · termín ' + (next.t.due ? esc(fmtDate(next.t.due)) : 'neuveden') + '</p>' +
            '<div class="row" style="margin-top:10px"><button class="btn btn-primary btn-sm" data-act="toggle-task" data-id="' + next.t.id + '">✓ Hotovo</button>' +
            '<button class="btn btn-sm" data-act="edit-task" data-id="' + next.t.id + '">Upravit</button>' +
            '<a class="btn btn-sm" href="#kouc">Probrat s AI koučem →</a></div>'
          : '<p class="muted">Nemáš žádné otevřené úkoly. 🎉</p>') +
      '</section>' +
      '<div class="grid grid-2" style="margin-top:16px">' +
        '<section class="card"><div class="row-between"><h2 style="margin:0">3 hlavní priority dne</h2><span class="small muted">★ = potvrzeno tebou</span></div>' +
          (picked.length + suggested.length
            ? '<ul class="list">' + picked.map((t) => taskRow(t)).join('') +
              suggested.map((t) => taskRow(t, { suggested: true, reason: reasonFor(t) })).join('') + '</ul>' +
              (suggested.length ? '<p class="small muted" style="margin-top:8px">Navržené položky potvrdíš hvězdičkou ★.</p>' : '')
            : '<div class="empty">Žádné otevřené úkoly.</div>') +
        '</section>' +
        '<section class="card"><div class="row-between"><h2 style="margin:0">Dnešní schůzky</h2><a class="btn btn-sm" href="#schuzky/nova">+ Přidat</a></div>' +
          (meetingsToday.length
            ? meetingsToday.map((m) =>
                '<div class="meeting-item"><div class="time-pill">' + (m.time ? esc(m.time) : '—') + '</div><div style="flex:1;min-width:0">' +
                '<div style="font-weight:600">' + esc(m.title) + '</div>' +
                '<div class="small muted">Účastníci: ' + (m.people && m.people !== 'neuvedeno' ? esc(m.people) : NA) + '</div>' +
                '<a class="small" href="#schuzky/' + m.id + '">' + (m.notes ? (m.analysis ? 'Zobrazit zpracování' : 'Zpracovat poznámky →') : 'Vložit poznámky →') + '</a></div></div>').join('')
            : '<div class="empty">Dnes nemáš žádné schůzky.</div>') +
          '<p class="small muted" style="margin-top:8px">Kalendář zatím není připojený — schůzky přidáváš ručně (připojení je v plánu jako fáze 2).</p>' +
        '</section>' +
      '</div>' +
      '<section class="card" style="margin-top:16px"><div class="row-between"><h2 style="margin:0">Po termínu</h2><span class="badge ' + (overdue.length ? 'b-high' : 'b-ok') + '">' + overdue.length + '</span></div>' +
        (overdue.length ? '<ul class="list">' + overdue.map((t) => taskRow(t)).join('') + '</ul>' : '<div class="empty">Nic po termínu. Skvělé.</div>') +
      '</section>' +
      (revisit.length
        ? '<section class="card" style="margin-top:16px"><h2>Rozhodnutí k revizi</h2>' +
          revisit.map((d) => '<p>⚑ <b>' + esc(d.what) + '</b> <span class="small muted">— revize ' + esc(fmtDate(d.revisit)) + '</span></p>').join('') +
          '<a class="small" href="#rozhodnuti">Otevřít rozhodnutí →</a></section>'
        : '');
  }

  // ---------- PROJEKTY ----------
  function projectStats(p) {
    const ts = state.tasks.filter((t) => t.projectId === p.id);
    const done = ts.filter((t) => t.status === 'hotovo').length;
    return { total: ts.length, done, overdue: ts.filter(isOverdue).length, pct: ts.length ? Math.round((done / ts.length) * 100) : 0 };
  }
  function statusBadge(s) {
    const cls = s === 'aktivní' ? 'b-accent' : s === 'hotovo' ? 'b-ok' : 'b-low';
    return '<span class="badge ' + cls + '">' + esc(s) + '</span>';
  }
  function renderProjects(view, id) {
    if (id) return renderProjectDetail(view, id);
    const order = { aktivní: 0, pozastaveno: 1, hotovo: 2 };
    const list = [...state.projects].sort((a, b) => order[a.status] - order[b.status] || (a.deadline || '9').localeCompare(b.deadline || '9'));
    view.innerHTML =
      '<div class="page-head"><div><h1>Projekty</h1><p class="muted">Cíl, stav, termín a úkoly na jednom místě.</p></div>' +
      '<button class="btn btn-primary" data-act="new-project">+ Nový projekt</button></div>' + sampleBanner() +
      (list.length
        ? '<div class="grid grid-2">' + list.map((p) => {
            const s = projectStats(p);
            return '<article class="card project-card" data-act="open-project" data-id="' + p.id + '" tabindex="0">' +
              '<div class="row-between"><h3 style="margin:0">' + esc(p.name) + '</h3>' + statusBadge(p.status) + '</div>' +
              '<p class="small muted" style="margin-top:6px"><b>Cíl:</b> ' + (p.goal ? esc(p.goal) : NA) + '</p>' +
              '<div class="progress"><span style="width:' + s.pct + '%"></span></div>' +
              '<div class="row-between small muted"><span>' + s.done + '/' + s.total + ' úkolů hotovo' + (s.overdue ? ' · <b style="color:var(--danger)">' + s.overdue + ' po termínu</b>' : '') + '</span>' +
              '<span>Termín: ' + (p.deadline ? esc(fmtDate(p.deadline, false)) : NA) + '</span></div></article>';
          }).join('') + '</div>'
        : '<div class="card empty">Zatím žádné projekty. Založ první tlačítkem „Nový projekt“.</div>');
  }
  function renderProjectDetail(view, id) {
    const p = projectById(id);
    if (!p) { location.hash = '#projekty'; return; }
    const ts = state.tasks.filter((t) => t.projectId === id);
    const open = ts.filter((t) => t.status !== 'hotovo').sort((a, b) => scoreTask(b).score - scoreTask(a).score);
    const done = ts.filter((t) => t.status === 'hotovo');
    const decs = state.decisions.filter((d) => d.projectId === id);
    const s = projectStats(p);
    view.innerHTML =
      '<p><a href="#projekty">← Projekty</a></p>' +
      '<div class="page-head"><div><h1>' + esc(p.name) + '</h1><div class="row">' + statusBadge(p.status) +
        '<span class="small muted">Termín: ' + (p.deadline ? esc(fmtDate(p.deadline)) : NA) + '</span></div></div>' +
        '<div class="row"><button class="btn" data-act="edit-project" data-id="' + p.id + '">Upravit projekt</button>' +
        '<button class="btn btn-primary" data-act="new-task" data-project="' + p.id + '">+ Úkol</button></div></div>' +
      '<section class="card"><h3>Cíl</h3><p>' + (p.goal ? esc(p.goal) : NA) + '</p>' +
        '<div class="progress"><span style="width:' + s.pct + '%"></span></div><p class="small muted">' + s.done + ' z ' + s.total + ' úkolů hotovo (' + s.pct + ' %)</p></section>' +
      '<section class="card"><h2>Otevřené úkoly (' + open.length + ')</h2>' +
        (open.length ? '<ul class="list">' + open.map((t) => taskRow(t, { hideProject: true })).join('') + '</ul>' : '<div class="empty">Žádné otevřené úkoly.</div>') + '</section>' +
      (decs.length ? '<section class="card"><h2>Rozhodnutí</h2>' + decs.map((d) => '<p>⚑ ' + esc(d.what) + ' <span class="small muted">(' + esc(fmtDate(d.date, false)) + ')</span></p>').join('') + '</section>' : '') +
      (done.length ? '<section class="card"><h2>Hotovo (' + done.length + ')</h2><ul class="list">' + done.map((t) => taskRow(t, { hideProject: true })).join('') + '</ul></section>' : '');
  }

  // ---------- ÚKOLY ----------
  function renderTasks(view) {
    let list = state.tasks.slice();
    if (ui.taskStatus === 'otevřené') list = list.filter((t) => t.status !== 'hotovo');
    else if (ui.taskStatus === 'po termínu') list = list.filter(isOverdue);
    else if (ui.taskStatus !== 'vše') list = list.filter((t) => t.status === ui.taskStatus);
    if (ui.taskProject === 'none') list = list.filter((t) => !t.projectId);
    else if (ui.taskProject !== 'all') list = list.filter((t) => t.projectId === ui.taskProject);
    const pr = { vysoká: 0, střední: 1, nízká: 2 };
    if (ui.taskSort === 'termín') list.sort((a, b) => (a.due || '9999').localeCompare(b.due || '9999'));
    else list.sort((a, b) => (a.status === 'hotovo') - (b.status === 'hotovo') || scoreTask(b).score - scoreTask(a).score || (pr[a.priority] ?? 3) - (pr[b.priority] ?? 3));

    const tabs = ['otevřené', 'po termínu', 'k udělání', 'rozpracováno', 'čeká na někoho', 'hotovo', 'vše'];
    view.innerHTML =
      '<div class="page-head"><div><h1>Úkoly</h1><p class="muted">Klikni na kolečko = hotovo. ✎ = upravit. ★ = priorita dne.</p></div>' +
      '<button class="btn btn-primary" data-act="new-task">+ Nový úkol</button></div>' + sampleBanner() +
      '<div class="chip-tabs" style="margin-bottom:12px">' + tabs.map((s) => '<button data-act="task-tab" data-v="' + esc(s) + '" class="' + (ui.taskStatus === s ? 'on' : '') + '">' + esc(s) + '</button>').join('') + '</div>' +
      '<div class="filters">' +
        '<select id="fProject" aria-label="Filtrovat podle projektu"><option value="all">Všechny projekty</option><option value="none"' + (ui.taskProject === 'none' ? ' selected' : '') + '>Bez projektu</option>' +
          state.projects.map((p) => '<option value="' + p.id + '"' + (ui.taskProject === p.id ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('') + '</select>' +
        '<select id="fSort" aria-label="Řazení"><option value="priorita"' + (ui.taskSort === 'priorita' ? ' selected' : '') + '>Řadit: podle důležitosti</option><option value="termín"' + (ui.taskSort === 'termín' ? ' selected' : '') + '>Řadit: podle termínu</option></select>' +
      '</div>' +
      '<section class="card">' + (list.length ? '<ul class="list">' + list.map((t) => taskRow(t)).join('') + '</ul>' : '<div class="empty">Žádné úkoly v tomto filtru.</div>') + '</section>';
    $('#fProject').onchange = (e) => { ui.taskProject = e.target.value; rerender(); };
    $('#fSort').onchange = (e) => { ui.taskSort = e.target.value; rerender(); };
  }

  // ---------- Modální okna ----------
  function openModal(html, onSubmit, onDelete) {
    const m = $('#modal');
    m.innerHTML = '<form class="modal-box" novalidate>' + html + '</form>';
    m.hidden = false;
    const form = m.querySelector('form');
    const first = form.querySelector('input, textarea, select');
    if (first) first.focus();
    form.onsubmit = (e) => { e.preventDefault(); if (onSubmit(form) !== false) closeModal(); };
    const del = form.querySelector('[data-modal-delete]');
    if (del && onDelete) del.onclick = () => { if (confirm('Opravdu smazat?')) { onDelete(); closeModal(); } };
    form.querySelectorAll('[data-modal-close]').forEach((b) => (b.onclick = closeModal));
  }
  function closeModal() { const m = $('#modal'); m.hidden = true; m.innerHTML = ''; }
  const options = (arr, sel) => arr.map((v) => '<option' + (v === sel ? ' selected' : '') + '>' + esc(v) + '</option>').join('');
  const projectOptions = (sel) => '<option value="">— bez projektu —</option>' +
    state.projects.map((p) => '<option value="' + p.id + '"' + (p.id === sel ? ' selected' : '') + '>' + esc(p.name) + '</option>').join('');
  const modalActions = (canDelete) => '<div class="modal-actions"><div>' + (canDelete ? '<button type="button" class="btn btn-danger" data-modal-delete>Smazat</button>' : '') +
    '</div><div class="row"><button type="button" class="btn" data-modal-close>Zrušit</button><button type="submit" class="btn btn-primary">Uložit</button></div></div>';

  function taskModal(id, presetProject) {
    const t = id ? taskById(id) : { title: '', projectId: presetProject || '', priority: 'střední', due: '', status: 'k udělání', note: '' };
    const srcMeeting = t.source && meetingById(t.source.meetingId);
    openModal(
      '<h2>' + (id ? 'Upravit úkol' : 'Nový úkol') + '</h2>' +
      '<div class="field"><label for="tTitle">Název</label><input type="text" id="tTitle" value="' + esc(t.title) + '" required></div>' +
      '<div class="field"><label for="tProject">Projekt</label><select id="tProject">' + projectOptions(t.projectId) + '</select></div>' +
      '<div class="fields-3"><div class="field"><label for="tPrio">Priorita</label><select id="tPrio">' + options(PRIORITIES, t.priority) + '</select></div>' +
      '<div class="field"><label for="tDue">Termín</label><input type="date" id="tDue" value="' + esc(t.due || '') + '"></div>' +
      '<div class="field"><label for="tStatus">Stav</label><select id="tStatus">' + options(TASK_STATUSES, t.status) + '</select></div></div>' +
      '<div class="field"><label for="tNote">Poznámka</label><textarea id="tNote" style="min-height:70px">' + esc(t.note || '') + '</textarea></div>' +
      (srcMeeting ? '<div class="source"><b>Zdroj:</b> schůzka „' + esc(srcMeeting.title) + '“ — „' + esc(t.source.quote) + '“</div>' : '') +
      modalActions(!!id),
      (f) => {
        const title = $('#tTitle', f).value.trim();
        if (!title) { $('#tTitle', f).focus(); toast('Vyplň název úkolu'); return false; }
        const data = { title, projectId: $('#tProject', f).value || null, priority: $('#tPrio', f).value, due: $('#tDue', f).value || null, status: $('#tStatus', f).value, note: $('#tNote', f).value.trim() };
        if (id) Object.assign(t, data); else state.tasks.push({ id: uid('t'), ...data });
        save(); rerender(); toast(id ? 'Úkol upraven' : 'Úkol přidán');
      },
      () => { state.tasks = state.tasks.filter((x) => x.id !== id); save(); rerender(); toast('Úkol smazán'); }
    );
  }

  function projectModal(id) {
    const p = id ? projectById(id) : { name: '', goal: '', status: 'aktivní', deadline: '' };
    openModal(
      '<h2>' + (id ? 'Upravit projekt' : 'Nový projekt') + '</h2>' +
      '<div class="field"><label for="pName">Název</label><input type="text" id="pName" value="' + esc(p.name) + '"></div>' +
      '<div class="field"><label for="pGoal">Cíl (čeho má projekt dosáhnout)</label><textarea id="pGoal" style="min-height:70px">' + esc(p.goal || '') + '</textarea></div>' +
      '<div class="fields-2"><div class="field"><label for="pStatus">Stav</label><select id="pStatus">' + options(PROJECT_STATUSES, p.status) + '</select></div>' +
      '<div class="field"><label for="pDeadline">Termín</label><input type="date" id="pDeadline" value="' + esc(p.deadline || '') + '"></div></div>' +
      modalActions(!!id),
      (f) => {
        const name = $('#pName', f).value.trim();
        if (!name) { toast('Vyplň název projektu'); return false; }
        const data = { name, goal: $('#pGoal', f).value.trim(), status: $('#pStatus', f).value, deadline: $('#pDeadline', f).value || null };
        if (id) Object.assign(p, data); else state.projects.push({ id: uid('p'), ...data });
        save(); rerender(); toast(id ? 'Projekt upraven' : 'Projekt založen');
      },
      () => {
        state.projects = state.projects.filter((x) => x.id !== id);
        state.tasks.forEach((t) => { if (t.projectId === id) t.projectId = null; });
        state.decisions.forEach((d) => { if (d.projectId === id) d.projectId = null; });
        save(); location.hash = '#projekty'; toast('Projekt smazán (úkoly zůstaly bez projektu)');
      }
    );
  }

  function decisionModal(id, preset) {
    const d = id ? state.decisions.find((x) => x.id === id) : Object.assign({ what: '', why: '', date: today(), revisit: '', projectId: '' }, preset || {});
    openModal(
      '<h2>' + (id ? 'Upravit rozhodnutí' : 'Nové rozhodnutí') + '</h2>' +
      '<div class="field"><label for="dWhat">Co jsem rozhodla</label><textarea id="dWhat" style="min-height:60px">' + esc(d.what) + '</textarea></div>' +
      '<div class="field"><label for="dWhy">Proč</label><textarea id="dWhy" style="min-height:60px">' + esc(d.why || '') + '</textarea></div>' +
      '<div class="fields-3"><div class="field"><label for="dDate">Kdy</label><input type="date" id="dDate" value="' + esc(d.date || '') + '"></div>' +
      '<div class="field"><label for="dRevisit">Vrátit se k tomu</label><input type="date" id="dRevisit" value="' + esc(d.revisit || '') + '"></div>' +
      '<div class="field"><label for="dProject">Projekt</label><select id="dProject">' + projectOptions(d.projectId) + '</select></div></div>' +
      (d.source && meetingById(d.source.meetingId) ? '<div class="source"><b>Zdroj:</b> schůzka „' + esc(meetingById(d.source.meetingId).title) + '“ — „' + esc(d.source.quote) + '“</div>' : '') +
      modalActions(!!id),
      (f) => {
        const what = $('#dWhat', f).value.trim();
        if (!what) { toast('Vyplň, co jsi rozhodla'); return false; }
        const data = { what, why: $('#dWhy', f).value.trim(), date: $('#dDate', f).value || null, revisit: $('#dRevisit', f).value || null, projectId: $('#dProject', f).value || null };
        if (id) Object.assign(d, data); else state.decisions.push({ id: uid('d'), source: d.source || null, ...data });
        save(); rerender(); toast('Rozhodnutí uloženo');
        if (preset && preset._onSaved) preset._onSaved();
      },
      () => { state.decisions = state.decisions.filter((x) => x.id !== id); save(); rerender(); toast('Rozhodnutí smazáno'); }
    );
  }

  // ---------- ROZHODNUTÍ ----------
  function renderDecisions(view) {
    const td = today();
    const list = [...state.decisions].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
    view.innerHTML =
      '<div class="page-head"><div><h1>Rozhodnutí</h1><p class="muted">Co jsem rozhodla, proč a kdy se k tomu vrátit.</p></div>' +
      '<button class="btn btn-primary" data-act="new-decision">+ Nové rozhodnutí</button></div>' + sampleBanner() +
      (list.length ? list.map((d) => {
        const due = d.revisit && d.revisit <= td && !d.revisited;
        const p = projectById(d.projectId);
        const m = d.source && meetingById(d.source.meetingId);
        return '<article class="card">' +
          '<div class="row-between"><h3 style="margin:0">⚑ ' + esc(d.what) + '</h3>' +
            (due ? '<span class="badge b-high">čas na revizi</span>' : d.revisited ? '<span class="badge b-ok">zrevidováno</span>' : '') + '</div>' +
          '<p class="small" style="margin-top:8px"><b>Proč:</b> ' + (d.why ? esc(d.why) : NA) + '</p>' +
          '<div class="task-meta"><span>Rozhodnuto: ' + (d.date ? esc(fmtDate(d.date)) : NA) + '</span>' +
            '<span>· Revize: ' + (d.revisit ? esc(fmtDate(d.revisit)) : NA) + '</span>' +
            (p ? '<span class="badge b-accent">' + esc(p.name) + '</span>' : '') + '</div>' +
          (m ? '<div class="source"><b>Zdroj:</b> schůzka „' + esc(m.title) + '“ — „' + esc(d.source.quote) + '“</div>' : '') +
          '<div class="row" style="margin-top:10px">' +
            (due ? '<button class="btn btn-sm" data-act="decision-revisited" data-id="' + d.id + '">✓ Zrevidováno, platí dál</button>' : '') +
            '<button class="btn btn-sm" data-act="edit-decision" data-id="' + d.id + '">Upravit</button></div>' +
          '</article>';
      }).join('') : '<div class="card empty">Zatím žádná rozhodnutí. Přidej první, nebo je nech navrhnout ze schůzky.</div>');
  }

  // ---------- SCHŮZKY ----------
  function renderMeetings(view, arg) {
    if (arg === 'nova') return renderMeetingEditor(view, null);
    if (arg) return renderMeetingEditor(view, arg);
    const td = today();
    const upcoming = state.meetings.filter((m) => m.date >= td).sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')));
    const past = state.meetings.filter((m) => m.date < td).sort((a, b) => (b.date + (b.time || '')).localeCompare(a.date + (a.time || '')));
    const item = (m) => '<div class="meeting-item"><div class="time-pill">' + esc(fmtDate(m.date, false)) + '<br><span class="muted">' + (m.time ? esc(m.time) : '—') + '</span></div>' +
      '<div style="flex:1;min-width:0"><a href="#schuzky/' + m.id + '" style="font-weight:600;color:var(--ink)">' + esc(m.title) + '</a>' +
      '<div class="task-meta">' + (m.notes ? '<span class="badge">poznámky ✓</span>' : '<span class="badge">bez poznámek</span>') +
      (m.analysis ? '<span class="badge ' + (m.analysis.mode === 'ai' ? 'b-ai' : 'b-demo') + '">' + (m.analysis.mode === 'ai' ? 'zpracováno AI' : 'zpracováno ukázkově') + '</span>' : '') + '</div></div>' +
      '<a class="btn btn-sm" href="#schuzky/' + m.id + '">Otevřít</a></div>';
    view.innerHTML =
      '<div class="page-head"><div><h1>Schůzky</h1><p class="muted">Vlož poznámky → AI navrhne shrnutí, rozhodnutí, otázky a úkoly. Uloží se jen to, co potvrdíš.</p></div>' +
      '<a class="btn btn-primary" href="#schuzky/nova">+ Nová schůzka</a></div>' + sampleBanner() +
      '<section class="card"><h2>Dnes a dál</h2>' + (upcoming.length ? upcoming.map(item).join('') : '<div class="empty">Žádné nadcházející schůzky.</div>') + '</section>' +
      '<section class="card"><h2>Proběhlé</h2>' + (past.length ? past.map(item).join('') : '<div class="empty">Zatím nic.</div>') + '</section>';
  }

  function renderMeetingEditor(view, id) {
    const m = id ? meetingById(id) : { title: '', date: today(), time: '', people: '', notes: '' };
    if (id && !m) { location.hash = '#schuzky'; return; }
    view.innerHTML =
      '<p><a href="#schuzky">← Schůzky</a></p>' +
      '<div class="page-head"><h1>' + (id ? esc(m.title) : 'Nová schůzka') + '</h1>' +
        (id ? '<button class="btn btn-danger btn-sm" data-act="delete-meeting" data-id="' + id + '">Smazat schůzku</button>' : '') + '</div>' +
      '<section class="card">' +
        '<div class="field"><label for="mTitle">Název</label><input type="text" id="mTitle" value="' + esc(m.title) + '" placeholder="např. Porada s marketingem"></div>' +
        '<div class="fields-3"><div class="field"><label for="mDate">Datum</label><input type="date" id="mDate" value="' + esc(m.date || '') + '"></div>' +
        '<div class="field"><label for="mTime">Čas</label><input type="time" id="mTime" value="' + esc(m.time || '') + '"></div>' +
        '<div class="field"><label for="mPeople">Účastníci</label><input type="text" id="mPeople" value="' + esc(m.people === 'neuvedeno' ? '' : m.people || '') + '" placeholder="nepovinné"></div></div>' +
        '<div class="field"><label for="mNotes">Poznámky ze schůzky</label><textarea id="mNotes" style="min-height:200px" placeholder="Vlož nebo napiš poznámky. Klidně v bodech, jak je máš.">' + esc(m.notes || '') + '</textarea></div>' +
        '<div class="row"><button class="btn" data-act="save-meeting" data-id="' + (id || '') + '">Uložit</button>' +
        '<button class="btn btn-primary" data-act="process-meeting" data-id="' + (id || '') + '">✦ Uložit a zpracovat poznámky</button>' +
        '<span class="small muted">' + (aiReady() ? 'Zpracuje AI (Claude).' : 'AI není připojená → proběhne ukázkové zpracování pravidly.') + '</span></div>' +
      '</section>' +
      '<div id="analysis">' + (id && m.analysis ? analysisHtml(m) : '') + '</div>';
  }

  function readMeetingForm(id) {
    const title = $('#mTitle').value.trim();
    if (!title) { toast('Vyplň název schůzky'); $('#mTitle').focus(); return null; }
    const data = { title, date: $('#mDate').value || today(), time: $('#mTime').value || '', people: $('#mPeople').value.trim() || 'neuvedeno', notes: $('#mNotes').value };
    let m;
    if (id) { m = meetingById(id); Object.assign(m, data); }
    else { m = { id: uid('m'), analysis: null, ...data }; state.meetings.push(m); }
    save();
    return m;
  }

  // Ukázkové „zpracování“ bez AI: jen rozpozná věty podle klíčových slov.
  function demoExtract(notes, meeting) {
    const sentences = [];
    notes.split(/\n+/).forEach((line) => {
      line.split(/(?<=[.!?])\s+(?=[A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ])/).forEach((s) => {
        const clean = s.replace(/^\s*([-*•–]|\d+[.)])\s*/, '').replace(/^\[\s?\]\s*/, '').trim();
        if (clean.length > 2) sentences.push(clean);
      });
    });
    const reDecision = /(rozhodl|rozhodnut|domluvil[ia]? jsme|dohodl[ia]? jsme|schválil|schváleno|jdeme do|nebudeme)/i;
    const reQuestion = /(\?\s*$|^otázka|^nevíme|není jasné|nejasné|zjistit,? zda|zjistit,? jestli)/i;
    // \b v JS nezná diakritiku → hranice slova přes \p{L}
    const reTask = /(^úkol|^todo|(?<!\p{L})(udělá|udělat|připraví|připravit|pošle|poslat|zajistí|zajistit|nastaví|nastavit|dodá|dodat|zavolá|zavolat|napíše|napsat|ověří|ověřit|schválit|vytvoří|vytvořit|zjistit|musím|musíme|domluvit)(?!\p{L}))/iu;
    const out = { summary: '', decisions: [], open_questions: [], tasks: [] };
    const year = (meeting.date || today()).slice(0, 4);
    sentences.forEach((s) => {
      if (reDecision.test(s)) {
        const why = s.match(/(?:protože|jelikož|kvůli)\s+(.+?)[.!]?$/i);
        out.decisions.push({ text: s.replace(/[.]$/, ''), reason: why ? why[1] : null, source_quote: s });
      } else if (reQuestion.test(s)) {
        out.open_questions.push({ text: s.replace(/^otázka:\s*/i, ''), source_quote: s });
      } else if (reTask.test(s)) {
        const owner = s.match(/^([A-ZÁČĎÉĚÍŇÓŘŠŤÚŮÝŽ][a-záčďéěíňóřšťúůýž]+)\s*:\s/);
        const dateM = s.match(/(\d{1,2})\.\s?(\d{1,2})\.(?:\s?(\d{4}))?/);
        const dueText = s.match(/(?<!\p{L})((?:do|nejpozději|termín)\s+(?:\d{1,2}\.\s?\d{1,2}\.(?:\s?\d{4})?|[^,.;]{2,25}?))(?=[,.;]|$)/iu);
        let dueDate = null;
        if (dateM) {
          const z = (n) => String(n).padStart(2, '0');
          dueDate = (dateM[3] || year) + '-' + z(dateM[2]) + '-' + z(dateM[1]);
        }
        out.tasks.push({
          title: (owner ? s.slice(owner[0].length) : s).replace(/[.]$/, '').slice(0, 140),
          owner: owner ? owner[1] : null,
          due_text: dueText ? dueText[1] : (dateM ? dateM[0] : null),
          due_date: dueDate,
          priority: /(urgent|asap|hned|kritick|priorit)/i.test(s) ? 'vysoká' : null,
          source_quote: s,
        });
      }
    });
    out.summary = 'Ukázkový režim neumí napsat skutečné shrnutí. V poznámkách je ' + sentences.length +
      ' vět; podle klíčových slov jsem rozpoznala ' + out.decisions.length + ' rozhodnutí, ' + out.open_questions.length +
      ' otevřených otázek a ' + out.tasks.length + ' možných úkolů.';
    return out;
  }

  async function processMeeting(id) {
    const m = readMeetingForm(id);
    if (!m) return;
    if (!m.notes.trim()) { toast('Nejdřív vlož poznámky'); if (!id) location.hash = '#schuzky/' + m.id; return; }
    if (!id) history.replaceState(null, '', '#schuzky/' + m.id);
    const box = $('#analysis');
    box.innerHTML = '<div class="card"><span class="spinner"></span> Zpracovávám poznámky…</div>';
    const btn = document.querySelector('[data-act="process-meeting"]');
    if (btn) { btn.disabled = true; btn.dataset.id = m.id; }
    const saveBtn = document.querySelector('[data-act="save-meeting"]');
    if (saveBtn) saveBtn.dataset.id = m.id;
    let result, mode, model = null, aiError = null;
    if (aiReady()) {
      try {
        const r = await callAI({ mode: 'meeting', notes: m.notes, meeting: { title: m.title, date: m.date, people: m.people } });
        result = r.data; model = r.model; mode = 'ai';
      } catch (e) { aiError = e.message; }
    }
    if (!result) { result = demoExtract(m.notes, m); mode = 'demo'; }
    const mark = (arr) => (arr || []).map((x) => ({ ...x, state: 'pending', selected: true }));
    m.analysis = {
      mode, model, aiError, createdAt: new Date().toISOString(), notesSnapshot: m.notes,
      summary: result.summary || '',
      decisions: mark(result.decisions),
      open_questions: result.open_questions || [],
      tasks: mark(result.tasks).map((t) => ({ ...t, edit: { title: t.title, projectId: '', priority: t.priority || 'střední', due: t.due_date || '' } })),
    };
    save();
    if (btn) btn.disabled = false;
    box.innerHTML = analysisHtml(m);
    box.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function quoteHtml(notes, quote) {
    const found = quote && norm(notes).includes(norm(quote));
    return '<div class="source' + (found ? '' : ' bad') + '"><b>' + (found ? 'Zdroj z poznámek:' : '⚠ Tuto citaci jsem v poznámkách nenašla — ověř:') + '</b> „' + esc(quote || 'neuvedeno') + '“</div>';
  }

  function analysisHtml(m) {
    const a = m.analysis;
    const notes = a.notesSnapshot || m.notes;
    const pendingTasks = a.tasks.filter((t) => t.state === 'pending');
    const pendingDecs = a.decisions.filter((d) => d.state === 'pending');
    const stateBadge = (s) => s === 'saved' ? '<span class="badge b-ok">uloženo</span>' : s === 'dismissed' ? '<span class="badge">zahozeno</span>' : '';
    return '<section class="card" style="margin-top:16px">' +
      '<div class="row-between"><h2 style="margin:0">Návrh ze schůzky</h2><span class="small muted">' + esc(new Date(a.createdAt).toLocaleString('cs-CZ')) + '</span></div><div style="height:10px"></div>' +
      (a.mode === 'ai' ? aiBanner(a.model) : demoBanner('Ukázka, jak bude zpracování vypadat.')) +
      (a.aiError ? '<div class="banner banner-warn">Volání AI selhalo (' + esc(a.aiError) + '), proto je zobrazená ukázka.</div>' : '') +
      (norm(notes) !== norm(m.notes) ? '<div class="banner banner-warn">Poznámky se od zpracování změnily. Pro aktuální návrh klikni znovu na „Uložit a zpracovat“.</div>' : '') +
      '<h3>Shrnutí</h3><p>' + (a.summary ? esc(a.summary) : NA) + '</p>' +
    '</section>' +

    '<section class="card"><div class="row-between"><h2 style="margin:0">Navržené úkoly (' + a.tasks.length + ')</h2>' +
      (pendingTasks.length ? '<button class="btn btn-primary btn-sm" data-act="save-proposed-tasks" data-id="' + m.id + '">Uložit vybrané úkoly</button>' : '') + '</div>' +
      '<p class="small muted" style="margin:6px 0 12px">Nic se neuloží, dokud nepotvrdíš. Před uložením můžeš upravit název, projekt, prioritu a termín.</p>' +
      (a.tasks.length ? a.tasks.map((t, i) => {
        const pending = t.state === 'pending';
        return '<div class="proposal' + (pending && t.selected ? ' checked' : '') + '">' +
          '<div class="proposal-head">' + (pending ? '<input type="checkbox" data-act="toggle-proposal" data-mid="' + m.id + '" data-kind="tasks" data-i="' + i + '"' + (t.selected ? ' checked' : '') + ' aria-label="Vybrat úkol">' : '') +
          '<div style="flex:1;min-width:0"><div class="row-between"><b>' + esc(t.title) + '</b>' + stateBadge(t.state) + '</div>' +
          '<div class="task-meta"><span>Kdo: ' + (t.owner ? esc(t.owner) : NA) + '</span><span>· Termín v poznámkách: ' + (t.due_text ? '„' + esc(t.due_text) + '“' : NA) + '</span>' +
          '<span>· Priorita: ' + (t.priority ? esc(t.priority) : NA) + '</span></div></div>' +
          (pending ? '<button class="btn-ghost btn btn-sm" data-act="dismiss-proposal" data-mid="' + m.id + '" data-kind="tasks" data-i="' + i + '" title="Zahodit">✕</button>' : '') + '</div>' +
          quoteHtml(notes, t.source_quote) +
          (pending ? '<div class="proposal-edit">' +
            '<input type="text" data-pedit="title" data-mid="' + m.id + '" data-i="' + i + '" value="' + esc(t.edit.title) + '" aria-label="Název úkolu">' +
            '<select data-pedit="projectId" data-mid="' + m.id + '" data-i="' + i + '" aria-label="Projekt">' + projectOptions(t.edit.projectId) + '</select>' +
            '<div class="row" style="flex-wrap:nowrap"><select data-pedit="priority" data-mid="' + m.id + '" data-i="' + i + '" aria-label="Priorita">' + options(PRIORITIES, t.edit.priority) + '</select>' +
            '<input type="date" data-pedit="due" data-mid="' + m.id + '" data-i="' + i + '" value="' + esc(t.edit.due) + '" aria-label="Termín" title="' + (t.due_date ? 'Datum převzato z poznámek' : 'V poznámkách není konkrétní datum — doplň, nebo nech prázdné') + '"></div>' +
            '</div>' + (!t.due_date ? '<p class="small muted" style="margin:6px 0 0">Konkrétní datum v poznámkách není — termín nechávám prázdný (doplň ho, pokud ho znáš).</p>' : '') : '') +
          '</div>';
      }).join('') : '<div class="empty">V poznámkách jsem nenašla žádné úkoly.</div>') +
    '</section>' +

    '<section class="card"><div class="row-between"><h2 style="margin:0">Navržená rozhodnutí (' + a.decisions.length + ')</h2>' +
      (pendingDecs.length ? '<button class="btn btn-primary btn-sm" data-act="save-proposed-decisions" data-id="' + m.id + '">Uložit vybraná rozhodnutí</button>' : '') + '</div><div style="height:10px"></div>' +
      (a.decisions.length ? a.decisions.map((d, i) => {
        const pending = d.state === 'pending';
        return '<div class="proposal' + (pending && d.selected ? ' checked' : '') + '"><div class="proposal-head">' +
          (pending ? '<input type="checkbox" data-act="toggle-proposal" data-mid="' + m.id + '" data-kind="decisions" data-i="' + i + '"' + (d.selected ? ' checked' : '') + ' aria-label="Vybrat rozhodnutí">' : '') +
          '<div style="flex:1;min-width:0"><div class="row-between"><b>⚑ ' + esc(d.text) + '</b>' + stateBadge(d.state) + '</div>' +
          '<div class="small muted">Proč: ' + (d.reason ? esc(d.reason) : NA) + ' · Kdy se vrátit: ' + NA + ' (doplníš po uložení)</div></div>' +
          (pending ? '<button class="btn-ghost btn btn-sm" data-act="dismiss-proposal" data-mid="' + m.id + '" data-kind="decisions" data-i="' + i + '" title="Zahodit">✕</button>' : '') +
          '</div>' + quoteHtml(notes, d.source_quote) + '</div>';
      }).join('') : '<div class="empty">Žádná rozhodnutí v poznámkách.</div>') +
    '</section>' +

    '<section class="card"><h2>Otevřené otázky (' + a.open_questions.length + ')</h2>' +
      (a.open_questions.length ? a.open_questions.map((q, i) => '<div class="proposal"><div class="row-between"><b>? ' + esc(q.text) + '</b>' +
        '<button class="btn btn-sm" data-act="question-to-task" data-mid="' + m.id + '" data-i="' + i + '">→ udělat z ní úkol</button></div>' + quoteHtml(notes, q.source_quote) + '</div>').join('')
        : '<div class="empty">Žádné otevřené otázky.</div>') +
    '</section>';
  }

  function refreshAnalysis(m) { const box = $('#analysis'); if (box) box.innerHTML = analysisHtml(m); }

  // ---------- AI KOUČ ----------
  function coachContext() {
    const td = today();
    return {
      goals: state.goals,
      projects: state.projects.map((p) => ({ id: p.id, name: p.name, goal: p.goal || null, status: p.status, deadline: p.deadline || null })),
      open_tasks: openTasks().map((t) => ({ id: t.id, title: t.title, project_id: t.projectId, priority: t.priority, due: t.due || null, status: t.status, overdue: !!isOverdue(t) })),
      today_priorities: state.todayPicks.ids,
      decisions: state.decisions.map((d) => ({ id: d.id, what: d.what, why: d.why || null, revisit: d.revisit || null })),
      meetings_today: state.meetings.filter((m) => m.date === td).map((m) => ({ title: m.title, time: m.time || null })),
    };
  }

  function demoCoach(question) {
    const q = (question || '').toLowerCase();
    const ranked = rankedOpen();
    const missing = [];
    const noDue = openTasks().filter((t) => !t.due).length;
    if (noDue) missing.push(noDue + ' otevřených úkolů nemá termín');
    if (!state.goals.length) missing.push('nemáš vyplněné cíle (Nastavení)');
    missing.push('u úkolů chybí odhad času, takže nevím, co se vejde do konkrétního okna');
    if (/odlož|deleg|zbav|škrt/.test(q)) {
      const cands = ranked.filter((r) => r.t.priority === 'nízká' || r.t.status === 'čeká na někoho' || projectById(r.t.projectId)?.status === 'pozastaveno').reverse().slice(0, 3);
      return {
        recommendation: cands.length ? 'Kandidáti na odložení nebo delegování: ' + cands.map((r) => '„' + r.t.title + '“').join(', ') + '.' : 'Nenašla jsem jasné kandidáty na odložení.',
        why: 'Pravidlo: nízká priorita, pozastavený projekt nebo úkol čekající na někoho jiného.',
        first_step: cands.length ? 'U úkolu „' + cands[0].t.title + '“ rozhodni: delegovat, odložit, nebo smazat.' : 'Projdi seznam úkolů s nízkou prioritou.',
        task_ids: cands.map((r) => r.t.id), project_ids: [], decision_ids: [], goal_indexes: [], risks: [], missing_info: missing,
      };
    }
    const top = ranked.find((r) => r.t.status !== 'čeká na někoho');
    if (!top) return { recommendation: 'Nemáš otevřené úkoly.', why: '', first_step: 'Naplánuj si další krok v některém projektu.', task_ids: [], project_ids: [], decision_ids: [], goal_indexes: [], risks: [], missing_info: missing };
    const overdueCount = openTasks().filter(isOverdue).length;
    return {
      recommendation: 'Pusť se do úkolu „' + top.t.title + '“.',
      why: 'Má nejvyšší skóre podle pravidel: ' + (top.reasons.join(', ') || 'nejvyšší priorita mezi otevřenými') + '.',
      first_step: 'Nastav si časovač na 25 minut a pracuj jen na tomto úkolu.',
      task_ids: [top.t.id], project_ids: top.t.projectId ? [top.t.projectId] : [], decision_ids: [], goal_indexes: [],
      risks: overdueCount > 2 ? ['Máš ' + overdueCount + ' úkolů po termínu — zvaž, které přeplánovat, ať tě nezahlcují.'] : [],
      missing_info: missing,
    };
  }

  function renderCoach(view) {
    const last = state.lastCoach;
    view.innerHTML =
      '<div class="page-head"><div><h1>AI kouč</h1><p class="muted">Pomůže vybrat další krok podle tvých cílů a rozpracované práce.</p></div></div>' +
      '<div class="grid grid-2">' +
        '<section class="card"><div class="row-between"><h2 style="margin:0">Moje cíle</h2><a class="small" href="#nastaveni">upravit</a></div><div style="height:8px"></div>' +
          (state.goals.length ? '<ol class="steps">' + state.goals.map((g) => '<li>' + esc(g) + '</li>').join('') + '</ol>' : '<p class="missing">Cíle nejsou vyplněné — doplň je v Nastavení.</p>') +
        '</section>' +
        '<section class="card"><h2>Na co se chceš zeptat?</h2>' +
          '<div class="chip-tabs" style="margin-bottom:10px">' +
            ['Co je teď můj nejlepší další krok?', 'Mám 30 minut — co s nimi?', 'Co můžu odložit nebo delegovat?'].map((q) => '<button type="button" data-act="coach-preset" data-q="' + esc(q) + '">' + esc(q) + '</button>').join('') +
          '</div>' +
          '<textarea id="coachQ" style="min-height:70px" placeholder="Nepovinné — napiš vlastní otázku nebo kontext (např. jak se dnes cítíš, kolik máš času).">' + esc(last ? last.question : '') + '</textarea>' +
          '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="coach-run">✦ Doporuč další krok</button>' +
          '<span class="small muted">' + (aiReady() ? 'Odpoví AI (Claude).' : 'AI není připojená → ukázková odpověď podle pravidel.') + '</span></div>' +
        '</section>' +
      '</div>' +
      '<div id="coachOut">' + (last ? coachHtml(last) : '') + '</div>';
  }

  function coachHtml(c) {
    const r = c.result;
    const tasks = (r.task_ids || []).map(taskById).filter(Boolean);
    const projects = (r.project_ids || []).map(projectById).filter(Boolean);
    const decisions = (r.decision_ids || []).map((id) => state.decisions.find((d) => d.id === id)).filter(Boolean);
    const goals = (r.goal_indexes || []).filter((i) => state.goals[i] != null).map((i) => state.goals[i]);
    const unknown = (r.task_ids || []).length + (r.project_ids || []).length + (r.decision_ids || []).length - tasks.length - projects.length - decisions.length;
    const srcList = [
      ...goals.map((g) => '🎯 Cíl: ' + esc(g)),
      ...projects.map((p) => '▦ Projekt: <a href="#projekty/' + p.id + '">' + esc(p.name) + '</a> (' + esc(p.status) + ', termín ' + (p.deadline ? esc(fmtDate(p.deadline, false)) : 'neuveden') + ')'),
      ...tasks.map((t) => '✓ Úkol: ' + esc(t.title) + ' (priorita ' + esc(t.priority || 'neuvedena') + ', termín ' + (t.due ? esc(fmtDate(t.due, false)) : 'neuveden') + ', ' + esc(t.status) + ')'),
      ...decisions.map((d) => '⚑ Rozhodnutí: ' + esc(d.what)),
    ];
    return '<section class="card next-step" style="margin-top:16px">' +
      (c.mode === 'ai' ? aiBanner(c.model) : demoBanner('Ukázka, jak bude kouč odpovídat.')) +
      (c.aiError ? '<div class="banner banner-warn">Volání AI selhalo (' + esc(c.aiError) + '), proto je zobrazená ukázka.</div>' : '') +
      (c.question ? '<p class="small muted">Otázka: „' + esc(c.question) + '“</p>' : '') +
      '<div class="big">' + esc(r.recommendation) + '</div>' +
      '<p><b>Proč:</b> ' + (r.why ? esc(r.why) : NA) + '</p>' +
      '<p><b>První krok:</b> ' + (r.first_step ? esc(r.first_step) : NA) + '</p>' +
      (tasks[0] ? '<div class="row" style="margin:8px 0 4px"><button class="btn btn-sm" data-act="star-task" data-id="' + tasks[0].id + '">★ Přidat do priorit dne</button></div>' : '') +
      (r.risks && r.risks.length ? '<h3 style="margin-top:12px">Pozor</h3><ul>' + r.risks.map((x) => '<li>' + esc(x) + '</li>').join('') + '</ul>' : '') +
      (r.missing_info && r.missing_info.length ? '<h3 style="margin-top:12px">Co mi chybí pro lepší radu</h3><ul>' + r.missing_info.map((x) => '<li class="missing">' + esc(x) + '</li>').join('') + '</ul>' : '') +
      '<h3 style="margin-top:12px">Zdrojové informace</h3>' +
      (srcList.length ? '<ul class="small">' + srcList.map((s) => '<li>' + s + '</li>').join('') + '</ul>' : '<p class="small muted">Odpověď se neodkazuje na konkrétní položky.</p>') +
      (unknown > 0 ? '<p class="small" style="color:var(--danger)">⚠ ' + unknown + ' odkaz(ů) neodpovídá žádné položce v aplikaci — byly vynechány.</p>' : '') +
      '<p class="small muted">' + esc(new Date(c.createdAt).toLocaleString('cs-CZ')) + '</p>' +
    '</section>';
  }

  async function runCoach() {
    const question = $('#coachQ').value.trim();
    const out = $('#coachOut');
    out.innerHTML = '<div class="card" style="margin-top:16px"><span class="spinner"></span> Přemýšlím…</div>';
    let result, mode = 'demo', model = null, aiError = null;
    if (aiReady()) {
      try {
        const r = await callAI({ mode: 'coach', question, today: today(), context: coachContext() });
        result = r.data; model = r.model; mode = 'ai';
      } catch (e) { aiError = e.message; }
    }
    if (!result) result = demoCoach(question);
    state.lastCoach = { question, mode, model, aiError, result, createdAt: new Date().toISOString() };
    save();
    out.innerHTML = coachHtml(state.lastCoach);
  }

  // ---------- NASTAVENÍ ----------
  function renderSettings(view) {
    const statusText = ai.reachable === false
      ? '<span class="badge b-demo">AI server nedostupný</span> <span class="small muted">Běžíš lokálně bez serverové funkce, nebo ještě není nasazeno.</span>'
      : ai.configured ? '<span class="badge b-ai">Server má AI nastavenou</span>' + (ai.model ? ' <span class="small muted">model ' + esc(ai.model) + '</span>' : '')
      : ai.configured === false ? '<span class="badge b-demo">Na serveru chybí API klíč nebo heslo</span>' : '<span class="small muted">ověřuji…</span>';
    view.innerHTML =
      '<div class="page-head"><div><h1>Nastavení</h1><p class="muted">AI, cíle, data a další fáze.</p></div></div>' +
      '<section class="card"><h2>AI připojení</h2><p>' + statusText + '</p>' +
        '<div class="field" style="max-width:380px"><label for="sPw">Heslo k AI (COS_APP_PASSWORD)</label>' +
        '<input type="password" id="sPw" value="' + esc(getPassword()) + '" placeholder="zadej heslo nastavené ve Vercelu" autocomplete="off"></div>' +
        '<div class="row"><button class="btn btn-primary" data-act="save-pw">Uložit heslo</button><button class="btn" data-act="test-ai">Otestovat AI</button></div>' +
        '<p class="small muted" style="margin-top:8px">Heslo se ukládá jen v tomto prohlížeči. Chrání tvůj AI kredit před cizími lidmi.</p>' +
        '<details style="margin-top:10px"><summary><b>Jak AI zapnout (jednorázově, ~10 minut)</b></summary><ol class="steps small">' +
          '<li>Na <a href="https://console.anthropic.com" target="_blank" rel="noopener">console.anthropic.com</a> si založ účet, nabij kredit (stačí 5 $) a vytvoř API klíč.</li>' +
          '<li>Ve Vercelu: projekt → Settings → Environment Variables → přidej <code>ANTHROPIC_API_KEY</code> (klíč) a <code>COS_APP_PASSWORD</code> (tvoje heslo, vymysli si dlouhé).</li>' +
          '<li>Vercel → Deployments → Redeploy (aby se proměnné načetly).</li>' +
          '<li>Sem zadej stejné heslo a klikni „Otestovat AI“.</li></ol></details>' +
      '</section>' +
      '<section class="card"><h2>Moje cíle</h2><p class="small muted">Jeden cíl na řádek. Podle nich radí AI kouč.</p>' +
        '<textarea id="sGoals">' + esc(state.goals.join('\n')) + '</textarea>' +
        '<div class="row" style="margin-top:10px"><button class="btn btn-primary" data-act="save-goals">Uložit cíle</button></div></section>' +
      '<section class="card"><h2>Data</h2>' +
        '<p class="small">Data jsou uložená <b>jen v tomto prohlížeči</b> na tomto zařízení. Mezi počítačem a mobilem se zatím nesynchronizují — použij zálohu (export/import).</p>' +
        '<div class="row"><button class="btn" data-act="export">⬇ Stáhnout zálohu (JSON)</button>' +
        '<label class="btn" style="margin:0;color:var(--ink);font-size:15px;font-weight:500">⬆ Nahrát zálohu<input type="file" id="sImport" accept="application/json,.json" hidden></label></div>' +
        '<div class="row" style="margin-top:12px">' +
          (state.isSample ? '<button class="btn btn-danger" data-act="clear-sample">Smazat ukázková data a začít naostro</button>' : '') +
          '<button class="btn btn-ghost" data-act="load-sample">Načíst ukázková data</button></div>' +
      '</section>' +
      '<section class="card phase"><h2>Fáze 2 — e-mail a kalendář (připraveno, zatím nepřipojeno)</h2>' +
        '<ol class="steps small">' +
          '<li><b>Google Kalendář</b> — dnešní schůzky se načtou automaticky (jen čtení), u každé tlačítko „Vložit poznámky“.</li>' +
          '<li><b>Gmail</b> — AI projde vybrané e-maily (např. se štítkem „Úkol“) a navrhne úkoly se zdrojem = odkaz na e-mail. Uloží se až po potvrzení.</li>' +
          '<li><b>Synchronizace dat</b> mezi počítačem a mobilem (databáze místo prohlížeče) + přihlášení.</li></ol>' +
        '<p class="small muted">Vyžaduje: Google Cloud projekt s OAuth přihlášením a databázi. Pustíme se do toho, až si prototyp vyzkoušíš.</p>' +
      '</section>';
    $('#sImport').onchange = importData;
  }

  function exportData() {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = 'chief-of-staff-zaloha-' + today() + '.json';
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  }
  function importData(e) {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const d = JSON.parse(reader.result);
        if (!Array.isArray(d.tasks) || !Array.isArray(d.projects)) throw new Error('bad');
        if (!confirm('Nahrát zálohu? Současná data v tomto prohlížeči se přepíšou.')) return;
        state = Object.assign(emptyData(), d);
        save(); toast('Záloha nahrána'); rerender();
      } catch (err) { toast('Soubor není platná záloha'); }
    };
    reader.readAsText(file);
  }

  // ---------- Akce (kliknutí) ----------
  const actions = {
    'new-task': (el) => taskModal(null, el.dataset.project),
    'edit-task': (el) => taskModal(el.dataset.id),
    'toggle-task': (el) => {
      const t = taskById(el.dataset.id);
      if (!t) return;
      t.status = t.status === 'hotovo' ? 'k udělání' : 'hotovo';
      t.doneAt = t.status === 'hotovo' ? new Date().toISOString() : null;
      save(); rerender(); toast(t.status === 'hotovo' ? 'Hotovo ✓' : 'Vráceno mezi otevřené');
    },
    'star-task': (el) => {
      const ids = state.todayPicks.ids;
      const i = ids.indexOf(el.dataset.id);
      if (i >= 0) { ids.splice(i, 1); toast('Odebráno z priorit dne'); }
      else {
        const active = ids.filter((id) => { const t = taskById(id); return t && t.status !== 'hotovo'; });
        if (active.length >= 3) { toast('Priority dne jsou max. 3 — nejdřív jednu odeber'); return; }
        state.todayPicks.ids = [...active, el.dataset.id];
        toast('Přidáno do priorit dne ★');
      }
      save(); rerender();
    },
    'task-tab': (el) => { ui.taskStatus = el.dataset.v; rerender(); },
    'new-project': () => projectModal(null),
    'edit-project': (el) => projectModal(el.dataset.id),
    'open-project': (el) => { location.hash = '#projekty/' + el.dataset.id; },
    'new-decision': () => decisionModal(null),
    'edit-decision': (el) => decisionModal(el.dataset.id),
    'decision-revisited': (el) => {
      const d = state.decisions.find((x) => x.id === el.dataset.id);
      d.revisited = true; save(); rerender(); toast('Označeno jako zrevidované');
    },
    'save-meeting': (el) => {
      const m = readMeetingForm(el.dataset.id);
      if (m) { toast('Schůzka uložena'); location.hash = '#schuzky/' + m.id; if (el.dataset.id) rerender(); }
    },
    'process-meeting': (el) => processMeeting(el.dataset.id),
    'delete-meeting': (el) => {
      if (!confirm('Smazat schůzku i s poznámkami? Uložené úkoly a rozhodnutí zůstanou.')) return;
      state.meetings = state.meetings.filter((m) => m.id !== el.dataset.id);
      save(); location.hash = '#schuzky'; toast('Schůzka smazána');
    },
    'toggle-proposal': (el) => {
      const m = meetingById(el.dataset.mid);
      const item = m.analysis[el.dataset.kind][+el.dataset.i];
      item.selected = el.checked; save();
      el.closest('.proposal').classList.toggle('checked', el.checked);
    },
    'dismiss-proposal': (el) => {
      const m = meetingById(el.dataset.mid);
      m.analysis[el.dataset.kind][+el.dataset.i].state = 'dismissed';
      save(); refreshAnalysis(m);
    },
    'save-proposed-tasks': (el) => {
      const m = meetingById(el.dataset.id);
      const chosen = m.analysis.tasks.filter((t) => t.state === 'pending' && t.selected);
      if (!chosen.length) { toast('Nevybrala jsi žádný úkol'); return; }
      chosen.forEach((t) => {
        state.tasks.push({
          id: uid('t'), title: (t.edit.title || t.title).trim(), projectId: t.edit.projectId || null,
          priority: t.edit.priority || 'střední', due: t.edit.due || null, status: 'k udělání',
          note: t.owner ? 'Kdo (dle poznámek): ' + t.owner : '',
          source: { meetingId: m.id, quote: t.source_quote },
        });
        t.state = 'saved';
      });
      save(); refreshAnalysis(m); toast('Uloženo úkolů: ' + chosen.length);
    },
    'save-proposed-decisions': (el) => {
      const m = meetingById(el.dataset.id);
      const chosen = m.analysis.decisions.filter((d) => d.state === 'pending' && d.selected);
      if (!chosen.length) { toast('Nevybrala jsi žádné rozhodnutí'); return; }
      chosen.forEach((d) => {
        state.decisions.push({ id: uid('d'), what: d.text, why: d.reason || '', date: m.date, revisit: null, projectId: null, source: { meetingId: m.id, quote: d.source_quote } });
        d.state = 'saved';
      });
      save(); refreshAnalysis(m); toast('Uloženo rozhodnutí: ' + chosen.length + ' (termín revize doplň v Rozhodnutích)');
    },
    'question-to-task': (el) => {
      const m = meetingById(el.dataset.mid);
      const q = m.analysis.open_questions[+el.dataset.i];
      m.analysis.tasks.push({ title: 'Vyjasnit: ' + q.text, owner: null, due_text: null, due_date: null, priority: null, source_quote: q.source_quote, state: 'pending', selected: true, edit: { title: 'Vyjasnit: ' + q.text, projectId: '', priority: 'střední', due: '' } });
      save(); refreshAnalysis(m); toast('Přidáno mezi navržené úkoly — potvrď uložení');
    },
    'coach-preset': (el) => { $('#coachQ').value = el.dataset.q; },
    'coach-run': () => runCoach(),
    'save-pw': () => {
      try { localStorage.setItem(PW_KEY, $('#sPw').value.trim()); } catch (e) { /* ignore */ }
      renderAIStatus(); toast('Heslo uloženo'); rerender();
    },
    'test-ai': async () => {
      try { localStorage.setItem(PW_KEY, $('#sPw').value.trim()); } catch (e) { /* ignore */ }
      await checkAI();
      if (!ai.configured) { toast('AI na serveru není nastavená'); rerender(); return; }
      toast('Testuji…');
      try {
        await callAI({ mode: 'meeting', notes: 'Test: rozhodli jsme, že test proběhne.', meeting: { title: 'Test připojení' } });
        toast('AI funguje ✓');
      } catch (e) { toast(e.message); }
      rerender();
    },
    'save-goals': () => {
      state.goals = $('#sGoals').value.split('\n').map((s) => s.trim()).filter(Boolean);
      save(); toast('Cíle uloženy');
    },
    export: exportData,
    'clear-sample': () => {
      if (!confirm('Smazat všechna ukázková data? Cíle zůstanou, ať je můžeš upravit.')) return;
      const goals = state.goals;
      state = emptyData(); state.goals = goals;
      save(); toast('Hotovo — začínáš naostro'); location.hash = '#dnes';
    },
    'load-sample': () => {
      if (!confirm('Načíst ukázková data? Tvoje současná data v tomto prohlížeči se přepíšou.')) return;
      state = sampleData(); save(); toast('Ukázková data načtena'); rerender();
    },
  };

  document.addEventListener('click', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.tagName === 'INPUT') return;
    const fn = actions[el.dataset.act];
    if (fn) { e.preventDefault(); fn(el); }
  });
  document.addEventListener('change', (e) => {
    const el = e.target;
    if (el.matches('input[type=checkbox][data-act]')) actions[el.dataset.act](el);
    if (el.dataset.pedit) {
      const m = meetingById(el.dataset.mid);
      m.analysis.tasks[+el.dataset.i].edit[el.dataset.pedit] = el.value;
      save();
    }
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if (e.key === 'Enter' && e.target.matches('.project-card')) e.target.click();
  });
  $('#modal').addEventListener('click', (e) => { if (e.target.id === 'modal') closeModal(); });
  window.addEventListener('hashchange', () => { route(); window.scrollTo(0, 0); });

  // ---------- Start ----------
  load();
  route();
  renderAIStatus();
  checkAI().then(() => { if ((location.hash || '').startsWith('#nastaveni')) rerender(); });
})();
