'use strict';
const fs=require('fs'),vm=require('vm'),assert=require('assert');
const mod=fs.readFileSync(__dirname+'/regina-portiere-emergenza.js','utf8');
function setup(withGoalkeeper=false,available=12){
  const players=Array.from({length:available},(_,i)=>({id:'p'+i,name:'Calciatore '+i,pos:i<4?'D':i<8?'C':'A',tech:5+i/10,verified:true,injured:0,red:0,out:false}));
  const keepers=[{id:'g0',name:'Portiere A',pos:'P',tech:6,injured:withGoalkeeper?0:3,verified:true,red:0,out:false}, {id:'g1',name:'Portiere B',pos:'P',tech:6,injured:5,verified:true,red:0,out:false}];
  const state={club:'reg',nextDay:'2026-11-25',squad:{reg:[...keepers,...players]},lineup:players.slice(0,11).map(p=>p.id)};
  const logs={alerts:[],saved:0,rendered:0,oldPut:0};
  const ctx={
    st:state,
    view:'squad',
    window:{putPlayerOnField(){logs.oldPut++}},
    document:{getElementById(id){return {value:players[2].id}}},
    console,
    alert(x){logs.alerts.push(x)},
    MY_SQ:()=>state.squad.reg,
    persist(){logs.saved++},render(){logs.rendered++},
    initLineup:()=>state.lineup.map(id=>state.squad.reg.find(p=>p.id===id)).filter(p=>p&&!p.injured&&!p.red&&!p.out),
    lineupReady:()=>state.lineup.length===11 && state.lineup.some(id=>state.squad.reg.find(p=>p.id===id)?.pos==='P'),
    calcTeam(id){return {lineup:ctx.initLineup(),performance:7,forms:{},t:{name:'REGINA'}}},
    calcMatch(){return {a:'reg',b:'other',lineups:{reg:state.lineup.slice(),other:[]},playerNames:Object.fromEntries(state.squad.reg.map(p=>[p.id,{name:p.name,pos:p.pos}])),grades:{[state.lineup[0]]:7.1}}},
    article(){return {title:'Partita',body:'Cronaca.'}},
    squadView(){return '<section>Squadra base</section>'},
    todayView(){return '<section>Oggi</section>'},
    header(){return '⚽ REGINA CALCIO 1.1.24 · STAGIONE 1'}
  };
  vm.createContext(ctx);vm.runInContext(mod,ctx);
  return {ctx,players,keepers,state,logs};
}
{
 const {ctx,players,keepers,state,logs}=setup();
 assert.equal(ctx.lineupReady(),true,'11 giocatori senza portiere devono essere validi se i portieri sono indisponibili');
 assert.equal(ctx.calcTeam('reg').performance,4.6,'malus reale');
 assert.ok(ctx.squadView().includes('Portiere di emergenza'));
 assert.ok(ctx.todayView().includes('Emergenza portieri'));
 assert.equal(ctx.window.reginaPortiereEmergenza.imposta(players[2].id),true);
 assert.equal(state.lineup[0],players[2].id);
 assert.equal(state.lineup.length,11);
 assert.equal(keepers[0].injured,3,'infortuni preservati');
 assert.equal(keepers[1].injured,5,'infortuni preservati');
 assert.ok(logs.saved>0);
 const m=ctx.calcMatch();assert.equal(m.emergencyKeeper.playerId,players[2].id);
 assert.equal(m.grades[players[2].id],5.8);
 assert.ok(ctx.article(m).body.includes('Emergenza tra i pali'));
 assert.ok(ctx.header().includes('1.1.25'));
 ctx.window.putPlayerOnField(players[3].id,0);
 assert.equal(state.lineup[0],players[3].id);
 assert.equal(logs.oldPut,0);
}
{
 const {ctx,players,keepers,logs,state}=setup(true);
 assert.equal(ctx.lineupReady(),false,'con portiere disponibile, mantenere vincolo originale');
 assert.equal(ctx.calcTeam('reg').performance,4.6,'senza portiere schierato, la prestazione risente della scelta anche se disponibile');
 assert.ok(!ctx.squadView().includes('Portiere di emergenza'));
 ctx.window.putPlayerOnField(players[2].id,0);
 assert.equal(logs.oldPut,1,'comportamento precedente per situazioni normali');
 assert.equal(ctx.window.reginaPortiereEmergenza.imposta(players[2].id),false,'non forzare l’emergenza con portiere disponibile');
 assert.equal(keepers[0].injured,0);
}
{
 const {ctx,players,state,logs}=setup(false,10);
 assert.equal(ctx.lineupReady(),false);
 assert.equal(ctx.window.reginaPortiereEmergenza.imposta(players[2].id),false);
 assert.ok(logs.alerts.at(-1).includes('meno di 11'));
}
{
 const {ctx,state}=setup(false);
 state.lineup=['g0', ...state.lineup.slice(0,10)];
 assert.equal(ctx.lineupReady(),false);
}
console.log('OK — 26 verifiche sui casi: portieri entrambi indisponibili, malus, sostituzione, Gazzetta, formazione, infortuni invariati, regola normale e rosa insufficiente.');
