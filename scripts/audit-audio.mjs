// Read-only browser audit. Uses isolated storage and never submits learning events.
// AUDIO_AUDIT_PROXY=http://127.0.0.1:7897 node scripts/audit-audio.mjs https://gxyou45.github.io/LearnBuddy/ static
import {chromium} from '@playwright/test';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
const [base='http://localhost:8080/',mode='local']=process.argv.slice(2);
const bundledOnly=process.env.AUDIO_AUDIT_BUNDLED==='true';
const bundled=bundledOnly?readdirSync('apps/web/src/character-audio').filter(f=>f.endsWith('.wav')).map(file=>{
 const bytes=readFileSync(`apps/web/src/character-audio/${file}`);
 return {id:`bundled-${file.slice(0,-4)}`,hex:file.slice(0,-4),kind:'audio',bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex')};
}):[];
const browser=await chromium.launch({channel:'chrome',...(process.env.AUDIO_AUDIT_PROXY?{proxy:{server:process.env.AUDIO_AUDIT_PROXY}}:{})});
try{
 const page=await browser.newPage({viewport:{width:393,height:851},serviceWorkers:'allow'});
 await page.goto(base,{waitUntil:'domcontentloaded',timeout:60000});
 await page.exposeFunction('auditLog',message=>console.log(JSON.stringify(message)));
 const result=await page.evaluate(async({mode,play,bundled,bundledOnly})=>{
  const get=async path=>{const r=await fetch(path);if(!r.ok)throw Error(`${path}: HTTP ${r.status}`);return r.json();};
  let lessons,assets;
  if(bundledOnly){
   lessons=[];const urls=new Map();
   for(const script of document.querySelectorAll('script[type=module][src]')){
    const code=await(await fetch(script.src)).text();
    // Vite deduplicates identical recordings: the emitted filename can belong
    // to a homophone, so resolve the original import key, not its output name.
    for(const match of code.matchAll(/["']\.\/character-audio\/([0-9a-f]{4,6})\.wav["']\s*:\s*[`"']([^`"']+\.wav)[`"']/g))urls.set(match[1],match[2]);
   }
   assets=bundled.map(a=>{if(!urls.has(a.hex))throw Error(`Missing bundled recording ${a.hex}`);return {...a,url:new URL(urls.get(a.hex),location.href).href};});
  }
  else if(mode==='static'){const m=await get('./static-content/manifest.json');lessons=m.lessons;assets=m.assets.map(a=>({...a,url:`./static-content/files/${a.objectKey}`}));}
  else{const c=await get('/api/v1/catalog');lessons=c.lessons;const collected=new Map(),pending=[...lessons];await Promise.all(Array.from({length:4},async()=>{while(pending.length){const lesson=pending.shift();const p=await get(`/api/v1/releases/${c.releaseId}/lessons/${lesson.id}`);for(const a of p.assets)collected.set(a.id,a);}}));assets=[...collected.values()];}
  const queue=assets.filter(a=>a.kind==='audio'),total=queue.length,failures=[],recovered=[];
  const context=new AudioContext();let checked=0;
  const worker=async()=>{const audio=new Audio();audio.muted=true;while(queue.length){const asset=queue.shift();try{
   let bytes;
   for(let attempt=0;attempt<3;attempt++)try{
    const r=await fetch(asset.url,{signal:AbortSignal.timeout(30000)});if(!r.ok)throw Error(`HTTP ${r.status}`);
    bytes=await r.arrayBuffer();if(attempt)recovered.push({id:asset.id,phase:'download',retries:attempt});break;
   }catch(error){if(attempt===2)throw error;}
   const hash=[...new Uint8Array(await crypto.subtle.digest('SHA-256',bytes))].map(b=>b.toString(16).padStart(2,'0')).join('');
   if(hash!==asset.sha256||bytes.byteLength!==asset.bytes)throw Error('hash/size mismatch');
   const decoded=await context.decodeAudioData(bytes.slice(0));
   if(!Number.isFinite(decoded.duration)||decoded.duration<=0)throw Error('invalid duration');
   let peak=0;for(const sample of decoded.getChannelData(0))peak=Math.max(peak,Math.abs(sample));
   if(peak<0.001)throw Error('silent audio');
   if(play){
    const playSource=src=>new Promise((resolve,reject)=>{
     const timer=setTimeout(()=>reject(Error('media timeout')),30000);
     audio.onended=()=>{clearTimeout(timer);resolve();};audio.onerror=()=>{clearTimeout(timer);reject(Error(`media error ${audio.error?.code}`));};
     audio.src=src;audio.playbackRate=16;
     audio.play().catch(error=>{clearTimeout(timer);reject(error);});
    });
    try{await playSource(asset.url);}catch(error){
     audio.pause();const url=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));
     try{await playSource(url);recovered.push({id:asset.id,phase:'media',error:String(error)});}finally{URL.revokeObjectURL(url);}
    }finally{audio.pause();audio.removeAttribute('src');audio.load();}
   }
  }catch(e){failures.push({id:asset.id,url:asset.url,error:String(e)});}
  checked++;if(checked%100===0)await window.auditLog({checked,total,failures:failures.length});
  }};
  await Promise.all(Array.from({length:4},worker));await context.close();
  return {lessons:lessons.length,total,checked,fullMediaPlayback:play,recovered,failures};
 },{mode,play:process.env.AUDIO_AUDIT_PLAY==='true',bundled,bundledOnly});
 console.log(JSON.stringify({url:base,...result},null,2));if(result.failures.length)process.exitCode=1;
}finally{await browser.close();}
