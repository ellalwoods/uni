/* DuoDisco: the app. Vanilla JS, no build step. Routes live in the URL hash, e.g. #c-ica-w2-t1. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pad = n => String(n).padStart(2, '0');
  const hashStr = s => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
  const slug = s => String(s).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
  const plain = s => String(s ?? '').replace(/\*+/g, '');
  const plural = (n, one, many) => `${n} ${n === 1 ? one : many || one + 's'}`;

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const PKEY = 'uni.progress';
  const blank = () => ({ weeks: {}, cards: {}, quiz: {}, stats: {}, methods: {}, mix: {}, exam: {}, rewards: {}, look: 'classic' });
  let P = Object.assign(blank(), store.get(PKEY, {}));
  const ST = () => (P.stats = P.stats || {});
  const save = () => { P._at = Date.now(); store.set(PKEY, P); cloudPush(); };
  try { localStorage.removeItem('uni.example'); localStorage.removeItem('uni.progress.example'); } catch (e) {}

  /* Courses you add, edit or remove in the app. Saved on this device and in backups.
   * added: courses created in the app; edits: changes to any course; removed: hidden course ids. */
  const CKEY = 'uni.courses';
  const blankCfg = () => ({ added: [], edits: {}, removed: [], assess: {}, events: [], tags: [] });
  let CFG = Object.assign(blankCfg(), store.get(CKEY, {}));
  const saveCfg = () => { CFG._at = Date.now(); store.set(CKEY, CFG); applyCfg(); cloudPush(); };
  /* ---------- sync between devices (Supabase) ----------
   * You sign in with your name and three dance-floor tiles; only a SHA-256 hash of them is sent, as the row id. Progress and course
   * changes each carry the time they last changed (_at); when syncing, the newer copy of each wins.
   * Signing in on a device whose name and tiles already have data merges the two, so nothing is lost. */
  const CLOUD = window.DUODISCO_CLOUD || {};
  const cloudOn = !!(CLOUD.url && CLOUD.key);
  const SKEY = 'uni.sync';
  let SYNC = store.get(SKEY, null);   // { id, name, tiles, at } once signed in
  let syncState = '';                 // '', 'syncing', 'error'
  // The dance floor: nine tiles, you light up three in order. Name + tiles make your sign-in.
  const FLOOR = ['#ff48b0', '#0078bf', '#00a95c', '#ff6c2f', '#765ba7', '#f15060', '#00838a', '#3255a4', '#ffe800'];
  const normName = n => String(n || '').toLowerCase().trim().replace(/\s+/g, ' ');
  async function loginId(name, tiles) {
    const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode('duodisco:' + normName(name) + '|' + tiles.join('-')));
    return [...new Uint8Array(buf)].map(b => b.toString(16).padStart(2, '0')).join('');
  }
  async function rpc(fn, args) {
    const r = await fetch(`${CLOUD.url.replace(/\/$/, '')}/rest/v1/rpc/${fn}`, { method: 'POST',
      headers: { apikey: CLOUD.key, ...(CLOUD.key.startsWith('eyJ') ? { Authorization: `Bearer ${CLOUD.key}` } : {}), 'Content-Type': 'application/json' },
      body: JSON.stringify(args) });
    if (!r.ok) { const e = new Error(`sync ${fn} ${r.status}`); e.status = r.status; throw e; }
    return r.json();
  }
  const snapshot = () => ({ app: 'uni', v: 2, progress: P, courses: CFG });
  let pushTimer = null, pushing = Promise.resolve();
  function cloudPush(now) {
    if (!cloudOn || !SYNC) return;
    clearTimeout(pushTimer);
    const run = () => (pushing = pushing.then(async () => {
      try { const ok = await rpc('duodisco_save', { p_id: SYNC.id, p_state: snapshot(), p_create: false }); syncDone(ok ? '' : 'error'); }
      catch (e) { syncDone('error'); }
    }));
    if (now) return run();
    pushTimer = setTimeout(run, 1500);
  }
  function syncDone(st) {
    syncState = st;
    if (!st && SYNC) { SYNC.at = Date.now(); store.set(SKEY, SYNC); }
    if (current && current.name === 'settings') { const el = document.getElementById('syncstat'); if (el) el.innerHTML = syncLine(); }
  }
  // Newer copy of each part wins.
  function takeNewer(remote) {
    let changed = false;
    if (remote && remote.progress && (remote.progress._at || 0) > (P._at || 0)) { P = Object.assign(blank(), remote.progress); store.set(PKEY, P); changed = true; }
    if (remote && remote.courses && (remote.courses._at || 0) > (CFG._at || 0)) { CFG = Object.assign(blankCfg(), remote.courses); store.set(CKEY, CFG); applyCfg(); changed = true; }
    return changed;
  }
  // Used once, when a device signs in to data that already exists: keep everything from both.
  function mergeAll(remote) {
    const rp = Object.assign(blank(), remote.progress || {}), rc = Object.assign(blankCfg(), remote.courses || {});
    for (const [k, v] of Object.entries(rp.weeks)) P.weeks[k] = Math.min(P.weeks[k] || v, v);
    for (const [k, v] of Object.entries(rp.cards)) if (!P.cards[k] || (v.at || 0) > (P.cards[k].at || 0)) P.cards[k] = v;
    for (const [k, v] of Object.entries(rp.quiz)) if (!P.quiz[k] || v.best > P.quiz[k].best) P.quiz[k] = v;
    rc.added.forEach(a => { if (!CFG.added.some(x => x.id === a.id)) CFG.added.push(a); });
    CFG.edits = Object.assign({}, rc.edits, CFG.edits);
    CFG.removed = [...new Set([...CFG.removed, ...rc.removed])];
    CFG.assess = Object.assign({}, rc.assess, CFG.assess);
    { const have = new Set((CFG.tags || []).map(t => typeof t === 'string' ? t : t.name)); CFG.tags = [...(CFG.tags || []), ...(rc.tags || []).filter(t => !have.has(typeof t === 'string' ? t : t.name))]; }
    CFG.events = [...(CFG.events || []), ...(rc.events || []).filter(e => !(CFG.events || []).some(x => x.id === e.id))];
    P._at = CFG._at = Date.now();
    store.set(PKEY, P); store.set(CKEY, CFG); applyCfg();
  }
  async function cloudPull() {
    if (!cloudOn || !SYNC) return;
    try {
      const res = await rpc('duodisco_load', { p_id: SYNC.id });
      const changed = res && res.state ? takeNewer(res.state) : false;
      syncDone('');
      if (changed && current && !session && !['form', 'search'].includes(current.name)) render();
      if (!res || (res.state && ((P._at || 0) > (res.state.progress?._at || 0) || (CFG._at || 0) > (res.state.courses?._at || 0)))) cloudPush(true);
    } catch (e) { syncDone('error'); }
  }
  // Returns 'joined' (found and merged), 'missing' (nothing saved under these yet) or 'created'.
  async function signIn(name, tiles, create) {
    const id = await loginId(name, tiles), who = { id, name: name.trim(), tiles };
    if (!create) {
      const res = await rpc('duodisco_load', { p_id: id });
      if (!res || !res.state) return 'missing';
      mergeAll(res.state); SYNC = who; store.set(SKEY, SYNC); await cloudPush(true); return 'joined';
    }
    P._at = P._at || Date.now(); CFG._at = CFG._at || Date.now();
    const ok = await rpc('duodisco_save', { p_id: id, p_state: snapshot(), p_create: true });
    if (!ok) throw new Error('create failed');
    SYNC = who; store.set(SKEY, SYNC); syncDone(''); return 'created';
  }
  function syncLine() {
    if (syncState === 'error') return `<span class="sdot err"></span>Couldn’t reach the sync server. Changes are kept on this device and sync when you’re back online.`;
    if (!SYNC || !SYNC.at) return `<span class="sdot"></span>Sync is on.`;
    const mins = Math.round((Date.now() - SYNC.at) / 60000);
    return `<span class="sdot ok"></span>Synced ${mins < 1 ? 'just now' : mins < 60 ? mins + ' min ago' : new Date(SYNC.at).toLocaleString()}.`;
  }
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') cloudPush(true); else cloudPull(); });

  // Course colours: softer shades first, then the original riso inks. All deep enough to read as text and behind white.
  const INKS = [['#ff48b0', 'Pink'], ['#e8608c', 'Rose'], ['#c83f78', 'Raspberry'], ['#f2716a', 'Coral'], ['#e97f5e', 'Peach'], ['#e48a3a', 'Apricot'],
    ['#b04fb8', 'Orchid'], ['#8f6fd1', 'Lilac'], ['#a35d8f', 'Mauve'], ['#9e3a72', 'Berry'], ['#2f9fd6', 'Sky'], ['#159fae', 'Aqua'],
    ['#5f9474', 'Sage'], ['#f15060', 'Red'], ['#ff6c2f', 'Orange'], ['#765ba7', 'Violet'], ['#0078bf', 'Blue'], ['#00a95c', 'Green'], ['#00838a', 'Teal'], ['#3255a4', 'Navy']];
  function applyCfg() {
    // drop app-made courses that were deleted (for example on another device)
    UNI.courses.filter(c => c.mine && !CFG.added.some(a => a.id === c.id)).forEach(c => { UNI.courses.splice(UNI.courses.indexOf(c), 1); delete UNI.byId[c.id]; });
    CFG.added.forEach(a => {
      if (!UNI.byId[a.id]) UNI.addCourse({ id: a.id, mine: true });
      const c = UNI.byId[a.id];
      if (c.mine) c.orig = { name: a.name, short: a.short, colour: a.colour, weeks: a.weeks };
      else c.fromApp = { name: a.name, short: a.short, colour: a.colour };
    });
    UNI.courses.forEach(c => {
      if (!c.orig) c.orig = { name: c.name, short: c.short, colour: c.colour, weeks: c.weeks };
      Object.assign(c, c.orig, c.fromApp || {}, CFG.edits[c.id] || {});
      delete IDX[c.id];
    });
  }

  /* ---------- content ---------- */
  const courses = () => UNI.courses.filter(c => !CFG.removed.includes(c.id));
  const course = id => CFG.removed.includes(id) ? null : UNI.byId[id];
  const week = (c, n) => c.content[n];
  const wkey = (c, n) => c.id + ':' + n;
  const state = (c, n) => !week(c, n) ? 'none' : P.weeks[wkey(c, n)] ? 'studied' : 'new';
  const weeksOf = c => Array.from({ length: c.weeks }, (_, i) => i + 1);
  const addedWeeks = c => weeksOf(c).filter(n => week(c, n));
  const newCount = c => weeksOf(c).filter(n => state(c, n) === 'new').length;
  const topicsOf = w => (w.topics || []).filter(t => t && typeof t === 'object');
  const cardId = (c, n, card) => `${c.id}:${n}:${hashStr(card.q)}`;
  const known = (c, n, card) => (P.cards[cardId(c, n, card)] || {}).last === 'got';
  const missed = (c, n, card) => (P.cards[cardId(c, n, card)] || {}).last === 'again';
  const cv = c => `--c:${c.colour}`;
  const TYPES = { case: 'Cases', law: 'Legislation', term: 'Definitions', idea: 'Concepts' };

  /* Indexes of cases, legislation, definitions and methods, built from the notes blocks. */
  const IDX = {};
  applyCfg();
  function index(c) {
    if (IDX[c.id]) return IDX[c.id];
    const cases = {}, laws = [], terms = [], methods = [], sections = [];
    const walk = (blocks, n, ti) => (blocks || []).forEach(b => {
      if (!b || typeof b !== 'object') return;
      if (b.case) {
        const k = slug(b.case);
        (cases[k] = cases[k] || { slug: k, name: b.case, short: b.short || b.case, entries: [] }).entries.push({ n, ti, block: b });
        walk(b.body, n, ti);
      }
      if (b.law) (b.law.items || []).forEach(([sec, text]) => laws.push({ act: b.law.act, short: b.law.short, sec, text, n, ti }));
      if (b.term) terms.push({ term: b.term, def: b.def, n, ti });
    });
    addedWeeks(c).forEach(n => {
      const w = week(c, n);
      topicsOf(w).forEach((t, ti) => { walk(t.blocks, n, ti); sections.push({ n, ti, title: t.title, text: plain(JSON.stringify(t.blocks || [])) }); });
      if (w.method) methods.push({ n, method: w.method });
    });
    const lookup = {};
    Object.values(cases).forEach(cs => { [cs.name, cs.short, cs.name.replace(/^R v /i, '')].forEach(k => { lookup[k.toLowerCase()] = cs.slug; }); });
    return (IDX[c.id] = { cases, laws, terms, methods, sections, lookup });
  }
  const findCase = (c, name) => {
    const L = index(c).lookup, k = plain(name).toLowerCase().trim();
    if (L[k]) return L[k];
    if (L[k.replace(/^r v /, '')]) return L[k.replace(/^r v /, '')];
    const near = Object.keys(L).find(x => x.startsWith(k + ' '));
    return near ? L[near] : null;
  };

  /* ---------- formatting ---------- */
  // ***Case*** links to the case if it's in this course; **bold**; *italic*; "Week 8" links to that week once added.
  function fmt(s, c) {
    let h = esc(s);
    h = h.replace(/\*\*\*(.+?)\*\*\*/g, (_, name) => {
      const k = c && findCase(c, name);
      return k ? `<button class="cs" data-go="c-${c.id}-case-${k}">${name}</button>` : `<b><i>${name}</i></b>`;
    });
    h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>').replace(/\*(.+?)\*/g, '<i>$1</i>');
    if (c) h = h.replace(/\bWeeks? (\d+)(?: and (\d+))?/g, (m, a, b) => {
      const link = n => week(c, +n) ? `<button class="xref" data-go="c-${c.id}-w${n}">${n}</button>` : n;
      return (m.startsWith('Weeks') ? 'Weeks ' : 'Week ') + link(a) + (b ? ' and ' + link(b) : '');
    });
    return h;
  }
  function blocks(list, c) {
    return (list || []).map(b => {
      if (typeof b === 'string') return `<p>${fmt(b, c)}</p>`;
      if (b.p) return `<p>${fmt(b.p, c)}</p>`;
      if (b.h) return `<h3 class="bh"${b.id ? ` id="${b.id}"` : ''}>${fmt(b.h, c)}</h3>`;
      if (b.ul) return `<ul>${b.ul.map(x => `<li>${fmt(x, c)}</li>`).join('')}</ul>`;
      if (b.ol) return `<ol>${b.ol.map(x => `<li>${fmt(x, c)}</li>`).join('')}</ol>`;
      if (b.term) return `<div class="term"><b>${esc(b.term)}</b><span>${fmt(b.def, c)}</span></div>`;
      if (b.quote) return `<blockquote>${fmt(b.quote, c)}${b.by ? `<cite>${esc(b.by)}</cite>` : ''}</blockquote>`;
      if (b.case) return `<div class="casebox"><button class="cn" data-go="c-${c.id}-case-${slug(b.case)}">${esc(b.case)}</button>${b.judge ? `<div class="cj">${esc(b.judge)}</div>` : ''}${blocks(b.body, c)}</div>`;
      if (b.law) return `<div class="law"><div class="act">${esc(b.law.act)}${b.law.short ? ` <span>(${esc(b.law.short)})</span>` : ''}</div>${b.law.items.map(([s, t]) => `<div class="li"><b>${esc(s)}</b><span>${fmt(t, c)}</span></div>`).join('')}</div>`;
      if (b.table) return `<div class="tw"><table>${b.table.head ? `<thead><tr>${b.table.head.map(x => `<th>${fmt(x, c)}</th>`).join('')}</tr></thead>` : ''}<tbody>${b.table.rows.map(r => `<tr>${r.map(x => `<td>${fmt(x, c)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
      return '';
    }).join('');
  }

  /* ---------- small UI bits ---------- */
  const back = (to, label) => `<button class="back" data-go="${to}">‹ ${esc(label)}</button>`;
  const src = (file, extra) => file ? `<div class="src"><span class="doc"></span><span>${esc(file)}${extra ? ' · ' + esc(extra) : ''}</span></div>` : '';
  const prog = (i, n) => { const m = Math.min(n, 40); return `<div class="prog">${Array.from({ length: m }, (_, k) => `<i class="${k < Math.round(i / n * m) ? 'd' : ''}"></i>`).join('')}</div>`; };
  const searchBtn = c => `<button class="iconbtn" data-go="c-${c.id}-search" aria-label="Search ${esc(c.short || c.name)}"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5"/><path d="M16 16l4.5 4.5"/></svg></button>`;
  const isArts = c => c.type === 'arts';
  const isEssay = w => !!(w && w.essay);
  const tabs = (c, on) => isArts(c) ? '' : `<div class="tabs" role="tablist">${[['', 'Weeks'], ['cases', 'Cases'], ['law', 'Legislation'], ['methods', 'Methods']].map(([k, l]) => `<button role="tab" aria-selected="${on === k}" data-go="c-${c.id}${k ? '-' + k : ''}">${l}</button>`).join('')}</div>`;
  const where = (c, n, ti) => { const w = week(c, n), t = topicsOf(w)[ti]; return `Week ${n}${t ? ' · ' + esc(t.title) : ''}`; };
  let toastTimer;
  function toast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
  }
  const go = r => { location.hash = r; };

  /* ---------- home ---------- */
  function home() {
    const cs = courses();
    const rows = cs.map(c => {
      const a = addedWeeks(c).length, nw = newCount(c);
      return `<button class="crow" style="${cv(c)}" data-go="c-${c.id}">
        <div class="nm">${esc(c.name)}</div>
        <div class="segwrap">${dueRow(c)}<div class="segs" style="--n:${c.weeks}">${weeksOf(c).map(n => `<i class="${state(c, n)}"></i>`).join('')}</div></div>
        <div class="st"><span>${a} of ${c.weeks} weeks added</span>${nw ? `<b>${nw} new</b>` : '<span></span>'}</div></button>`;
    }).join('');
    return `<div class="screen">
      <div class="bar"><button class="logo" data-go="ballroom" aria-label="DuoDisco: open the Ballroom">${myBall(30)}DuoDisco</button>
        <span class="barbtns"><button class="iconbtn" data-go="new-course" aria-label="Add a course"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        <button class="iconbtn" data-go="calendar" aria-label="Calendar"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="5" width="17" height="15.5" rx="3"/><path d="M3.5 10h17M8 3v4M16 3v4"/></svg></button>
        <button class="iconbtn" data-go="settings" aria-label="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button></span></div>
      <h1 class="title">Courses</h1>
      ${rows ? rows + `<button class="addrow" data-go="new-course"><span>+</span>Add a course</button>` : `<div class="empty"><p>No courses yet. Add each course you’re taking this semester, then upload a week’s notes to Claude to fill it in.</p><button class="btn" style="--c:#ff48b0" data-go="new-course">Add your first course</button></div>`}
      <p class="note">New weeks appear here once their notes have been added.</p>
    </div>`;
  }

  /* ---------- semester calendar: one row per week, Monday to Sunday (content/calendar.js) ----------
   * Dates you add: CFG.events = [{ id, from, to, label, kind, course, tags: [tagName] }].
   * Tags you make: CFG.tags = [{ name, colour }]. A date is coloured by its first tag, else its subject.
   * Assessments are dates of kind 'assess' with a subject; the course shows them in their week. */
  const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const isoAdd = (iso, k) => { const x = new Date(iso + 'T00:00:00Z'); x.setUTCDate(x.getUTCDate() + k); return x.toISOString().slice(0, 10); };
  const isoDate = iso => `${+iso.slice(8)} ${MONTHS[+iso.slice(5, 7) - 1]}`;
  const CAL_KINDS = [['assess', 'Assessment'], ['exam', 'Exam'], ['class', 'Class'], ['other', 'Other']];
  const newId = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
  const eventsOf = () => CFG.events || [];
  const tagsOf = () => (CFG.tags || []).map(t => typeof t === 'string' ? { name: t, colour: '#5c5a55' } : t);
  const tagOf = name => tagsOf().find(t => t.name === name);
  const evColour = e => (e.tags || []).map(n => (tagOf(n) || {}).colour).find(Boolean) || ((e.course && course(e.course)) || {}).colour || '#5c5a55';
  let calDraft = null;
  const calRows = () => (window.UNI_CALENDAR && window.UNI_CALENDAR.rows) || [];
  // Monday of course week n, from the calendar; and the course week a date falls in (null in breaks)
  const weekMonday = n => { const r = calRows().find(x => x.week === n); return r ? r.start : ''; };
  const weekOfDate = iso => { const r = calRows().find(x => x.week && iso >= x.start && iso <= isoAdd(x.start, 6)); return r ? r.week : null; };

  function calendarPage() {
    const cal = window.UNI_CALENDAR;
    if (!cal) return `<div class="screen">${back('home', 'Courses')}<p class="note">The calendar isn’t available.</p></div>`;
    const tone = iso => { const p = cal.periods.find(x => iso >= x.from && iso <= x.to); return p ? p.kind : ''; };
    const evOn = {};
    eventsOf().forEach(e => { for (let iso = e.from; iso <= e.to && iso < isoAdd(e.from, 120); iso = isoAdd(iso, 1)) (evOn[iso] = evOn[iso] || []).push(e); });
    const rows = cal.rows.map(r => {
      const end = isoAdd(r.start, 6);
      const days = Array.from({ length: 7 }, (_, k) => {
        const iso = isoAdd(r.start, k), d = +iso.slice(8), evs = evOn[iso] || [];
        return `<div class="cday ${tone(iso)}" data-act="cal-add" data-d="${iso}" role="button" tabindex="0" aria-label="Add to ${isoDate(iso)}"><b>${d}</b>${evs.map(e => `<button class="cev" data-act="cal-edit" data-id="${e.id}" style="--t:${evColour(e)}">${esc(e.label)}</button>`).join('')}</div>`;
      }).join('');
      const label = r.week ? `<b class="cwn">${pad(r.week)}</b><span>Week · ${isoDate(r.start)}</span>` : `<b>${esc(r.name)}</b><span>${isoDate(r.start)} – ${isoDate(end)}</span>`;
      return `<div class="crow2"><div class="crl">${label}</div>${days}</div>`;
    }).join('');
    return `<div class="screen calscreen">
      <div class="bar">${back('home', 'Courses')}<span class="barbtns"><button class="iconbtn" data-act="cal-add" data-d="2027-02-22" aria-label="Add to the calendar"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button></span></div>
      <h1 class="title">${esc(cal.name)}</h1>
      <div class="cal">
        <div class="chead"><div></div>${['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map(x => `<div>${x}</div>`).join('')}</div>
        ${rows}
      </div>
    </div>`;
  }

  // Read what's typed into the form back into the draft, so toggling a chip doesn't lose it.
  const calCapture = () => {
    const v = id => document.getElementById(id);
    if (!calDraft || !v('cal-label')) return;
    calDraft.label = v('cal-label').value; calDraft.from = v('cal-from').value; calDraft.to = v('cal-to').value;
    calDraft.newName = v('tag-new') ? v('tag-new').value : (calDraft.newName || '');
  };
  const chip = (on, attrs, text, colour) => `<button type="button" class="chip ${on ? 'on' : ''}" ${attrs} style="${colour ? `--t:${colour}` : ''}">${esc(text)}</button>`;
  function calendarAddPage() {
    const ed = calDraft && calDraft.id ? calDraft : null;
    const d = calDraft || { from: '2027-02-22', to: '2027-02-22' };
    const kind = d.kind || 'assess', tags = d.tags || [];
    const newColour = d.newColour || INKS[0][0];
    return `<div class="screen calform">${back('calendar', 'Calendar')}
      <h1 class="title" style="margin-top:12px">${ed ? 'Edit' : 'Add to the calendar'}</h1>
      <input id="cal-label" class="calname" maxlength="60" value="${esc(d.label || '')}" placeholder="What is it? e.g. Essay 1" autocomplete="off">
      <div class="calgroup"><span class="calk">Type</span><div class="chips">${CAL_KINDS.map(([k, n]) => chip(k === kind, `data-act="cal-kind" data-k="${k}"`, n)).join('')}</div></div>
      <div class="calgroup"><span class="calk">Subject</span><div class="chips">${courses().map(c => chip(d.course === c.id, `data-act="cal-subject" data-k="${c.id}"`, c.short || c.name, c.colour)).join('')}</div></div>
      <div class="calgroup"><span class="calk">Tags</span><div class="chips">${tagsOf().map(t => `<span class="tagwrap">${chip(tags.includes(t.name), `data-act="cal-tag" data-k="${esc(t.name)}"`, t.name, t.colour)}<button type="button" class="tagx" data-act="cal-tag-del" data-k="${esc(t.name)}" aria-label="Delete tag ${esc(t.name)}">×</button></span>`).join('')}</div>
        <div class="newtag"><input id="tag-new" maxlength="24" value="${esc(d.newName || '')}" placeholder="New tag, e.g. Work" autocomplete="off">
        <div class="swatches">${INKS.map(([h, n]) => `<button type="button" class="sw2 ${h === newColour ? 'on' : ''}" style="--k:${h}" data-act="cal-colour" data-k="${h}" aria-label="${n}"></button>`).join('')}</div>
        <button type="button" class="btn small ghost" data-act="cal-tag-add">Add tag</button></div></div>
      <div class="calgroup calwhen"><label class="calk" for="cal-from">From</label><label class="calk" for="cal-to">To</label><input id="cal-from" type="date" value="${d.from}"><input id="cal-to" type="date" value="${d.to}"></div>
      <p class="formerr" id="cerr" role="alert"></p>
      <button class="btn" data-act="cal-save">${ed ? 'Save changes' : 'Add to calendar'}</button>
      ${ed ? `<div class="set danger"><button class="btn small ghost" data-act="cal-del" data-id="${ed.id}">Delete this date</button></div>` : ''}
    </div>`;
  }

  /* ---------- course: weeks, cases, legislation, methods, search ---------- */
  function courseHead(c, tab) {
    const a = addedWeeks(c).length;
    return `<div class="bar">${back('home', 'Courses')}<span class="barbtns"><button class="textbtn" data-go="edit-${c.id}">Edit</button>${isArts(c) ? '' : searchBtn(c)}</span></div>
      <h1 class="ctitle">${esc(c.name)}</h1>
      <div class="meta" style="margin-top:6px">${a} of ${c.weeks} weeks added</div>
      ${tabs(c, tab)}`;
  }
  function coursePage(c) {
    const a = addedWeeks(c).length;
    const cells = weeksOf(c).map(n => {
      const s = state(c, n), w = week(c, n);
      const label = s === 'none' ? '' : s === 'new' ? `<b>New</b> · ${esc(w.title)}` : esc(w.title);
      const due = dueOf(c, n);
      return `<button class="cell ${s}" ${s === 'none' ? `data-none="${n}"` : `data-go="c-${c.id}-w${n}"`} aria-label="Week ${n}${w ? ': ' + esc(w.title) : ', not added yet'}${due ? ', assessment: ' + esc(due) : ''}">
        ${due ? `<span class="due">${esc(due)}</span>` : ''}<div class="n">${pad(n)}</div><div class="t">${label}</div></button>`;
    }).join('');
    return `<div class="screen ${a ? 'has-dock' : ''}" style="${cv(c)}">${courseHead(c, '')}
      <div class="grid">${cells}</div>
      <div class="key"><span><i style="background:var(--c)"></i>Studied</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--c)"></i>New</span><span><i style="background:var(--faint)"></i>Not added yet</span></div>
      ${a && addedWeeks(c).every(n => isEssay(week(c, n))) ? `<div class="dock"><div class="two"><button class="btn" data-go="c-${c.id}-theses">All theses</button><button class="btn ghost" data-go="c-${c.id}-plans">All plans</button></div><div class="dockcap">Recall the thesis or the plan of every essay added</div></div>`
        : a ? `<div class="dock"><div class="two"><button class="btn" data-go="c-${c.id}-all-cards">Flashcards</button><button class="btn ghost" data-go="c-${c.id}-all-quiz">Quiz</button></div><div class="dockcap">From all ${plural(a, 'week')} added</div></div>`
          : `<p class="note">Nothing to study yet. Weeks show up here once their notes are added.</p>`}
    </div>`;
  }
  function caseRow(c, cs) {
    const e = cs.entries[0], first = (e.block.body || []).find(x => typeof x === 'string') || '';
    const weeks = [...new Set(cs.entries.map(x => x.n))];
    return `<button class="lrow" data-go="c-${c.id}-case-${cs.slug}"><b>${esc(cs.name)}</b><span class="lmeta">${weeks.map(n => 'Week ' + n).join(', ')} · ${esc(topicsOf(week(c, e.n))[e.ti]?.title || '')}</span><span class="lsnip">${esc(plain(first))}</span></button>`;
  }
  function casesPage(c, n) {
    const all = Object.values(index(c).cases).filter(cs => !n || cs.entries.some(e => e.n === n)).sort((a, b) => a.name.replace(/^R v /, '').localeCompare(b.name.replace(/^R v /, '')));
    let letter = '', list = '';
    all.forEach(cs => { const L = cs.name.replace(/^R v /, '')[0].toUpperCase(); if (L !== letter) { letter = L; list += `<div class="letter">${L}</div>`; } list += caseRow(c, cs); });
    const head = n ? `<div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">${plural(all.length, 'case')}</span></div><h1 class="wtitle" style="margin-top:14px">Cases in week ${n}</h1>` : courseHead(c, 'cases');
    return `<div class="screen" style="${cv(c)}">${head}${list || `<p class="note">No cases yet.</p>`}${n ? '' : `<p class="note">Cases are listed by name, ignoring ‘R v’.</p>`}</div>`;
  }
  function lawPage(c, n) {
    const laws = index(c).laws.filter(l => !n || l.n === n);
    const byAct = {}; laws.forEach(l => (byAct[l.act] = byAct[l.act] || []).push(l));
    const list = Object.entries(byAct).map(([act, ls]) => `<div class="letter">${esc(act)}</div>${ls.map(l => `<button class="lrow" data-go="c-${c.id}-w${l.n}-t${l.ti}"><b>${esc(l.sec)}</b><span class="lsnip" style="-webkit-line-clamp:unset">${fmt(l.text, null)}</span><span class="lmeta">${where(c, l.n, l.ti)}</span></button>`).join('')}`).join('');
    const head = n ? `<div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">${plural(laws.length, 'section')}</span></div><h1 class="wtitle" style="margin-top:14px">Legislation in week ${n}</h1>` : courseHead(c, 'law');
    return `<div class="screen" style="${cv(c)}">${head}${list || `<p class="note">No legislation yet.</p>`}</div>`;
  }
  function termsPage(c, n) {
    const ts = index(c).terms.filter(t => t.n === n);
    return `<div class="screen" style="${cv(c)}"><div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">${plural(ts.length, 'definition')}</span></div>
      <h1 class="wtitle" style="margin-top:14px">Definitions in week ${n}</h1>
      ${ts.map(t => `<div class="term" style="margin-top:12px"><b>${esc(t.term)}</b><span>${fmt(t.def, c)}</span></div>`).join('')}</div>`;
  }
  function methodsPage(c) {
    const ms = index(c).methods;
    return `<div class="screen" style="${cv(c)}">${courseHead(c, 'methods')}
      ${ms.map(m => `<button class="lrow" data-go="c-${c.id}-w${m.n}-method"><b>${esc(m.method.title)}</b><span class="lmeta">Week ${m.n} · ${plural(m.method.steps.length, 'step')}</span></button>`).join('') || `<p class="note">No problem-question methods yet.</p>`}
      ${ms.length ? `<p class="note">Each method is the step-by-step approach to a problem question from your notes.</p>` : ''}</div>`;
  }
  function searchPage(c) {
    return `<div class="screen" style="${cv(c)}"><div class="bar">${back('c-' + c.id, c.short || c.name)}<span class="meta">Search</span></div>
      <input class="search" id="q" type="search" placeholder="Search cases, sections, terms and notes" autocomplete="off" aria-label="Search ${esc(c.name)}">
      <div id="results"><p class="note">Search everything added to ${esc(c.short || c.name)}.</p></div></div>`;
  }
  function searchResults(c, q) {
    q = q.trim().toLowerCase(); if (q.length < 2) return `<p class="note">Type at least two letters.</p>`;
    const I = index(c), hit = s => plain(s).toLowerCase().includes(q);
    const cases = Object.values(I.cases).filter(cs => hit(cs.name) || cs.entries.some(e => hit(JSON.stringify(e.block.body))));
    const laws = I.laws.filter(l => hit(l.sec) || hit(l.text) || hit(l.act));
    const terms = I.terms.filter(t => hit(t.term) || hit(t.def));
    const secs = I.sections.filter(s => hit(s.title) || s.text.toLowerCase().includes(q));
    const grp = (h, items) => items ? `<div class="letter">${h}</div>${items}` : '';
    const out = grp('Cases', cases.slice(0, 20).map(cs => caseRow(c, cs)).join('')) +
      grp('Legislation', laws.slice(0, 20).map(l => `<button class="lrow" data-go="c-${c.id}-w${l.n}-t${l.ti}"><b>${esc(l.short || l.act)} ${esc(l.sec)}</b><span class="lsnip">${esc(plain(l.text))}</span><span class="lmeta">${where(c, l.n, l.ti)}</span></button>`).join('')) +
      grp('Definitions', terms.slice(0, 20).map(t => `<button class="lrow" data-go="c-${c.id}-w${t.n}-t${t.ti}"><b>${esc(t.term)}</b><span class="lsnip">${esc(plain(t.def))}</span><span class="lmeta">${where(c, t.n, t.ti)}</span></button>`).join('')) +
      grp('In the notes', secs.slice(0, 20).map(s => `<button class="lrow" data-go="c-${c.id}-w${s.n}-t${s.ti}"><b>${esc(s.title)}</b><span class="lmeta">Week ${s.n}</span></button>`).join(''));
    return out || `<p class="note">Nothing found for “${esc(q)}”.</p>`;
  }
  function casePage(c, k) {
    const cs = index(c).cases[k];
    if (!cs) return coursePage(c);
    const mentions = index(c).sections.filter(s => s.text.toLowerCase().includes(cs.short.toLowerCase()) && !cs.entries.some(e => e.n === s.n && e.ti === s.ti));
    return `<div class="screen" style="${cv(c)}"><div class="bar">${back('c-' + c.id + '-cases', 'Cases')}${searchBtn(c)}</div>
      <h1 class="wtitle" style="margin-top:14px;color:var(--c)">${esc(cs.name)}</h1>
      ${cs.entries.map(e => `<div class="appear"><button class="lmeta xlink" data-go="c-${c.id}-w${e.n}-t${e.ti}">${where(c, e.n, e.ti)} ›</button>${e.block.judge ? `<div class="cj">${esc(e.block.judge)}</div>` : ''}<div class="prose">${blocks(e.block.body, c)}</div></div>`).join('')}
      ${mentions.length ? `<div class="sub">Also mentioned in</div>${mentions.map(s => `<button class="lrow" data-go="c-${c.id}-w${s.n}-t${s.ti}"><b>${esc(s.title)}</b><span class="lmeta">Week ${s.n}</span></button>`).join('')}` : ''}
    </div>`;
  }

  /* ---------- week ---------- */
  function weekPage(c, n) {
    const w = week(c, n), I = index(c), ts = topicsOf(w);
    if (!P.weeks[wkey(c, n)]) { P.weeks[wkey(c, n)] = Date.now(); save(); }
    const cards = w.cards || [], k = cards.filter(card => known(c, n, card)).length;
    const best = P.quiz[wkey(c, n)];
    const nCases = Object.values(I.cases).filter(cs => cs.entries.some(e => e.n === n)).length;
    const nLaw = I.laws.filter(l => l.n === n).length, nTerms = I.terms.filter(t => t.n === n).length;
    const per = ti => { const cc = Object.values(I.cases).filter(cs => cs.entries.some(e => e.n === n && e.ti === ti)).length, fc = cards.filter(x => x.topic === ti).length;
      return [cc && plural(cc, 'case'), fc && plural(fc, 'card')].filter(Boolean).join(' · '); };
    const tools = [
      nCases && `<button class="tool" data-go="c-${c.id}-w${n}-cases"><b>${nCases}</b><span>Cases</span></button>`,
      nLaw && `<button class="tool" data-go="c-${c.id}-w${n}-law"><b>${nLaw}</b><span>Sections</span></button>`,
      nTerms && `<button class="tool" data-go="c-${c.id}-w${n}-terms"><b>${nTerms}</b><span>Definitions</span></button>`,
      w.method && `<button class="tool" data-go="c-${c.id}-w${n}-method"><b>${w.method.steps.length}</b><span>Method steps</span></button>`].filter(Boolean);
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back('c-' + c.id, c.short || c.name)}<span class="meta">Week ${n} of ${c.weeks}</span></div>
      <div class="wnum">${pad(n)}</div>
      <h1 class="wtitle">${esc(w.title)}</h1>
      ${assessLine(c, n)}
      ${src(w.source?.file, w.source?.pages || '')}
      <div class="modes">
        <button class="mode main" data-go="c-${c.id}-w${n}-cards"><b>Flashcards</b><small>${plural(cards.length, 'card')}${k ? ` · ${k} known` : ''}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-quiz"><b>Quiz</b><small>${plural((w.quiz || []).length, 'question')}${best ? ` · best ${best.best}/${best.of}` : ''}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-t0"><b>Notes</b><small>${plural(ts.length, 'topic')}</small></button>
      </div>
      ${ts.length ? `<div class="sub">Topics</div><ol class="topics">${ts.map((t, ti) => `<li><button data-go="c-${c.id}-w${n}-t${ti}"><span>${esc(t.title)}</span><small>${per(ti)}</small></button></li>`).join('')}</ol>` : ''}
      ${tools.length ? `<div class="sub">In this week</div><div class="tools">${tools.join('')}</div>` : ''}
    </div>`;
  }
  function topicPage(c, n, ti) {
    const w = week(c, n), ts = topicsOf(w), t = ts[ti];
    if (!t) return weekPage(c, n);
    const fc = (w.cards || []).filter(x => x.topic === ti).length;
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">Topic ${ti + 1} of ${ts.length}</span></div>
      <div class="outline">${ts.map((x, i) => `<button class="${i === ti ? 'on' : ''}" data-go="c-${c.id}-w${n}-t${i}" aria-label="Topic ${i + 1}: ${esc(x.title)}">${i + 1}</button>`).join('')}</div>
      <h1 class="wtitle" style="margin-top:10px">${esc(t.title)}</h1>
      ${t.ref ? `<div class="src"><span class="doc"></span><span>${esc(w.source?.file || 'Notes')}, ${esc(t.ref)}</span></div>` : ''}
      ${toc(t)}
      <div class="prose">${blocks(t.blocks, c)}</div>
      ${fc ? `<button class="btn" style="margin-top:24px" data-act="topic-cards" data-ti="${ti}">Flashcards for this topic (${fc})</button>` : ''}
      <div class="pager">${ti > 0 ? `<button data-go="c-${c.id}-w${n}-t${ti - 1}">‹ ${esc(ts[ti - 1].title)}</button>` : '<span></span>'}${ti < ts.length - 1 ? `<button data-go="c-${c.id}-w${n}-t${ti + 1}">${esc(ts[ti + 1].title)} ›</button>` : (w.method ? `<button data-go="c-${c.id}-w${n}-method">Problem method ›</button>` : '<span></span>')}</div>
    </div>`;
  }
  // A jump list for long topics: their own sub-headings (not those inside case boxes).
  function toc(t) {
    const hs = (t.blocks || []).filter(b => b && b.h);
    if (hs.length < 3) return '';
    hs.forEach((b, i) => { b.id = 'h' + i; });
    return `<div class="toc"><div class="lbl">In this topic</div>${hs.map(b => `<button data-scroll="${b.id}">${esc(plain(b.h))}</button>`).join('')}</div>`;
  }
  let practise = null;
  function methodPage(c, n) {
    const w = week(c, n), m = w.method, pr = practise && practise.key === wkey(c, n) ? practise : null;
    const steps = m.steps.map((s, i) => {
      const hidden = pr && i >= pr.shown;
      return `<li class="${hidden ? 'hid' : ''}">${hidden ? `<span class="ph">Step ${i + 1}</span>` : `<div class="stt">${fmt(s.t, c)}</div>${s.sub ? `<ul>${s.sub.map(x => `<li>${fmt(x, c)}</li>`).join('')}</ul>` : ''}`}</li>`;
    }).join('');
    const done = pr && pr.shown >= m.steps.length;
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">Problem method</span></div>
      <h1 class="wtitle" style="margin-top:14px">${esc(m.title)}</h1>
      ${m.ref ? `<div class="src"><span class="doc"></span><span>${esc(w.source?.file || 'Notes')}, ${esc(m.ref)}</span></div>` : ''}
      ${pr ? `<p class="note">Say the next step to yourself, then reveal it.</p>` : ''}
      <ol class="steps">${steps}</ol>
      <div class="dock">${pr ? (done ? `<button class="btn" data-act="practise-stop">Done</button>` : `<button class="btn" data-act="practise-next">Reveal step ${pr.shown + 1}</button><button class="btn ghost" data-act="practise-stop">Show all steps</button>`)
                              : `<button class="btn" data-act="practise">Practise from memory</button>`}</div>
    </div>`;
  }

  /* ---------- flashcards ---------- */
  let session = null, preset = null;
  function pool(c, n, kind) {
    const ns = n === 'all' ? addedWeeks(c) : [n];
    return ns.flatMap(x => (week(c, x)[kind] || []).map(item => ({ item, n: x })));
  }
  const filters = (c, n) => {
    const all = pool(c, n, 'cards'), f = [['all', 'All cards', all]];
    if (n !== 'all') topicsOf(week(c, n)).forEach((t, ti) => f.push(['t' + ti, t.title, all.filter(x => x.item.topic === ti)]));
    Object.entries(TYPES).forEach(([k, l]) => f.push([k, l, all.filter(x => x.item.type === k)]));
    f.push(['missed', 'Missed last time', all.filter(x => missed(c, x.n, x.item))]);
    return f.filter(([k, , items]) => items.length || k === 'missed' || k === 'all');
  };
  function cardsSetup(c, n, route) {
    const fs = filters(c, n), s = session;
    const chosen = fs.find(f => f[0] === s.filter) || fs[0], count = chosen[2].length;
    const lens = [10, 20, 0].filter(x => !x || x < count);
    const len = lens.includes(s.len) ? s.len : (count > 20 ? 20 : 0);
    const backTo = n === 'all' ? 'c-' + c.id : `c-${c.id}-w${n}`;
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(backTo, n === 'all' ? (c.short || c.name) : 'Week ' + n)}<span class="meta">Flashcards</span></div>
      <h1 class="wtitle" style="margin-top:14px">${n === 'all' ? 'All weeks' : esc(week(c, n).title)}</h1>
      <div class="sub">Which cards</div>
      <div class="chips">${fs.map(([k, l, items]) => `<button class="chip" aria-pressed="${k === chosen[0]}" data-filter="${k}" ${items.length ? '' : 'disabled'}>${esc(l)} <span>${items.length}</span></button>`).join('')}</div>
      ${count > 10 ? `<div class="sub">How many</div><div class="chips">${lens.map(x => `<button class="chip" aria-pressed="${x === len}" data-len="${x}">${x || 'All ' + count}</button>`).join('')}</div>` : ''}
      <div class="dock"><button class="btn" data-act="start" ${count ? '' : 'disabled'}>Start · ${plural(len && len < count ? len : count, 'card')}</button></div>
    </div>`;
  }
  function startCards(c, n) {
    const fs = filters(c, n), chosen = fs.find(f => f[0] === session.filter) || fs[0];
    let items = shuffle(chosen[2]); const len = session.len && session.len < items.length ? session.len : items.length;
    items = items.slice(0, len);
    Object.assign(session, { started: true, queue: items, total: items.length, done: 0, got: 0, again: [], open: false });
  }
  function cardsPage(c, n, route) {
    const s = session;
    if (!s.started) return cardsSetup(c, n, route);
    const backTo = n === 'all' ? 'c-' + c.id : `c-${c.id}-w${n}`;
    const backLabel = n === 'all' ? (c.short || c.name) : 'Week ' + n;
    if (!s.queue.length && !s.logged) {
      s.logged = true;
      if (n === 'all') { P.mix = P.mix || {}; P.mix[c.id] = Date.now(); }
      else if (s.total >= 5 && s.got === s.total && (Date.now() - (P.weeks[wkey(c, n)] || Date.now())) > 21 * 864e5) ST().encore = Date.now();
      save();
    }
    if (!s.queue.length) return `<div class="screen result" style="${cv(c)}">
        <div class="bar">${back(backTo, backLabel)}<span class="meta">Flashcards</span></div>
        <div class="big">${s.got}/${s.total}</div><p>You knew ${s.got} of ${s.total} cards first time.</p>
        <div class="dock">${s.again.length ? `<button class="btn" data-act="cards-again">Go through the ${s.again.length} you missed</button>` : ''}
        <button class="btn ${s.again.length ? 'ghost' : ''}" data-act="cards-new">Choose more cards</button><button class="btn ghost" data-go="${backTo}">Done</button></div></div>`;
    const { item, n: wn } = s.queue[0], w = week(c, wn), t = topicsOf(w)[item.topic];
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(backTo, backLabel)}<span class="meta">${s.done + 1} of ${s.done + s.queue.length}</span></div>
      ${prog(s.done, s.done + s.queue.length)}
      <div class="ghostnum" aria-hidden="true">${pad(wn)}</div>
      <div class="card"><div class="k">Week ${wn}${t ? ' · ' + esc(t.title) : ''}</div>
        <div class="q">${esc(item.q)}</div>
        ${s.open ? `<div class="a">${esc(item.a)}</div><div class="ref">From ${esc(w.source?.file || 'your notes')}${item.ref ? ', ' + esc(item.ref) : ''}${t ? ` · <button class="xref" data-go="c-${c.id}-w${wn}-t${item.topic}">read the notes</button>` : ''}</div>` : ''}</div>
      <div class="dock">${s.open ? `<div class="two"><button class="btn ghost" data-act="again">See again</button><button class="btn" data-act="got">Got it</button></div>`
                                  : `<button class="btn" data-act="show">Show answer</button>`}</div>
    </div>`;
  }
  function answerCard(c, gotIt) {
    const s = session, cur = s.queue.shift(), id = cardId(c, cur.n, cur.item);
    const rec = P.cards[id] || { got: 0, again: 0 };
    rec[gotIt ? 'got' : 'again']++; rec.last = gotIt && !cur.missed ? 'got' : 'again'; rec.at = Date.now(); P.cards[id] = rec;
    if (gotIt) ST().got = (ST().got || 0) + 1;
    save();
    if (gotIt) { if (!cur.missed) s.got++; s.done++; }
    else { if (!cur.missed) s.again.push(cur); cur.missed = true; s.queue.push(cur); }
    s.open = false;
  }

  /* ---------- quiz ---------- */
  function startQuiz(c, n, route) {
    let items = shuffle(pool(c, n, 'quiz'));
    if (n === 'all') items = items.slice(0, 15);
    session = { route, kind: 'quiz', items, i: 0, score: 0, picked: null };
  }
  function quizPage(c, n) {
    const s = session;
    const backTo = n === 'all' ? 'c-' + c.id : `c-${c.id}-w${n}`;
    const backLabel = n === 'all' ? (c.short || c.name) : 'Week ' + n;
    if (!s.items.length) return emptyStudy(c, backTo, backLabel, 'There are no quiz questions here yet.');
    if (s.i >= s.items.length) {
      if (!s.saved) {
        s.saved = true;
        if (n === 'all') { P.exam = P.exam || {}; P.exam[c.id] = Math.max(P.exam[c.id] || 0, s.score / s.items.length); }
        else {
          const k = wkey(c, n), prev = P.quiz[k], low = !!(prev && prev.low) || s.score < s.items.length / 2;
          if (s.score === s.items.length && prev && prev.low) ST().comeback = Date.now();
          P.quiz[k] = (!prev || s.score >= prev.best) ? { best: s.score, of: s.items.length, at: Date.now(), low } : { ...prev, low };
        }
        save();
      }
      return `<div class="screen result" style="${cv(c)}">
        <div class="bar">${back(backTo, backLabel)}<span class="meta">Quiz</span></div>
        <div class="big">${s.score}/${s.items.length}</div><p>${s.score === s.items.length ? 'All correct.' : `You got ${s.score} of ${s.items.length} right.`}</p>
        <div class="dock"><button class="btn" data-act="quiz-again">${n === 'all' ? 'New quiz' : 'Try again'}</button><button class="btn ghost" data-go="${backTo}">Done</button></div></div>`;
    }
    const { item, n: wn } = s.items[s.i], picked = s.picked, w = week(c, wn), t = topicsOf(w)[item.topic];
    const opts = item.options.map((o, k) => {
      const cls = picked == null ? '' : k === item.answer ? 'right' : k === picked ? 'wrong' : '';
      return `<button class="opt ${cls}" data-pick="${k}" ${picked != null ? 'disabled' : ''}><span class="l">${'ABCDEF'[k]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(backTo, backLabel)}<span class="meta">${s.i + 1} of ${s.items.length}</span></div>
      ${prog(s.i, s.items.length)}
      <div class="card"><div class="k">Week ${wn}${t ? ' · ' + esc(t.title) : ' · Quiz'}</div><div class="q">${esc(item.q)}</div></div>
      <div class="opts">${opts}</div>
      ${picked != null ? `<div class="why"><b>${picked === item.answer ? 'Correct.' : 'Not quite.'}</b>${esc(item.why || '')}<div class="ref">From ${esc(w.source?.file || 'your notes')}${item.ref ? ', ' + esc(item.ref) : ''}</div></div>` : ''}
      ${picked != null ? `<div class="dock"><button class="btn" data-act="next">${s.i + 1 < s.items.length ? 'Next question' : 'See result'}</button></div>` : ''}
    </div>`;
  }
  const emptyStudy = (c, backTo, label, msg) => `<div class="screen" style="${cv(c)}"><div class="bar">${back(backTo, label)}<span></span></div><p class="note" style="margin-top:30px">${msg}</p></div>`;

  /* ---------- essays (arts courses): thesis, plan, then each paragraph sentence by sentence ----------
   * Answers are typed and marked on key words: common words are ignored, names, years and capitalised
   * terms count double, word endings and small typos are forgiven. 60% of the weighted key words is
   * "substantially right". */
  const STOP = new Set(('a an the and or but if of to in on at by for with from as is are was were be been being it its this that these those which who whom whose what when where while there their they them he she his her hers we our you your i not no so than then also can could would should may might must will shall do does did has have had into onto over under about after before between through because only more most less much many some such each other both all any very just own same too up out off once again further how why whether yet still even').split(' '));
  const PASS = .6, NEAR = .4;
  const words = t => (String(t).replace(/\*/g, '').replace(/[’‘]/g, "'").replace(/'s\b/gi, '').match(/[A-Za-z0-9]+/g) || []);
  const stem = w => { w = w.toLowerCase(); if (w.length > 5 && w.endsWith('ies')) return w.slice(0, -3) + 'y'; for (const x of ['ing', 'ed', 'es', 's', 'ly']) if (w.length > x.length + 3 && w.endsWith(x)) return w.slice(0, -x.length); return w; };
  function keywords(model) {
    const K = new Map();
    words(model).forEach((w, i) => {
      const l = w.toLowerCase(); if (STOP.has(l) || l.length < 2) return;
      const big = /^\d/.test(w) || (i > 0 && /^[A-Z]/.test(w)), k = stem(w);
      K.set(k, Math.max(K.get(k) || 0, big ? 2 : 1));
    });
    return K;
  }
  function lev(a, b) {
    const d = Array.from({ length: a.length + 1 }, (_, i) => [i]);
    for (let j = 1; j <= b.length; j++) d[0][j] = j;
    for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    return d[a.length][b.length];
  }
  function mark(model, answer) {
    const K = keywords(model), A = [...new Set(words(answer).map(stem))];
    let tot = 0, got = 0; const hit = new Set();
    K.forEach((wt, k) => {
      tot += wt;
      if (A.includes(k) || A.some(a => a.length >= 4 && k.length >= 4 && a.slice(0, 3) === k.slice(0, 3) && lev(a, k) <= (k.length >= 8 ? 2 : 1))) { got += wt; hit.add(k); }
    });
    return { pct: tot ? got / tot : 0, hit, K };
  }
  // The model text with its key words marked: found in your answer, or missed.
  function marked(model, res) {
    return esc(String(model).replace(/\*/g, '')).replace(/[A-Za-z0-9]+/g, w => {
      const k = stem(w);
      if (!res.K.has(k) || STOP.has(w.toLowerCase())) return w;
      return `<mark class="${res.hit.has(k) ? 'kh' : 'km'}">${w}</mark>`;
    });
  }
  const TAGL = { lecture: 'Lecture', theory: 'Theory', example: 'Example', beyond: 'Beyond', reading: 'Reading', counter: 'Counter' };
  const tagChips = tags => (tags || []).map(t => `<span class="tag t-${t}">${TAGL[t] || esc(t)}</span>`).join('');
  const secsOf = w => w.essay.sections;
  const parasOf = w => secsOf(w).filter(x => x.kind === 'para');
  const thesisOf = w => { for (const x of secsOf(w)) for (const t of x.sentences) if (t.thesis) return t.s; return ''; };
  const secName = (x, w) => x.kind === 'para' ? `Paragraph ${parasOf(w).indexOf(x) + 1}` : x.title;
  const ekey = (c, n, k) => `${c.id}:${n}:${k}`;
  const sentKey = (si, j, t) => t.thesis ? 'thesis' : `s${si}-${j}`;
  const eRec = (c, n, k) => ((P.essay || {})[ekey(c, n, k)] || {});
  const eKeys = (c, n) => { const w = week(c, n), ks = ['plan']; secsOf(w).forEach((x, si) => x.sentences.forEach((t, j) => ks.push(sentKey(si, j, t)))); return ks; };
  const essayKnown = (c, n) => { const ks = eKeys(c, n); return ks.filter(k => eRec(c, n, k).last === 'got').length / ks.length; };
  function eSave(c, n, k, ok) {
    P.essay = P.essay || {};
    const r = P.essay[ekey(c, n, k)] || { got: 0, again: 0 };
    r[ok ? 'got' : 'again']++; r.last = ok ? 'got' : 'again'; r.at = Date.now(); P.essay[ekey(c, n, k)] = r;
    if (ok) ST().got = (ST().got || 0) + 1;
    save();
  }
  // Steps: { t: 'thesis' | 'plan' | 'sent', n, si, j }
  function drillSteps(c, what, n) {
    const steps = [], thesis = m => steps.push({ t: 'thesis', n: m }), plan = m => steps.push({ t: 'plan', n: m });
    const sents = (m, only) => secsOf(week(c, m)).forEach((x, si) => { if (only != null && si !== only) return; x.sentences.forEach((t, j) => { if (!t.thesis) steps.push({ t: 'sent', n: m, si, j }); }); });
    if (what === 'learn') { thesis(n); plan(n); sents(n); }
    else if (what === 'thesis') thesis(n);
    else if (what === 'plan') plan(n);
    else if (what === 'paras') sents(n);
    else if (what === 'theses') addedWeeks(c).filter(m => isEssay(week(c, m))).forEach(thesis);
    else if (what === 'plans') addedWeeks(c).filter(m => isEssay(week(c, m))).forEach(plan);
    else if (/^s\d+$/.test(what)) sents(n, +what.slice(1));
    else if (what === 'rapid' || /^r\d+$/.test(what)) {
      const only = what === 'rapid' ? null : +what.slice(1);
      secsOf(week(c, n)).forEach((x, si) => { if (only == null || si === only) x.sentences.forEach((t, j) => steps.push({ t: 'rapid', n, si, j })); });
    }
    return steps;
  }
  function startDrill(c, what, n, route) {
    if (n !== 'all' && n != null && !P.weeks[wkey(c, n)]) { P.weeks[wkey(c, n)] = Date.now(); save(); }
    session = { route, kind: 'essay', what, n, steps: drillSteps(c, what, n), i: 0, res: null, answer: '', hint: false, first: true, right: 0, missed: [] };
  }
  const stepModel = (c, st) => { const w = week(c, st.n); return st.t === 'thesis' ? thesisOf(w) : secsOf(w)[st.si].sentences[st.j].s; };
  const stepKey = st => st.t === 'thesis' ? 'thesis' : st.t === 'plan' ? 'plan' : `s${st.si}-${st.j}`;
  /* Rapid recall: one or two words per sentence. A word counts only if it's distinctive to that sentence:
   * a name, a year or a capitalised term, or a word used in at most two sentences of the essay. */
  const RAPID = {};
  function distinctive(c, n, si, j) {
    const key = ekey(c, n, 'all');
    if (!RAPID[key]) {
      const counts = new Map();
      secsOf(week(c, n)).forEach(x => x.sentences.forEach(t => new Set(keywords(t.s).keys()).forEach(k => counts.set(k, (counts.get(k) || 0) + 1))));
      RAPID[key] = counts;
    }
    const text = secsOf(week(c, n))[si].sentences[j].s, K = keywords(text), D = new Map();
    K.forEach((wt, k) => { if (wt > 1 || (RAPID[key].get(k) || 0) <= 2) D.set(k, wt); });
    const out = D.size ? D : K;
    out.disp = new Map(); words(text).forEach(w => { const k = stem(w); if (out.has(k) && !out.disp.has(k)) out.disp.set(k, w); });
    return out;
  }
  function rapidCheck(c, st, answer) {
    const D = distinctive(c, st.n, st.si, st.j), A = [...new Set(words(answer).map(stem))];
    const hit = new Set([...D.keys()].filter(k => A.includes(k) || A.some(a => a.length >= 4 && k.length >= 4 && a.slice(0, 3) === k.slice(0, 3) && lev(a, k) <= (k.length >= 8 ? 2 : 1))));
    return { ok: hit.size > 0, hit, K: D, pct: hit.size ? 1 : 0 };
  }
  function drillPage(c) {
    const s = session, backTo = s.what === 'theses' || s.what === 'plans' ? 'c-' + c.id : `c-${c.id}-w${s.n}`;
    const backLabel = backTo === 'c-' + c.id ? (c.short || c.name) : 'Week ' + s.n;
    if (!s.steps.length) return emptyStudy(c, backTo, backLabel, 'Nothing to practise here yet.');
    if (s.i >= s.steps.length) {
      return `<div class="screen result" style="${cv(c)}">
        <div class="bar">${back(backTo, backLabel)}<span class="meta">Done</span></div>
        <div class="big">${s.right}/${s.steps.length}</div><p>${s.right === s.steps.length ? 'Every one right first time.' : `You had ${s.right} of ${s.steps.length} right first time.`}</p>
        <div class="dock">${s.missed.length ? `<button class="btn" data-act="e-missed">Practise the ${plural(s.missed.length, 'one')} you missed</button>` : ''}
          <button class="btn ${s.missed.length ? 'ghost' : ''}" data-go="${backTo}">Done</button></div></div>`;
    }
    const st = s.steps[s.i], w = week(c, st.n), stage = st.t === 'thesis' ? 0 : st.t === 'plan' ? 1 : 2;
    const top = `<div class="bar">${back(backTo, backLabel)}<span class="meta">${s.i + 1} of ${s.steps.length}</span></div>${prog(s.i, s.steps.length)}
      ${s.what === 'learn' ? `<div class="stages">${['Thesis', 'Plan', 'Paragraphs'].map((l, k) => `<span class="${k === stage ? 'on' : k < stage ? 'done' : ''}">${k + 1} · ${l}</span>`).join('')}</div>` : ''}`;
    if (st.t === 'plan') {
      const ps = parasOf(w), res = s.res;
      return `<div class="screen has-dock drill" style="${cv(c)}">${top}
        <div class="k">Week ${st.n} · The plan</div><h1 class="dq">${esc(w.title)}</h1>
        <p class="note" style="margin-top:6px">Type the point of each paragraph, in order.</p>
        <div class="planrows">${ps.map((x, i) => `<div class="prow ${res ? (res[i].pct >= .5 ? 'ok' : 'no') : ''}"><label for="pl${i}">Paragraph ${i + 1}</label>
          ${res ? `<div class="pans">${esc(s.plan[i] || '—')}</div><div class="pmodel">${marked(x.title, res[i])}</div>` : `<input id="pl${i}" class="pin" value="${esc((s.plan || [])[i] || '')}" autocomplete="off" autocapitalize="sentences">`}</div>`).join('')}</div>
        <div class="dock">${res ? `<button class="btn" data-act="e-next">Next</button>` : `<button class="btn" data-act="e-plan">Check my plan</button><button class="btn ghost" data-act="e-show">Show me</button>`}</div></div>`;
    }
    if (st.t === 'rapid') {
      const x = secsOf(w)[st.si], t = x.sentences[st.j], res = s.res;
      const k = x.sentences.indexOf(t) + 1, prev = x.sentences[st.j - 1];
      return `<div class="screen has-dock drill rapid" style="${cv(c)}">${top}
        <div class="k">Rapid recall · ${esc(secName(x, w))}</div><h1 class="dq">${esc(x.kind === 'para' ? x.title : w.title)}</h1>
        ${prev ? `<p class="prevline">${prev.thesis ? '<b>Thesis.</b> ' : ''}${fmt(prev.s, null)}</p>` : ''}
        <div class="sentno">${t.thesis ? 'The thesis' : `Sentence ${k} of ${x.sentences.length}`} ${tagChips(t.tags)}</div>
        <input id="ans" class="ans rapidin${res ? ' done' : ''}" placeholder="${res ? '' : 'One or two words'}" value="${esc(s.answer)}" autocomplete="off" autocapitalize="none" spellcheck="false" enterkeyhint="${res ? 'next' : 'go'}">
        ${res ? `<div class="verdict ${res.ok ? 'ok' : 'no'}"><b>${res.ok ? 'Got it' : res.shown ? 'Shown' : 'Not that one'}</b><span></span></div>
            <div class="model"><span>The sentence</span>${marked(t.s, res)}</div>
            <p class="keys">Words that count: ${[...res.K.keys()].map(k => `<b class="${res.hit.has(k) ? 'yes' : ''}">${esc((res.K.disp && res.K.disp.get(k)) || k)}</b>`).join(' ')}</p>`
          : ''}
        <div class="dock">${res ? `<button class="btn" data-act="e-next">Next</button>` : `<div class="two"><button class="btn ghost" data-act="e-show">Show me</button><button class="btn" data-act="e-check">Check</button></div>`}</div>
      </div>`;
    }
    const model = stepModel(c, st), res = s.res;
    let head;
    if (st.t === 'thesis') head = `<div class="k">Week ${st.n} · The thesis</div><h1 class="dq">${esc(w.title)}</h1><p class="note" style="margin-top:4px">${esc(w.part || '')}</p>`;
    else {
      const x = secsOf(w)[st.si], before = x.sentences.slice(0, st.j);
      const asked = x.sentences.filter(t => !t.thesis), k = asked.indexOf(x.sentences[st.j]) + 1;
      head = `<div class="k">Week ${st.n} · ${esc(secName(x, w))}</div><h1 class="dq">${esc(x.kind === 'para' ? x.title : w.title)}</h1>
        ${before.length ? `<ol class="sofar">${before.map(t => `<li class="${t.thesis ? 'th' : ''}">${t.thesis ? '<b>Thesis.</b> ' : ''}${fmt(t.s, null)}</li>`).join('')}</ol>` : ''}
        <div class="sentno">Sentence ${k} of ${asked.length} ${tagChips(x.sentences[st.j].tags)}</div>`;
    }
    const verdict = res ? (res.ok ? 'ok' : res.pct >= NEAR ? 'near' : 'no') : '';
    return `<div class="screen has-dock drill" style="${cv(c)}">${top}${head}
      ${res ? `<div class="verdict ${verdict}"><b>${res.ok ? (res.had ? 'Marked as right' : 'Substantially right') : res.pct >= NEAR ? 'Nearly' : 'Not yet'}</b><span>${res.shown ? 'Shown' : Math.round(res.pct * 100) + '% of the key words'}</span></div>
        ${res.shown ? '' : `<div class="yours"><span>You wrote</span>${esc(s.answer) || '—'}</div>`}
        <div class="model"><span>The essay says</span>${marked(model, res)}</div>`
        : `<textarea id="ans" class="ans" rows="5" placeholder="${st.t === 'thesis' ? 'Type the thesis' : 'Type the sentence'}" autocapitalize="sentences" spellcheck="true">${esc(s.answer)}</textarea>
           ${s.hint ? `<p class="hint">Starts: “${esc(words(model).slice(0, 3).join(' '))}…”</p>` : ''}`}
      <div class="dock">${res ? (res.ok ? `<button class="btn" data-act="e-next">Next</button>`
          : `<div class="two"><button class="btn ghost" data-act="e-retry">Try again</button><button class="btn" data-act="e-next">Next</button></div>${res.shown ? '' : `<button class="textbtn hadit" data-act="e-had">I had it: mark as right</button>`}`)
        : `<button class="btn" data-act="e-check">Check</button><div class="two"><button class="btn ghost" data-act="e-hint" ${s.hint ? 'disabled' : ''}>Hint</button><button class="btn ghost" data-act="e-show">Show me</button></div>`}</div>
    </div>`;
  }
  function drillCheck(c, shown) {
    const s = session, st = s.steps[s.i], w = week(c, st.n);
    if (st.t === 'plan') {
      s.plan = parasOf(w).map((_, i) => (document.getElementById('pl' + i) || {}).value || '');
      s.res = parasOf(w).map((x, i) => shown ? { pct: 0, hit: new Set(), K: keywords(x.title) } : mark(x.title, s.plan[i]));
      const ok = !shown && s.res.every(r => r.pct >= .5);
      if (s.first) { if (ok) s.right++; else s.missed.push(st); eSave(c, st.n, 'plan', ok); s.first = false; }
      return;
    }
    const ta = document.getElementById('ans'); if (ta) s.answer = ta.value;
    if (st.t === 'rapid') {
      const r = shown ? { ok: false, shown: true, hit: new Set(), K: distinctive(c, st.n, st.si, st.j) } : rapidCheck(c, st, s.answer);
      s.res = r;
      if (s.first) { if (r.ok) s.right++; else s.missed.push(st); s.first = false; P.rapid = P.rapid || {}; P.rapid[ekey(c, st.n, `s${st.si}-${st.j}`)] = r.ok ? 'got' : 'again'; save(); }
      return;
    }
    const r = shown ? { pct: 0, hit: new Set(), K: keywords(stepModel(c, st)), shown: true } : mark(stepModel(c, st), s.answer);
    r.ok = !shown && r.pct >= PASS; s.res = r;
    if (s.first) { if (r.ok) s.right++; else s.missed.push(st); eSave(c, st.n, stepKey(st), r.ok); s.first = false; }
    else if (r.ok) eSave(c, st.n, stepKey(st), true);
  }
  const rapidScore = (c, n) => { const ks = []; secsOf(week(c, n)).forEach((x, si) => x.sentences.forEach((t, j) => ks.push((P.rapid || {})[ekey(c, n, `s${si}-${j}`)]))); const tried = ks.filter(Boolean).length; return tried ? ` · last time ${ks.filter(v => v === 'got').length} of ${ks.length}` : ''; };
  function essayWeekPage(c, n) {
    const w = week(c, n);
    if (!P.weeks[wkey(c, n)]) { P.weeks[wkey(c, n)] = Date.now(); save(); }
    const known = Math.round(essayKnown(c, n) * 100), th = eRec(c, n, 'thesis').last, pl = eRec(c, n, 'plan').last;
    const secs = secsOf(w);
    const status = l => l === 'got' ? '<i class="okdot"></i>Known' : l === 'again' ? 'Keep going' : 'Not tried yet';
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back('c-' + c.id, c.short || c.name)}<span class="meta">Week ${n} of ${c.weeks}</span></div>
      <div class="wnum">${pad(n)}</div>
      <h1 class="wtitle">${esc(w.title)}</h1>
      ${assessLine(c, n)}
      ${w.part ? `<p class="part">${esc(w.part)}</p>` : ''}
      ${src(w.source?.file, w.source?.pages || '')}
      <div class="known"><div class="kbar"><i style="width:${known}%"></i></div><span>${known}% of this essay known</span></div>
      <button class="learn" data-go="c-${c.id}-w${n}-learn"><b>Practise the whole essay</b><span>The thesis, then the plan, then every paragraph, sentence by sentence</span></button>
      <button class="learn quick" data-go="c-${c.id}-w${n}-rapid"><b>Rapid recall</b><span>One or two key words for each sentence, start to finish${rapidScore(c, n)}</span></button>
      <div class="modes essaymodes">
        <button class="mode" data-go="c-${c.id}-w${n}-thesis"><b>1 · Thesis</b><small>${status(th)}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-plan"><b>2 · Plan</b><small>${status(pl)}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-paras"><b>3 · Paragraphs</b><small>All ${secs.length}, in order</small></button>
      </div>
      <div class="sub">Paragraph by paragraph</div>
      <ol class="topics esecs">${secs.map((x, si) => { const ks = x.sentences.map((t, j) => sentKey(si, j, t)), k = ks.filter(q => eRec(c, n, q).last === 'got').length;
        return `<li><button data-go="c-${c.id}-w${n}-s${si}"><span>${esc(secName(x, w))}${x.kind === 'para' ? ' · ' + esc(x.title) : ''}</span><small>${k} of ${ks.length} sentences known</small></button><button class="rq" data-go="c-${c.id}-w${n}-r${si}" aria-label="Rapid recall: ${esc(secName(x, w))}">Rapid</button></li>`; }).join('')}</ol>
      <button class="btn ghost" style="margin-top:18px" data-go="c-${c.id}-w${n}-read">Read the essay</button>
    </div>`;
  }
  function readPage(c, n) {
    const w = week(c, n);
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">The essay</span></div>
      <h1 class="wtitle" style="margin-top:14px">${esc(w.title)}</h1>
      ${w.part ? `<p class="part">${esc(w.part)}</p>` : ''}${src(w.source?.file, w.source?.pages || '')}
      <div class="prose essay">${secsOf(w).map(x => `<h3 class="bh">${esc(secName(x, w))}${x.kind === 'para' ? ' · ' + esc(x.title) : ''}</h3>
        <ul>${x.sentences.map(t => t.thesis ? `</ul><div class="thesis"><b>Thesis</b>${fmt(t.s, null)}</div><ul>` : `<li>${fmt(t.s, null)} ${tagChips(t.tags)}</li>`).join('')}</ul>`).join('')}</div>
    </div>`;
  }

  /* ---------- settings ---------- */
  function settingsPage() {
    const data = JSON.stringify({ app: 'uni', v: 2, progress: P, courses: CFG });
    const gone = UNI.courses.filter(c => CFG.removed.includes(c.id));
    let url = '';
    try { url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); } catch (e) {}
    return `<div class="screen">
      <div class="bar">${back('home', 'Courses')}<span class="meta">Settings</span></div>
      <h1 class="title">Settings</h1>
      ${cloudOn ? syncSection() : ''}
      <div class="set"><button class="crs" data-go="ballroom">${myBall(26)}<span class="nm">The Ballroom</span><span class="ed">${earnedCount()} of ${MILESTONES.length}</span></button></div>
      <div class="set"><h2>Courses</h2><p>Add, rename, recolour or remove a course.</p>
        ${courses().map(c => `<button class="crs" style="${cv(c)}" data-go="edit-${c.id}"><span class="dot"></span><span class="nm">${esc(c.name)}</span><span class="ed">Edit</span></button>`).join('')}
        <button class="crs add" data-go="new-course"><span class="dot">+</span><span class="nm">Add a course</span></button>
        ${gone.length ? `<p style="margin-top:14px">Removed courses. Bringing one back restores its weeks and progress.</p>${gone.map(c => `<div class="crs gone" style="${cv(c)}"><span class="dot"></span><span class="nm">${esc(c.name)}</span><button class="ed" data-act="restore-course" data-id="${c.id}">Bring back</button></div>`).join('')}` : ''}
      </div>
      <div class="set"><h2>Back up your progress</h2><p>Your progress and course changes are saved on this device${SYNC ? ' and synced' : ' only'}. Copy this somewhere safe, or download it, to move it to a new phone.</p>
        <textarea id="bk" readonly aria-label="Backup">${esc(data)}</textarea>
        <div class="row-btns" style="margin-top:8px"><button class="btn small" data-act="copy">Copy</button>${url ? `<a class="btn small ghost" href="${url}" download="duodisco-backup.json">Download</a>` : ''}</div></div>
      <div class="set"><h2>Restore a backup</h2><p>Paste a backup here, or choose the file.</p>
        <textarea id="rs" aria-label="Paste a backup"></textarea>
        <div class="row-btns" style="margin-top:8px"><button class="btn small" data-act="restore">Restore</button><label class="btn small ghost" style="cursor:pointer">Choose file<input type="file" id="rsfile" accept="application/json,.json" hidden></label></div></div>
      <div class="set"><h2>Reset progress</h2><p>Clears what you've studied and your quiz scores. Your courses and their content aren't affected.</p>
        <button class="btn small ghost" data-act="reset">Reset progress</button></div>
    </div>`;
  }
  const miniFloor = tiles => `<span class="minifloor" aria-label="Your tiles">${FLOOR.map((k, i) => { const o = tiles.indexOf(i); return `<i style="--k:${k}" class="${o >= 0 ? 'on' : ''}">${o >= 0 ? o + 1 : ''}</i>`; }).join('')}</span>`;
  function syncSection() {
    if (SYNC) return `<div class="set"><h2>Signed in</h2>
        <div class="who">${SYNC.tiles ? miniFloor(SYNC.tiles) : ''}<div><b>${esc(SYNC.name || 'You')}</b><span>Your name and these three tiles, in this order, sign you in on any device.</span></div></div>
        <p id="syncstat" class="syncstat">${syncLine()}</p>
        <div class="row-btns"><button class="btn small" data-act="sync-now">Sync now</button><button class="btn small ghost" data-act="sync-off">Sign out on this device</button></div></div>`;
    return `<div class="set"><h2>Sync between devices</h2>
        <p>Sign in with your name and three tiles to keep your courses and progress the same on your phone and laptop.</p>
        <button class="btn small" data-go="welcome">Sign in</button></div>`;
  }
  /* ---------- the welcome screen: name + dance floor ---------- */
  const W = { name: '', tiles: [], err: '', missing: false, busy: false };
  function welcomePage() {
    const ready = W.name.trim() && W.tiles.length === 3;
    return `<div class="welcome">
      <div class="logo">${myBall(30)}DuoDisco</div>
      <h1 class="hello">Hello</h1>
      <p class="wsub">Type your name, then light up three tiles in order. Use the same ones on every device, and your courses and progress follow you.</p>
      <label class="wl" for="w-name">Your name</label>
      <input class="wname" id="w-name" value="${esc(W.name)}" placeholder="Your name" autocomplete="given-name" autocapitalize="words" spellcheck="false">
      <div class="wl">Your three tiles</div>
      <div class="floor" role="group" aria-label="Dance floor">${FLOOR.map((k, i) => { const o = W.tiles.indexOf(i);
        return `<button class="tile ${o >= 0 ? 'on' : ''}" style="--k:${k}" data-tile="${i}" aria-label="Tile ${i + 1}${o >= 0 ? ', number ' + (o + 1) : ''}" aria-pressed="${o >= 0}"><b>${o >= 0 ? o + 1 : ''}</b></button>`; }).join('')}</div>
      <p class="worder">${W.tiles.length < 3 ? `Tap ${3 - W.tiles.length} more ${W.tiles.length === 2 ? 'tile' : 'tiles'}.` : 'Tap a lit tile to undo it.'}</p>
      ${W.missing ? `<div class="wnew"><b>New here?</b> There’s no DuoDisco yet for ${esc(W.name.trim())} with these tiles. Start one, and it brings what’s already on this device.<span>Already have one? Check the tiles and their order.</span></div>` : ''}
      <p class="formerr" role="alert">${esc(W.err)}</p>
      <div class="wbtns">
        ${W.missing ? `<button class="btn" data-act="w-create" ${W.busy ? 'disabled' : ''}>${W.busy ? 'Starting…' : 'Start my DuoDisco'}</button><button class="btn ghost" data-act="w-back">Check my tiles</button>`
                    : `<button class="btn" data-act="w-go" ${ready && !W.busy ? '' : 'disabled'}>${W.busy ? 'Opening…' : 'Open DuoDisco'}</button>`}
        ${SYNC ? '' : `<button class="wskip" data-act="w-skip">Use without syncing</button>`}
      </div>
    </div>`;
  }
  async function welcomeGo(create) {
    W.busy = true; W.err = ''; render();
    try {
      const how = await signIn(W.name, W.tiles, create);
      W.busy = false;
      if (how === 'missing') { W.missing = true; return render(); }
      Object.assign(W, { tiles: [], missing: false });
      toast(how === 'joined' ? `Welcome back, ${SYNC.name}` : `Hello, ${SYNC.name}. Use the same tiles on your other devices.`);
      if (location.hash === '#home') render(); else go('home');
    } catch (e) {
      W.busy = false;
      W.err = e.status === 404 ? 'Signing in isn’t set up yet: the DuoDisco database hasn’t been created in Supabase. Tap Use without syncing for now.'
        : e.status ? 'DuoDisco’s sync server had a problem. Try again in a moment, or use without syncing.'
        : 'Couldn’t reach DuoDisco. Check you’re online and try again.';
      render();
    }
  }
  function restore(text) {
    try {
      const d = JSON.parse(text);
      if (!d || d.app !== 'uni' || !d.progress) throw new Error();
      P = Object.assign(blank(), d.progress); save();
      if (d.courses) { CFG = Object.assign(blankCfg(), d.courses); saveCfg(); }
      toast('Backup restored'); go('home');
    } catch (e) { toast('That doesn’t look like a DuoDisco backup.'); }
  }

  /* ---------- the Ballroom: milestones for real work, each unlocking a disco ball ---------- */
  const LOOKS = window.BALLROOM.LOOKS;
  const myBall = size => window.BALLROOM.ball(window.BALLROOM.byId(P.look), size);
  // Every course has week n added (n can depend on the course's length).
  const allHave = f => { const cs = courses(); return cs.length > 0 && cs.every(c => week(c, Math.min(c.weeks, f(c)))); };
  const allCards = () => courses().flatMap(c => addedWeeks(c).flatMap(n => (week(c, n).cards || []).map(card => [c, n, card])));
  const courseKnown = c => {
    const ks = addedWeeks(c).flatMap(n => isEssay(week(c, n)) ? eKeys(c, n).map(k => eRec(c, n, k).last === 'got') : (week(c, n).cards || []).map(card => known(c, n, card)));
    return ks.length ? ks.filter(Boolean).length / ks.length : 0;
  };
  const hasQuiz = c => addedWeeks(c).some(n => (week(c, n).quiz || []).length);
  const quizCourses = () => courses().filter(hasQuiz);
  const essayCourses = () => courses().filter(c => addedWeeks(c).some(n => isEssay(week(c, n))));
  const thesesKnown = c => addedWeeks(c).filter(n => isEssay(week(c, n))).every(n => eRec(c, n, 'thesis').last === 'got');
  const full = c => addedWeeks(c).length === c.weeks;
  const perfectWeek = c => addedWeeks(c).some(n => { const q = P.quiz[wkey(c, n)]; return q && q.best === q.of && q.of > 0; });
  const methodsOf = c => addedWeeks(c).filter(n => week(c, n).method);
  const totalAdded = () => courses().reduce((t, c) => t + addedWeeks(c).length, 0);
  const MILESTONES = [
    ['opening', 'Opening night', 'The first week of notes added to any course', () => totalAdded() > 0],
    ['week1', 'Week one, all in', 'Week 1 added for every course (two or more)', () => courses().length >= 2 && allHave(() => 1)],
    ['firstdone', 'First one done', 'Finish your first assessment item', () => assessCount() >= 1],
    ['fullmarks', 'Full marks', 'A perfect score on a week’s quiz, or a whole essay recalled', () => courses().some(perfectWeek) || essayCourses().some(c => addedWeeks(c).some(n => isEssay(week(c, n)) && essayKnown(c, n) === 1))],
    ['method', 'Method actor', 'A problem-question method practised from memory, all the way through', () => Object.keys(P.methods || {}).length > 0],
    ['month', 'A month in', 'Week 4 added for every course', () => allHave(() => 4)],
    ['threedone', 'Three down', 'Finish three assessment items', () => assessCount() >= 3],
    ['caughtup', 'Caught up', 'At least 6 weeks added, and every one of them opened', () => totalAdded() >= 6 && courses().every(c => newCount(c) === 0)],
    ['halfway', 'Halfway', 'Week 7 added for every course', () => allHave(c => Math.ceil(c.weeks / 2))],
    ['coursedone', 'Course complete', 'Finish every assessment item in one course (two or more)', () => courses().some(c => assessItems(c).length >= 2 && courseAssessed(c))],
    ['comeback', 'Comeback', 'Full marks on a quiz you once scored under half on', () => !!(P.stats || {}).comeback],
    ['fivedone', 'Five down', 'Finish five assessment items', () => assessCount() >= 5],
    ['homestretch', 'Home stretch', 'Week 10 added for every course', () => allHave(c => Math.ceil(c.weeks * 10 / 13))],
    ['everycourse', 'Across the board', 'Finish at least one assessment item in every course that has one (two or more)', () => assessCourses().length >= 2 && assessCourses().every(c => assessItems(c).some(x => assessDone(x.ev)))],
    ['tendone', 'Ten down', 'Finish ten assessment items', () => assessCount() >= 10],
    ['alldone', 'Every item in', 'Finish every assessment item across all courses (at least two)', () => assessCount() >= 2 && assessCourses().every(courseAssessed)],
    ['methodsall', 'Method in the madness', 'Every problem method in a course practised (at least 3)', () => courses().some(c => { const ms = methodsOf(c); return ms.length >= 3 && ms.every(n => (P.methods || {})[wkey(c, n)]); })],
    ['marksall', 'Full marks everywhere', 'A perfect week’s quiz in every course that has quizzes (two or more)', () => quizCourses().length >= 2 && quizCourses().every(perfectWeek)],
    ['fullsem', 'Full semester', 'Every week added for every course', () => courses().length > 0 && courses().every(full)],
    ['examready', 'Exam ready', '80% or more on a whole-course quiz in every course, and every essay’s thesis known', () => courses().length > 0 && quizCourses().every(c => ((P.exam || {})[c.id] || 0) >= .8) && essayCourses().every(thesesKnown)],
    ['twocourses', 'Two courses clear', 'Finish every assessment item in two courses', () => assessCourses().filter(courseAssessed).length >= 2],
    ['finalbow', 'Final bow', 'Every course fully added, with every assessment item finished', () => courses().length > 0 && courses().every(c => full(c) && assessItems(c).length > 0 && courseAssessed(c))],
  ];
  const earnedCount = () => MILESTONES.filter(m => (P.rewards || {})[m[0]]).length;
  const lookFor = i => LOOKS[i + 1];          // milestone i unlocks look i + 1; Classic is yours from the start
  let unlockQueue = [];
  function checkRewards() {
    P.rewards = P.rewards || {};
    const fresh = MILESTONES.filter(([id, , , test]) => !P.rewards[id] && test());
    if (!fresh.length) return;
    fresh.forEach(([id]) => { P.rewards[id] = Date.now(); unlockQueue.push(id); });
    save();
  }
  // Don't interrupt a flashcard or quiz in progress; show unlocks between things.
  const busy = () => session && ((session.kind === 'cards' && session.started && session.queue.length) || (session.kind === 'quiz' && session.i < session.items.length) || (session.kind === 'essay' && session.i < session.steps.length));
  function showUnlock() {
    if (!unlockQueue.length || busy() || document.querySelector('.unlock')) return;
    const id = unlockQueue.shift(), i = MILESTONES.findIndex(m => m[0] === id), m = MILESTONES[i], look = lookFor(i);
    const inks = ['#ff48b0', '#0078bf', '#00a95c', '#ff6c2f', '#765ba7', '#f15060', '#00838a', '#3255a4', '#ffe800'];
    const el = document.createElement('div');
    el.className = 'unlock'; el.setAttribute('role', 'dialog'); el.setAttribute('aria-modal', 'true'); el.setAttribute('aria-labelledby', 'u-name');
    el.innerHTML = `<div class="beam"></div><div class="confetti">${inks.concat(inks, inks).map((k, n) => `<i style="left:${(n * 37) % 100}%;background:${k};animation-delay:${(n % 7) * .12}s;animation-duration:${2.2 + (n % 5) * .3}s"></i>`).join('')}</div>
      <div class="ucard">
        <div class="eyebrow">New disco ball</div>
        <div class="prize"><span class="spark s1"></span><span class="spark s2"></span><span class="spark s3"></span><div class="drop">${window.BALLROOM.ball(look, 200)}</div></div>
        <h2 class="uname" id="u-name">${esc(look.name)}</h2>
        <p class="uwhy">For <b>${esc(m[1])}</b>: ${esc(m[2].charAt(0).toLowerCase() + m[2].slice(1))}.</p>
        <div class="ubtns"><button class="btn" data-u="wear" data-look="${look.id}">Put it on</button><button class="ughost" data-u="ballroom">See the Ballroom</button><button class="ughost" data-u="close">Not now</button></div>
      </div>`;
    document.body.appendChild(el);
    el.querySelector('[data-u="wear"]').focus();
    el.addEventListener('click', e => {
      const b = e.target.closest('[data-u]'); if (!b) return;
      if (b.dataset.u === 'wear') { P.look = b.dataset.look; save(); }
      el.remove();
      if (b.dataset.u === 'ballroom') go('ballroom'); else render();
    });
  }
  function ballroomPage() {
    const have = id => id === 'classic' || MILESTONES.some((m, i) => lookFor(i).id === id && (P.rewards || {})[m[0]]);
    const cur = window.BALLROOM.byId(P.look);
    const next = MILESTONES.findIndex(m => !(P.rewards || {})[m[0]]);
    return `<div class="screen">
      <div class="bar">${back('home', 'Courses')}<span class="meta">${earnedCount()} of ${MILESTONES.length} milestones</span></div>
      <h1 class="title">The Ballroom</h1>
      <p class="note" style="margin-top:-6px">A disco ball for each milestone you reach this semester. Tap one you’ve unlocked to wear it.</p>
      <div class="current">${myBall(64)}<div><b>Wearing: ${esc(cur.name)}</b><span>${cur.id === 'classic' ? 'The original' : 'Unlocked for ' + esc((MILESTONES.find((m, i) => lookFor(i).id === cur.id) || [])[1] || '')}</span></div></div>
      ${next >= 0 ? `<p class="nextup"><b>Next up: ${esc(MILESTONES[next][1])}.</b> ${esc(MILESTONES[next][2])}.</p>` : `<p class="nextup"><b>Every milestone reached.</b> What a semester.</p>`}
      <div class="wgrid">${LOOKS.map((l, k) => {
        const m = k ? MILESTONES[k - 1] : null;
        return have(l.id) ? `<button class="witem ${P.look === l.id ? 'on' : ''}" data-look="${l.id}" aria-pressed="${P.look === l.id}">${window.BALLROOM.ball(l, 60)}<span>${esc(l.name)}</span><small>${m ? esc(m[1]) : 'The original'}</small></button>`
          : `<div class="witem lock">${window.BALLROOM.ball(l, 60, { locked: true })}<span>${esc(l.name)}</span><small>${esc(m[2])}</small></div>`;
      }).join('')}</div>
    </div>`;
  }

  /* ---------- adding and editing courses ---------- */
  /* Assessments are calendar entries with a subject and kind 'assess' (see the calendar section).
   * A course week shows the assessment whose date falls in that week. Done state: P.assessDone[eventId]. */
  const assessEvents = c => eventsOf().filter(e => e.kind === 'assess' && e.course === c.id).sort((a, b) => a.from < b.from ? -1 : 1);
  const dueEvents = (c, n) => assessEvents(c).filter(e => weekOfDate(e.from) === n);
  const dueOf = (c, n) => (dueEvents(c, n)[0] || {}).label || '';
  const assessDone = ev => !!(P.assessDone || {})[ev.id];
  const assessLine = (c, n) => dueEvents(c, n).map(ev => `<p class="dueline"><b>Assessment</b> ${esc(ev.label)}</p>
      <button class="assessbtn ${assessDone(ev) ? 'done' : ''}" data-act="assess-toggle" data-ev="${ev.id}">${assessDone(ev) ? 'Done ✓ · tap to undo' : 'Mark as done'}</button>`).join('');
  const assessItems = c => assessEvents(c).map(ev => ({ c, ev }));
  const assessCount = () => courses().reduce((t, c) => t + assessItems(c).filter(x => assessDone(x.ev)).length, 0);
  const assessCourses = () => courses().filter(c => assessItems(c).length > 0);
  const courseAssessed = c => assessItems(c).length > 0 && assessItems(c).every(x => assessDone(x.ev));
  // A disco ball, drawn exactly like the logo, above each assessment week on the courses screen.
  // Its middle tone is the course colour; the light and dark tones are tints and shades of it.
  const mixHex = (a, b, t) => { const p = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16)), A = p(a), B = p(b); return '#' + A.map((v, i) => Math.round(v + (B[i] - v) * t).toString(16).padStart(2, '0')).join(''); };
  const dueRow = c => {
    if (!weeksOf(c).some(n => dueOf(c, n))) return '';
    const light = mixHex(c.colour, '#ffffff', .6), dark = mixHex(c.colour, '#000000', .2);
    const ball = BALLROOM.ball({ f: (i, j, d) => d < 6 ? light : d < 12 ? c.colour : dark }, 22);
    return `<div class="dues" style="--n:${c.weeks}" aria-hidden="true">${weeksOf(c).map(n => dueOf(c, n) ? `<span title="${esc(dueOf(c, n))}">${ball}</span>` : '<span></span>').join('')}</div>`;
  };
  const assessText = c => c ? assessEvents(c).filter(e => weekOfDate(e.from)).map(e => `${weekOfDate(e.from)} ${e.label}`).join(', ') : '';
  // Saving the course's list updates its assessments on the calendar. Kept items keep their done state.
  const setCourseAssess = (id, list) => {
    const want = new Map(list.map(x => [x.n + '|' + x.label, x])), keep = [];
    eventsOf().forEach(e => {
      if (e.kind === 'assess' && e.course === id && weekOfDate(e.from)) {
        const k = weekOfDate(e.from) + '|' + e.label;
        if (want.has(k)) { want.delete(k); keep.push(e); }
        return;
      }
      keep.push(e);
    });
    want.forEach(x => { const from = weekMonday(x.n); if (from) keep.push({ id: newId(), from, to: from, label: x.label, kind: 'assess', course: id, tags: [] }); });
    CFG.events = keep;
  };
  // Assessments saved before the calendar existed (CFG.assess) become calendar entries once.
  function migrateAssess() {
    const old = CFG.assess || {};
    if (!Object.keys(old).length) return;
    Object.entries(old).forEach(([id, weeks]) => Object.entries(weeks || {}).forEach(([n, label]) => {
      const from = weekMonday(+n), evId = 'a' + id + n;
      if (!from || eventsOf().some(e => e.id === evId)) return;
      const d = ((P.assessDone || {})[id] || {})[n];
      if (d) { P.assessDone = P.assessDone || {}; P.assessDone[evId] = d; }
      CFG.events = [...eventsOf(), { id: evId, from, to: from, label, kind: 'assess', course: id, tags: [] }];
    }));
    Object.keys(old).forEach(id => { if (P.assessDone) delete P.assessDone[id]; });
    CFG.assess = {};
    store.set(CKEY, CFG); store.set(PKEY, P);
  }
  function parseAssess(text, weeks) {
    const out = [], bad = [];
    text.split(/[,;\n]+/).map(x => x.trim()).filter(Boolean).forEach(part => {
      const m = part.match(/^(\d+)\s*[:\-–.]?\s*(.*)$/), n = m && +m[1];
      if (!m || n < 1 || n > weeks) bad.push(part); else out.push({ n, label: m[2].trim().slice(0, 40) || 'Assessment' });
    });
    return { out, bad };
  }
  function courseForm(c) {
    const isNew = !c, colour = c ? c.colour : (INKS.find(([h]) => !courses().some(x => x.colour === h)) || INKS[0])[0];
    const minWeeks = c ? Math.max(1, ...Object.keys(c.content).map(Number)) : 1;
    const hasContent = c && Object.keys(c.content).length;
    return `<div class="screen" style="--c:${colour}">
      <div class="bar">${back(isNew ? 'home' : 'c-' + c.id, isNew ? 'Courses' : (c.short || c.name))}<span class="meta">${isNew ? 'New course' : 'Edit course'}</span></div>
      <h1 class="title">${isNew ? 'Add a course' : 'Edit course'}</h1>
      <form class="form" id="cform" novalidate>
        <label for="f-name">Course name</label>
        <input id="f-name" name="name" required maxlength="80" value="${esc(c ? c.name : '')}" placeholder="e.g. Constitutional Law" autocomplete="off">
        <label for="f-short">Short name <small>for the sidebar and buttons (optional)</small></label>
        <input id="f-short" name="short" maxlength="24" value="${esc(c && c.short !== c.name ? c.short || '' : '')}" placeholder="e.g. Con Law" autocomplete="off">
        <fieldset><legend>Colour</legend><div class="inks">${INKS.map(([h, n]) => `<label class="ink" style="--k:${h}"><input type="radio" name="colour" value="${h}" ${h === colour ? 'checked' : ''}><span></span><em>${n}</em></label>`).join('')}</div></fieldset>
        <label for="f-weeks">Number of weeks</label>
        <input id="f-weeks" name="weeks" type="number" inputmode="numeric" min="${minWeeks}" max="26" value="${c ? c.weeks : 13}">
        ${hasContent ? `<small class="hint">At least ${minWeeks}, because week ${minWeeks} has been added.</small>` : ''}
        <label for="f-assess">Assessments <small>week and name, separated by commas (optional)</small></label>
        <input id="f-assess" name="assess" maxlength="160" value="${esc(assessText(c))}" placeholder="e.g. 7 Essay, 13 Exam" autocomplete="off">
        <p class="formerr" id="ferr" role="alert"></p>
        <button class="btn" type="submit">${isNew ? 'Add course' : 'Save changes'}</button>
      </form>
      ${isNew ? `<p class="note">Once it’s added, upload a week’s notes to Claude and ask to add them to this course.</p>` : `
      <div class="set danger"><h2>Remove this course</h2><p>${hasContent ? 'It disappears from your courses. Its weeks and your progress are kept, and you can bring it back from Settings.' : 'It disappears from your courses. You can bring it back from Settings.'}</p>
        <button class="btn small ghost" data-act="remove-course" data-id="${c.id}">Remove course</button></div>`}
    </div>`;
  }
  function saveCourse(c) {
    const f = document.getElementById('cform'), err = document.getElementById('ferr');
    const name = f.elements['name'].value.trim(), short = f.elements['short'].value.trim(), colour = f.elements['colour'].value, weeks = Math.round(+f.elements['weeks'].value);
    const min = c ? Math.max(1, ...Object.keys(c.content).map(Number)) : 1;
    if (!name) { err.textContent = 'Give the course a name.'; f.elements['name'].focus(); return; }
    if (!(weeks >= min && weeks <= 26)) { err.textContent = `Weeks must be between ${min} and 26.`; f.elements['weeks'].focus(); return; }
    const { out, bad } = parseAssess(f.elements['assess'].value, weeks);
    if (bad.length) { err.textContent = `Check the assessments: “${bad[0]}”. Start each with a week number from 1 to ${weeks}, for example 7 Essay.`; f.elements['assess'].focus(); return; }
    const vals = { name, short: short || name, colour, weeks };
    if (!c) {
      let id = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'course', base = id, k = 2;
      while (UNI.byId[id]) id = base + k++;
      CFG.added.push({ id, ...vals }); setCourseAssess(id, out); saveCfg(); toast('Course added'); go('c-' + id);
    } else {
      if (c.mine) Object.assign(CFG.added.find(a => a.id === c.id), vals); else CFG.edits[c.id] = vals;
      setCourseAssess(c.id, out); saveCfg(); toast('Saved'); go('c-' + c.id);
    }
  }

  /* ---------- routing ---------- */
  function parse() {
    const h = location.hash.slice(1) || 'home';
    if (cloudOn && !SYNC && !store.get('uni.skip', false) && h !== 'welcome') return { name: 'welcome', raw: h };
    if (h === 'welcome') return SYNC ? { name: 'home', raw: 'home' } : { name: 'welcome', raw: h };
    if (h === 'home' || h === 'settings' || h === 'ballroom' || h === 'calendar' || h === 'calendar-add') return { name: h, raw: h };
    if (h.startsWith('calendar-edit-')) {
      const id = h.slice(14);
      if (!calDraft || calDraft.id !== id) { const ev = (CFG.events || []).find(e => e.id === id); calDraft = ev ? { ...ev } : null; }
      return calDraft ? { name: 'calendar-add', raw: h } : { name: 'calendar', raw: 'calendar' };
    }
    if (h === 'new-course') return { name: 'form', raw: h };
    if (h.startsWith('edit-')) { const c = course(h.slice(5)); return c ? { name: 'form', c, raw: h } : { name: 'home', raw: 'home' }; }
    const m = h.match(/^c-([a-z0-9]+)(?:-(.*))?$/);
    if (!m || !course(m[1])) return { name: 'home', raw: 'home' };
    const c = course(m[1]), rest = m[2] || '';
    const r = { c, raw: h };
    if (!rest) return { ...r, name: 'course' };
    if (['cases', 'law', 'methods', 'search'].includes(rest)) return { ...r, name: rest };
    if (rest === 'theses' || rest === 'plans') return { ...r, name: 'drill', what: rest, n: null };
    if (rest.startsWith('case-')) return { ...r, name: 'case', k: rest.slice(5) };
    if (rest === 'all-cards' || rest === 'all-quiz') return { ...r, name: rest.slice(4), n: 'all' };
    const w = rest.match(/^w(\d+)(?:-(t(\d+)|method|cards|quiz|cases|law|terms|read|learn|thesis|plan|paras|rapid|s\d+|r\d+))?$/);
    if (!w || !week(c, +w[1])) return { ...r, name: 'course' };
    const n = +w[1];
    if (!w[2]) return { ...r, name: 'week', n };
    if (w[2] === 'read') return { ...r, name: 'read', n };
    if (/^(learn|thesis|plan|paras|rapid|s\d+|r\d+)$/.test(w[2])) return { ...r, name: 'drill', what: w[2], n };
    if (w[3] != null) return { ...r, name: 'topic', n, ti: +w[3] };
    return { ...r, name: w[2] === 'cases' ? 'wcases' : w[2] === 'law' ? 'wlaw' : w[2], n };
  }
  let current = null;
  /* The laptop sidebar: courses, then the open course's weeks and lists. Hidden on phones by CSS. */
  function side(r) {
    const cur = r.c;
    const link = (k, l) => `<button class="sl ${r.name === k ? 'on' : ''}" data-go="c-${cur.id}-${k}">${l}</button>`;
    return `<aside class="side" aria-label="Navigation">
      <button class="brand" data-go="home">${myBall(34)}DuoDisco</button>
      <div class="slbl">Courses</div>
      ${courses().map(c => `<button class="sc ${cur && cur.id === c.id ? 'on' : ''}" style="${cv(c)}" data-go="c-${c.id}"><span class="dot"></span><span class="nm">${esc(c.short || c.name)}</span><span class="ct">${addedWeeks(c).length}/${c.weeks}</span></button>`).join('')}
      <button class="sc sadd" data-go="new-course"><span class="dot">+</span><span class="nm">Add a course</span></button>
      ${cur ? `<div class="slbl">${esc(cur.short || cur.name)}</div>
        <div style="${cv(cur)}">${weeksOf(cur).map(n => { const w = week(cur, n), s = state(cur, n);
          return `<button class="sw ${s} ${r.n === n ? 'on' : ''}" ${w ? `data-go="c-${cur.id}-w${n}"` : `data-none="${n}"`}><b>${pad(n)}</b><span>${w ? esc(w.title) : 'Not added yet'}</span></button>`; }).join('')}
        ${isArts(cur) ? '' : `<div class="slinks">${link('cases', 'Cases')}${link('law', 'Legislation')}${link('methods', 'Methods')}${link('search', 'Search')}</div>`}</div>` : ''}
      <button class="sset sball" data-go="ballroom">${myBall(18)}The Ballroom <span class="ct">${earnedCount()}/${MILESTONES.length}</span></button>
      <button class="sset" data-go="settings">Settings</button>
    </aside>`;
  }
  function render() {
    const r = parse(), c = r.c;
    let html;
    switch (r.name) {
      case 'home': html = home(); break;
      case 'welcome':
        app.innerHTML = welcomePage(); current = r; document.title = 'DuoDisco';
        document.getElementById('w-name').addEventListener('input', e => { W.name = e.target.value; W.missing = false; const g = app.querySelector('[data-act="w-go"]'); if (g) g.disabled = !(W.name.trim() && W.tiles.length === 3); });
        return;
      case 'settings': html = settingsPage(); break;
      case 'ballroom': html = ballroomPage(); break;
      case 'calendar': html = calendarPage(); break;
      case 'calendar-add': html = calendarAddPage(); break;
      case 'form': html = courseForm(c); break;
      case 'course': html = coursePage(c); break;
      case 'cases': html = casesPage(c); break;
      case 'law': html = lawPage(c); break;
      case 'methods': html = methodsPage(c); break;
      case 'search': html = searchPage(c); break;
      case 'case': html = casePage(c, r.k); break;
      case 'week': html = isEssay(week(c, r.n)) ? essayWeekPage(c, r.n) : weekPage(c, r.n); break;
      case 'read': html = readPage(c, r.n); break;
      case 'drill': if (!session || session.route !== r.raw) startDrill(c, r.what, r.n, r.raw); html = drillPage(c); break;
      case 'topic': html = topicPage(c, r.n, r.ti); break;
      case 'method': html = methodPage(c, r.n); break;
      case 'wcases': html = casesPage(c, r.n); break;
      case 'wlaw': html = lawPage(c, r.n); break;
      case 'terms': html = termsPage(c, r.n); break;
      case 'cards':
        if (!session || session.route !== r.raw) { session = { route: r.raw, kind: 'cards', started: false, filter: preset || 'all', len: 20 }; preset = null; }
        html = cardsPage(c, r.n, r.raw); break;
      case 'quiz': if (!session || session.route !== r.raw) startQuiz(c, r.n, r.raw); html = quizPage(c, r.n); break;
    }
    app.innerHTML = `<div class="layout">${side(r)}<div class="main">${html}</div></div>`;
    document.title = c ? `${c.short || c.name} · DuoDisco` : 'DuoDisco';
    if (r.name === 'form') document.getElementById('cform').addEventListener('submit', e => { e.preventDefault(); saveCourse(r.c); });
    if (r.name === 'settings') document.getElementById('rsfile')?.addEventListener('change', e => { const f = e.target.files[0]; if (f) f.text().then(restore); });
    if (r.name === 'drill') {
      const sf = document.querySelector('.sofar'); if (sf) sf.scrollTop = sf.scrollHeight;
      const ta = document.getElementById('ans');
      if (ta) {
        ta.addEventListener('input', () => { if (!session.res) session.answer = ta.value; });
        ta.addEventListener('keydown', e => {
          if (e.key !== 'Enter' || e.shiftKey) return;
          e.preventDefault();
          // Enter checks; once checked (rapid recall keeps the box on screen), Enter again goes to the next sentence
          if (session.res) { Object.assign(session, { i: session.i + 1, res: null, answer: '', hint: false, first: true, plan: null }); render(); window.scrollTo(0, 0); }
          else if (ta.value.trim()) { drillCheck(c, false); render(); }
        });
        if (matchMedia('(hover: hover)').matches || ta.classList.contains('rapidin')) ta.focus();
      }
      document.querySelectorAll('.pin').forEach(el => el.addEventListener('keydown', e => { if (e.key === 'Enter') { e.preventDefault(); const nx = el.closest('.prow').nextElementSibling?.querySelector('.pin'); if (nx) nx.focus(); else { drillCheck(c, false); render(); } } }));
    }
    if (r.name === 'search') { const q = document.getElementById('q'), out = document.getElementById('results'); q.addEventListener('input', () => { out.innerHTML = searchResults(c, q.value); }); q.focus(); }
    current = r;
    checkRewards(); setTimeout(showUnlock, 350);
  }
  // After an answer is marked, Enter goes to the next one, so a whole essay can be done from the keyboard.
  document.addEventListener('keydown', e => {
    if (e.key !== 'Enter' || e.shiftKey || !session || session.kind !== 'essay' || !session.res || document.querySelector('.unlock')) return;
    if (e.target.closest && e.target.closest('textarea, input')) return;
    e.preventDefault(); Object.assign(session, { i: session.i + 1, res: null, answer: '', hint: false, first: true, plan: null }); render(); window.scrollTo(0, 0);
  });
  addEventListener('hashchange', () => {
    if (session && session.route !== location.hash.slice(1)) session = null;
    if (practise && !location.hash.endsWith('-method')) practise = null;
    render(); window.scrollTo(0, 0);
  });

  app.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-act],[data-pick],[data-none],[data-filter],[data-len],[data-scroll],[data-tile],[data-look]');
    if (!t || t.disabled) return;
    if (t.dataset.scroll) { document.getElementById(t.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.dataset.go) { go(t.dataset.go); return; }
    if (t.dataset.look) { P.look = t.dataset.look; save(); toast('Now wearing ' + window.BALLROOM.byId(P.look).name); render(); return; }
    if (t.dataset.tile != null) { const i = +t.dataset.tile, k = W.tiles.indexOf(i); if (k >= 0) W.tiles.splice(k, 1); else if (W.tiles.length < 3) W.tiles.push(i); W.missing = false; W.err = ''; render(); return; }
    if (t.dataset.none) { toast(`Week ${t.dataset.none} hasn’t been added yet.`); return; }
    const c = current?.c;
    if (t.dataset.filter) { session.filter = t.dataset.filter; render(); return; }
    if (t.dataset.len != null) { session.len = +t.dataset.len; render(); return; }
    if (t.dataset.pick != null && session?.kind === 'quiz' && session.picked == null) {
      session.picked = +t.dataset.pick; if (session.picked === session.items[session.i].item.answer) session.score++; render(); return;
    }
    switch (t.dataset.act) {
      case 'cal-add': calCapture(); calDraft = { from: t.dataset.d, to: t.dataset.d, kind: 'assess', tags: [] }; go('calendar-add'); break;
      case 'cal-edit': {
        const ev = eventsOf().find(e => e.id === t.dataset.id);
        if (ev) { calDraft = { ...ev }; go('calendar-edit-' + ev.id); }
        break;
      }
      case 'cal-kind': calCapture(); calDraft.kind = t.dataset.k; render(); break;
      case 'cal-subject': calCapture(); calDraft.course = calDraft.course === t.dataset.k ? '' : t.dataset.k; render(); break;
      case 'cal-tag': {
        calCapture(); const n = t.dataset.k; calDraft.tags = calDraft.tags || [];
        calDraft.tags = calDraft.tags.includes(n) ? calDraft.tags.filter(x => x !== n) : [...calDraft.tags, n];
        render(); break;
      }
      case 'cal-colour': calCapture(); calDraft.newColour = t.dataset.k; render(); break;
      case 'cal-tag-add': {
        calCapture();
        const name = (calDraft.newName || '').trim();
        if (!name) { toast('Type a tag name first'); break; }
        if (!tagOf(name)) CFG.tags = [...tagsOf(), { name, colour: calDraft.newColour || INKS[0][0] }];
        calDraft.tags = [...new Set([...(calDraft.tags || []), name])]; calDraft.newName = '';
        saveCfg(); render(); break;
      }
      case 'cal-tag-del': {
        calCapture();
        const n = t.dataset.k;
        if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Sure?'; break; }
        CFG.tags = tagsOf().filter(x => x.name !== n);
        CFG.events = eventsOf().map(e => ({ ...e, tags: (e.tags || []).filter(x => x !== n) }));
        calDraft.tags = (calDraft.tags || []).filter(x => x !== n);
        saveCfg(); render(); break;
      }
      case 'cal-save': {
        calCapture();
        const err = document.getElementById('cerr'), label = calDraft.label.trim(), from = calDraft.from, to = calDraft.to || from;
        if (!label) { err.textContent = 'Give it a name, like Essay 1 or Tutorial.'; document.getElementById('cal-label').focus(); break; }
        if (!from) { err.textContent = 'Pick a start date.'; break; }
        if (to < from) { err.textContent = 'The end date is before the start date.'; break; }
        const fields = { label, from, to, kind: calDraft.kind || 'assess', course: calDraft.course || '', tags: calDraft.tags || [] };
        if (calDraft.id) { CFG.events = eventsOf().map(e => e.id === calDraft.id ? { ...e, ...fields } : e); saveCfg(); toast('Saved'); }
        else { CFG.events = [...eventsOf(), { id: newId(), ...fields }]; saveCfg(); toast('Added to the calendar'); }
        calDraft = null; go('calendar'); break;
      }
      case 'cal-del': {
        if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Tap again to delete'; break; }
        CFG.events = eventsOf().filter(e => e.id !== t.dataset.id);
        if (P.assessDone) delete P.assessDone[t.dataset.id];
        save(); saveCfg(); toast('Deleted'); calDraft = null; go('calendar'); break;
      }
      case 'start': startCards(c, current.n); render(); window.scrollTo(0, 0); break;
      case 'e-check': case 'e-plan': drillCheck(c, false); render(); break;
      case 'e-show': drillCheck(c, true); render(); break;
      case 'e-hint': session.hint = true; render(); break;
      case 'e-retry': session.res = null; render(); break;
      case 'e-had': { const st = session.steps[session.i]; session.res.ok = true; session.res.had = true; session.right++; session.missed = session.missed.filter(x => x !== st); eSave(c, st.n, stepKey(st), true); render(); break; }
      case 'e-next': Object.assign(session, { i: session.i + 1, res: null, answer: '', hint: false, first: true, plan: null }); render(); window.scrollTo(0, 0); break;
      case 'e-missed': Object.assign(session, { steps: session.missed, missed: [], i: 0, right: 0, res: null, answer: '', hint: false, first: true }); render(); window.scrollTo(0, 0); break;
      case 'show': session.open = true; render(); break;
      case 'got': answerCard(c, true); render(); window.scrollTo(0, 0); break;
      case 'again': answerCard(c, false); render(); window.scrollTo(0, 0); break;
      case 'cards-again': { const m = session.again.map(x => ({ item: x.item, n: x.n })); Object.assign(session, { queue: m, total: m.length, done: 0, got: 0, again: [], open: false }); render(); break; }
      case 'cards-new': session.started = false; render(); break;
      case 'topic-cards': preset = 't' + t.dataset.ti; session = null; go(`c-${c.id}-w${current.n}-cards`); break;
      case 'next': session.i++; session.picked = null; render(); window.scrollTo(0, 0); break;
      case 'quiz-again': startQuiz(c, current.n, current.raw); render(); break;
      case 'practise': practise = { key: wkey(c, current.n), shown: 0 }; render(); break;
      case 'practise-next':
        practise.shown++;
        if (practise.shown >= week(c, current.n).method.steps.length) { P.methods = P.methods || {}; P.methods[wkey(c, current.n)] = Date.now(); save(); }
        render(); break;
      case 'practise-stop': practise = null; render(); break;
      case 'assess-toggle': {
        const id = t.dataset.ev;
        P.assessDone = P.assessDone || {};
        if (P.assessDone[id]) delete P.assessDone[id]; else P.assessDone[id] = Date.now();
        save(); render(); break;
      }
      case 'remove-course': {
        if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Tap again to remove'; break; }
        const id = t.dataset.id, mine = CFG.added.find(a => a.id === id), empty = !Object.keys(UNI.byId[id].content).length;
        if (mine && empty) { CFG.added = CFG.added.filter(a => a.id !== id); const i = UNI.courses.indexOf(UNI.byId[id]); UNI.courses.splice(i, 1); delete UNI.byId[id]; }
        else CFG.removed.push(id);
        saveCfg(); toast('Course removed'); go('home'); break;
      }
      case 'restore-course': CFG.removed = CFG.removed.filter(x => x !== t.dataset.id); saveCfg(); toast('Course brought back'); render(); break;
      case 'sync-now': t.disabled = true; cloudPush(true).then(cloudPull).then(() => { t.disabled = false; }); break;
      case 'sync-off':
        if (!t.dataset.sure) { t.dataset.sure = '1'; t.textContent = 'Tap again to sign out'; break; }
        SYNC = null; syncState = ''; try { localStorage.removeItem(SKEY); } catch (e) {} store.set('uni.skip', true);
        toast('Signed out on this device. Your data here is kept.'); render(); break;
      case 'w-go': welcomeGo(false); break;
      case 'w-create': welcomeGo(true); break;
      case 'w-back': W.missing = false; W.tiles = []; render(); break;
      case 'w-skip': store.set('uni.skip', true); go('home'); render(); break;
      case 'copy': { const ta = document.getElementById('bk'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast('Copied'), () => { ta.select(); toast('Select all and copy'); }); break; }
      case 'restore': restore(document.getElementById('rs').value); break;
      case 'reset':
        if (t.dataset.sure) { P = blank(); save(); toast('Progress reset'); go('home'); }
        else { t.dataset.sure = '1'; t.textContent = 'Tap again to reset'; }
        break;
    }
  });

  migrateAssess();
  render();
  cloudPull();
})();
