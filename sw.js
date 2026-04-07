const CACHE='freetoolhubs-v1';
const ASSETS=['/','/css/style.css','/js/common.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>{e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{if(res.ok&&e.request.method==='GET'){const clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}return res})))});
