import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:process.env.TEST_AUDIO_SW==='true'?'allow':'block',viewport:{width:393,height:851},...(process.env.AUDIO_AUDIT_PROXY?{launchOptions:{proxy:{server:process.env.AUDIO_AUDIT_PROXY}}}:{})});
test('喝水时间: all characters, words and sentence really play; repeated taps recover',async({page})=>{
 test.setTimeout(180000);
 // Some hosts report OS-wide offline even though localhost is reachable.
 // Opt in only for local transport tests; never use in the offline-cache test.
 if(process.env.TEST_LOCAL_NETWORK==='true'){
  expect(process.env.TEST_AUDIO_SW).not.toBe('true');
  expect(new URL(process.env.PLAYWRIGHT_BASE_URL!).hostname).toMatch(/^(localhost|127\.0\.0\.1)$/);
  await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 }
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){
   (window as any).__audioCleanup?.();
   (window as any).__lastAudio=this;
   const evidence={src:this.src,time:0,ended:false,error:0};(window as any).__audioEvidence=evidence;
   const progress=()=>{evidence.time=Math.max(evidence.time,this.currentTime);};
   const ended=()=>{progress();evidence.ended=true;};
   const error=()=>{evidence.error=this.error?.code||1;};
   this.addEventListener('timeupdate',progress);this.addEventListener('ended',ended);this.addEventListener('error',error);
   (window as any).__audioCleanup=()=>{this.removeEventListener('timeupdate',progress);this.removeEventListener('ended',ended);this.removeEventListener('error',error);};
   return original.call(this);
  };
 });
 await page.goto('./');
 await expect(page.getByRole('button',{name:'开始今天的冒险'})).toBeVisible({timeout:20000});
 await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push('snack');localStorage.setItem(key,JSON.stringify(p));});
 await page.goto('./#home');await page.reload();await page.getByRole('button',{name:'开始喝水时间',exact:true}).click();
 await page.getByRole('button',{name:'准备好啦，出发'}).click();
 const play=async(label:string)=>{
  await page.getByRole('button',{name:label,exact:false}).click();
  // Allow the bounded stream/download recovery window; poll short clips often
  // enough that releasing the source at ended cannot hide successful playback.
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__audioEvidence;return a&&!a.error&&a.time>0.05;}),{timeout:75000,intervals:[100]}).toBe(true);
  await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toHaveCount(0);
 };
 for(const text of ['水','喝','吃']){await expect(page.locator('.hanzi')).toHaveText(text);await play('听一听');await page.getByRole('button',{name:'继续探索'}).click();}
 for(const text of ['一杯水','喝一口','吃东西']){await expect(page.locator('.word-card h2')).toHaveText(text);await play('听词语');await page.getByRole('button',{name:'读好了，继续'}).click();}
 await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.step=14;p.stepId='story';localStorage.setItem(key,JSON.stringify(p));});
 await page.reload();await play('听完整故事');
 for(let i=0;i<100;i++)await page.getByRole('button',{name:'听完整故事',exact:false}).click();
 await play('听完整故事');
 expect(errors.filter(e=>/WebMediaPlayer/i.test(e))).toEqual([]);
 if(process.env.TEST_AUDIO_RECOVERY==='true'){
  let ranges=0,downloads=0;
  await page.route('**/*.wav',async route=>{
   if(route.request().headers().range){ranges++;return route.abort('failed');}
   downloads++;if(downloads===1)return route.abort('failed');
   return route.continue();
  });
  await play('听完整故事');
  await expect.poll(()=>page.evaluate(()=>(window as any).__audioEvidence.src)).toMatch(/^blob:/);
  expect(ranges).toBeGreaterThan(0);expect(downloads).toBe(2);
  await expect(page.locator('.story-text .reading-character:not(.is-read)')).toHaveCount(0,{timeout:15000});
  await page.unroute('**/*.wav');
  await page.route('**/*.wav',route=>route.abort('failed'));
  await page.getByRole('button',{name:'听完整故事',exact:false}).click();
  await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toBeVisible();
  await page.unroute('**/*.wav');await play('听完整故事');
 }
 if(process.env.TEST_AUDIO_SW==='true'){
  await page.evaluate(()=>navigator.serviceWorker.ready.then(()=>true));
  await page.reload();await play('听完整故事');
  await page.evaluate(async()=>{const response=await fetch((window as any).__audioEvidence.src);if(!response.ok)throw Error('cache warmup failed');await response.arrayBuffer();});
  await page.context().setOffline(true);
  try{
   await play('听完整故事');
   // Either Chrome's media cache or the full-file fallback may serve the replay.
   await expect.poll(()=>page.evaluate(()=>(window as any).__audioEvidence.ended),{timeout:15000}).toBe(true);
   await expect(page.locator('.story-text .reading-character:not(.is-read)')).toHaveCount(0,{timeout:15000});
  }finally{await page.context().setOffline(false);}
 }
});
