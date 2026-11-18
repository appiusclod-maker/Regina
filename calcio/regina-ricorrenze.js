/* REGINA Calcio 1.1.24 — Recupero delle ricorrenze settimanali / mensili.
   Modulo aggiuntivo: non modifica date di partenza, regole di ripetizione,
   record completati né i salvataggi della città o di Farm & Table.
   Si carica dopo regina-upgrade.js e regina-traguardi.js. */
(function () {
  'use strict';
  const REPEATS = new Set(['weekly', 'biweekly', 'monthly', 'weeklyflex']);
  const STORE = 'regina-calcio-goals-v1';
  const stamp = value => String(value || '').slice(0, 10);
  const isoDate = value => /^\d{4}-\d\d-\d\d$/.test(value || '');
  const localDay = () => {
    const d = new Date(), p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const dayOffset = (day, offset) => {
    const d = new Date(`${day}T12:00:00`); d.setDate(d.getDate() + offset);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  };
  const dayDifference = (a, b) => Math.round((new Date(`${a}T12:00:00`) - new Date(`${b}T12:00:00`)) / 86400000);
  const groupId = t => String(t.repeatGroup || t.id || '');
  const pending = t => t.status !== 'done' && !t.archived;
  const timePart = t => (String(t.defaultTime || '').match(/^\d\d:\d\d/) || [])[0] || (String(t.due || '').match(/T(\d\d:\d\d)/) || [,''])[1] || '';
  const dateTime = (day, t) => day + (timePart(t) ? 'T' + timePart(t) : '');

  function isWeeklyOnce(t) {
    return REPEATS.has(t.repeat) || (t.repeat === 'custom' && Array.isArray(t.weekdays) && new Set(t.weekdays.map(Number)).size === 1);
  }
  function occursOn(t, day) {
    const start = stamp(t.scheduleStart || t.due);
    if (!isoDate(start) || day < start || (t.endDate && day > t.endDate) || (t.skipDates || []).includes(day)) return false;
    const diff = dayDifference(day, start);
    if (t.repeat === 'weekly') return diff % 7 === 0;
    if (t.repeat === 'biweekly') return diff % 14 === 0;
    if (t.repeat === 'weeklyflex') return new Date(`${day}T12:00:00`).getDay() === 0 && diff % 7 === 0;
    if (t.repeat === 'monthly') {
      const [year, month] = day.slice(0, 7).split('-').map(Number);
      const last = new Date(year, month, 0).getDate();
      return +day.slice(8) === Math.min(+start.slice(8), last);
    }
    if (t.repeat === 'custom') return (t.weekdays || []).map(Number).includes(new Date(`${day}T12:00:00`).getDay());
    return false;
  }
  function mostRecentDate(t, today) {
    const start = stamp(t.scheduleStart || t.due);
    if (!isoDate(start) || today < start) return '';
    // Per frequenze settimanali o mensili bastano 410 giorni di ricerca:
    // il massimo intervallo normale è un mese, incluse date saltate.
    for (let i = 0; i <= 410; i++) {
      const d = dayOffset(today, -i);
      if (d < start) break;
      if (occursOn(t, d)) return d;
    }
    return '';
  }
  function occurrenceOrigin(t, template) {
    if (isoDate(t.reginaCarryScheduled)) return t.reginaCarryScheduled;
    if (t === template) return stamp(t.scheduleStart || t.due);
    return stamp(t.reginaOccurrenceOrigin || t.occurrenceDate || t.due);
  }
  function completionDate(t) {
    if (!t.resolvedAt) return '';
    const d = new Date(t.resolvedAt);
    if (Number.isNaN(+d)) return stamp(t.resolvedAt);
    const p = n => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
  }
  function isCovered(series, template, scheduled) {
    return series.some(t => {
      if (t.status !== 'done') return false;
      const original = occurrenceOrigin(t, template);
      // Un completamento in ritardo conta per il periodo attualmente aperto,
      // senza accumulare due impegni uguali nella stessa settimana / mese.
      return original === scheduled || (completionDate(t) >= scheduled && original <= scheduled);
    });
  }
  function readGoals() {
    if (typeof resolveOriginal === 'function') {
      const obj = resolveOriginal();
      if (obj && Array.isArray(obj.tasks) && Array.isArray(obj.fronts)) return obj;
    }
    try {
      const obj = JSON.parse(localStorage.getItem(STORE) || 'null');
      return obj && Array.isArray(obj.tasks) ? obj : null;
    } catch (_) { return null; }
  }
  function saveGoals(goals) {
    if (typeof window.goalSaveImportedArchive === 'function') window.goalSaveImportedArchive(goals);
    else localStorage.setItem(STORE, JSON.stringify(goals));
  }
  function refresh(today = localDay()) {
    const g = readGoals();
    if (!g || !isoDate(today)) return 0;
    let changed = 0;
    const groups = new Map();
    for (const t of g.tasks) {
      if (!t || !t.id) continue;
      const id = groupId(t);
      if (!groups.has(id)) groups.set(id, []);
      groups.get(id).push(t);
    }
    for (const [id, series] of groups) {
      const template = series.find(t => !t.isGenerated && isWeeklyOnce(t));
      if (!template || template.noCarry) continue;
      if (!template.scheduleStart && isoDate(stamp(template.due))) {
        template.scheduleStart = stamp(template.due); changed++;
      }
      const scheduled = mostRecentDate(template, today);
      if (!scheduled || (template.skipDates || []).includes(today)) continue;
      // Una ricorrenza già rimasta indietro ha la precedenza su nuovi cicli:
      // non ne creiamo un'altra fino a quando non è stata eseguita.
      const active = series.filter(t => t.reginaCarryOver && pending(t))
        .sort((a, b) => String(a.reginaCarryScheduled).localeCompare(String(b.reginaCarryScheduled)))[0];
      if (active) {
        if (stamp(active.due) !== today || active.occurrenceDate !== today) {
          active.due = dateTime(today, active);
          active.occurrenceDate = today;
          changed++;
        }
        continue;
      }
      if (isCovered(series, template, scheduled)) continue;
      const already = series.find(t => t !== template && !t.reginaCarryOver && pending(t) &&
        stamp(t.occurrenceDate || t.due) === scheduled);
      if (already && scheduled < today) {
        already.reginaCarryOver = true;
        already.reginaCarryScheduled = scheduled;
        already.due = dateTime(today, already);
        already.occurrenceDate = today;
        changed++;
        continue;
      }
      // La prima occorrenza, quando è prevista proprio oggi, è già la tappa
      // originale: non generiamo un duplicato.
      if (stamp(template.due) === today && scheduled === today) continue;
      // Un'occorrenza appena prevista nel calendario può essere virtuale.
      // Quando scade, ne creiamo UNA reale da trascinare nei giorni successivi.
      const child = { ...template,
        id: `rco-${id}-${scheduled}`,
        repeatGroup: id, isGenerated: true, virtual: false,
        createdAt: new Date().toISOString(),
        reginaCarryOver: true, reginaCarryScheduled: scheduled,
        occurrenceDate: today, due: dateTime(today, template),
        status: 'todo', resolvedAt: null, progressFraction: 0,
        actualValue: 0, checks: [], footballCreditDay: null,
        reginaOccurrenceOrigin: scheduled
      };
      if (!g.tasks.some(x => x.id === child.id)) { g.tasks.push(child); changed++; }
    }
    if (changed) {
      try { saveGoals(g); } catch (e) { console.error('REGINA: recupero non salvato', e); return 0; }
    }
    return changed;
  }

  if (typeof render !== 'function' || typeof resolveOriginal !== 'function') {
    console.warn('REGINA: caricare regina-ricorrenze.js per ultimo, dopo gli altri moduli.');
    return;
  }
  // Salvataggio effettuato prima che i pannelli costruiscano il calendario:
  // si aggiorna così Obiettivi, Oggi, pianificatore e punteggio della partita.
  const oldRender = render;
  let refreshing = false;
  render = function (...args) {
    if (!refreshing) {
      refreshing = true;
      try { refresh(); } finally { refreshing = false; }
    }
    return oldRender.apply(this, args);
  };
  const oldHeader = typeof header === 'function' ? header : null;
  if (oldHeader) header = function (...args) {
    return oldHeader.apply(this, args).replace('⚽ REGINA CALCIO · STAGIONE', '⚽ REGINA CALCIO 1.1.24 · STAGIONE');
  };
  window.reginaRecuperi = { aggiorna: refresh, versione: '1.1.24' };
  // Copre anche il ritorno in primo piano e il cambio di data a mezzanotte.
  document.addEventListener('visibilitychange', () => { if (!document.hidden) render(); });
  window.addEventListener('pageshow', () => { if (refresh()) render(); });
  let lastDay = localDay();
  setInterval(() => {
    const now = localDay();
    if (now !== lastDay) { lastDay = now; render(); }
  }, 60000);
  // Inserimento iniziale delle attività rimaste incomplete, senza cancellare nulla.
  if (refresh()) render();
})();
