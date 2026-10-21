// Build/serve helpers replace this marker with one complete, hash-pinned release.
const CONFIG=JSON.parse('__OFFLINE_CONFIG__');
const PREFIX=`11-0-0-offline:${new URL(self.registration.scope).pathname}:`;
const CACHE=PREFIX+CONFIG.version;
const entries=new Map(CONFIG.entries.map(e=>[new URL(e.url,self.registration.scope).href,e]));
async function verifiedResponse(url,entry){
  const response=await fetch(new Request(url,{cache:'reload'}));
  if(!response.ok)throw new Error('An offline asset is unavailable.');
  const digest=await crypto.subtle.digest('SHA-256',await response.clone().arrayBuffer());
  const hash=[...new Uint8Array(digest)].map(n=>n.toString(16).padStart(2,'0')).join('');
  if(hash!==entry.sha256)throw new Error('The release changed while preparing offline play. Try again.');
  return response;
}
self.addEventListener('install',event=>event.waitUntil((async()=>{
  const cache=await caches.open(CACHE);
  try{await Promise.all([...entries].map(async([url,entry])=>cache.put(url,await verifiedResponse(url,entry))));}
  catch(error){await caches.delete(CACHE);throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
  for(const key of await caches.keys())if(key.startsWith(PREFIX)&&key!==CACHE)await caches.delete(key);
  await self.clients.claim();
})()));
self.addEventListener('message',event=>{if(event.data?.type==='ACTIVATE_UPDATE')self.skipWaiting();});
self.addEventListener('fetch',event=>{
  if(event.request.method!=='GET')return;
  const url=new URL(event.request.url);url.search='';url.hash='';
  if(url.href===new URL('index.html',self.registration.scope).href)url.href=self.registration.scope;
  const entry=entries.get(url.href);if(!entry)return;
  event.respondWith((async()=>{
    const cache=await caches.open(CACHE),cached=await cache.match(url.href);
    if(cached)return cached;
    const response=await verifiedResponse(url.href,entry);await cache.put(url.href,response.clone());return response;
  })());
});
