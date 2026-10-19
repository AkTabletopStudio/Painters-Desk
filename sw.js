// Offline cache. Bump VERSION whenever any site file changes so installed apps update.
const VERSION='painters-desk-v45';
const FILES=['./','./index.html','./app.js','./account.js','./privacy.html','./data.js','./manifest.webmanifest','./icons/icon-192.png','./icons/icon-512.png','./icons/maskable-512.png','./icons/apple-touch-icon.png','./icons/favicon-32.png','./fonts/archivo-black.woff2','./fonts/rubik-400.woff2','./fonts/rubik-700.woff2','./fonts/orbitron-700.woff2','./fonts/pirata-one.woff2','./fonts/uncial-antiqua.woff2','./fonts/cinzel-700.woff2','./themes/cyber-city.svg','./themes/grim-hive.jpg','./themes/forest-wood.svg','./themes/dwarf-hall.svg'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(VERSION).then(c=>Promise.all(FILES.map(f=>c.add(f).catch(()=>{})))).then(()=>self.skipWaiting()))});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==VERSION).map(k=>caches.delete(k)))).then(()=>self.clients.claim()))});
// API calls and sign-in redirects always go to the network, never the cache.
self.addEventListener('fetch',e=>{if(e.request.method!=='GET'||new URL(e.request.url).pathname.startsWith('/api/'))return;
 e.respondWith(caches.match(e.request,{ignoreSearch:true}).then(hit=>hit||fetch(e.request).then(r=>{const cp=r.clone();caches.open(VERSION).then(c=>c.put(e.request,cp));return r}).catch(()=>caches.match('./index.html'))))});
