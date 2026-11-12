/* REGINA CALCIO - addon 1.1.16 (include tutte le funzioni 1.0.0, 1.1.0 e 1.1.1): categorie neutre al massimo, pagelle, fronti espandibili e finanze settoriali.
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
  return Object.assign({},t,{footballCategories:Array.isArray(front.footballCategories)?front.footballCategories.slice():undefined,frontTitle:front.title||'',category:front.footballCategories?.find(k=>CATKEYS.includes(k))|| (typeof taskCategory==='function'?taskCategory(front.cat,t.title,front.id):t.cat),done:t.status==='done',fraction:t.status==='done'?1:Math.max(0,Math.min(1,Number(t.progressFraction)||0)),fromOriginal:true});
 });
};
function periodDays(date,mode){
 let first=date;
 if(mode==='week'){let wd=(new Date(date+'T12:00:00').getDay()+6)%7;first=PLUS(date,-wd)}
 if(mode==='month')first=date.slice(0,7)+'-01';
 let total=mode==='day'?1:mode==='week'?7:new Date(Number(date.slice(0,4)),Number(date.slice(5,7)),0).getDate();
 return Array.from({length:total},(_,i)=>PLUS(first,i));
}
function goalComponentBoxes(t){
 if(t.type!=='mixed'||!Array.isArray(t.components)||!t.components.length)return '';
 const id=E(JSON.stringify(String(t.id)));
 return '<div class="go-steps">'+t.components.map((x,i)=>'<label><input type="checkbox" '+((t.checks||[]).some(n=>Number(n)===i)?'checked':'')+' onchange="goalStepCheck('+id+','+i+')"> '+E(typeof x==='string'?x:(x.title||x.text||'Tappa'))+'</label>').join('')+'</div>';
}
function correctGoalRow(t,day,fronts){
 const progress=t.status==='done'?100:Math.round((Number(t.progressFraction)||0)*100),label=t.status==='done'?'Completata':progress?progress+'%':t.status==='failed'?'Mancata':'Da fare';
 const name=E((fronts||[]).find(f=>f.id===t.frontId)?.title||''),id=E(JSON.stringify(String(t.id)));
 const when=E(JSON.stringify(day)),next=t.status==='done'?'todo':'done';
 const mixed=goalComponentBoxes(t);
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
  if(!today.some(t=>taskHasCategory(t,cat)))m[cat]=10;
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
 // Le pagelle valutano la gara conclusa, non il valore di mercato o il
 // punteggio degli obiettivi. Ricalcolo puro: nessun bonus si accumula.
 if(m.lineups&&m.playerNames&&Number.isFinite(m.ga)&&Number.isFinite(m.gb)){
  const clip=(v,lo,hi)=>Math.max(lo,Math.min(hi,v));
  const events=m.events||[];m.grades={...(m.grades||{})};
  for(const [index,side] of [[0,m.a],[1,m.b]]){
   const goals=index===0?m.ga:m.gb,against=index===0?m.gb:m.ga,margin=goals-against;
   const ids=[...new Set([...(m.lineups[side]||[]),...(m.subs||[]).filter(s=>s.side===side).map(s=>s.id||s.inId).filter(Boolean)])];
   const forms=ids.map(id=>m.forms?.[id]?.effective).filter(Number.isFinite);
   const average=forms.length?forms.reduce((n,v)=>n+v,0)/forms.length:6;
   const target=m.stats?.onTarget;
   const control=Array.isArray(target)?clip((target[index]-target[1-index])*.025,-.15,.15):0;
   const base=6+(margin>0?.2:margin<0?-.1:0)+clip(margin*.08,-.24,.24)+control;
   for(const id of ids){
    const p=m.playerNames[id];if(!p?.name)continue;
    const own=events.filter(e=>e.side===side&&e.name===p.name);
    const strikes=own.filter(e=>e.type==='gol');
    const scoring=Math.min(2.4,strikes.reduce((n,e)=>n+(e.kind==='rigore'?.6:.85),0));
    const effective=m.forms?.[id]?.effective;
    const individual=Number.isFinite(effective)?clip((effective-average)*.2,-.3,.3):0;
    let vote=base+individual+scoring;
    if(p.pos==='P'){
     const saves=Array.isArray(target)?Math.max(0,target[1-index]-against):0;
     vote+=Math.min(.6,saves*.08)+(against===0?.25:0)-Math.min(.8,Math.max(0,against-1)*.2);
    }else if(p.pos==='D')vote+=(against===0?.2:0)-Math.min(.6,Math.max(0,against-1)*.15);
    if(own.some(e=>e.type==='rosso'))vote-=1.5;
    else if(own.some(e=>e.type==='giallo'))vote-=.15;
    vote-=Math.min(1.4,own.filter(e=>e.type==='rigore_sbagliato').length*.7);
    m.grades[id]=normalizeVote(vote);
   }
   if(side===st?.club&&m.coach!=null)m.coach=normalizeVote(base);
  }
 }
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
  if(fronts.has(front)){
   const actions=document.createElement('span');actions.className='regina-front-actions';
   for(const [label,handler] of [['+ Tappa','goalOpenTask(null,'+JSON.stringify(front)+')'],['Modifica fronte','goalOpenFront('+JSON.stringify(front)+')']]){
    const button=document.createElement('button');button.type='button';button.className='btn alt tiny';button.textContent=label;
    button.setAttribute('onclick','event.preventDefault();event.stopPropagation();'+handler);
    actions.appendChild(button);
   }
   title.appendChild(actions);
  }
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

// ============================================================================
// REGINA CALCIO 1.0 — consolidamento funzionale compatibile con 0.9.2
// Dati personali esclusivamente nel browser; invariati APPKEY/GK/FK.
// ============================================================================
const RV1='1.1.1', PLKEY='regina-calcio-planner-v1';
const R_SLOTS=[['dawn','🌅 Prima mattina'],['morning','☀️ Mattina'],['lunch','🍝 Pranzo'],['afternoon','🌤️ Pomeriggio'],['evening','🌆 Sera'],['late','🌙 Sera tardi']];
const R_EFFECTS={none:'Normale',risk:'Rischioso',critical:'Critico',reward:'Premiante',decisive:'Decisivo'};
const rLim=(x,a=0,b=10)=>Math.min(b,Math.max(a,Number(x)||0));
const rD=v=>/^\d{4}-\d\d-\d\d$/.test(String(v||''))?v:'';
const rRef=t=>String(t?.repeatGroup||t?.id||'');
const rFmtName=p=>short(p?.name||p||'');
const rSelect=(name,values,value)=>'<select name="'+name+'">'+values.map(([k,label])=>'<option value="'+E(k)+'" '+(value===k?'selected':'')+'>'+E(label)+'</option>').join('')+'</select>';
function rTaskMeta(t){
 let time=String(t?.defaultTime||(t?.due||'').split('T')[1]||'');let hour=Number(time.slice(0,2));
 let inferred= /^\d\d:\d\d/.test(time)?hour<7?'dawn':hour<12?'morning':hour<15?'lunch':hour<19?'afternoon':hour<23?'evening':'late':'morning';
 return {difficulty:rLim(t?.reginaDifficulty??3,1,5),impact:{miss:t?.reginaImpact?.miss||'none',partial:t?.reginaImpact?.partial||'none',done:t?.reginaImpact?.done||'none'},slot:t?.reginaSlot||inferred};
}
function rGoalStore(){return tasks()||{tasks:[],fronts:[]};}
function rUpdateGoalStore(fn){let g=rGoalStore();if(!Array.isArray(g.tasks))return false;fn(g);commitGoals(g);return true;}
function rCurrentTask(g,id){if(!id)return null;return g.tasks.find(t=>t.id===id)||groupTask(g,id);}
function rSlotOptions(active){return rSelect('reginaSlot',R_SLOTS,active||'morning');}
function rImpactOptions(name,value,values){return '<label class="label">'+name+rSelect(name,values,value||'none')+'</label>';}
// A. Modifica tappa: difficoltà e impatto distinti per 0 / parziale / 100%.
const rPrevOpenTask=window.goalOpenTask;
window.goalOpenTask=function(id,...rest){
 rPrevOpenTask(id,...rest);
 const form=document.getElementById('goal-task-form');if(!form)return;
 const t=rCurrentTask(rGoalStore(),id),meta=rTaskMeta(t),last=form.querySelector('.row:last-child');
 const block=document.createElement('fieldset');block.className='regina-v1-effects';
 block.innerHTML='<legend>⚡ Impatto calcistico della tappa</legend>'+
 '<p class="muted tiny">Si può scegliere un effetto diverso per ciascun esito, senza conflitti. Critico: espulsione, rigore concesso o gol subito. Decisivo: un gol segnato garantito per ogni tappa.</p>'+
 '<label class="label">Difficoltà (1–5)'+rSelect('reginaDifficulty',[[1,'1 · Molto facile'],[2,'2 · Facile'],[3,'3 · Media'],[4,'4 · Difficile'],[5,'5 · Molto difficile']],meta.difficulty)+'</label>'+
 '<div class="regina-v1-effects-grid">'+
 rImpactOptions('miss',meta.impact.miss,[['none','0% · Normale'],['risk','0% · Rischioso'],['critical','0% · Critico']])+
 rImpactOptions('partial',meta.impact.partial,[['none','1–99% · Normale'],['risk','1–99% · Rischioso'],['critical','1–99% · Critico'],['reward','1–99% · Premiante'],['decisive','1–99% · Decisivo (gol)']])+
 rImpactOptions('done',meta.impact.done,[['none','100% · Normale'],['reward','100% · Premiante'],['decisive','100% · Decisivo (gol)']])+'</div>'+
 '<label class="label">Fascia della giornata'+rSlotOptions(meta.slot)+'</label>';
 if(last)last.before(block);else form.appendChild(block);
 // Nomi visibili più leggibili: i tre stati sono riconoscibili anche dal valore.
 for(const [name,title] of [['miss','❌ Non completato'],['partial','◐ Parziale'],['done','✅ Completato']]){
  const sel=block.querySelector('select[name="'+name+'"]');if(sel)sel.parentElement.prepend(document.createTextNode(title+' · '));
 }
};
const rPrevSaveTask=window.goalSaveTask;
window.goalSaveTask=function(ev){
 const form=ev?.target,fd=form?new FormData(form):null;
 if(!fd)return rPrevSaveTask(ev);
 const id=String(fd.get('id')||''),before=new Set(rGoalStore().tasks.map(t=>t.id));
 const difficulty=rLim(fd.get('reginaDifficulty')||3,1,5);
 const valid=(v,allowed)=>allowed.includes(v)?v:'none';
 const impact={miss:valid(String(fd.get('miss')||'none'),['none','risk','critical']),partial:valid(String(fd.get('partial')||'none'),['none','risk','critical','reward','decisive']),done:valid(String(fd.get('done')||'none'),['none','reward','decisive'])};
 const slot=R_SLOTS.some(x=>x[0]===fd.get('reginaSlot'))?String(fd.get('reginaSlot')):'morning';
 rPrevSaveTask(ev); // Salva la tappa con lo schema originale; preserva tutti i dati esistenti.
 rUpdateGoalStore(g=>{
  let target=g.tasks.find(t=>t.id===id);
  if(!target)target=g.tasks.filter(t=>!before.has(t.id)).at(-1);
  if(target){target.reginaDifficulty=difficulty;target.reginaImpact=impact;target.reginaSlot=slot;}
 });
};
// La schermata della tappa conserva i dettagli senza costringere a riaprire il modal.
function rSpecialBadges(t){let x=rTaskMeta(t),items=[];if(x.difficulty!==3)items.push('Difficoltà '+x.difficulty+'/5');for(let [k,lab] of [['miss','Saltato'],['partial','Parziale'],['done','Completo']])if(x.impact[k]!=='none')items.push(lab+': '+R_EFFECTS[x.impact[k]]);return items.length?'<small class="regina-v1-badges">'+E(items.join(' · '))+'</small>':''}
const rBeforeObjectiveCards=objectivesView;
objectivesView=function(){
 let html=rBeforeObjectiveCards();
 const tmp=document.createElement('template');tmp.innerHTML=html;
 const dash=tmp.content.querySelector('.go-dashboard');if(!dash)return html;
 const g=rGoalStore(),byId=new Map((g.tasks||[]).map(t=>[t.id,t]));
 for(const row of dash.querySelectorAll('article.go-task')){
  const button=row.querySelector('button[onclick*="goalOpenTask"]');if(!button)continue;
  const id=(button.getAttribute('onclick')||'').match(/goalOpenTask\((['"])(.*?)\1/)?.[2];
  const task=byId.get(id)||rCurrentTask(g,id);if(!task)continue;
  const text=row.querySelector('small.muted');if(text)text.insertAdjacentHTML('afterend',rSpecialBadges(task));
 }
 const planner=makeWeekPlanner(g);
 const before=dash.querySelector('.go-mode')||dash.querySelector('.go-day');
 if(before){let holder=document.createElement('div');holder.innerHTML=planner;before.before(holder)}
 return tmp.innerHTML;
};
// B. Calendario settimanale: trascinamento da archivio a giorno/fascia, anche touch.
let rPlannerDay=TODAY(),rDragId=null,rDragTouch=null,rPlannerCollapsed=false;
try{let p=JSON.parse(localStorage.getItem(PLKEY)||'null');if(p?.day)rPlannerDay=rD(p.day)||TODAY();if(p?.collapsed)rPlannerCollapsed=!!p.collapsed;}catch(e){}
function rWeekStart(d){let w=new Date(d+'T12:00:00'),delta=(w.getDay()+6)%7;return PLUS(d,-delta)}
function rPlannerSave(){try{localStorage.setItem(PLKEY,JSON.stringify({day:rPlannerDay,collapsed:rPlannerCollapsed}))}catch(e){}}
function rPlanItem(t,where){
 const id=E(t.id),meta=rTaskMeta(t),done=t.status==='done';return '<div class="regina-pl-item '+(done?'is-done':'')+'" draggable="true" data-regina-id="'+id+'" ondragstart="reginaPlan.drag(event)" ondragend="reginaPlan.end(event)">'+
 '<span class="regina-pl-grip" aria-hidden="true">⠿</span><span class="regina-pl-title">'+E(t.title)+'</span>'+rSpecialBadges(t)+
 '<button type="button" class="regina-pl-edit" onclick="goalOpenTask('+JSON.stringify(String(t.id)).replace(/"/g,'&quot;')+')" title="Modifica tappa">✎</button></div>';
}
function rGroupedForDate(g,day){return goalListForDay(day).filter(t=>{
  const target=rD((t.due||t.deadlineDate||'').slice(0,10));return target===day||t.footballCreditDay===day||String(t.id).startsWith('virtual:');
 });}
function makeWeekPlanner(g){
 const start=rWeekStart(rPlannerDay),days=Array.from({length:7},(_,i)=>PLUS(start,i));
 const backlog=g.tasks.filter(t=>t.title&&!t.archived&&!t.isGenerated&&t.status!=='done'&&t.status!=='failed'&&
  (!rD(String(t.due||t.deadlineDate||'').slice(0,10))||rD(String(t.due||'').slice(0,10))<TODAY()&&t.repeat==='none'));
 const frontal=new Map(g.fronts.map(f=>[f.id,f.title]));const buckets=new Map();
 for(const t of backlog){if(!buckets.has(t.frontId))buckets.set(t.frontId,[]);buckets.get(t.frontId).push(t)}
 const back=[...buckets].map(([fid,ls])=>'<details class="regina-pl-backfront"><summary>'+E(frontal.get(fid)||'Senza fronte')+' · '+ls.length+'</summary>'+ls.map(t=>rPlanItem(t,'backlog')).join('')+'</details>').join('');
 let html='<section class="regina-planner"><div class="row spread"><div><h3>📅 Pianifica la settimana</h3><small class="muted">Trascina le tappe nel giorno e nella fascia desiderati. Orario preciso facoltativo. Le tappe arretrate restano da gestire.</small></div><button type="button" class="btn alt" onclick="reginaPlan.toggle()">'+(rPlannerCollapsed?'Apri':'Chiudi')+'</button></div>';
 if(rPlannerCollapsed)return html+'</section>';
 html+='<div class="row spread regina-pl-toolbar"><button class="btn alt" onclick="reginaPlan.week(-1)">‹ Settimana precedente</button><b>'+E(start)+' — '+E(days[6])+'</b><button class="btn alt" onclick="reginaPlan.week(1)">Settimana successiva ›</button><button class="btn alt" onclick="reginaPlan.today()">Oggi</button></div>';
 html+='<div class="r115-day-index" role="group" aria-label="Vai al giorno">'+days.map((day,index)=>{
  const date=new Date(day+'T12:00:00');
  const weekday=date.toLocaleDateString('it-IT',{weekday:'short'});
  return '<button type="button" data-day-index="'+index+'" aria-label="Vai a '+E(date.toLocaleDateString('it-IT',{dateStyle:'full'}))+'"'+(day===TODAY()?' aria-current="date"':'')+'><small>'+weekday+'</small><b>'+date.getDate()+'</b></button>';
 }).join('')+'</div>';
 html+='<div class="regina-pl-scroll"><div class="regina-pl-week">'+days.map(day=>{
  const ls=rGroupedForDate(g,day),used=new Set(),perSlot=new Map(R_SLOTS.map(x=>[x[0],[]]));
  for(const t of ls){let key=t.id;if(used.has(key))continue;used.add(key);let slot=rTaskMeta(t).slot;if(!perSlot.has(slot))slot='morning';perSlot.get(slot).push(t)}
  const label=new Date(day+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric',month:'short'});
  return '<div class="regina-pl-day"><h4 class="'+(day===TODAY()?'regina-pl-today':'')+'">'+E(label)+'</h4>'+R_SLOTS.map(([key,name])=>'<div class="regina-pl-drop" data-day="'+day+'" data-slot="'+key+'" ondragover="reginaPlan.over(event)" ondrop="reginaPlan.drop(event)"><small>'+E(name)+'</small>'+(perSlot.get(key)||[]).map(t=>rPlanItem(t,'day')).join('')+'</div>').join('')+'</div>';
 }).join('')+'</div></div>';
 html+='<div class="regina-pl-backlog"><h4>🗂️ Da pianificare o ripianificare · '+backlog.length+'</h4>'+
 (back||'<p class="muted">Nessuna tappa in attesa.</p>')+'</div>'+ 
 '<p class="muted tiny">Sul telefono tieni premuta una tappa e trascinala. In alternativa premi ✎ e imposta data e fascia. Le ricorrenze spostate cambiano soltanto per quella data.</p></section>';
 return html;
}
function rMoveTask(id,day,slot){
 if(!rD(day)||!R_SLOTS.some(x=>x[0]===slot))return false;
 let g=rGoalStore(),t=rCurrentTask(g,id);if(!t)return false;
 const sourceDay=(String(id).match(/\d{4}-\d\d-\d\d$/)||[])[0]||String(t.occurrenceDate||t.due||'').slice(0,10);
 if(t.repeat&&t.repeat!=='none'){
  if(!sourceDay)return alert('Per spostare una ricorrenza serve un’occorrenza già datata.'),false;
  // Un'unica eccezione alla ricorrenza; il modello non cambia.
  const group=rRef(t),base=g.tasks.find(x=>rRef(x)===group&&!x.isGenerated)||t;
  base.skipDates=[...new Set([...(base.skipDates||[]),sourceDay])];
  const copy=structuredClone(base);copy.id=uid();copy.repeat='none';delete copy.repeatGroup;copy.isGenerated=false;copy.occurrenceDate='';copy.skipDates=[];copy.scheduleStart='';copy.due=day+(copy.defaultTime?'T'+copy.defaultTime:'');copy.reginaSlot=slot;copy.status='todo';copy.progressFraction=0;copy.checks=[];copy.actualValue=0;copy.footballCreditDay=null;
  g.tasks.push(copy);
  g.tasks=g.tasks.filter(x=>!(x.isGenerated&&rRef(x)===group&&String(x.occurrenceDate||x.due||'').slice(0,10)===sourceDay));
 }else{t.due=day+(t.defaultTime?'T'+t.defaultTime:'');t.reginaSlot=slot;t.footballCreditDay=null;t.carrySince=null;}
 commitGoals(g);return true;
}
function rMoveWithPrompt(id){let t=rCurrentTask(rGoalStore(),id);if(!t)return;let date=prompt('Data (AAAA-MM-GG):',rD(String(t.due||'').slice(0,10))||TODAY());if(date===null)return;date=rD(date);if(!date)return alert('Data non valida');let slot=prompt('Fascia: dawn, morning, lunch, afternoon, evening, late',rTaskMeta(t).slot);if(slot!==null)rMoveTask(id,date,slot);}
window.reginaPlan={
 week(step){rPlannerDay=PLUS(rPlannerDay,step*7);rPlannerSave();render()},today(){rPlannerDay=TODAY();rPlannerSave();render()},
 toggle(){rPlannerCollapsed=!rPlannerCollapsed;rPlannerSave();render()},move:rMoveTask,choose:rMoveWithPrompt,
 drag(e){rDragId=e.currentTarget.dataset.reginaId;if(e.dataTransfer){e.dataTransfer.effectAllowed='move';e.dataTransfer.setData('text/plain',rDragId)}},
 over(e){e.preventDefault();e.currentTarget.classList.add('regina-pl-over')},
 drop(e){e.preventDefault();e.currentTarget.classList.remove('regina-pl-over');let id=e.dataTransfer?.getData('text/plain')||rDragId;rDragId=null;if(id)rMoveTask(id,e.currentTarget.dataset.day,e.currentTarget.dataset.slot)},
 end(){rDragId=null;document.querySelectorAll('.regina-pl-over').forEach(n=>n.classList.remove('regina-pl-over'))}
};
// Pointer/touch support via delega: fa scorrere anche il contenitore quando si trascina al bordo.
let rTouchTimer=null;
document.addEventListener('touchstart',e=>{
 const item=e.target.closest?.('.regina-pl-item');if(!item||e.target.closest('button'))return;
 const touch=e.touches[0],id=item.dataset.reginaId;
 clearTimeout(rTouchTimer);rTouchTimer=setTimeout(()=>{rDragTouch={id,x:touch.clientX,y:touch.clientY};item.classList.add('regina-pl-dragging');navigator.vibrate?.(18)},280);
},{passive:true});
document.addEventListener('touchmove',e=>{
 if(!rDragTouch){clearTimeout(rTouchTimer);return}
 e.preventDefault();const t=e.touches[0];rDragTouch.x=t.clientX;rDragTouch.y=t.clientY;
 document.querySelectorAll('.regina-pl-over').forEach(x=>x.classList.remove('regina-pl-over'));
 let target=document.elementFromPoint(t.clientX,t.clientY)?.closest?.('.regina-pl-drop');if(target)target.classList.add('regina-pl-over');
 const scroll=document.querySelector('.regina-pl-scroll');if(scroll){let box=scroll.getBoundingClientRect();if(t.clientX>box.right-25)scroll.scrollLeft+=13;if(t.clientX<box.left+25)scroll.scrollLeft-=13;}
 if(t.clientY>window.innerHeight-55)window.scrollBy(0,12);if(t.clientY<55)window.scrollBy(0,-12);
},{passive:false});
document.addEventListener('touchend',()=>{
 clearTimeout(rTouchTimer);if(!rDragTouch)return;
 const p=rDragTouch;rDragTouch=null;document.querySelectorAll('.regina-pl-dragging').forEach(x=>x.classList.remove('regina-pl-dragging'));
 const target=document.elementFromPoint(p.x,p.y)?.closest?.('.regina-pl-drop');if(target)rMoveTask(p.id,target.dataset.day,target.dataset.slot);
 else document.querySelectorAll('.regina-pl-over').forEach(x=>x.classList.remove('regina-pl-over'));
},{passive:true});
// Un'attività scaduta resta nel contenitore da ripianificare: non pesa nella
// giornata corrente finché l'utente non la trascina esplicitamente.
const rOriginalTodayTasks=todayTasks;
todayTasks=function(){const d=st?.nextDay||TODAY();return rOriginalTodayTasks().filter(t=>{
 const due=rD(String(t.due||'').slice(0,10));
 return !(due&&due<d&&(!t.repeat||t.repeat==='none')&&t.footballCreditDay!==d);
 });};
// C. Difficoltà ponderata e bonus di continuità senza penalità.
const rBaseMetrics=taskMetrics;
taskMetrics=function(){
 const m=rBaseMetrics(),list=todayTasks();
 for(const cat of CATKEYS){const x=list.filter(t=>taskHasCategory(t,cat));if(!x.length){m[cat]=10;continue;}
  const simple=x.reduce((n,t)=>n+rLim(t.fraction,0,1),0)/x.length;
  const ww=x.reduce((n,t)=>n+rTaskMeta(t).difficulty,0);
  const weighted=x.reduce((n,t)=>n+rLim(t.fraction,0,1)*rTaskMeta(t).difficulty,0)/Math.max(1,ww);
  const adjustment=9.55*(weighted-simple);
  m[cat]=rLim(m[cat]+adjustment);
 }
 // Il passato può soltanto aggiungere un piccolo premio, non ridurre mai la condizione.
 const recent=(st?.results||[]).slice(0,7).filter(x=>x?.metrics&&x.day&&x.day<(st?.nextDay||TODAY())&&(!st.reginaSeasonStart||x.day>=st.reginaSeasonStart));
 let streak=0,expected=PLUS(st?.nextDay||TODAY(),-1);for(const r of recent){
  if(r.day!==expected||!(r.match?.reginaPlannedCount>0)||(r.match?.reginaCompletionRate||0)<.8)break;
  streak++;expected=PLUS(expected,-1);
 }
 if(streak>=3)m.mental=rLim(m.mental+Math.min(.45,.1*(streak-2)));
 return m;
};
// D. Gli eventi critici e decisivi modificano il RISULTATO PRIMA della classifica.
function rSpecialTriggers(){
 let goals=0,crits=[],adjustments={},risk=0,rewards=0;
 for(const t of todayTasks()){
  const p=rLim(t.fraction,0,1),state=p<=0?'miss':p>=1?'done':'partial',meta=rTaskMeta(t),kind=meta.impact[state];
  if(kind==='decisive')goals++;
  if(kind==='critical')crits.push({task:t,category:t.category});
  if(kind==='risk'||kind==='reward'){
   const delta=(kind==='reward'?1:-1)*.30*(.65+meta.difficulty*.14),metric=CATKEYS.includes(t.category)?t.category:'mental';
   for(const target of taskCategories(t).filter(k=>CATKEYS.includes(k)))adjustments[target]=Math.max(-1.6,Math.min(1.6,(adjustments[target]||0)+delta));
   if(kind==='risk')risk++;else rewards++;
  }
 }
 return {goals,crits,risk,rewards,adjustments};
}
function rPlayersFor(m,side,position){
 let players=(m.lineups?.[side]||[]).map(id=>({id,...(m.playerNames?.[id]||{})})).filter(x=>x.name);
 return players.filter(p=>p.pos===position).length?players.filter(p=>p.pos===position):players;
}
function rWeightedName(m,side){
 let players=(m.lineups?.[side]||[]).map(id=>({id,...(m.playerNames?.[id]||{})})).filter(x=>x.name);
 if(!players.length)return null;
 // Peso PER REPARTO: 70% attaccanti, 24% centrocampisti, 6% difensori.
 const pool={A:players.filter(x=>x.pos==='A'),C:players.filter(x=>x.pos==='C'),D:players.filter(x=>x.pos==='D'),P:players.filter(x=>x.pos==='P')};
 const available=[['A',.70],['C',.24],['D',.06]].filter(([k])=>pool[k].length);
 let total=available.reduce((s,x)=>s+x[1],0),draw=Math.random()*total,role='A';
 for(const [k,w] of available){draw-=w;if(draw<=0){role=k;break}}let candidates=pool[role].length?pool[role]:players;
 let weights=candidates.map(p=>Math.max(.1,1+.22*((m.forms?.[p.id]?.effective||5)-5)+.10*((m.grades?.[p.id]||6)-6))),sum=weights.reduce((s,v)=>s+v,0),q=Math.random()*sum;
 for(let i=0;i<candidates.length;i++){q-=weights[i];if(q<=0)return candidates[i]}
 return candidates.at(-1);
}
function rUpdateGoalStats(m,side,amount){const own=side===m.a?'ga':'gb',si=side===m.a?0:1;m[own]+=amount;
 if(m.stats){for(const key of ['shots','onTarget'])if(Array.isArray(m.stats[key]))m.stats[key][si]+=amount;}
}
function rAddGoal(m,side,minute,forced,kind='azione'){
 const p=rWeightedName(m,side);const name=p?.name||teamById(side)?.name||'Squadra';
 m.events.push({side,minute,type:'gol',name,kind,action:kind==='rigore'?'dal dischetto': 'dopo una manovra insistita',reginaGuaranteed:forced});
 rUpdateGoalStats(m,side,1);
 if(p?.id&&m.grades){m.grades[p.id]=normalizeVote(Math.min(9,(Number(m.grades[p.id])||6)+.5))}
}
// I marcatori naturali rispettano il ruolo complessivo del reparto, non soltanto
// il peso individuale (4 centrocampisti non devono superare 2 attaccanti).
const rOldWeightedPick=weightedPick;
weightedPick=function(ps){
 if(!Array.isArray(ps)||!ps.length)return rOldWeightedPick(ps);
 const roles=[['A',.70],['C',.24],['D',.06]].filter(([role])=>ps.some(p=>p.pos===role));
 if(!roles.length)return rOldWeightedPick(ps);
 let q=Math.random()*roles.reduce((n,x)=>n+x[1],0),role=roles[0][0];
 for(const [k,w] of roles){q-=w;if(q<=0){role=k;break}}
 const set=ps.filter(p=>p.pos===role);let w=set.map(p=>Math.max(.3,1+(Number(p.tech||5)-5)*.15+(Number(p.fitness||6)-6)*.04)),total=w.reduce((n,x)=>n+x,0),v=Math.random()*total;
 for(let i=0;i<set.length;i++){v-=w[i];if(v<=0)return set[i]}return set.at(-1);
};
const rOldCalc=calcMatch;
calcMatch=function(a,b,ma=null,mb=null){
 let special=null,ours=(a===st?.club||b===st?.club),ownSide=a===st?.club?a:b,opp=a===st?.club?b:a;
 if(ours){special=rSpecialTriggers();const own=a===st.club?ma:mb;
  if(own)for(const [k,delta] of Object.entries(special.adjustments)){own[k]=rLim(own[k]+delta)}
 }
 const m=rOldCalc(a,b,ma,mb);
 if(!ours||!special)return m;
 let forcedGoals=special.goals,criticalCount=special.crits.length;
 // Eventi garantiti aggiunti al tracciato cronologico prima di applicare punti e giornale.
 for(let i=0;i<forcedGoals;i++)rAddGoal(m,ownSide,Math.floor(6+Math.random()*79),true);
 let expulsions=0;
 for(let i=0;i<criticalCount;i++){
  let reason=special.crits[i],chance=Math.random();
  if(reason.category==='discipline'&&chance<.5)chance=.12;
  let minute=Math.floor(13+Math.random()*65);
  if(chance<.34){
   let already=new Set(m.events.filter(x=>x.side===ownSide&&x.type==='rosso').map(x=>x.name));
   let players=(m.lineups?.[ownSide]||[]).map(id=>m.playerNames?.[id]).filter(p=>p?.name&&!already.has(p.name));
   if(!players.length){rAddGoal(m,opp,minute,true);continue}
   let player=players[Math.floor(Math.random()*players.length)];
   m.events.push({side:ownSide,type:'rosso',minute,name:player.name,reginaGuaranteed:true});expulsions++;
   // L'inferiorità numerica agisce realmente sui minuti successivi: alcune
   // occasioni e alcune reti ordinarie della squadra in dieci non si concretizzano.
   for(const ev of m.events.slice()){
    if(ev.side!==ownSide||ev.minute<=minute||ev.reginaGuaranteed)continue;
    if(ev.type==='gol'&&Math.random()<.20){
     ev.type='occasione';ev.outcome='conclusione murata';ev.action='tiro in inferiorità numerica';ev.reginaRedPrevented=true;
     if(ownSide===m.a)m.ga=Math.max(0,m.ga-1);else m.gb=Math.max(0,m.gb-1);
     const si=ownSide===m.a?0:1;if(Array.isArray(m.stats?.onTarget))m.stats.onTarget[si]=Math.max(0,m.stats.onTarget[si]-1);
    }
    if(ev.type==='occasione'&&Math.random()<.13){ev.outcome='fuori misura';ev.action='ripartenza affrettata in dieci uomini'}
   }
   // La maggior parte della gara rimanente è in inferiorità: rischio supplementare
   // di subire un gol, proporzionale ai minuti da giocare.
   let vulnerability=Math.min(.75,(90-minute)/90*.82);
   if(Math.random()<vulnerability)rAddGoal(m,opp,Math.min(90,minute+4+Math.floor(Math.random()*(86-minute))),false);
  }else if(chance<.68){
   m.events.push({side:ownSide,type:'rigore_concesso',minute,name:teamById(ownSide)?.name||'Squadra',reginaGuaranteed:true});
   if(Math.random()<.76)rAddGoal(m,opp,Math.min(90,minute+1),false,'rigore');
   else {let p=rWeightedName(m,opp);m.events.push({side:opp,minute:Math.min(90,minute+1),type:'rigore_sbagliato',name:p?.name||teamById(opp).name})}
  }else rAddGoal(m,opp,minute,true);
 }
 if(expulsions&&m.stats){const i=ownSide===a?0:1,j=1-i;
  if(Array.isArray(m.stats.possession)){const shift=Math.min(12,expulsions*4);m.stats.possession[i]=Math.max(18,m.stats.possession[i]-shift);m.stats.possession[j]=100-m.stats.possession[i]}
 }
 const todays=todayTasks();m.reginaPlannedCount=todays.length;m.reginaCompletionRate=todays.length?todays.reduce((n,t)=>n+rLim(t.fraction,0,1),0)/todays.length:0;
 m.reginaImpacts={goals:forcedGoals,critical:criticalCount,red:expulsions,risk:special.risk,reward:special.rewards};
 m.events.sort((x,y)=>(x.minute||0)-(y.minute||0));
 normalizeMatchVotes(m);return m;
};
// Le gare UEFA utilizzano la stessa scala voti e non ricevono bonus duplicati.
// E. Gazzetta: una sola cronaca fluida, fatti verificabili e campionato contestualizzato.
function rMatchNarrative(m){
 const mine=st.club,opp=m.a===mine?m.b:m.a,diff=m.a===mine?m.ga-m.gb:m.gb-m.ga;
 const events=(m.events||[]).filter(e=>['gol','rosso','rigore_sbagliato','rigore_concesso','intervento','occasione'].includes(e.type));
 let goals=events.filter(e=>e.type==='gol'),red=events.filter(e=>e.type==='rosso'),miss=events.filter(e=>e.type==='rigore_sbagliato');
 const opponent=teamById(opp)?.name||'gli avversari',mineN=teamById(mine)?.name||'la squadra';
 let intro=diff>0?`${pressClub(mine,true)} conquista tre punti contro ${pressClub(opp)} (${m.ga}–${m.gb})`:
 diff<0?`${pressClub(mine,true)} perde la sfida con ${pressClub(opp)} (${m.ga}–${m.gb})`:
 `Termina in parità il confronto tra ${pressClub(m.a)} e ${pressClub(m.b)} (${m.ga}–${m.gb})`;
 intro+='.';
 let chosen=[...events].filter(e=>e.type==='gol').slice(0,5);if(red.length)chosen.push(red[0]);if(miss.length)chosen.push(miss[0]);const penalties=events.filter(e=>e.type==='rigore_concesso');if(penalties.length)chosen.push(penalties[0]);
 chosen.sort((a,b)=>a.minute-b.minute);
 const sentences=chosen.map(e=>{
  let subject=rFmtName(e.name),club=pressClub(e.side);
  if(e.type==='gol')return `Al ${e.minute}′ ${subject} va a segno per ${club}${e.kind==='rigore'?' dal dischetto':''}`;
  if(e.type==='rosso')return `al ${e.minute}′ ${subject} viene espulso e ${club} resta in inferiorità numerica`;
  if(e.type==='rigore_sbagliato')return `al ${e.minute}′ ${subject} fallisce un rigore`;
  if(e.type==='rigore_concesso')return `al ${e.minute}′ ${club} concede un rigore agli avversari`;
  return '';
 }).filter(Boolean);
 if(sentences.length)intro+=' '+sentences[0][0].toUpperCase()+sentences[0].slice(1)+(sentences.length>1?'; '+sentences.slice(1).join('; '):'')+'.';
 const occasions=events.filter(e=>e.type==='occasione').filter(e=>!goals.some(g=>g.name===e.name&&Math.abs(g.minute-e.minute)<3));
 const otherPlayers=[];for(const e of occasions){const x=rFmtName(e.name);if(x&&!otherPlayers.includes(x)&&!goals.some(g=>rFmtName(g.name)===x))otherPlayers.push(x)}
 if(otherPlayers.length)intro+=' Nel corso della gara si mettono in evidenza anche '+otherPlayers.slice(0,2).join(' e ')+' con iniziative offensive che tengono in apprensione le difese.';
 const defensive=(m.events||[]).filter(e=>e.type==='intervento'&&e.side===mine).map(e=>rFmtName(e.name)).filter(Boolean);
 const backs=[...new Set(defensive)].filter(x=>!otherPlayers.includes(x)&&!goals.some(g=>rFmtName(g.name)===x));
 if(backs.length)intro+=' Prezioso anche il lavoro difensivo di '+backs[0]+', protagonista di una chiusura importante.';
 if(m.reginaImpacts?.red)intro+=' L’inferiorità numerica pesa sulla gestione dei minuti successivi.';
 const dm=m.metrics?.[mine];if(dm){const metricNames={fitness:'forma fisica',technical:'tecnica',discipline:'correttezza',mental:'motivazione',luck:'fortuna',tactics:'tattica'};let hi=Object.entries(dm).filter(([k,v])=>CATKEYS.includes(k)&&v>=8.5).map(([k])=>metricNames[k]||k);
  let low=Object.entries(dm).filter(([k,v])=>CATKEYS.includes(k)&&v<=3.1).map(([k])=>metricNames[k]||k);
  if(hi.length)intro+=' La preparazione di giornata si riflette soprattutto in '+hi.slice(0,2).join(' e ')+'.';
  if(low.length)intro+=' Restano invece difficoltà evidenti sul piano di '+low.slice(0,2).join(' e ')+'.';
 }
 return intro;
}
function rLeagueContext(m){
 if(!st?.standings||!st.league)return '';
 const clubs=sortedStandings(st.league),rank=clubs.findIndex(t=>t.id===st.club);if(rank<0)return '';
 const near=clubs.filter((t,i)=>t.id!==st.club&&Math.abs(i-rank)<=2).slice(0,3);
 const thisRound=st.roundLog?.[0]?.matches||[];
 let s=`In classifica ${pressClub(st.club)} occupa ora il ${rank+1}° posto con ${clubs[rank].pts} punti`;
 if(near.length)s+=`; a distanza ravvicinata ci sono ${near.map(t=>pressClub(t.id)+' ('+t.pts+')').join(', ')}`;
 s+='.';
 const rivals=near.map(t=>{let x=thisRound.find(m=>m.a===t.id||m.b===t.id);if(!x)return null;let n=x.a===t.id?x.ga-x.gb:x.gb-x.ga;return [t.name,n>0?'ha vinto':n<0?'ha perso':'ha pareggiato',teamById(x.a===t.id?x.b:x.a)?.name]});
 if(rivals.some(Boolean))s+=' Nella stessa giornata '+rivals.filter(Boolean).slice(0,2).map(x=>x[0]+' '+x[1]+' contro '+x[2]).join(', mentre ')+'.';
 return s;
}
function rMemoryStory(m){let prev=(st.results||[]).filter(r=>r.match&&(r.match.a===st.club||r.match.b===st.club)).slice(0,5);if(!prev.length)return '';
 const side=st.club,cur=(m.a===side?m.ga-m.gb:m.gb-m.ga),hist=prev.map(r=>r.match.a===side?r.match.ga-r.match.gb:r.match.gb-r.match.ga);
 const present=new Set((m.events||[]).filter(x=>x.type==='gol'&&x.side===side).map(x=>rFmtName(x.name)));
 for(const r of prev){
  const missed=(r.match.events||[]).find(x=>x.type==='rigore_sbagliato'&&x.side===side&&present.has(rFmtName(x.name)));
  if(missed)return rFmtName(missed.name)+' si è preso la rivincita dopo il rigore sbagliato nella precedente fase del campionato: la rete di oggi cambia il giudizio sul suo momento.';
  const sent=(r.match.events||[]).find(x=>x.type==='rosso'&&x.side===side&&present.has(rFmtName(x.name)));
  if(sent)return 'Tra i protagonisti c’è anche '+rFmtName(sent.name)+', tornato decisivo dopo un’espulsione che aveva fatto discutere nelle scorse giornate.';
 }
 if(cur>0&&hist[0]<0){let x=0;for(const d of hist){if(d<0)x++;else break}if(x>=2)return `Il risultato interrompe una serie di ${x} sconfitte consecutive: un riscatto che può cambiare l’inerzia della stagione.`;}
 if(cur<0&&hist.every(x=>x>0))return `La battuta d’arresto interrompe una serie di ${hist.length} successi consecutivi e riapre interrogativi sulla continuità della squadra.`;
 if(cur>=0&&hist.slice(0,3).every(x=>x>=0))return `La squadra allunga la striscia di risultati utili, un dato che diventa sempre più importante nella corsa ai propri obiettivi.`;
 return '';
}
function rPressQuote(m){let d=m.a===st.club?m.ga-m.gb:m.gb-m.ga,coach=st.coachName||'l’allenatore',idx=((st.results||[]).length*5+m.ga*3+m.gb)%3;
 let positive=['«La squadra ha risposto con carattere. Il lavoro quotidiano si è visto soprattutto nei momenti difficili».','«Tre punti importanti, ma sappiamo che non possiamo concedere tutto quello che abbiamo concesso oggi».','«I ragazzi hanno interpretato la gara con grande concentrazione. Il campionato resta lungo».'];
 let negative=['«Abbiamo commesso errori e siamo i primi a doverli correggere. Ora serve una reazione».','«Il risultato fa male, ma la prestazione ci lascia indicazioni precise su cui lavorare».','«Non cerchiamo scuse: dobbiamo dare di più, soprattutto nei momenti decisivi».'];
 let neutral=['«Abbiamo avuto occasioni per vincere; dobbiamo essere più incisivi».','«La classifica si muove, ma dobbiamo trovare maggiore continuità».','«Un punto è un punto, adesso bisogna migliorare quello che non ha funzionato».'];
 return `${coach} commenta così: ${d>0?positive[idx]:d<0?negative[idx]:neutral[idx]}`;
}
const rOldArticle=article;
article=function(m,metrics){
 const old=rOldArticle(m,metrics);if(!old||!m||!st||(m.a!==st.club&&m.b!==st.club))return old;
 const d=m.a===st.club?m.ga-m.gb:m.gb-m.ga;const club=teamById(st.club)?.name||'SQUADRA';
 const recent=(st.results||[]).length,scorers=(m.events||[]).filter(e=>e.type==='gol'&&e.side===st.club),names=Array.from(new Set(scorers.map(e=>rFmtName(e.name))));
 const head=d>0?[`${club.toLocaleUpperCase('it-IT')} NON MOLLA: VITTORIA PESANTE!`,
 `${names[0]?.toLocaleUpperCase('it-IT')||club.toLocaleUpperCase('it-IT')} FA LA DIFFERENZA: TRE PUNTI D'ORO`,
 `${club.toLocaleUpperCase('it-IT')} SI PRENDE LA SCENA: IL CAMPIONATO SI ACCENDE`]:
 d<0?[`${club.toLocaleUpperCase('it-IT')}, PASSO FALSO CHE FA MALE`,
 `ALLARME ${club.toLocaleUpperCase('it-IT')}: RESTANO I RIMPIANTI`,
 `${club.toLocaleUpperCase('it-IT')} KO: SERVE UNA RISPOSTA`]:
 [`${club.toLocaleUpperCase('it-IT')}, UN PUNTO E TANTE DOMANDE`,
 `${club.toLocaleUpperCase('it-IT')} NON SFONDA: LA CLASSIFICA SI MUOVE`,
 `${club.toLocaleUpperCase('it-IT')}, PAREGGIO CHE FA DISCUTERE`];
 let title=head[(recent+m.ga+m.gb)%head.length];
 if(st.coachName&&(recent+m.ga+m.gb)%4===0)title=rFmtName(st.coachName).toLocaleUpperCase('it-IT')+': '+title;
 // Si recuperano soltanto le notizie economiche reali già prodotte dall'addon.
 let paragraphs=[rMatchNarrative(m),rLeagueContext(m),rMemoryStory(m),rPressQuote(m)].filter(Boolean);
 const finance=String(old.body||'').split(/\n\n/).filter(x=>/(LA SOCIETÀ INVESTE|TENSIONI NEI REPARTI|SEGNALI DI CRESCITA|PREOCCUPAZIONE IN SOCIETÀ)/.test(x));
 paragraphs.push(...finance);
 return {title:typeof pressHeadlineWithoutArticles==='function'?pressHeadlineWithoutArticles(title):title,body:paragraphs.join('\n\n'),headlineReason:'cronaca contestualizzata'};
};window.article=article;
// I rigori concessi appaiono anche nella scheda eventi, non soltanto nell'articolo.
const rPreviousGaz=gazView;
gazView=function(){let html=rPreviousGaz(),rec=st?.results?.[selectedReport]||st?.results?.[0];const pens=(rec?.match?.events||[]).filter(x=>x.type==='rigore_concesso');
 if(!pens.length)return html;
 const penaltyText='<div class="notice tiny"><b>Rigori concessi:</b> '+pens.map(x=>x.minute+'′, '+E(teamById(x.side)?.name||'la squadra')).join(' · ')+'</div>';
 return html.replace('</article>',penaltyText+'</article>');
};
// F. Finanze: valute, commissioni, ripartizione percentuale, baseline e delta.
const R_CURRENCIES=['EUR','USD','GBP','THB','CNY','MMK','JPY','CHF','CAD','AUD','SGD','HKD','OTHER'];
function rFinanceInit(){const fs=load();for(const a of fs.accounts){a.currency=R_CURRENCIES.includes(a.currency)?a.currency:'EUR';a.rateEuro=Number(a.rateEuro)>0?Number(a.rateEuro):1;
 a.baseRateEuro=Number(a.baseRateEuro)>0?Number(a.baseRateEuro):a.rateEuro;
 if(!Number.isFinite(Number(a.lastBalance)))a.lastBalance=Number(a.balance)||0;
 if(!Number.isFinite(Number(a.lastPressBalance)))a.lastPressBalance=Number(a.balance)||0;
 a.commissionRate=Number.isFinite(Number(a.commissionRate))?Math.max(0,Number(a.commissionRate)):0;
 if(!a.allocations||typeof a.allocations!=='object'){
  a.allocations={};const arr=(a.sectors||[]).filter(x=>SECTOR_MAP[x]);const share=arr.length?100/arr.length:0;for(const sector of arr)a.allocations[sector]=share;
 }
 }
 return fs;}
function rEurAmount(a,v,useBaseline=false){return cents((Number(v)||0)*(useBaseline?(a.baseRateEuro||1):(a.rateEuro||1)))}

const rOldBudget=budget;
budget=function(){
 const fs=rFinanceInit();const hist=outcomes(),w=hist.filter(x=>x==='W').length,d=hist.filter(x=>x==='D').length,spent=(fs.purchases||[]).reduce((n,p)=>n+Number(p.cost||0),0);
 let delta=0;if(fs.enabled&&fs.accounts.length){
  // Non scambiare un rialzo del cambio per un guadagno personale.
  const change=fs.accounts.reduce((n,a)=>n+rEurAmount(a,Number(a.balance)-Number(a.baseline),true),0);
  const sensitivity=({bassa:.6,media:1,alta:1.45})[fs.sensitivity]||1;
  delta=Math.sign(change)*Math.min(8,Math.sqrt(Math.abs(change)/200)*1.15*sensitivity);
 }
 return Math.max(0,cents(10+w*.6+d*.2+delta-spent));
};
function rDeleteAccount(id){
 const fs=rFinanceInit(),a=fs.accounts.find(x=>x.id===id);if(!a)return;
 if(!confirm('Eliminare il conto «'+a.name+'» dalla sola REGINA Calcio? Lo storico dei movimenti sarà conservato.'))return;
 fs.accounts=fs.accounts.filter(x=>x.id!==id);
 if(fs.enabled&&fs.baseline!=null)fs.baseline=cents(fs.baseline-rEurAmount(a,a.balance));
 save();render();
}
window.reginaFin.remove=rDeleteAccount;

function rAccountLastChange(a){return rEurAmount(a,(Number(a.balance)||0)-(Number(a.lastBalance)||0),true)}
total=function(){return cents(rFinanceInit().accounts.reduce((sum,a)=>sum+rEurAmount(a,a.balance),0))};
clubSectorStates=function(){const accounts=rFinanceInit().accounts;return CLUB_SECTORS.flatMap(([id,title])=>{
 let assigned=accounts.filter(a=>Number(a.allocations?.[id])>0);if(!assigned.length)return [];
 const bal=cents(assigned.reduce((sum,a)=>sum+rEurAmount(a,a.balance,true)*Number(a.allocations[id])/100,0));
 const base=cents(assigned.reduce((sum,a)=>sum+rEurAmount(a,a.baseline,true)*Number(a.allocations[id])/100,0));
 const previous=cents(assigned.reduce((sum,a)=>sum+rEurAmount(a,a.lastBalance,true)*Number(a.allocations[id])/100,0));
 const delta=cents(bal-base),recent=cents(bal-previous),scale=Math.max(250,Math.abs(base)*.35);
 const health=Math.round(rLim(6+4*Math.tanh(delta/scale))*10)/10;
 const label=health<4?'In difficoltà':health<5.5?'Sotto pressione':health<=6.5?'Stabile':health<8?'In crescita':'In ottima salute';
 return [{id,title,balance:bal,baseline:base,delta,recent,health,label,accounts:assigned.map(a=>a.id)}];
 });};
function rAmountEuro(t){if(Number.isFinite(t.amountEuro))return t.amountEuro;
 const fs=rFinanceInit(),a=fs.accounts.find(x=>x.name===t.accountName);return cents((Number(t.amount)||0)*(a?.rateEuro||1));}
graph=function(){
 let months=[],now=new Date();for(let i=5;i>=0;i--){let d=new Date(now.getFullYear(),now.getMonth()-i,1),key=d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0'),inc=0,exp=0;
 for(const t of rFinanceInit().transactions){if(!String(t.date).startsWith(key))continue;if(t.type==='income')inc+=rAmountEuro(t);if(t.type==='expense')exp+=rAmountEuro(t);if(t.feeEuro)exp+=t.feeEuro}
 months.push({key,inc,exp});}
 const max=Math.max(1,...months.flatMap(x=>[x.inc,x.exp]));
 return '<div class="fin-chart">'+months.map(x=>'<div><span class="fin-pair"><i style="height:'+Math.round(x.inc/max*90)+'px;background:#368f80"></i><i style="height:'+Math.round(x.exp/max*90)+'px;background:#d36f6f"></i></span><small>'+E(x.key.slice(5))+'</small></div>').join('')+'</div><p class="tiny muted">Entrate e uscite convertite in euro. Commissioni incluse nelle uscite; giroconti esclusi.</p>';
};
getMonth=function(){let key=TODAY().slice(0,7),inc=0,exp=0;for(const t of rFinanceInit().transactions){if(!String(t.date).startsWith(key))continue;if(t.type==='income')inc+=rAmountEuro(t);if(t.type==='expense')exp+=rAmountEuro(t);if(t.feeEuro)exp+=t.feeEuro;}return {inc:cents(inc),exp:cents(exp)}};
function rRecord(e){e.preventDefault();let fd=new FormData(e.target),fs=rFinanceInit(),type=fd.get('opType'),source=fs.accounts.find(a=>a.id===fd.get('from')),dest=fs.accounts.find(a=>a.id===fd.get('to'));
 let amount=Number(fd.get('amount')),fee=Math.max(0,Number(fd.get('fee')||0));if(!source||!(amount>0)||!Number.isFinite(fee))return alert('Inserisci conto e importi validi.');
 if(type==='transfer'&&(!dest||dest.id===source.id))return alert('Scegli un conto di destinazione diverso.');
 const originalSource=source.balance,originalDest=dest?.balance,oldLastSource=source.lastBalance,oldLastDest=dest?.lastBalance;
 source.lastBalance=source.balance;if(dest)dest.lastBalance=dest.balance;
 if(type==='income')source.balance=cents(source.balance+amount-fee);
 else if(type==='expense')source.balance=cents(source.balance-amount-fee);
 else if(type==='transfer'){source.balance=cents(source.balance-amount-fee);dest.balance=cents(dest.balance+amount*source.rateEuro/dest.rateEuro)}
 else return alert('Operazione non valida');
 if(!confirm('Registrare il movimento? '+(type==='transfer'?'Il conto destinazione riceverà il valore convertito al cambio impostato.':''))){source.balance=originalSource;source.lastBalance=oldLastSource;if(dest){dest.balance=originalDest;dest.lastBalance=oldLastDest}return;}
 const transaction={id:uid(),type,date:new Date().toISOString(),amount,amountEuro:rEurAmount(source,amount),fee,feeEuro:rEurAmount(source,fee),currency:source.currency,accountName:source.name,toName:dest?.name||'',category:type==='transfer'?'Giroconto':String(fd.get('category')||'Altro'),note:String(fd.get('note')||'').slice(0,150)};
 fs.transactions.unshift(transaction);save();render();
}
function rAddAccount(e){e.preventDefault();let fd=new FormData(e.target),name=String(fd.get('accName')||'').trim(),cur=String(fd.get('currency')||'EUR'),balance=Number(fd.get('accBalance')),rate=Number(fd.get('rateEuro'));if(!name||!R_CURRENCIES.includes(cur)||!Number.isFinite(balance)||!(rate>0))return alert('Nome, valuta, saldo e cambio validi obbligatori.');
 const fs=rFinanceInit();fs.accounts.push({id:uid(),name,balance:cents(balance),baseline:cents(balance),lastBalance:cents(balance),lastPressBalance:cents(balance),currency:cur,rateEuro:rate,baseRateEuro:rate,allocations:{},sectors:[],commissionRate:0});
 // baseline generale sempre espresso in euro; le successive variazioni sono confrontabili.
 if(fs.enabled&&fs.baseline!=null)fs.baseline=cents(fs.baseline+balance*rate);save();render();
}
function rAccountEdit(id){let fs=rFinanceInit(),a=fs.accounts.find(x=>x.id===id);if(!a)return;
 let val=prompt('Saldo attuale '+a.currency+' (prima '+a.balance+')',String(a.balance));if(val===null)return;
 val=Number(val.replace(',','.'));if(!Number.isFinite(val))return alert('Saldo non valido');
 let rate=prompt('Quanto vale 1 '+a.currency+' in EUR? Non modifica il riferimento iniziale.',String(a.rateEuro));if(rate===null)return;rate=Number(rate.replace(',','.'));if(!(rate>0))return alert('Tasso non valido');
 a.lastBalance=Number(a.balance);a.balance=cents(val);a.rateEuro=rate;
 fs.transactions.unshift({id:uid(),date:new Date().toISOString(),type:'reconcile',accountName:a.name,amount:cents(val-a.lastBalance),amountEuro:rEurAmount(a,val-a.lastBalance),category:'Aggiornamento saldo'});
 save();render();
}
function rSaveAlloc(id){let fs=rFinanceInit(),a=fs.accounts.find(x=>x.id===id);const area=document.getElementById('regina-alloc-'+id);if(!a||!area)return;
 let val={},sum=0;for(const input of area.querySelectorAll('input[data-sector]')){let number=Number(input.value||0);if(!Number.isFinite(number)||number<0||number>100)return alert('Percentuali da 0 a 100');if(number>0)val[input.dataset.sector]=number;sum+=number}
 if(sum>100.001)return alert('La somma delle percentuali non può superare il 100%.');
 a.allocations=val;a.sectors=Object.keys(val);save();render();
}
window.reginaFin.add=rAddAccount;window.reginaFin.update=rAccountEdit;window.reginaFin.record=rRecord;window.reginaFin.alloc=rSaveAlloc;
function rEuroStats(){const fs=rFinanceInit(),acc=fs.accounts;
 const body=acc.map(a=>'<tr><td>'+E(a.name)+'<br><small>'+E(a.currency)+'</small></td><td>'+Number(a.balance||0).toLocaleString('it-IT',{maximumFractionDigits:2})+' '+a.currency+'<br><small>≈ '+euro(rEurAmount(a,a.balance))+'</small></td><td>'+euro(rEurAmount(a,a.baseline,true))+'</td><td>'+euro(rAccountLastChange(a))+'</td><td><button class="btn alt tiny" onclick="reginaFin.update(\''+a.id+'\')">Aggiorna</button> <button class="btn alt tiny" onclick="reginaFin.remove(\''+a.id+'\')">✕</button></td></tr>').join('');
 const form='<form class="fin-grid" onsubmit="reginaFin.add(event)"><label>Conto<input name="accName" maxlength="60" required placeholder="Conto corrente"></label><label>Valuta<select name="currency" onchange="this.form.elements.rateEuro.value=this.value===\'EUR\'?1:\'\'">'+R_CURRENCIES.map(x=>'<option>'+x+'</option>').join('')+'</select></label><label>Saldo iniziale<input name="accBalance" type="number" step="0.01" required></label><label>1 unità vale €<input name="rateEuro" type="number" step="any" min="0.00000001" value="1" required></label><button class="btn">+ Aggiungi conto</button></form>';
 return '<h3>Conti e valute</h3><p class="muted tiny">La somma complessiva è in euro. I cambi si inseriscono manualmente. Il valore iniziale resta fisso in valuta e al cambio iniziale, indipendentemente dai successivi aggiornamenti.</p><div class="tablewrap"><table class="table"><tr><th>Conto</th><th>Saldo</th><th>Partenza €</th><th>Ultima variazione €</th><th></th></tr>'+body+'</table></div>'+form;
}
function rAllocationEditor(){const fs=rFinanceInit(),sectors=clubSectorStates();
 const forms=fs.accounts.map(a=>{
  const items=CLUB_SECTORS.map(([id,name])=>'<label>'+E(name)+' (%)<input type="number" min="0" max="100" step="1" data-sector="'+id+'" value="'+(Number(a.allocations[id])||0)+'"></label>').join('');
  return '<details class="fin-sector-account"><summary>'+E(a.name)+' · Ripartisci risorse (max 100%)</summary><div class="fin-grid" id="regina-alloc-'+E(a.id)+'">'+items+'</div><button class="btn alt" onclick="reginaFin.alloc(\''+a.id+'\')">Salva ripartizione</button></details>';
 }).join('');
 const states=sectors.map(s=>'<tr><td>'+E(s.title)+'</td><td>'+s.health.toFixed(1)+'/10</td><td>'+euro(s.baseline)+'</td><td>'+euro(s.balance)+'</td><td>'+euro(s.recent)+'</td></tr>').join('');
 return '<h3>🏟️ Settori finanziati</h3><p class="muted tiny">Il saldo di riferimento è quello iniziale. La variazione recente confronta il saldo attuale con la precedente immissione; gli effetti sul club usano il capitale iniziale come base. Gli importi sono ripartiti, mai moltiplicati tra settori.</p>'+forms+'<div class="tablewrap"><table class="table"><tr><th>Settore</th><th>Salute</th><th>Partenza</th><th>Attuale</th><th>Ultima variazione</th></tr>'+states+'</table></div>';
}
function rTransactionForm(){let fs=rFinanceInit(),options=fs.accounts.map(a=>'<option value="'+E(a.id)+'">'+E(a.name)+' ('+a.currency+')</option>').join('');
 return '<h3>Entrate, spese, giroconti e commissioni</h3><form class="fin-grid" onsubmit="reginaFin.record(event)">'+
 '<label>Tipo<select name="opType"><option value="expense">Uscita</option><option value="income">Entrata</option><option value="transfer">Giroconto</option></select></label>'+ 
 '<label>Conto di partenza<select name="from">'+options+'</select></label>'+ 
 '<label>Conto destinazione<select name="to"><option value="">—</option>'+options+'</select></label>'+ 
 '<label>Importo (valuta del conto)<input type="number" step="0.01" min="0.01" name="amount" required></label>'+ 
 '<label>Commissione (stessa valuta)<input type="number" step="0.01" min="0" name="fee" value="0"></label>'+ 
 '<label>Categoria<select name="category">'+CAT.map(x=>'<option>'+E(x)+'</option>').join('')+'</select></label>'+ 
 '<label>Nota<input name="note" maxlength="150"></label><button class="btn" '+(!fs.accounts.length?'disabled':'')+'>Registra movimento</button></form>';
}
const rPreviousFinanceView=financeView;
financeView=function(){rFinanceInit();let html=rPreviousFinanceView();
 const i=html.indexOf('<h3>Conti</h3>'),j=html.indexOf('<h3>Andamento degli ultimi sei mesi</h3>');
 if(i>=0&&j>i)html=html.slice(0,i)+rEuroStats()+rAllocationEditor()+rTransactionForm()+html.slice(j);
 // I riepiloghi originali si sostituiscono con valori effettivi in euro, senza
 // esporre dati di conti nel giornale.
 const mo=getMonth(),summary='<div class="fin-summary">'+[['Patrimonio complessivo',euro(total())],['Entrate del mese',euro(mo.inc)],['Uscite + commissioni',euro(mo.exp)],['Budget operativo',budget().toFixed(2)+' cr.'],['Budget trasferimenti',Number(st.budget||0).toFixed(2)+' cr.']].map(x=>'<div><small>'+x[0]+'</small><strong>'+x[1]+'</strong></div>').join('')+'</div>';
 html=html.replace(/<div class="fin-summary">[\s\S]*?<\/div><p class="tiny muted">/,(s)=>summary+'<p class="tiny muted">');
 return html;
};
// Aggiornamento automatico del delta recente dopo una pubblicazione della Gazzetta.
const rPreviousReport=sectorPressReport;
sectorPressReport=function(){
 const report=rPreviousReport();const states=clubSectorStates();
 const fs=rFinanceInit();if(fs.enabled){const changed=states.map(s=>{let pressDelta=rFinanceInit().accounts.filter(a=>Number(a.allocations?.[s.id])>0).reduce((tot,a)=>tot+rEurAmount(a,(Number(a.balance)||0)-(Number(a.lastPressBalance)||0),true)*Number(a.allocations[s.id])/100,0);return {...s,pressDelta:cents(pressDelta)};}).filter(s=>Math.abs(s.pressDelta)>=Math.max(80,Math.abs(s.baseline)*.04));
  for(const x of changed.slice(0,2))report.push(x.pressDelta>0?'Il settore '+x.title.toLowerCase()+' registra un miglioramento sensibile delle risorse rispetto al precedente aggiornamento.':'Le ultime disponibilità del settore '+x.title.toLowerCase()+' risultano in calo rispetto al controllo precedente.');
 }
 for(const a of fs.accounts)a.lastPressBalance=a.balance;
 save();return report;
};
// Personale e Primavera: effetti graduali, non comandi tattici.
const rOldFinishEffects=finishEffects;
finishEffects=function(metrics){
 rOldFinishEffects(metrics);
 const fs=rFinanceInit();if(!fs.enabled)return;
 const states=clubSectorStates(),get=id=>states.find(x=>x.id===id)?.health??6;
 const doctors=get('doctors'),trainers=get('trainers');
 for(const p of MY_SQ()){
  if(Number(p.injured)>0&&doctors>6.5&&Math.random()<Math.min(.25,(doctors-6)*.045))p.injured=Math.max(0,p.injured-1);
  if(Number.isFinite(p.fitness))p.fitness=+rLim(p.fitness+(trainers-6)*.045).toFixed(2);
 }
};
function rGenerateYouth(){
 if(!rFinanceInit().enabled)return;
 const academy=clubSectorStates().find(x=>x.id==='academy');if(!academy)return;
 const level=academy.health,scouting=clubSectorStates().find(x=>x.id==='scouting')?.health||6;
 const given=['Andrea','Matteo','Lorenzo','Samuele','Davide','Edoardo','Riccardo','Alessio'];
 const surnames=['Ricci','Marini','Ferrari','Conti','Moretti','Romano','Serra','Galli','Rossi','Costa'];
 const seed=Number(st.season||1)*13+st.club.length+Math.round(level*4),name=given[seed%given.length]+' '+surnames[(seed*3+Math.round(scouting))%surnames.length];
 const quality=+rLim(2.1+level*.30+Math.max(0,scouting-6)*.11+Math.random()*.75,1,8.5).toFixed(3);
 const positions=['A','C','D','P'];let pos=positions[seed%4];
 st.reginaYouth=st.reginaYouth||[];
 st.reginaYouth.unshift({id:'primavera-'+st.season+'-'+seed,name,pos,tech:quality,age:18,club:st.club,fitness:6.5,mental:6.2,injured:0,red:0,out:false,generated:true});
 st.reginaYouth=st.reginaYouth.slice(0,8);
}
function rPromoteYouth(id){
 let x=(st.reginaYouth||[]).find(x=>x.id===id&&x.club===st.club);if(!x)return;
 if(MY_SQ().length>=25)return alert('La rosa contiene già 25 calciatori. Libera un posto tramite il mercato prima di promuovere questo giovane.');
 if(!confirm('Promuovere '+x.name+' in prima squadra?'))return;
 MY_SQ().push(x);st.reginaYouth=st.reginaYouth.filter(y=>y.id!==id);persist();render();
}
window.reginaYouth={promote:rPromoteYouth};
const rBeforeFinanceYouth=financeView;
financeView=function(){let html=rBeforeFinanceYouth();let prospects=(st.reginaYouth||[]).filter(x=>x.club===st.club);
 if(!prospects.length)return html;
 let block='<section class="card"><h3>🌱 Primavera · giovani osservati</h3><p class="muted">Nuovi talenti generati fra una stagione e la successiva. La salute del settore giovanile e dello scouting influisce sulla qualità, non sostituisce i risultati degli obiettivi.</p>'+prospects.map(x=>'<div class="row outrow"><strong>'+E(x.name)+' · '+x.pos+' · tecnica '+x.tech.toFixed(1)+'</strong> <button class="btn alt" onclick="reginaYouth.promote(\''+x.id+'\')">Promuovi</button></div>').join('')+'</section>';
 return html+block;
};
// G. Carriera: storia stagionale, offerte, promozioni/retrocessioni sui 100 club.
function rMembership(){return Object.fromEntries(Object.entries(teams).map(([k,items])=>[k,items.map(t=>t.id)]))}
function rApplyMembership(members){if(!members)return;const byID=new Map(ALLCLUBS.map(x=>[x.id,x]));
 for(const [g,ids] of Object.entries(members)){if(!teams[g]||!Array.isArray(ids)||ids.length!==20)continue;teams[g]=ids.map(id=>byID.get(id)).filter(Boolean);for(const t of teams[g])t.league=g;}
}
if(st?.reginaMembership)rApplyMembership(st.reginaMembership);
function rCareerHistory(){return st.reginaCareerHistory||(st.reginaCareerHistory=[])}
function rReputation(){return Math.round(rLim(st?.reginaReputation??50,0,100));}
function rRewardReputation(entry){let gain=entry.placing<=3?9:entry.placing<=8?3:entry.placing>=17?-7:-1;if(entry.promoted)gain+=8;return Math.round(rLim(rReputation()+gain,0,100));}
function rSortTeams(){return [...ALLCLUBS].filter(x=>x.id!==st.club).sort((a,b)=>(a.league==='A'?3:a.league==='B'?2:1)-(b.league==='A'?3:b.league==='B'?2:1));}
function rCareerOffers(){let rep=rReputation(),oldClub=teamById(st.club),all=rSortTeams(),select=[];
 for(const league of (rep>=75?['A','B','C_A','C_B','C_C']:rep>=45?['B','C_A','C_B','C_C','A']:['C_A','C_B','C_C','B'])){
  const available=all.filter(t=>t.league===league&&t.id!==st.club&&!select.some(x=>x.id===t.id));if(!available.length)continue;
  available.sort((x,y)=>(Math.abs((x.mv||5)-(oldClub?.mv||5)))-(Math.abs((y.mv||5)-(oldClub?.mv||5))));
  const ix=(st.season*3+league.length+rep)%Math.min(available.length,7);select.push(available[ix]);if(select.length>=3)break;
 }
 return select.map(x=>({id:x.id,name:x.name,league:x.league}));
}
function rLeagueTransfers(){
 let p=st.postseason;if(!p)return {promoted:false,relegated:false,notice:'Nessuna fase finale'};
 const before=teamById(st.club)?.league||st.league;
 let move=(id,to)=>{const old=teamById(id)?.league;if(!old||old===to)return false;
  let ix=teams[old].findIndex(t=>t.id===id);if(ix<0)return false;
  let [t]=teams[old].splice(ix,1);t.league=to;teams[to].push(t);return true};
 const inLeague=(ids,league)=>[...new Set(ids)].filter(id=>teamById(id)?.league===league);
 let upB=inLeague(p.autopromoted||[],'B'),downA=inLeague(p.relegated||[],'A');
 let upC=inLeague(p.autopromoted||[],'C_A').concat(inLeague(p.autopromoted||[],'C_B'),inLeague(p.autopromoted||[],'C_C'));
 let downB=inLeague(p.relegated||[],'B');
 while(upB.length<3){let x=sortedStandings('B').find(t=>!upB.includes(t.id));if(!x)break;upB.push(x.id)}
 while(downA.length<3){let x=sortedStandings('A').slice().reverse().find(t=>!downA.includes(t.id));if(!x)break;downA.push(x.id)}
 // Passano in A tre club B; A rimane di 20 squadre.
 for(const id of downA.slice(0,3))move(id,'B');for(const id of upB.slice(0,3))move(id,'A');
 // Quattro squadre dalla C alla B e quattro dalla B alla C, una per posto liberato.
 while(downB.length<upC.length){let x=sortedStandings('B').slice().reverse().find(t=>!downB.includes(t.id)&&teamById(t.id).league==='B');if(!x)break;downB.push(x.id)}
 for(let i=0;i<Math.min(upC.length,downB.length);i++){
  const source=teamById(upC[i])?.league;if(!source)continue;
  move(downB[i],source);move(upC[i],'B');
 }
 return {promoted:(before.startsWith('C')&&teamById(st.club).league==='B')||(before==='B'&&teamById(st.club).league==='A'),relegated:(before==='A'&&teamById(st.club).league==='B')||(before==='B'&&teamById(st.club).league.startsWith('C'))};
}
function rNextSeason(offerId){
 if(!st||!(st.finished&&st.postseason?.done))return alert('La stagione corrente non è ancora conclusa.');
 if(!confirm('Cominciare una nuova stagione? Carriera, giornali e obiettivi saranno conservati.'))return;
 const oldClub=st.club,oldLeague=teamById(oldClub)?.league||st.league,rank=sortedStandings(oldLeague).findIndex(x=>x.id===oldClub)+1;
 let result=rLeagueTransfers(),career=rCareerHistory();career.push({season:st.season,club:oldClub,clubName:teamById(oldClub)?.name||oldClub,league:oldLeague,placing:rank,points:st.standings[oldClub]?.pts||0,promoted:result.promoted,relegated:result.relegated,date:TODAY()});
 st.reginaReputation=rRewardReputation(career.at(-1));st.reginaMembership=rMembership();
 let offers=st.reginaManagerOffers||[];if(offerId&&offers.some(x=>x.id===offerId))st.club=offerId;
 st.league=teamById(st.club)?.league||st.league;
 st.season=(Number(st.season)||1)+1;rGenerateYouth();st.game=0;st.finished=false;st.postseason=null;st.fixtures=createFixtures();st.fixture=st.fixtures[st.league];st.marketOpen=false;st.offers=[];st.marketSeen=[];
 st.standings=Object.fromEntries(ALLCLUBS.map(t=>[t.id,{p:0,w:0,d:0,l:0,gf:0,ga:0,pts:0}]));
 st.lineup=autoLineupFor(st,st.club);st.reginaManagerOffers=[];
 // La giornata successiva è già stata avanzata dal motore della stagione conclusa.
 st.reginaSeasonStart=st.nextDay;selectedReport=0;view='today';persist();render();
}
function rCareerView(){if(!st)return '';
 const eligible=!!(st.finished&&st.postseason?.done),hist=rCareerHistory();if(eligible&&(!st.reginaManagerOffers||!st.reginaManagerOffers.length)){
  st.reginaManagerOffers=rCareerOffers();persist();
 }
 return '<section class="card"><h3>🏆 Carriera dell’allenatore · stagione '+E(st.season||1)+'</h3><p>Reputazione: <b>'+rReputation()+'/100</b> · Squadra attuale: <b>'+E(teamById(st.club)?.name||'')+'</b></p>'+
 (eligible?'<div class="notice"><b>Stagione conclusa.</b> Puoi restare alla guida della squadra oppure accettare una proposta di un altro club.</div>'+ 
 '<button class="btn" onclick="reginaCareer.next()">Prosegui con la mia squadra →</button>'+ 
 (st.reginaManagerOffers||[]).map(o=>'<div class="row outrow"><b>'+E(o.name)+' · '+E(GROUPN[o.league])+'</b> <button class="btn alt" onclick="reginaCareer.next(\''+o.id+'\')">Accetta offerta e inizia stagione</button></div>').join(''):'<p class="muted">Le offerte di allenatore arrivano a stagione conclusa, in base alla tua reputazione e ai risultati.</p>')+
 (hist.length?'<details><summary>Albo delle stagioni precedenti ('+hist.length+')</summary>'+hist.slice().reverse().map(h=>'<p class="tiny">'+E(h.season)+' · '+E(h.clubName)+' · '+E(GROUPN[h.league]||h.league)+' · '+h.placing+'° posto, '+h.points+' punti'+(h.promoted?' · ⬆️ Promozione':h.relegated?' · ⬇️ Retrocessione':'')+'</p>').join('')+'</details>':'')+'</section>';
}
window.reginaCareer={next:rNextSeason};
const rOldTodayView=todayView;
todayView=function(){let html=rOldTodayView();if(!st)return html;
 const t=rSpecialTriggers();let info=[];
 if(t.goals)info.push('⚽ '+t.goals+' '+(t.goals===1?'gol garantito':'gol garantiti')+' da tappe decisive');
 if(t.crits.length)info.push('🟥 '+t.crits.length+' '+(t.crits.length===1?'evento critico obbligatorio':'eventi critici obbligatori'));
 if(t.rewards)info.push('🟢 '+t.rewards+' '+(t.rewards===1?'premio probabilistico':'premi probabilistici'));
 if(t.risk)info.push('🟠 '+t.risk+' '+(t.risk===1?'rischio probabilistico':'rischi probabilistici'));
 if(!info.length)return html;
 return '<section class="card"><h3>⚡ Impatto speciale della giornata</h3><p>'+E(info.join(' · '))+'</p><p class="tiny muted">Critico e decisivo garantiscono un evento in campo, non l’esito della partita. Il risultato considera anche la forza delle due squadre e la condizione dei giocatori.</p></section>'+html;
};
const rOldLeagueView=leagueView;leagueView=function(){return rOldLeagueView()+rCareerView()};
const rOldSettingsView=settingsView;settingsView=function(){return rOldSettingsView()+rCareerView()+'<p class="muted tiny">REGINA Calcio '+RV1+' · aggiornamento consolidato. I dati rimangono nel dispositivo; esegui regolarmente un backup completo.</p>'};
// H. Versione sempre visibile senza modificare il file centrale.
const rOriginalHeader=header;
header=function(){return rOriginalHeader().replace('</nav>','<span class="regina-v1-badge">v'+RV1+'</span></nav>')};
const rStyles=document.createElement('style');rStyles.textContent=`
.regina-v1-effects{border:1px solid #b5cedd;border-radius:12px;padding:13px;margin:12px 0}.regina-v1-effects legend{font-weight:800}
.regina-v1-effects-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px}.regina-v1-effects select{max-width:100%}
.regina-v1-badges{display:block;color:#315e81;margin-top:4px;line-height:1.45}
.regina-v1-badge{font-size:11px;padding:6px;background:#184f60;color:#fff;border-radius:9px}
.regina-planner{margin:16px 0 20px;border:1px solid #afced9;padding:13px;border-radius:12px;background:#f5fafb}
.regina-planner h3{margin:0}.regina-pl-toolbar{margin:15px 0;gap:8px;flex-wrap:wrap}
.regina-pl-scroll{overflow-x:auto;overscroll-behavior-x:contain;padding-bottom:11px;scrollbar-width:thin}
.regina-pl-week{display:grid;grid-template-columns:repeat(7,minmax(184px,1fr));gap:8px;min-width:1280px;align-items:start}
.regina-pl-day{border:1px solid #d3e1e8;border-radius:10px;background:white;padding:7px}.regina-pl-day h4{margin:0 0 7px;text-align:center;padding:8px;border-radius:8px}
.regina-pl-day h4.regina-pl-today{background:#d9efe7}.regina-pl-drop{border:1px dashed #d5e2ea;min-height:66px;padding:5px;margin-bottom:7px;border-radius:7px}
.regina-pl-drop>small{display:block;color:#607782;margin-bottom:4px}.regina-pl-over{background:#d7ebf5;border-color:#4088b1}
.regina-pl-item{display:flex;gap:6px;align-items:center;flex-wrap:wrap;border:1px solid #cad7d9;border-radius:7px;background:#fff;padding:7px;margin:4px 0;touch-action:pan-y;cursor:grab}
.regina-pl-item.is-done{opacity:.64}.regina-pl-grip{font-size:18px;color:#7c9aa3}.regina-pl-title{font-weight:650;font-size:12px;flex:1;min-width:85px}
.regina-pl-item .regina-v1-badges{font-size:10px;flex-basis:100%}.regina-pl-edit{border:1px solid #cbd8df;border-radius:6px;background:#f5f8f9;padding:4px 7px}
.regina-pl-dragging{outline:2px solid #0e88a4}.regina-pl-backlog{margin-top:15px}.regina-pl-backfront{margin:7px 0;border:1px solid #d7e4e9;border-radius:8px;padding:9px}
.regina-pl-backfront summary{cursor:pointer;font-weight:700}.regina-pl-backfront .regina-pl-item{max-width:470px}
@media(max-width:650px){.regina-pl-toolbar .btn{font-size:11px;padding:7px}.regina-planner{padding:8px}.regina-pl-day{min-width:178px}}
`;
document.head.appendChild(rStyles);


// ============================================================================
// REGINA CALCIO 1.1 — valutazione giornaliera, partite, calendario e storico
// Nessuna modifica alle chiavi esistenti di carriera, obiettivi e finanze.
// ============================================================================

// I. Valutazione personale 0–10. I fronti senza attività NON producono penalità.
// Le giornate già disputate sono fotografate prima della partita: modifiche
// successive alle tappe non alterano retroattivamente i voti già archiviati.
function r11ReviewLive(day){
 const g=rGoalStore(),fronts=new Map((g.fronts||[]).map(f=>[f.id,f.title]));
 const arr=goalListForDay(day).filter(t=>t?.title&&!t.archived&&!(day<TODAY()&&t.virtual)&&
  (goalStamp(t.due||t.deadlineDate)===day||t.footballCreditDay===day||goalStamp(t.occurrenceDate)===day));
 const records=[],seen=new Set();
 for(const t of arr){
  const key=t.repeat&&t.repeat!=='none'?(rRef(t)+'|'+day):String(t.id);
  if(seen.has(key))continue;seen.add(key);
  const difficulty=rTaskMeta(t).difficulty;
  const fraction=t.status==='done'?1:t.status==='failed'?0:rLim(Number(t.progressFraction)||0,0,1);
  records.push({name:String(t.title),front:fronts.get(t.frontId)||'Senza fronte',difficulty,
   fraction:+fraction.toFixed(4),completed:fraction>=1,partial:fraction>0&&fraction<1});
 }
 let weight=records.reduce((v,t)=>v+t.difficulty,0);
 const points=records.reduce((v,t)=>v+t.difficulty*t.fraction,0);
 const grade=weight?Math.round(100*points/weight)/10:null;
 const done=records.filter(t=>t.completed),partial=records.filter(t=>t.partial),missing=records.filter(t=>t.fraction===0);
 const sort=(a,b)=>b.difficulty-a.difficulty||a.name.localeCompare(b.name,'it');
 return {day,grade,number:records.length,done:done.length,part:partial.length,missed:missing.length,
  records:records.sort(sort),savedAt:new Date().toISOString()};
}
function r11Review(day){return st?.reginaDailyReviews?.[day]||r11ReviewLive(day)}
function r11ReviewDescription(x){
 if(!x.number)return '<p class="muted">Nessuna attività programmata: nessun voto personale assegnato.</p>';
 const status=x.day>=TODAY()&&!st?.reginaDailyReviews?.[x.day]?'ancora in corso':'conclusa';
 const missing=x.records.filter(r=>r.fraction===0),partial=x.records.filter(r=>r.fraction>0&&r.fraction<1),done=x.records.filter(r=>r.fraction>=1);
 let out='<p><b>'+x.done+' completate</b> su '+x.number+', '+x.part+' parziali e '+x.missed+' non svolte. La giornata è '+status+'. Il voto pesa ogni attività in base alla difficoltà (1–5).</p>';
 if(done.length)out+='<p><b>Attività completate:</b> '+done.slice(0,6).map(t=>E(t.name)+' (difficoltà '+t.difficulty+')').join('; ')+(done.length>6?'; e altre '+(done.length-6):'')+'.</p>';
 if(missing.length)out+='<p><b>Non svolte:</b> '+missing.map(t=>E(t.name)+' <span class="regina-review-detail">('+E(t.front)+', difficoltà '+t.difficulty+')</span>').join('; ')+'.</p>';
 if(partial.length)out+='<p><b>Rimaste incomplete:</b> '+partial.map(t=>E(t.name)+' <b>'+Math.round(t.fraction*100)+'%</b> <span class="regina-review-detail">('+E(t.front)+', difficoltà '+t.difficulty+')</span>').join('; ')+'.</p>';
 if(!missing.length&&!partial.length)out+='<p>Tutte le attività programmate sono state completate.</p>';
 return out;
}
function r11WeekStrip(day){
 const start=rWeekStart(day);const days=Array.from({length:7},(_,i)=>PLUS(start,i));
 let scores=[];
 const strip=days.map(d=>{const review=r11Review(d),n=review.grade;
  if(n!=null&&d<=TODAY())scores.push(n);
  return '<button type="button" class="regina-review-day '+(d===day?'selected':'')+'" onclick="reginaReview.select(\''+d+'\')"><small>'+new Date(d+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric'})+'</small><b>'+(n==null||d>TODAY()?'—':n.toFixed(1))+'</b></button>';
 }).join('');
 const avg=scores.length?(scores.reduce((a,b)=>a+b,0)/scores.length).toFixed(1):'—';
 const mon=day.slice(0,7),n=new Date(Number(day.slice(0,4)),Number(day.slice(5,7)),0).getDate();let monthly=[];
 for(let i=1;i<=n;i++){let d=mon+'-'+String(i).padStart(2,'0');if(d>TODAY())break;let v=r11Review(d).grade;if(v!=null)monthly.push(v)}
 const ma=monthly.length?(monthly.reduce((a,b)=>a+b,0)/monthly.length).toFixed(1):'—';
 return '<div class="regina-review-strip">'+strip+'</div><p class="tiny muted">Media della settimana: <b>'+avg+'</b> · Media del mese: <b>'+ma+'</b>. I giorni senza tappe non ricevono voto.</p>';
}
let r11ReviewDay=TODAY();
window.reginaReview={select(day){if(!rD(day))return;r11ReviewDay=day;render()}};
function r11ReviewPanel(){const x=r11Review(r11ReviewDay);const archived=!!st?.reginaDailyReviews?.[x.day];
 return '<section class="card regina-review" aria-label="Valutazione giornaliera"><div class="row spread"><div><h3>📊 La mia giornata</h3><p class="muted tiny">Voto personale basato sulle tappe, senza bonus calcistici aggiuntivi.</p></div><strong class="regina-review-score">'+(x.grade==null?'—':x.grade.toFixed(1)+'/10')+'</strong></div>'+ 
 '<label class="label">Giornata <input type="date" value="'+r11ReviewDay+'" onchange="reginaReview.select(this.value)"></label>'+r11WeekStrip(r11ReviewDay)+r11ReviewDescription(x)+
 (archived?'<p class="tiny muted">Valutazione archiviata al termine della partita: non cambia se modifichi successivamente gli obiettivi.</p>':
 r11ReviewDay<TODAY()?'<p class="tiny muted">Giornata ricostruita dalle tappe ancora disponibili: i dati storici precedenti all’aggiornamento potrebbero essere incompleti.</p>':'')+
 '</section>';
}
const r11BaseObjectives=objectivesView;
objectivesView=function(){return r11ReviewPanel()+r11BaseObjectives()};
// Congela il giudizio soltanto dopo una simulazione terminata correttamente.
const r11OldRound=simulateRound;
simulateRound=function(){
 const day=st?.nextDay,review=day&&!st?.reginaDailyReviews?.[day]?r11ReviewLive(day):null;
 const initial=st?.results?.length||0;
 const result=r11OldRound();
 if(st&&review&&(st.results||[]).length>initial){st.reginaDailyReviews=st.reginaDailyReviews||{};st.reginaDailyReviews[day]=review;persist()}
 return result;
};
const r11OldPost=playPostDay;
playPostDay=function(){
 const day=st?.nextDay,review=day&&!st?.reginaDailyReviews?.[day]?r11ReviewLive(day):null;
 const initial=st?.results?.length||0;
 const result=r11OldPost();
 if(st&&review&&(st.results||[]).length>initial){st.reginaDailyReviews=st.reginaDailyReviews||{};st.reginaDailyReviews[day]=review;persist()}
 return result;
};

// II. Partite: sinergia tra motivazione, forma fisica, lucidità e disciplina,
// eventi aggiuntivi coerenti e statistiche sempre compatibili con i gol.
function r11GameSynergy(m){
 if(!m)return null;
 let x={...m};let fitness=rLim(x.fitness),mental=rLim(x.mental),discipline=rLim(x.discipline),tactics=rLim(x.tactics);
 // La preparazione della giornata domina; la sinergia è contenuta a ±0,55.
 let teamwork=Math.max(-.55,Math.min(.55,((fitness+mental)/2-5.5)*.075+((tactics+discipline)/2-5.5)*.04));
 x.fitness=rLim(fitness+teamwork*.36);x.mental=rLim(mental+teamwork*.36);
 x.tactics=rLim(tactics+teamwork*.34);x.discipline=rLim(discipline+teamwork*.24);
 return x;
}
function r11MatchFix(m){
 if(!m?.stats||!m.a||!m.b)return m;
 for(const [idx,side] of [[0,m.a],[1,m.b]]){
  const goals=side===m.a?m.ga:m.gb,shots=m.events.filter(x=>x.side===side&&['gol','occasione','rigore_sbagliato'].includes(x.type)).length;
  if(Array.isArray(m.stats.onTarget))m.stats.onTarget[idx]=Math.max(goals,Number(m.stats.onTarget[idx])||0);
  if(Array.isArray(m.stats.shots))m.stats.shots[idx]=Math.max(goals,shots,Number(m.stats.onTarget?.[idx])||0,Number(m.stats.shots[idx])||0);
  const cards=m.events.filter(x=>x.side===side&&['giallo','rosso'].includes(x.type)).length;
  if(Array.isArray(m.stats.fouls))m.stats.fouls[idx]=Math.max(cards,Number(m.stats.fouls[idx])||0);
 }
 if(Array.isArray(m.stats.possession)){
  const home=rLim(Number(m.stats.possession[0])||50,19,81);
  m.stats.possession=[Math.round(home),100-Math.round(home)];
 }
 return m;
}
const r11PreviousMatch=calcMatch;
calcMatch=function(a,b,ma=null,mb=null){
 // Nessuna tattica selezionabile: dipende soltanto dalla condizione risultante
 // dagli obiettivi e dalle capacità dei giocatori.
 const m=r11PreviousMatch(a,b,r11GameSynergy(ma),r11GameSynergy(mb));
 if(!m?.events)return m;
 const mine=st?.club,own=mine===a||mine===b?mine:null,opp=own===a?b:a;
 if(own&&m.metrics?.[own]){
  const cond=m.metrics[own];const spirit=(rLim(cond.mental)+rLim(cond.fitness))/2;
  const behind=own===a?m.ga<m.gb:m.gb<m.ga;
  // Una squadra motivata e resistente può trovare una reazione nel finale.
  // Non è un bonus garantito: la forza degli avversari resta determinante.
  if(behind&&spirit>=7.2&&Math.random()<Math.min(.16,.035+(spirit-7.2)*.043)){
   rAddGoal(m,own,78+Math.floor(Math.random()*13),false);
   m.reginaLateReaction=true;
  }
  // Un crollo fisico profondo può concedere un'occasione in più all'avversario.
  if(rLim(cond.fitness)<2.4&&Math.random()<Math.min(.14,(2.4-rLim(cond.fitness))*.08)){
   const p=rWeightedName(m,opp);
   m.events.push({side:opp,minute:75+Math.floor(Math.random()*16),type:'occasione',name:p?.name||teamById(opp)?.name||'Avversario',
    action:'conclusione ravvicinata su una difesa stanca',outcome:'parata',opponent:(m.lineups?.[own]||[]).map(id=>m.playerNames?.[id]).find(x=>x?.pos==='P')?.name||'il portiere'});
   if(Array.isArray(m.stats?.shots))m.stats.shots[opp===a?0:1]++;
  }
 }
 m.events.sort((x,y)=>(x.minute||0)-(y.minute||0));
 r11MatchFix(m);normalizeMatchVotes(m);
 return m;
};
// La Gazzetta lascia intuire le ragioni della prestazione, senza spiegoni
// matematici, falsi fatti o un nuovo pannello «Perché questo risultato?».
const r11NarrativeBefore=rMatchNarrative;
rMatchNarrative=function(m){
 let prose=r11NarrativeBefore(m);if(!m?.stats)return prose;
 const mine=st?.club;if(m.a!==mine&&m.b!==mine)return prose;
 const i=m.a===mine?0:1,j=1-i,shots=m.stats.shots||[0,0],onTarget=m.stats.onTarget||[0,0];
 const red=m.events.filter(x=>x.type==='rosso'&&x.side===mine).length;
 const positives=[];
 if(red&&Number(shots[i])<Number(shots[j]))positives.push('L’inferiorità numerica costringe la squadra a una gara di sacrificio, lasciando più conclusioni agli avversari.');
 else if(Number(shots[i])>=Number(shots[j])+6)positives.push('Il volume di gioco premia la squadra, che chiude con '+shots[i]+' tiri contro '+shots[j]+' dei rivali.');
 else if(Number(shots[j])>=Number(shots[i])+6)positives.push('La pressione avversaria è evidente nei numeri: '+shots[j]+' conclusioni contro '+shots[i]+'.');
 else if(Number(onTarget[i])>=5&&Number(onTarget[j])>=5)positives.push('Da entrambe le parti i portieri sono chiamati a intervenire ripetutamente.');
 if(m.reginaLateReaction)positives.push('Nel finale arriva un sussulto di orgoglio che mantiene viva la partita fino all’ultimo.');
 return prose+(positives.length?' '+positives.slice(0,2).join(' '):'');
};

// III. Calendario: oltre al trascinamento, un solo tocco apre data e fascia.
const r11OldPlanItem=rPlanItem;
rPlanItem=function(t,where){
 const html=r11OldPlanItem(t,where),arg=E(JSON.stringify(String(t.id)));
 return html.replace(/<\/div>$/,'<button type="button" class="regina-pl-edit" onclick="reginaPlan.quick('+arg+')" title="Sposta senza trascinare">📅</button></div>');
};
function r11QuickClose(){document.getElementById('regina-quick-layer')?.remove();document.body.classList.remove('regina-quick-open')}
function r11QuickMove(id){
 let task=rCurrentTask(rGoalStore(),id);if(!task)return;
 const layer=document.createElement('div');layer.id='regina-quick-layer';layer.className='regina-quick-layer';
 const current=rD(String(task.due||'').slice(0,10))||TODAY();
 layer.innerHTML='<div class="regina-quick-dialog" role="dialog" aria-modal="true" aria-label="Sposta tappa">'+
 '<h3>📅 Sposta la tappa</h3><p><b>'+E(task.title)+'</b></p><label class="label">Giorno<input type="date" name="day" value="'+current+'"></label>'+ 
 '<label class="label">Fascia'+rSelect('slot',R_SLOTS,rTaskMeta(task).slot)+'</label>'+ 
 '<div class="row"><button type="button" class="btn" id="regina-quick-submit">Sposta</button><button type="button" class="btn alt" id="regina-quick-cancel">Annulla</button></div>'+ 
 (task.repeat&&task.repeat!=='none'?'<p class="tiny muted">Verrà spostata soltanto questa occorrenza, non l’intera serie.</p>':'')+'</div>';
 document.body.appendChild(layer);document.body.classList.add('regina-quick-open');
 layer.addEventListener('click',e=>{if(e.target===layer||e.target.id==='regina-quick-cancel')r11QuickClose()});
 layer.querySelector('#regina-quick-submit').onclick=()=>{
  const day=layer.querySelector('[name=day]').value,slot=layer.querySelector('[name=slot]').value;
  if(!rD(day))return alert('Scegli una data valida.');
  r11QuickClose();const y=window.scrollY;
  // Durante il render di spostamento conserva almeno il punto verticale.
  if(rMoveTask(id,day,slot))requestAnimationFrame(()=>window.scrollTo(0,y));
 };
}
window.reginaPlan.quick=r11QuickMove;
window.reginaPlan.quickClose=r11QuickClose;

// IV. Finanze: fotografia giornaliera dei conti, archivio storico e calendario.
// Primo punto storico = giorno dell'installazione della 1.1; dati anteriori
// non vengono inventati. Snapshot intragiornalieri mantengono ogni modifica.
function r11History(){
 const fs=rFinanceInit();if(!fs.reginaFinanceHistory11||!Array.isArray(fs.reginaFinanceHistory11.snapshots))
  fs.reginaFinanceHistory11={version:1,started:TODAY(),snapshots:[],manual:[]};
 const h=fs.reginaFinanceHistory11;h.manual=Array.isArray(h.manual)?h.manual:[];
 return h;
}
function r11FinanceState(){
 return rFinanceInit().accounts.map(a=>({id:String(a.id),name:String(a.name),
  currency:String(a.currency||'EUR'),balance:Number(a.balance)||0,rateEuro:Number(a.rateEuro)||1}));
}
function r11SameFinanceState(a,b){return JSON.stringify(a)===JSON.stringify(b)}
function r11RecordSnapshot(){
 const h=r11History(),accounts=r11FinanceState(),last=h.snapshots.at(-1);
 if(last&&r11SameFinanceState(last.accounts,accounts))return false;
 h.snapshots.push({date:TODAY(),at:new Date().toISOString(),accounts});
 return true;
}
// Seed conservativo prima delle prime modifiche 1.1; NON ricostruisce il passato.
(function(){
 try{const h=r11History();if(!h.snapshots.length&&rFinanceInit().accounts.length){r11RecordSnapshot();const ok=save();if(!ok)console.warn('REGINA: storico finanziario non persistito');}}catch(e){console.warn('REGINA: inizializzazione storico',e)}
})();
const r11PreviousFinanceSave=save;
save=function(){
 try{r11RecordSnapshot()}catch(e){console.warn('REGINA: impossibile fotografare i saldi',e)}
 return r11PreviousFinanceSave();
};
let r11HistDay=TODAY(),r11HistMonth=TODAY().slice(0,7),r11HistMode='month',r11CompareDay=PLUS(TODAY(),-30);
function r11HistoryAsOf(day){
 const h=r11History();
 const snap=[...h.snapshots].reverse().find(x=>x.date<=day);
 const data=new Map((snap?.accounts||[]).map(a=>[String(a.id),{...a,lastDate:snap.date,source:'auto'}]));
 // Le registrazioni manuali integrate si applicano dalla data dichiarata;
 // una fotografia successiva prevale su valori manuali più vecchi.
 const manual=h.manual.filter(x=>x.date<=day && (!snap||x.date>=snap.date)).sort((a,b)=>a.date.localeCompare(b.date)||String(a.at).localeCompare(String(b.at)));
 for(const x of manual){data.set(String(x.id),{...x,lastDate:x.date,source:'manuale'})}
 const rows=[...data.values()];const sum=rows.reduce((n,a)=>n+(Number(a.balance)||0)*(Number(a.rateEuro)||1),0);
 const first=h.snapshots[0]?.date||h.started;
 const complete=Boolean(snap&&day>=first); // Il prima non può essere inferito.
 return {date:day,rows,total:rows.length?cents(sum):null,complete,
  recent:rows.length&&rows.every(a=>a.lastDate===day)};
}
function r11ShiftMonth(month,delta){const [y,m]=month.split('-').map(Number);const d=new Date(y,m-1+delta,1);
 return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0');}
function r11HistoryCalendar(){
 let [y,m]=r11HistMonth.split('-').map(Number),days=new Date(y,m,0).getDate();
 const start=(new Date(y,m-1,1).getDay()+6)%7;
 let html='<div class="regina-fin-cal-head"><button class="btn alt" onclick="reginaHistory.month(-1)">‹</button><b>'+new Date(y,m-1,1).toLocaleDateString('it-IT',{month:'long',year:'numeric'})+'</b><button class="btn alt" onclick="reginaHistory.month(1)">›</button></div>';
 html+='<div class="regina-fin-calendar">'+['L','M','M','G','V','S','D'].map(x=>'<span class="regina-fin-dayhead">'+x+'</span>').join('');
 for(let i=0;i<start;i++)html+='<span></span>';
 for(let i=1;i<=days;i++){
  const day=r11HistMonth+'-'+String(i).padStart(2,'0'),v=day<=TODAY()?r11HistoryAsOf(day):null;
  const vText=v?.total==null?'—':Math.round(v.total).toLocaleString('it-IT')+' €';
  html+='<button type="button" '+(day>TODAY()?'disabled':'')+' class="regina-fin-calday '+(day===r11HistDay?'selected':'')+'" onclick="reginaHistory.day(\''+day+'\')"><strong>'+i+'</strong><small>'+E(vText)+'</small></button>';
 }
 return html+'</div>';
}
function r11FinanceBreakdown(day){
 const h=r11HistoryAsOf(day);
 if(h.total==null)return '<p class="muted">Nessun saldo storico disponibile per questa data. Inserisci dati storici manualmente oppure seleziona una data successiva al primo aggiornamento.</p>';
 const rows=h.rows.map(a=>'<tr><td>'+E(a.name)+'</td><td>'+Number(a.balance).toLocaleString('it-IT',{maximumFractionDigits:2})+' '+E(a.currency)+'</td><td>'+euro(a.balance*a.rateEuro)+'</td><td class="tiny">'+E(a.lastDate)+(a.lastDate!==day?' · ultimo saldo noto':'')+'</td></tr>').join('');
 return '<div class="fin-summary"><div><small>Patrimonio stimato dai saldi disponibili</small><strong>'+euro(h.total)+'</strong></div><div><small>Precisione temporale</small><strong>'+(h.recent?'Aggiornato nel giorno':'Ultimi saldi noti')+'</strong></div></div>'+ 
 (!h.complete?'<p class="notice">⚠️ Prima dell’attivazione dello storico i dati sono <b>parziali</b>. Non è possibile garantire che tutti i conti siano rappresentati.</p>':'')+
 '<div class="tablewrap"><table class="table"><thead><tr><th>Conto</th><th>Saldo originale</th><th>Valore EUR</th><th>Data saldo</th></tr></thead><tbody>'+rows+'</tbody></table></div>'+
 '<p class="tiny muted">I valori in euro utilizzano il cambio registrato insieme al saldo. Quando non ci sono modifiche in una data, il sistema mostra l’ultimo saldo noto, non inventa movimenti o variazioni.</p>';
}
function r11ChartDays(){
 const d=r11HistDay;
 if(r11HistMode==='day')return [d];
 if(r11HistMode==='week'){const first=rWeekStart(d);return Array.from({length:7},(_,i)=>PLUS(first,i)).filter(x=>x<=TODAY())}
 if(r11HistMode==='month'){let n=new Date(Number(d.slice(0,4)),Number(d.slice(5,7)),0).getDate();return Array.from({length:n},(_,i)=>d.slice(0,7)+'-'+String(i+1).padStart(2,'0')).filter(x=>x<=TODAY())}
 let year=d.slice(0,4);return Array.from({length:12},(_,i)=>{
  let mon=Number(i+1),last=new Date(Number(year),mon,0).getDate(),date=year+'-'+String(mon).padStart(2,'0')+'-'+String(last).padStart(2,'0');return date>TODAY()?TODAY():date;
 }).filter((x,i,arr)=>x<=TODAY()&&arr.indexOf(x)===i);
}
function r11HistoryChart(){
 if(r11HistMode==='day')return '';
 let vals=r11ChartDays().map(day=>({day,...r11HistoryAsOf(day)}));const valid=vals.filter(v=>v.total!=null);
 if(!valid.length)return '';
 const min=Math.min(...valid.map(v=>v.total)),max=Math.max(...valid.map(v=>v.total));
 const range=Math.max(1,max-min);const width=680,height=145,pad=16;
 let pts=vals.map((v,i)=>{
  if(v.total==null)return null;
  const x=pad+(vals.length===1?0:i/(vals.length-1))*(width-2*pad);
  const y=height-pad-((v.total-min)/range)*(height-2*pad);
  return {x,y,v};
 }).filter(Boolean);
 const path=pts.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
 const diff=valid.length>1?cents(valid.at(-1).total-valid[0].total):0;
 return '<div class="regina-fin-chart"><h4>Andamento '+({week:'settimanale',month:'mensile',year:'annuale'}[r11HistMode]||'')+'</h4>'+ 
 '<svg viewBox="0 0 '+width+' '+height+'" role="img" aria-label="Andamento del patrimonio sui saldi disponibili"><path d="'+path+'" fill="none" stroke="currentColor" stroke-width="3"/>'+pts.map(p=>'<circle cx="'+p.x.toFixed(1)+'" cy="'+p.y.toFixed(1)+'" r="3.5" fill="currentColor"/>').join('')+'</svg>'+ 
 '<div class="row spread tiny"><span>'+E(valid[0].day)+' · '+euro(valid[0].total)+'</span><span>'+E(valid.at(-1).day)+' · '+euro(valid.at(-1).total)+'</span></div>'+ 
 '<p class="tiny muted">Differenza tra primo e ultimo saldo disponibile del periodo: <b>'+(diff>=0?'+':'')+euro(diff)+'</b>. La linea usa l’ultimo valore conosciuto, non interpola movimenti sconosciuti.</p></div>';
}
function r11Compare(){let a=r11HistoryAsOf(r11CompareDay),b=r11HistoryAsOf(r11HistDay);
 if(a.total==null||b.total==null)return '<p class="tiny muted">Per confrontare due giornate servono saldi registrati in entrambe.</p>';
 let delta=cents(b.total-a.total);
 return '<p>Dal <b>'+r11CompareDay+'</b> al <b>'+r11HistDay+'</b>: <strong>'+(delta>=0?'+':'')+euro(delta)+'</strong>.</p>'+(!a.complete||!b.complete?'<p class="tiny muted">Confronto parziale: lo storico disponibile non copre tutti i conti in entrambe le date.</p>':'');
}
function r11FinanceHistoryPanel(){const fs=rFinanceInit();const h=r11History();
 let opts=fs.accounts.map(a=>'<option value="'+E(a.id)+'">'+E(a.name)+' ('+E(a.currency)+')</option>').join('');
 return '<section id="regina-fin-history" class="card regina-fin-history"><div class="row spread"><h3>📆 Patrimonio nel tempo</h3><span class="pill">Storico dal '+E(h.started)+'</span></div>'+ 
 '<p class="muted">Consulta i saldi in ogni giorno disponibile. Lo storico conserva i cambi e le commissioni già registrati, senza modificare il riferimento iniziale dei settori societari.</p>'+ 
 '<div class="row regina-fin-h-modes">'+[['day','Giorno'],['week','Settimana'],['month','Mese'],['year','Anno']].map(([k,label])=>'<button type="button" class="btn '+(r11HistMode===k?'':'alt')+'" onclick="reginaHistory.mode(\''+k+'\')">'+label+'</button>').join('')+'</div>'+ 
 '<div class="two"><label class="label">Giorno da esaminare <input type="date" max="'+TODAY()+'" value="'+r11HistDay+'" onchange="reginaHistory.day(this.value)"></label>'+ 
 '<label class="label">Confronta con <input type="date" max="'+TODAY()+'" value="'+r11CompareDay+'" onchange="reginaHistory.compare(this.value)"></label></div>'+ 
 r11HistoryCalendar()+'<h4>Situazione del '+r11HistDay+'</h4>'+r11FinanceBreakdown(r11HistDay)+r11HistoryChart()+r11Compare()+
 '<details class="regina-fin-manual"><summary>✎ Aggiungi un saldo relativo a una data passata</summary><p class="tiny muted">Utile per recuperare dati precedenti all’aggiornamento. Non modifica il saldo corrente né lo stato attuale della società. Se mancano altri conti, il patrimonio storico sarà indicato come parziale.</p>'+ 
 '<form class="fin-grid" onsubmit="reginaHistory.manual(event)"><label>Conto<select name="account" required>'+opts+'</select></label>'+ 
 '<label>Data passata<input type="date" name="date" max="'+PLUS(TODAY(),-1)+'" required></label>'+ 
 '<label>Saldo nella valuta del conto<input type="number" name="balance" step="0.01" required></label>'+ 
 '<label>Valore di 1 unità in EUR<input type="number" name="rate" step="any" min="0.00000001" required></label>'+ 
 '<button class="btn" type="submit" '+(!opts?'disabled':'')+'>Registra il saldo storico</button></form></details></section>';
}
window.reginaHistory={
 day(day){if(!rD(day)||day>TODAY())return;r11HistDay=day;r11HistMonth=day.slice(0,7);render()},
 month(n){r11HistMonth=r11ShiftMonth(r11HistMonth,n);render()},
 mode(m){if(['day','week','month','year'].includes(m)){r11HistMode=m;render()}},
 compare(day){if(rD(day)&&day<=TODAY()){r11CompareDay=day;render()}},
 manual(ev){ev.preventDefault();const fd=new FormData(ev.target),fs=rFinanceInit(),a=fs.accounts.find(x=>x.id===String(fd.get('account')||'')),day=String(fd.get('date')||''),bal=Number(fd.get('balance')),rate=Number(fd.get('rate'));
  if(!a||!rD(day)||day>=TODAY()||!Number.isFinite(bal)||!(rate>0))return alert('Conto, data passata, saldo e cambio validi obbligatori.');
  const h=r11History();h.manual.push({id:a.id,name:a.name,currency:a.currency,date:day,at:new Date().toISOString(),balance:cents(bal),rateEuro:rate});
  if(save()){r11HistDay=day;r11HistMonth=day.slice(0,7);render()}
 }
};
const r11OldFinanceView=financeView;
financeView=function(){let html=r11OldFinanceView();return html.replace('<h2>💶 Finanze e gestione societaria</h2>','<h2>💶 Finanze e gestione societaria</h2><p><a class="btn alt" href="#regina-fin-history">📆 Consulta lo storico dei saldi ↓</a></p>')+r11FinanceHistoryPanel()};

// V. Stili leggeri, nessun grafico esterno o nuova pagina.
const r11CSS=document.createElement('style');r11CSS.textContent=`
.regina-review,.regina-fin-history{margin-top:15px}.regina-review h3,.regina-fin-history h3{margin:0}
.regina-review-score{font-size:25px;color:#126077}.regina-review-detail{font-size:12px;color:#64737d}
.regina-review-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:12px 0}
.regina-review-day{border:1px solid #cadfe6;border-radius:8px;background:#f6fbfc;padding:6px 2px;min-width:0}
.regina-review-day small{display:block;font-size:10px;white-space:nowrap}.regina-review-day b{display:block;font-size:14px}
.regina-review-day.selected,.regina-fin-calday.selected{outline:2px solid #277a97;background:#e5f5f4}
.regina-quick-layer{position:fixed;inset:0;background:rgba(8,24,35,.61);z-index:11000;display:flex;justify-content:center;align-items:center;padding:14px}
.regina-quick-dialog{max-width:400px;width:100%;background:#fff;color:#1d3540;border-radius:15px;padding:19px;max-height:90vh;overflow:auto}
.regina-quick-dialog h3{margin-top:0}.regina-quick-open{overflow:hidden}
.regina-fin-h-modes{flex-wrap:wrap;gap:7px;margin:11px 0}.regina-fin-cal-head{display:flex;justify-content:space-between;align-items:center;margin:12px 0}
.regina-fin-calendar{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:4px;margin:8px 0 17px}
.regina-fin-dayhead{text-align:center;font-size:11px;font-weight:bold;color:#607681}
.regina-fin-calday{border:1px solid #d4e1e6;border-radius:7px;background:#f8fbfc;padding:6px 1px;min-height:47px;min-width:0}
.regina-fin-calday strong{font-size:12px;display:block}.regina-fin-calday small{font-size:9px;display:block;overflow:hidden;white-space:nowrap;text-overflow:ellipsis}
.regina-fin-calday:disabled{opacity:.3}.regina-fin-chart{margin:14px 0}.regina-fin-chart svg{display:block;width:100%;max-height:180px;margin:10px 0;color:#22718c;background:#f3f9fb;border-radius:9px}
.regina-fin-manual{border:1px solid #dae6e8;border-radius:10px;padding:11px;margin-top:15px}.regina-fin-manual summary{font-weight:700;cursor:pointer}
@media(max-width:580px){.regina-fin-calendar{gap:2px}.regina-fin-calday small{font-size:8px}.regina-fin-calday{padding:5px 0}.regina-review-day small{font-size:9px}}
`;document.head.appendChild(r11CSS);


// ============================================================================
// REGINA CALCIO 1.1.1 — risultati meritocratici e protezione anti-demotivazione.
// Calcolato PRIMA di classifiche, articoli e archivi. Nessuna riscrittura delle
// partite gia' giocate. Non si aggiungono comandi tattici o nuovi dati personali.
// ============================================================================
const r111PrevMatch=calcMatch;
function r111Tier(id){const league=teamById(id)?.league||'C_A';return league==='A'?3:league==='B'?2:1;}
function r111Quality(m,id){
 const group=st?.squad?.[id]||[];
 const lookup=new Map(group.map(p=>[p.id,Number(p.tech)||0]));
 const starters=m.lineups?.[id]||[];
 const quality=starters.map(x=>lookup.get(x)).filter(x=>Number.isFinite(x)&&x>0);
 if(!quality.length)quality.push(...group.map(x=>Number(x.tech)||0).filter(x=>x>0).slice(0,11));
 return quality.length?quality.reduce((v,x)=>v+x,0)/quality.length:null;
}
function r111Readiness(m){
 // La preparazione reale del giorno, non il rapporto nudo 21/34, governa
 // la partita. Lo studio non aumenta artificialmente la tecnica dei singoli.
 const w={fitness:.25,mental:.20,discipline:.15,technical:.12,tactics:.13,luck:.15};
 return Object.entries(w).reduce((v,[key,weight])=>v+rLim(m?.[key]??5.5)*weight,0);
}
function r111DesiredResult(m,own,opp){
 if(!st)return null;
 const review=r11Review(st.nextDay||TODAY()),grade=Number(review?.grade);
 if(review?.grade==null||!Number.isFinite(grade))return null;
 const ownQ=r111Quality(m,own),oppQ=r111Quality(m,opp);
 const techGap=ownQ!=null&&oppQ!=null?oppQ-ownQ:0;
 const ourForm=r111Readiness(m.metrics?.[own]);
 const rivalForm=r111Readiness(m.metrics?.[opp]);
 const formGap=rivalForm-ourForm;
 const tiers=r111Tier(opp)-r111Tier(own);
 // Paragoniamo anche forma e serie, non soltanto il valore tecnico.
 const strength=techGap+.37*Math.max(-2.4,Math.min(2.4,formGap))+tiers*1.35;
 const band=strength>=2.05?'molto_piu_forte':strength>=.7?'piu_forte':
  strength<=-2.05?'molto_piu_debole':strength<=-.7?'piu_debole':'simile';
 let options;
 if(grade<5){
  // 0–5: sconfitta anche contro una squadra enormemente inferiore.
  options=grade<2?[-4,-3,-2,-1]:[-3,-2,-1];
 }else if(grade<6){
  // 5–6: il pareggio e' ammesso SOLO contro avversarie molto piu' deboli.
  options=band==='molto_piu_debole'?[0]:[-3,-2,-1];
 }else if(grade<7){
  // 6–7: con squadre piu' forti o significativamente piu' in forma si perde;
  // negli altri casi si pareggia. Una vittoria contro un club molto piu'
  // debole rimane eccezionale (2%), NON una vittoria casuale normale.
  const superior=band==='molto_piu_forte'||band==='piu_forte'||formGap>=.9;
  options=superior?[-2,-1]:band==='molto_piu_debole'&&Math.random()<.02?[1]:[0];
 }else if(grade<8){
  if(band==='molto_piu_forte')options=[-1];
  else if(band==='piu_forte')options=grade>=7.6?[0,0,-1]:[-1,0];
  else if(band==='simile')options=grade>=7.5?[0,1,1]:[0,0,1];
  else options=[1];
 }else if(grade<9){
  if(band==='molto_piu_forte')options=grade>=8.7?[0,1,1]:[0,0,1];
  else if(band==='piu_forte')options=grade>=8.5?[0,1,1]:[0,0,1];
  else if(band==='simile')options=grade>=8.6?[1,2,2]:[1,1,2];
  else if(band==='piu_debole')options=grade>=8.6?[3,4,4]:[3,3,4];
  else options=grade>=8.6?[4,5,5]:[4,4,5];
 }else{
  // 9–10: perfino la squadra nettamente superiore puo' essere battuta.
  if(band==='molto_piu_forte')options=[1];
  else if(band==='piu_forte')options=grade>=9.5?[2,3,3]:[2,2,3];
  else if(band==='simile')options=grade>=9.5?[3,4,4]:[3,3,4];
  else if(band==='piu_debole')options=grade>=9.5?[5,6,6]:[5,5,6];
  else options=grade>=9.5?[6,7,7]:[6,6,7];
 }
 return {grade,band,techGap:+techGap.toFixed(2),formGap:+formGap.toFixed(2),
  strength:+strength.toFixed(2),tiers,options};
}

function r111MinuteForRecovery(m,opp,ordinal,count){
 const opponentGoals=(m.events||[]).filter(x=>x.side===opp&&x.type==='gol');
 const lastOpp=Math.max(0,...opponentGoals.map(x=>Number(x.minute)||0));
 const start=Math.max(16,Math.min(68,70-count*12));
 const end=Math.max(74,Math.min(90,lastOpp+3));
 return Math.max(2,Math.min(90,Math.round(start+(end-start)*(ordinal+1)/count)));
}
// Converte una rete NORMALE in una parata / occasione mancata.
// Nessuna rete obbligatoria degli obiettivi decisivi o critici viene cancellata.
function r111SavedGoals(m,side,count){
 if(count<=0)return 0;
 const other=side===m.a?m.b:m.a;
 const keeperId=(m.lineups?.[other]||[]).find(id=>m.playerNames?.[id]?.pos==='P');
 const keeper=m.playerNames?.[keeperId]?.name||'il portiere avversario';
 const regular=(m.events||[]).filter(e=>e.side===side&&e.type==='gol'&&!e.reginaGuaranteed)
  .sort((a,b)=>(Number(b.minute)||0)-(Number(a.minute)||0));
 let removed=0;
 for(const e of regular){
  if(removed>=count)break;
  if(e.kind==='rigore'){
   e.type='rigore_sbagliato';e.action='rigore respinto dal portiere';
  }else{
   e.type='occasione';e.action='conclusione respinta';e.outcome='parata';e.opponent=keeper;
  }
  e.reginaParataDecisiva=true;
  if(side===m.a)m.ga=Math.max(0,m.ga-1);else m.gb=Math.max(0,m.gb-1);
  removed++;
 }
 return removed;
}
function r111AllowedTarget(policy,originalDifference){
 const list=policy.options;
 if(list.includes(originalDifference))return originalDifference;
 const unique=[...new Set(list)];
 if(unique.length===1)return unique[0];
 // Selezioniamo un risultato fra quelli consentiti. Nessuna estrazione
 // potra' mai uscire dagli esiti prescritti per questa fascia di voto.
 return list[Math.floor(Math.random()*list.length)];
}
calcMatch=function(a,b,ma=null,mb=null){
 const m=r111PrevMatch(a,b,ma,mb);
 if(!m?.events||!st||!(a===st.club||b===st.club))return m;
 const own=st.club,opp=own===a?b:a,policy=r111DesiredResult(m,own,opp);
 if(!policy)return m;
 const scored=()=>own===m.a?m.ga:m.gb,conceded=()=>own===m.a?m.gb:m.ga;
 const initialDiff=scored()-conceded();
 const target=r111AllowedTarget(policy,initialDiff);
 let changes=0;
 if(initialDiff<target){
  // Soprattutto nelle giornate alte evitiamo il pareggio 7–7: trasformiamo
  // prima i gol NON garantiti degli avversari in parate verosimili.
  const ceiling=policy.grade>=9?1:policy.grade>=8?2:policy.grade>=7?2:3;
  const surplus=Math.max(0,conceded()-ceiling);
  changes+=r111SavedGoals(m,opp,Math.min(surplus,target-(scored()-conceded())));
  // Se rimane uno squilibrio, preferiamo altre parate prima di inventare
  // una lunghissima serie di gol della squadra dell'utente.
  if(scored()-conceded()<target){
   const gap=target-(scored()-conceded());
   const canSave=Math.max(0,conceded()-(policy.grade>=8?1:0));
   changes+=r111SavedGoals(m,opp,Math.min(gap,canSave));
  }
  const gap=Math.max(0,target-(scored()-conceded()));
  for(let i=0;i<gap;i++){
   rAddGoal(m,own,r111MinuteForRecovery(m,opp,i,Math.max(1,gap)),false);
   const last=m.events.at(-1);
   if(last){last.reginaRiscatto=true;last.action='al termine di una manovra offensiva insistita';}
  }
  changes+=gap;
 }else if(initialDiff>target){
  // Le reti davvero garantite restano; se non si possono annullare si
  // materializza il contraccolpo sul campo tramite gol avversari.
  changes+=r111SavedGoals(m,own,initialDiff-target);
  const gap=Math.max(0,(scored()-conceded())-target);
  for(let i=0;i<gap;i++)rAddGoal(m,opp,r111MinuteForRecovery(m,own,i,Math.max(1,gap)),false);
  changes+=gap;
 }
 // Fallisce esplicitamente se un caso limite non e' stato normalizzato.
 const finalDiff=scored()-conceded();
 if(finalDiff!==target)throw Error('Vincolo di risultato non rispettato: '+finalDiff+' / '+target);
 m.reginaFairPlay={dailyGrade:policy.grade,opponentBand:policy.band,
  strengthGap:policy.strength,formGap:policy.formGap,minimumDifference:target,
  initialDifference:initialDiff,adjustments:changes,ruleVersion:'1.1.15'};
 m.events.sort((x,y)=>(Number(x.minute)||0)-(Number(y.minute)||0));
 r11MatchFix(m);normalizeMatchVotes(m);
 return m;
};

// ============================================================================
// REGINA CALCIO 1.1.2 — affidabilita' salvataggi, recupero, flussi snelli.
// Compatibile con la carriera 1.1.1: nessuna cancellazione dei dati esistenti.
// ============================================================================
const R112_DB='regina-calcio-sicurezza-v1',R112_STORE='backups';
let r112Revision=0,r112SavedRevision=0,r112IdbPromise=Promise.resolve(),r112Edited=false,r112Blocked=false,r112AllowDowngrade=false;
let r112Status='checking',r112StatusText='Controllo salvataggio…',r112LocalOK=false;
const r112Escape=(x)=>E(String(x??''));
function r112Notice(status,message){
 r112Status=status;r112StatusText=message;
 const el=document.getElementById('regina-save-status');if(el){el.textContent=message;el.dataset.status=status;}
 const el2=document.getElementById('regina-save-status-settings');if(el2){el2.textContent=message;el2.dataset.status=status;}
}
function r112DB(){return new Promise((resolve,reject)=>{
 if(!('indexedDB'in window))return reject(Error('Archivio sicuro non disponibile'));
 let req=indexedDB.open(R112_DB,1);
 req.onupgradeneeded=()=>{const db=req.result;if(!db.objectStoreNames.contains(R112_STORE))db.createObjectStore(R112_STORE)};
 req.onsuccess=()=>resolve(req.result);req.onerror=()=>reject(req.error||Error('Impossibile aprire archivio'));
 })}
async function r112ReadDB(){const db=await r112DB();return new Promise((resolve,reject)=>{
 const tx=db.transaction(R112_STORE,'readonly'),req=tx.objectStore(R112_STORE).get('current');
 req.onsuccess=()=>resolve(req.result||null);req.onerror=()=>reject(req.error);
 tx.oncomplete=()=>db.close();
 })}
async function r112WriteDB(capsule){const db=await r112DB();return new Promise((resolve,reject)=>{
 const tx=db.transaction(R112_STORE,'readwrite');tx.objectStore(R112_STORE).put(capsule,'current');
 tx.oncomplete=()=>{db.close();resolve(true)};
 tx.onerror=()=>{const err=tx.error;db.close();reject(err||Error('Scrittura archivio fallita'))};
 tx.onabort=()=>{const err=tx.error;db.close();reject(err||Error('Scrittura annullata'))};
 })}
function r112SlimRoundLog(){
 // Durante la partita le 50 gare contengono migliaia di oggetti di appoggio.
 // Per classifiche, ultima giornata e marcatori storici bastano questi dati.
 if(!st||!Array.isArray(st.roundLog))return;
 for(const r of st.roundLog){if(!Array.isArray(r.matches))continue;
  r.matches=r.matches.map(m=>{
   if(!m||typeof m!=='object')return m;
   return {a:m.a,b:m.b,ga:m.ga,gb:m.gb,events:(m.events||[]).filter(e=>e.type==='gol').map(e=>({type:'gol',side:e.side,name:e.name,minute:e.minute}))};
  });
 }
}
function r112Stamp(){return Number(st?._reginaSavedAt)||0}
function r112Capsule(){
 let g=null;try{g=resolveOriginal()}catch(e){}
 return {kind:'REGINA_CALCIO_BACKUP_V4',football:st,goals:(r112HasGoals(g)?g:(typeof rGoalStore==='function'?rGoalStore():null)),finance:load(),savedAt:Date.now(),origin:'regina-calcio'};
}
function r112PushSave(capsule,revision){
 // Copia immutabile: ogni scrittura rappresenta davvero il proprio istante.
 try{capsule=structuredClone(capsule)}catch(err){capsule=JSON.parse(JSON.stringify(capsule))}
 // Operazioni serializzate: una scrittura lenta non puo' sovrascriverne una nuova.
 r112IdbPromise=r112IdbPromise.catch(()=>{}).then(()=>r112WriteDB(capsule)).then(()=>{
   r112SavedRevision=Math.max(r112SavedRevision,revision);
   if(revision===r112Revision)r112Notice('ok','✅ Carriera salvata e verificata');
 }).catch(err=>{
   if(revision===r112Revision){
    r112Notice(r112LocalOK?'warning':'error',r112LocalOK?'⚠️ Copia locale salvata; archivio di sicurezza non disponibile':'❌ Salvataggio non riuscito: esporta subito un backup');
   }
   console.warn('REGINA: scrittura di sicurezza fallita',err);
 });
 return r112IdbPromise;
}
function r112SaveCurrent(){
 if(!st)return false;
 if(r112Blocked&&!r112AllowDowngrade){r112Notice('error','⚠️ Carriera più recente in un’altra scheda: ricarica prima di continuare');return false;}
 try{const old=JSON.parse(localStorage.getItem(APPKEY)||'null');
  if(!r112AllowDowngrade&&r112HasNewer(old,st)){r112Blocked=true;r112Notice('error','⚠️ Una scheda contiene una carriera più recente: ricarica prima di giocare');return false;}
 }catch(e){}
 r112Edited=true;r112SlimRoundLog();st._reginaSavedAt=Date.now();
 let packed='';try{packed=JSON.stringify(st)}catch(err){r112Notice('error','❌ Impossibile preparare il salvataggio: '+err.message);return false;}
 let good=false;
 try{localStorage.setItem(APPKEY,packed);good=localStorage.getItem(APPKEY)===packed}
 catch(err){console.warn('REGINA: memoria locale piena o bloccata',err)}
 r112LocalOK=good;
 r112Notice('saving',good?'💾 Salvataggio locale verificato; copia di sicurezza in corso…':'💾 Memoria locale piena: salvataggio alternativo in corso…');
 r112PushSave(r112Capsule(),++r112Revision);
 return good;
}
// Sostituisce il vecchio safeSet che nascondeva gli errori di quota.
persist=function(){return r112SaveCurrent()};
async function r112DeleteSafeSave(){const db=await r112DB();return new Promise((resolve,reject)=>{
 const tx=db.transaction(R112_STORE,'readwrite');tx.objectStore(R112_STORE).delete('current');
 tx.oncomplete=()=>{db.close();resolve(true)};tx.onerror=()=>reject(tx.error);tx.onabort=()=>reject(tx.error);
 })}
function r112HasNewer(backup,current){
 if(!backup?.club||!backup?.squad)return false;
 if(!current)return true;
 const p=b=>(Number(b.season)||1)*100000+(Number(b.results?.length)||0)*100+(Number(b.game)||0);
 const diff=p(backup)-p(current);
 if(diff!==0)return diff>0;
 return (Number(backup._reginaSavedAt)||0)>(Number(current._reginaSavedAt)||0)+300;
}
async function r112Recover(){
 try{
  const saved=await r112ReadDB();
  if(r112Edited)return;
  if(saved?.football&&r112HasNewer(saved.football,st)){
   st=saved.football;
   // Migrazione protetta: gli obiettivi caricati dall'archivio sicuro vengono
   // ripristinati solo se la memoria locale non li contiene affatto.
   try{
    if(saved.goals?.fronts&&saved.goals?.tasks&&!localStorage.getItem(GK))window.goalSaveImportedArchive(saved.goals);
    if(saved.finance?.accounts&&!localStorage.getItem(FK)){f=saved.finance;save()}
   }catch(err){console.warn('REGINA: recupero dati accessori',err)}
   r112SlimRoundLog();
   // Evita di attribuire alla vecchia copia locale una data di salvataggio nuova
   // prima che il recupero sia visibile.
   render();r112Notice('ok','✅ Ultima carriera recuperata dal salvataggio di sicurezza');
   persist();
  }else if(st){r112Notice('ok','✅ Carriera caricata: '+(st.nextDay||'giornata disponibile'));}
  else r112Notice('warning','Crea una nuova carriera o importa un backup');
 }catch(err){
  r112Notice('warning',st?'Carriera caricata. Archivio di sicurezza non disponibile.':'Nessun salvataggio trovato');
  console.warn('REGINA: recupero automatico',err);
 }
}
// Il primo caricamento conserva il vecchio archivio eventualmente importato.
// L'archivio delle tappe e' gia' indipendente (chiave GK).
// Non azzeriamo nulla: nascondiamo soltanto il vecchio collegamento con la Citta'.
window.goalMergeFromCity=function(){alert('REGINA Calcio gestisce ora soltanto i propri obiettivi. Usa il backup completo per trasferire dati.')};
function r112HasGoals(x){return x&&Array.isArray(x.fronts)&&Array.isArray(x.tasks)}
function r112Export(){
 if(!st)return alert('Non esiste ancora una carriera da esportare.');
 r112SlimRoundLog();
 jsonFile({...r112Capsule(),exportedAt:new Date().toISOString()},'REGINA_CALCIO_BACKUP_COMPLETO_'+TODAY()+'.json');
}
async function r112Import(ev){
 const file=ev?.target?.files?.[0];if(!file)return;
 try{
  const raw=await file.text();const data=JSON.parse(raw);
  const football=data?.football?.club?data.football:data?.club&&data?.squad?data:null;
  if(!football?.club||!football?.squad||!Array.isArray(football.results||[]))throw Error('File non riconosciuto: seleziona un backup REGINA Calcio, non quello della Città.');
  const goalData=r112HasGoals(data.goals)?data.goals:null;
  const finData=data.finance?.accounts&&Array.isArray(data.finance.accounts)?data.finance:null;
  const day=football.nextDay||'non indicata',n=football.results?.length||0;
  if(!confirm('Ripristinare la carriera dal file «'+file.name+'»?\n\nGiornata successiva: '+day+'\nPartite archiviate: '+n+'\n\nI dati correnti verranno sostituiti.'))return;
  // Prima assicuriamo che l'archivio di sicurezza contenga il pacchetto da importare.
  const snapshot={kind:'REGINA_CALCIO_BACKUP_V4',football,goals:goalData||rGoalStore(),finance:finData||load(),savedAt:Date.now()};
  await r112IdbPromise.catch(()=>{});
  let idbReady=false;
  try{await r112WriteDB(snapshot);idbReady=true}
  catch(dbErr){
   // Ripiego sul salvataggio compatto: l'importazione resta possibile quando
   // IndexedDB non e' disponibile ma la memoria locale e' scrivibile.
   const fresh=structuredClone(football),prev=st;st=fresh;r112SlimRoundLog();st=prev;
   try{localStorage.setItem(APPKEY,JSON.stringify(fresh))}
   catch(storageErr){throw Error('Spazio insufficiente sia nella memoria locale sia nell’archivio di sicurezza. Esporta il backup prima di riprovare.')}
  }
  // Solo dopo aver verificato almeno una forma di salvataggio procediamo.
  if(goalData){window.goalSaveImportedArchive(goalData);const check=localStorage.getItem(GK);
   if(!check||!r112HasGoals(JSON.parse(check)))console.warn('REGINA: obiettivi memorizzati almeno nell’archivio di sicurezza');}
  if(finData){f=finData;r112OldFinSave()}
  st=football;
  r112Edited=true;r112Blocked=false;r112AllowDowngrade=true;r112SlimRoundLog();st._reginaSavedAt=Date.now();
  try{localStorage.setItem(APPKEY,JSON.stringify(st));r112LocalOK=true}catch(err){r112LocalOK=false;console.warn('REGINA: import salvato nel backup alternativo',err)}
  persist();await r112IdbPromise;r112AllowDowngrade=false;
  if(idbReady){const verified=await r112ReadDB();
   if(verified?.football?.club!==st.club||verified.football?.nextDay!==st.nextDay)throw Error('La verifica del backup importato non è riuscita');
  }else{const local=JSON.parse(localStorage.getItem(APPKEY)||'null');
   if(local?.club!==st.club||local?.nextDay!==st.nextDay)throw Error('Il salvataggio locale importato non è verificabile');
  }
  alert('✅ Carriera importata. Prossima giornata: '+st.nextDay+'.\n'+(idbReady?'La copia di sicurezza è stata verificata.':'Salvataggio locale verificato; ti consiglio di conservarne il backup JSON.'));
  location.reload();
 }catch(err){alert('❌ Importazione non riuscita: '+err.message);console.error('REGINA importazione',err)}
 finally{r112AllowDowngrade=false;if(ev?.target)ev.target.value=''}
}
exportData=r112Export;
restoreFootball=r112Import;
const r112OldFinSave=save;
save=function(){let ok=r112OldFinSave();if(ok&&st){r112PushSave(r112Capsule(),++r112Revision)}return ok};
for(const fn of ['goalStatus','goalPartial','goalStepCheck','goalSaveTask','goalSaveFront','goalDeleteTask','goalSaveImportedArchive']){
 const current=window[fn];if(typeof current!=='function')continue;
 window[fn]=function(...args){const v=current.apply(this,args);if(st){
  // Dopo la modifica reale della tappa, fotografa anche il salvataggio sicuro.
  setTimeout(()=>r112PushSave(r112Capsule(),++r112Revision),0);
 }return v};
}
function r112SaveCheck(){persist();return r112IdbPromise.then(async()=>{
 const data=await r112ReadDB();const ok=data?.football?.club===st?.club&&data?.football?.nextDay===st?.nextDay&&data?.football?.results?.length===st?.results?.length;
 if(ok)alert('✅ Salvataggio verificato.\nStagione: '+st.season+'\nProssima giornata: '+st.nextDay+'\nPartite archiviate: '+(st.results?.length||0));
 else alert('⚠️ Il salvataggio non risulta verificato: esporta subito un backup.');
 }).catch(err=>alert('⚠️ Archivio alternativo non disponibile: '+err.message+'\nEsporta un backup JSON.'))}
window.reginaData={export:r112Export,import:r112Import,check:r112SaveCheck,demo(on){st.demoAdvance=Boolean(on);persist();render()},
 names(){st.coachName=document.getElementById('regCoach')?.value.trim().slice(0,80)||'';st.presidentName=document.getElementById('regPresident')?.value.trim().slice(0,80)||'';persist();render()},
 async clear(){if(!confirm('Eliminare DEFINITIVAMENTE la carriera calcistica? Gli obiettivi e le finanze non verranno cancellati. Esporta prima un backup.'))return;
  try{await r112IdbPromise.catch(()=>{});await r112DeleteSafeSave()}catch(e){console.warn('REGINA: backup non cancellato',e)}
  localStorage.removeItem(APPKEY);st=null;location.reload();}};
// Impostazioni autonome, senza collegamenti a REGINA Città; le sezioni rare
// stanno in accordion, mentre backup e stato salvataggio sono subito visibili.
settingsView=function(){
 const last=st.results?.[0],game=st.game||0;
 return `<section class="card regina-settings-112"><h2>⚙️ Impostazioni · REGINA Calcio 1.1.3</h2>
 <p class="muted">Carriera autonoma. I dati restano in questo browser, con una seconda copia di sicurezza locale.</p>
 <div class="regina-save-panel"><b>💾 Stato salvataggio</b><p id="regina-save-status-settings" data-status="${r112Status}">${r112Escape(r112StatusText)}</p>
 <div class="regina-save-summary"><span>Stagione <b>${st.season||1}</b></span><span>Prossima giornata <b>${r112Escape(st.nextDay||'—')}</b></span><span>Partite registrate <b>${st.results?.length||0}</b></span></div>
 ${last?`<p class="tiny">Ultima partita archiviata: <strong>${r112Escape(last.day)}</strong></p>`:''}
 <div class="row"><button class="btn" type="button" onclick="reginaData.check()">✓ Verifica salvataggio</button><button class="btn alt" type="button" onclick="reginaData.export()">⬇ Esporta backup completo</button></div>
 <label class="label">⬆ Ripristina un backup JSON<input type="file" accept=".json,application/json" onchange="reginaData.import(event)"></label>
 <p class="tiny muted">Il backup comprende stagione, obiettivi e finanze. Dopo una partita il salvataggio è automatico: la verifica serve soltanto come controllo.</p></div>
 <details class="regina-settings-fold"><summary>👤 Allenatore e presidente</summary><label class="label">Allenatore<input id="regCoach" value="${r112Escape(st.coachName||'')}" maxlength="80"></label>
 <label class="label">Presidente (facoltativo)<input id="regPresident" value="${r112Escape(st.presidentName||'')}" maxlength="80"></label><button class="btn alt" onclick="reginaData.names()">Salva i nomi</button></details>
 <details class="regina-settings-fold"><summary>🧪 Simulazione e test</summary><label><input type="checkbox" ${st.demoAdvance?'checked':''} onchange="reginaData.demo(this.checked)"> Consenti di giocare più giornate senza attendere la data reale</label><p class="muted tiny">Le partite di prova modificano comunque la carriera: crea un backup prima di utilizzarle.</p></details>
 <details class="regina-settings-fold"><summary>🏆 Carriera e nuove stagioni</summary>${rCareerView()}</details>
 <details class="regina-settings-fold"><summary>⚠️ Azioni irreversibili</summary><p class="muted">Elimina la carriera soltanto se vuoi ricominciare. I dati persi potrebbero non essere recuperabili senza un backup.</p><button class="btn bad" onclick="reginaData.clear()">Cancella carriera</button></details>
 </section>`;
};
// L'area Oggi rende selezionabili le tappe senza uscire dalla pagina.
function r112TodayButton(t,action,label){
 return `<button class="btn alt regina-today-btn" aria-label="${r112Escape(({todo:'Segna da fare',done:'Completa',partial:'Segna parziale',edit:'Modifica'})[action]+' · '+t.title)}" data-task-id="${r112Escape(t.id)}" data-task-action="${action}" onclick="reginaToday.handle(event)" type="button">${label}</button>`;
}
function r112TodayGoals(){
 const items=todayTasks(),groups=new Map();for(const t of items){const name=t.frontTitle||'Altri obiettivi';
  if(!groups.has(name))groups.set(name,[]);groups.get(name).push(t);
 }
 let result='<div class="regina-today-goals"><p class="muted tiny">Segna qui i completamenti: aggiornano subito la preparazione della squadra.</p>';
 for(const [name,list] of groups){let done=list.filter(t=>Number(t.fraction)>=1).length;
  result+=`<details class="regina-today-front" ${done<list.length?'open':''}><summary><b>${r112Escape(name)}</b><small>${done}/${list.length}</small></summary>`;
  for(const t of list){const fraction=Number(t.fraction)||0;result+=`<div class="regina-today-item ${fraction>=1?'done':''}"><span class="regina-today-title">${r112Escape(t.title)}<small>${fraction>=1?'Completata':fraction>0?Math.round(fraction*100)+'% completato':'Da fare'}</small></span>
  <span class="regina-today-actions">${r112TodayButton(t,fraction>=1?'todo':'done',fraction>=1?'↩':'✓')}${r112TodayButton(t,'partial','◐')}${r112TodayButton(t,'edit','✎')}</span>${goalComponentBoxes(t)}</div>`;}
  result+='</details>';
 }
 return result+(groups.size?'':'<p class="muted">Nessun obiettivo programmato per questa giornata.</p>')+'</div>';
}
window.reginaToday={handle(ev){ev?.stopPropagation();const btn=ev?.currentTarget;const id=btn?.dataset?.taskId,action=btn?.dataset?.taskAction;
 if(!id)return;if(action==='edit')goalOpenTask(id);else if(action==='partial')goalPartial(id);else goalStatus(id,action);
}};
const r112OldToday=todayView;
todayView=function(){const html=r112OldToday();if(!st)return html;
 const t=document.createElement('template');t.innerHTML=html;
 for(const p of [...t.content.querySelectorAll('p.muted')])if(/memoria originale|REGINA sono lette/.test(p.textContent))p.textContent='I tuoi obiettivi influenzano direttamente le prestazioni della squadra.';
 for(const n of [...t.content.querySelectorAll('.notice')]){
  if(/Collegati\s+\d+\s+fronti|Obiettivi originali non visibili/.test(n.textContent))n.remove();
 }
 const heading=[...t.content.querySelectorAll('h3')].find(x=>x.textContent.includes('Tappe previste per la giornata'));
 if(heading){let next=heading.nextElementSibling;
  while(next&&((next.matches?.('.task'))||(next.matches?.('p')&&/Gestisci obiettivi|Nessuna tappa prevista/.test(next.textContent)))){
   const old=next;next=next.nextElementSibling;old.remove();
  }
  heading.insertAdjacentHTML('afterend',r112TodayGoals());
 }
 return t.innerHTML;
};
// La valutazione e' sintetica per impostazione predefinita, approfondibile.
r11ReviewPanel=function(){const x=r11Review(r11ReviewDay),missing=x.records.filter(y=>y.fraction===0),partial=x.records.filter(y=>y.fraction>0&&y.fraction<1);
 const important=[...missing,...partial].sort((a,b)=>b.difficulty-a.difficulty).slice(0,4);
 const title=x.grade==null?'—':x.grade.toFixed(1)+'/10';
 return `<section class="card r112-review"><div class="row spread"><div><h3>📊 Bilancio della giornata</h3><p class="muted tiny">${x.done} completate · ${x.part} parziali · ${x.missed} non svolte</p></div><strong class="r112-review-grade">${title}</strong></div>
 <label class="label">Data <input type="date" value="${r112Escape(r11ReviewDay)}" onchange="reginaReview.select(this.value)"></label>
 ${important.length?`<div class="r112-review-missed"><b>Da migliorare:</b> ${important.map(y=>`${r112Escape(y.name)}${y.fraction>0?' ('+Math.round(y.fraction*100)+'%)':''}`).join('; ')}${missing.length+partial.length>4?'…':''}</div>`:'<p class="muted tiny">Nessuna attività mancante registrata.</p>'}
 <details class="r112-review-extra"><summary>▾ Voti settimanali e analisi dettagliata</summary>${r11WeekStrip(r11ReviewDay)}${r11ReviewDescription(x)}</details></section>`;
};
// Elimina le operazioni di collegamento all'app Citta' anche dalla pagina Obiettivi.
const r112OldObjectives=objectivesView;
objectivesView=function(){const t=document.createElement('template');t.innerHTML=r112OldObjectives();
 for(const button of [...t.content.querySelectorAll('button')])if(/Importa nuovi impegni dalla città|Importa nuovi impegni dalla citta/i.test(button.textContent))button.remove();
 for(const n of [...t.content.querySelectorAll('.go-dashboard .notice')])if(/REGINA città|copia autonoma/i.test(n.textContent))n.textContent='Gli obiettivi e i progressi sono gestiti autonomamente in REGINA Calcio.';
 const oldDays=[...t.content.querySelectorAll('.go-dashboard > .go-day')].filter(n=>n.querySelector('h3')?.textContent.trim().startsWith('📅'));
 if(oldDays.length){const fold=document.createElement('details');fold.className='r112-day-list';
  fold.innerHTML='<summary>▾ Elenco dettagliato del periodo ('+oldDays.length+' giorni con attività)</summary>';
  oldDays[0].before(fold);for(const n of oldDays)fold.appendChild(n);
 }
 return t.innerHTML;
};
// Scorrimento automatico continuo durante il drag da telefono: permette di
// raggiungere anche i giorni lontani e il calendario partendo dagli arretrati.
let r112ScrollTimer=null;
function r112StartScroll(){
 if(r112ScrollTimer!==null)return;
 r112ScrollTimer=setInterval(()=>{
  if(!rDragTouch){clearInterval(r112ScrollTimer);r112ScrollTimer=null;return;}
  const x=rDragTouch.x,y=rDragTouch.y,w=innerWidth,h=innerHeight;
  const verticalMargin=Math.min(120,Math.max(74,h*.16));
  if(y<verticalMargin)window.scrollBy(0,-Math.round(11+(verticalMargin-y)*.25));
  else if(y>h-verticalMargin)window.scrollBy(0,Math.round(11+(y-(h-verticalMargin))*.25));
  const pane=document.querySelector('.regina-pl-scroll');
  if(pane){const box=pane.getBoundingClientRect();
   if(box.bottom>0&&box.top<h){
    const margin=Math.min(92,Math.max(50,box.width*.23));
    if(x<box.left+margin)pane.scrollLeft-=Math.max(22,Math.round((box.left+margin-x)*.5));
    else if(x>box.right-margin)pane.scrollLeft+=Math.max(22,Math.round((x-(box.right-margin))*.5));
   }
  }
 },30);
}
document.addEventListener('touchstart',e=>{
 if(!e.target.closest?.('.regina-pl-item')||e.target.closest('button'))return;
 setTimeout(()=>{if(rDragTouch)r112StartScroll()},315);
},{passive:true});
document.addEventListener('touchend',()=>{if(r112ScrollTimer!==null){clearInterval(r112ScrollTimer);r112ScrollTimer=null}},{passive:true});
document.addEventListener('touchcancel',()=>{if(r112ScrollTimer!==null){clearInterval(r112ScrollTimer);r112ScrollTimer=null}},{passive:true});
// Regole anti-sovrascrittura per piu' schede: avviso e blocco delle copie vecchie.
let r112ObservedAt=Date.now();
window.addEventListener('storage',ev=>{
 if(ev.key!==APPKEY||!st||!ev.newValue)return;
 try{const incoming=JSON.parse(ev.newValue);
  if(r112HasNewer(incoming,st)){r112Blocked=true;
   r112Notice('warning','⚠️ Un’altra scheda ha una carriera più recente. Ricarica questa pagina prima di giocare.');
  }
 }catch(e){}
});
// Blocca azioni su uno stato stantio prima del recupero, senza perdere dati.
const r112PrevAdvance=advance;
advance=function(...args){if(r112Status==='checking')return alert('Sto verificando l’ultima stagione salvata.');
 if(r112Blocked)return alert('Esiste una carriera più recente in un’altra scheda. Ricarica la pagina prima di giocare.');
 return r112PrevAdvance.apply(this,args);};
const r112PrevPostDay=playPostDay;
playPostDay=function(...args){if(r112Status==='checking'||r112Blocked)return alert('Verifica o ricarica la carriera prima di giocare.');return r112PrevPostDay.apply(this,args)};
// Indicatore su tutte le pagine e badge versione.
const r112OldHeader=header;
header=function(){let html=r112OldHeader().replace(/v1\.1\.1/g,'v1.1.3');
 return html.replace('</nav>',`</nav><div class="regina-save-line" id="regina-save-status" data-status="${r112Status}">${r112Escape(r112StatusText)}</div>`);
};
const r112CSS=document.createElement('style');r112CSS.textContent=`
.regina-save-line{font-size:11px;color:#e4faef;padding:6px 12px 9px;text-align:center}
.regina-save-line[data-status=warning]{color:#ffebaa}.regina-save-line[data-status=error]{color:#ffacac}.regina-save-line[data-status=saving]{color:#fff0b8}
.regina-save-panel{padding:15px;border:1px solid #c8dfe4;border-radius:12px;background:#f4fafb;margin:13px 0}
.regina-save-summary{display:flex;gap:12px;flex-wrap:wrap;margin:12px 0}.regina-save-summary span{font-size:12px;background:white;border-radius:7px;padding:7px}
.regina-save-panel #regina-save-status-settings{margin:10px 0}.regina-settings-fold{border:1px solid #d7e1e3;border-radius:10px;margin:10px 0;padding:12px;background:#fff}
.regina-settings-fold summary{font-weight:750;cursor:pointer;padding:5px}.regina-settings-fold>*:not(summary){margin-top:12px}
.regina-today-goals{margin:12px 0}.regina-today-front{border:1px solid #d3e4e5;border-radius:9px;margin:9px 0;background:#fafdfb;padding:9px}
.regina-today-front summary{cursor:pointer;display:flex;align-items:center;justify-content:space-between;gap:8px}
.regina-today-front summary small{color:#597481;font-weight:bold}.regina-today-item{display:flex;align-items:center;justify-content:space-between;gap:7px;padding:9px 2px;border-top:1px solid #e2edec}
.regina-today-item:first-of-type{margin-top:8px}.regina-today-item.done{background:#f1faf4}.regina-today-title{font-size:13px;flex:1;font-weight:650}
.regina-today-title small{display:block;color:#66818a;font-size:11px;font-weight:normal;margin-top:3px}
.regina-today-actions{display:flex;gap:4px;flex-shrink:0}.regina-today-btn{min-width:36px;padding:7px 9px;font-size:14px}
.r112-review{padding:15px!important}.r112-review-grade{font-size:24px;color:#157289}.r112-review-missed{border-left:3px solid #dc9775;background:#fff7ed;padding:9px;font-size:13px;border-radius:4px;margin:11px 0}
.r112-review-extra{margin:9px 0}.r112-review-extra summary{font-weight:650;cursor:pointer;color:#146e7f}
.r112-day-list{margin:13px 0;border:1px solid #cfdee3;border-radius:10px;padding:12px}.r112-day-list>summary{cursor:pointer;font-weight:700;color:#1d6474}
.regina-pl-dragging{outline:3px solid #1e86a5!important;box-shadow:0 1px 10px rgba(0,0,0,.2)}
@media(max-width:400px){.regina-today-item{align-items:flex-start;flex-wrap:wrap}.regina-today-actions{margin-left:auto}.regina-save-line{font-size:10px}}
`;document.head.appendChild(r112CSS);
// Non scrivere salvataggi vuoti durante il boot. Prima recupera il migliore.
r112Recover();

// ============================================================================
// REGINA CALCIO 1.1.3 — Planner mobile, scorrimento bidirezionale e riepilogo
// visivo. Nessuna migrazione dei salvataggi o alterazione dei risultati.
// ============================================================================

// 1. Riepilogo leggibile: una panoramica breve, categorie espandibili e nomi
// completi di tutte le tappe non svolte/parziali senza un paragrafo infinito.
function r113GroupItems(items){
 const groups=new Map();
 for(const t of items){const front=String(t.front||'Altro');if(!groups.has(front))groups.set(front,[]);groups.get(front).push(t)}
 return [...groups].map(([front,rows])=>'<section class="r113-front"><h5>'+E(front)+' <span>'+rows.length+'</span></h5>'+
  rows.map(t=>{const pc=Math.round(rLim(t.fraction,0,1)*100),part=pc>0&&pc<100;
   return '<div class="r113-entry"><div class="r113-entry-title">'+E(t.name)+'</div>'+
    '<div class="r113-entry-sub"><span>Difficoltà '+rLim(t.difficulty||3,1,5)+'/5</span>'+
    (part?'<span class="r113-part-pct">'+pc+'% svolto</span>':(pc>=100?'<span>Completata</span>':'<span>Non svolto</span>'))+'</div>'+
    (part?'<div class="r113-mini-bar"><i style="width:'+pc+'%"></i></div>':'')+'</div>';
  }).join('')+'</section>').join('');
}
function r113ReviewPanel(){
 const x=r11Review(r11ReviewDay),missing=x.records.filter(y=>y.fraction<=0),partial=x.records.filter(y=>y.fraction>0&&y.fraction<1),done=x.records.filter(y=>y.fraction>=1);
 const date=new Date(x.day+'T12:00:00').toLocaleDateString('it-IT',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
 const score=Number.isFinite(x.grade)?x.grade:null,ratio=score==null?0:Math.max(0,Math.min(100,Math.round(score*10)));
 const k=score==null?'Senza voto':score<4?'Giornata difficile':score<6?'Sotto le aspettative':score<7.5?'Discreta giornata':score<9?'Buona giornata':'Giornata eccellente';
 const top=[...missing,...partial].sort((a,b)=>b.difficulty-a.difficulty||a.name.localeCompare(b.name,'it')).slice(0,3);
 const archived=!!st?.reginaDailyReviews?.[x.day];
 return '<section class="card r113-review" aria-label="Bilancio personale">'+
 '<div class="r113-review-head"><div><span class="r113-eyebrow">Bilancio della giornata</span><h3>'+E(k)+'</h3><p class="muted">'+E(date)+'</p></div>'+
 '<div class="r113-grade"><strong>'+(score===null?'—':score.toLocaleString('it-IT',{minimumFractionDigits:1,maximumFractionDigits:1}))+'</strong><small>/10</small></div></div>'+
 '<div class="r113-grade-track" role="meter" aria-label="Voto della giornata" aria-valuemin="0" aria-valuemax="10" aria-valuenow="'+(score??0)+'"><i style="width:'+ratio+'%"></i></div>'+
 '<div class="r113-stats"><div class="r113-stat done"><strong>'+x.done+'</strong><small>Completate</small></div><div class="r113-stat partial"><strong>'+x.part+'</strong><small>Parziali</small></div><div class="r113-stat missed"><strong>'+x.missed+'</strong><small>Non svolte</small></div></div>'+
 '<label class="r113-date">Consulta un giorno <input type="date" value="'+E(r11ReviewDay)+'" onchange="reginaReview.select(this.value)"></label>'+
 (top.length?'<div class="r113-focus"><strong>⚠️ Priorità rimaste indietro</strong><p>'+top.map(y=>'<span>'+E(y.name)+(y.fraction>0?' · '+Math.round(y.fraction*100)+'%':'')+'</span>').join('')+'</p></div>':
   x.number?'<div class="r113-focus success">✅ Nessuna attività incompleta.</div>':'<div class="r113-focus">Non sono previste tappe in questa giornata.</div>')+
 '<div class="r113-review-folds">'+
 '<details '+(missing.length?'':'')+'><summary><span>🔴 Non svolte</span><b>'+missing.length+'</b></summary><div class="r113-fold-body">'+(missing.length?r113GroupItems(missing):'<p class="muted tiny">Nessuna.</p>')+'</div></details>'+
 '<details><summary><span>🟠 Completate in parte</span><b>'+partial.length+'</b></summary><div class="r113-fold-body">'+(partial.length?r113GroupItems(partial):'<p class="muted tiny">Nessuna.</p>')+'</div></details>'+
 '<details><summary><span>🟢 Completate</span><b>'+done.length+'</b></summary><div class="r113-fold-body">'+(done.length?r113GroupItems(done):'<p class="muted tiny">Nessuna.</p>')+'</div></details>'+
 '<details class="r113-trend"><summary><span>📈 Ultimi sette giorni e medie</span></summary><div class="r113-fold-body">'+r11WeekStrip(r11ReviewDay)+'</div></details></div>'+
 (archived?'<p class="r113-foot">🔒 Voto archiviato alla chiusura della partita: resta invariato.</p>':
  x.day<TODAY()?'<p class="r113-foot">I voti precedenti al nuovo archivio potrebbero essere ricostruiti da dati parziali.</p>':'<p class="r113-foot">Il voto considera completamento e difficoltà delle tappe, senza bonus aggiuntivi alle partite.</p>')+
 '</section>';
}
r11ReviewPanel=r113ReviewPanel;

// 2. Planner: il normale scorrimento della lista rimane libero; per trascinare
// su Android si parte dall'impugnatura ⠿, che disabilita il pan nativo SOLO lì.
// La vecchia gestione touch viene intercettata in cattura per evitare che
// due gestori competano e annullino il drag dopo qualche centimetro.
let r113Touch=null,r113Frame=0,r113Chip=null,r113ActiveTarget=null,r113Mouse=null;
function r113Pane(){return document.querySelector('.regina-pl-scroll')}
function r113TouchPoint(ev){const list=ev.changedTouches||ev.touches||[];
 if(!r113Touch)return list[0]||null;
 return [...list].find(t=>t.identifier===r113Touch.identifier)||list[0]||null;
}
function r113Distance(v,zone,edge){const n=Math.max(0,zone-v);return Math.min(70,Math.max(17,n*.72+8))}
function r113UpdateTarget(){
 if(!r113Touch||!r113Touch.active)return;
 const {x,y}=r113Touch;
 const node=document.elementFromPoint(x,y)?.closest?.('.regina-pl-drop')||null;
 if(r113ActiveTarget!==node){r113ActiveTarget?.classList.remove('regina-pl-over');r113ActiveTarget=node;r113ActiveTarget?.classList.add('regina-pl-over')}
 if(r113Chip){r113Chip.style.left=Math.min(Math.max(8,x+12),innerWidth-185)+'px';r113Chip.style.top=Math.min(Math.max(18,y-56),innerHeight-74)+'px';
  if(node){const label=new Date(node.dataset.day+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric'});r113Chip.innerHTML='<b>📅 '+E(label)+'</b><small>'+E(node.querySelector('small')?.textContent||'')+'</small>'}
  else r113Chip.innerHTML='<b>⠿ Sposta la tappa</b><small>Scorri ai bordi · rilascia su una fascia</small>';
 }
}
function r113ScrollV(dy){
 if(!dy)return false;
 const doc=document.scrollingElement||document.documentElement;
 const before=doc.scrollTop,max=Math.max(0,doc.scrollHeight-doc.clientHeight);
 if(max>0){doc.scrollTop=Math.min(max,Math.max(0,before+dy));if(doc.scrollTop!==before)return true}
 // Alcune pagine ospitanti scorrono in un contenitore diverso dal documento.
 let el=r113Touch?.origin||null;
 for(let n=el?.parentElement;n;n=n.parentElement){
  if(n.scrollHeight>n.clientHeight+40&&getComputedStyle(n).overflowY.match(/auto|scroll/)){
   const prev=n.scrollTop;n.scrollTop+=dy;if(n.scrollTop!==prev)return true;
  }
 }
 return false;
}
function r113ScrollTick(){
 r113Frame=0;if(!r113Touch?.active)return;
 const {x,y}=r113Touch,ww=innerWidth,hh=innerHeight;
 const bandY=Math.min(180,Math.max(105,hh*.23));
 const topD=y<bandY?-r113Distance(y,bandY):0;
 const botD=y>hh-bandY?r113Distance(hh-y,bandY):0;
 r113ScrollV(topD||botD);
 const pane=r113Pane();
 if(pane){const box=pane.getBoundingClientRect();if(box.bottom>0&&box.top<hh){
  // Due zone laterali indipendenti: trascina verso un bordo per muovere
  // continuamente il calendario fino a qualunque giorno della settimana.
  const bandX=Math.min(135,Math.max(75,box.width*.27));
  const left=x<box.left+bandX?-r113Distance(x-box.left,bandX):0;
  const right=x>box.right-bandX?r113Distance(box.right-x,bandX):0;
  if(left||right){pane.scrollLeft+=left||right;}
 }}
 r113UpdateTarget();r113Frame=requestAnimationFrame(r113ScrollTick);
}
function r113StartDragging(){
 if(!r113Touch||r113Touch.active)return;
 r113Touch.active=true;r113Touch.origin?.classList.add('regina-pl-dragging');
 r113Chip=document.createElement('div');r113Chip.className='r113-drag-chip';r113Chip.setAttribute('aria-hidden','true');document.body.appendChild(r113Chip);
 r113UpdateTarget();r113Frame=requestAnimationFrame(r113ScrollTick);
 navigator.vibrate?.(12);
}
function r113Cleanup(){
 if(r113Touch?.timer)clearTimeout(r113Touch.timer);
 if(r113Frame)cancelAnimationFrame(r113Frame);r113Frame=0;
 r113Touch?.origin?.classList.remove('regina-pl-dragging');
 r113ActiveTarget?.classList.remove('regina-pl-over');r113ActiveTarget=null;
 r113Chip?.remove();r113Chip=null;r113Touch=null;
}
// Gestori registrati in capture: i vecchi listener touch in bubble non
// devono attivare il loro timer e perdere la posizione di scorrimento.
document.addEventListener('touchstart',ev=>{
 const grip=ev.target.closest?.('.regina-pl-grip');
 if(!grip)return;
 const item=grip.closest('.regina-pl-item');if(!item)return;
 ev.stopImmediatePropagation();ev.preventDefault();
 const p=ev.changedTouches[0];r113Cleanup();
 r113Touch={identifier:p.identifier,id:item.dataset.reginaId,x:p.clientX,y:p.clientY,origin:item,active:false,timer:0};
 r113Touch.timer=setTimeout(r113StartDragging,180);
},{capture:true,passive:false});
document.addEventListener('touchmove',ev=>{
 if(!r113Touch)return;
 const p=r113TouchPoint(ev);if(!p)return;
 ev.stopImmediatePropagation();ev.preventDefault();
 r113Touch.x=p.clientX;r113Touch.y=p.clientY;
 // Un movimento sulla maniglia implica intenzione di trascinare.
 if(!r113Touch.active)r113StartDragging();
 r113UpdateTarget();
},{capture:true,passive:false});
document.addEventListener('touchend',ev=>{
 if(!r113Touch)return;
 ev.stopImmediatePropagation();ev.preventDefault();
 const dest=r113ActiveTarget,id=r113Touch.id;
 const pos=window.scrollY,left=r113Pane()?.scrollLeft||0;
 r113Cleanup();
 if(dest?.dataset?.day&&dest?.dataset?.slot){
  const ok=rMoveTask(id,dest.dataset.day,dest.dataset.slot);
  if(ok)requestAnimationFrame(()=>{const pane=r113Pane();if(pane)pane.scrollLeft=left;
   // Lascio la vista sul calendario, anziché riportarla all'inizio pagina.
   window.scrollTo(0,Math.min(pos,Math.max(0,document.documentElement.scrollHeight-innerHeight)));
  });
 }else r113Toast('Tappa non spostata: trascina ⠿ su una fascia del calendario, oppure usa 📅 Sposta.');
},{capture:true,passive:false});
document.addEventListener('touchcancel',ev=>{
 if(!r113Touch)return;ev.stopImmediatePropagation();r113Cleanup();
},{capture:true,passive:true});
// Autoscorrimento anche col mouse e HTML Drag & Drop su desktop.
document.addEventListener('dragover',ev=>{
 if(!rDragId)return;
 const pane=r113Pane(),x=ev.clientX,y=ev.clientY;
 const edge=90;if(y<edge)r113ScrollV(-25);else if(y>innerHeight-edge)r113ScrollV(25);
 if(pane){const b=pane.getBoundingClientRect();if(b.top<innerHeight&&b.bottom>0){if(x<b.left+edge)pane.scrollLeft-=30;else if(x>b.right-edge)pane.scrollLeft+=30;}}
},{capture:true});

// 3. Alternativa comoda al trascinamento. Dialogo compatto e nativo con
// selezione della data e della fascia; utile per le tappe molto lontane.
function r113Toast(msg){
 document.querySelector('.r113-toast')?.remove();let p=document.createElement('div');p.className='r113-toast';p.textContent=msg;document.body.appendChild(p);setTimeout(()=>p.remove(),3700);
}
window.reginaPlan.quickMove=function(id){
 const g=rGoalStore(),t=rCurrentTask(g,id);if(!t)return;
 const old=document.querySelector('#r113-move-dialog');old?.remove();
 const d=new Date(rPlannerDay+'T12:00:00'),week=rWeekStart(rPlannerDay),days=Array.from({length:7},(_,i)=>PLUS(week,i));
 const current=rD(String(t.due||t.occurrenceDate||'').slice(0,10))||rPlannerDay;
 const f=document.createElement('div');f.id='r113-move-dialog';f.className='r113-modal';
 f.innerHTML='<div class="r113-modal-box" role="dialog" aria-modal="true" aria-label="Sposta tappa">'+
 '<div class="row spread"><h3>📅 Sposta tappa</h3><button type="button" class="btn alt" data-close="1">✕</button></div>'+
 '<p><b>'+E(t.title)+'</b></p><label>Giorno<input type="date" id="r113-date" value="'+E(current)+'"></label>'+
 '<div class="r113-quick-days">'+days.map(day=>'<button class="btn alt" type="button" data-date="'+day+'">'+E(new Date(day+'T12:00:00').toLocaleDateString('it-IT',{weekday:'short',day:'numeric'}))+'</button>').join('')+'</div>'+
 '<label>Fascia del giorno<select id="r113-slot">'+R_SLOTS.map(([k,v])=>'<option value="'+E(k)+'" '+(rTaskMeta(t).slot===k?'selected':'')+'>'+E(v)+'</option>').join('')+'</select></label>'+
 '<div class="row"><button type="button" class="btn" data-apply="1">Sposta nel calendario</button><button type="button" class="btn alt" data-close="1">Annulla</button></div></div>';
 const close=()=>f.remove();f.addEventListener('click',ev=>{
  if(ev.target===f||ev.target.closest('[data-close]'))return close();
  const day=ev.target.closest('[data-date]');if(day){f.querySelector('#r113-date').value=day.dataset.date;f.querySelectorAll('[data-date]').forEach(b=>b.classList.toggle('selected',b===day));return;}
  if(ev.target.closest('[data-apply]')){
   const date=f.querySelector('#r113-date').value,slot=f.querySelector('#r113-slot').value;
   if(!date)return r113Toast('Seleziona un giorno.');close();
   if(rMoveTask(id,date,slot)){rPlannerDay=date;rPlannerSave();render();r113Toast('✅ Tappa spostata al '+date+'.');}
  }
 });document.body.appendChild(f);
};
// Inserisce il pulsante Sposta in ogni tappa del calendario e nell'arretrato,
// senza modificarne lo schema, i dati o i gestori originali.
const r113PreviousObjectives=objectivesView;
objectivesView=function(){
 const html=r113PreviousObjectives(),tmp=document.createElement('template');tmp.innerHTML=html;
 for(const item of tmp.content.querySelectorAll('.regina-pl-item')){
  const id=item.dataset.reginaId;if(!id)continue;
  const grip=item.querySelector('.regina-pl-grip');if(grip){grip.title='Tieni premuto qui per trascinare';grip.setAttribute('aria-label','Trascina questa tappa');}
  const button=document.createElement('button');button.type='button';button.className='regina-pl-move';button.textContent='📅';button.title='Sposta a un giorno e fascia';
  button.setAttribute('aria-label','Sposta '+(item.querySelector('.regina-pl-title')?.textContent||'tappa'));
  button.setAttribute('onclick','reginaPlan.quickMove('+JSON.stringify(id)+')');
  const edit=item.querySelector('.regina-pl-edit');if(edit)edit.before(button);else item.appendChild(button);
 }
 // La guida segnala l'impugnatura: è il modo affidabile per trascinare con
 // un dito senza disabilitare lo scorrimento naturale delle liste.
 const planner=tmp.content.querySelector('.regina-planner .row.spread small.muted');
 if(planner)planner.textContent='Trascina dal simbolo ⠿ e tieni il dito vicino ai bordi per scorrere. Oppure usa 📅 per spostare subito una tappa.';
 return tmp.innerHTML;
};

// All'apertura del calendario sul telefono, mostra subito il giorno corrente.
// Lo scorrimento manuale successivo viene mantenuto anche dopo un aggiornamento.
let r113LastWeek='',r113LastHorizontal=null;
document.addEventListener('scroll',ev=>{
 const sc=ev.target?.closest?.('.regina-pl-scroll');if(sc&&r113Touch===null){
  r113LastHorizontal=sc.scrollLeft;r113LastWeek=rWeekStart(rPlannerDay);
 }
},{capture:true,passive:true});
const r113RenderBefore=render;
render=function(...args){
 const result=r113RenderBefore.apply(this,args);
 if(view==='objectives')requestAnimationFrame(()=>{
  const pane=r113Pane();if(!pane)return;
  const week=rWeekStart(rPlannerDay);
  if(r113LastWeek===week&&r113LastHorizontal!==null){pane.scrollLeft=r113LastHorizontal;return;}
  const focusDay=pane.querySelector('.regina-pl-today')||[...pane.querySelectorAll('.regina-pl-day h4')].find(x=>x.textContent.includes('lun'));
  if(focusDay&&innerWidth<680){const p=focusDay.closest('.regina-pl-day'),box=p.getBoundingClientRect(),container=pane.getBoundingClientRect();
   pane.scrollLeft+=box.left-container.left-container.width*.22;
  }
  r113LastWeek=week;r113LastHorizontal=pane.scrollLeft;
 });
 return result;
};
const r113OldWeek=window.reginaPlan.week,r113OldToday=window.reginaPlan.today;
window.reginaPlan.week=function(...args){r113LastHorizontal=null;return r113OldWeek.apply(this,args)};
window.reginaPlan.today=function(...args){r113LastHorizontal=null;return r113OldToday.apply(this,args)};

// 4. Migliorie responsive: sul telefono il planner occupa tutta la larghezza
// utile, ma resta un vero calendario a 7 giorni (scorrimento orizzontale).
const r113Styles=document.createElement('style');r113Styles.textContent=`
.r113-review{background:#fff!important;border:1px solid #e0e9ee;border-radius:15px!important;padding:15px!important}
.r113-review-head{display:flex;justify-content:space-between;align-items:center;gap:12px}.r113-review-head h3{margin:6px 0;font-size:19px;line-height:1.23}
.r113-review-head p{margin:3px 0 8px;font-size:12px;text-transform:capitalize}.r113-eyebrow{font-size:10px;letter-spacing:.11em;font-weight:800;color:#24667b}
.r113-grade{background:#ecf7f5;min-width:82px;border-radius:14px;padding:12px 10px;text-align:center;color:#116a69;flex-shrink:0}
.r113-grade strong{font-size:30px;line-height:1}.r113-grade small{font-size:12px}
.r113-grade-track{height:9px;border-radius:20px;background:#e5eef1;overflow:hidden;margin:13px 0}.r113-grade-track i{display:block;background:#208c94;height:100%;border-radius:20px;transition:width .2s}
.r113-stats{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:7px;margin:12px 0 16px}.r113-stat{padding:10px 4px;border-radius:10px;text-align:center;border:1px solid #dbe9e8}
.r113-stat strong{font-size:22px;display:block;line-height:1.15}.r113-stat small{font-size:10px;display:block;margin-top:3px;line-height:1.2}
.r113-stat.done{background:#f0faf4;color:#256d4a}.r113-stat.partial{background:#fff8e8;color:#97700f}.r113-stat.missed{background:#fff4f1;color:#a43d35}
.r113-date{display:flex;justify-content:space-between;align-items:center;gap:8px;font-size:12px;font-weight:700;color:#45626d;margin-bottom:14px}
.r113-date input{max-width:165px;width:55%;padding:6px 9px;border:1px solid #cfdde1;border-radius:8px;background:#fff}
.r113-focus{padding:12px;border-radius:10px;background:#fff9ef;border:1px solid #f0e1c8;font-size:12px;line-height:1.45;margin:12px 0}
.r113-focus>strong{display:block;margin-bottom:8px;font-size:13px}.r113-focus p{display:flex;flex-wrap:wrap;gap:5px;margin:0}.r113-focus p>span{background:#fff;border:1px solid #e5d7bc;border-radius:7px;padding:5px 7px;max-width:100%}
.r113-focus.success{background:#eef9f1}.r113-review-folds details{border:1px solid #dae5e7;border-radius:10px;margin:8px 0;overflow:hidden;background:#fff}
.r113-review-folds details>summary{cursor:pointer;padding:12px 11px;display:flex;align-items:center;justify-content:space-between;gap:12px;font-size:13px;font-weight:700}
.r113-review-folds details>summary b{background:#edf4f5;border-radius:7px;min-width:26px;text-align:center;padding:3px}
.r113-fold-body{padding:2px 11px 12px;border-top:1px solid #e4eaec}.r113-front{margin:9px 0 15px}.r113-front h5{font-size:12px;color:#385969;margin:5px 0 8px;display:flex;justify-content:space-between;gap:7px}
.r113-front h5 span{font-weight:normal;color:#829ca6}.r113-entry{padding:9px 0;border-top:1px solid #edf1f2}.r113-entry-title{font-size:13px;font-weight:600;line-height:1.4;overflow-wrap:anywhere}
.r113-entry-sub{display:flex;justify-content:space-between;gap:12px;flex-wrap:wrap;color:#70868b;font-size:11px;margin-top:4px}
.r113-part-pct{color:#bd7627;font-weight:700}.r113-mini-bar{height:4px;background:#eff0ee;border-radius:9px;margin-top:5px}.r113-mini-bar i{display:block;height:100%;background:#f2a846;border-radius:9px}
.r113-trend .regina-review-strip{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px}.r113-trend .regina-review-day{min-width:0;padding:6px 1px}
.r113-foot{font-size:11px;color:#68838c;line-height:1.45;margin:15px 0 0}
.regina-planner{max-width:100%;min-width:0}.regina-pl-scroll{max-width:100%;width:100%;overflow-x:auto;overflow-y:hidden;-webkit-overflow-scrolling:touch;touch-action:auto;overscroll-behavior-x:contain}
.regina-pl-grip{touch-action:none!important;user-select:none;-webkit-user-select:none;cursor:grab;display:inline-flex;align-items:center;justify-content:center;min-width:24px;min-height:30px;border-radius:7px;background:#edf7fa}
.regina-pl-item{touch-action:auto!important}.regina-pl-item .regina-pl-move{border:1px solid #cadbe1;border-radius:6px;background:#f6fbff;padding:5px 7px;font-size:15px;flex-shrink:0}
.regina-pl-item .regina-pl-edit{flex-shrink:0}.regina-pl-over{background:#b8e6f1!important;outline:2px solid #168db1;outline-offset:-2px}
.r113-drag-chip{position:fixed;z-index:999999;pointer-events:none;background:#154d64;color:#fff;padding:9px 11px;min-width:125px;max-width:180px;border-radius:10px;box-shadow:0 5px 18px #17364450;line-height:1.3}
.r113-drag-chip b{display:block;font-size:12px}.r113-drag-chip small{display:block;font-size:10px;margin-top:4px;color:#d9f2fa}
.r113-toast{position:fixed;z-index:999999;left:16px;right:16px;bottom:75px;background:#194f5f;color:#fff;border-radius:12px;padding:13px;font-size:13px;text-align:center;box-shadow:0 4px 16px #0003}
.r113-modal{position:fixed;inset:0;z-index:999999;background:#0c293b80;display:flex;align-items:center;justify-content:center;padding:16px}
.r113-modal-box{background:#fff;color:#1a343e;width:100%;max-width:450px;max-height:88vh;overflow:auto;border-radius:15px;padding:18px}
.r113-modal-box h3{margin:0}.r113-modal-box label{display:block;margin:14px 0;font-size:13px;font-weight:700}.r113-modal-box label input,.r113-modal-box label select{display:block;width:100%;margin-top:6px;padding:9px;border:1px solid #cbdde0;border-radius:8px}
.r113-quick-days{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin:12px 0}.r113-quick-days .btn{padding:7px 2px;font-size:10px;min-width:0}
.r113-quick-days .btn.selected{background:#d6eff4;border-color:#1b7897}
@media(max-width:600px){.r113-review{padding:13px!important}.regina-pl-week{min-width:1180px;grid-template-columns:repeat(7,minmax(168px,1fr))}
.regina-planner{padding:6px!important}.regina-pl-backlog{max-width:100%}.r113-stats{gap:5px}.r113-stat small{font-size:9px}}
`;
document.head.appendChild(r113Styles);



// ============================================================================
// REGINA CALCIO 1.1.4 — Ore di lavoro e studio: bonus TECNICA facoltativo
// Le ore realmente svolte si registrano solo su richiesta. Nessuna scadenza,
// nessun obiettivo mancante, nessuna penalità quando si registrano zero ore.
// I dati sono piccoli, giornalieri e inclusi nel backup completo della carriera.
// ============================================================================
const r114VERSION='1.1.4';
const r114MaxOne=16, r114MaxTotal=24;
function r114Day(day){return rD(day)||st?.nextDay||TODAY()}
function r114Hours(day){
 const d=r114Day(day),v=st?.reginaWorkStudyHours?.[d]||{};
 const clean=x=>Math.round(Math.max(0,Math.min(r114MaxOne,Number(x)||0))*4)/4;
 return {day:d,work:clean(v.work),study:clean(v.study),total:clean(v.work)+clean(v.study)};
}
function r114HoursNumber(n){return Number(n||0).toLocaleString('it-IT',{maximumFractionDigits:2})}
function r114HoursInfo(day){
 const x=r114Hours(day);
 const line=[x.work?'Lavoro '+r114HoursNumber(x.work)+' h':'',x.study?'Studio '+r114HoursNumber(x.study)+' h':''].filter(Boolean).join(' · ');
 return line||'Nessuna ora extra registrata';
}
window.reginaHours={
 save(day,work,study){
  if(!st)return alert('Avvia prima una carriera calcistica.');
  const d=rD(day);if(!d)return alert('Data non valida.');
  const normalize=(value,label)=>{
   if(String(value).trim()==='')return 0;
   const n=Number(String(value).trim().replace(',','.'));
   if(!Number.isFinite(n)||n<0||n>r114MaxOne||Math.abs(n*4-Math.round(n*4))>.00001)throw Error(label+': inserisci ore tra 0 e 16, a intervalli di 15 minuti.');
   return Math.round(n*4)/4;
  };
  let w=0,s=0;
  try{w=normalize(work,'Lavoro');s=normalize(study,'Studio');if(w+s>r114MaxTotal)throw Error('Massimo 24 ore complessive per giornata.')}catch(e){return alert(e.message)}
  const old=st.reginaWorkStudyHours?structuredClone(st.reginaWorkStudyHours):null;
  st.reginaWorkStudyHours=st.reginaWorkStudyHours||{};
  if(w+s>0)st.reginaWorkStudyHours[d]={work:w,study:s,updatedAt:new Date().toISOString()};
  else delete st.reginaWorkStudyHours[d];
  // Le giornate già giocate rimangono storiche: niente ricalcolo della partita.
  const ok=persist();
  if(ok===false){st.reginaWorkStudyHours=old||{};return alert('Ore non salvate: verifica lo stato del salvataggio in Impostazioni.');}
  document.getElementById('r114-hours-modal')?.remove();
  render();
 },
 today(){
  const box=document.getElementById('r114-hours-today');if(!box)return;
  this.save(box.dataset.day,box.querySelector('[name="r114work"]')?.value||0,box.querySelector('[name="r114study"]')?.value||0);
 },
 edit(day){
  if(!st)return;
  const x=r114Hours(day),m=document.createElement('div');m.id='r114-hours-modal';m.className='r114-modal';
  const archived=(st.results||[]).some(r=>r.day===x.day);
  m.innerHTML='<section class="r114-dialog" role="dialog" aria-modal="true" aria-label="Ore extra di lavoro e studio">'+
  '<div class="r114-dialog-top"><h3>📚 Bonus Tecnica</h3><button type="button" class="btn alt" data-close>✕</button></div>'+
  '<p class="muted">'+E(x.day)+' · Registra soltanto le ore effettivamente svolte, senza creare impegni obbligatori.</p>'+
  '<div class="r114-hour-inputs"><label>💼 Lavoro (ore)<input name="work" type="number" min="0" max="16" step="0.25" inputmode="decimal" value="'+x.work+'"></label>'+
  '<label>📖 Studio (ore)<input name="study" type="number" min="0" max="16" step="0.25" inputmode="decimal" value="'+x.study+'"></label></div>'+
  (archived?'<p class="r114-note">🔒 Partita già disputata: le ore verranno conservate nello storico, ma non cambieranno risultato o voto archiviato.</p>':'<p class="r114-note">Un bonus positivo alla Tecnica, mai una penalità se lasci a zero.</p>')+
  '<div class="row"><button class="btn" type="button" data-save>Salva ore</button><button class="btn alt" type="button" data-close>Annulla</button></div></section>';
  m.addEventListener('click',ev=>{if(ev.target===m||ev.target.closest('[data-close]'))m.remove();if(ev.target.closest('[data-save]'))this.save(x.day,m.querySelector('[name="work"]').value,m.querySelector('[name="study"]').value)});
  document.body.appendChild(m);
 },
 record(day){return r114Hours(day)}
};

// Le ore agiscono sul fronte TECNICA soltanto in positivo: se sono assenti la
// funzione precedente restituisce ESATTAMENTE gli stessi valori di prima.
// Le ore aggiungono credito equivalente a lavoro/studio completato, senza
// gonfiare il numero di tappe previste o abbassare il voto nei giorni senza ore.
const r114PreviousMetrics=taskMetrics;
taskMetrics=function(){
 const m=r114PreviousMetrics(),data=r114Hours(st?.nextDay||TODAY());
 if(!data.total)return m;
 const techTasks=todayTasks().filter(t=>taskHasCategory(t,'technical'));
 if(techTasks.length){
  const planned=techTasks.reduce((n,t)=>n+rTaskMeta(t).difficulty,0);
  const finished=techTasks.reduce((n,t)=>n+rTaskMeta(t).difficulty*rLim(t.fraction,0,1),0);
  const extra=Math.min(12,data.total)*2.5; // credito extra, NON un'obbligazione
  const enhanced=.45+9.55*(finished+extra)/(planned+extra);
  m.technical=rLim(Math.max(m.technical,enhanced));
 }
 // Se Tecnica era già 10/10 per assenza di tappe, il lavoro svolto deve
 // comunque produrre un piccolo vantaggio reale: non si va oltre 10/10 nella UI.
 m.reginaWorkStudyHours=data.total;
 m.reginaHoursMatchBoost=Math.min(.63,.07*data.total);
 return m;
};
const r114PreviousCalcTeam=calcTeam;
calcTeam=function(id,metrics){
 const out=r114PreviousCalcTeam(id,metrics);
 const boost=(id===st?.club)?Math.max(0,Number(metrics?.reginaHoursMatchBoost)||0):0;
 if(boost>0&&out){
  out.performance+=boost;
  for(const f of Object.values(out.forms||{}))if(Number.isFinite(f.effective))f.effective=rLim(f.effective+boost);
 }
 return out;
};

// Il voto personale include il tempo extra come CREDITO POSITIVO di lavoro:
// aumenta il numeratore e il denominatore soltanto quando ci sono ore fatte.
// Nessuna ora registrata => voto identico alla versione precedente.
const r114OldReviewLive=r11ReviewLive;
r11ReviewLive=function(day){
 const x=r114OldReviewLive(day),time=r114Hours(day);
 if(!time.total)return x;
 x.reginaHours={work:time.work,study:time.study,total:time.total};
 if(x.number>0){
  const weight=x.records.reduce((s,t)=>s+t.difficulty,0);
  const points=x.records.reduce((s,t)=>s+t.difficulty*t.fraction,0);
  const extra=Math.min(12,time.total)*2.5;
  x.grade=Math.round(100*(points+extra)/(weight+extra))/10;
 }
 return x;
};

// Campo intuitivo in OGGI: il dato compare nel contesto della giornata senza
// creare una nuova tappa, e viene salvato su richiesta insieme alla carriera.
const r114OldToday=todayView;
todayView=function(){
 const html=r114OldToday();if(!st)return html;
 const doc=document.createElement('template');doc.innerHTML=html;
 const day=st.nextDay||TODAY(),h=r114Hours(day);
 const block=document.createElement('details');block.className='r114-hours-card';block.id='r114-hours-today';block.dataset.day=day;
 block.innerHTML='<summary class="r114-hours-title"><b>Ore di lavoro e studio</b><strong>'+r114HoursNumber(h.total)+' h</strong></summary><small class="r115-bonus-note">Bonus facoltativo per la Tecnica</small>'+
 '<div class="r114-hour-inputs"><label>💼 Lavoro (h)<input name="r114work" type="number" inputmode="decimal" min="0" max="16" step="0.25" value="'+h.work+'"></label>'+
 '<label>📖 Studio (h)<input name="r114study" type="number" inputmode="decimal" min="0" max="16" step="0.25" value="'+h.study+'"></label></div>'+
 '<div class="r114-hours-foot"><span>Solo ore effettive · anche 15 minuti</span><button class="btn" type="button" onclick="reginaHours.today()">Salva ore</button></div>';
 const heading=[...doc.content.querySelectorAll('h3')].find(el=>el.textContent.includes('Tappe previste per la giornata'));
 if(heading)heading.before(block);else doc.content.querySelector('.card')?.append(block);
 return doc.innerHTML;
};

// Il riepilogo può essere consultato per data: mette in evidenza solo il lavoro
// effettivo, senza presentare lo zero come un'attività mancata.
const r114PreviousReviewPanel=r11ReviewPanel;
r11ReviewPanel=function(){
 const html=r114PreviousReviewPanel(),x=r11Review(r11ReviewDay),h=r114Hours(r11ReviewDay);
 const line=h.total?'<b>+'+r114HoursNumber(h.total)+' ore di Tecnica</b><small>'+E(r114HoursInfo(r11ReviewDay))+' · credito extra positivo</small>':
 '<span class="muted">Ore extra non inserite: nessuna penalità</span>';
 const card='<div class="r114-review-hours"><div>📚 '+line+'</div><button class="btn alt" type="button" onclick="reginaHours.edit(\''+E(r11ReviewDay)+'\')">✎ Ore</button></div>';
 const last=html.lastIndexOf('</section>');return last>=0?html.slice(0,last)+card+html.slice(last):html+card;
};

const r114OldHeader=header;
header=function(){return r114OldHeader().replace('v1.1.3','v1.1.15')};
const r114CSS=document.createElement('style');r114CSS.textContent=`
.r114-hours-card{border:1px solid #c8e0e2;border-radius:13px;padding:13px;margin:18px 0;background:#f3faf9}
.r114-hours-title{display:flex;align-items:flex-start;justify-content:space-between;gap:10px}
.r114-hours-title b{font-size:14px;color:#175e6c}.r114-hours-title small{display:block;font-size:11px;color:#62808b;margin:5px 0;line-height:1.4}
.r114-hours-title strong{background:#dbf3eb;color:#175f49;border-radius:9px;padding:5px 9px;font-size:14px;white-space:nowrap}
.r114-hour-inputs{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px;margin-top:13px}
.r114-hour-inputs label{font-size:12px;font-weight:650;color:#32525e;min-width:0}
.r114-hour-inputs input{display:block;margin-top:5px;min-width:0;width:100%;box-sizing:border-box;border:1px solid #c8dce0;border-radius:8px;padding:9px 8px;font-size:16px;background:#fff;color:#17313a}
.r114-hours-foot{display:flex;align-items:center;justify-content:space-between;gap:9px;margin-top:12px}
.r114-hours-foot span{font-size:11px;color:#60818a}.r114-hours-foot .btn{flex-shrink:0}
.r114-review-hours{display:flex;justify-content:space-between;align-items:center;gap:10px;border-top:1px solid #dfeaec;margin-top:14px;padding-top:12px;font-size:12px}
.r114-review-hours>div{display:block;line-height:1.5}.r114-review-hours b{font-size:13px;color:#196c62}.r114-review-hours small{display:block;color:#65808a}.r114-review-hours button{flex-shrink:0}
.r114-modal{position:fixed;inset:0;z-index:999999;background:#092737a8;display:flex;align-items:center;justify-content:center;padding:16px}
.r114-dialog{background:#fff;border-radius:14px;padding:17px;width:100%;max-width:440px;max-height:90vh;overflow:auto;color:#173743;box-sizing:border-box}
.r114-dialog-top{display:flex;align-items:center;justify-content:space-between}.r114-dialog-top h3{margin:0}
.r114-note{background:#f1f8fa;border-radius:8px;padding:10px 12px;font-size:12px;line-height:1.5}
@media(max-width:360px){.r114-hours-card{padding:10px}.r114-hours-foot{flex-wrap:wrap}}
`;document.head.appendChild(r114CSS);


// I pulsanti dei giorni spostano solo il calendario, senza riprogrammare tappe.
document.addEventListener('click',event=>{
 const button=event.target.closest?.('.r115-day-index button');
 if(!button)return;
 const pane=button.closest('.regina-planner').querySelector('.regina-pl-scroll');
 const column=pane.querySelectorAll('.regina-pl-day')[Number(button.dataset.dayIndex)];
 if(column)pane.scrollLeft+=column.getBoundingClientRect().left-pane.getBoundingClientRect().left;
});
const visualStyle=document.createElement('style');
visualStyle.textContent=`
.r113-review,.regina-today-goals,.regina-planner,.r114-hours-card{
 --pitch:#155442;--ink:#162f2a;--line:#d4e2db;color:var(--ink);
 font-variant-numeric:tabular-nums;
}
.r113-review-head{background:#154b3d;color:white;padding:18px;border-radius:12px;align-items:center}
.r113-review-head h3{color:white;font-size:clamp(20px,4vw,28px);letter-spacing:-.025em}
.r113-review-head .muted,.r113-eyebrow{color:#dfede2}.r113-eyebrow{font-size:12px;letter-spacing:.04em}
.r113-grade{background:#d9edbb;color:#173c28;border-radius:9px;min-width:60px}
.r113-grade strong{font-size:32px;font-variant-numeric:tabular-nums}
.r113-grade-track{height:5px}.r113-grade-track i{background:var(--pitch)}
.r113-stat small{font-size:12px}.r113-stat.partial{color:#775307}
.r113-focus p{display:grid}.r113-focus p>span{border:0;background:transparent;border-top:1px solid #e5d7bc;border-radius:0;padding:7px 0 2px;overflow-wrap:anywhere}
.r113-review-folds details>summary{min-height:44px;box-sizing:border-box;justify-content:start}
.r113-review-folds summary b{margin-left:auto}
.r113-review-folds summary::after,.r114-hours-title::after,.regina-today-front summary::after{content:'▸';color:#3f6959}
.r113-review-folds details[open]>summary::after,.r114-hours-card[open]>.r114-hours-title::after,.regina-today-front[open]>summary::after{content:'▾'}
.r113-date input,.r114-hours-foot .btn,.r114-review-hours button{min-height:42px}
.r114-hours-card{background:#f6faf7;margin:14px 0;padding:0}
.r114-hours-card[open]{padding-bottom:12px}
.r114-hours-title{cursor:pointer;align-items:center;padding:10px 12px;min-height:44px;box-sizing:border-box}
.r114-hours-title b{color:var(--pitch);flex:1}.r114-hours-title strong{color:var(--pitch);background:#e2efdf}
.r114-hour-inputs,.r114-hours-foot,.r115-bonus-note{margin-inline:12px}
.r115-bonus-note{color:#496359}.regina-today-front{padding:0;border-color:var(--line);background:white}
.regina-today-front summary{padding:8px 12px;min-height:44px;box-sizing:border-box;color:var(--pitch);background:#f3f7f4;border-radius:9px}
.regina-today-front summary small{margin-left:auto}.regina-today-item{padding:8px 10px}
.regina-today-item:first-of-type{margin-top:0}.regina-today-title{min-width:0;overflow-wrap:anywhere;font-size:14px}
.regina-today-item:has(.go-steps){flex-wrap:wrap}.regina-today-item>.go-steps{flex-basis:100%;grid-column:1/-1;display:grid;width:100%}.regina-today-item>.go-steps label{display:flex;align-items:center;gap:8px;min-height:40px}.regina-today-btn{min-height:44px;min-width:44px;padding:5px}.regina-today-title small{color:#506c60}
.regina-pl-day{box-sizing:border-box;min-width:0;background:#f7faf8;border-color:var(--line)}
.regina-pl-day h4{background:#e7efea;color:#233e32;text-transform:capitalize}
.regina-pl-day h4.regina-pl-today{color:white;background:var(--pitch)}
.regina-pl-title{overflow-wrap:anywhere}.regina-pl-drop{background:#fff}.regina-pl-drop>small{color:#465e52;font-weight:650}
.r115-day-index{display:none}.regina-pl-backfront summary{padding-block:8px}
:is(.regina-planner,.r113-review,.regina-today-goals,.r114-hours-card) :focus-visible{outline:3px solid #226ec1;outline-offset:2px}
@media(max-width:650px){
 .regina-pl-toolbar{display:grid;grid-template-columns:1fr 1fr;align-items:stretch}
 .regina-pl-toolbar b{grid-row:1;grid-column:1/-1;text-align:center}
 .regina-pl-toolbar .btn{min-height:42px}.regina-pl-toolbar .btn:last-child{grid-column:1/-1}
 .r115-day-index{display:grid;grid-template-columns:repeat(7,minmax(0,1fr));gap:3px;margin:0 0 8px}
 .r115-day-index button{min-width:0;min-height:44px;padding:3px 0;border:1px solid var(--line);border-radius:7px;background:#fff;color:var(--pitch);cursor:pointer}
 .r115-day-index button[aria-current]{background:var(--pitch);color:white}
 .r115-day-index small,.r115-day-index b{display:block}
 .regina-pl-week{width:max-content;min-width:100%;grid-template-columns:repeat(7,clamp(190px,63vw,295px))}
 .regina-pl-grip,.regina-pl-item .regina-pl-edit,.regina-pl-item .regina-pl-move{min-height:44px;min-width:34px;box-sizing:border-box}
 .r113-stat small{font-size:11px}.regina-today-actions{margin-left:0}
}
@media(max-width:380px){.regina-today-item{display:grid;grid-template-columns:minmax(0,1fr)}.regina-today-actions{justify-content:flex-end}}
`;
document.head.appendChild(visualStyle);
// Redazione: ogni edizione si scrive una volta, con i dati disponibili al fischio finale.
function pressEdition(m, competition='league'){
 const me=st.club, home=m.a===me, rival=home?m.b:m.a;
 const ours=home?m.ga:m.gb, theirs=home?m.gb:m.ga, margin=ours-theirs;
 const club=pressClub(me,true), bare=pressClubName(me), opposition=pressClub(rival);
 const score=ours+'-'+theirs;
 const events=(m.events||[]).filter(e=>[m.a,m.b].includes(e.side)&&Number.isFinite(Number(e.minute))).slice().sort((a,b)=>a.minute-b.minute);
 const surname=e=>e?.name&&e.name!==pressClubName(e.side)?surnameForPress(e.name):'';
 const subject=e=>surname(e)||pressClub(e.side,true);
 let a=0,b=0;
 const goals=events.filter(e=>e.type==='gol').map(e=>{
  if(e.side===m.a)a++;else b++;
  return {...e,a,b,lead:(home?1:-1)*(a-b)};
 });
 const complete=a===m.ga&&b===m.gb;
 const last=complete?goals.at(-1):null;
 // Ultima rete che spezza la parità in favore di chi vince, anche se poi arriva il 3-1.
 const winner=complete&&margin?goals.filter((g,i)=>g.lead===Math.sign(margin)&&(goals[i-1]?.lead||0)===0).at(-1):null;
 const comeback=complete&&margin!==0&&goals.some(g=>g.lead*Math.sign(margin)<0);
 const misses=events.filter(e=>e.type==='rigore_sbagliato'), reds=events.filter(e=>e.type==='rosso');
 const bestChance=events.find(e=>e.type==='occasione'&&e.outcome==='palo')||
   events.find(e=>e.type==='occasione'&&e.outcome==='parata');
 const namedGoals=goals.filter(g=>g.side===me&&surname(g));
 const counts=new Map();for(const g of namedGoals)counts.set(surname(g),(counts.get(surname(g))||0)+1);
 const star=[...counts].sort((a,b)=>b[1]-a[1])[0];
 const league=competition==='league';
 const history=(st.results||[]).filter(r=>r.match&&[r.match.a,r.match.b].includes(me)&&
  (league?!r.stage&&!r.isCoppa&&!r.isEurope:competition==='post'?!!r.stage&&!r.isEurope&&!r.isCoppa:competition==='coppa'?r.isCoppa:r.cup===competition));
 const past=history.map(({match:g})=>Math.sign(g.a===me?g.ga-g.gb:g.gb-g.ga));
 const breakAt=past.findIndex(x=>x!==Math.sign(margin));
 const consecutive=1+(breakAt<0?past.length:breakAt);
 const penaltyWinner=[m.a,m.b].includes(m.pens?.winner)?m.pens.winner:null;
 let title,lead;
 if(penaltyWinner){
  title=bare+(penaltyWinner===me?' vince ai rigori':' cede ai rigori');
  lead=club+' e '+opposition+' chiudono sul '+score+'. Ai rigori si impone '+pressClub(penaltyWinner)+(m.pens.score?' per '+m.pens.score:'')+'.';
 }else if(league&&margin<0&&consecutive>=4){
  title=bare+' in crisi, '+consecutive+' sconfitte di fila';
  lead='Questa volta è '+opposition+' a fermare '+pressClub(me)+'. Il '+theirs+'-'+ours+' porta a '+consecutive+' le sconfitte consecutive in campionato.';
 }else if(comeback){
  title=margin>0&&surname(winner)?bare+', '+surname(winner)+' completa la rimonta':margin>0?bare+' ribalta '+pressClubName(rival):bare+', il vantaggio sfuma';
  lead=margin>0?club+' va sotto contro '+opposition+', poi rovescia la partita e vince '+score+'.':
   club+' si porta avanti, ma '+opposition+' rimonta e vince '+theirs+'-'+ours+'.';
 }else if(winner&&winner.minute>=80&&surname(winner)){
  title=margin>0?surname(winner)+' al '+winner.minute+'′, '+bare+' passa nel finale':bare+' cede al '+winner.minute+'′';
  lead=subject(winner)+' rompe l’equilibrio al '+winner.minute+'′. '+club+(margin>0?' batte ':' perde contro ')+opposition+' per '+(margin>0?score:theirs+'-'+ours)+'.';
 }else if(complete&&margin>0&&star?.[1]>=2){
  title=star[1]===2?'Doppietta di '+star[0]+', '+bare+' festeggia':star[0]+', '+star[1]+' gol per '+bare;
  lead=star[0]+' segna '+(star[1]===2?'due':star[1])+' volte. '+club+' batte '+opposition+' per '+score+'.';
 }else if(!margin&&last&&last.minute>=80){
  title=last.side===me?bare+' agguanta il pari al '+last.minute+'′':bare+', vittoria sfumata al '+last.minute+'′';
  lead=subject(last)+' firma il '+score+' al '+last.minute+'′. '+club+(last.side===me?' evita la sconfitta.':' vede sfumare il vantaggio.');
 }else if(!margin&&!ours){
  title=bare+'–'+pressClubName(rival)+', reti inviolate';
  lead=misses.length?'Il pallone più pesante arriva dal dischetto. '+subject(misses[0])+' fallisce al '+misses[0].minute+'′ e la gara tra '+pressClub(me)+' e '+opposition+' finisce 0-0.':
   bestChance?.outcome==='palo'?'Il palo ferma '+subject(bestChance)+' al '+bestChance.minute+'′. È l’occasione più vicina al gol nello 0-0 tra '+pressClub(m.a)+' e '+pressClub(m.b)+'.':
   'Finisce senza reti la sfida tra '+pressClub(m.a)+' e '+pressClub(m.b)+'.';
 }else if(Math.abs(margin)>=3){
  title=margin>0?bare+' segna '+ours+' volte contro '+pressClubName(rival):bare+' cede di schianto, '+pressClubName(rival)+' ne fa '+theirs;
  lead=margin>0?club+' batte '+opposition+' '+score+'. '+(theirs?'Il margine finale è di '+margin+' gol.':'Chiude anche con la porta inviolata.'):
   opposition.charAt(0).toUpperCase()+opposition.slice(1)+' batte '+pressClub(me)+' '+theirs+'-'+ours+'.';
 }else if(league&&margin>0&&past[0]===-1&&past[1]===-1){
  title=bare+' torna a vincere contro '+pressClubName(rival);
  lead=club+' ritrova la vittoria '+(home?'in casa':'in trasferta')+'. Contro '+opposition+' finisce '+score+'.';
 }else if(winner&&goals.length===1&&surname(winner)){
  title=margin>0?bare+', basta '+surname(winner):surname(winner)+' ferma '+bare;
  const when=winner.minute<=45?'nel primo tempo':'nella ripresa';
  lead=margin>0?'Un gol di '+surname(winner)+' '+when+' dà '+pressClubPrep('a',me)+' la vittoria contro '+opposition+'.':
   'Decide '+surname(winner)+' '+when+'. '+club+' perde di misura contro '+opposition+'.';
 }else{
  title=margin>0?bare+(home?' batte ':' vince contro ')+pressClubName(rival):margin<0?bare+' si arrende a '+pressClubName(rival):bare+' e '+pressClubName(rival)+' chiudono sul '+score;
  lead=margin>0?club+' supera '+opposition+' per '+score+(home?' in casa.':' in trasferta.'):margin<0?club+' perde '+theirs+'-'+ours+' contro '+opposition+'.':'Finisce '+score+' tra '+pressClub(m.a)+' e '+pressClub(m.b)+'.';
 }
 const body=[lead];
 // L’azione d’apertura e l’episodio decisivo bastano nel testo; il tabellino conserva tutti i marcatori.
 if(last){
  const first=goals[0],turns=[first];
  const parity=goals.filter(g=>g.lead===0&&g!==last).at(-1);
  if(parity&&comeback)turns.push(parity);
  if(winner&&winner!==first&&winner!==last)turns.push(winner);
  if(last!==first)turns.push(last);
  const lines=[];
  for(const g of turns){
   const detail=g.action&&!g.reginaRiscatto?' '+g.action:g.kind==='rigore'?' dal dischetto':g.kind==='punizione'?' su punizione':'';
   if(lead.includes('al '+g.minute+'′')&&turns.length>1&&g===last&&!detail)continue;
   const who=subject(g);
   if(g===first&&parity&&comeback&&parity===goals[1]&&!detail){
    lines.push(pressClub(g.side,true)+' passa al '+g.minute+'′ con '+who+'.');
   }else if(g===first&&turns.length===1&&detail&&lead.includes('al '+g.minute+'′'))lines.push('La rete arriva'+detail+'.');
   else if(g===first)lines.push(who+' apre le marcature al '+g.minute+'′'+detail+'.');
   else if(g.a===g.b){
    const half=g.minute>45&&first.minute<=45?'Nella ripresa ':'';
    lines.push(half+who+' risponde al '+g.minute+'′'+detail+'.');
   }
   else if(g===winner&&comeback)lines.push('Il sorpasso arriva al '+g.minute+'′: '+who+' segna'+detail+'.');
   else lines.push('Al '+g.minute+'′ '+who+' firma il '+g.a+'-'+g.b+detail+'.');
  }
  if(!(goals.length===1&&lead.includes('al '+first.minute+'′')&&!first.action))body.push(lines.join(' '));
 }
 const incidents=[];
 for(const e of [misses[0],reds[0]].filter(Boolean).sort((a,b)=>a.minute-b.minute)){
  if(e===misses[0]&&lead.startsWith('Il pallone'))continue;
  incidents.push(e.type==='rosso'?'Al '+e.minute+'′ l’arbitro espelle '+subject(e)+' ('+pressClubName(e.side)+').':
   subject(e)+' fallisce un rigore al '+e.minute+'′.');
 }
 if(!goals.length&&!incidents.length&&bestChance&&!lead.includes('palo')){
  const e=bestChance;
  incidents.push(e.outcome==='palo'?subject(e)+' colpisce il palo al '+e.minute+'′.':
   'Al '+e.minute+'′ '+subject(e)+' trova la parata '+(e.opponent&&e.opponent!=='il portiere'?'di '+surnameForPress(e.opponent):'del portiere')+'.');
 }
 const shots=m.stats?.shots,on=m.stats?.onTarget,i=home?0:1,j=1-i;
 if(Array.isArray(shots)&&shots.every(Number.isFinite)&&Math.abs(shots[i]-shots[j])>=5){
  const side=shots[i]>shots[j]?me:rival,idx=side===m.a?0:1;
  incidents.push(pressClub(side,true)+' conclude '+shots[idx]+' volte'+(Number.isFinite(on?.[idx])?' ('+on[idx]+' nello specchio)':'')+', contro le '+shots[1-idx]+' conclusioni '+pressClubPrep('di',side===me?rival:me)+'.');
 }
 if(incidents.length)body.push(incidents.join(' '));
 let context='';
 if(league){
  if(consecutive>=2&&!(margin<0&&consecutive>=4))context='Con questa sono '+consecutive+(margin>0?' vittorie':margin<0?' sconfitte':' pareggi')+(margin===0?' consecutivi':' consecutive')+' in campionato. ';
  else if(margin>0&&past[0]===-1&&past[1]===-1){const end=past.findIndex(n=>n!==-1);context='Si chiude così una serie di '+(end<0?past.length:end)+' sconfitte in campionato. ';}
  if(st.standings&&st.league){
   const table=sortedStandings(st.league),pos=table.findIndex(t=>t.id===me),row=table[pos];
   if(row&&Number.isFinite(row.pts)){
    context+=club+(margin<0?' resta':' sale')+' a quota '+row.pts+', al '+(pos+1)+'° posto.';
    const near=pos>0?table[pos-1]:table[1];
    if(near&&Number.isFinite(near.pts)){
     const gap=Math.abs(near.pts-row.pts);
     const distance=gap===1?'un punto':gap+' punti';
     context+=' '+(gap===0?'A pari punti c’è '+pressClub(near.id):pos>0?pressClub(near.id,true)+' precede '+pressClub(me)+' di '+distance:pressClub(near.id,true)+' segue a '+distance)+'.';
     const sameRound=st.roundLog?.[0];
     const other=sameRound?.day===st.nextDay&&sameRound.matches?.find(g=>(g.a!==m.a||g.b!==m.b)&&[g.a,g.b].includes(near.id));
     if(other){
      const isHome=other.a===near.id,forGoals=isHome?other.ga:other.gb,against=isHome?other.gb:other.ga;
      context+=' '+pressClub(near.id,true)+(forGoals===against?' ha pareggiato ':forGoals>against?' ha vinto ':' ha perso ')+(forGoals>=against?forGoals+'-'+against:against+'-'+forGoals)+' contro '+pressClub(isHome?other.b:other.a)+'.';
     }
    }
   }
  }
 }
 if(context.trim())body.push(context.trim());
 // Le dichiarazioni appartengono al campionato simulato e riprendono l’episodio.
 let quote='',speaker='';
 if(league&&margin<0&&consecutive>=4&&st.presidentName){
  speaker=surnameForPress(st.presidentName);
  quote='Dopo '+consecutive+' sconfitte di fila è giusto chiedere conto anche a chi dirige la società. Il primo a rispondere sono io.';
 }else if(star?.[1]>=2&&margin>0&&complete){
  speaker=star[0];quote='Mi tengo soprattutto il risultato. Segnare '+(star[1]===2?'due':star[1])+' volte e tornare a casa con una vittoria è un’altra cosa.';
 }else if(st.coachName&&last?.minute>=80&&!margin){
  speaker=surnameForPress(st.coachName);quote=last.side===me?'Il tempo per un altro pallone c’era. Siamo rimasti in partita e quel pallone è arrivato.':'A quel punto della partita volevamo portarci a casa il vantaggio. Ci è mancato poco, ma quel poco ci è costato caro.';
 }
 if(quote)body.push('Nel dopopartita '+speaker+' commenta: «'+quote+'»');
 const minutes=text=>text.replace(/\b([Aa])l (1|8|11|8[0-9])′/g,(_,a,n)=>a+'ll’'+n+'′');
 return {title:minutes(title),body:minutes(body.filter(Boolean).join('\n\n')),pressVersion:116};
}
// Il taglio varia con la partita e con le edizioni precedenti; la cronaca resta riproducibile.
const concisePress=pressEdition;
pressEdition=function(m,competition='league'){
 const original=concisePress(m,competition),me=st.club,home=m.a===me,opp=home?m.b:m.a;
 const gf=home?m.ga:m.gb,ga=home?m.gb:m.ga,diff=gf-ga;
 const club=pressClub(me),rival=pressClub(opp),name=pressClubName(me);
 const seed=(st.results||[]).length+m.ga*7+m.gb*11;
 const pick=lines=>lines[seed%lines.length];
 const events=(m.events||[]).filter(e=>[m.a,m.b].includes(e.side)&&Number.isFinite(Number(e.minute))).slice().sort((a,b)=>a.minute-b.minute);
 const who=e=>e.name&&e.name!==pressClubName(e.side)?surnameForPress(e.name):pressClub(e.side);
 const at=n=>([1,8,11].includes(+n)||(+n>=80&&+n<=89)?'all’':'al ')+n+'′';
 const goals=events.filter(e=>e.type==='gol');
 const reliable=goals.filter(e=>e.side===m.a).length===m.ga&&goals.filter(e=>e.side===m.b).length===m.gb;
 const paragraphs=[],initial=original.body.split('\n\n');
 paragraphs.push(initial[0]);
 if(reliable&&goals.length){
  const first=goals[0],last=goals.at(-1);
  if(first.side===opp&&diff>0){
   const equalizer=goals.find((e,index)=>goals.slice(0,index+1).filter(g=>g.side===me).length===goals.slice(0,index+1).filter(g=>g.side===opp).length);
   const wait=equalizer?equalizer.minute-first.minute:0;
   paragraphs[0]=pressClub(me,true)+' deve aspettare, inseguire e infine ribaltare la partita. '+(wait>0?'Il vantaggio '+pressClubPrep('di',opp)+' resiste per '+wait+' minuti, ':'')+'ma il '+gf+'-'+ga+' finale premia '+club+'. '+(last.side===me?who(last)+' mette l’ultima firma '+at(last.minute)+'.':'');
  }else if(!diff&&last.minute>=80){
   paragraphs[0]=last.side===me?'Quando la sconfitta sembra ormai vicina, '+who(last)+' trova il pallone del pari '+at(last.minute)+'. '+pressClub(me,true)+' chiude '+gf+'-'+ga+' contro '+rival+' e salva una partita che fino a quel momento stava perdendo.':
    'Mancava poco per chiuderla con una vittoria. Invece '+who(last)+' segna '+at(last.minute)+' e costringe '+club+' al '+gf+'-'+ga+'. Il pareggio lascia soprattutto il rimpianto del vantaggio sfumato nei minuti conclusivi.';
  }
 }
 let h=0,a=0;
 const scored=new Map();
 for(const e of goals){if(e.side===m.a)h++;else a++;scored.set(e,[h,a]);}
 for(const second of [false,true]){
  const phase=events.filter(e=>(e.minute>45)===second);
  const important=phase.filter(e=>['gol','rosso','rigore_sbagliato'].includes(e.type));
  const chance=phase.find(e=>e.type==='occasione'&&e.outcome==='palo')||phase.find(e=>e.type==='occasione'&&e.outcome==='parata');
  if(chance)important.push(chance);
  important.sort((a,b)=>a.minute-b.minute);
  const lines=[];
  if(second&&reliable&&goals.length){
   const halfHome=goals.filter(g=>g.minute<=45&&g.side===m.a).length,halfAway=goals.filter(g=>g.minute<=45&&g.side===m.b).length;
   if(halfHome!==halfAway)lines.push('All’intervallo '+pressClub(halfHome>halfAway?m.a:m.b)+' è avanti '+Math.max(halfHome,halfAway)+'-'+Math.min(halfHome,halfAway)+'. Il margine lascia ancora aperta la partita'+(Math.abs(halfHome-halfAway)===1?', perché basta una rete per tornare in equilibrio.':'.'));
  }
  for(const [index,e] of important.entries()){
   const player=who(e),time=at(e.minute);
   if(e.type==='gol'&&reliable){
    const [hs,as]=scored.get(e),count=hs+as;
    const action=e.action&&!e.reginaRiscatto?' '+e.action:e.kind==='rigore'?' dal dischetto':e.kind==='punizione'?' su punizione':'';
    if(count===1)lines.push(pick([
     'La prima svolta arriva '+time+'. '+player+' trova il gol'+action+' e porta avanti '+pressClub(e.side)+'.',
     'A rompere l’equilibrio è '+player+' '+time+action+'. È il primo vantaggio della partita.',
     pressClub(e.side,true)+' sblocca il risultato '+time+', quando '+player+' va a segno'+action+'.'
    ]));
    else if(hs===as)lines.push(pick([
     'Il vantaggio dura fino '+time+', quando '+player+' rimette tutto in discussione'+action+'. Si torna in parità, sul '+hs+'-'+as+'.',
     player+' risponde '+time+action+'. Il risultato di '+hs+'-'+as+' riapre una partita che sembrava aver preso un’altra direzione.',
     'La risposta porta la firma di '+player+'. La rete '+time+action+' vale il '+hs+'-'+as+' e cancella il vantaggio avversario.'
    ]));
    else{
     const prev=scored.get(goals[goals.indexOf(e)-1]),before=prev[0]-prev[1],after=hs-as;
     const verb=before===0?'porta avanti '+pressClub(e.side):Math.sign(before)===Math.sign(after)?'allunga il vantaggio':'ribalta il risultato';
     lines.push(player+' '+verb+' '+time+action+'. Il tabellone segna '+hs+'-'+as+'.');
    }
   }else if(e.type==='rosso'){
    const laterGoals=goals.filter(g=>g.minute>e.minute&&g.side!==e.side).length;
    lines.push('C’è anche il rosso a '+player+' '+time+'. '+pressClub(e.side,true)+' perde un uomo'+(laterGoals?' e, da quel momento, subisce '+(laterGoals===1?'un gol':laterGoals+' reti')+'.':' e deve affrontare i minuti restanti in inferiorità numerica.'));
   }else if(e.type==='rigore_sbagliato'){
    lines.push(player+' ha un’occasione dal dischetto '+time+', ma la spreca. '+(diff===0?'Un episodio che pesa ancora di più alla luce del pareggio finale.':'Il rigore fallito lascia il punteggio com’è e toglie alla sua squadra una possibilità concreta di segnare.'));
   }else if(e.type==='occasione'){
    const action=e.action?' con '+e.action:'';
    lines.push(e.outcome==='palo'?player+' si avvicina al gol '+time+action+', ma trova il palo.':
     'Da ricordare anche il tentativo di '+player+' '+time+action+': '+(e.opponent&&e.opponent!=='il portiere'?surnameForPress(e.opponent):'il portiere')+' interviene e respinge.');
   }
  }
  if(lines.length)paragraphs.push(lines.join(' '));
 }
 if(reliable&&goals.length){
  const last=goals.at(-1),mineLast=last.side===me;
  if(diff!==0&&last.minute>=75){
   const scoreBefore=goals.slice(0,-1),beforeHome=scoreBefore.filter(g=>g.side===m.a).length,beforeAway=scoreBefore.filter(g=>g.side===m.b).length;
   if(beforeHome===beforeAway)paragraphs.push('È la rete che decide l’incontro. Arriva '+at(last.minute)+', dopo che il punteggio era rimasto in equilibrio dal '+(scoreBefore.at(-1)?.minute||0)+'′. '+(mineLast?'Per '+club+' il finale trasforma una partita da pareggio in una vittoria.':'Per '+club+' è il momento più amaro, perché il punto che sembrava possibile sfuma proprio nelle battute conclusive.'));
  }
 }
 // Lettura dei numeri, legata al risultato e senza attribuire tattiche non registrate.
 const shots=m.stats?.shots,target=m.stats?.onTarget,i=home?0:1,j=1-i;
 if(Array.isArray(shots)&&shots.length===2&&shots.every(Number.isFinite)){
  let analysis='';
  if(shots[i]>=shots[j]+5)analysis=diff>0?
   pick(['La vittoria ha anche una base nei numeri. ','Il successo trova un riscontro nel volume delle conclusioni. '])+pressClub(me,true)+' tira '+shots[i]+' volte, '+shots[j]+' '+rival+'.':
   'Il conto dei tiri lascia un motivo di rimpianto a '+club+'. Le conclusioni sono '+shots[i]+' contro '+shots[j]+', ma questa superiorità non basta a portare a casa la vittoria.';
  else if(shots[j]>=shots[i]+5)analysis=diff>0?
   'Il risultato premia '+club+', anche se il conto delle conclusioni racconta una gara meno comoda del verdetto finale. '+pressClub(opp,true)+' tira '+shots[j]+' volte contro '+shots[i]+', senza riuscire a far valere quel volume di occasioni.':
   'Anche il conto delle conclusioni dà la misura delle difficoltà '+pressClubPrep('di',me)+'. '+pressClub(opp,true)+' ne produce '+shots[j]+', contro '+shots[i]+' della squadra '+(home?'di casa':'ospite')+'.';
  else analysis='Sul piano delle conclusioni il confronto resta vicino. '+pressClub(me,true)+' chiude con '+shots[i]+' tiri, '+rival+' con '+shots[j]+'. '+(Math.abs(diff)>=2?'Il divario nel punteggio è più ampio di quello nel numero dei tentativi.':'Gli episodi raccontati dalla cronaca acquistano così un peso particolare nel giudizio sulla partita.');
  if(Array.isArray(target)&&target.every(Number.isFinite))analysis+=' Nello specchio finiscono rispettivamente '+target[i]+' e '+target[j]+' palloni.';
  paragraphs.push(analysis);
 }
 const playerVotes=Object.entries(m.grades||{}).map(([id,v])=>({player:m.playerNames?.[id],vote:Number(v),id})).filter(x=>x.player?.name&&Number.isFinite(x.vote)&&(m.lineups?.[me]||[]).includes(x.id)).sort((a,b)=>b.vote-a.vote);
 const best=playerVotes[0],worst=playerVotes.at(-1);
 if(best&&best.vote>=7){
  const player=surnameForPress(best.player.name),g=goals.filter(e=>who(e)===player&&e.side===me).length;
  paragraphs.push(player+' è tra i migliori '+pressClubPrep('di',me)+', con '+best.vote.toLocaleString('it-IT')+' in pagella. '+(g?'Le sue '+(g===1?'giocate portano anche un gol':'reti sono '+g)+', un contributo concreto al risultato.':
   diff<0?'Il suo voto offre un elemento positivo anche dentro una giornata che si chiude con una sconfitta.':'Il suo contributo emerge dalla valutazione complessiva della prestazione.')+
   (worst&&worst.id!==best.id&&worst.vote<=5?' Più difficile la partita di '+surnameForPress(worst.player.name)+', che si ferma a '+worst.vote.toLocaleString('it-IT')+'.':''));
 }
 const context=initial.find(p=>p.includes('quota ')||p.startsWith('Con questa sono')||p.startsWith('Si chiude così'));
 if(context)paragraphs.push(context);
 const prior=(st.results||[]).filter(r=>r.match&&[r.match.a,r.match.b].includes(me)&&
  (competition==='league'?!r.stage&&!r.isEurope&&!r.isCoppa:competition==='coppa'?r.isCoppa:r.cup===competition))[0];
 if(prior){
  const old=prior.match,own=old.a===me,opponent=own?old.b:old.a,prevFor=own?old.ga:old.gb,prevAgainst=own?old.gb:old.ga;
  paragraphs.push('Nella precedente uscita '+club+' aveva '+(prevFor>prevAgainst?'vinto ':prevFor<prevAgainst?'perso ':'pareggiato ')+Math.max(prevFor,prevAgainst)+'-'+Math.min(prevFor,prevAgainst)+' contro '+pressClub(opponent)+'. '+(diff>0&&prevFor<prevAgainst?'Questa volta la risposta arriva nel risultato, il primo passo per lasciarsi alle spalle quella battuta d’arresto.':diff<0&&prevFor>prevAgainst?'Il successo di allora non trova continuità, e il giudizio sul momento della squadra torna a farsi più prudente.':diff>0?'Il nuovo successo rafforza la fiducia con cui affrontare il prossimo impegno.':'Anche questa partita entra ora nel bilancio del periodo, con indicazioni da portare nel prossimo incontro.'));
 }
 const quote=initial.find(p=>p.startsWith('Nel dopopartita '));
 if(quote)paragraphs.push(quote);
 else if(st.coachName){
  const text=diff>0?pick([
   'Mi interessa che i ragazzi capiscano quali cose hanno funzionato. Vincere aiuta, ma non rende automaticamente giusta ogni scelta.',
   'Questa vittoria ce la prendiamo volentieri. Adesso bisogna riguardare anche i momenti in cui abbiamo fatto fatica, perché saranno quelli su cui lavorare.',
   'Il risultato conta e ce lo teniamo stretto. La prossima partita, però, ricomincia da zero.'
  ]):diff<0?pick([
   'La prima cosa è assumersi le responsabilità. Non mi serve cercare un colpevole, mi serve capire insieme ai ragazzi come ripartire.',
   'Quando perdi, il rischio è pensare che sia tutto da buttare. Dobbiamo essere più precisi di così, anche nell’analisi.',
   'Oggi il risultato ci dà torto. Ai ragazzi chiederò risposte concrete, a partire dalla prossima partita.'
  ]):pick([
   'Ci sono cose da salvare e cose da rivedere. Il punto ce lo portiamo via, ma il nostro lavoro non si esaurisce nel leggere il risultato.',
   'Avremmo voluto vincere. Ora dobbiamo capire dove potevamo fare qualcosa in più, senza raccontarci una partita diversa da quella che abbiamo giocato.',
   'È una partita su cui tornare con calma. A caldo si vedono soprattutto le occasioni che avrebbero potuto cambiarla.'
  ]);
  paragraphs.push(surnameForPress(st.coachName)+' la mette così nel dopopartita: «'+text+'»');
 }
 original.body=paragraphs.filter(Boolean).join('\n\n');
 return original;
};
const legacyArticle116=article;
article=function(m,metrics,competition='league'){
 if(!m||!st||![m.a,m.b].includes(st.club))return legacyArticle116(m,metrics);
 const edition=pressEdition(m,competition);
 const notes=sectorPressReport().map(note=>note.replace(/^(?:LA SOCIETÀ INVESTE|TENSIONI NEI REPARTI|SEGNALI DI CRESCITA|PREOCCUPAZIONE IN SOCIETÀ)\. /,''));
 if(notes.length)edition.body+='\n\n'+notes.join(' ');
 return edition;
};
window.article=article;
const prevGaz116=gazView;
gazView=function(){
 const page=document.createElement('template');page.innerHTML=prevGaz116();
 const paper=page.content.querySelector('article.newspaper');
 if(!paper)return page.innerHTML;
 const record=st.results[selectedReport]||st.results[0];
 const headline=paper.querySelector(':scope > h2'),score=paper.querySelector(':scope > .report-score');
 paper.classList.add('press116');
 if(headline&&score){
  const story=document.createElement('div');story.className='press116-story';
  let node=score.nextElementSibling;
  while(node?.tagName==='P'){const next=node.nextElementSibling;story.append(node);node=next;}
  if(record.article?.pressVersion===116){
   headline.textContent=record.article.title;
   story.replaceChildren(...record.article.body.split(/\n\s*\n/).filter(Boolean).map(s=>{const p=document.createElement('p');p.textContent=s;return p;}));
  }
  score.after(story);
 }
 const archive=page.content.querySelector('section.card');
 if(archive&&archive.querySelector('.calendar'))paper.after(archive);
 return page.innerHTML;
};
const pressDesign=document.createElement('style');
pressDesign.textContent=`
.newspaper.press116{--ink:#282320;--red:#87342f;--rule:#bda49c;color:var(--ink);background:#fff7f0;border:1px solid #d4bcb2;border-radius:3px;padding:clamp(16px,4vw,44px);box-shadow:0 3px 12px #38262310}
.press116 .masthead{color:var(--ink);font-family:Georgia,'Times New Roman',serif;font-weight:900;font-style:italic;letter-spacing:-.06em;line-height:1.06;padding:7px 0 11px;border:0;border-bottom:4px double var(--ink);font-size:clamp(30px,6vw,60px)}
.press116 .masthead + :is(.row,p){font:650 11px/1.5 system-ui,sans-serif;letter-spacing:.055em;color:#654842;margin:8px 0 14px!important;gap:5px}
.press116 .tag{border:0;border-radius:0;background:transparent;color:var(--red);font:inherit;padding:0}
.press116 > h2{font:700 clamp(32px,6vw,64px)/1.02 Georgia,'Times New Roman',serif;text-transform:none;text-align:left;letter-spacing:-.045em;color:var(--ink);text-wrap:balance;overflow-wrap:anywhere;margin:14px 0 12px}
.press116 .report-score{border:0;border-block:1px solid var(--rule);background:#f6e9df;font:700 clamp(13px,2vw,18px)/1.2 system-ui,sans-serif;margin:16px 0;padding:10px 6px;grid-template-columns:minmax(0,1fr) auto minmax(0,1fr);overflow-wrap:anywhere}
.press116 .report-score strong{font-size:clamp(24px,4vw,40px);color:var(--red);font-variant-numeric:tabular-nums}
.press116 .report-score img{width:30px;height:30px;object-fit:contain}
.press116 .press116-story{max-width:70ch;margin:22px auto}
.press116 .press116-story p{font:400 clamp(17px,2vw,20px)/1.53 Georgia,serif;color:var(--ink);margin:0 0 .85em!important;text-align:left}
.press116 .press116-story p:first-child{font-size:clamp(19px,2.4vw,25px);line-height:1.36;font-weight:700}
.press116 h3{font:700 16px/1.25 system-ui,sans-serif;border-top:1px solid var(--rule);padding:10px 0 0;color:var(--red)}
.press116 .report-cols{border-top:3px double var(--ink);padding-top:12px}
.press116 .report-cols h3{border:0;padding:0}
.press116 .report-cols p{margin:4px 0 16px!important;font-size:15px}
.press116 .grid{grid-template-columns:repeat(auto-fit,minmax(min(100%,260px),1fr))}
.press116 .tablewrap{max-width:100%;overflow:auto}
@media(max-width:540px){.press116 .masthead{letter-spacing:-.065em}.press116 .report-cols{gap:10px}.press116 > h2{margin-top:16px}.press116 .table{min-width:0}}
`;
document.head.appendChild(pressDesign);
// Dati personali inclusi nella carriera e nel suo backup.
const habitCategories={fitness:'Forma fisica',technical:'Tecnica',discipline:'Correttezza',mental:'Motivazione',luck:'Fortuna',tactics:'Tattica'};
function dailyExtras(){return st.reginaDailyExtras||{habits:[],entries:{},reminders:[],shopping:[]};}
function extrasChange(edit){
 if(!st)return false;
 const previous=st.reginaDailyExtras;
 st.reginaDailyExtras=structuredClone(dailyExtras());
 edit(st.reginaDailyExtras);
 const result=persist();
 if(result===false){st.reginaDailyExtras=previous;alert('Salvataggio non confermato. Controlla Impostazioni.');return false;}
 render();return true;
}
function habitPenalty(day){
 const sums={};
 for(const entry of dailyExtras().entries[day]||[]){
  for(const cat of entry.categories||[])if(habitCategories[cat])sums[cat]=(sums[cat]||0)+Math.max(0,Number(entry.penalty)||0);
 }
 return sums;
}
const metricsBeforeHabits=taskMetrics;
taskMetrics=function(){
 const metrics=metricsBeforeHabits(),penalties=habitPenalty(st?.nextDay||TODAY());
 for(const [cat,value] of Object.entries(penalties))metrics[cat]=Math.max(0,metrics[cat]-value);
 return metrics;
};
function extraModal(title,content,submit){
 document.getElementById('extras-dialog')?.remove();
 const layer=document.createElement('div');layer.id='extras-dialog';layer.className='r114-modal';
 layer.innerHTML='<form class="r114-dialog extras-form"><div class="row spread"><h3>'+E(title)+'</h3><button type="button" class="btn alt" data-close>Chiudi</button></div>'+content+'<p><button class="btn">Salva</button></p></form>';
 layer.addEventListener('click',e=>{if(e.target===layer||e.target.closest('[data-close]'))layer.remove();});
 layer.querySelector('form').onsubmit=e=>{e.preventDefault();if(submit(new FormData(e.target))!==false)layer.remove();};
 document.body.append(layer);layer.querySelector('input')?.focus();
}
function reminderDay(r,day){return r.daily?(day<r.day?r.day:day):r.day;}
function reminderDone(r,day){return !!r.done?.[reminderDay(r,day)];}
window.reginaExtras={
 habit(id){
  const old=dailyExtras().habits.find(x=>x.id===id);
  extraModal(old?'Modifica cattiva abitudine':'Cattiva abitudine',
   '<label>Nome<input name="title" required maxlength="140" value="'+E(old?.title||'')+'"></label><fieldset><legend>Fronti interessati</legend>'+
   Object.entries(habitCategories).map(([key,label])=>'<label class="extras-check"><input type="checkbox" name="categories" value="'+key+'" '+(old?.categories.includes(key)?'checked':'')+'>'+label+'</label>').join('')+
   '</fieldset><label>Penalità per episodio su ciascun fronte<select name="penalty">'+[.25,.5,1,2].map(n=>'<option '+((old?.penalty||.5)===n?'selected':'')+'>'+n+'</option>').join('')+'</select></label><p class="muted">Punti sottratti al parametro della squadra (0–10). Il voto personale è escluso.</p>',
   data=>{const categories=data.getAll('categories');if(!categories.length){alert('Seleziona almeno un fronte.');return false;}
    const title=String(data.get('title')).trim();if(!title)return false;
    return extrasChange(s=>{const row={id:old?.id||uid(),title,categories,penalty:Number(data.get('penalty'))};const i=s.habits.findIndex(x=>x.id===row.id);if(i<0)s.habits.push(row);else s.habits[i]=row;});
   });
 },
 record(id){
  const h=dailyExtras().habits.find(x=>x.id===id);if(!h)return;
  const day=st.nextDay||TODAY();
  extrasChange(s=>{(s.entries[day]||= []).push({...structuredClone(h),habitId:id,id:uid()});});
 },
 undo(id){const day=st.nextDay||TODAY();extrasChange(s=>{s.entries[day]=(s.entries[day]||[]).filter(x=>x.id!==id);});},
 removeHabit(id){if(confirm('Eliminare questa cattiva abitudine dall’elenco?'))extrasChange(s=>{s.habits=s.habits.filter(x=>x.id!==id);});},
 reminder(id){
  const old=dailyExtras().reminders.find(x=>x.id===id);
  const shopping=id==='shopping';
  extraModal(old?'Modifica promemoria':'Nuovo promemoria',
   '<label>Promemoria<input name="title" required maxlength="160" value="'+E(old?.title||(shopping?'Spesa':''))+'"></label>'+
   '<label>Data<input name="day" type="date" required value="'+E(old?.day||TODAY())+'"></label>'+
   '<label>Ora facoltativa<input name="time" type="time" value="'+E(old?.time||'')+'"></label>'+
   '<label class="extras-check"><input name="daily" type="checkbox" '+(old?.daily?'checked':'')+'>Ogni giorno dalla data scelta</label>'+
   '<label class="extras-check"><input name="notify" type="checkbox" '+(old?.notify?'checked':'')+'>Avviso all’orario indicato</label>'+
   '<p class="muted">Gli avvisi automatici funzionano mentre l’app è aperta. Per un avviso ad app chiusa usa “Calendario” dopo il salvataggio.</p>',
   data=>{const title=String(data.get('title')).trim(),time=data.get('time');if(!title)return false;
    if(data.has('notify')&&!time){alert('Inserisci un orario per la notifica.');return false;}
    return extrasChange(s=>{const row={id:old?.id||(shopping?'shopping':uid()),title,day:data.get('day'),time,daily:data.has('daily'),notify:data.has('notify'),done:old?.done||{},sent:{}};const i=s.reminders.findIndex(x=>x.id===row.id);if(i<0)s.reminders.push(row);else s.reminders[i]=row;});
   });
 },
 done(id,day){extrasChange(s=>{const r=s.reminders.find(x=>x.id===id);if(r){r.done||={};r.done[day]=!r.done[day];}});},
 removeReminder(id){if(confirm('Eliminare il promemoria?'))extrasChange(s=>{s.reminders=s.reminders.filter(x=>x.id!==id);});},
 addShopping(form){
  const title=String(form.elements.namedItem('item')?.value||'').trim();if(!title)return;
  extrasChange(s=>s.shopping.push({id:uid(),title,done:false}));
 },
 shop(id){extrasChange(s=>{const item=s.shopping.find(x=>x.id===id);if(item)item.done=!item.done;});},
 priority(id,value){
  if(!['','urgent','ideal','low'].includes(value))return;
  extrasChange(s=>{const item=s.shopping.find(x=>x.id===id);if(item)item.priority=value;});
 },
 clearShop(){extrasChange(s=>{s.shopping=s.shopping.filter(x=>!x.done);});},
 async permission(){
  if(!('Notification' in window)||!('serviceWorker' in navigator)){alert('Notifiche non disponibili in questo browser. Puoi usare il calendario del telefono.');return;}
  const result=await Notification.requestPermission();
  alert(result==='granted'?'Notifiche abilitate mentre REGINA è aperta.':'Permesso non concesso. I promemoria restano visibili in Oggi.');
 },
 calendar(id){
  const r=dailyExtras().reminders.find(x=>x.id===id);if(!r)return;
  const day=r.daily?((r.day>TODAY())?r.day:TODAY()):r.day;
  const date=day.replaceAll('-',''),time=(r.time||'09:00').replace(':','')+'00';
  const escape=s=>String(s).replace(/\\/g,'\\\\').replace(/\n/g,'\\n').replace(/[,;]/g,'\\$&');
  const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//REGINA//Promemoria//IT','BEGIN:VEVENT','UID:'+r.id+'@regina',
   'DTSTAMP:'+new Date().toISOString().replace(/[-:]/g,'').replace(/\.\d{3}/,''),
   'DTSTART:'+date+'T'+time,'SUMMARY:'+escape(r.title)];
  if(r.daily)lines.push('RRULE:FREQ=DAILY');
  if(r.notify&&r.time)lines.push('BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+escape(r.title),'END:VALARM');
  lines.push('END:VEVENT','END:VCALENDAR');
  const url=URL.createObjectURL(new Blob([lines.join('\r\n')+'\r\n'],{type:'text/calendar;charset=utf-8'})),a=document.createElement('a');
  a.href=url;a.download='Promemoria_REGINA.ics';a.click();setTimeout(()=>URL.revokeObjectURL(url),10000);
 }
};
function extrasPanel(){
 const s=dailyExtras(),day=st.nextDay||TODAY(),today=TODAY();
 const arg=value=>E(JSON.stringify(value));
 const reminders=s.reminders.filter(r=>r.day<=today&&(!reminderDone(r,today)||r.daily||r.day===today)).sort((a,b)=>(a.time||'99').localeCompare(b.time||'99'));
 const reminderRow=r=>{const d=reminderDay(r,today),done=reminderDone(r,today);
  return '<div class="extras-line"><label class="extras-check"><input type="checkbox" '+(done?'checked':'')+' onchange="reginaExtras.done('+arg(r.id)+','+arg(d)+')"><span>'+E(r.title)+'<small>'+E(r.time||'Senza orario')+(!r.daily&&r.day<today?' · Da '+E(r.day):'')+(r.daily?' · Ogni giorno':'')+'</small></span></label><div class="row"><button class="btn alt" onclick="reginaExtras.reminder('+arg(r.id)+')">Modifica</button><button class="btn alt" onclick="reginaExtras.calendar('+arg(r.id)+')">Calendario</button><button class="btn alt" onclick="reginaExtras.removeReminder('+arg(r.id)+')">Elimina</button></div></div>';
 };
 return '<section class="card extras118"><h3>Promemoria · '+E(today)+'</h3>'+reminders.map(reminderRow).join('')+
 '<button class="btn" onclick="reginaExtras.reminder()">+ Promemoria</button> <button class="btn alt" onclick="reginaExtras.permission()">Abilita notifiche</button>'+
 '<details><summary>Prossimi promemoria</summary>'+s.reminders.filter(r=>r.day>today).map(reminderRow).join('')+'</details>'+
 '<p class="muted">Avvisi con l’app aperta. Con “Calendario” puoi importare il promemoria nel calendario del telefono e verificarne la sveglia.</p>'+
 '<details open><summary>Spesa · '+s.shopping.filter(x=>!x.done).length+' da comprare</summary><button class="btn alt" onclick="reginaExtras.reminder(&quot;shopping&quot;)">Orario e promemoria spesa</button>'+s.shopping.map(x=>'<div class="shopping-priority-row"><label class="extras-check"><input type="checkbox" '+(x.done?'checked':'')+' onchange="reginaExtras.shop('+arg(x.id)+')"><span style="'+(x.done?'text-decoration:line-through':'')+'">'+E(x.title)+'</span></label><select class="shopping-priority" aria-label="Priorità di '+E(x.title)+'" onchange="reginaExtras.priority('+arg(x.id)+',this.value)">'+[['','Da valutare'],['urgent','Indispensabile subito'],['ideal','Ideale'],['low','Meno importante']].map(([value,label])=>'<option value="'+value+'" '+((x.priority||'')===value?'selected':'')+'>'+label+'</option>').join('')+'</select></div>').join('')+
 '<form onsubmit="event.preventDefault();reginaExtras.addShopping(this)"><div class="row"><input name="item" required maxlength="160" placeholder="Aggiungi alla spesa" aria-label="Cosa comprare"><button class="btn">Aggiungi</button></div></form><button class="btn alt" onclick="reginaExtras.clearShop()">Rimuovi acquistati</button></details></section>'+
 '<section class="card extras118"><h3>Cattive abitudini · '+E(day)+'</h3>'+s.habits.map(h=>'<div class="extras-line"><b>'+E(h.title)+'</b><small>−'+h.penalty+' per episodio · '+h.categories.map(c=>E(habitCategories[c])).join(', ')+'</small><div class="row"><button class="btn" onclick="reginaExtras.record('+arg(h.id)+')">+ Episodio</button><button class="btn alt" onclick="reginaExtras.habit('+arg(h.id)+')">Modifica</button><button class="btn alt" onclick="reginaExtras.removeHabit('+arg(h.id)+')">Elimina</button></div></div>').join('')+
 '<button class="btn alt" onclick="reginaExtras.habit()">+ Cattiva abitudine</button>'+
 ((s.entries[day]||[]).length?'<h4>Episodi registrati</h4>':'')+(s.entries[day]||[]).map(e=>'<div class="extras-line row spread"><span>'+E(e.title)+' · −'+e.penalty+'</span><button class="btn alt" onclick="reginaExtras.undo('+arg(e.id)+')">Annulla</button></div>').join('')+'</section>';
}
const beforeExtrasToday=todayView;
todayView=function(){return beforeExtrasToday()+(st?extrasPanel():'');};
let remindersBusy=false;
async function checkReminders(){
 if(!st||remindersBusy||!('Notification' in window)||Notification.permission!=='granted'||!navigator.serviceWorker)return;
 remindersBusy=true;
 try{
  const registration=await navigator.serviceWorker.getRegistration();
  if(!registration?.active)return;
  const now=new Date(),day=TODAY(),clock=String(now.getHours()).padStart(2,'0')+':'+String(now.getMinutes()).padStart(2,'0');
  for(const r of dailyExtras().reminders){
   const d=reminderDay(r,day),key=d+'T'+r.time;
   if(!r.notify||!r.time||r.day>day||reminderDone(r,day)||r.sent?.[key]||d>day||(d===day&&r.time>clock))continue;
   // Un tag stable fusionne les doublons éventuels entre deux onglets.
   await registration.showNotification(r.title,{body:d<day?'Promemoria da recuperare ('+d+')':'Promemoria delle '+r.time,tag:'regina-'+r.id+'-'+key,renotify:false});
   extrasChange(s=>{const live=s.reminders.find(x=>x.id===r.id);if(live){live.sent||={};live.sent[key]=true;}});
  }
 }catch(error){console.warn('Avviso promemoria non inviato',error);}
 finally{remindersBusy=false;}
}
setInterval(checkReminders,30000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)checkReminders();});
const extrasCSS=document.createElement('style');extrasCSS.textContent=`
.shopping-priority-row{display:grid;grid-template-columns:minmax(0,1fr) minmax(0,168px);gap:8px;align-items:center;padding:5px 0;border-bottom:1px solid #e1e8e3}.shopping-priority-row label{min-width:0}.shopping-priority{width:100%;min-width:0;min-height:44px;font-size:14px;border:1px solid #baccc0;border-radius:8px;background:#fff;color:#244b39;padding:6px 4px}
.extras118{overflow-wrap:anywhere}.extras118 small{display:block;color:#52685e;margin:5px 0}.extras-line{padding:12px 0;border-bottom:1px solid #dce5df;margin-bottom:10px}.extras-check{display:flex;align-items:center;gap:10px;min-height:42px}.extras-check input{width:20px;height:20px;flex-shrink:0}.extras118 summary{padding:14px 0;font-weight:700;cursor:pointer}.extras118 input:not([type=checkbox]),.extras-form input:not([type=checkbox]),.extras-form select{padding:10px;border:1px solid #bccdc4;border-radius:8px;max-width:100%;font-size:16px}.extras118 form input{flex:1;min-width:100px}.extras-form>label{display:grid;gap:5px;margin:12px 0}.extras-form fieldset{border:1px solid #ccd9d0}.extras118 button{min-height:42px}
`;document.head.append(extrasCSS);
// Anche l'archivio mostra pagelle coerenti con il risultato definitivo.
// Si usa una copia: risultati, classifica e salvataggio storico non cambiano.
const r113BalancedGaz=gazView;
gazView=function(){
 const rec=st?.results?.[selectedReport]||st?.results?.[0];
 if(!rec?.match)return r113BalancedGaz();
 const original=rec.match;
 rec.match=normalizeMatchVotes({...original,grades:{...(original.grades||{})}});
 try{return r113BalancedGaz()}finally{rec.match=original;}
};
// ============================================================================
// REGINA CALCIO 1.1.16 — MALUS BENESSERE: 10 bicchieri / 8 ore di sonno.
// Obiettivi quotidiani di benessere: sotto le soglie si riducono Forma e voto.
// Ai valori massimi nessun bonus; non crea tappe normali da completare.
// ============================================================================
function r116Day(day){return rD(day)||st?.nextDay||TODAY()}
function r116Wellness(day){
 const d=r116Day(day),raw=st?.reginaWellness?.[d]||{};
 const water=Math.min(10,Math.max(0,Math.floor(Number(raw.water)||0)));
 const sleep=Math.min(8,Math.max(0,Math.round((Number(raw.sleep)||0)*4)/4));
 return {day:d,water,sleep,waterRatio:water/10,sleepRatio:sleep/8};
}
function r116Format(n){return Number(n).toLocaleString('it-IT',{maximumFractionDigits:2})}
function r116ReadInput(value,name,max,step){
 const text=String(value??'').trim();if(!text)return 0;
 const n=Number(text.replace(',','.'));
 if(!Number.isFinite(n)||n<0||n>max||Math.abs(n/step-Math.round(n/step))>1e-6)
  throw Error(name+': valore fra 0 e '+max+', a intervalli di '+r116Format(step)+'.');
 return Math.round(n/step)*step;
}
window.reginaWellness={
 save(day,water,sleep){
  if(!st)return alert('Prima avvia una carriera calcistica.');
  const d=rD(day);if(!d)return alert('Data non valida.');
  let w,h;
  try{w=r116ReadInput(water,'Bicchieri',10,1);h=r116ReadInput(sleep,'Ore di sonno',8,.25)}
  catch(e){alert(e.message);return false}
  const old=st.reginaWellness?structuredClone(st.reginaWellness):null;
  st.reginaWellness=st.reginaWellness||{};
  if(w||h)st.reginaWellness[d]={water:w,sleep:h,updatedAt:new Date().toISOString()};
  else delete st.reginaWellness[d];
  const ok=persist();
  if(ok===false){st.reginaWellness=old||{};alert('Salvataggio non riuscito: controlla Impostazioni.');return false}
  document.getElementById('r116-wellness-dialog')?.remove();render();return true;
 },
 today(){
  const box=document.getElementById('r116-wellness-today');if(!box)return;
  return this.save(box.dataset.day,box.querySelector('[name="water"]')?.value,box.querySelector('[name="sleep"]')?.value);
 },
 bump(delta){
  const day=st?.nextDay||TODAY(),x=r116Wellness(day);
  return this.save(day,Math.max(0,Math.min(10,x.water+delta)),x.sleep);
 },
 edit(day){
  if(!st)return;
  document.getElementById('r116-wellness-dialog')?.remove();
  const x=r116Wellness(day),modal=document.createElement('div');
  modal.className='r114-modal';modal.id='r116-wellness-dialog';
  const archived=(st.results||[]).some(r=>r.day===x.day);
  modal.innerHTML='<section class="r114-dialog" role="dialog" aria-modal="true" aria-label="Acqua e sonno">'+
   '<div class="r114-dialog-top"><h3>💧 Benessere · Forma fisica</h3><button class="btn alt" type="button" data-close>✕</button></div>'+
   '<p class="muted">'+E(x.day)+' · Obiettivi giornalieri di benessere: gli scostamenti riducono Forma fisica e voto.</p>'+
   '<div class="r114-hour-inputs">'+
   '<label>💧 Bicchieri d’acqua<input type="number" inputmode="numeric" name="water" min="0" max="10" step="1" value="'+x.water+'"></label>'+
   '<label>🌙 Ore di sonno<input type="number" inputmode="decimal" name="sleep" min="0" max="8" step="0.25" value="'+x.sleep+'"></label></div>'+
   '<p class="muted">Obiettivi: 10 bicchieri e 8 ore. Ogni valore mancante comporta un malus proporzionale; arrivare al massimo azzera il malus.</p>'+
   (archived?'<p class="r114-note">🔒 Partita già disputata: i dati entrano nello storico, senza modificare risultato o voto archiviato.</p>':'')+
   '<div class="row"><button class="btn" type="button" data-save>Salva</button><button class="btn alt" type="button" data-close>Annulla</button></div></section>';
  modal.addEventListener('click',ev=>{
   if(ev.target===modal||ev.target.closest('[data-close]')){modal.remove();return}
   if(ev.target.closest('[data-save]'))this.save(x.day,modal.querySelector('[name="water"]').value,modal.querySelector('[name="sleep"]').value);
  });
  document.body.appendChild(modal);
 },
 record(day){return r116Wellness(day)}
};
// Il malus si calcola rispetto ai traguardi personali 10 bicchieri e 8 ore.
// Non vengono aggiunte tappe. Valori non inseriti = zero per la giornata.
// Pieni entrambi: malus zero, nessun bonus supplementare.
function r116Penalties(day){
 const v=r116Wellness(day),lackWater=1-v.waterRatio,lackSleep=1-v.sleepRatio;
 return {water:2.0*lackWater,sleep:2.5*lackSleep,
  fitness:2.0*lackWater+2.5*lackSleep,
  grade:.65*lackWater+.85*lackSleep};
}
const r116PreviousMetrics=taskMetrics;
taskMetrics=function(){
 const m=r116PreviousMetrics(),v=r116Wellness(st?.nextDay||TODAY());
 const penalty=r116Penalties(v.day);
 m.fitness=rLim((Number(m.fitness)||0)-penalty.fitness);
 m.reginaWaterGlasses=v.water;
 m.reginaSleepHours=v.sleep;
 m.reginaWellnessFitnessPenalty=penalty.fitness;
 return m;
};
// Il calo della Forma fisica passa già dal normale calcolo di calcTeam:
// applicarlo anche qui significherebbe sottrarre due volte lo stesso malus.
// Il voto è quello del Bilancio della giornata, usato anche per i limiti
// del risultato: meno acqua/sonno => voto minore, senza premi per il 100%.
const r116PreviousReviewLive=r11ReviewLive;
r11ReviewLive=function(day){
 const x=r116PreviousReviewLive(day),v=r116Wellness(day),penalty=r116Penalties(day);
 x.reginaWellness={water:v.water,sleep:v.sleep,fitnessMalus:penalty.fitness,
  gradeMalus:penalty.grade};
 if(Number.isFinite(x.grade))x.grade=Math.max(0,Math.round((x.grade-penalty.grade)*10)/10);
 return x;
};
function r116WellnessBlock(day){
 const x=r116Wellness(day),block=document.createElement('details');
 block.className='r116-wellness-card';block.id='r116-wellness-today';block.dataset.day=day;
 const waterPct=Math.round(x.waterRatio*100),sleepPct=Math.round(x.sleepRatio*100);
 block.innerHTML='<summary class="r116-wellness-summary"><span>💧 Acqua e sonno <small>Riduci il malus alla Forma fisica</small></span>'+
 '<strong>'+x.water+'/10 · '+r116Format(x.sleep)+'/8 h</strong></summary>'+
 '<div class="r116-wellness-progress"><div><span>💧 Acqua</span><span>'+x.water+'/10</span></div><progress max="10" value="'+x.water+'"></progress>'+ 
 '<div><span>🌙 Sonno</span><span>'+r116Format(x.sleep)+'/8 h</span></div><progress max="8" value="'+x.sleep+'"></progress></div>'+
 '<div class="r114-hour-inputs r116-fields">'+
 '<label>Bicchieri d’acqua<input name="water" type="number" inputmode="numeric" min="0" max="10" step="1" value="'+x.water+'"></label>'+
 '<label>Ore di sonno<input name="sleep" type="number" inputmode="decimal" min="0" max="8" step="0.25" value="'+x.sleep+'"></label></div>'+
 '<div class="r116-wellness-actions"><button type="button" class="btn alt" onclick="reginaWellness.bump(1)">💧 +1 bicchiere</button>'+ 
 '<button type="button" class="btn alt" onclick="reginaWellness.bump(-1)">−1</button>'+ 
 '<button type="button" class="btn" onclick="reginaWellness.today()">Salva</button></div>'+
 '<p class="tiny muted">10 bicchieri e 8 ore azzerano il malus. Valori inferiori (o non inseriti) riducono Forma fisica e voto del giorno.</p>';
 return block;
}
const r116PreviousTodayView=todayView;
todayView=function(){
 const html=r116PreviousTodayView();if(!st)return html;
 const doc=document.createElement('template');doc.innerHTML=html;
 const block=r116WellnessBlock(st.nextDay||TODAY());
 const hours=doc.content.querySelector('#r114-hours-today');
 if(hours)hours.after(block);
 else{
  const h=[...doc.content.querySelectorAll('h3')].find(x=>x.textContent.includes('Tappe previste per la giornata'));
  if(h)h.before(block);else doc.content.querySelector('.card')?.append(block);
 }
 return doc.innerHTML;
};
const r116PreviousReviewPanel=r11ReviewPanel;
r11ReviewPanel=function(){
 const html=r116PreviousReviewPanel(),v=r116Wellness(r11ReviewDay),archived=!!st?.reginaDailyReviews?.[r11ReviewDay];
 const line='<div class="r116-review-wellness"><div>💧 '+v.water+'/10 bicchieri · 🌙 '+r116Format(v.sleep)+'/8 h di sonno'+
  '<small>'+(v.water===10&&v.sleep===8?'Obiettivi benessere raggiunti: malus 0':'Malus: −'+r116Format(r116Penalties(r11ReviewDay).fitness)+' Forma fisica e fino a −'+r116Format(r116Penalties(r11ReviewDay).grade)+' voto')+
  (archived?' · partita archiviata':'')+'</small></div>'+
  '<button type="button" class="btn alt" onclick="reginaWellness.edit(\''+E(r11ReviewDay)+'\')">✎ Modifica</button></div>';
 const pos=html.lastIndexOf('</section>');return pos>=0?html.slice(0,pos)+line+html.slice(pos):html+line;
};
const r116PreviousHeader=header;
header=function(){return r116PreviousHeader().replace('v1.1.15','v1.1.16')};
const r116Styles=document.createElement('style');r116Styles.textContent=`
.r116-wellness-card{border:1px solid #c8e1e6;background:#f5fafc;border-radius:13px;margin:13px 0;padding:13px}
.r116-wellness-summary{display:flex;justify-content:space-between;align-items:center;gap:8px;cursor:pointer;color:#165b73;font-weight:750}
.r116-wellness-summary small{display:block;color:#66828c;font-weight:500;font-size:11px;margin-top:4px}
.r116-wellness-summary strong{background:#d5f1ef;padding:7px 9px;border-radius:9px;font-size:12px;color:#155c55;white-space:nowrap}
.r116-wellness-progress{margin:14px 0;display:grid;gap:5px}.r116-wellness-progress div{display:flex;justify-content:space-between;font-size:11px;color:#466a79;margin:5px 0 0}
.r116-wellness-progress progress{width:100%;height:9px;accent-color:#2090a4}
.r116-fields{margin-top:11px}.r116-wellness-actions{display:flex;flex-wrap:wrap;gap:7px;margin:12px 0}
.r116-wellness-actions button{flex:1;min-width:93px;min-height:39px;padding:7px 10px;font-size:12px}
.r116-wellness-card .tiny{font-size:11px;line-height:1.4}
.r116-review-wellness{display:flex;align-items:center;justify-content:space-between;gap:10px;padding:13px 0;margin-top:8px;border-top:1px solid #e0ebed;font-size:12px}
.r116-review-wellness small{display:block;color:#647d85;font-size:11px;margin-top:4px}.r116-review-wellness button{flex-shrink:0}
@media(max-width:370px){.r116-wellness-summary{align-items:flex-start}.r116-wellness-summary strong{font-size:11px}.r116-wellness-actions button{min-width:80px}}
`;document.head.appendChild(r116Styles);

if(st)render();
})();

// Front controls remain accessible while the accordion is collapsed.
(function(){const style=document.createElement('style');style.textContent=`
.fin-no-date-details>summary{white-space:normal}
.regina-front-actions{display:flex;flex-wrap:wrap;gap:8px;margin:10px 0 2px}
.regina-front-actions button{min-height:36px;padding:7px 10px}
`;document.head.appendChild(style)})();
