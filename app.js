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
  const blank = () => ({ weeks: {}, cards: {}, quiz: {} });
  let P = Object.assign(blank(), store.get(PKEY, {}));
  const save = () => { P._at = Date.now(); store.set(PKEY, P); cloudPush(); };
  try { localStorage.removeItem('uni.example'); localStorage.removeItem('uni.progress.example'); } catch (e) {}

  /* Courses you add, edit or remove in the app. Saved on this device and in backups.
   * added: courses created in the app; edits: changes to any course; removed: hidden course ids. */
  const CKEY = 'uni.courses';
  const blankCfg = () => ({ added: [], edits: {}, removed: [] });
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

  const INKS = [['#ff48b0', 'Pink'], ['#0078bf', 'Blue'], ['#00a95c', 'Green'], ['#ff6c2f', 'Orange'], ['#765ba7', 'Violet'], ['#f15060', 'Red'], ['#00838a', 'Teal'], ['#3255a4', 'Navy']];
  function applyCfg() {
    // drop app-made courses that were deleted (for example on another device)
    UNI.courses.filter(c => c.mine && !CFG.added.some(a => a.id === c.id)).forEach(c => { UNI.courses.splice(UNI.courses.indexOf(c), 1); delete UNI.byId[c.id]; });
    CFG.added.forEach(a => {
      if (!UNI.byId[a.id]) UNI.addCourse({ id: a.id, mine: true });
      const c = UNI.byId[a.id];
      if (c.mine) c.orig = { name: a.name, short: a.short, colour: a.colour, weeks: a.weeks };
    });
    UNI.courses.forEach(c => {
      if (!c.orig) c.orig = { name: c.name, short: c.short, colour: c.colour, weeks: c.weeks };
      Object.assign(c, c.orig, CFG.edits[c.id] || {});
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
  const tabs = (c, on) => `<div class="tabs" role="tablist">${[['', 'Weeks'], ['cases', 'Cases'], ['law', 'Legislation'], ['methods', 'Methods']].map(([k, l]) => `<button role="tab" aria-selected="${on === k}" data-go="c-${c.id}${k ? '-' + k : ''}">${l}</button>`).join('')}</div>`;
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
        <div class="segs" style="--n:${c.weeks}">${weeksOf(c).map(n => `<i class="${state(c, n)}"></i>`).join('')}</div>
        <div class="st"><span>${a} of ${c.weeks} weeks added</span>${nw ? `<b>${nw} new</b>` : '<span></span>'}</div></button>`;
    }).join('');
    return `<div class="screen">
      <div class="bar"><span class="logo"><img src="icon.svg" alt="" width="30" height="30">DuoDisco</span>
        <span class="barbtns"><button class="iconbtn" data-go="new-course" aria-label="Add a course"><svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14"/></svg></button>
        <button class="iconbtn" data-go="settings" aria-label="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button></span></div>
      <h1 class="title">Courses</h1>
      ${rows || `<div class="empty">No courses yet. Add one with the + button.</div>`}
      <button class="addrow" data-go="new-course"><span>+</span>Add a course</button>
      <p class="note">New weeks appear here once their notes have been added.</p>
    </div>`;
  }

  /* ---------- course: weeks, cases, legislation, methods, search ---------- */
  function courseHead(c, tab) {
    const a = addedWeeks(c).length;
    return `<div class="bar">${back('home', 'Courses')}<span class="barbtns"><button class="textbtn" data-go="edit-${c.id}">Edit</button>${searchBtn(c)}</span></div>
      <h1 class="ctitle">${esc(c.name)}</h1>
      <div class="meta" style="margin-top:6px">${a} of ${c.weeks} weeks added</div>
      ${tabs(c, tab)}`;
  }
  function coursePage(c) {
    const a = addedWeeks(c).length;
    const cells = weeksOf(c).map(n => {
      const s = state(c, n), w = week(c, n);
      const label = s === 'none' ? '' : s === 'new' ? `<b>New</b> · ${esc(w.title)}` : esc(w.title);
      return `<button class="cell ${s}" ${s === 'none' ? `data-none="${n}"` : `data-go="c-${c.id}-w${n}"`} aria-label="Week ${n}${w ? ': ' + esc(w.title) : ', not added yet'}">
        <div class="n">${pad(n)}</div><div class="t">${label}</div></button>`;
    }).join('');
    return `<div class="screen ${a ? 'has-dock' : ''}" style="${cv(c)}">${courseHead(c, '')}
      <div class="grid">${cells}</div>
      <div class="key"><span><i style="background:var(--c)"></i>Studied</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--c)"></i>New</span><span><i style="background:var(--faint)"></i>Not added yet</span></div>
      ${a ? `<div class="dock"><div class="two"><button class="btn" data-go="c-${c.id}-all-cards">Flashcards</button><button class="btn ghost" data-go="c-${c.id}-all-quiz">Quiz</button></div><div class="dockcap">From all ${plural(a, 'week')} added</div></div>`
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
    rec[gotIt ? 'got' : 'again']++; rec.last = gotIt && !cur.missed ? 'got' : 'again'; rec.at = Date.now(); P.cards[id] = rec; save();
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
      if (n !== 'all' && !s.saved) { const k = wkey(c, n), prev = P.quiz[k]; if (!prev || s.score >= prev.best) P.quiz[k] = { best: s.score, of: s.items.length, at: Date.now() }; save(); s.saved = true; }
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
      <div class="logo"><img src="icon.svg" alt="" width="30" height="30">DuoDisco</div>
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

  /* ---------- adding and editing courses ---------- */
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
    const vals = { name, short: short || name, colour, weeks };
    if (!c) {
      let id = name.toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 24) || 'course', base = id, k = 2;
      while (UNI.byId[id]) id = base + k++;
      CFG.added.push({ id, ...vals }); saveCfg(); toast('Course added'); go('c-' + id);
    } else {
      if (c.mine) Object.assign(CFG.added.find(a => a.id === c.id), vals); else CFG.edits[c.id] = vals;
      saveCfg(); toast('Saved'); go('c-' + c.id);
    }
  }

  /* ---------- routing ---------- */
  function parse() {
    const h = location.hash.slice(1) || 'home';
    if (cloudOn && !SYNC && !store.get('uni.skip', false) && h !== 'welcome') return { name: 'welcome', raw: h };
    if (h === 'welcome') return SYNC ? { name: 'home', raw: 'home' } : { name: 'welcome', raw: h };
    if (h === 'home' || h === 'settings') return { name: h, raw: h };
    if (h === 'new-course') return { name: 'form', raw: h };
    if (h.startsWith('edit-')) { const c = course(h.slice(5)); return c ? { name: 'form', c, raw: h } : { name: 'home', raw: 'home' }; }
    const m = h.match(/^c-([a-z0-9]+)(?:-(.*))?$/);
    if (!m || !course(m[1])) return { name: 'home', raw: 'home' };
    const c = course(m[1]), rest = m[2] || '';
    const r = { c, raw: h };
    if (!rest) return { ...r, name: 'course' };
    if (['cases', 'law', 'methods', 'search'].includes(rest)) return { ...r, name: rest };
    if (rest.startsWith('case-')) return { ...r, name: 'case', k: rest.slice(5) };
    if (rest === 'all-cards' || rest === 'all-quiz') return { ...r, name: rest.slice(4), n: 'all' };
    const w = rest.match(/^w(\d+)(?:-(t(\d+)|method|cards|quiz|cases|law|terms))?$/);
    if (!w || !week(c, +w[1])) return { ...r, name: 'course' };
    const n = +w[1];
    if (!w[2]) return { ...r, name: 'week', n };
    if (w[3] != null) return { ...r, name: 'topic', n, ti: +w[3] };
    return { ...r, name: w[2] === 'cases' ? 'wcases' : w[2] === 'law' ? 'wlaw' : w[2], n };
  }
  let current = null;
  /* The laptop sidebar: courses, then the open course's weeks and lists. Hidden on phones by CSS. */
  function side(r) {
    const cur = r.c;
    const link = (k, l) => `<button class="sl ${r.name === k ? 'on' : ''}" data-go="c-${cur.id}-${k}">${l}</button>`;
    return `<aside class="side" aria-label="Navigation">
      <button class="brand" data-go="home"><img src="icon.svg" alt="" width="34" height="34">DuoDisco</button>
      <div class="slbl">Courses</div>
      ${courses().map(c => `<button class="sc ${cur && cur.id === c.id ? 'on' : ''}" style="${cv(c)}" data-go="c-${c.id}"><span class="dot"></span><span class="nm">${esc(c.short || c.name)}</span><span class="ct">${addedWeeks(c).length}/${c.weeks}</span></button>`).join('')}
      <button class="sc sadd" data-go="new-course"><span class="dot">+</span><span class="nm">Add a course</span></button>
      ${cur ? `<div class="slbl">${esc(cur.short || cur.name)}</div>
        <div style="${cv(cur)}">${weeksOf(cur).map(n => { const w = week(cur, n), s = state(cur, n);
          return `<button class="sw ${s} ${r.n === n ? 'on' : ''}" ${w ? `data-go="c-${cur.id}-w${n}"` : `data-none="${n}"`}><b>${pad(n)}</b><span>${w ? esc(w.title) : 'Not added yet'}</span></button>`; }).join('')}
        <div class="slinks">${link('cases', 'Cases')}${link('law', 'Legislation')}${link('methods', 'Methods')}${link('search', 'Search')}</div></div>` : ''}
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
      case 'form': html = courseForm(c); break;
      case 'course': html = coursePage(c); break;
      case 'cases': html = casesPage(c); break;
      case 'law': html = lawPage(c); break;
      case 'methods': html = methodsPage(c); break;
      case 'search': html = searchPage(c); break;
      case 'case': html = casePage(c, r.k); break;
      case 'week': html = weekPage(c, r.n); break;
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
    if (r.name === 'search') { const q = document.getElementById('q'), out = document.getElementById('results'); q.addEventListener('input', () => { out.innerHTML = searchResults(c, q.value); }); q.focus(); }
    current = r;
  }
  addEventListener('hashchange', () => {
    if (session && session.route !== location.hash.slice(1)) session = null;
    if (practise && !location.hash.endsWith('-method')) practise = null;
    render(); window.scrollTo(0, 0);
  });

  app.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-act],[data-pick],[data-none],[data-filter],[data-len],[data-scroll],[data-tile]');
    if (!t || t.disabled) return;
    if (t.dataset.scroll) { document.getElementById(t.dataset.scroll)?.scrollIntoView({ behavior: 'smooth' }); return; }
    if (t.dataset.go) { go(t.dataset.go); return; }
    if (t.dataset.tile != null) { const i = +t.dataset.tile, k = W.tiles.indexOf(i); if (k >= 0) W.tiles.splice(k, 1); else if (W.tiles.length < 3) W.tiles.push(i); W.missing = false; W.err = ''; render(); return; }
    if (t.dataset.none) { toast(`Week ${t.dataset.none} hasn’t been added yet.`); return; }
    const c = current?.c;
    if (t.dataset.filter) { session.filter = t.dataset.filter; render(); return; }
    if (t.dataset.len != null) { session.len = +t.dataset.len; render(); return; }
    if (t.dataset.pick != null && session?.kind === 'quiz' && session.picked == null) {
      session.picked = +t.dataset.pick; if (session.picked === session.items[session.i].item.answer) session.score++; render(); return;
    }
    switch (t.dataset.act) {
      case 'start': startCards(c, current.n); render(); window.scrollTo(0, 0); break;
      case 'show': session.open = true; render(); break;
      case 'got': answerCard(c, true); render(); window.scrollTo(0, 0); break;
      case 'again': answerCard(c, false); render(); window.scrollTo(0, 0); break;
      case 'cards-again': { const m = session.again.map(x => ({ item: x.item, n: x.n })); Object.assign(session, { queue: m, total: m.length, done: 0, got: 0, again: [], open: false }); render(); break; }
      case 'cards-new': session.started = false; render(); break;
      case 'topic-cards': preset = 't' + t.dataset.ti; session = null; go(`c-${c.id}-w${current.n}-cards`); break;
      case 'next': session.i++; session.picked = null; render(); window.scrollTo(0, 0); break;
      case 'quiz-again': startQuiz(c, current.n, current.raw); render(); break;
      case 'practise': practise = { key: wkey(c, current.n), shown: 0 }; render(); break;
      case 'practise-next': practise.shown++; render(); break;
      case 'practise-stop': practise = null; render(); break;
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

  render();
  cloudPull();
})();
