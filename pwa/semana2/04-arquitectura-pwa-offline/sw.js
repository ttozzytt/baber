'use strict';
const CACHE='curso-pwa-lab-v2';
const DB_NAME='navaja27-course-offline-practice',STORE='pending',SYNC_ENDPOINT='./api/sync';
const SHELL=['./','./index.html','./manifest.json','./script.js','../../styles.css','../../assets/icon.svg'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const c=await caches.open(CACHE);await c.addAll(SHELL);await self.skipWaiting();})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{const keys=await caches.keys();await Promise.all(keys.filter(k=>k.startsWith('curso-pwa-lab-')&&k!==CACHE).map(k=>caches.delete(k)));await self.clients.claim();})()));
self.addEventListener('fetch',event=>{if(event.request.method!=='GET')return;event.respondWith((async()=>{const cached=await caches.match(event.request);if(cached)return cached;try{const r=await fetch(event.request);if(r.ok)caches.open(CACHE).then(c=>c.put(event.request,r.clone()));return r;}catch(error){if(event.request.mode==='navigate')return(await caches.match('./index.html'))||Response.error();return Response.error();}})());});
function openDb(){return new Promise((resolve,reject)=>{const r=indexedDB.open(DB_NAME,1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains(STORE))r.result.createObjectStore(STORE,{keyPath:'id',autoIncrement:true});};r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
async function list(){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly'),r=tx.objectStore(STORE).getAll();r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);tx.oncomplete=()=>db.close();});}
async function del(id){const db=await openDb();return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).delete(id);tx.oncomplete=()=>{db.close();resolve();};tx.onerror=()=>reject(tx.error);});}
async function flush(){for(const row of await list()){const response=await fetch(SYNC_ENDPOINT,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:row.id,note:row.note,createdAt:row.createdAt})});if(!response.ok)throw new Error('Endpoint de práctica pendiente: HTTP '+response.status);await del(row.id);}}
self.addEventListener('sync',event=>{if(event.tag==='course-offline-sync')event.waitUntil(flush());});
