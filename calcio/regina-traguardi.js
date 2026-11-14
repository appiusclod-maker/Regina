/* REGINA CALCIO 1.1.19 — Grandi obiettivi: tappe binarie, date e colori.
   Sostituisce il precedente regina-traguardi.js. Si carica DOPO regina-upgrade.js.
   Il backup della carriera include reginaLongTerm e l'archivio Obiettivi.
   Non scrive né modifica l'archivio della vecchia REGINA Città. */
(function () {
  'use strict';
  if (typeof st === 'undefined' || typeof header !== 'function' ||
      typeof todayView !== 'function' || typeof persist !== 'function' ||
      typeof resolveOriginal !== 'function' ||
      typeof window.goalSaveImportedArchive !== 'function') {
    console.error('REGINA Traguardi: moduli principali non ancora caricati.');
    return;
  }

  const PAGE = 'longterm';
  const esc = x => String(x ?? '').replace(/[&<>"']/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const uid = () => 'rlt-' + Date.now().toString(36) + '-' + Math.random().toString(36).slice(2, 10);
  const validDate = s => /^\d{4}-\d{2}-\d{2}$/.test(String(s || '')) ? String(s) : '';
  const dateFmt = s => s ? new Date(s + 'T12:00:00').toLocaleDateString('it-IT', {
    day: 'numeric', month: 'short', year: 'numeric'
  }) : '';

  // Scadenze: le etichette relative si trasformano in date FISSE quando
  // vengono selezionate; non slittano automaticamente alla settimana successiva.
  const localToday = () => typeof TODAY === 'function' ? TODAY() : (() => {
    const d = new Date(), pad = n => String(n).padStart(2, '0');
    return d.getFullYear() + '-' + pad(d.getMonth()+1) + '-' + pad(d.getDate());
  })();
  const timeModes = [
    ['', 'Nessuna scadenza'],
    ['exact', 'Entro una data precisa'],
    ['this_week', 'Entro questa settimana'],
    ['next_week', 'Entro la prossima settimana'],
    ['this_month', 'Entro questo mese'],
    ['month', 'Entro il mese di…'],
    ['one_year', 'Entro un anno']
  ];
  function dateParts(d) { return d.split('-').map(Number); }
  function lastDayOfMonth(month) {
    if (!/^\d{4}-(0[1-9]|1[0-2])$/.test(month || '')) return '';
    const [y,m] = month.split('-').map(Number);
    return `${month}-${String(new Date(y, m, 0).getDate()).padStart(2,'0')}`;
  }
  function offsetDay(src, days) {
    const [y,m,d] = dateParts(src), dt = new Date(y,m-1,d+days,12);
    const pad = n => String(n).padStart(2, '0');
    return `${dt.getFullYear()}-${pad(dt.getMonth()+1)}-${pad(dt.getDate())}`;
  }
  function nextYear(src) {
    const [y,m,d] = dateParts(src), last = new Date(y+1,m,0).getDate();
    return `${y+1}-${String(m).padStart(2,'0')}-${String(Math.min(d,last)).padStart(2,'0')}`;
  }
  function deadlineAt(mode, anchor, month, exact) {
    anchor = validDate(anchor) || localToday();
    let end = '';
    if (mode === 'exact') end = validDate(exact);
    else if (mode === 'this_week' || mode === 'next_week') {
      const [y,m,d] = dateParts(anchor), weekday = new Date(y,m-1,d,12).getDay();
      end = offsetDay(anchor, (7-weekday)%7 + (mode === 'next_week' ? 7 : 0));
    } else if (mode === 'this_month') end = lastDayOfMonth(anchor.slice(0,7));
    else if (mode === 'month') end = lastDayOfMonth(month);
    else if (mode === 'one_year') end = nextYear(anchor);
    return {mode: end ? mode : '', end, anchor: end ? anchor : '', month: mode === 'month' ? (month||'') : ''};
  }
  function normalizedTimeframe(info, fallback) {
    const effective = validDate(fallback);
    if (!info || typeof info !== 'object') {
      return {mode:effective?'exact':'',end:effective,anchor:'',month:''};
    }
    const end = validDate(info.end);
    if (effective !== end) return {mode:effective?'exact':'',end:effective,anchor:'',month:''};
    if (!timeModes.some(x=>x[0]===info.mode)) return {mode:effective?'exact':'',end:effective,anchor:'',month:''};
    return {mode:info.mode||'',end,anchor:validDate(info.anchor),month:String(info.month||'')};
  }
  function deadlineWidget(key, info, fallback, title='Scadenza (facoltativa)') {
    const t = normalizedTimeframe(info,fallback);
    const options = timeModes.map(([k,v]) => `<option value="${k}" ${k===t.mode?'selected':''}>${esc(v)}</option>`).join('');
    return `<div class="rlt-time-widget" data-rlt-time="${esc(key)}" data-anchor="${esc(t.anchor||localToday())}">
      <label>${esc(title)}<select data-rlt-mode>${options}</select></label>
      <label class="rlt-month" ${t.mode==='month'?'':'hidden'}>Mese e anno
        <input type="month" data-rlt-month value="${esc(t.month || localToday().slice(0,7))}"></label>
      <label class="rlt-exact" ${t.mode==='exact'?'':'hidden'}>Data di scadenza
        <input type="date" data-rlt-exact value="${esc(t.mode==='exact'?t.end:'')}"></label>
      <small class="rlt-time-result">${t.end?'Scade il '+esc(dateFmt(t.end)):'Nessuna scadenza assegnata'}</small>
    </div>`;
  }
  function readWidget(root) {
    const mode = root?.querySelector('[data-rlt-mode]')?.value || '';
    const anchor = root?.dataset?.anchor || localToday();
    const month = root?.querySelector('[data-rlt-month]')?.value || '';
    const exact = root?.querySelector('[data-rlt-exact]')?.value || '';
    return deadlineAt(mode,anchor,month,exact);
  }
  function refreshWidget(root, freshMode=false) {
    if (!root) return;
    if (freshMode) root.dataset.anchor=localToday();
    const t=readWidget(root),mode=root.querySelector('[data-rlt-mode]')?.value;
    const ml=root.querySelector('.rlt-month'),dl=root.querySelector('.rlt-exact');
    if (ml) ml.hidden=mode!=='month'; if(dl) dl.hidden=mode!=='exact';
    const out=root.querySelector('.rlt-time-result');
    if (out) out.textContent=t.end?'Scade il '+dateFmt(t.end):mode==='month'?'Seleziona il mese':mode==='exact'?'Scegli la data':'Nessuna scadenza assegnata';
    return t;
  }
  // I valori calcistici sono quelli già esistenti in REGINA Calcio.
  const THEMES = {
    health:   { name: 'Sport / Salute', color: 'Verde', key: 'health',   football: ['fitness'] },
    work:     { name: 'Lavoro',         color: 'Rosso', key: 'work',     football: ['technical'] },
    services: { name: 'Burocrazia / Soldi / Tasse / Servizi', color: 'Nero', key: 'services', football: ['discipline'] },
    study:    { name: 'Studio',         color: 'Giallo / Arancio', key: 'creative', football: ['technical'] },
    home:     { name: 'Casa',           color: 'Blu', key: 'home',     football: ['tactics'] },
    other:    { name: 'Altro',          color: 'Viola', key: 'creative', football: ['luck'] }
  };
  const themeOf = g => THEMES[g?.category] ? g.category : 'other';
  const data = () => st?.reginaLongTerm && Array.isArray(st.reginaLongTerm.goals)
    ? st.reginaLongTerm : { goals: [] };
  const archive = () => {
    const a = resolveOriginal();
    if (!a || !Array.isArray(a.tasks) || !Array.isArray(a.fronts)) {
      throw new Error('Archivio Obiettivi non disponibile.');
    }
    return a;
  };
  const clone = o => JSON.parse(JSON.stringify(o));
  const stepChecked = s => typeof s.done === 'boolean' ? s.done : Number(s.pct || 0) >= 100;
  const linked = (s, a) => (a.tasks || []).find(t =>
    t.reginaLongTermStepId === s.id || (s.taskId && t.id === s.taskId));
  function liveStep(s, a) {
    const t = linked(s, a);
    return t ? { ...s, title: t.title || s.title, date: String(t.due || '').slice(0, 10),
      timeframe: normalizedTimeframe(t.reginaTimeframe,t.deadlineDate),
      done: t.status === 'done', taskId: t.id } :
      (s.taskId ? { ...s, date: '', timeframe: normalizedTimeframe(null,''), taskId: null } : s);
  }
  const complete = (g, a) => Boolean(g.steps?.length) && g.steps.every(s => stepChecked(liveStep(s, a)));
  const progress = (g, a) => g.steps?.length
    ? Math.round(100 * g.steps.filter(s => stepChecked(liveStep(s, a))).length / g.steps.length) : 0;
  let expandedGoal = null;

  function hydrateFromArchive(d, a) {
    for (const g of d.goals) {
      g.category = themeOf(g);
      if (!Array.isArray(g.steps)) g.steps = [];
      for (const s of g.steps) {
        s.done = stepChecked(s);
        delete s.pct; // Migrazione non distruttiva dal precedente indicatore percentuale.
        const t = linked(s, a);
        if (t) {
          s.title = t.title || s.title;
          s.date = String(t.due || '').slice(0, 10);
          s.timeframe=normalizedTimeframe(t.reginaTimeframe,t.deadlineDate);
          s.done = t.status === 'done';
          s.taskId = t.id;
        } else if (s.taskId) {
          // Cancellazione fatta in Obiettivi: NON ricreare la tappa a sua insaputa.
          s.date = '';
          s.timeframe=normalizedTimeframe(null,'');
          s.taskId = null;
        }
        s.date = validDate(s.date);
        s.timeframe=normalizedTimeframe(s.timeframe,s.timeframe?.end||'');
      }
    }
  }

  // Una tappa con data diventa una vera attività del calendario/calcio, non una copia
  // decorativa. I suoi completamenti sono condivisi nelle DUE direzioni.
  function bridgeToArchive(d, a, previous) {
    const goalIDs = new Set(d.goals.map(g => g.id));
    const scheduled = new Set();
    for (const g of d.goals) {
      const old = previous.goals.find(x => x.id === g.id);
      g.category = themeOf(g);
      const cat = THEMES[g.category];
      const dated = g.steps.filter(s => validDate(s.date) || validDate(s.timeframe?.end));
      let front = a.fronts.find(f => f.reginaLongTermGoalId === g.id);
      if (dated.length && !front) {
        front = { id: 'rlt-front-' + g.id, title: g.title, cat: cat.key,
          footballCategories: [...cat.football], reginaLongTermGoalId: g.id,
          deadline: g.targetDate || '', reginaTimeframe: g.timeframe || null, createdAt: new Date().toISOString(),
          rewardAuto: false, extraRewards: [] };
        a.fronts.push(front);
      }
      if (front) {
        front.title = g.title;
        front.deadline = validDate(g.targetDate);
        front.reginaTimeframe=normalizedTimeframe(g.timeframe,g.targetDate);
        if (!old || themeOf(old) !== g.category) {
          front.cat = cat.key;
          front.footballCategories = [...cat.football];
        }
      }
      for (const s of g.steps) {
        s.title = String(s.title || '').trim().slice(0, 180);
        s.done = stepChecked(s);
        delete s.pct;
        const existing = linked(s, a);
        const due = validDate(s.date);
        const deadline=normalizedTimeframe(s.timeframe,s.timeframe?.end||'');
        if (!due && !deadline.end) {
          s.taskId = null;
          continue;
        }
        scheduled.add(s.id);
        if (!front) throw new Error('Fronte del traguardo non disponibile.');
        let task = existing;
        if (!task) {
          task = { id: 'rlt-task-' + s.id, status: 'todo', progressFraction: 0,
            type: 'simple', repeat: 'none', reginaDifficulty: 3,
            createdAt: new Date().toISOString(), rewardAuto: false };
          a.tasks.push(task);
        }
        const beforeDone = task.status === 'done';
        const desiredDone = s.done;
        // Conserva l'orario eventualmente impostato in Obiettivi.
        const oldTime = String(task.due || '').split('T')[1] || '';
        Object.assign(task, {
          reginaLongTermGoalId: g.id, reginaLongTermStepId: s.id,
          title: s.title, frontId: front.id,
          due: due ? due + (oldTime ? 'T' + oldTime : '') : '',
          deadlineDate:deadline.end, reginaTimeframe:deadline,
          repeat: 'none', footballCreditDay: null
        });
        if (desiredDone && !beforeDone) {
          task.status = 'done'; task.progressFraction = 1;
          task.resolvedAt = new Date().toISOString();
        } else if (!desiredDone && beforeDone) {
          task.status = 'todo'; task.progressFraction = 0;
          task.resolvedAt = null;
        }
        s.taskId = task.id;
      }
    }
    // Elimina SOLTANTO i collegamenti creati da questa pagina e poi disattivati;
    // le altre attività e gli altri fronti dell'utente rimangono intatti.
    a.tasks = a.tasks.filter(t => !t.reginaLongTermStepId ||
      (scheduled.has(t.reginaLongTermStepId) && goalIDs.has(t.reginaLongTermGoalId)));
    a.fronts = a.fronts.filter(f => !f.reginaLongTermGoalId || goalIDs.has(f.reginaLongTermGoalId) ||
      a.tasks.some(t => t.frontId === f.id));
    // Rimuovi i fronti generati che non contengono più alcuna attività.
    a.fronts = a.fronts.filter(f => !f.reginaLongTermGoalId ||
      a.tasks.some(t => t.frontId === f.id));
  }

  function update(mutator) {
    if (!st) return false;
    const previous = st.reginaLongTerm;
    let originalArchive, next, changed = false;
    try {
      originalArchive = clone(archive());
      const newArchive = clone(originalArchive);
      const originalData = clone(data());
      next = clone(originalData);
      hydrateFromArchive(next, newArchive);
      mutator(next);
      bridgeToArchive(next, newArchive, originalData);
      changed = JSON.stringify(newArchive) !== JSON.stringify(originalArchive);
      if (changed) window.goalSaveImportedArchive(newArchive);
      st.reginaLongTerm = next;
      if (persist() === false) throw new Error('Il salvataggio della carriera non è stato confermato.');
    } catch (err) {
      st.reginaLongTerm = previous;
      if (changed && originalArchive) {
        try { window.goalSaveImportedArchive(originalArchive); } catch (restoreError) {
          console.error('Impossibile ripristinare l’archivio precedente', restoreError);
        }
      }
      alert('Modifica non salvata: ' + err.message + '\nEsporta un backup prima di riprovare.');
      return false;
    }
    const y = window.scrollY;
    render();
    requestAnimationFrame(() => window.scrollTo(0, y));
    return true;
  }
  function findGoal(d, id) {
    const g = d.goals.find(x => x.id === id);
    if (!g) throw new Error('Grande obiettivo non trovato.');
    return g;
  }
  function findStep(d, id, sid) {
    const s = findGoal(d, id).steps.find(x => x.id === sid);
    if (!s) throw new Error('Tappa non trovata.');
    return s;
  }

  function stepMarkup(g, s, index, a) {
    s = liveStep(s, a);
    const done = stepChecked(s), id = esc(g.id), sid = esc(s.id);
    return `<li class="rlt-step ${done ? 'done' : ''}">
      <label class="rlt-step-check"><input type="checkbox" data-rlt-check="${sid}" data-goal="${id}"
        ${done ? 'checked' : ''} aria-label="Completata: ${esc(s.title)}"></label>
      <div class="rlt-step-main"><span class="rlt-step-label">${esc(s.title)}</span>
        <label class="rlt-date-row"><span>📅 Data programmata</span><input type="date" value="${esc(s.date || '')}"
          data-rlt-date="${sid}" data-goal="${id}" aria-label="Data programmata per ${esc(s.title)}"></label>
        <div class="rlt-step-deadline" data-goal="${id}" data-step="${sid}">
          ${deadlineWidget('longterm-step',s.timeframe,s.timeframe?.end||'')}</div>
        ${s.date ? '<small class="rlt-linked">↗ Attività in Obiettivi e Oggi nella data programmata: influenza la partita.</small>' :
          s.timeframe?.end ? '<small class="rlt-linked">↗ In Obiettivi e Oggi alla scadenza: influenza la partita quel giorno, non prima.</small>' :
          '<small class="rlt-muted">Scegli una data oppure una scadenza per inserirla negli Obiettivi.</small>'}
      </div>
      <div class="rlt-step-actions"><button type="button" data-rlt-act="rename" data-goal="${id}" data-step="${sid}" aria-label="Rinomina tappa">✎</button>
        <button type="button" data-rlt-act="up" data-goal="${id}" data-step="${sid}" aria-label="Sposta prima" ${index === 0 ? 'disabled' : ''}>↑</button>
        <button type="button" data-rlt-act="down" data-goal="${id}" data-step="${sid}" aria-label="Sposta dopo" ${index === g.steps.length - 1 ? 'disabled' : ''}>↓</button>
        <button type="button" class="rlt-danger" data-rlt-act="remove-step" data-goal="${id}" data-step="${sid}" aria-label="Elimina tappa">×</button></div>
    </li>`;
  }

  function goalMarkup(g, a) {
    const n = progress(g, a), done = complete(g, a), cat = themeOf(g);
    const steps = g.steps.map(s => liveStep(s, a));
    const doneCount = steps.filter(stepChecked).length;
    const next = steps.find(s => !stepChecked(s));
    return `<details class="rlt-goal rlt-cat-${cat} ${done ? 'rlt-goal-done' : ''}"
      data-goal="${esc(g.id)}" ${expandedGoal === g.id ? 'open' : ''}>
      <summary class="rlt-summary"><div class="rlt-head"><div class="rlt-goal-heading">
        <span class="rlt-theme-label">${esc(THEMES[cat].name)}</span><h3>${esc(g.title)}</h3>
        ${g.description ? `<p class="rlt-description">${esc(g.description)}</p>` : ''}</div>
        <strong class="rlt-pct">${n}%</strong></div>
        <div class="rlt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100"
          aria-valuenow="${n}" aria-label="Avanzamento ${esc(g.title)}"><span style="width:${n}%"></span></div>
        <div class="rlt-meta"><span>✓ ${doneCount}/${g.steps.length} tappe</span>
          ${g.targetDate ? `<span>🎯 Entro ${dateFmt(g.targetDate)}</span>` : ''}
          <span>${done ? '✅ Completato' : next ? 'Prossima: ' + esc(next.title) : 'Aggiungi le prime tappe'}</span>
          <b>${expandedGoal === g.id ? '▲ Chiudi' : '▼ Apri'}</b></div>
      </summary>
      <div class="rlt-expanded">
        ${g.steps.length ? `<ol class="rlt-steps">${g.steps.map((s, i) => stepMarkup(g, s, i, a)).join('')}</ol>` :
          '<p class="rlt-muted">Non hai ancora inserito tappe per questo obiettivo.</p>'}
        <form class="rlt-step-add" data-rlt-form="step" data-goal="${esc(g.id)}">
          <input name="title" required maxlength="180" placeholder="Nuova tappa del percorso" aria-label="Nuova tappa">
          <label class="rlt-date-row">Programma per<input name="date" type="date" aria-label="Data programmata facoltativa"></label>
          ${deadlineWidget('new-step',null,'')}
          <button type="submit">+ Aggiungi tappa</button></form>
        <div class="rlt-goal-actions"><button type="button" data-rlt-act="edit" data-goal="${esc(g.id)}">✎ Modifica obiettivo</button>
          <button type="button" class="rlt-danger" data-rlt-act="remove-goal" data-goal="${esc(g.id)}">Elimina</button></div>
      </div>
    </details>`;
  }

  const categoryOptions = current => Object.entries(THEMES)
    .map(([k, v]) => `<option value="${k}" ${k === current ? 'selected' : ''}>${esc(v.name)} — ${esc(v.color)}</option>`).join('');
  function pageView() {
    if (!st) return '<section class="card">Avvia prima una carriera.</section>';
    let a;
    try { a = archive(); } catch (err) { return '<section class="card">' + esc(err.message) + '</section>'; }
    const goals = [...data().goals].sort((a1, b1) => Number(complete(a1, a)) - Number(complete(b1, a)));
    const active = goals.filter(g => !complete(g, a)).length, done = goals.length - active;
    const avg = goals.length ? Math.round(goals.reduce((sum, g) => sum + progress(g, a), 0) / goals.length) : 0;
    return `<div class="rlt-page"><section class="rlt-intro"><span class="rlt-kicker">LA TUA STRADA</span>
      <h2>🎯 Grandi obiettivi</h2><p>Dividi le mete importanti in tappe. Scegli una data programmata o una scadenza flessibile:
      le tappe entreranno in Obiettivi e saranno valutate in Oggi nella giornata assegnata o alla scadenza.</p>
      <div class="rlt-stats"><div><strong>${active}</strong><small>In corso</small></div>
        <div><strong>${done}</strong><small>Raggiunti</small></div>
        <div><strong>${avg}%</strong><small>Avanzamento medio</small></div></div>
      <details class="rlt-create"><summary>＋ Nuovo grande obiettivo</summary>
        <form data-rlt-form="goal" class="rlt-new-form"><label>Nome del traguardo
          <input name="title" required maxlength="120" placeholder="Es. Superare il livello B1 di birmano"></label>
          <label>Categoria e colore<select name="category">${categoryOptions('study')}</select></label>
          <label>Descrizione (facoltativa)<textarea name="description" rows="2" maxlength="500" placeholder="Cosa vuoi raggiungere?"></textarea></label>
          ${deadlineWidget('new-goal',null,'','Scadenza del grande obiettivo (facoltativa)')}
          <label>Tappe progressive (una per riga, le date si aggiungono dopo)<textarea name="steps" rows="5" placeholder="Completare il modulo A&#10;Studiare il modulo B&#10;Fare il test finale"></textarea></label>
          <button type="submit">Crea il grande obiettivo</button>
        </form></details></section>
      ${goals.length ? `<div class="rlt-goals">${goals.map(g => goalMarkup(g, a)).join('')}</div>` :
        '<section class="rlt-empty"><span>🌱</span><h3>Inizia dalla meta.</h3><p>Nuovo obiettivo → tappe → date → partite.</p></section>'}
      <p class="rlt-footnote">La barra principale si calcola da sola: tappe completate / tappe totali.
      I completamenti effettuati in Obiettivi e Oggi sono gli stessi del grande obiettivo.
      Le tappe senza data né scadenza rimangono soltanto qui e non influiscono sulla partita.
      «Entro questa settimana / mese / anno» fissa una scadenza al momento della scelta: non si sposta da sola.</p></div>`;
  }

  const oldToday = todayView;
  todayView = function (...args) { return view === PAGE ? pageView() : oldToday.apply(this, args); };
  const oldHeader = header;
  header = function (...args) {
    let html = oldHeader.apply(this, args).replace(/v1\.1\.(?:1[6-9])/g, 'v1.1.19');
    if (html.includes("changeView('longterm')")) return html;
    const b = `<button class="${view === PAGE ? 'active' : ''}" onclick="changeView('${PAGE}')">🎯 Traguardi</button>`;
    const match = html.match(/<button\b[^>]*onclick="changeView\('objectives'\)"[^>]*>Obiettivi<\/button>/);
    return match ? html.replace(match[0], match[0] + b) : html.replace('</nav>', b + '</nav>');
  };

  function modal(g) {
    document.getElementById('rlt-editor')?.remove();
    const el = document.createElement('div');
    el.id = 'rlt-editor'; el.className = 'rlt-backdrop';
    el.innerHTML = `<form class="rlt-modal" data-rlt-form="edit" data-goal="${esc(g.id)}"
       role="dialog" aria-modal="true" aria-label="Modifica grande obiettivo">
       <div class="rlt-modal-title"><h3>Modifica obiettivo</h3><button type="button" data-rlt-act="close">✕</button></div>
       <label>Nome<input name="title" required maxlength="120" value="${esc(g.title)}"></label>
       <label>Categoria e colore<select name="category">${categoryOptions(themeOf(g))}</select></label>
       <label>Descrizione<textarea name="description" rows="3" maxlength="500">${esc(g.description || '')}</textarea></label>
       ${deadlineWidget('edit-goal',g.timeframe,g.targetDate,'Scadenza del grande obiettivo (facoltativa)')}
       <button type="submit">Salva modifiche</button></form>`;
    document.body.appendChild(el);
    el.querySelector('[name=title]')?.focus();
  }

  document.addEventListener('submit', ev => {
    const form = ev.target.closest?.('[data-rlt-form]');
    if (!form) return;
    ev.preventDefault();
    if (!st) return;
    const v = new FormData(form), kind = form.dataset.rltForm;
    if (kind === 'goal') {
      const title = String(v.get('title') || '').trim().slice(0, 120);
      if (!title) return;
      const description = String(v.get('description') || '').trim().slice(0, 500);
      const steps = String(v.get('steps') || '').split(/\r?\n/).map(x => x.trim()).filter(Boolean)
        .slice(0, 100).map(x => ({ id: uid(), title: x.slice(0, 180), done: false, date: '', timeframe:normalizedTimeframe(null,'') }));
      const id = uid(); expandedGoal = id;
      const timeframe=readWidget(form.querySelector('[data-rlt-time]'));
      update(d => d.goals.unshift({ id, title, description, category: String(v.get('category') || 'other'),
        targetDate: timeframe.end, timeframe, steps, createdAt: new Date().toISOString() }));
    } else if (kind === 'step') {
      const title = String(v.get('title') || '').trim().slice(0, 180), id = form.dataset.goal;
      if (!title) return;
      expandedGoal = id;
      update(d => {
        const g = findGoal(d, id);
        if (g.steps.length >= 250) throw new Error('Massimo 250 tappe per grande obiettivo.');
        g.steps.push({ id: uid(), title, done: false, date: validDate(v.get('date')),
          timeframe:readWidget(form.querySelector('[data-rlt-time]')) });
      });
    } else if (kind === 'edit') {
      const title = String(v.get('title') || '').trim().slice(0, 120), id = form.dataset.goal;
      if (!title) return;
      const ok = update(d => {
        const g = findGoal(d, id);
        g.title = title; g.description = String(v.get('description') || '').trim().slice(0, 500);
        g.category = String(v.get('category') || 'other');
        g.timeframe=readWidget(form.querySelector('[data-rlt-time]'));
        g.targetDate=g.timeframe.end;
      });
      if (ok) document.getElementById('rlt-editor')?.remove();
    }
  }, true);

  document.addEventListener('click', ev => {
    const b = ev.target.closest?.('[data-rlt-act]');
    if (!b) return;
    const action = b.dataset.rltAct, id = b.dataset.goal, sid = b.dataset.step;
    if (action === 'close') { document.getElementById('rlt-editor')?.remove(); return; }
    if (action === 'edit') {
      const g = data().goals.find(x => x.id === id);
      if (g) modal(g);
      return;
    }
    if (action === 'remove-goal') {
      const g = data().goals.find(x => x.id === id);
      if (!g || !confirm('Eliminare «' + g.title + '» e le sue tappe anche dal calendario Obiettivi?')) return;
      if (expandedGoal === id) expandedGoal = null;
      update(d => { d.goals = d.goals.filter(x => x.id !== id); });
      return;
    }
    if (!id || !sid) return;
    expandedGoal = id;
    if (action === 'remove-step') {
      const g = data().goals.find(x => x.id === id), s = g?.steps.find(x => x.id === sid);
      if (!s || !confirm('Eliminare la tappa «' + s.title + '» anche da Obiettivi?')) return;
      update(d => { const g = findGoal(d, id); g.steps = g.steps.filter(x => x.id !== sid); });
    } else if (action === 'rename') {
      const s = data().goals.find(x => x.id === id)?.steps.find(x => x.id === sid);
      if (!s) return;
      const newer = prompt('Nome della tappa:', s.title);
      if (newer === null || !newer.trim()) return;
      update(d => { findStep(d, id, sid).title = newer.trim().slice(0, 180); });
    } else if (action === 'up' || action === 'down') {
      update(d => {
        const g = findGoal(d, id), i = g.steps.findIndex(x => x.id === sid);
        const j = i + (action === 'up' ? -1 : 1);
        if (i >= 0 && j >= 0 && j < g.steps.length) [g.steps[i], g.steps[j]] = [g.steps[j], g.steps[i]];
      });
    }
  }, true);

  document.addEventListener('change', ev => {
    const field=ev.target;
    const widget=field.closest?.('[data-rlt-time]');
    if (!widget) return;
    if (field.matches('[data-rlt-mode]')) refreshWidget(widget,true);
    else refreshWidget(widget,false);
    if (widget.dataset.rltTime==='longterm-step') {
      const outer=widget.closest('[data-step][data-goal]');
      if (!outer) return;
      const id=outer.dataset.goal,sid=outer.dataset.step;
      expandedGoal=id;
      const time=readWidget(widget);
      // Non richiudere il selettore finché l'utente non ha scelto il mese/la data.
      if((time.mode==='' && ['exact','month'].includes(widget.querySelector('[data-rlt-mode]')?.value)))return;
      if(field.matches('[data-rlt-mode]') && ['exact','month'].includes(field.value))return;
      update(d=>{findStep(d,id,sid).timeframe=time});
    }
  }, true);

  document.addEventListener('change', ev => {
    const el = ev.target;
    if (!el.matches?.('[data-rlt-check], [data-rlt-date]')) return;
    const id = el.dataset.goal, sid = el.dataset.rltCheck || el.dataset.rltDate;
    expandedGoal = id;
    if (el.hasAttribute('data-rlt-check')) {
      const value = Boolean(el.checked);
      update(d => { findStep(d, id, sid).done = value; });
    } else {
      const value = validDate(el.value);
      update(d => { findStep(d, id, sid).date = value; });
    }
  }, true);

  document.addEventListener('toggle', ev => {
    const details = ev.target;
    if (!details.matches?.('.rlt-goal')) return;
    if (details.open) expandedGoal = details.dataset.goal;
    else if (expandedGoal === details.dataset.goal) expandedGoal = null;
  }, true);
  document.addEventListener('click', ev => {
    if (ev.target.id === 'rlt-editor') ev.target.remove();
  }, true);

  // Stesse scelte temporali anche nei normali Fronti e nelle normali Tappe.
  // Non vengono creati obiettivi paralleli: il form originale rimane quello
  // utilizzato dal motore delle partite. La data effettiva è deadline/deadlineDate.
  const oldOpenFront=window.goalOpenFront;
  if (typeof oldOpenFront==='function') window.goalOpenFront=function(...args){
    const result=oldOpenFront.apply(this,args);
    const form=document.getElementById('goal-front-form');
    if (form && !form.querySelector('[data-rlt-time]')) {
      const input=form.querySelector('[name="deadline"]');
      if(input){
        const id=form.querySelector('[name="id"]')?.value||'';
        const f=archive().fronts.find(x=>x.id===id);
        input.closest('label')?.insertAdjacentHTML('afterend', deadlineWidget('front',f?.reginaTimeframe,input.value,'Scadenza del fronte (facoltativa)'));
        input.closest('label').hidden=true;
      }
    }
    return result;
  };
  const oldOpenTask=window.goalOpenTask;
  if (typeof oldOpenTask==='function') window.goalOpenTask=function(...args){
    const result=oldOpenTask.apply(this,args);
    const form=document.getElementById('goal-task-form');
    if(form && !form.querySelector('[data-rlt-time]')){
      const input=form.querySelector('[name="deadlineDate"]');
      if(input){
        const id=form.querySelector('[name="id"]')?.value||'';
        const t=archive().tasks.find(x=>x.id===id);
        input.closest('label')?.insertAdjacentHTML('afterend',deadlineWidget('task',t?.reginaTimeframe,input.value,'Scadenza della tappa (facoltativa)'));
        input.closest('label').hidden=true;
      }
    }
    return result;
  };
  function installSaveTime(fn,type,field){
    const previous=window[fn];
    if(typeof previous!=='function')return;
    window[fn]=function(ev,...rest){
      const form=ev?.target,widget=form?.querySelector('[data-rlt-time]');
      if(!widget)return previous.apply(this,[ev,...rest]);
      const timeframe=readWidget(widget);
      const input=form.querySelector('[name="'+field+'"]');
      if(input)input.value=timeframe.end;
      const id=form.querySelector('[name="id"]')?.value||'';
      const before=archive(),oldIDs=new Set((type==='front'?before.fronts:before.tasks).map(x=>x.id));
      const result=previous.apply(this,[ev,...rest]);
      const a=archive(),arr=type==='front'?a.fronts:a.tasks;
      let target=id?arr.find(x=>x.id===id):arr.find(x=>!oldIDs.has(x.id));
      if(!target && !id)target=arr.at(-1);
      if(target){
        target.reginaTimeframe=timeframe;
        // Gli altri campi del normale form sono già stati salvati dai moduli storici.
        window.goalSaveImportedArchive(a);
        if(st)persist();
      }
      return result;
    };
  }
  installSaveTime('goalSaveFront','front','deadline');
  installSaveTime('goalSaveTask','task','deadlineDate');
  const css = document.createElement('style');
  css.textContent = `
  .rlt-page{max-width:1080px;margin:0 auto;padding:0 0 35px;color:#183849}
  .rlt-intro,.rlt-empty,.rlt-goal{background:#fff;border:1px solid #d8e7e4;box-shadow:0 2px 12px #143b300b;border-radius:17px;padding:18px;margin-bottom:14px}
  .rlt-intro{background:linear-gradient(130deg,#e8f7f1,#f8fcf9);border-color:#cae4d8}
  .rlt-kicker{font-size:10px;letter-spacing:.13em;font-weight:900;color:#306e60}
  .rlt-intro h2{margin:6px 0;font-size:25px;color:#154b40}
  .rlt-intro p{font-size:13px;line-height:1.55;color:#557267}
  .rlt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:17px 0}
  .rlt-stats>div{display:flex;flex-direction:column;align-items:center;gap:2px;border-radius:11px;padding:11px 5px;background:#fff9;border:1px solid #d6eae0}
  .rlt-stats strong{font-size:22px;color:#195c4c}.rlt-stats small{font-size:10px;color:#5c7b6d;text-align:center}
  .rlt-create{background:#fff;border:1px solid #b9d8cb;border-radius:11px;padding:11px}
  .rlt-create>summary{cursor:pointer;font-weight:800;color:#145c45}
  .rlt-new-form,.rlt-modal{display:grid;gap:13px}.rlt-new-form{padding-top:15px}
  .rlt-new-form label,.rlt-modal label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#365e53}
  .rlt-new-form input,.rlt-new-form textarea,.rlt-new-form select,.rlt-modal input,.rlt-modal textarea,.rlt-modal select,.rlt-step-add input,.rlt-time-widget input,.rlt-time-widget select{
    box-sizing:border-box;width:100%;min-width:0;border:1px solid #c3d7d0;border-radius:9px;padding:10px;font:inherit;font-size:15px;color:#183d36;background:#fff}
  .rlt-new-form button,.rlt-modal button[type=submit],.rlt-step-add button{border:0;background:#12694f;color:#fff;font-weight:800;border-radius:9px;padding:11px 12px;cursor:pointer}
  .rlt-goal{--rlt-color:#7251ae;--rlt-tint:#f1eaf9;border-left:6px solid var(--rlt-color);padding:0 13px 0 16px;overflow:hidden}
  .rlt-cat-health{--rlt-color:#19815a;--rlt-tint:#e5f6ec}
  .rlt-cat-work{--rlt-color:#c94745;--rlt-tint:#fff0ee}
  .rlt-cat-services{--rlt-color:#292e35;--rlt-tint:#edeef0}
  .rlt-cat-study{--rlt-color:#c9840d;--rlt-tint:#fff5df}
  .rlt-cat-home{--rlt-color:#3174c5;--rlt-tint:#e8f2ff}
  .rlt-cat-other{--rlt-color:#8056b9;--rlt-tint:#f1eaf9}
  .rlt-goal-done{border-top:1px solid var(--rlt-color);border-bottom:1px solid var(--rlt-color)}
  .rlt-summary{cursor:pointer;list-style:none;padding:15px 0;display:block;outline-offset:3px}
  .rlt-summary::-webkit-details-marker{display:none}
  .rlt-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
  .rlt-goal-heading{min-width:0;flex:1}.rlt-goal h3{margin:2px 0 5px;font-size:17px;color:var(--rlt-color);overflow-wrap:anywhere}
  .rlt-theme-label{font-size:10px;font-weight:850;letter-spacing:.04em;text-transform:uppercase;color:var(--rlt-color)}
  .rlt-description{font-size:12px;line-height:1.5;color:#657570;margin:3px 0 10px;white-space:pre-line;overflow-wrap:anywhere}
  .rlt-pct{font-size:22px;color:var(--rlt-color);background:var(--rlt-tint);border-radius:10px;padding:7px 10px;white-space:nowrap}
  .rlt-bar{height:13px;border-radius:10px;background:#e5ede9;margin:12px 0 7px;overflow:hidden}
  .rlt-bar>span{display:block;height:100%;width:0;background:var(--rlt-color);border-radius:10px;transition:width .18s}
  .rlt-meta{display:flex;flex-wrap:wrap;gap:6px 13px;font-size:11px;color:#647770}
  .rlt-meta b{margin-left:auto;color:var(--rlt-color)}
  .rlt-expanded{border-top:1px solid #e2eeea;padding:11px 0 15px}
  .rlt-steps{list-style:none;margin:11px 0;padding:0;display:grid;gap:7px}
  .rlt-step{display:flex;align-items:flex-start;gap:8px;padding:10px 7px;border:1px solid #dce9e4;border-radius:10px;background:#fafdfb;min-width:0}
  .rlt-step.done{background:var(--rlt-tint)}
  .rlt-step-check{padding-top:4px}.rlt-step-check input{width:19px;height:19px;accent-color:var(--rlt-color)}
  .rlt-step-main{min-width:0;flex:1}.rlt-step-label{font-weight:650;font-size:13px;overflow-wrap:anywhere;display:block;margin-bottom:7px}
  .rlt-date-row{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:11px;color:#587067}
  .rlt-date-row input{font:inherit;border:1px solid #d0ddd7;border-radius:7px;padding:6px;max-width:175px;min-width:0;background:white;color:#123d30}
  .rlt-linked,.rlt-muted{font-size:11px;line-height:1.45;color:#517061;display:block;margin-top:5px}
  .rlt-step-actions{display:flex;gap:2px;flex-wrap:wrap;max-width:115px;justify-content:flex-end}
  .rlt-step-actions button,.rlt-goal-actions button,.rlt-modal-title button{border:1px solid #cbdcd4;border-radius:6px;background:#fff;color:#346b58;padding:6px;cursor:pointer;font-size:13px;min-width:26px}
  .rlt-step-actions button:disabled{opacity:.25}.rlt-danger{color:#ac4c40!important}
  .rlt-step-add{display:grid;grid-template-columns:minmax(0,1fr) 145px minmax(170px,1.2fr);gap:6px;margin:13px 0}
  .rlt-step-add button{grid-column:1/-1;justify-self:start}
  .rlt-time-widget{display:flex;flex-wrap:wrap;align-items:flex-start;gap:6px 10px;margin:8px 0;background:#f4f7fa;border:1px solid #e0e5ed;border-radius:8px;padding:8px;font-size:12px}
  .rlt-time-widget label{display:grid;gap:4px;flex:1;min-width:135px;color:#334c59;font-size:12px;font-weight:650}
  .rlt-time-widget label[hidden]{display:none!important}
  .rlt-time-widget input,.rlt-time-widget select{width:100%;min-width:0;box-sizing:border-box;min-height:34px;padding:5px 7px;border:1px solid #c6d1df;border-radius:6px;background:#fff;color:#173744;font:inherit}
  .rlt-time-result{width:100%;color:#425c68;font-size:11px}
  .rlt-step-deadline{margin:6px 0}
  #goal-task-form .rlt-time-widget,#goal-front-form .rlt-time-widget{margin:10px 0 13px}
  
  .rlt-goal-actions{display:flex;gap:8px;margin-top:15px;justify-content:flex-end}.rlt-goal-actions button{padding:9px 12px}
  .rlt-footnote{font-size:12px;color:#637b71;line-height:1.5;margin:12px 3px}
  .rlt-empty{text-align:center;padding:35px 16px}.rlt-empty span{font-size:36px}.rlt-empty h3{color:#1d6047}
  .rlt-backdrop{position:fixed;inset:0;z-index:99999;background:#061a15ae;display:flex;align-items:center;justify-content:center;padding:15px}
  .rlt-modal{width:min(520px,100%);max-height:90dvh;overflow:auto;border-radius:16px;background:#fff;padding:20px;color:#254c40}
  .rlt-modal-title{display:flex;justify-content:space-between;align-items:center}.rlt-modal h3{margin:0 0 7px}
  @media(max-width:580px){.rlt-step-add{grid-template-columns:minmax(0,1fr) 140px}.rlt-step-add .rlt-time-widget{grid-column:1/-1}.rlt-step-add button{grid-column:1/-1}.rlt-intro,.rlt-goal{padding-right:11px}.rlt-goal{padding-left:12px}}
  @media(max-width:430px){.rlt-intro{padding:13px}.rlt-step{gap:5px;padding:8px 5px}.rlt-step-actions{max-width:60px}.rlt-step-actions button{padding:5px;min-width:24px}.rlt-pct{font-size:20px}.rlt-meta{font-size:10px}.rlt-date-row input{max-width:150px}.rlt-step-deadline .rlt-time-widget{padding:6px}.rlt-step-deadline .rlt-time-widget label{min-width:125px}}
  `;
  document.head.appendChild(css);
  if (st) render();
})();
