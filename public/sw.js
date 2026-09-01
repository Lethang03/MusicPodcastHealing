const CACHE='podcast-vault-community-v3'
const SHELL=['/','/manifest.webmanifest','/icon.svg']

self.addEventListener('install',event=>{
  event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(SHELL)))
  self.skipWaiting()
})
self.addEventListener('activate',event=>{
  event.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))))
  self.clients.claim()
})
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return
  const url=new URL(event.request.url)
  // Never intercept byte-range/media requests. Let the browser and origin keep
  // the native 206/Content-Range streaming contract intact.
  if(event.request.headers.has('range')||event.request.destination==='audio'||url.origin!==self.location.origin)return
  if(event.request.mode==='navigate'){
    event.respondWith(fetch(event.request).catch(()=>caches.match('/')))
    return
  }
  event.respondWith(caches.match(event.request).then(cached=>cached||fetch(event.request).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(event.request,copy))}return res
  })))
})
