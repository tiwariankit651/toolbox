const CACHE='freetoolhubs-v2';
const ASSETS=['/','/css/style.css','/js/common.js','/manifest.json'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k))))));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  e.respondWith(caches.match(e.request).then(r=>{
    var fetchPromise=fetch(e.request).then(res=>{
      if(res.ok){var clone=res.clone();caches.open(CACHE).then(c=>c.put(e.request,clone))}
      return res;
    }).catch(()=>r);
    return r||fetchPromise;
  }));
});
