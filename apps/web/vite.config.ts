import { defineConfig } from 'vite';
export default defineConfig({plugins:[{name:'offline-shell',enforce:'post',generateBundle(_,bundle){
 const files=['/',...Object.keys(bundle).filter(name=>/\.(js|css)$/.test(name)).map(name=>'/'+name)];
 const version='learnbuddy-shell-'+Object.keys(bundle).join('-');
 this.emitFile({type:'asset',fileName:'sw.js',source:`const CACHE=${JSON.stringify(version)},FILES=${JSON.stringify(files)};
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(cache=>cache.addAll(FILES))));
self.addEventListener('activate',event=>event.waitUntil(self.clients.claim()));
self.addEventListener('fetch',event=>{const request=event.request,url=new URL(request.url);if(request.method!=='GET'||url.origin!==location.origin||url.pathname.startsWith('/api/')||url.pathname.startsWith('/media/')||url.pathname==='/admin')return;
if(request.mode==='navigate'){event.respondWith(fetch(request).catch(()=>caches.open(CACHE).then(cache=>cache.match('/'))));return;}
if(FILES.includes(url.pathname))event.respondWith(caches.open(CACHE).then(async cache=>(await cache.match(request))||fetch(request)));
});`});
}}],server:{proxy:{'/api':{target:'http://127.0.0.1:8080',changeOrigin:false},'/media':'http://127.0.0.1:8080'}},build:{copyPublicDir:false}});
