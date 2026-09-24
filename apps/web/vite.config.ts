import { defineConfig } from 'vite';
const base=process.env.VITE_BASE_PATH||'/';
const baseURL=base.endsWith('/')?base:`${base}/`;
const staticBuild=process.env.VITE_STATIC_DEMO==='true';
export default defineConfig({base:baseURL,plugins:[{name:'offline-shell',enforce:'post',generateBundle(_,bundle){
 if(staticBuild)for(const fileName of Object.keys(bundle))if(/^assets\/c\d{3}(?:-v2)?-/.test(fileName))delete bundle[fileName];
 const files=[baseURL,...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name)).map(name=>`${baseURL}${name}`)];
 const version='learnbuddy-shell-'+Object.keys(bundle).join('-');
 this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/')||url.pathname.endsWith('/admin'))return;
if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match(${JSON.stringify(baseURL)}))));return;}
if(request.destination==='image'&&url.pathname.startsWith(${JSON.stringify(`${baseURL}assets/`)})){event.respondWith(caches.open(CACHE).then(async cache=>{const saved=await cache.match(request);if(saved)return saved;const response=await fetch(request);if(response.ok)await cache.put(request,response.clone());return response;}));return;}
if(FILES.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});`});
}}],server:{proxy:{'/api':{target:'http://127.0.0.1:8080',changeOrigin:false},'/media':'http://127.0.0.1:8080'}},build:{copyPublicDir:staticBuild}});
