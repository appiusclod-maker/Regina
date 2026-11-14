/* REGINA CALCIO 1.1.17 — Grandi obiettivi / Traguardi.
   Modulo leggero e autonomo: utilizza il salvataggio della carriera, compresi
   backup e ripristino; non modifica voti, partite, obiettivi giornalieri o finanze. */
(function(){
'use strict';
if(typeof st==='undefined'||typeof header!=='function'||typeof todayView!=='function'||typeof persist!=='function'){
 console.error('REGINA Traguardi: caricare questo file dopo regina-upgrade.js.');return;
}
const PAGE='longterm';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const uid=()=>('rlt-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));
const clamp=x=>Math.max(0,Math.min(100,Number(x)||0));
const data=()=>st?.reginaLongTerm?.goals&&Array.isArray(st.reginaLongTerm.goals)?st.reginaLongTerm:{goals:[]};
const complete=g=>Boolean(g.steps?.length)&&g.steps.every(s=>clamp(s.pct)>=100);
const progress=g=>g.steps?.length?Math.round(g.steps.reduce((v,s)=>v+clamp(s.pct),0)/g.steps.length):0;
const dateFmt=x=>x?new Date(x+'T12:00:00').toLocaleDateString('it-IT',{day:'numeric',month:'short',year:'numeric'}):'';
let expandedGoal=null;
function update(mutator){
 if(!st)return false;
 const previous=st.reginaLongTerm;
 const next=JSON.parse(JSON.stringify(data()));
 try{mutator(next)}catch(err){alert(err.message);return false}
 st.reginaLongTerm=next;
 try{
  const saved=persist();
  if(saved===false){st.reginaLongTerm=previous;alert('Il salvataggio non è riuscito. Controlla Impostazioni e non chiudere la pagina prima di esportare un backup.');return false;}
 }catch(err){st.reginaLongTerm=previous;alert('Errore di salvataggio: '+err.message);return false}
 const y=window.scrollY;
 render();requestAnimationFrame(()=>window.scrollTo(0,y));
 return true;
}
function findGoal(d,id){let g=d.goals.find(g=>g.id===id);if(!g)throw Error('Traguardo non trovato.');return g}
function stepMarkup(g,s,index){
 const n=clamp(s.pct),id=esc(g.id),stepId=esc(s.id);
 return `<li class="rlt-step ${n===100?'done':''}">
   <label class="rlt-step-check"><input type="checkbox" data-rlt-check="${stepId}" data-goal="${id}" ${n===100?'checked':''} aria-label="Completata: ${esc(s.title)}"></label>
   <div class="rlt-step-main"><span class="rlt-step-label">${esc(s.title)}</span>
     <div class="rlt-step-progress"><input type="range" min="0" max="100" step="5" value="${n}" data-rlt-pct="${stepId}" data-goal="${id}" aria-label="Avanzamento della tappa ${esc(s.title)}"><output>${n}%</output></div>
   </div>
   <div class="rlt-step-actions"><button type="button" data-rlt-act="up" data-goal="${id}" data-step="${stepId}" aria-label="Sposta prima" ${index===0?'disabled':''}>↑</button>
     <button type="button" data-rlt-act="down" data-goal="${id}" data-step="${stepId}" aria-label="Sposta dopo" ${index===g.steps.length-1?'disabled':''}>↓</button>
     <button type="button" data-rlt-act="remove-step" data-goal="${id}" data-step="${stepId}" class="rlt-danger" aria-label="Elimina tappa">×</button></div>
 </li>`;
}
function goalMarkup(g){
 const n=progress(g),done=complete(g),left=g.steps.find(s=>clamp(s.pct)<100);
 const count=g.steps.filter(s=>clamp(s.pct)>=100).length;
 const next=left?`<div class="rlt-next"><b>Prossimo passo:</b> ${esc(left.title)}${left.pct>0?` · ${clamp(left.pct)}%`:''}</div>`:
   (done?'<div class="rlt-next rlt-complete">✅ Percorso completato!</div>':'<div class="rlt-next">Aggiungi le prime tappe per iniziare.</div>');
 return `<article class="rlt-goal ${done?'rlt-goal-done':''}">
   <div class="rlt-head"><div class="rlt-goal-heading"><h3>${esc(g.title)}</h3>${g.description?`<p class="rlt-description">${esc(g.description)}</p>`:''}</div><strong class="rlt-pct">${n}%</strong></div>
   <div class="rlt-bar" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${n}" aria-label="Avanzamento ${esc(g.title)}"><span style="width:${n}%"></span></div>
   <div class="rlt-meta"><span>✓ ${count}/${g.steps.length} tappe completate</span>${g.targetDate?`<span>📅 ${dateFmt(g.targetDate)}</span>`:''}</div>
   ${next}
   <details class="rlt-details" data-goal="${esc(g.id)}" ${expandedGoal===g.id?'open':''}>
     <summary>📋 ${g.steps.length?`Visualizza il percorso (${g.steps.length} tappe)`:'Costruisci il percorso graduale'}</summary>
     ${g.steps.length?`<ol class="rlt-steps">${g.steps.map((s,i)=>stepMarkup(g,s,i)).join('')}</ol>`:'<p class="rlt-muted">Inserisci le fasi da affrontare, nell’ordine desiderato.</p>'}
     <form class="rlt-step-add" data-rlt-form="step" data-goal="${esc(g.id)}"><input name="title" required maxlength="180" placeholder="Nuova tappa del percorso" aria-label="Nuova tappa"><button type="submit">+ Aggiungi</button></form>
     <div class="rlt-goal-actions"><button type="button" data-rlt-act="edit" data-goal="${esc(g.id)}">✎ Modifica traguardo</button>
       <button type="button" class="rlt-danger" data-rlt-act="remove-goal" data-goal="${esc(g.id)}">Elimina</button></div>
   </details>
 </article>`;
}
function pageView(){
 if(!st)return '<section class="card">Avvia prima una carriera.</section>';
 const goals=[...data().goals].sort((a,b)=>Number(complete(a))-Number(complete(b)));
 const active=goals.filter(g=>!complete(g)),done=goals.length-active.length;
 const avg=goals.length?Math.round(goals.reduce((v,g)=>v+progress(g),0)/goals.length):0;
 return `<div class="rlt-page"><section class="rlt-intro">
   <span class="rlt-kicker">LA TUA STRADA</span><h2>🎯 Grandi obiettivi</h2>
   <p>Una panoramica dei traguardi a lungo termine. Suddividili in tappe progressive e controlla subito a che punto sei.</p>
   <div class="rlt-stats"><div><strong>${active.length}</strong><small>In corso</small></div><div><strong>${done}</strong><small>Raggiunti</small></div><div><strong>${avg}%</strong><small>Avanzamento medio</small></div></div>
   <details class="rlt-create"><summary>＋ Nuovo grande obiettivo</summary>
     <form data-rlt-form="goal" class="rlt-new-form"><label>Nome del traguardo<input name="title" required maxlength="120" placeholder="Es. Completare il livello B1 di birmano"></label>
       <label>Descrizione (facoltativa)<textarea name="description" rows="2" maxlength="500" placeholder="Cosa vuoi raggiungere?"></textarea></label>
       <label>Data obiettivo (facoltativa)<input name="targetDate" type="date"></label>
       <label>Tappe progressive, una per riga<textarea name="steps" rows="5" placeholder="Finire il modulo A&#10;Studiare il modulo B&#10;Fare esercizi di ripasso&#10;Superare il test finale"></textarea></label>
       <button type="submit">Crea il traguardo</button></form></details>
 </section>
 ${goals.length?`<div class="rlt-goals">${goals.map(goalMarkup).join('')}</div>`:
  `<section class="rlt-empty"><span>🌱</span><h3>Il primo passo è definire la meta.</h3><p>Crea un grande obiettivo e aggiungi le tappe: la barra di avanzamento si aggiornerà automaticamente.</p></section>`}
 <p class="rlt-footnote">Questa pagina è un quadro di avanzamento: non aggiunge punti né penalità alle partite. I traguardi vengono inclusi nel backup completo della carriera.</p>
 </div>`;
}
const oldToday=todayView;
todayView=function(...args){return view===PAGE?pageView():oldToday.apply(this,args)};
const oldHeader=header;
header=function(...args){
 let html=oldHeader.apply(this,args).replace(/v1\.1\.16/g,'v1.1.17');
 if(html.includes("changeView('longterm')"))return html;
 const button=`<button class="${view===PAGE?'active':''}" onclick="changeView('${PAGE}')">🎯 Traguardi</button>`;
 const match=html.match(/<button\b[^>]*onclick="changeView\('objectives'\)"[^>]*>Obiettivi<\/button>/);
 return match?html.replace(match[0],match[0]+button):html.replace('</nav>',button+'</nav>');
};
function modal(g){
 const existing=document.getElementById('rlt-editor');if(existing)existing.remove();
 const el=document.createElement('div');el.id='rlt-editor';el.className='rlt-backdrop';
 el.innerHTML=`<form class="rlt-modal" data-rlt-form="edit" data-goal="${esc(g.id)}" role="dialog" aria-modal="true" aria-label="Modifica grande obiettivo">
   <div class="rlt-modal-title"><h3>Modifica traguardo</h3><button type="button" data-rlt-act="close">✕</button></div>
   <label>Nome<input name="title" required maxlength="120" value="${esc(g.title)}"></label>
   <label>Descrizione<textarea name="description" maxlength="500" rows="3">${esc(g.description||'')}</textarea></label>
   <label>Data obiettivo<input name="targetDate" type="date" value="${esc(g.targetDate||'')}"></label>
   <button type="submit">Salva modifiche</button>
 </form>`;
 document.body.appendChild(el);el.querySelector('[name=title]')?.focus();
}
function readForm(form){return new FormData(form)}
document.addEventListener('submit',ev=>{
 const form=ev.target.closest?.('[data-rlt-form]');if(!form)return;
 ev.preventDefault();if(!st)return;
 const v=readForm(form),kind=form.dataset.rltForm;
 if(kind==='goal'){
  const title=String(v.get('title')||'').trim().slice(0,120),description=String(v.get('description')||'').trim().slice(0,500);
  if(!title)return;
  const steps=String(v.get('steps')||'').split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,100).map(title=>({id:uid(),title:title.slice(0,180),pct:0}));
  const targetDate=String(v.get('targetDate')||'');
  const id=uid();expandedGoal=id;
  update(d=>d.goals.unshift({id,title,description,targetDate,steps,createdAt:new Date().toISOString()}));
 }else if(kind==='step'){
  const title=String(v.get('title')||'').trim().slice(0,180),id=form.dataset.goal;
  if(!title)return;expandedGoal=id;
  update(d=>{const g=findGoal(d,id);if(g.steps.length>=250)throw Error('Massimo 250 tappe per traguardo.');g.steps.push({id:uid(),title,pct:0})});
 }else if(kind==='edit'){
  const id=form.dataset.goal,title=String(v.get('title')||'').trim().slice(0,120);
  if(!title)return;
  const ok=update(d=>{const g=findGoal(d,id);g.title=title;g.description=String(v.get('description')||'').trim().slice(0,500);g.targetDate=String(v.get('targetDate')||'');});
  if(ok)document.getElementById('rlt-editor')?.remove();
 }
},true);
document.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-rlt-act]');
 if(!b)return;
 const action=b.dataset.rltAct,id=b.dataset.goal,stepId=b.dataset.step;
 if(action==='close'){document.getElementById('rlt-editor')?.remove();return}
 if(action==='edit'){const g=data().goals.find(g=>g.id===id);if(g)modal(g);return}
 if(action==='remove-goal'){
  const g=data().goals.find(g=>g.id===id);if(!g||!confirm('Eliminare il grande obiettivo «'+g.title+'» e tutte le sue tappe?'))return;
  if(expandedGoal===id)expandedGoal=null;
  update(d=>{d.goals=d.goals.filter(g=>g.id!==id)});return;
 }
 if(!id||!stepId)return;
 expandedGoal=id;
 if(action==='remove-step'){
  const g=data().goals.find(g=>g.id===id),step=g?.steps.find(s=>s.id===stepId);
  if(!step||!confirm('Eliminare questa tappa: «'+step.title+'»?'))return;
  update(d=>{const g=findGoal(d,id);g.steps=g.steps.filter(s=>s.id!==stepId)});return;
 }
 if(action==='up'||action==='down'){
  update(d=>{const g=findGoal(d,id);const i=g.steps.findIndex(s=>s.id===stepId),j=i+(action==='up'?-1:1);if(i>=0&&j>=0&&j<g.steps.length)[g.steps[i],g.steps[j]]=[g.steps[j],g.steps[i]]});
 }
},true);
document.addEventListener('change',ev=>{
 const el=ev.target;
 if(!el.matches?.('[data-rlt-check],[data-rlt-pct]'))return;
 const id=el.dataset.goal,stepId=el.dataset.rltCheck||el.dataset.rltPct;
 const pct=el.hasAttribute('data-rlt-check')?(el.checked?100:0):Math.round(clamp(el.value));
 expandedGoal=id;
 update(d=>{const s=findGoal(d,id).steps.find(x=>x.id===stepId);if(s)s.pct=pct});
},true);
document.addEventListener('input',ev=>{
 const el=ev.target;if(!el.matches?.('[data-rlt-pct]'))return;
 const out=el.closest('.rlt-step-progress')?.querySelector('output');if(out)out.textContent=Math.round(clamp(el.value))+'%';
},true);
document.addEventListener('toggle',ev=>{
 const details=ev.target;if(!details.matches?.('.rlt-details'))return;
 if(details.open)expandedGoal=details.dataset.goal;
 else if(expandedGoal===details.dataset.goal)expandedGoal=null;
},true);
document.addEventListener('click',ev=>{
 if(ev.target.id==='rlt-editor')ev.target.remove();
},true);
const css=document.createElement('style');css.textContent=`
.rlt-page{max-width:1080px;margin:0 auto;padding:2px 0 35px;color:#183849}
.rlt-intro,.rlt-goal,.rlt-empty{background:#fff;border:1px solid #d8e7e4;box-shadow:0 2px 12px rgba(10,50,46,.045);border-radius:17px;padding:18px;margin-bottom:14px}
.rlt-intro{background:linear-gradient(130deg,#e8f7f1,#f8fcf9);border-color:#cae4d8}
.rlt-kicker{font-size:10px;letter-spacing:.13em;font-weight:900;color:#306e60}.rlt-intro h2{margin:6px 0;font-size:25px;color:#154b40}
.rlt-intro p{font-size:13px;line-height:1.5;color:#557267}.rlt-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px;margin:17px 0}
.rlt-stats>div{display:flex;flex-direction:column;align-items:center;gap:2px;border-radius:11px;padding:11px 5px;background:#fff9;border:1px solid #d6eae0}
.rlt-stats strong{font-size:22px;color:#195c4c}.rlt-stats small{font-size:10px;color:#5c7b6d;text-align:center}
.rlt-create{background:#fff;border:1px solid #b9d8cb;border-radius:11px;padding:11px}.rlt-create>summary{cursor:pointer;font-weight:800;color:#145c45}
.rlt-new-form,.rlt-modal{display:grid;gap:13px}.rlt-new-form{padding-top:15px}.rlt-new-form label,.rlt-modal label{display:grid;gap:5px;font-size:12px;font-weight:700;color:#365e53}
.rlt-new-form input,.rlt-new-form textarea,.rlt-modal input,.rlt-modal textarea,.rlt-step-add input{box-sizing:border-box;width:100%;min-width:0;border:1px solid #c3d7d0;border-radius:9px;padding:10px;font:inherit;font-size:15px;color:#183d36;background:white}
.rlt-new-form button,.rlt-modal button[type=submit],.rlt-step-add button{border:0;background:#12694f;color:#fff;font-weight:800;border-radius:9px;padding:11px 12px;cursor:pointer}
.rlt-goal{padding:16px}.rlt-goal-done{border-color:#addbc5;background:#fcfffd}.rlt-head{display:flex;gap:12px;align-items:flex-start;justify-content:space-between}
.rlt-goal-heading{min-width:0;flex:1}.rlt-goal h3{margin:0 0 5px;font-size:17px;color:#1b4f40;overflow-wrap:anywhere}
.rlt-description{font-size:12px;line-height:1.5;color:#6a7c75;margin:3px 0 10px;white-space:pre-line;overflow-wrap:anywhere}
.rlt-pct{font-size:23px;color:#12664e;background:#e3f6e8;border-radius:10px;padding:7px 10px;white-space:nowrap}
.rlt-bar{height:13px;border-radius:10px;background:#e5ede9;margin:12px 0 7px;overflow:hidden}.rlt-bar>span{display:block;height:100%;background:linear-gradient(90deg,#70ae98,#1b8462);border-radius:10px;transition:width .18s}
.rlt-meta{display:flex;flex-wrap:wrap;gap:6px 13px;font-size:11px;color:#667b72}.rlt-next{background:#f1f8f5;border-radius:8px;margin-top:12px;padding:10px;font-size:12px;line-height:1.5;overflow-wrap:anywhere}.rlt-next b{color:#306d54}.rlt-complete{background:#e4f5e8;color:#216d49;font-weight:800}
.rlt-details{border-top:1px solid #e2eeea;margin-top:12px;padding-top:12px}.rlt-details>summary{font-weight:800;cursor:pointer;color:#225c49;font-size:12px}.rlt-steps{list-style:none;margin:11px 0;padding:0;display:grid;gap:7px}
.rlt-step{display:flex;align-items:flex-start;gap:8px;padding:10px 7px;border:1px solid #dce9e4;border-radius:10px;background:#fafdfb;min-width:0}
.rlt-step.done{background:#ecf8f1}.rlt-step-check{padding-top:4px}.rlt-step-check input{width:19px;height:19px;accent-color:#147955}
.rlt-step-main{min-width:0;flex:1}.rlt-step-label{font-weight:650;font-size:12px;overflow-wrap:anywhere;display:block;margin-bottom:6px}
.rlt-step-progress{display:flex;gap:7px;align-items:center}.rlt-step-progress input{min-width:0;width:100%;accent-color:#238460}.rlt-step-progress output{font-size:11px;color:#23644f;width:34px;text-align:right}
.rlt-step-actions{display:flex;gap:2px}.rlt-step-actions button,.rlt-goal-actions button,.rlt-modal-title button{border:1px solid #cbdcd4;border-radius:6px;background:#fff;color:#346b58;padding:6px;cursor:pointer;font-size:13px;min-width:26px}
.rlt-step-actions button:disabled{opacity:.25}.rlt-danger{color:#ac4c40!important}.rlt-step-add{display:flex;gap:6px;margin:13px 0}.rlt-step-add button{white-space:nowrap}
.rlt-goal-actions{display:flex;gap:8px;margin-top:15px;justify-content:flex-end}.rlt-goal-actions button{padding:9px 12px}.rlt-muted,.rlt-footnote{font-size:12px;color:#637b71;line-height:1.5}
.rlt-empty{text-align:center;padding:35px 16px}.rlt-empty span{font-size:36px}.rlt-empty h3{color:#1d6047}.rlt-footnote{margin:12px 3px}
.rlt-backdrop{position:fixed;inset:0;z-index:99999;background:#061a15ae;display:flex;align-items:center;justify-content:center;padding:15px}
.rlt-modal{width:min(520px,100%);max-height:90dvh;overflow:auto;border-radius:16px;background:#fff;padding:20px;color:#254c40}.rlt-modal-title{display:flex;justify-content:space-between;align-items:center}.rlt-modal h3{margin:0 0 7px}
@media(max-width:430px){.rlt-intro,.rlt-goal{padding:13px}.rlt-step{gap:5px;padding:8px 5px}.rlt-step-actions button{padding:5px;min-width:25px}.rlt-step-add{flex-wrap:wrap}.rlt-step-add button{width:100%}.rlt-pct{font-size:20px}.rlt-meta{font-size:10px}}
`;document.head.appendChild(css);
if(st)render();
})();
