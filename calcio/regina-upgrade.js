/* REGINA CALCIO - addon 0.9.2: categorie neutre al massimo, pagelle, fronti espandibili e finanze settoriali.
   Funziona con l'app attuale senza sovrascrivere REGINA città. */
(function(){
'use strict';
const FK='regina-calcio-finance-v1', GK='regina-calcio-goals-v1';
const E=x=>String(x??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const euro=n=>Number(n||0).toLocaleString('it-IT',{style:'currency',currency:'EUR'});
const cents=n=>Math.round(Number(n||0)*100)/100;
const uid=()=>('f-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,9));
const CAT=['Alimentari','Casa','Bollette','Trasporti','Viaggi','Salute','Formazione','Svago','Lavoro','Altro'];
const INVEST=[['training','Centro d’allenamento',3,'+0,15 forma per livello'],['medical','Staff medico',3,'+0,08 forma e recupero infortuni'],['facilities','Strutture societarie',4,'+0,12 morale per livello'],['fans','Rapporti con i tifosi',2,'Investimento di reputazione']];
const empty=()=>({version:1,enabled:false,accounts:[],transactions:[],baseline:null,sensitivity:'media',purchases:[]});
let f=null;
function previousStartingBalance(a,finance){
 const names=(finance.accounts||[]).filter(x=>x.name===a.name);
 if(names.length!==1)return cents(a.balance);
 let initial=Number(a.balance)||0;
 for(const t of finance.transactions||[]){
  const amt=Number(t.amount)||0;
  if(!Number.isFinite(amt))continue;
  if(t.accountName===a.name){
   if(t.type==='income'||t.type==='reconcile')initial-=amt;
   if(t.type==='expense'||t.type==='transfer')initial+=amt;
  }
  if(t.type==='transfer'&&t.toName===a.name)initial-=amt;
 }
 return cents(initial);
}
function load(){if(f)return f;try{let x=JSON.parse(localStorage.getItem(FK)||'null');if(x&&Array.isArray(x.accounts)&&Array.isArray(x.transactions)){f=x;f.purchases=f.purchases||[];for(const a of f.accounts){if(!Object.prototype.hasOwnProperty.call(a,'baseline')||!Number.isFinite(Number(a.baseline)))a.baseline=previousStartingBalance(a,f);if(!Array.isArray(a.sectors))a.sectors=[];}return f}}catch(e){}return f=empty()}
function save(){try{localStorage.setItem(FK,JSON.stringify(load()))}catch(e){alert('Impossibile salvare i dati finanziari sul dispositivo.');return false}return true}
function total(){return cents(load().accounts.reduce((s,a)=>s+Number(a.balance||0),0))}
function outcomes(){return (st?.results||[]).filter(r=>r?.match&&(r.match.a===st.club||r.match.b===st.club)).slice().sort((a,b)=>String(b.day||'').localeCompare(String(a.day||''))).map(r=>{let m=r.match,n=m.a===st.club?m.ga-m.gb:m.gb-m.ga;return n>0?'W':n<0?'L':'D'})}
function budget(){let hist=outcomes(),w=hist.filter(x=>x==='W').length,d=hist.filter(x=>x==='D').length,spent=load().purchases.reduce((s,x)=>s+Number(x.cost||0),0),delta=0;
 if(load().enabled&&load().baseline!==null&&load().accounts.length){let change=total()-load().baseline,s=({bassa:.6,media:1,alta:1.45})[load().sensitivity]||1;delta=Math.sign(change)*Math.min(8,Math.sqrt(Math.abs(change)/200)*1.15*s)}
 return Math.max(0,cents(10+w*.6+d*.2+delta-spent));}
function jsonFile(doc,name){let url=URL.createObjectURL(new Blob([JSON.stringify(doc,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1500)}
function accountAdd(e){e.preventDefault();let el=e.target,name=el.elements.accName.value.trim(),balance=Number(el.elements.accBalance.value);if(!name||!Number.isFinite(balance))return alert('Nome e saldo numerico obbligatori.');load().accounts.push({id:uid(),name,balance:cents(balance),baseline:cents(balance),sectors:[]});if(load().enabled&&load().baseline!==null)load().baseline=cents(load().baseline+balance);if(save())render()}
function accountDelete(id){let a=load().accounts.find(x=>x.id===id);if(!a||!confirm('Eliminare il conto '+a.name+'? I movimenti già registrati rimarranno nello storico.'))return;load().accounts=load().accounts.filter(x=>x.id!==id);if(load().enabled&&load().baseline!==null)load().baseline=cents(load().baseline-a.balance);save();render()}
function accountUpdate(id){let a=load().accounts.find(x=>x.id===id);if(!a)return;let v=prompt('Nuovo saldo per '+a.name+' (€)',String(a.balance));if(v===null)return;v=Number(v.replace(',','.'));if(!Number.isFinite(v))return alert('Saldo non valido');let diff=cents(v-a.balance);a.balance=cents(v);if(diff)load().transactions.unshift({id:uid(),date:new Date().toISOString(),type:'reconcile',accountName:a.name,amount:diff,category:'Rettifica saldo'});save();render()}
function record(e){e.preventDefault();let el=e.target,v=el.elements,typ=v.opType.value,acc=load().accounts.find(a=>a.id===v.from.value),dest=load().accounts.find(a=>a.id===v.to.value),amount=cents(Number(v.amount.value));if(!acc||!(amount>0)||!Number.isFinite(amount))return alert('Conto e importo positivo obbligatori.');if(typ==='transfer'&&(!dest||dest.id===acc.id))return alert('Scegli due conti diversi per il giroconto.');
 if(typ==='expense'&&acc.balance<amount&&!confirm('Il saldo diventerebbe negativo. Continuare?'))return;
 if(typ==='income')acc.balance=cents(acc.balance+amount);if(typ==='expense')acc.balance=cents(acc.balance-amount);if(typ==='transfer'){acc.balance=cents(acc.balance-amount);dest.balance=cents(dest.balance+amount)}
 load().transactions.unshift({id:uid(),date:new Date().toISOString(),type:typ,accountName:acc.name,toName:typ==='transfer'?dest.name:'',amount,category:typ==='transfer'?'Giroconto':v.category.value,note:v.note.value.trim().slice(0,180)});save();render()}
function link(on){if(on&&!load().accounts.length)return alert('Aggiungi almeno un conto.');if(on&&!load().enabled)load().baseline=total();load().enabled=!!on;save();render()}
function sensitive(v){load().sensitivity=v;save();render()}
function invest(id){let x=INVEST.find(x=>x[0]===id),levels=load().purchases.filter(p=>p.id===id).length;if(!x||levels>=3||budget()<x[2])return alert('Livello massimo o crediti operativi insufficienti.');if(!confirm('Spendere '+x[2]+' crediti virtuali per '+x[1]+'? Nessun addebito reale.'))return;load().purchases.push({id,cost:x[2],date:new Date().toISOString()});save();render()}
function getMonth(){let now=new Date().toISOString().slice(0,7),inc=0,exp=0;load().transactions.forEach(t=>{if(t.date?.slice(0,7)!==now)return;if(t.type==='income')inc+=t.amount;if(t.type==='expense')exp+=t.amount});return {inc:cents(inc),exp:cents(exp)}}
function graph(){let now=new Date(),m=[];for(let i=5;i>=0;i--){let d=new Date(now.getFullYear(),now.getMonth()-i,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),inc=0,exp=0;load().transactions.forEach(t=>{if(t.date?.slice(0,7)===key){if(t.type==='income')inc+=t.amount;if(t.type==='expense')exp+=t.amount}});m.push({key,inc,exp})}let max=Math.max(1,...m.flatMap(x=>[x.inc,x.exp]));return '<div class="fin-chart">'+m.map(x=>'<div><span class="fin-pair"><i style="height:'+Math.round(x.inc/max*90)+'px;background:#368f80"></i><i style="height:'+Math.round(x.exp/max*90)+'px;background:#d36f6f"></i></span><small>'+E(x.key.slice(5))+'</small></div>').join('')+'</div><p class="muted tiny">Entrate in verde e uscite in rosso, ultimi sei mesi. Giroconti esclusi.</p>'}
function financeView(){let s=load(),mo=getMonth(),a=s.accounts.map(x=>'<tr><td>'+E(x.name)+'</td><td>'+euro(x.balance)+'</td><td><button class="btn alt tiny" onclick="reginaFin.update(\''+x.id+'\')">Saldo</button> <button class="btn alt tiny" onclick="reginaFin.remove(\''+x.id+'\')">✕</button></td></tr>').join(''),op=s.accounts.map(x=>'<option value="'+x.id+'">'+E(x.name)+'</option>').join(''),log=s.transactions.slice(0,50).map(x=>'<tr><td>'+E(x.date?.slice(0,10))+'</td><td>'+E(({income:'Entrata',expense:'Uscita',transfer:'Giroconto',reconcile:'Rettifica'})[x.type])+'</td><td>'+E(x.accountName)+(x.toName?' → '+E(x.toName):'')+'</td><td>'+E(x.category||'')+'</td><td>'+euro(x.type==='expense'?-x.amount:x.amount)+'</td></tr>').join(''),buys=INVEST.map(x=>{let lvl=s.purchases.filter(p=>p.id===x[0]).length;return '<div class="fin-invest"><strong>'+E(x[1])+'</strong><small>Livello '+lvl+'/3 · '+x[2]+' crediti</small><p class="muted tiny">'+E(x[3])+'</p><button class="btn alt" '+(lvl>=3||budget()<x[2]?'disabled':'')+' onclick="reginaFin.invest(\''+x[0]+'\')">Investi</button></div>'}).join('');
 return '<section class="card"><h2>💶 Finanze e gestione societaria</h2><p class="notice">I dati sono inseriti manualmente e salvati solo nel browser. NON inserire IBAN o credenziali. La modalità finanziaria è facoltativa, i soldi reali non vengono mai spesi dal gioco.</p>'+ 
 '<p><label><input type="checkbox" '+(s.enabled?'checked':'')+' onchange="reginaFin.link(this.checked)"> Collega il budget della società alle variazioni del saldo personale</label></p><label class="label">Sensibilità <select onchange="reginaFin.sensitive(this.value)">'+['bassa','media','alta'].map(x=>'<option '+(s.sensitivity===x?'selected':'')+'>'+x+'</option>').join('')+'</select></label>'+ 
 '<div class="fin-summary">'+[['Saldi complessivi',euro(total())],['Entrate del mese',euro(mo.inc)],['Uscite del mese',euro(mo.exp)],['Budget operativo',budget().toFixed(2)+' cr.'],['Budget trasferimenti',Number(st.budget||0).toFixed(2)+' cr.']].map(p=>'<div><small>'+p[0]+'</small><strong>'+p[1]+'</strong></div>').join('')+'</div>'+ 
 '<p class="tiny muted">Il budget operativo parte da 10 crediti, cresce leggermente con i risultati e, solo se attivato, segue i cambiamenti del patrimonio finanziario rispetto al momento dell’attivazione. I crediti operativi e quelli dei trasferimenti sono separati. Non ridurre spese necessarie per ottenere vantaggi virtuali.</p>'+ 
 '<h3>Conti</h3><div class="tablewrap"><table class="table"><thead><tr><th>Conto</th><th>Saldo</th><th></th></tr></thead><tbody>'+(a||'<tr><td colspan="3">Nessun conto</td></tr>')+'</tbody></table></div>'+ 
 '<form class="fin-grid" onsubmit="reginaFin.add(event)"><label>Nome conto<input name="accName" maxlength="60" required placeholder="Conto corrente"></label><label>Saldo in euro<input name="accBalance" type="number" step="0.01" required></label><button class="btn">+ Aggiungi conto</button></form>'+ 
 '<h3>Entrate, spese e giroconti</h3><form class="fin-grid" onsubmit="reginaFin.record(event)"><label>Tipo <select name="opType"><option value="expense">Spesa</option><option value="income">Entrata</option><option value="transfer">Giroconto</option></select></label><label>Conto <select name="from">'+op+'</select></label><label>Conto destinazione (giroconti) <select name="to"><option value="">—</option>'+op+'</select></label><label>Importo €<input name="amount" type="number" min="0.01" step="0.01" required></label><label>Categoria <select name="category">'+CAT.map(x=>'<option>'+E(x)+'</option>').join('')+'</select></label><label>Nota<input name="note" maxlength="180"></label><button class="btn" '+(!s.accounts.length?'disabled':'')+'>Registra</button></form>'+ 
 '<h3>Andamento degli ultimi sei mesi</h3>'+graph()+'<p><strong>Saldo registrato del mese: '+euro(mo.inc-mo.exp)+'</strong></p>'+ 
 '<h3>Investimenti societari (virtuali)</h3><div class="fin-invest-grid">'+buys+'</div>'+ 
 '<h3>Ultimi movimenti</h3><div class="tablewrap"><table class="table"><thead><tr><th>Data</th><th>Tipo</th><th>Conto</th><th>Categoria</th><th>Importo</th></tr></thead><tbody>'+(log||'<tr><td colspan="5">Nessun movimento</td></tr>')+'</tbody></table></div>'+ 
 '<p><button class="btn alt" onclick="reginaFin.export()">Esporta un backup finanziario JSON</button></p></section>';
}
window.reginaFin={add:accountAdd,remove:accountDelete,update:accountUpdate,record,link,sensitive,invest,export:()=>jsonFile(load(),'REGINA_FINANZE_'+TODAY()+'.json')};
let style=document.createElement('style');style.textContent='.fin-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:10px;background:#edf4f6;padding:12px;border-radius:10px;margin:12px 0}.fin-grid label{display:grid;gap:5px;font-size:13px}.fin-grid input,.fin-grid select{width:100%;padding:9px;border:1px solid #bdd1da;border-radius:8px}.fin-summary{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:9px;margin:15px 0}.fin-summary>div{background:#eaf4f1;border-radius:10px;padding:12px}.fin-summary small{display:block}.fin-summary strong{font-size:19px;word-break:break-word}.fin-invest-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:10px}.fin-invest{border:1px solid #c8d6de;border-radius:10px;padding:12px}.fin-invest small{display:block}.fin-chart{display:flex;align-items:flex-end;height:120px;gap:8px;border-bottom:1px solid #aac}.fin-chart>div{flex:1;text-align:center}.fin-pair{height:90px;display:flex;align-items:flex-end;justify-content:center;gap:3px}.fin-pair i{display:inline-block;width:20%;min-width:6px;max-width:25px;border-radius:3px 3px 0 0}';document.head.appendChild(style);
const oldHeader=header;header=function(){return oldHeader().replace('</nav>','<button class="'+(view==='finances'?'active':'')+'" onclick="changeView(\'finances\')">💶 Finanze</button></nav>')};
const oldRender=render;render=function(){if(st&&view==='finances'){let root=document.getElementById('root');if(root)root.innerHTML=header()+financeView();return}oldRender()};
const oldSettings=settingsView;settingsView=function(){return oldSettings()+'<section class="card"><h3>🗞️ Nomi della Gazzetta</h3><p class="muted">Le dichiarazioni appartengono al campionato simulato.</p><label class="label">Nome allenatore<input id="regCoach" value="'+E(st.coachName||'')+'" maxlength="80" placeholder="Nome e cognome"></label><label class="label">Nome presidente (facoltativo)<input id="regPresident" value="'+E(st.presidentName||'')+'" maxlength="80"></label><button class="btn alt" onclick="reginaFin.names()">Salva i nomi</button></section>'};
window.reginaFin.names=function(){st.coachName=document.getElementById('regCoach')?.value.trim().slice(0,80)||'';st.presidentName=document.getElementById('regPresident')?.value.trim().slice(0,80)||'';persist();render();alert('Nomi salvati')};
// Effetti effettivi e limitati degli investimenti; la tecnica stabile dei giocatori non cambia.
const oldMetrics=taskMetrics;taskMetrics=function(){let m=oldMetrics(),ps=load().purchases,n=id=>ps.filter(x=>x.id===id).length;m.fitness=Math.min(10,(m.fitness||0)+.15*n('training')+.08*n('medical'));m.mental=Math.min(10,(m.mental||0)+.12*n('facilities'));return m};
if(typeof fitnessUpdate==='function'){const oldFit=fitnessUpdate;fitnessUpdate=function(){oldFit();if(st&&load().purchases.some(x=>x.id==='medical')&&st.game%5===4){let a=(st.squad?.[st.club]||[]).filter(p=>Number(p.injured)>0);if(a.length){a.sort((x,y)=>y.injured-x.injured);a[0].injured=Math.max(0,a[0].injured-1)}}}}
function streak(a,kind){let n=0;for(const x of a){if(kind==='U'?x!=='L':kind==='N'?x!=='W':x===kind)n++;else break}return n}
function short(s){let parts=String(s||'').trim().split(/\s+/).filter(Boolean);if(!parts.length)return '';let pre=(parts.at(-2)||'').toLowerCase();return /^(de|di|da|del|della|van|von|al|el|la|le|dos|do|du)$/.test(pre)?parts.slice(-2).join(' '):parts.at(-1)}
const oldArticle=article;article=function(m,met){let rep=oldArticle(m,met);if(!rep||!m||!st)return rep;let n=m.a===st.club?m.ga-m.gb:m.gb-m.ga,kind=n>0?'W':n<0?'L':'D',prev=outcomes(),all=[kind,...prev],wins=streak(all,'W'),loss=streak(all,'L'),draw=streak(all,'D'),unbeaten=streak(all,'U'),winless=streak(all,'N'),name=(teamById(st.club)?.name||'SQUADRA').toLocaleUpperCase('it-IT'),coach=st.coachName?.trim()||'',pres=st.presidentName?.trim()||'',cName=coach?short(coach).toLocaleUpperCase('it-IT'):'IL TECNICO',pName=pres?short(pres).toLocaleUpperCase('it-IT'):'LA PRESIDENZA';
 let ev=m.events||[],goals=ev.filter(x=>x.type==='gol'&&x.side===st.club),scorers={};goals.forEach(x=>{let k=short(x.name);if(k)scorers[k]=(scorers[k]||0)+1});let star=Object.entries(scorers).sort((a,b)=>b[1]-a[1])[0],red=ev.find(x=>x.type==='rosso'&&x.side===st.club),miss=ev.find(x=>x.type==='rigore_sbagliato'&&x.side===st.club),choices=[],add=(score,text,tag)=>choices.push({score,text,tag});
 let rated=(st.squad?.[st.club]||[]).map(p=>({p,grade:Number(m.grades?.[p.id])})).filter(x=>Number.isFinite(x.grade)&&x.grade>0).sort((a,b)=>a.grade-b.grade),flop=rated[0],top=rated.at(-1);
 if(wins>=2){add(7,name+', '+wins+' VITTORIE DI FILA!','serie');add(7,'NON SI FERMA PIÙ '+name+'! '+wins+' SUCCESSI CONSECUTIVI','serie')}if(loss>=2){add(7,name+', '+loss+' SCONFITTE CONSECUTIVE: È CRISI','serie');add(7,'ALLARME '+name+'! '+loss+' KO DI FILA','serie')}if(draw>=2)add(7,name+', '+draw+' PAREGGI DI FILA: SERVE UNA SVOLTA','serie');if(unbeaten>=4&&kind==='D')add(7,name+', '+unbeaten+' RISULTATI UTILI CONSECUTIVI!','serie');if(winless>=3)add(7,name+', '+winless+' GARE SENZA VINCERE!','serie');
 if(kind==='W'&&streak(prev,'L')>=2)add(10,name+', RISCATTO DOPO '+streak(prev,'L')+' SCONFITTE!','riscatto');if(kind==='L'&&streak(prev,'W')>=3)add(10,name+', STOP DOPO '+streak(prev,'W')+' VITTORIE!','stop');if(kind==='L'&&streak(prev,'U')>=4)add(10,name+', FINITA LA SERIE DI '+streak(prev,'U')+' RISULTATI UTILI!','stop');
 if(star&&kind==='W')add(star[1]>=2?10:6,star[0].toLocaleUpperCase('it-IT')+' FA LA DIFFERENZA! '+name+' FESTEGGIA','giocatore');if(top?.grade>=8&&kind==='W')add(7,short(top.p.name).toLocaleUpperCase('it-IT')+' DA APPLAUSI! '+name+' VOLA','pagelle');if(flop?.grade<=4.5&&kind==='L')add(7,short(flop.p.name).toLocaleUpperCase('it-IT')+', SERATA DA DIMENTICARE! '+name+' CROLLA','pagelle');if(miss&&kind==='L')add(10,short(miss.name).toLocaleUpperCase('it-IT')+', RIGORE FATALE! '+name+' KO','giocatore');if(red&&kind==='L')add(10,'ESPULSO '+short(red.name).toLocaleUpperCase('it-IT')+'! '+name+' PAGA IL ROSSO','giocatore');
 if(coach)add(5,cName+(kind==='W'?', CHE IMPRESA!':kind==='L'?', PIOVONO CRITICHE!':', CERCASI VITTORIA!'),'allenatore');if(loss>=3)add(9,'TIFOSI IN RIVOLTA! '+name+' TRA FISCHI E PROTESTE','tifosi');if(loss>=4)add(10,'VERTICE SOCIETARIO D’URGENZA! '+pName+' SOTTO PRESSIONE','società');if(loss>=5)add(10,name+', TERREMOTO IN SOCIETÀ! SI VALUTANO CAMBIAMENTI','società');if(wins>=4)add(8,'TIFOSI IN DELIRIO! '+name+' NON SI FERMA','tifosi');
 if(load().enabled&&load().baseline!==null){let diff=total()-load().baseline;if(diff< -300)add(4,name+', CONTI IN DIFFICOLTÀ: LA SOCIETÀ TREMA','finanze');if(diff>300)add(3,name+', BILANCIO IN RIPRESA: SI GUARDA AL FUTURO','finanze')}
 if(n>=3)add(5,name+', CHE VALANGA! TRE PUNTI PESANTISSIMI','partita');if(n<=-3)add(5,name+', CHE DISASTRO! LE CRITICHE SI MOLTIPLICANO','partita');add(1,name+(n>0?', VITTORIA DA URLO!':n<0?', CHE BATOSTA!':', UN PUNTO E MILLE RIMPIANTI!'),'partita');
 let max=Math.max(...choices.map(x=>x.score)),picks=choices.filter(x=>x.score>=max-2).sort((a,b)=>a.text.localeCompare(b.text)),past=(st.results||[]).slice(0,5).map(x=>x.article?.title||''),chosen=picks[((st.results||[]).length+m.ga*3+m.gb*7)%picks.length];if(past.includes(chosen.text))chosen=picks.find(x=>!past.includes(x.text))||chosen;
 rep.title=typeof pressHeadlineWithoutArticles==='function'?pressHeadlineWithoutArticles(chosen.text):chosen.text;
 let extra=[];if(wins>=3)extra.push('La squadra festeggia la '+wins+'ª vittoria consecutiva.');if(loss>=3)extra.push('Le '+loss+' sconfitte di fila alimentano la protesta dei tifosi.');if(kind==='W'&&streak(prev,'L')>=2)extra.push('Il successo interrompe '+streak(prev,'L')+' sconfitte consecutive.');if(kind==='L'&&streak(prev,'W')>=3)extra.push('La battuta d’arresto chiude una serie di '+streak(prev,'W')+' vittorie.');if(kind==='L'&&streak(prev,'U')>=4)extra.push('Termina una striscia di '+streak(prev,'U')+' partite senza perdere.');if(star){extra.push(star[0]+' segna '+star[1]+' '+(star[1]===1?'rete':'reti')+' e attira gli sguardi.');extra.push('DALLO SPOGLIATOIO — '+star[0]+': «L’importante è il risultato della squadra, ora pensiamo alla prossima gara».')}if(flop?.grade<=4.5&&kind==='L')extra.push('DALLO SPOGLIATOIO — '+short(flop.p.name)+': «Sono deluso dalla mia prestazione e voglio riscattarmi».');if(red)extra.push('L’espulsione di '+short(red.name)+' fa discutere.');if(miss)extra.push('Il rigore sbagliato da '+short(miss.name)+' pesa nel dopopartita.');
 if(coach)extra.push('DALLO SPOGLIATOIO — '+coach+': '+(kind==='W'?'«Il gruppo ha meritato, ora serve continuità».':kind==='L'?'«Sappiamo di dover cambiare passo».':'«Un punto non ci basta, vogliamo crescere».'));if(pres&&loss>=3)extra.push('LA PRESIDENZA — '+pres+': «La società sta valutando come reagire».');if(extra.length)rep.body=String(rep.body||'')+'\n\n'+extra.join(' ');rep.headlineReason=chosen.tag;return rep;
};window.article=article;
// Il backup completo contiene anche le finanze, ma resta SEMPRE sul telefono, mai su GitHub.
const oldExport=exportData;exportData=function(){if(!st)return oldExport();let g=null;try{g=JSON.parse(localStorage.getItem(GK)||'null')}catch(e){}jsonFile({kind:'REGINA_CALCIO_BACKUP_V3',football:st,goals:g,finance:load(),exportedAt:new Date().toISOString()},'REGINA_CALCIO_COMPLETO_'+TODAY()+'.json')};
const oldRestore=restoreFootball;restoreFootball=function(ev){let file=ev?.target?.files?.[0];if(!file)return;file.text().then(raw=>{let doc=JSON.parse(raw);if(doc.kind!=='REGINA_CALCIO_BACKUP_V3')return oldRestore(ev);if(!doc.football?.club||!doc.goals?.tasks||!doc.goals?.fronts)throw Error('Backup incompleto');if(!confirm('Ripristinare carriera, obiettivi e finanze? I dati attuali verranno sostituiti.'))return;st=doc.football;persist();localStorage.setItem(GK,JSON.stringify(doc.goals));f=doc.finance?.accounts?doc.finance:empty();save();location.reload()}).catch(e=>alert('Ripristino non riuscito: '+e.message))};
// Motore correttivo indipendente per le occorrenze: una sola vera tappa per giorno.
// Non modifica i dati originali, e distingue i progressi delle diverse date.
function goalStamp(x){return String(x||'').slice(0,10)}
function goalGroup(x){return x.repeatGroup||x.id}
function goalWeight(x){return x?.status==='done'?4:x?.status==='partial'?3:x?.isGenerated?2:1}
function goalListForDay(day){
 let g=tasks();if(!g?.tasks)return [];
 let out=[],groups=new Map();
 for(const t of g.tasks){
  if(!t?.title||t.archived)continue;
  if(t.repeat&&t.repeat!=='none'){
   let group=goalGroup(t),x=groups.get(group)||[];x.push(t);groups.set(group,x);
  }else{
   let due=goalStamp(t.due||t.deadlineDate);
   if(due===day||t.footballCreditDay===day||(t.carrySince&&due&&due<day&&!['done','failed'].includes(t.status)&&day<=TODAY()))out.push(t);
  }
 }
 for(const [group,series] of groups){
  let template=series.find(t=>!t.isGenerated)||series[0];
  if((template.skipDates||[]).includes(day))continue;
  let sameDay=series.filter(t=>goalStamp(t.occurrenceDate||t.due)===day);
  if(sameDay.length){sameDay.sort((a,b)=>goalWeight(b)-goalWeight(a));out.push(sameDay[0]);continue}
  // Ricorrenze generate soltanto nei giorni ammessi dall'impostazione originale.
  if(typeof matchRecurrence==='function'&&matchRecurrence(template,day)){
   out.push(Object.assign({},template,{id:'virtual:'+group+':'+day,virtual:true,repeatGroup:group,occurrenceDate:day,due:day,status:'todo',progressFraction:0,checks:[],actualValue:0}));
  }
 }
 return out;
}
readTaskOccurrences=function(day){
 return goalListForDay(day).map(t=>{
  let g=tasks(),front=(g?.fronts||[]).find(x=>x.id===t.frontId)||{};
  return Object.assign({},t,{frontTitle:front.title||'',category:typeof taskCategory==='function'?taskCategory(front.cat,t.title,front.id):t.cat,done:t.status==='done',fraction:t.status==='done'?1:Math.max(0,Math.min(1,Number(t.progressFraction)||0)),fromOriginal:true});
 });
};
function periodDays(date,mode){
 let first=date;
 if(mode==='week'){let wd=(new Date(date+'T12:00:00').getDay()+6)%7;first=PLUS(date,-wd)}
 if(mode==='month')first=date.slice(0,7)+'-01';
 let total=mode==='day'?1:mode==='week'?7:new Date(Number(date.slice(0,4)),Number(date.slice(5,7)),0).getDate();
 return Array.from({length:total},(_,i)=>PLUS(first,i));
}
function correctGoalRow(t,day,fronts){
 const progress=t.status==='done'?100:Math.round((Number(t.progressFraction)||0)*100),label=t.status==='done'?'Completata':progress?progress+'%':t.status==='failed'?'Mancata':'Da fare';
 const name=E((fronts||[]).find(f=>f.id===t.frontId)?.title||''),id=E(JSON.stringify(String(t.id)));
 const when=E(JSON.stringify(day)),next=t.status==='done'?'todo':'done';
 let mixed='';if(t.type==='mixed'&&Array.isArray(t.components)&&t.components.length){mixed='<div class="go-steps">'+t.components.map((x,i)=>'<label><input type="checkbox" '+((t.checks||[]).includes(i)?'checked':'')+' onchange="goalStepCheck('+id+','+i+')"> '+E(typeof x==='string'?x:(x.title||x.text||'Tappa'))+'</label>').join('')+'</div>'}
 return '<article class="go-task"><div class="go-line"><span class="go-tick">'+(t.status==='done'?'✓':t.status==='partial'?'◐':'○')+'</span><div style="flex:1"><strong>'+E(t.title)+'</strong> <small class="muted">'+E(label)+' · '+name+'</small>'+(t.notes?'<p class="tiny muted">'+E(t.notes)+'</p>':'')+mixed+'</div></div><div class="go-actions">'+
 '<button class="btn alt" onclick="goalStatus('+id+',\''+next+'\')">'+(t.status==='done'?'Riapri':'✓ Completa')+'</button>'+ 
 '<button class="btn alt" onclick="goalPartial('+id+')">◐ Parziale</button>'+ 
 '<button class="btn alt" onclick="goalOpenTask('+id+')">✎ Modifica</button>'+ 
 ((t.repeat&&t.repeat!=='none')?'<button class="btn alt" onclick="reginaGoals.day('+id+','+when+')">Salta oggi</button>':'')+'</div></article>';
}
// Mantiene gli stessi comandi dell'interfaccia, sostituendo soltanto i blocchi giornalieri errati.
const originalObjectives=objectivesView;
objectivesView=function(){
 let tpl=document.createElement('template');tpl.innerHTML=originalObjectives();
 const box=tpl.content.querySelector('.go-dashboard');if(!box)return tpl.innerHTML;
 let d=box.querySelector('input[type="date"]')?.value||TODAY();
 const mode=box.querySelector('.go-mode .btn:not(.alt)')?.textContent.trim().toLowerCase()||'giorno';
 const modeId=mode.includes('settimana')?'week':mode.includes('mese')?'month':'day';
 const sel=box.querySelector('select[onchange*="goalSetFront"]'),frontFilter=sel?.value||'all';
 const search=(box.querySelector('input[placeholder="Cerca..."]')?.value||'').toLocaleLowerCase('it');
 let g=tasks(),days=periodDays(d,modeId),parts=[];
 for(const date of days){
  let seen=new Set(),ls=goalListForDay(date).filter(x=>(frontFilter==='all'||x.frontId===frontFilter)&&(!search||(x.title+' '+(x.notes||'')).toLocaleLowerCase('it').includes(search))).filter(x=>{
   let key=String(x.frontId)+'|'+String(x.title).trim().toLocaleLowerCase('it');if(seen.has(key))return false;seen.add(key);return true;
  });
  if(!ls.length)continue;
  let title=new Date(date+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
  parts.push('<section class="go-day"><h3>📅 '+E(title)+' <small class="muted">'+ls.length+' tappe</small></h3>'+ls.map(x=>correctGoalRow(x,date,g?.fronts)).join('')+'</section>');
 }
 let dayNodes=[...box.querySelectorAll('.go-day')].filter(x=>x.querySelector('h3')?.textContent.trim().startsWith('📅'));
 let anchor=dayNodes[0]||[...box.querySelectorAll('.go-day')].find(x=>x.querySelector('h3')?.textContent.includes('Tappe senza data'));
 if(anchor){let wrapper=document.createElement('div');wrapper.innerHTML=parts.join('')||'<p class="muted">Nessuna tappa pianificata per questo periodo.</p>';anchor.before(...Array.from(wrapper.childNodes));}
 for(const n of dayNodes)n.remove();
 // Elimina anche il vecchio messaggio vuoto, se sostituito.
 for(const p of [...box.querySelectorAll('p.muted')])if(p.textContent.trim()==='Nessuna tappa pianificata per questo periodo.'&&parts.length)p.remove();
 let row=box.querySelector('.row');if(row){let b=document.createElement('button');b.className='btn alt';b.setAttribute('onclick','reginaGoals.clean()');b.textContent='Pulisci ricorrenze doppie';row.appendChild(b)}
 return tpl.innerHTML;
};
function tasks(){try{return JSON.parse(localStorage.getItem(GK)||'null')}catch(e){return null}}
function commitGoals(g){if(!g?.tasks)return;try{window.goalSaveImportedArchive(g);render()}catch(e){alert('Salvataggio obiettivi non riuscito: '+e.message)}}
function groupTask(g,id){let t=g.tasks.find(x=>x.id===id);if(t)return t;if(id.startsWith('virtual:')){let m=/^virtual:(.+):(\d{4}-\d{2}-\d{2})$/.exec(id);if(m)return g.tasks.find(x=>(x.repeatGroup||x.id)===m[1]);}return null}
function deleteOccurrence(id,day){let g=tasks(),t=g&&groupTask(g,id);if(!t)return;day=day||(id.match(/\d{4}-\d{2}-\d{2}$/)||[])[0]||(t.occurrenceDate||t.due||'').slice(0,10);if(!day)return alert('Non trovo la data dell’occorrenza.');if(!confirm('Saltare soltanto '+day+' per «'+t.title+'»?'))return;let group=t.repeatGroup||t.id,template=g.tasks.find(x=>(x.repeatGroup||x.id)===group&&!x.isGenerated)||t;template.skipDates=[...new Set([...(template.skipDates||[]),day])];g.tasks=g.tasks.filter(x=>!((x.repeatGroup||x.id)===group&&x.isGenerated&&(x.occurrenceDate||x.due||'').slice(0,10)===day));commitGoals(g);if(typeof goalCloseModal==='function')goalCloseModal()}
function deleteSeries(id){let g=tasks(),t=g&&groupTask(g,id);if(!t)return;let group=t.repeatGroup||t.id;if(!confirm('Eliminare tutta la ricorrenza «'+t.title+'» dalla sola REGINA Calcio?'))return;g.tasks=g.tasks.filter(x=>(x.repeatGroup||x.id)!==group);commitGoals(g);if(typeof goalCloseModal==='function')goalCloseModal()}
function cleanupDuplicates(){
 let g=tasks();if(!g||!Array.isArray(g.tasks))return;
 const master=new Map(),finger=t=>[t.frontId||'',String(t.title||'').trim().toLowerCase(),t.repeat||'',t.scheduleStart||'',(t.weekdays||[]).slice().sort().join(',')].join('|');
 const templates=g.tasks.filter(x=>x.title&&x.repeat&&x.repeat!=='none'&&!x.isGenerated);
 let duplicates=[];
 for(const t of templates){let k=finger(t);if(master.has(k)&&master.get(k)!==t.repeatGroup&&master.get(k)!==t.id)duplicates.push([t,master.get(k)]);else master.set(k,t.repeatGroup||t.id)}
 if(!duplicates.length)return alert('Non risultano ricorrenze duplicate con identiche impostazioni.');
 if(!confirm('Rilevate '+duplicates.length+' serie ricorrenti duplicate. Unificarle mantenendo il miglior stato di completamento registrato per ciascuna data?'))return;
 const groupAlias=new Map(duplicates.map(([t,id])=>[t.repeatGroup||t.id,id]));
 for(const t of g.tasks){let grp=t.repeatGroup||t.id;if(groupAlias.has(grp)){t.repeatGroup=groupAlias.get(grp);if(!t.isGenerated)t._mergedDuplicateMaster=true}}
 g.tasks=g.tasks.filter(t=>!t._mergedDuplicateMaster);
 const occurrences=new Map(),kept=[];
 for(const t of g.tasks){let group=t.repeatGroup||t.id,day=String(t.occurrenceDate||t.due||'').slice(0,10),key=(t.repeat&&t.repeat!=='none')?group+'|'+day:t.id;
 let previous=occurrences.get(key);
 if(!previous){occurrences.set(key,t);kept.push(t);continue}
 let p=t.status==='done'?3:t.status==='partial'?2:1,q=previous.status==='done'?3:previous.status==='partial'?2:1;
 if(p>q){previous.status=t.status;previous.progressFraction=t.progressFraction;previous.actualValue=t.actualValue;previous.checks=t.checks;previous.resolvedAt=t.resolvedAt}
 previous.skipDates=[...new Set([...(previous.skipDates||[]),...(t.skipDates||[])])];
 }
 g.tasks=kept;commitGoals(g);alert('Ricorrenze duplicate unificate.');
}
window.reginaGoals={day:deleteOccurrence,series:deleteSeries,clean:cleanupDuplicates};
const oldOpen=window.goalOpenTask;window.goalOpenTask=function(id,...rest){oldOpen(id,...rest);if(!id)return;let g=tasks(),t=g&&groupTask(g,id);if(!t||!t.repeat||t.repeat==='none')return;let form=document.getElementById('goal-task-form');if(!form)return;let row=form.querySelector('.row:last-child');if(!row)return;let el=document.createElement('div');el.className='row';el.innerHTML='<button type="button" class="btn alt" id="singleOccurrence">Salta questa giornata</button><button type="button" class="btn bad" id="entireSeries">Elimina tutta la ricorrenza</button>';row.before(el);el.querySelector('#singleOccurrence').onclick=()=>{let day=(id.match(/\d{4}-\d{2}-\d{2}$/)||[])[0]||(t.occurrenceDate||t.due||'').slice(0,10);deleteOccurrence(id,day)};el.querySelector('#entireSeries').onclick=()=>deleteSeries(id);let oldDel=Array.from(row.querySelectorAll('button')).find(b=>b.textContent.trim()==='Elimina');if(oldDel)oldDel.remove()};
// Per una tappa ricorrente il pulsante Elimina non deve più ricreare immediatamente un doppione.
const oldDelete=window.goalDeleteTask;window.goalDeleteTask=function(id){let g=tasks(),t=g&&groupTask(g,id);if(t?.repeat&&t.repeat!=='none')return deleteSeries(id);return oldDelete(id)};
const oldSettings2=settingsView;settingsView=function(){return oldSettings2()+'<section class="card"><h3>🔎 Ricorrenze e salvataggio</h3><p>La correzione nasconde i doppioni senza cancellare automaticamente tappe già completate. Per eliminare una ricorrenza usa «Modifica» e scegli «Salta questa giornata» oppure «Elimina tutta la ricorrenza».</p><p>I backup completi includono anche i saldi finanziari: non pubblicare il JSON su GitHub.</p></section>'};
// REGINA CALCIO 0.9.2 — Miglioramenti compatibili con i salvataggi preesistenti.
// Niente conti reali né numeri di conto su GitHub: tutti i dati restano nel browser.

// 1. Settori societari: ogni conto ha il suo riferimento iniziale IMMUTABILE.
const CLUB_SECTORS=[
 ['marketing','Marketing e comunicazione'],
 ['fields','Campi e strutture sportive'],
 ['trainers','Preparatori atletici'],
 ['doctors','Medici e fisioterapisti'],
 ['academy','Settore giovanile'],
 ['scouting','Osservatori e scouting'],
 ['operations','Amministrazione e organizzazione'],
 ['supporters','Tifoseria e relazioni pubbliche'],
 ['logistics','Logistica e trasferte'],
 ['security','Sicurezza e manutenzione']
];
const SECTOR_MAP=Object.fromEntries(CLUB_SECTORS);
const sectorBounds=(n,min=0,max=10)=>Math.max(min,Math.min(max,n));
function clubSectorStates(){
 const fs=load(),sectors=[];
 for(const [id,title] of CLUB_SECTORS){
  const selected=fs.accounts.filter(a=>(a.sectors||[]).includes(id));
  if(!selected.length)continue;
  const balance=cents(selected.reduce((n,a)=>n+(Number(a.balance)||0),0));
  const baseline=cents(selected.reduce((n,a)=>n+(Number(a.baseline)||0),0));
  const delta=cents(balance-baseline);
  // A 6 il saldo è pari al capitale iniziale; nessun azzeramento a ogni aggiornamento.
  // Si usa una scala morbida per non penalizzare eccessivamente piccoli saldi.
  const scale=Math.max(250,Math.abs(baseline)*.35);
  const health=Math.round(sectorBounds(6+4*Math.tanh(delta/scale))*10)/10;
  const label=health<4?'In difficoltà':health<5.5?'Sotto pressione':health<=6.5?'Stabile':health<8?'In crescita':'In ottima salute';
  sectors.push({id,title,balance,baseline,delta,health,label,accounts:selected.map(a=>a.id)});
 }
 return sectors;
}
function setClubSectors(accountId){
 const account=load().accounts.find(a=>a.id===accountId),box=document.getElementById('reg-fin-sectors-'+accountId);
 if(!account||!box)return;
 account.sectors=[...box.querySelectorAll('input[type=checkbox]:checked')].map(i=>i.value).filter(x=>Object.prototype.hasOwnProperty.call(SECTOR_MAP,x));
 if(save())render();
}
function accountSectorEditor(){
 const fs=load(),sectorStates=clubSectorStates();
 const editors=fs.accounts.map(a=>{
  const chosen=a.sectors||[];
  return '<details class="fin-sector-account"><summary><b>'+E(a.name)+'</b> — '+chosen.length+' '+(chosen.length===1?'settore':'settori')+' · riferimento stabile '+euro(a.baseline)+'</summary>'+
    '<div class="fin-sector-options" id="reg-fin-sectors-'+E(a.id)+'">'+CLUB_SECTORS.map(([id,title])=>'<label><input type="checkbox" value="'+id+'" '+(chosen.includes(id)?'checked':'')+'> '+E(title)+'</label>').join('')+'</div>'+
    '<button type="button" class="btn" onclick="reginaFin.saveSectors(\''+a.id+'\')">Salva i settori del conto</button></details>';
 }).join('');
 const status=sectorStates.map(s=>{
  return '<tr><td><b>'+E(s.title)+'</b><br><small class="muted">'+E(s.label)+'</small></td><td>'+s.health.toFixed(1)+'/10</td><td>'+euro(s.baseline)+'</td><td>'+euro(s.balance)+'</td><td>'+(s.delta>=0?'+':'')+euro(s.delta)+'</td></tr>';
 }).join('');
 return '<section class="fin-sector-module"><h3>🏟️ Settori della società</h3><p class="muted">Assegna a ogni conto uno o più settori. Ogni settore parte da <b>6/10</b> quando il saldo equivale al capitale iniziale: il riferimento non cambia quando aggiorni il saldo. Più conti possono finanziare lo stesso settore. I conti assegnati a più settori non vengono sommati due volte nel tuo patrimonio totale.</p>'+
  (editors||'<p class="muted">Aggiungi prima un conto per assegnare i settori.</p>')+
  '<h3>Salute dei settori</h3><div class="tablewrap"><table class="table"><thead><tr><th>Settore</th><th>Salute</th><th>Partenza</th><th>Attuale</th><th>Variazione</th></tr></thead><tbody>'+(status||'<tr><td colspan="5">Nessun settore assegnato</td></tr>')+'</tbody></table></div>'+
  '<p class="muted tiny">I settori influenzano moderatamente la prestazione calcistica soltanto quando è attivo il collegamento finanziario. I soldi inseriti restano reali come dato personale, ma gli investimenti della società sono soltanto virtuali.</p></section>';
}
window.reginaFin.saveSectors=setClubSectors;
const baseFinanceView_091=financeView;
financeView=function(){
 const html=baseFinanceView_091();
 return html.replace('<h3>Entrate, spese e giroconti</h3>',accountSectorEditor()+'<h3>Entrate, spese e giroconti</h3>');
};
const style092=document.createElement('style');
style092.textContent='.fin-sector-account{border:1px solid #cbd7e2;border-radius:10px;margin:9px 0;padding:11px;background:#f8fbfc}.fin-sector-account summary{cursor:pointer;line-height:1.6}.fin-sector-options{display:grid;grid-template-columns:repeat(auto-fit,minmax(185px,1fr));gap:9px;padding:13px 0}.fin-sector-options label{font-size:13px;line-height:1.45}.fin-sector-module{border:1px solid #cbdbe2;border-radius:12px;padding:13px;margin:18px 0}.fin-no-date-details{border:1px solid #d8e2e6;border-radius:10px;padding:9px;margin:9px 0;background:#f8fafb}.fin-no-date-details summary{font-weight:750;cursor:pointer;padding:7px}.fin-no-date-details .go-task{margin-top:10px}';
document.head.appendChild(style092);

// 2. Nessun compito in una categoria = 10/10, non 0,5. Le altre categorie
// mantengono le loro percentuali, e i settori esercitano un effetto limitato.
const baseTaskMetrics_091=taskMetrics;
taskMetrics=function(){
 const m=baseTaskMetrics_091();
 const today=todayTasks();
 if(load().enabled){
  const effects={
   trainers:[['fitness',.20]],doctors:[['fitness',.10]],fields:[['tactics',.20]],
   marketing:[['mental',.11],['luck',.11]],supporters:[['mental',.16]],
   operations:[['discipline',.15]],scouting:[['technical',.06]],
   academy:[['mental',.05]],logistics:[['fitness',.05]],security:[['discipline',.06]]
  };
  for(const sector of clubSectorStates())for(const [metric,weight] of effects[sector.id]||[]){
   m[metric]=sectorBounds((Number(m[metric])||0)+(sector.health-6)*weight);
  }
 }
 for(const cat of CATKEYS){
  if(!today.some(t=>t.category===cat))m[cat]=10;
  else m[cat]=sectorBounds(Number(m[cat])||0);
 }
 return m;
};

// 3. La scala delle pagelle comprende ESCLUSIVAMENTE: 3, 3,5, ..., 9.
// 6 indica sufficienza; 9 è riservato a prestazioni eccezionali.
function normalizeVote(v){
 const n=Number(v);
 return Number.isFinite(n)?Math.max(3,Math.min(9,Math.round(n*2)/2)):v;
}
function normalizeMatchVotes(m){
 if(!m)return m;
 if(m.grades)for(const key of Object.keys(m.grades))m.grades[key]=normalizeVote(m.grades[key]);
 if(m.coach!=null)m.coach=normalizeVote(m.coach);
 return m;
}
const baseCalcMatch_091=calcMatch;
calcMatch=function(...args){return normalizeMatchVotes(baseCalcMatch_091(...args));};
if(typeof euroMatch==='function'){
 const baseEuroMatch_091=euroMatch;
 euroMatch=function(...args){return normalizeMatchVotes(baseEuroMatch_091(...args));};
}
const baseGazView_091=gazView;
gazView=function(){
 // Anche le vecchie pagelle vengono visualizzate nella scala nuova, senza
 // riscrivere retroattivamente risultati e voti salvati.
 const rec=st?.results?.[selectedReport]||st?.results?.[0];
 const m=rec?.match;
 let html;
 if(m&&m.grades){
  const oldGrades=m.grades,oldCoach=m.coach;
  m.grades=Object.fromEntries(Object.entries(oldGrades).map(([k,v])=>[k,normalizeVote(v)]));
  if(oldCoach!=null)m.coach=normalizeVote(oldCoach);
  try{html=baseGazView_091()}finally{m.grades=oldGrades;m.coach=oldCoach;}
 }else html=baseGazView_091();
 html=html.replaceAll('INTERVISTA IMMAGINARIA A ','DALLO SPOGLIATOIO — ').replaceAll('DICHIARAZIONE IMMAGINARIA DI ','LA PRESIDENZA — ');
 if(rec?.match)html+='<p class="tiny muted">Scala delle pagelle: <b>6 = sufficienza</b> · <b>9 = prestazione eccezionale</b>. Voti da 3 a 9, soltanto interi e mezzi punti.</p>';
 return html;
};

// 4. Tappe senza data: un contenitore espandibile per ciascun fronte.
// Le card originali vengono spostate senza alterare pulsanti, completamenti o dati.
const expandedUndatedFronts=new Set();
window.reginaGoalPanels={toggle:(front,opened)=>{if(opened)expandedUndatedFronts.add(front);else expandedUndatedFronts.delete(front);}};
const baseObjectives_091=objectivesView;
objectivesView=function(){
 const tmp=document.createElement('template');tmp.innerHTML=baseObjectives_091();
 const dash=tmp.content.querySelector('.go-dashboard');if(!dash)return tmp.innerHTML;
 const undated=[...dash.querySelectorAll('.go-day')].find(x=>x.querySelector('h3')?.textContent.includes('Tappe senza data fissa'));
 if(!undated)return tmp.innerHTML;
 const cards=[...undated.querySelectorAll(':scope > article.go-task')];
 if(!cards.length)return tmp.innerHTML;
 const archive=tasks();if(!archive?.tasks?.length)return tmp.innerHTML;
 const frontSelect=dash.querySelector('select[onchange*="goalSetFront"]');
 const frontFilter=frontSelect?.value||'all';
 const search=(dash.querySelector('input[placeholder="Cerca..."]')?.value||'').toLocaleLowerCase('it');
 const all=archive.tasks.filter(t=>t.title&&!goalStamp(t.due)&&!goalStamp(t.deadlineDate)&&!t.isGenerated&&t.status!=='done' &&
  (frontFilter==='all'||t.frontId===frontFilter)&&
  (!search||(t.title+' '+(t.notes||'')).toLocaleLowerCase('it').includes(search)));
 if(all.length!==cards.length)return tmp.innerHTML; // Protegge da versioni con ordinamenti diversi.
 const fronts=new Map((archive.fronts||[]).map(f=>[f.id,f.title||'Fronte']));
 const buckets=new Map();
 all.forEach((t,i)=>{
  const front=t.frontId||'__no_front__';
  if(!buckets.has(front))buckets.set(front,[]);
  buckets.get(front).push(cards[i]);
 });
 for(const card of cards)card.remove();
 const empty=undated.querySelector('p.muted');if(empty)empty.remove();
 for(const [front,rows] of buckets){
  const det=document.createElement('details');det.className='fin-no-date-details';
  det.dataset.goalFront=front;
  det.open=expandedUndatedFronts.has(front);
  det.setAttribute('ontoggle','reginaGoalPanels.toggle(this.dataset.goalFront,this.open)');
  const title=document.createElement('summary');title.textContent=(fronts.get(front)||'Senza fronte')+' · '+rows.length+' '+(rows.length===1?'tappa':'tappe');
  det.appendChild(title);for(const row of rows)det.appendChild(row);
  undated.appendChild(det);
 }
 return tmp.innerHTML;
};

// 5. Eventi finanziari nelle prossime edizioni della Gazzetta: investimenti,
// crescita e difficoltà raccontati senza esporre cifre o nomi di conti reali.
function sectorPressReport(){
 if(!st)return [];
 const fs=load(),previous=st.reginaSectorEditorial||{health:{},purchases:0},news=[];
 const unseen=fs.purchases.slice(Math.min(previous.purchases||0,fs.purchases.length));
 for(const p of unseen){
  const found=INVEST.find(x=>x[0]===p.id);
  if(found)news.push('LA SOCIETÀ INVESTE. La dirigenza annuncia un intervento per '+found[1].toLowerCase()+': un nuovo tassello del progetto sportivo.');
 }
 const current=clubSectorStates();
 if(fs.enabled){
  for(const s of current){
   const was=previous.health[s.id],variation=was==null?0:s.health-was;
   if((s.health<=4.4&&(was==null||was>4.4))||variation<=-1.3){
    news.push('TENSIONI NEI REPARTI. '+s.title+': la disponibilità economica scende sotto i livelli di riferimento e il settore deve rivedere i programmi.');
   }else if((variation>=.8&&s.health>6)||(was==null&&s.health>=7.7)){
    news.push('SEGNALI DI CRESCITA. '+s.title+': risorse in miglioramento rispetto al punto di partenza, la società guarda avanti con maggiore fiducia.');
   }else if(s.health<5.2&&variation<-.2){
    news.push('PREOCCUPAZIONE IN SOCIETÀ. '+s.title+' sotto pressione: servono risorse e una gestione attenta.');
   }
  }
 }
 st.reginaSectorEditorial={purchases:fs.purchases.length,health:Object.fromEntries(current.map(x=>[x.id,x.health]))};
 return news;
}
const baseArticle_091=article;
function naturalInterviewQuotes(report,m){
 if(!report?.body||!m||!st)return;
 const advantage=(m.a===st.club?m.ga-m.gb:m.gb-m.ga),won=advantage>0,lost=advantage<0;
 const goals=(m.events||[]).filter(e=>e.type==='gol'&&e.side===st.club);
 const scorerGoals=new Map();for(const g of goals){const n=short(g.name);scorerGoals.set(n,(scorerGoals.get(n)||0)+1)}
 const pick=(arr,person)=>arr[(String(person).length+(st.results?.length||0)+m.ga*3+m.gb*7)%arr.length];
 report.body=report.body.replace(/DALLO SPOGLIATOIO — ([^:]+): «[^»]*»/g,(all,rawName)=>{
  const person=rawName.trim(),coach=String(st.coachName||'').trim(),isCoach=person===coach;
  let quotes;
  if(isCoach){
   quotes=won?['Non abbiamo concesso campo agli avversari nel momento decisivo. Ora voglio continuità.',
     'I ragazzi sono rimasti compatti e hanno sfruttato le occasioni. Domani si torna a lavorare.',
     'La differenza l’ha fatta l’attenzione ai dettagli. Il risultato non deve farci perdere equilibrio.']:
    lost?['Troppi errori nei momenti chiave. Il primo a dover trovare una soluzione sono io.',
     'Non cerco alibi: abbiamo avuto le nostre opportunità e non le abbiamo sfruttate.',
     'Capisco la delusione dei tifosi. La risposta dovrà arrivare sul campo.']:
    ['Abbiamo creato qualcosa, ma negli ultimi metri serve maggiore precisione.',
     'Prendiamo il punto senza esaltarci: c’è ancora molto da sistemare.',
     'La gara è stata equilibrata. Dovevamo gestire meglio alcune transizioni.'];
  }else{
   const n=scorerGoals.get(person)||0;
   quotes=n>=2?['Sono contento dei gol, ma quello che conta è aver aiutato la squadra.',
     'Ho trovato spazio tra le linee. I compagni mi hanno messo nelle condizioni di segnare.']:
    won?['Ci siamo cercati e aiutati fino all’ultimo minuto. È una vittoria del gruppo.',
     'La partita è stata dura, ma abbiamo saputo restare concentrati.']:
    lost?['Abbiamo lasciato troppo spazio e dobbiamo assumerci le nostre responsabilità.',
     'Perdere così fa male. Alla prossima occasione vogliamo reagire.']:
    ['Il pareggio lascia qualche rimpianto, soprattutto per le occasioni create.',
     'C’è stato tanto equilibrio. Ci manca ancora qualcosa nell’ultimo passaggio.'];
  }
  return 'DALLO SPOGLIATOIO — '+person+': «'+pick(quotes,person)+'»';
 });
}
article=function(m,metrics){
 const out=baseArticle_091(m,metrics);
 if(!out||!st)return out;
 naturalInterviewQuotes(out,m);
 const news=sectorPressReport();
 if(news.length){
  out.body=String(out.body||'')+'\n\n'+news.join(' ');
  // Una notizia economica importante può entrare in prima pagina occasionalmente,
  // ma il risultato sportivo rimane al centro del racconto.
  if(news.length>=2&&(st.results||[]).length%3===1){
   const title=teamById(st.club)?.name?.toLocaleUpperCase('it-IT')||'LA SOCIETÀ';
   out.title=title+', LA SOCIETÀ CAMBIA PASSO! INVESTIMENTI E CONTI SOTTO I RIFLETTORI';
  }
 }
 return out;
};
window.article=article;

if(st)render();
})();
