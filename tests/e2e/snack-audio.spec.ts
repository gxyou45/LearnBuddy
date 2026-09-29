import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:393,height:851},...(process.env.AUDIO_AUDIT_PROXY?{launchOptions:{proxy:{server:process.env.AUDIO_AUDIT_PROXY}}}:{})});
test('喝水时间: all characters, words and sentence really play; repeated taps recover',async({page})=>{
 test.setTimeout(180000);
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 const errors:string[]=[];page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{
  const original=HTMLMediaElement.prototype.play;
  HTMLMediaElement.prototype.play=function(){(window as any).__lastAudio=this;return original.call(this);};
 });
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push('snack');localStorage.setItem(key,JSON.stringify(p));});
 await page.goto('./#home');await page.reload();await page.getByRole('button',{name:'开始喝水时间',exact:true}).click();
 await page.getByRole('button',{name:'准备好啦，出发'}).click();
 const play=async(label:string)=>{
  await page.getByRole('button',{name:label,exact:false}).click();
  await expect.poll(()=>page.evaluate(()=>{const a=(window as any).__lastAudio;return a&&!a.error&&a.currentTime>0.05;})).toBe(true);
  await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toHaveCount(0);
 };
 for(const text of ['水','喝','吃']){await expect(page.locator('.hanzi')).toHaveText(text);await play('听一听');await page.getByRole('button',{name:'继续探索'}).click();}
 for(const text of ['一杯水','喝一口','吃东西']){await expect(page.locator('.word-card h2')).toHaveText(text);await play('听词语');await page.getByRole('button',{name:'读好了，继续'}).click();}
 await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.step=14;p.stepId='story';localStorage.setItem(key,JSON.stringify(p));});
 await page.reload();await play('听完整故事');
 for(let i=0;i<100;i++)await page.getByRole('button',{name:'听完整故事',exact:false}).click();
 await play('听完整故事');
 expect(errors.filter(e=>/WebMediaPlayer|audio|media/i.test(e))).toEqual([]);
 if(process.env.TEST_AUDIO_RECOVERY==='true'){
  let ranges=0,downloads=0;
  await page.route('**/*.wav',async route=>{
   if(route.request().headers().range){ranges++;return route.abort('failed');}
   downloads++;if(downloads===1)return route.abort('failed');
   return route.continue();
  });
  await play('听完整故事');
  await expect.poll(()=>page.evaluate(()=>(window as any).__lastAudio.src)).toMatch(/^blob:/);
  expect(ranges).toBeGreaterThan(0);expect(downloads).toBe(2);
  await expect(page.locator('.story-text .reading-character:not(.is-read)')).toHaveCount(0,{timeout:15000});
  await page.unroute('**/*.wav');
  await page.route('**/*.wav',route=>route.abort('failed'));
  await page.getByRole('button',{name:'听完整故事',exact:false}).click();
  await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toBeVisible();
  await page.unroute('**/*.wav');await play('听完整故事');
 }
});
