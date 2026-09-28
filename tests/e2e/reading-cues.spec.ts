import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block'});
test('first lesson word calibration persists, exports and invalidates after editing text',async({page})=>{
 const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
 let draft={id:'cue-test',revision:1,baseReleaseId:manifest.releaseId,manifest,publishedReleaseId:null};
 await page.route('**/*',async route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/admin')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  if(path.includes('/media/')){
   const asset=manifest.assets.find((a:any)=>a.sha256===path.split('/').at(-1));
   const bytes=readFileSync('content/files/'+asset.objectKey),range=route.request().headers().range?.match(/^bytes=(\d+)-(\d*)$/);
   if(range){const start=Number(range[1]),end=range[2]?Number(range[2]):bytes.length-1;return route.fulfill({status:206,body:bytes.subarray(start,end+1),contentType:asset.mimeType,headers:{'Accept-Ranges':'bytes','Content-Range':`bytes ${start}-${end}/${bytes.length}`}});}
   return route.fulfill({body:bytes,contentType:asset.mimeType,headers:{'Accept-Ranges':'bytes'}});
  }
  let data:unknown={};
  if(path.endsWith('/content'))data={channel:{releaseId:manifest.releaseId,revision:1},releases:[],drafts:[],audit:[]};
  if(path.endsWith('/drafts'))data=draft;
  if(path.endsWith('/drafts/cue-test')){draft={...draft,manifest:route.request().postDataJSON().manifest,revision:2};data=draft;}
  return route.fulfill({json:data});
 });
 await page.goto('http://learnbuddy.test/admin');
 await page.getByRole('button',{name:'新建草稿',exact:true}).click();
 await page.getByRole('button',{name:'素材与声音',exact:true}).click();
 await page.getByLabel('选择素材').selectOption('audio-word-ba');
 await page.getByRole('button',{name:'我已逐字审听，确认时间点'}).click();
 await expect(page.getByRole('alert')).toContainText('请检查');
 await page.getByRole('spinbutton',{name:'爸第1位起点',exact:true}).fill('0.03');
 await page.getByRole('spinbutton',{name:'爸第1位终点',exact:true}).fill('0.25');
 await page.getByRole('spinbutton',{name:'爸第2位起点',exact:true}).fill('0.34');
 await page.getByRole('spinbutton',{name:'爸第2位终点',exact:true}).fill('0.6');
 await page.getByRole('button',{name:'我已逐字审听，确认时间点'}).click();
 await expect(page.getByText(/时间点：已审听校准/)).toBeVisible();
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();
 await expect(page.getByRole('status')).toContainText('草稿已保存');
 const saved=draft.manifest.assets.find((a:any)=>a.id==='audio-word-ba');
 expect(saved.cues.audioSha256).toBe(saved.sha256);expect(saved.cues.ends).toEqual([.25,.6]);
 const download=page.waitForEvent('download');
 await page.getByRole('button',{name:'导出已审听时间点'}).click();
 const downloaded=JSON.parse(readFileSync((await(await download).path())!,'utf8'));
 expect(downloaded['audio-word-ba']).toEqual(saved.cues);
 await page.getByRole('button',{name:'预览',exact:true}).click();
 await page.getByLabel('选择步骤').selectOption(String(manifest.lessons[0].steps.findIndex((s:any)=>s.kind==='word'&&s.characterId==='ba')));
 await expect.poll(()=>page.locator('.admin-preview audio').evaluate((element:HTMLAudioElement)=>element.readyState)).toBeGreaterThanOrEqual(1);
 await page.locator('.admin-preview audio').evaluate((element:HTMLAudioElement)=>{element.currentTime=.3;element.dispatchEvent(new Event('timeupdate'));});
 await expect(page.locator('.admin-reading .active')).toHaveCount(0);
 await page.locator('.admin-preview audio').evaluate((element:HTMLAudioElement)=>{element.currentTime=.4;element.dispatchEvent(new Event('timeupdate'));});
 await expect(page.locator('.admin-reading .active')).toHaveText('爸');
 await page.getByRole('button',{name:'素材与声音',exact:true}).click();
 await page.getByLabel('录音文字',{exact:true}).fill('爸爸呀');
 await expect(page.getByText(/时间点：估算／待审听/)).toBeVisible();
 await expect(page.getByRole('button',{name:'导出已审听时间点'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
