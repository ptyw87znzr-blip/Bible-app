const CACHE_NAME='bible-app-v6';
const APP_SHELL=['./','./index.html','./manifest.json'];

self.addEventListener('install',event=>{
  event.waitUntil(
    caches.open(CACHE_NAME).then(cache=>cache.addAll(APP_SHELL)).catch(()=>{})
  );
  self.skipWaiting();
});

self.addEventListener('activate',event=>{
  event.waitUntil(
    caches.keys().then(names=>Promise.all(
      names.filter(name=>name!==CACHE_NAME).map(name=>caches.delete(name))
    ))
  );
  self.clients.claim();
});

self.addEventListener('fetch',event=>{
  const req=event.request;
  if(req.method!=='GET')return;

  const url=new URL(req.url);

  // Always try the network first for page navigations, so GitHub updates appear.
  if(req.mode==='navigate'){
    event.respondWith(
      fetch(req,{cache:'no-cache'})
        .then(res=>{
          const copy=res.clone();
          caches.open(CACHE_NAME).then(cache=>cache.put('./index.html',copy));
          return res;
        })
        .catch(()=>caches.match('./index.html').then(r=>r||caches.match('./')))
    );
    return;
  }

  // Same-origin app files: stale-while-revalidate.
  if(url.origin===self.location.origin){
    event.respondWith(
      caches.match(req).then(cached=>{
        const fresh=fetch(req,{cache:'no-cache'}).then(res=>{
          if(res&&res.ok){
            const copy=res.clone();
            caches.open(CACHE_NAME).then(cache=>cache.put(req,copy));
          }
          return res;
        }).catch(()=>cached);
        return cached||fresh;
      })
    );
    return;
  }

  // External Bible/API requests: network first with a cache fallback.
  event.respondWith(
    fetch(req).then(res=>{
      if(res&&res.ok){
        const copy=res.clone();
        caches.open(CACHE_NAME).then(cache=>cache.put(req,copy)).catch(()=>{});
      }
      return res;
    }).catch(()=>caches.match(req))
  );
});
