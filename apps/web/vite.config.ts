import { defineConfig } from 'vite';
import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
const base=process.env.VITE_BASE_PATH||'/';
const baseURL=base.endsWith('/')?base:`${base}/`;
const staticBuild=process.env.VITE_STATIC_DEMO==='true';
const contentVersion=staticBuild?createHash('sha256').update(readFileSync(new URL('./public/static-content/manifest.json',import.meta.url))).digest('hex'):'';
export default defineConfig({base:baseURL,define:{'import.meta.env.VITE_CONTENT_VERSION':JSON.stringify(contentVersion)},plugins:[{name:'offline-shell',enforce:'post',generateBundle(_,bundle){
 if(staticBuild)for(const fileName of Object.keys(bundle))if(/^assets\/c\d{3}(?:-v2)?-/.test(fileName))delete bundle[fileName];
 const files=[baseURL,...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name)).map(name=>`${baseURL}${name}`)];
 const version='learnbuddy-shell-'+contentVersion+'-'+Object.keys(bundle).join('-');
 this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES)).then(()=>self.skipWaiting())));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/')||url.pathname.endsWith('/admin'))return;
// Let the server handle media byte ranges: Cache API cannot store 206 responses,
// and a cached whole file must not replace the requested partial response.
if(request.headers.has('range'))return;
if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(${JSON.stringify(baseURL)}))));return;}
if(request.destination==='image'&&url.pathname.startsWith(${JSON.stringify(`${baseURL}assets/`)})){event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}));return;}
if(url.pathname.startsWith(${JSON.stringify(`${baseURL}static-content/`)})){event.respondWith((async()=>{let cache;try{cache=await caches.open(CACHE);const saved=await cache.match(request);if(saved)return saved;}catch{}const response=await fetch(request);if(cache&&response.status===200)try{await cache.put(request,response.clone());}catch{}return response;})());return;}
if(FILES.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});`});
}}],server:{proxy:{'/api':{target:'http://127.0.0.1:8080',changeOrigin:false},'/media':'http://127.0.0.1:8080'}},build:{copyPublicDir:staticBuild}});
