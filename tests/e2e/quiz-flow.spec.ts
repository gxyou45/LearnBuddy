import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:393,height:851},...(process.env.AUDIO_AUDIT_PROXY?{launchOptions:{proxy:{server:process.env.AUDIO_AUDIT_PROXY}}}:{})});
async function setup(page:Page){
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  if(path.startsWith('/static-content/')||path.startsWith('/strokes/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;(window as any).__playCalls=0;
  HTMLMediaElement.prototype.play=function(){(window as any).__playCalls++;(window as any).__audio=this;
   if((window as any).__denyAudio)return Promise.reject(new DOMException('manual tap required','NotAllowedError'));
   if((window as any).__holdAudio)return new Promise<void>(()=>{});
   return play.call(this);
  };
 });
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'继续探索'}).click();
 for(let i=0;i<2;i++)await page.getByRole('button',{name:'读好了，继续'}).click();
}
const state=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
const option=(page:Page,text:string)=>page.locator('.answer-grid').getByRole('button',{name:text,exact:true});
test('auto sound, wrong corrections and half-second advance preserve first evidence across refresh',async({page})=>{
 test.setTimeout(90000);await setup(page);
 await page.evaluate(()=>(window as any).__holdAudio=true);
 await page.getByRole('button',{name:'读好了，继续'}).click();
 await expect.poll(()=>page.evaluate(()=>(window as any).__playCalls)).toBe(1);
 await expect(option(page,'我')).toBeEnabled();
 await option(page,'爸').click();await expect(page.locator('.feedback')).toContainText('换一个答案');
 await expect(option(page,'我')).toBeEnabled();
 const wrong=await state(page);expect(wrong.stepId).toBe('sound-wo');expect(wrong.attempts.at(-1).correct).toBe(false);
 // An unrelated interaction must not advance a wrong answer after the success delay.
 await page.getByRole('button',{name:'听听要找哪个字'}).click();await expect(option(page,'我')).toBeEnabled();
 expect((await state(page)).stepId).toBe('sound-wo');
 await option(page,'妈').click();
 await page.reload();await expect(page.locator('.feedback')).toContainText('换一个答案');
 await page.getByRole('button',{name:'听听要找哪个字'}).click();await expect(option(page,'我')).toBeEnabled({timeout:20000});
 const start=Date.now();await option(page,'我').click();
 await expect(page.locator('.feedback')).toContainText('重试后答对');
 expect((await state(page)).stepId).toBe('sound-wo');
 await expect.poll(async()=>(await state(page)).stepId,{intervals:[50]}).toBe('sound-ba');
 expect(Date.now()-start).toBeGreaterThanOrEqual(450);expect(Date.now()-start).toBeLessThan(2500);
 const p=await state(page),first=p.attempts.find((a:any)=>a.step==='sound-wo');
 expect(first.selectedId).toBe('ba');expect(first.correct).toBe(false);expect(first.retries.map((r:any)=>r.selectedId)).toEqual(['ma','wo']);
 await expect(option(page,'爸')).toBeEnabled({timeout:20000});await option(page,'爸').click();
 await page.getByRole('button',{name:'回小屋',exact:false}).click();
 await expect(page.getByRole('button',{name:'继续我的冒险'})).toBeVisible();
 const step=(await state(page)).stepId;
 await page.reload();expect((await state(page)).stepId).toBe(step);
});
test('blocked autoplay leaves choices available; manual replay and parent help remain available',async({page})=>{
 test.setTimeout(90000);await setup(page);
 await page.evaluate(()=>(window as any).__denyAudio=true);
 await page.getByRole('button',{name:'读好了，继续'}).click();
 await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toBeVisible();
 await expect(option(page,'我')).toBeEnabled();expect((await state(page)).attempts).toHaveLength(0);
 await option(page,'爸').click();await expect(page.locator('.feedback')).toContainText('换一个答案');
 await page.evaluate(()=>(window as any).__denyAudio=false);
 await page.getByRole('button',{name:'听听要找哪个字'}).click();await expect(option(page,'我')).toBeEnabled({timeout:20000});
 await option(page,'我').click();await expect.poll(async()=>(await state(page)).stepId).toBe('sound-ba');
 await page.getByRole('button',{name:'请家长帮一帮'}).click();await option(page,'爸').click();
 await expect.poll(async()=>(await state(page)).stepId).toBe('sound-ma');
 expect((await state(page)).attempts.find((a:any)=>a.step==='sound-ba').hintUsed).toBe(true);
 await page.getByRole('button',{name:'这次先跳过'}).click();
 await expect.poll(async()=>(await state(page)).stepId).toBe('meaning-wo');
 await option(page,'爸爸').click();await expect(page.locator('.feedback')).toContainText('换一个答案');
 await option(page,'我自己').click();await expect(page.locator('.feedback')).toContainText('重试后答对');
 await expect.poll(async()=>(await state(page)).stepId).toBe('meaning-ba');
});
