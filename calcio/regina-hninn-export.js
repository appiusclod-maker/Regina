/* REGINA Calcio 1.1.22 — Passaggio selettivo verso Farm & Table (Hninn).
   File di scambio leggibile, senza dati finanziari, risultati o dati della rosa.
   Non modifica la carriera, la lista della spesa né gli obiettivi originali. */
(function(){
'use strict';
if (typeof st === 'undefined'||typeof header !== 'function'||typeof resolveOriginal !== 'function') {
  console.error('REGINA → Hninn: caricare dopo i moduli REGINA Calcio.'); return;
}
const label = {
 health:'Sport / Salute',work:'Lavoro',services:'Burocrazia / Soldi / Servizi',
 study:'Studio',home:'Casa',other:'Altro',contacts:'Contatti'
};
const uid=x=>String(x??'').slice(0,130);
const words=(x,n=220)=>String(x??'').trim().slice(0,n);
const date=x=>/^\d{4}-\d{2}-\d{2}$/.test(String(x||'').slice(0,10))?String(x).slice(0,10):'';
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const clone=x=>JSON.parse(JSON.stringify(x));
function inferTheme(f){
 const c=String(f?.cat||'').toLowerCase(),tx=String(f?.title||'').toLowerCase();
 if(f?.reginaTheme&&label[f.reginaTheme])return f.reginaTheme;
 if(['health','work','services','home','social'].includes(c))return c==='social'?'contacts':c;
 if(c==='creative')return /stud|esam|cors|lezion|grammat|lingu|birman|apprend|formazion|impar/i.test(tx)?'study':'other';
 if(/contatt|amic|famigli|messagg|telefon|relazion/i.test(tx))return 'contacts';
 if(/stud|esam|cors|lezion|grammat|lingu/i.test(tx))return 'study';
 return 'other';
}
function pack(){
 const a=resolveOriginal()||{fronts:[],tasks:[]};
 const fronts=Array.isArray(a.fronts)?a.fronts:[],tasks=Array.isArray(a.tasks)?a.tasks:[];
 const projects=st?.reginaLongTerm?.goals||[];
 const byFront=new Map(fronts.map(f=>[f.id,f]));
 const projectCategory=new Map(projects.map(p=>[p.id,label[p.category]?p.category:'other']));
 const getTheme=t=>projectCategory.get(t.reginaLongTermGoalId)||
   (label[t.reginaTheme]?t.reginaTheme:inferTheme(byFront.get(t.frontId)||t));
 return {
  format:'REGINA_TO_FARM_V1',version:1,source:'REGINA Calcio',
  exportedAt:new Date().toISOString(),
  fronts:fronts.filter(f=>f?.id&&f.title).map(f=>({
   id:uid(f.id),title:words(f.title),projectId:uid(f.reginaLongTermGoalId),theme:projectCategory.get(f.reginaLongTermGoalId)||inferTheme(f),
   deadline:date(f.deadline||f.reginaTimeframe?.end),notes:words(f.notes,500)
  })),
  tasks:tasks.filter(t=>t?.id&&t.title&&!t.isGenerated).map(t=>({
   id:uid(t.id),frontId:uid(t.frontId),title:words(t.title),notes:words(t.notes,500),theme:getTheme(t),
   date:date(t.due),deadline:date(t.deadlineDate||t.reginaTimeframe?.end),
   time:String(t.due||'').split('T')[1]?.slice(0,5)||'',
   status:['done','partial','ongoing','failed'].includes(t.status)?t.status:'todo',
   progress: t.status==='done'?100:Math.max(0,Math.min(100,Math.round((Number(t.progressFraction)||0)*100))),
   difficulty:Math.max(1,Math.min(5,Math.round(Number(t.reginaDifficulty)||3))),
   repeat:words(t.repeat||'none',24),
   projectId:uid(t.reginaLongTermGoalId),stepId:uid(t.reginaLongTermStepId)
  })),
  projects:projects.filter(p=>p?.id&&p.title).map(p=>({
   id:uid(p.id),title:words(p.title),description:words(p.description,600),
   theme:label[p.category]?p.category:'other',deadline:date(p.targetDate||p.timeframe?.end),
   steps:(p.steps||[]).filter(s=>s?.id&&s.title).map(s=>{
     const linked=tasks.find(t=>t.reginaLongTermStepId===s.id||(s.taskId&&t.id===s.taskId));
     return {id:uid(s.id),title:words(linked?.title||s.title),
       date:date(linked?.due||s.date),deadline:date(linked?.deadlineDate||linked?.reginaTimeframe?.end||s.timeframe?.end),
       done:linked?linked.status==='done':(typeof s.done==='boolean'?s.done:Number(s.pct)>=100),
       taskId:uid(linked?.id||s.taskId)};
   })
  })),
  shopping:(st?.reginaDailyExtras?.shopping||[]).filter(x=>x?.title).map(x=>({
    id:uid(x.id||x.title),title:words(x.title),done:!!x.done,
    priority:['urgent','ideal','low'].includes(x.priority)?x.priority:''
  }))
 };
}
function download(data){
 const blob=new Blob([JSON.stringify(data,null,2)],{type:'application/json'});
 const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;
 a.download='REGINA_PER_HNINN_'+new Date().toISOString().slice(0,10)+'.json';
 document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),3000);
}
function chooseProjects(data, selectedIds) {
 // Elimina i traguardi non scelti, anche se le loro tappe sono
 // presenti nella categoria generale «Obiettivi e tappe».
 const allProjects=data.projects;
 const excluded=new Set(allProjects.filter(p=>!selectedIds.has(p.id)).map(p=>p.id));
 const excludedSteps=new Set(allProjects.filter(p=>excluded.has(p.id))
   .flatMap(p=>p.steps||[]).map(s=>s.id));
 const excludedTasks=new Set(allProjects.filter(p=>excluded.has(p.id))
   .flatMap(p=>p.steps||[]).map(s=>s.taskId).filter(Boolean));
 data.projects=allProjects.filter(p=>selectedIds.has(p.id));
 data.tasks=data.tasks.filter(t=>!excluded.has(t.projectId)&&
   !excludedSteps.has(t.stepId)&&!excludedTasks.has(t.id));
 data.fronts=data.fronts.filter(f=>!excluded.has(f.projectId));
 return data;
}
function openModal(){
 document.getElementById('rf-export-backdrop')?.remove();
 const obj=pack();
 const box=document.createElement('div');box.id='rf-export-backdrop';
 const projectRows=obj.projects.map(p=>
   `<label class="rf-project-item"><input type="checkbox" name="projectId" value="${esc(p.id)}">`+
   `<span><b>${esc(p.title)}</b><small>${esc(label[p.theme]||'Altro')} · ${(p.steps||[]).length} tappe</small></span></label>`
 ).join('');
 box.innerHTML='<form id="rf-export-form" role="dialog" aria-modal="true" aria-label="Condividi con Hninn">'+
  '<h2>📤 Trasferisci a Farm & Table</h2>'+
  '<p>Scegli esattamente quali traguardi condividere con Hninn. Le tappe dei traguardi esclusi non saranno trasferite.</p>'+
  `<label><input type="checkbox" name="projects" checked> <b>Grandi obiettivi / Traguardi (${obj.projects.length})</b></label>`+
  '<div id="rf-project-choices"><div class="rf-choose-buttons"><button type="button" data-rf-select="all">Seleziona tutti</button><button type="button" data-rf-select="none">Deseleziona tutti</button></div>'+
  (projectRows||'<p class="rf-warning">Non ci sono ancora traguardi da condividere.</p>')+'</div>'+
  `<label><input type="checkbox" name="tasks" checked> Obiettivi ordinari e tappe dei traguardi scelti (${obj.tasks.length} attività)</label>`+
  `<label><input type="checkbox" name="shopping" checked> Lista della spesa (${obj.shopping.length} elementi)</label>`+
  '<p class="rf-warning">Il file contiene i titoli e le note degli elementi selezionati. Non include finanze, risultati delle partite o rosa.</p>'+
  '<div class="rf-btns"><button type="submit">⬇ Esporta per Hninn</button><button type="button" data-rf-close>Chiudi</button></div></form>';
 document.body.appendChild(box);
 const f=box.querySelector('form');
 const items=()=>[...f.querySelectorAll('input[name="projectId"]')];
 function refresh(){
  const enabled=f.elements.projects.checked;
  box.querySelector('#rf-project-choices').hidden=!enabled;
  items().forEach(i=>i.disabled=!enabled);
 }
 f.elements.projects.addEventListener('change',refresh);
 f.querySelectorAll('[data-rf-select]').forEach(btn=>btn.addEventListener('click',()=>{
  items().forEach(i=>i.checked=btn.dataset.rfSelect==='all');
 }));
 refresh();
 box.addEventListener('click',e=>{if(e.target===box||e.target.closest('[data-rf-close]'))box.remove()});
 f.addEventListener('submit',e=>{
  e.preventDefault();
  const selected=new Set(f.elements.projects.checked?items().filter(i=>i.checked).map(i=>i.value):[]);
  const shareProjects=f.elements.projects.checked&&selected.size>0;
  if(!shareProjects&&!f.elements.tasks.checked&&!f.elements.shopping.checked){
   alert('Seleziona almeno un traguardo, gli obiettivi ordinari oppure la spesa.');return;
  }
  const data=chooseProjects(pack(),selected);
  if(!f.elements.tasks.checked){data.tasks=[];data.fronts=[];}
  if(!f.elements.shopping.checked)data.shopping=[];
  // Escludi i traguardi se l'intera categoria è stata disattivata.
  if(!f.elements.projects.checked)data.projects=[];
  download(data);box.remove();
 });
}

window.reginaShareToHninn={open:openModal,prepare:pack};
const oldHeader=header;
header=function(...args){
 const html=oldHeader.apply(this,args);
 if(html.includes('reginaShareToHninn.open()'))return html;
 const btn='<button type="button" onclick="reginaShareToHninn.open()" title="Esporta obiettivi e spesa per Farm & Table">📤 Hninn</button>';
 return html.includes('</nav>')?html.replace('</nav>',btn+'</nav>'):html+btn;
};
const css=document.createElement('style');css.textContent=`
#rf-export-backdrop{position:fixed;inset:0;background:#0b231caa;z-index:999999;display:flex;align-items:center;justify-content:center;padding:15px;color:#2a4437}
#rf-export-form{background:#fff;box-shadow:0 17px 50px #0004;width:min(500px,100%);border-radius:16px;padding:24px;display:grid;gap:12px;font-size:14px}
#rf-export-form h2{margin:0;color:#15513b}#rf-export-form p{margin:0;line-height:1.5}
#rf-export-form label{display:flex;align-items:center;gap:9px;border-radius:9px;background:#f4f9f5;padding:10px}
#rf-export-form label input{width:18px;height:18px;flex:0 0 18px}#rf-export-form .rf-warning{font-size:12px;color:#865831}
#rf-export-form .rf-btns{display:flex;gap:9px;flex-wrap:wrap}#rf-export-form button{border:0;border-radius:9px;background:#166445;color:#fff;padding:11px 13px;font-weight:800}
#rf-export-form button[data-rf-close]{background:#e9eee9;color:#23473b}
#rf-export-form{max-height:calc(100dvh - 30px);overflow-y:auto}
#rf-project-choices{display:grid;gap:7px;max-height:40vh;overflow-y:auto;padding:3px 2px}
#rf-project-choices[hidden]{display:none}
#rf-project-choices .rf-project-item{background:#f0f8f4;border:1px solid #ddebe3;align-items:flex-start}
#rf-project-choices .rf-project-item span{display:grid;gap:3px;min-width:0;overflow-wrap:anywhere}
#rf-project-choices .rf-project-item small{color:#60766b}
#rf-export-form .rf-choose-buttons{display:flex;gap:8px;position:sticky;top:0;background:white;padding:4px 0}
#rf-export-form .rf-choose-buttons button{padding:7px 10px;background:#e9eee9;color:#23473b;font-size:12px}`;
document.head.appendChild(css);
})();
