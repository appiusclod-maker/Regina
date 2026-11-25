/* REGINA Calcio 1.1.25 — Portiere di emergenza.
 * Non riscrive salvataggi o infortuni. Non rimuove i controlli ordinari
 * quando almeno un vero portiere e' disponibile.
 * Caricare DOPO regina-upgrade.js, regina-traguardi.js,
 * regina-hninn-export.js e regina-ricorrenze.js.
 */
(function () {
  'use strict';
  if (typeof st === 'undefined' || typeof initLineup !== 'function' ||
      typeof lineupReady !== 'function' || typeof calcTeam !== 'function' ||
      typeof calcMatch !== 'function' || typeof MY_SQ !== 'function') {
    console.error('REGINA 1.1.25: moduli calcistici non ancora caricati.');
    return;
  }

  const roleName = {P:'portiere', D:'difensore', C:'centrocampista', A:'attaccante'};
  const usable = p => !!p && !p.injured && !p.red && !p.out;
  const pickable = p => usable(p) && p.verified !== false;
  const squad = () => st?.squad?.[st.club] || [];
  const availableKeepers = () => squad().filter(p => p.pos === 'P' && pickable(p));
  const noGoalkeeper = () => !!st?.club && availableKeepers().length === 0;
  const textSafe = value => String(value ?? '').replace(/[&<>"']/g, c =>
    ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const inField = () => initLineup(st.club);

  /* L'undici rimane obbligatorio; l'unica eccezione e' la specializzazione del portiere. */
  const oldLineupReady = lineupReady;
  lineupReady = function (...args) {
    if (!noGoalkeeper()) return oldLineupReady.apply(this, args);
    const selected = st.lineup || [];
    const players = selected.map(id => squad().find(p => p.id === id));
    return players.length === 11 && players.every(usable) &&
      new Set(players.map(p => p.id)).size === 11;
  };

  /* Nella selezione con trascinamento, l'assenza dei portieri non blocca gli scambi. */
  const oldPutPlayer = window.putPlayerOnField;
  if (typeof oldPutPlayer === 'function') {
    window.putPlayerOnField = function (id, slot) {
      if (!noGoalkeeper()) return oldPutPlayer.apply(this, arguments);
      if (!st || view !== 'squad') return;
      const player = squad().find(p => p.id === id);
      if (!pickable(player)) return;
      const idx = Number(slot);
      if (!Number.isInteger(idx) || idx < 0 || idx > 10) return;
      const lineup = inField().map(p => p.id).slice(0,11);
      const from = lineup.indexOf(id), replaced = lineup[idx];
      if (from >= 0) { lineup[from] = replaced; lineup[idx] = id; }
      else lineup[idx] = id;
      st.lineup = lineup.filter(Boolean);
      persist(); render();
    };
  }

  /* Scelta esplicita: il giocatore selezionato va nel primo posto, quello in porta.
   * I dieci compagni rimangono, per quanto possibile, nella stessa formazione.
   */
  function pickEmergencyKeeper(id) {
    if (!noGoalkeeper()) return alert('C\u2019e\u0300 un portiere di ruolo disponibile: usa la formazione normale.'), false;
    const players = squad(), selected = players.find(p => p.id === id);
    if (!pickable(selected) || selected.pos === 'P') return alert('Scegli un giocatore di movimento disponibile.'), false;
    const usablePlayers = players.filter(pickable);
    if (usablePlayers.length < 11) {
      alert('Sono disponibili meno di 11 giocatori verificati: non posso creare un undici valido.');
      return false;
    }
    const ids = [id], chosen = new Set(ids);
    const add = p => { if (pickable(p) && !chosen.has(p.id) && ids.length < 11) { ids.push(p.id); chosen.add(p.id); } };
    (st.lineup || []).forEach(pid => add(players.find(p => p.id === pid)));
    inField().forEach(add);
    usablePlayers.slice().sort((a,b) => b.tech - a.tech).forEach(add);
    if (ids.length !== 11) return alert('Impossibile completare la formazione.'), false;
    st.lineup = ids;
    // Registro solo la scelta, non modifico ruolo, tecnica o durata degli infortuni.
    st.reginaEmergencyKeeper = { playerId:id, day:st.nextDay };
    persist(); render();
    return true;
  }
  window.reginaPortiereEmergenza = {
    scegli() {
      const id = document.getElementById('regina-emergency-keeper-select')?.value;
      if (id) pickEmergencyKeeper(id);
    },
    imposta: pickEmergencyKeeper,
    verifica: () => noGoalkeeper(),
    versione: '1.1.25'
  };

  const oldSquadView = squadView;
  squadView = function (...args) {
    const original = oldSquadView.apply(this, args);
    if (!noGoalkeeper()) return original;
    const candidates = squad().filter(p => pickable(p) && p.pos !== 'P');
    const inCurrentLineup = new Set(inField().map(p => p.id));
    const preferred = st?.reginaEmergencyKeeper?.day === st.nextDay &&
      candidates.some(p => p.id === st.reginaEmergencyKeeper.playerId)
      ? st.reginaEmergencyKeeper.playerId
      : (inField()[0]?.pos !== 'P' ? inField()[0]?.id : candidates[0]?.id);
    const opts = candidates.sort((a,b) =>
      Number(inCurrentLineup.has(b.id)) - Number(inCurrentLineup.has(a.id)) ||
      Number(b.pos === 'D') - Number(a.pos === 'D') || (b.tech || 0) - (a.tech || 0))
      .map(p => `<option value="${textSafe(p.id)}" ${p.id === preferred ? 'selected' : ''}>${textSafe(p.name)} (${roleName[p.pos] || p.pos})</option>`).join('');
    return original + `<section class="card" id="regina-emergency-keeper-card">
      <h2>🧤 Portiere di emergenza</h2>
      <p><b>Nessun portiere di ruolo disponibile.</b> Puoi comunque disputare la partita con un difensore, un centrocampista o un attaccante in porta.</p>
      <p class="muted">La formazione resta di 11 giocatori. Il sostituto occupa la posizione del portiere e comporta un <b>malus reale</b> alla prestazione. Nessun infortunio viene cancellato.</p>
      <label class="label" for="regina-emergency-keeper-select">Chi va in porta?</label>
      <select id="regina-emergency-keeper-select">${opts}</select>
      <p><button type="button" class="btn" onclick="reginaPortiereEmergenza.scegli()" ${candidates.length < 11 ? 'disabled' : ''}>🧤 Schiera il portiere di emergenza</button></p>
      ${candidates.length < 11 ? '<p class="notice">Attenzione: ci sono meno di 11 giocatori verificati disponibili.</p>' : ''}
      </section>`;
  };

  const oldTodayView = todayView;
  todayView = function (...args) {
    const original = oldTodayView.apply(this, args);
    if (!noGoalkeeper()) return original;
    const lineup = inField(), chosen = lineup[0], isReady = lineupReady() && (st.lineup || []).length === 11;
    return `<div class="notice" style="margin:12px 0;border-left:4px solid #ca842d">
      🧤 <b>Emergenza portieri:</b> nessun portiere di ruolo disponibile.
      ${isReady && chosen ? `In porta: <b>${textSafe(chosen.name)}</b> (${roleName[chosen.pos] || 'fuori ruolo'}). La squadra giocherà con una penalità.` :
        `Schiera un giocatore di movimento in porta prima di confermare la giornata.`}
      <button type="button" class="btn alt" onclick="changeView('squad')">Vai alla formazione</button>
      </div>` + original;
  };

  /* Rischio sportivo effettivo: niente esoneri dei portieri infortunati,
   * niente penalita' per le squadre che usano un portiere di ruolo.
   * Il malus entra in ogni motore che usa calcTeam, comprese le coppe.
   */
  const oldCalcTeam = calcTeam;
  calcTeam = function (id, ...rest) {
    const result = oldCalcTeam.call(this, id, ...rest);
    if (id === st?.club && result?.lineup?.length &&
        !result.lineup.some(p => p.pos === 'P')) {
      result.performance = Math.max(0, result.performance - 2.4);
      result.emergencyKeeperId = result.lineup[0]?.id || null;
    }
    return result;
  };

  /* Il tabellino e la pagella riconoscono chi e' stato schierato in porta. */
  function markEmergency(match) {
    const ids = match?.lineups?.[st?.club] || [];
    if (!ids.length || ids.some(id => match.playerNames?.[id]?.pos === 'P')) return match;
    const id = ids[0], player = squad().find(p => p.id === id);
    if (!player) return match;
    match.emergencyKeeper = { team:st.club, playerId:id, name:player.name, originalRole:player.pos };
    if (Number.isFinite(Number(match.grades?.[id]))) {
      match.grades[id] = Math.max(3, Math.round((Number(match.grades[id]) - 1.3) * 10) / 10);
    }
    return match;
  }
  const oldCalcMatch = calcMatch;
  calcMatch = function (...args) { return markEmergency(oldCalcMatch.apply(this, args)); };
  // Anche la Champions/Europa League usa un motore di gara specifico.
  if (typeof euroMatch === 'function') {
    const oldEuroMatch = euroMatch;
    euroMatch = function (...args) { return markEmergency(oldEuroMatch.apply(this, args)); };
  }
  const oldArticle = article;
  article = function (match, ...args) {
    const item = oldArticle.call(this, match, ...args);
    const emergency = match?.emergencyKeeper;
    if (!emergency || emergency.team !== st?.club || !item || typeof item !== 'object') return item;
    const role = roleName[emergency.originalRole] || 'giocatore di movimento';
    return { ...item, body:(item.body || '') +
      ` Emergenza tra i pali: con tutti i portieri indisponibili, ${emergency.name} (${role}) è stato schierato in porta. La soluzione ha comportato rischi e difficoltà difensive.` };
  };

  // Il numero di versione si aggiorna senza alterare gli altri menu o moduli.
  const oldHeader = header;
  header = function (...args) {
    return oldHeader.apply(this, args).replace(/REGINA CALCIO 1\.1\.24/, 'REGINA CALCIO 1.1.25');
  };
})();
