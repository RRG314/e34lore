/* Offline fallback only. Never cache HTML navigation, account/API responses,
   Auth tokens, garage records, discussions or signed-in page content. */
const CACHE='e34-public-shell-v7';
const SAFE=['/offline','/icons/e34-grille-192.png','/icons/e34-grille-512.png','/icons/e34-grille-maskable-512.png'];
self.addEventListener('install',event=>event.waitUntil((async()=>{const cache=await caches.open(CACHE);for(const path of SAFE){const response=await fetch(path,{cache:'reload'});const type=response.headers.get('content-type')||'';if(response.ok&&!response.redirected&&(path.endsWith('.png')?type.startsWith('image/png'):type.includes('text/html')))await cache.put(path,response);}})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{for(const name of await caches.keys())if(name.startsWith('e34-public-shell-')&&name!==CACHE)await caches.delete(name);await self.clients.claim();})()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'){event.respondWith(fetch(request,{cache:'no-store'}).catch(async()=>await caches.match('/offline')||new Response('Offline. Reconnect to E34 Lore.',{status:503,headers:{'Content-Type':'text/plain'}})));return;}
 if(SAFE.includes(url.pathname)&&!url.search)event.respondWith(fetch(request).catch(async()=>await caches.match(request)||new Response("Unavailable offline",{status:503})));
});
