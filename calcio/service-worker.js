/* REGINA CALCIO PWA 1.1.7 — scope esclusivo /calcio/.
   Il salvataggio di REGINA Calcio rimane autonomo e locale.
   L'addon si aggiorna con rete disponibile e funziona anche offline. */
'use strict';
const VERSION='regina-calcio-pwa-117';
const SHELL=VERSION+'-core',CRESTS='regina-calcio-stemmi-2026-27-v1';
const STATIC=['./','./index.html','./manifest.webmanifest','./icon-192.png','./icon-512.png','./icon.svg','./regina-upgrade.js'];
self.addEventListener('install',event=>{
 event.waitUntil(caches.open(SHELL).then(cache=>cache.addAll(STATIC)).then(()=>self.skipWaiting()));
});
self.addEventListener('activate',event=>{
 event.waitUntil(Promise.all([
  caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('regina-calcio-pwa-')&&!k.startsWith(VERSION)).map(k=>caches.delete(k)))),
  self.clients.claim()
 ]));
});
self.addEventListener('fetch',event=>{
 const req=event.request;
 if(req.method!=='GET')return;
 const url=new URL(req.url),origin=self.location.origin;
 if(url.origin===origin&&url.pathname.startsWith(new URL('./',self.registration.scope).pathname)){
   if(req.mode==='navigate'||url.pathname.endsWith('/index.html')||url.pathname.endsWith('/')){
     event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
       if(res.ok){const clone=res.clone();caches.open(SHELL).then(c=>c.put('./index.html',clone)).catch(()=>{});}
       return res;
     }).catch(async()=>await caches.match('./index.html')||new Response('App non ancora memorizzata. Riapri online.',{status:503,headers:{'Content-Type':'text/plain;charset=utf-8'}})));
   }else if(url.pathname.endsWith('/regina-upgrade.js')){
     // Evita che la vecchia versione dello script resti bloccata nella cache.
     event.respondWith(fetch(req,{cache:'no-store'}).then(res=>{
       if(res.ok){const clone=res.clone();caches.open(SHELL).then(c=>c.put(req,clone)).catch(()=>{});}
       return res;
     }).catch(async()=>await caches.match(req)||await caches.match('./regina-upgrade.js')||new Response('Modulo non disponibile offline.',{status:503})));
   }else{
     event.respondWith(caches.match(req).then(c=>c||fetch(req).then(res=>{
       if(res.ok)caches.open(SHELL).then(cache=>cache.put(req,res.clone())).catch(()=>{});
       return res;
     })));
   }
   return;
 }
 if(url.hostname==='raw.githubusercontent.com'&&url.pathname.includes('/JoseArroyave/football-logos/')){
   event.respondWith(caches.open(CRESTS).then(async cache=>{
     const cached=await cache.match(req);if(cached)return cached;
     try{const res=await fetch(req);if(res.ok||res.type==='opaque')await cache.put(req,res.clone());return res;}
     catch(e){return new Response('',{status:503});}
   }));
 }
});
