/* Farm & Table • Collegamento manuale con REGINA Calcio 1.1.21.
   Aggiungere DOPO il codice principale della fattoria. Nessun server.
   Dati ricevuti separati dai progressi di Hninn, con adozione volontaria
   dei compiti nel suo sistema di gioco. Include la lista spesa condivisa. */
(function(){
'use strict';
if(typeof state==='undefined'||typeof render!=='function'||typeof save!=='function'||typeof ui==='undefined'){
  console.error('Farm & Table: collegamento REGINA non inizializzato; mettere dopo lo script originale.');return;
}
const THEMES=[
 ['health','🟢','Sport / Salute','health'],['work','🔴','Lavoro','work'],
 ['services','⚫','Servizi / Burocrazia','services'],['study','🟠','Studio','work'],
 ['home','🔵','Casa','home'],['other','🟣','Altro','leisure'],
 ['contacts','🩷','Contatti','social'] ];
const THEMEMAP=Object.fromEntries(THEMES.map(x=>[x[0],x]));
const PRI={urgent:'Indispensabile subito',ideal:'Ideale',low:'Meno importante','':'Da valutare'};
const THEME_COLORS={health:'#228657',work:'#c94c43',services:'#44464d',study:'#cd8c18',home:'#3976bf',other:'#7957b4',contacts:'#d15191'};
const COPYKEY='reginaBridge';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const txt=(s,n=220)=>String(s??'').trim().slice(0,n);
const dt=s=>/^\d{4}-\d{2}-\d{2}$/.test(String(s||'').slice(0,10))?String(s).slice(0,10):'';
const field=(obj,k,n=180)=>txt(obj&&obj[k],n);
const idx=(array,id)=>array.find(x=>x.id===id);
const localToday=()=>typeof today==='function'?today():new Date().toISOString().slice(0,10);
const newId=()=>`ht-r-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
function data(){
 if(!state[COPYKEY]||typeof state[COPYKEY]!=='object')state[COPYKEY]={};
 const d=state[COPYKEY];
 for(const k of ['projects','tasks','fronts','shopping'])if(!Array.isArray(d[k]))d[k]=[];
 return d;
}
function theme(t){return THEMEMAP[t]?t:'other'}
function cleanImport(raw){
 if(!raw||raw.format!=='REGINA_TO_FARM_V1'||raw.version!==1 ||
 !Array.isArray(raw.tasks)||!Array.isArray(raw.fronts)||!Array.isArray(raw.projects)||!Array.isArray(raw.shopping)){
  throw Error('Questo non è un file «REGINA per Hninn». Esporta da REGINA Calcio → 📤 Hninn.');
 }
 if(raw.tasks.length>6000||raw.projects.length>1000||raw.shopping.length>3000||raw.fronts.length>3000)throw Error('Troppi elementi nel file.');
 const unique=(items,map)=>[...new Map(items.map((x,i)=>[x.id||('r-'+i),map(x)])).values()];
 return {
  exportedAt:field(raw,'exportedAt',60),
  fronts:unique(raw.fronts.filter(x=>x&&x.id&&x.title),f=>({id:field(f,'id',130),title:field(f,'title'),theme:theme(f.theme),deadline:dt(f.deadline),notes:field(f,'notes',500)})),
  tasks:unique(raw.tasks.filter(x=>x&&x.id&&x.title),t=>({
   id:field(t,'id',130),frontId:field(t,'frontId',130),title:field(t,'title'),notes:field(t,'notes',500),
   theme:theme(t.theme),date:dt(t.date),deadline:dt(t.deadline),time:field(t,'time',5),
   status:['done','partial','ongoing','failed'].includes(t.status)?t.status:'todo',
   progress:Math.max(0,Math.min(100,Math.round(Number(t.progress)||0))),
   difficulty:Math.max(1,Math.min(5,Math.round(Number(t.difficulty)||3))),
   repeat:field(t,'repeat',25),projectId:field(t,'projectId',130),stepId:field(t,'stepId',130)
  })),
  projects:unique(raw.projects.filter(x=>x&&x.id&&x.title),p=>({
   id:field(p,'id',130),title:field(p,'title'),description:field(p,'description',600),theme:theme(p.theme),deadline:dt(p.deadline),
   steps:(Array.isArray(p.steps)?p.steps:[]).slice(0,1000).filter(s=>s&&s.id&&s.title).map(s=>({
     id:field(s,'id',130),title:field(s,'title'),date:dt(s.date),deadline:dt(s.deadline),
     done:!!s.done,taskId:field(s,'taskId',130)
   }))
  })),
  shopping:unique(raw.shopping.filter(x=>x&&x.title),s=>({
   id:field(s,'id',130)||newId(),title:field(s,'title'),done:!!s.done,
   priority:Object.prototype.hasOwnProperty.call(PRI,s.priority)?s.priority:''
  }))
 };
}
// La seconda importazione aggiorna nuovi metadati ma non cancella le spunte e
// le modifiche fatte da Hninn; nessun doppione con la stessa origine.
function mergeCollection(dst, incoming, keep){
 let added=0,updated=0;
 const map=new Map(dst.map(x=>[x.id,x]));
 for(const raw of incoming){
  const old=map.get(raw.id);
  if(!old){dst.push(raw);map.set(raw.id,raw);added++;}
  else{Object.assign(old,raw,...keep.map(k=>Object.hasOwn(old,k)?{[k]:old[k]}:{}));updated++;}
 }
 return {added,updated};
}
function merge(doc){
 const incoming=cleanImport(doc),d=data();
 const f=mergeCollection(d.fronts,incoming.fronts,[]);
 const t=mergeCollection(d.tasks,incoming.tasks,['localDone','localTitle','localNotes','adoptedId','adoptedDate','adoptedCat']);
 const s=mergeCollection(d.shopping,incoming.shopping,['done','title','priority','removed']);
 // Mantiene le spunte locali delle tappe nei progetti già importati.
 let projects=0;
 for(const p of incoming.projects){
  const old=idx(d.projects,p.id);
  if(!old){d.projects.push(p);projects++;continue;}
  const checks=new Map((old.steps||[]).map(x=>[x.id,x]));
  p.steps=p.steps.map(x=>{const o=checks.get(x.id);return o?{...x,done:o.done,localTitle:o.localTitle,localDate:o.localDate,removed:o.removed}:x});
  p.steps.push(...(old.steps||[]).filter(x=>x.addedLocally&&!p.steps.some(y=>y.id===x.id)));
  Object.assign(old,p,{localTitle:old.localTitle,localDescription:old.localDescription});
 }
 d.lastImportedAt=new Date().toISOString();d.sourceExportedAt=incoming.exportedAt;
 if(!save())throw Error('Il dispositivo non è riuscito a salvare: esporta un backup prima di chiudere.');
 return {projects,fronts:f.added,tasks:t.added,shopping:s.added,updated:t.updated+s.updated};
}
function renderBadge(t){const x=THEMEMAP[theme(t)]||THEMES[5];return `<span class="rfi-badge" style="--rfi-color:${THEME_COLORS[x[0]]}">${x[1]} ${x[2]}</span>`}
function dateInfo(t){const items=[];if(t.date)items.push('📅 '+t.date);if(t.deadline&&t.deadline!==t.date)items.push('⏳ Entro '+t.deadline);return items.join(' · ')}
function taskRow(t,prefix=''){
 const d=data(),taskid=esc(t.id),title=t.localTitle||t.title,notes=t.localNotes??t.notes;
 const sourceDone=typeof t.localDone==='boolean'?t.localDone:(t.status==='done'||t.done===true);
 const imported=t.status==='done'||t.done===true;
 const adopted=t.adoptedId && Array.isArray(state.tasks) && state.tasks.some(g=>g.id===t.adoptedId);
 return `<div class="rfi-row ${sourceDone?'rfi-done':''}" style="--rfi-color:${THEME_COLORS[theme(t.theme)]}">
  <label class="rfi-check"><input type="checkbox" data-rfi-toggle-task="${taskid}" ${sourceDone?'checked':''} aria-label="Segna completata: ${esc(title)}"></label>
  <div class="rfi-info"><strong>${esc(title)} <button class="rfi-mini rfi-mini-edit" type="button" data-rfi-action="edit-task" data-rfi-id="${taskid}">✎</button></strong><small>${renderBadge(t.theme)} ${esc(dateInfo(t))}${imported?' · ✓ Già completato in REGINA':''}</small>
   ${notes?`<p>${esc(notes)}</p>`:''}</div>
  ${adopted?'<span class="rfi-adopted">✓ Negli obiettivi di Hninn</span>':
  `<details class="rfi-adopt"><summary>＋ Nei miei obiettivi</summary><div class="rfi-form">
   <label>Data <input type="date" data-rfi-date value="${esc(t.date||t.deadline||localToday())}"></label>
   <label>Categoria <select data-rfi-cat>${[['health','Salute'],['work','Lavoro / Studio'],['home','Casa'],['services','Servizi / Burocrazia'],['social','Contatti'],['leisure','Svago / Altro']].map(([c,name])=>`<option value="${c}" ${c===(THEMEMAP[theme(t.theme)]||THEMES[5])[3]?'selected':''}>${esc(name)}</option>`).join('')}</select></label>
   <button type="button" data-rfi-action="adopt" data-rfi-id="${taskid}">Aggiungi</button></div></details>`}
  </div>`;
}
function projectRow(p){
 const steps=Array.isArray(p.steps)?p.steps.filter(x=>!x.removed):[];
 const done=steps.filter(s=>s.done).length;
 return `<details class="rfi-project" style="--rfi-color:${THEME_COLORS[theme(p.theme)]}"><summary>${renderBadge(p.theme)} <strong>${esc(p.localTitle||p.title)}</strong>
  <small>${done}/${steps.length} tappe · ${steps.length?Math.round(100*done/steps.length):0}% ${p.deadline?' · entro '+esc(p.deadline):''}</small></summary>
  ${(p.localDescription??p.description)?`<p>${esc(p.localDescription??p.description)}</p>`:''}
  <div class="rfi-project-controls"><button type="button" data-rfi-action="edit-project" data-rfi-project="${esc(p.id)}">✎ Modifica progetto</button><button type="button" data-rfi-action="add-step" data-rfi-project="${esc(p.id)}">＋ Tappa</button></div>
  <div class="rfi-track"><span style="width:${steps.length?Math.round(100*done/steps.length):0}%"></span></div>
  ${steps.length?steps.map(s=>{
   const match=idx(data().tasks,s.taskId)||data().tasks.find(t=>t.stepId===s.id);
   const pseudo=match||{...s,theme:p.theme};
   return `<div class="rfi-project-step"><label><input type="checkbox" data-rfi-check-project="${esc(p.id)}" data-rfi-check-step="${esc(s.id)}" ${s.done?'checked':''}>
    <span>${esc(s.localTitle||s.title)} <small>${esc(s.localDate?dateInfo({...s,date:s.localDate}):dateInfo(s))}</small></span></label><button class="rfi-mini rfi-mini-edit" type="button" data-rfi-action="edit-step" data-rfi-project="${esc(p.id)}" data-rfi-step="${esc(s.id)}">✎</button>
    ${!pseudo.adoptedId?`<button class="rfi-mini" type="button" data-rfi-action="adopt-step" data-rfi-project="${esc(p.id)}" data-rfi-step="${esc(s.id)}">＋ Ai miei obiettivi</button>`:''}
   </div>`;
  }).join(''):'<p>Nessuna tappa.</p>'}
  </details>`;
}
function purchaseRow(x){
 const opts=Object.entries(PRI).map(([k,v])=>`<option value="${esc(k)}" ${k===x.priority?'selected':''}>${v}</option>`).join('');
 return `<div class="rfi-purchase ${x.done?'rfi-done':''}">
 <label><input type="checkbox" data-rfi-shop="${esc(x.id)}" ${x.done?'checked':''}> <span>${esc(x.title)}</span></label><button type="button" data-rfi-action="edit-shop" data-rfi-id="${esc(x.id)}" title="Modifica voce della spesa">✎</button>
 <select data-rfi-priority="${esc(x.id)}">${opts}</select>
 <button type="button" data-rfi-action="delete-shop" data-rfi-id="${esc(x.id)}" title="Rimuovi dalla lista">×</button>
 </div>`;
}
const themeSort=(a,b)=>THEMES.findIndex(t=>t[0]===theme(a.theme))-THEMES.findIndex(t=>t[0]===theme(b.theme));
function page(){
 const d=data(),tasks=d.tasks.filter(t=>!t.projectId&&!t.stepId),s=d.shopping.filter(x=>!x.removed);
 const active=s.filter(x=>!x.done).sort((a,b)=>['urgent','ideal','low',''].indexOf(a.priority)-['urgent','ideal','low',''].indexOf(b.priority));
 const done=s.filter(x=>x.done);
 return `<div class="rfi-page">${typeof htmlHead==='function'?htmlHead('Da REGINA Calcio','I tuoi obiettivi e la spesa condivisa: copie indipendenti, senza modificare REGINA.'): 
  '<h1>📬 Da REGINA Calcio</h1>'}
  <section class="section"><h2 class="section-title">📥 Importa da REGINA</h2>
   <p>Da REGINA Calcio scegli <b>📤 Hninn</b>, esporta un file e aprilo qui nell'app della fattoria.
   La seconda importazione aggiunge le novità evitando duplicati e mantenendo le spunte modificate da Hninn.</p>
   <label class="field">Seleziona il file ricevuto (.json)<input type="file" accept=".json,application/json" data-rfi-import></label>
   <small>${d.lastImportedAt?'Ultima importazione: '+esc(new Date(d.lastImportedAt).toLocaleString('it-IT')):'Nessun file importato.'}</small>
   <p class="rfi-muted">I dati ricevuti non incidono da soli sulla fattoria. Per far valere un obiettivo nel gioco, scegli «＋ Nei miei obiettivi»: Hninn decide cosa assumersi.</p>
  </section>
  <section class="section"><h2 class="section-title">🛒 Spesa condivisa <small>${active.length} da comprare</small></h2>
   <div class="rfi-stack">${active.map(purchaseRow).join('')||'<p class="rfi-muted">Non ci sono acquisti in sospeso.</p>'}
    ${done.length?`<details><summary>Acquistati (${done.length})</summary>${done.map(purchaseRow).join('')}</details>`:''}</div>
   <form data-rfi-form="shopping" class="rfi-add"><input name="name" maxlength="160" required placeholder="Aggiungi alla spesa"><select name="priority">${Object.entries(PRI).map(([k,v])=>`<option value="${esc(k)}">${esc(v)}</option>`).join('')}</select><button>Aggiungi</button></form>
  </section>
  <section class="section"><h2 class="section-title">🎯 Grandi obiettivi <small>${d.projects.length}</small></h2>
   <div class="rfi-stack">${[...d.projects].sort(themeSort).map(projectRow).join('')||'<p class="rfi-muted">Nessun grande obiettivo ricevuto.</p>'}</div>
  </section>
  <section class="section"><h2 class="section-title">📋 Obiettivi e tappe <small>${tasks.length} attività fuori dai grandi obiettivi</small></h2>
   <div class="rfi-stack">${[...d.fronts].sort(themeSort).map(f=>{
    const ls=tasks.filter(t=>t.frontId===f.id).sort(themeSort);
    if(!ls.length)return '';
    return `<details class="rfi-front" style="--rfi-color:${THEME_COLORS[theme(f.theme)]}"><summary>${renderBadge(f.theme)} <strong>${esc(f.title)}</strong> <small>${ls.length} tappe</small></summary>${ls.map(taskRow).join('')}</details>`;
   }).join('')}${tasks.filter(t=>!d.fronts.some(f=>f.id===t.frontId)).sort(themeSort).map(taskRow).join('')|| (!tasks.length?'<p class="rfi-muted">Nessuna tappa ricevuta.</p>':'')}</div>
  </section></div>`;
}
function findTask(taskid){return idx(data().tasks,taskid)}
function persist(){const ok=save();if(!ok)throw Error('Non è stato possibile salvare in questo dispositivo.');}
function adoptTask(t,day,cat){
 if(!Array.isArray(state.tasks))throw Error('L’archivio obiettivi della fattoria non è disponibile.');
 if(t.adoptedId&&state.tasks.some(x=>x.id===t.adoptedId))return false;
 const id=newId();const validCats=['health','work','home','services','social','leisure'];
 const mapped=validCats.includes(cat)?cat:(THEMEMAP[theme(t.theme)]||THEMES[5])[3];
 const targetDate=dt(day)||localToday();
 state.tasks.push({id,title:t.localTitle||t.title,cat:mapped,diff:Math.max(1,Math.min(5,Number(t.difficulty)||3)),repeat:'once',date:targetDate,reginaSourceId:t.id});
 t.adoptedId=id;t.adoptedDate=targetDate;t.adoptedCat=mapped;
 return true;
}
function refresh(){render()}
const previousRender=render;
render=function(...args){
 const share=ui.view==='regina-share';
 if(share)ui.view='home';
 let ret;try{ret=previousRender.apply(this,args);}finally{if(share)ui.view='regina-share'}
 const nav=document.getElementById('sideNav');
 if(nav&&!nav.querySelector('[data-rfi-action="open"]')){
  const btn=document.createElement('button');btn.type='button';btn.className='nav-btn';btn.dataset.rfiAction='open';
  btn.innerHTML='<span>📬</span>Da REGINA';nav.appendChild(btn);
 }
 const menu=document.getElementById('content');
 if(share&&menu){menu.innerHTML=page();const x=nav?.querySelector('[data-rfi-action="open"]');if(x)x.classList.add('active')}
 else if(menu&&(ui.view==='settings'||ui.view==='more'||ui.view==='today')&&!menu.querySelector('.rfi-entry')){
  const box=document.createElement('section');box.className='rfi-entry section';
  box.innerHTML='<h2 class="section-title">📬 Dati condivisi da REGINA</h2><p class="small muted">Ricevi obiettivi, traguardi e lista della spesa dall’app REGINA Calcio.</p><button type="button" class="btn" data-rfi-action="open">Apri la spesa e gli obiettivi ricevuti →</button>';
  menu.appendChild(box);
 }
 return ret;
};
document.addEventListener('click',ev=>{
 const b=ev.target.closest?.('[data-rfi-action]');if(!b)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 const action=b.dataset.rfiAction,id=b.dataset.rfiId;
 try{
  if(action==='open'){ui.view='regina-share';return refresh();}
  if(action==='edit-shop'){
    const item=idx(data().shopping,id);if(!item)return;
    const title=prompt('Modifica elemento della spesa:',item.title);
    if(title===null)return;
    if(!txt(title,160))throw Error('Il nome non può essere vuoto.');
    item.title=txt(title,160);persist();refresh();return;
  }
  if(action==='edit-task'){
    const task=findTask(id);if(!task)return;
    const title=prompt('Modifica titolo della tappa ricevuta:',task.localTitle||task.title);
    if(title===null)return;if(!txt(title))throw Error('Titolo vuoto.');
    task.localTitle=txt(title);persist();refresh();return;
  }
  if(action==='edit-project'){
    const p=idx(data().projects,b.dataset.rfiProject);if(!p)return;
    const title=prompt('Titolo del progetto:',p.localTitle||p.title);
    if(title===null)return;if(!txt(title))throw Error('Titolo vuoto.');
    p.localTitle=txt(title);persist();refresh();return;
  }
  if(action==='add-step'){
    const p=idx(data().projects,b.dataset.rfiProject);if(!p)return;
    const title=prompt('Nuova tappa del progetto:','');
    if(title===null)return;if(!txt(title))throw Error('La tappa deve avere un titolo.');
    p.steps.push({id:newId(),title:txt(title),done:false,date:'',deadline:'',taskId:'',addedLocally:true});
    persist();refresh();return;
  }
  if(action==='edit-step'){
    const p=idx(data().projects,b.dataset.rfiProject),step=p?.steps.find(x=>x.id===b.dataset.rfiStep);
    if(!step)return;
    const title=prompt('Titolo della tappa:',step.localTitle||step.title);
    if(title===null)return;
    if(!txt(title))throw Error('Titolo vuoto.');
    step.localTitle=txt(title);persist();refresh();return;
  }
  if(action==='delete-shop'){
    const row=idx(data().shopping,id);if(!row)return;
    if(!confirm('Rimuovere «'+row.title+'» dalla lista ricevuta?'))return;
    row.removed=true;persist();refresh();return;
  }
  if(action==='adopt'){
    const t=findTask(id);if(!t)return;
    const form=b.closest('.rfi-adopt');const day=form?.querySelector('[data-rfi-date]')?.value||localToday();
    const cat=form?.querySelector('[data-rfi-cat]')?.value||'work';
    if(adoptTask(t,day,cat)){persist();refresh();}
    return;
  }
  if(action==='adopt-step'){
    const p=idx(data().projects,b.dataset.rfiProject),step=p?.steps.find(x=>x.id===b.dataset.rfiStep);
    if(!p||!step)return;
    let t=idx(data().tasks,step.taskId)||data().tasks.find(x=>x.stepId===step.id);
    if(!t){t={id:'project-step:'+p.id+':'+step.id,title:step.localTitle||step.title,theme:p.theme,date:step.localDate||step.date,deadline:step.deadline,difficulty:3,projectId:p.id,stepId:step.id};data().tasks.push(t);}
    if(adoptTask(t,t.date||t.deadline||localToday(),'')){persist();refresh();}
    return;
  }
 }catch(err){console.error(err);alert('Operazione non completata: '+err.message)}
},true);
document.addEventListener('submit',ev=>{
 const form=ev.target.closest?.('[data-rfi-form]');if(!form)return;
 ev.preventDefault();ev.stopImmediatePropagation();
 try{const d=data(),name=txt(form.elements.name?.value,160);
  if(!name)return;d.shopping.push({id:newId(),title:name,done:false,priority:form.elements.priority?.value||''});
  persist();refresh();
 }catch(err){alert(err.message)}
},true);
document.addEventListener('change',ev=>{
 const el=ev.target;
 if(!el.matches?.('[data-rfi-shop],[data-rfi-priority],[data-rfi-toggle-task],[data-rfi-check-project],[data-rfi-import]'))return;
 ev.stopImmediatePropagation();
 try{
  if(el.hasAttribute('data-rfi-shop')){const x=idx(data().shopping,el.dataset.rfiShop);if(x)x.done=el.checked;persist();refresh();return;}
  if(el.hasAttribute('data-rfi-priority')){const x=idx(data().shopping,el.dataset.rfiPriority);if(x&&Object.hasOwn(PRI,el.value))x.priority=el.value;persist();refresh();return;}
  if(el.hasAttribute('data-rfi-toggle-task')){const x=findTask(el.dataset.rfiToggleTask);if(x)x.localDone=el.checked;persist();refresh();return;}
  if(el.hasAttribute('data-rfi-check-project')){const x=idx(data().projects,el.dataset.rfiCheckProject)?.steps.find(x=>x.id===el.dataset.rfiCheckStep);if(x)x.done=el.checked;persist();refresh();return;}
  if(el.hasAttribute('data-rfi-import')){
   const file=el.files?.[0];if(!file)return;
   if(file.size>5_000_000)throw Error('File troppo grande (massimo 5 MB).');
   file.text().then(contents=>{
    const incoming=cleanImport(JSON.parse(contents));
    const message=`Importare una COPIA da REGINA Calcio?\n\n${incoming.projects.length} grandi obiettivi\n${incoming.tasks.length} tappe\n${incoming.shopping.length} elementi spesa\n\nNon verranno eliminati dati di Hninn. Gli obiettivi ricevuti influiranno sul gioco soltanto se Hninn decide di aggiungerli ai propri obiettivi.`;
    if(!confirm(message))return;
    const result=merge(JSON.parse(contents));refresh();alert(`Ricevuti: ${result.projects} nuovi traguardi, ${result.tasks} nuove tappe, ${result.shopping} nuovi acquisti. Nessun dato esistente cancellato.`);
   }).catch(err=>{console.error(err);alert('Importazione non riuscita: '+err.message)});
  }
 }catch(err){alert('Operazione non completata: '+err.message)}
},true);
const css=document.createElement('style');css.textContent=`
.rfi-page{display:grid;gap:14px}.rfi-page>.section{margin-bottom:0}.rfi-page p{line-height:1.55}
.rfi-muted{font-size:12px;color:#6c786d}.rfi-stack{display:grid;gap:9px}
.rfi-badge{display:inline-block;white-space:nowrap;font-size:10px;font-weight:850;color:var(--rfi-color);border:1px solid var(--rfi-color);border-radius:9px;padding:3px 6px;margin-right:5px;background:white}
.rfi-project,.rfi-front{border:1px solid #dce7da;border-left:5px solid var(--rfi-color);border-radius:12px;padding:10px;background:#fbfdfb}
.rfi-project>summary,.rfi-front>summary{display:flex;align-items:center;flex-wrap:wrap;gap:5px 7px;cursor:pointer;font-size:13px}
.rfi-project>summary small,.rfi-front>summary small{font-size:11px;color:#728073}
.rfi-track{height:10px;border-radius:20px;background:#e4e9e3;overflow:hidden;margin:10px 0}.rfi-track span{display:block;height:100%;background:var(--rfi-color)}
.rfi-row{border-left:4px solid var(--rfi-color);background:#fff;border-radius:9px;border-top:1px solid #e9eee9;border-bottom:1px solid #e9eee9;padding:9px;display:flex;align-items:flex-start;gap:8px;min-width:0}
.rfi-row.rfi-done strong{text-decoration:line-through;opacity:.7}.rfi-check input{width:18px;height:18px}.rfi-info{flex:1;min-width:0}.rfi-info strong{display:block;font-size:13px;overflow-wrap:anywhere}.rfi-info small{display:block;font-size:11px;color:#667768}.rfi-info p{margin:3px 0 0;font-size:11px;color:#728070}
.rfi-adopt{max-width:180px;font-size:11px}.rfi-adopt summary{border:1px solid #a3c5ac;padding:6px;border-radius:7px;cursor:pointer;background:#eff8ee;color:#3a6845}.rfi-form{display:grid;gap:8px;position:relative;padding:7px 0}.rfi-form label{display:grid;gap:3px}.rfi-form input,.rfi-form select{width:100%;min-width:110px;border:1px solid #cadbcf;padding:6px;border-radius:6px;background:#fff}.rfi-form button,.rfi-mini{padding:6px;border-radius:7px;color:white;background:#366e53;border:0}.rfi-adopted{font-size:10px;color:#2f8051;font-weight:800}
.rfi-project-controls{display:flex;gap:8px;flex-wrap:wrap;margin:9px 0}.rfi-project-controls button{background:#e8f3e7;color:#28654c;border:1px solid #b6d0b8;border-radius:8px;padding:7px 9px;font-size:11px;font-weight:700}.rfi-mini-edit{background:#e7eee8;color:#3c6a4a;font-size:11px}.rfi-project-step{display:flex;align-items:center;justify-content:space-between;gap:9px;padding:6px;border-top:1px solid #e5eee5}.rfi-project-step label{display:flex;align-items:center;gap:7px;min-width:0;font-size:12px}.rfi-project-step label input{width:18px;height:18px;flex-shrink:0}.rfi-project-step label small{color:#78847a}
.rfi-purchase{display:flex;gap:8px;align-items:center;border:1px solid #e1e9e0;border-radius:9px;padding:8px;background:#fff}.rfi-purchase label{flex:1;min-width:0;font-size:13px;display:flex;gap:6px;align-items:center}.rfi-purchase label span{overflow-wrap:anywhere}.rfi-purchase.rfi-done label span{text-decoration:line-through;color:#809086}.rfi-purchase input{width:17px;height:17px}.rfi-purchase select{max-width:166px;min-width:94px;border:1px solid #ccd9d1;border-radius:7px;padding:7px 4px;background:#fff;font-size:12px}.rfi-purchase button{border:0;background:#f6eeee;color:#ad5454;border-radius:6px;padding:5px 8px}
.rfi-add{display:grid;grid-template-columns:1fr minmax(100px,155px) auto;gap:6px;margin-top:11px}.rfi-add input,.rfi-add select{padding:8px;border:1px solid #cddbcc;border-radius:7px;width:100%;min-width:0}.rfi-add button{padding:8px 12px;background:#3b7551;color:white;border:0;border-radius:8px;font-weight:800}
@media(max-width:680px){.rfi-row{flex-wrap:wrap}.rfi-adopt{max-width:none;width:100%;padding-left:20px}.rfi-form{grid-template-columns:1fr 1fr auto;align-items:end}.rfi-form input{min-width:0}.rfi-add{grid-template-columns:1fr 1fr}.rfi-add input{grid-column:1/-1}.rfi-purchase{flex-wrap:wrap}.rfi-purchase label{flex-basis:100%}}
`;document.head.appendChild(css);
window.farmReginaBridge={read:data,preview:cleanImport,merge,adopt:adoptTask};
// Quando lo script viene caricato dopo il render iniziale, aggiorna subito il menu.
if(document.readyState!=='loading')render();
})();
