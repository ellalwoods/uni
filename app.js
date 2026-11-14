/* Uni: the app. Vanilla JS, no build step. Routes live in the URL hash, e.g. #c-ica-w2-cards. */
(() => {
  'use strict';
  const app = document.getElementById('app');
  const esc = s => String(s ?? '').replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
  const pad = n => String(n).padStart(2, '0');
  const hashStr = s => { let h = 5381; for (const ch of s) h = ((h * 33) ^ ch.charCodeAt(0)) >>> 0; return h.toString(36); };
  const shuffle = a => { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };

  /* ---------- storage ---------- */
  const store = {
    get(k, d) { try { const v = localStorage.getItem(k); return v == null ? d : JSON.parse(v); } catch (e) { return d; } },
    set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} },
  };
  const EXAMPLE = !!UNI.example;
  const PKEY = EXAMPLE ? 'uni.progress.example' : 'uni.progress';
  const blank = () => ({ weeks: {}, cards: {}, quiz: {} });
  let P = Object.assign(blank(), store.get(PKEY, {}));
  const save = () => store.set(PKEY, P);
  if (EXAMPLE && !Object.keys(P.weeks).length) {
    // so the example shows a mix of studied and new weeks
    const opened = { ica: 8, corporate: 5, ailaw: 6 };
    for (const [id, n] of Object.entries(opened)) for (let w = 1; w <= n; w++) P.weeks[id + ':' + w] = Date.now();
    save();
  }

  /* ---------- content helpers ---------- */
  const courses = () => UNI.courses;
  const course = id => UNI.byId[id];
  const week = (c, n) => c.content[n];
  const wkey = (c, n) => c.id + ':' + n;
  const state = (c, n) => !week(c, n) ? 'none' : P.weeks[wkey(c, n)] ? 'studied' : 'new';
  const weeksOf = c => Array.from({ length: c.weeks }, (_, i) => i + 1);
  const added = c => weeksOf(c).filter(n => week(c, n)).length;
  const newCount = c => weeksOf(c).filter(n => state(c, n) === 'new').length;
  const cardId = (c, n, card) => `${c.id}:${n}:${hashStr(card.q)}`;
  const known = (c, n, card) => (P.cards[cardId(c, n, card)] || {}).last === 'got';
  const cv = c => `--c:${c.colour}`;

  /* ---------- small UI bits ---------- */
  const back = (to, label) => `<button class="back" data-go="${to}">‹ ${esc(label)}</button>`;
  const src = (file, extra) => file ? `<div class="src"><span class="doc"></span><span>${esc(file)}${extra ? ' · ' + esc(extra) : ''}</span></div>` : '';
  const prog = (i, n) => `<div class="prog">${Array.from({ length: Math.min(n, 40) }, (_, k) => `<i class="${k < Math.round(i / n * Math.min(n, 40)) ? 'd' : ''}"></i>`).join('')}</div>`;
  let toastTimer;
  function toast(msg) {
    document.querySelector('.toast')?.remove();
    const t = document.createElement('div'); t.className = 'toast'; t.setAttribute('role', 'status'); t.textContent = msg;
    document.body.appendChild(t); clearTimeout(toastTimer); toastTimer = setTimeout(() => t.remove(), 2400);
  }
  const go = r => { location.hash = r; };

  /* ---------- screens ---------- */
  function home() {
    const cs = courses();
    const rows = cs.map(c => {
      const a = added(c), nw = newCount(c);
      return `<button class="crow" style="${cv(c)}" data-go="c-${c.id}">
        <div class="nm">${esc(c.name)}</div>
        <div class="segs" style="--n:${c.weeks}">${weeksOf(c).map(n => `<i class="${state(c, n)}"></i>`).join('')}</div>
        <div class="st"><span>${a} of ${c.weeks} weeks added</span>${nw ? `<b>${nw} new</b>` : '<span></span>'}</div></button>`;
    }).join('');
    return `<div class="screen">
      <div class="bar"><span class="meta">${cs.length} ${cs.length === 1 ? 'course' : 'courses'}</span>
        <button class="iconbtn" data-go="settings" aria-label="Settings"><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"><path d="M4 7h10M18 7h2M4 17h4M12 17h8"/><circle cx="16" cy="7" r="2"/><circle cx="10" cy="17" r="2"/></svg></button></div>
      <h1 class="title">Courses</h1>
      ${EXAMPLE ? `<div class="banner">You're looking at example content. Turn it off in Settings.</div>` : ''}
      ${rows || `<div class="empty">No courses yet.</div>`}
      <p class="note">New weeks appear here once their notes have been added.</p>
    </div>`;
  }

  function coursePage(c) {
    const a = added(c);
    const cells = weeksOf(c).map(n => {
      const s = state(c, n), w = week(c, n);
      const label = s === 'none' ? '' : s === 'new' ? `<b>New</b> · ${esc(w.title)}` : esc(w.title);
      return `<button class="cell ${s}" ${s === 'none' ? `data-none="${n}"` : `data-go="c-${c.id}-w${n}"`} aria-label="Week ${n}${w ? ': ' + esc(w.title) : ', not added yet'}">
        <div class="n">${pad(n)}</div><div class="t">${label}</div></button>`;
    }).join('');
    return `<div class="screen ${a ? 'has-dock' : ''}" style="${cv(c)}">
      <div class="bar">${back('home', 'Courses')}<span class="meta">${a} of ${c.weeks} weeks</span></div>
      <h1 class="ctitle">${esc(c.name)}</h1>
      <div class="grid">${cells}</div>
      <div class="key"><span><i style="background:var(--c)"></i>Studied</span><span><i style="box-shadow:inset 0 0 0 1.5px var(--c)"></i>New</span><span><i style="background:var(--faint)"></i>Not added yet</span></div>
      ${a ? `<div class="dock"><button class="btn" data-go="c-${c.id}-all-cards">Flashcards from all weeks</button><button class="btn ghost" data-go="c-${c.id}-all-quiz">Quiz from all weeks</button></div>`
          : `<p class="note">Nothing to study yet. Weeks show up here once their notes are added.</p>`}
    </div>`;
  }

  function weekPage(c, n) {
    const w = week(c, n);
    if (!P.weeks[wkey(c, n)]) { P.weeks[wkey(c, n)] = Date.now(); save(); }
    const k = (w.cards || []).filter(card => known(c, n, card)).length;
    const best = P.quiz[wkey(c, n)];
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back('c-' + c.id, c.short || c.name)}<span class="meta">Week ${n} of ${c.weeks}</span></div>
      <div class="wnum">${pad(n)}</div>
      <h1 class="wtitle">${esc(w.title)}</h1>
      ${src(w.source?.file, w.source?.pages ? w.source.pages + ' pages' : '')}
      <div class="modes">
        <button class="mode main" data-go="c-${c.id}-w${n}-cards"><b>Flashcards</b><small>${(w.cards || []).length} cards${k ? ` · ${k} known` : ''}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-quiz"><b>Quiz</b><small>${(w.quiz || []).length} questions${best ? ` · best ${best.best}/${best.of}` : ''}</small></button>
        <button class="mode" data-go="c-${c.id}-w${n}-summary"><b>Summary</b><small>${(w.summary || []).length} sections</small></button>
      </div>
      ${(w.topics || []).length ? `<div class="sub">Topics this week</div><ol class="topics">${w.topics.map(t => `<li>${esc(t)}</li>`).join('')}</ol>` : ''}
    </div>`;
  }

  function summaryPage(c, n) {
    const w = week(c, n);
    return `<div class="screen" style="${cv(c)}">
      <div class="bar">${back(`c-${c.id}-w${n}`, 'Week ' + n)}<span class="meta">Summary</span></div>
      <h1 class="wtitle" style="margin-top:14px">${esc(w.title)}</h1>
      ${src(w.source?.file)}
      ${(w.summary || []).map(s => `<div class="sec"><h3>${esc(s.heading)}</h3><ul>${(s.points || []).map(p => `<li>${esc(p)}</li>`).join('')}</ul>${s.ref ? `<div class="ref">Notes, ${esc(s.ref)}</div>` : ''}</div>`).join('')}
    </div>`;
  }

  /* ---------- flashcards ---------- */
  let session = null;
  function pool(c, n, kind) {
    const ns = n === 'all' ? weeksOf(c).filter(x => week(c, x)) : [n];
    return ns.flatMap(x => (week(c, x)[kind] || []).map(item => ({ item, n: x })));
  }
  function startCards(c, n, route) {
    const items = pool(c, n, 'cards');
    session = { route, kind: 'cards', queue: n === 'all' ? shuffle(items) : items, total: items.length, done: 0, got: 0, again: [], open: false };
  }
  function cardsPage(c, n) {
    const s = session;
    const backTo = n === 'all' ? 'c-' + c.id : `c-${c.id}-w${n}`;
    const backLabel = n === 'all' ? (c.short || c.name) : 'Week ' + n;
    if (!s.total) return emptyStudy(c, backTo, backLabel, 'There are no flashcards here yet.');
    if (!s.queue.length) return `<div class="screen result" style="${cv(c)}">
        <div class="bar">${back(backTo, backLabel)}<span class="meta">Flashcards</span></div>
        <div class="big">${s.got}/${s.total}</div><p>You knew ${s.got} of ${s.total} cards first time.</p>
        <div class="dock">${s.again.length ? `<button class="btn" data-act="cards-again">Go through the ${s.again.length} you missed</button>` : ''}
        <button class="btn ${s.again.length ? 'ghost' : ''}" data-go="${backTo}">Done</button></div></div>`;
    const { item, n: wn } = s.queue[0];
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(backTo, backLabel)}<span class="meta">${s.done + 1} of ${s.done + s.queue.length}</span></div>
      ${prog(s.done, s.done + s.queue.length)}
      <div class="ghostnum" aria-hidden="true">${pad(wn)}</div>
      <div class="card"><div class="k">Week ${wn}${n === 'all' ? ' · ' + esc(week(c, wn).title) : ''}</div>
        <div class="q">${esc(item.q)}</div>
        ${s.open ? `<div class="a">${esc(item.a)}</div><div class="ref">From ${esc(week(c, wn).source?.file || 'your notes')}${item.ref ? ', ' + esc(item.ref) : ''}</div>` : ''}</div>
      <div class="dock">${s.open ? `<div class="two"><button class="btn ghost" data-act="again">See again</button><button class="btn" data-act="got">Got it</button></div>`
                                  : `<button class="btn" data-act="show">Show answer</button>`}</div>
    </div>`;
  }
  function answerCard(c, gotIt) {
    const s = session, cur = s.queue.shift(), id = cardId(c, cur.n, cur.item);
    const rec = P.cards[id] || { got: 0, again: 0 };
    rec[gotIt ? 'got' : 'again']++; rec.last = gotIt ? 'got' : 'again'; rec.at = Date.now(); P.cards[id] = rec; save();
    if (gotIt) { if (!cur.missed) s.got++; s.done++; }
    else { if (!cur.missed) s.again.push(cur); cur.missed = true; s.queue.push(cur); }
    s.open = false;
  }

  /* ---------- quiz ---------- */
  function startQuiz(c, n, route) {
    const items = shuffle(pool(c, n, 'quiz'));
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
        <div class="dock"><button class="btn" data-act="quiz-again">Try again</button><button class="btn ghost" data-go="${backTo}">Done</button></div></div>`;
    }
    const { item, n: wn } = s.items[s.i], picked = s.picked;
    const opts = item.options.map((o, k) => {
      const cls = picked == null ? '' : k === item.answer ? 'right' : k === picked ? 'wrong' : '';
      return `<button class="opt ${cls}" data-pick="${k}" ${picked != null ? 'disabled' : ''}><span class="l">${'ABCDEF'[k]}</span><span>${esc(o)}</span></button>`;
    }).join('');
    return `<div class="screen has-dock" style="${cv(c)}">
      <div class="bar">${back(backTo, backLabel)}<span class="meta">${s.i + 1} of ${s.items.length}</span></div>
      ${prog(s.i, s.items.length)}
      <div class="card"><div class="k">Week ${wn} · Quiz</div><div class="q">${esc(item.q)}</div></div>
      <div class="opts">${opts}</div>
      ${picked != null ? `<div class="why"><b>${picked === item.answer ? 'Correct.' : 'Not quite.'}</b>${esc(item.why || '')}<div class="ref" style="font-size:12.5px;color:var(--soft);margin-top:6px">From ${esc(week(c, wn).source?.file || 'your notes')}${item.ref ? ', ' + esc(item.ref) : ''}</div></div>` : ''}
      ${picked != null ? `<div class="dock"><button class="btn" data-act="next">${s.i + 1 < s.items.length ? 'Next question' : 'See result'}</button></div>` : ''}
    </div>`;
  }
  const emptyStudy = (c, backTo, label, msg) => `<div class="screen" style="${cv(c)}"><div class="bar">${back(backTo, label)}<span></span></div><p class="note" style="margin-top:30px">${msg}</p></div>`;

  /* ---------- settings ---------- */
  function settingsPage() {
    const data = JSON.stringify({ app: 'uni', v: 1, progress: P });
    let url = '';
    try { url = URL.createObjectURL(new Blob([data], { type: 'application/json' })); } catch (e) {}
    return `<div class="screen">
      <div class="bar">${back('home', 'Courses')}<span class="meta">Settings</span></div>
      <h1 class="title">Settings</h1>
      <div class="set"><button class="switch" role="switch" aria-checked="${EXAMPLE}" data-act="example"><span><h2>Example content</h2><p style="margin:2px 0 0">Try the app with made-up weeks. Your real progress is kept separately.</p></span><span class="tg"></span></button></div>
      <div class="set"><h2>Back up your progress</h2><p>Your progress is saved on this device only. Copy this somewhere safe, or download it, to move it to a new phone.</p>
        <textarea id="bk" readonly aria-label="Backup">${esc(data)}</textarea>
        <div class="row-btns" style="margin-top:8px"><button class="btn small" data-act="copy">Copy</button>${url ? `<a class="btn small ghost" href="${url}" download="uni-backup.json">Download</a>` : ''}</div></div>
      <div class="set"><h2>Restore a backup</h2><p>Paste a backup here, or choose the file.</p>
        <textarea id="rs" aria-label="Paste a backup"></textarea>
        <div class="row-btns" style="margin-top:8px"><button class="btn small" data-act="restore">Restore</button><label class="btn small ghost" style="cursor:pointer">Choose file<input type="file" id="rsfile" accept="application/json,.json" hidden></label></div></div>
      <div class="set"><h2>Reset progress</h2><p>Clears what you've studied and your quiz scores${EXAMPLE ? ' for the example content' : ''}. Course content isn't affected.</p>
        <button class="btn small ghost" data-act="reset">Reset progress</button></div>
    </div>`;
  }
  function restore(text) {
    try {
      const d = JSON.parse(text);
      if (!d || d.app !== 'uni' || !d.progress) throw new Error();
      P = Object.assign(blank(), d.progress); save(); toast('Backup restored'); go('home');
    } catch (e) { toast('That doesn’t look like a Uni backup.'); }
  }

  /* ---------- routing ---------- */
  function parse() {
    const h = location.hash.slice(1) || 'home';
    if (h === 'home' || h === 'settings') return { name: h };
    const m = h.match(/^c-([a-z0-9]+)(?:-(w(\d+)|all))?(?:-(cards|quiz|summary))?$/);
    if (!m || !course(m[1])) return { name: 'home' };
    const c = course(m[1]), n = m[2] === 'all' ? 'all' : m[3] ? +m[3] : null;
    if (n != null && n !== 'all' && !week(c, n)) return { name: 'course', c };
    return { name: n == null ? 'course' : m[4] || (n === 'all' ? 'course' : 'week'), c, n, raw: h };
  }
  function render() {
    const r = parse();
    let html;
    if (r.name === 'home') html = home();
    else if (r.name === 'settings') html = settingsPage();
    else if (r.name === 'course') html = coursePage(r.c);
    else if (r.name === 'week') html = weekPage(r.c, r.n);
    else if (r.name === 'summary') html = summaryPage(r.c, r.n);
    else if (r.name === 'cards') { if (!session || session.route !== r.raw) startCards(r.c, r.n, r.raw); html = cardsPage(r.c, r.n); }
    else if (r.name === 'quiz') { if (!session || session.route !== r.raw) startQuiz(r.c, r.n, r.raw); html = quizPage(r.c, r.n); }
    app.innerHTML = html;
    document.title = r.c ? `${r.c.short || r.c.name} · Uni` : 'Uni';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.content = '#ffffff';
    if (r.name === 'settings') document.getElementById('rsfile')?.addEventListener('change', e => {
      const f = e.target.files[0]; if (f) f.text().then(restore);
    });
    r.ctx = r; current = r;
  }
  let current = null;
  addEventListener('hashchange', () => { if (!/cards|quiz/.test(location.hash)) session = null; render(); window.scrollTo(0, 0); });

  app.addEventListener('click', e => {
    const t = e.target.closest('[data-go],[data-act],[data-pick],[data-none]');
    if (!t) return;
    if (t.dataset.go) { go(t.dataset.go); return; }
    if (t.dataset.none) { toast(`Week ${t.dataset.none} hasn’t been added yet.`); return; }
    const c = current?.c;
    if (t.dataset.pick != null && session?.kind === 'quiz' && session.picked == null) {
      session.picked = +t.dataset.pick; if (session.picked === session.items[session.i].item.answer) session.score++; render(); return;
    }
    switch (t.dataset.act) {
      case 'show': session.open = true; render(); break;
      case 'got': answerCard(c, true); render(); window.scrollTo(0, 0); break;
      case 'again': answerCard(c, false); render(); window.scrollTo(0, 0); break;
      case 'cards-again': { const m = session.again.map(x => ({ item: x.item, n: x.n })); Object.assign(session, { queue: m, total: m.length, done: 0, got: 0, again: [], open: false }); render(); break; }
      case 'next': session.i++; session.picked = null; render(); window.scrollTo(0, 0); break;
      case 'quiz-again': startQuiz(c, current.n, current.raw); render(); break;
      case 'example': store.set('uni.example', !EXAMPLE); location.hash = 'home'; location.reload(); break;
      case 'copy': { const ta = document.getElementById('bk'); (navigator.clipboard ? navigator.clipboard.writeText(ta.value) : Promise.reject()).then(() => toast('Copied'), () => { ta.select(); toast('Select all and copy'); }); break; }
      case 'restore': restore(document.getElementById('rs').value); break;
      case 'reset':
        if (t.dataset.sure) { P = blank(); save(); toast('Progress reset'); go('home'); }
        else { t.dataset.sure = '1'; t.textContent = 'Tap again to reset'; }
        break;
    }
  });

  render();
})();
