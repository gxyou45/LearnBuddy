import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const briefs: {id:string;title:string;alt:string;file:string}[]=JSON.parse(readFileSync('apps/web/src/story-art/briefs.json','utf8'));
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test('reviewed illustrations match source bytes and remain usable on a phone',async({page,request})=>{
 test.setTimeout(240000);
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/')||path.startsWith('/static-content/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 await page.goto('./');await expect(page.locator('.parent-link')).toBeVisible();
 const ids=process.env.TEST_STATIC_DEMO==='true'?['family','c024','c045']:['family','c024','c045','c053','c128','c174','c175','c184','c199','c200'];
 // Isolated guest fixture only, never a cloud account or actual child's record.
 await page.evaluate(ids=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  for(const id of ids)p.lessonProgress[id]={step:0,started:false,completed:true,session:`art-preview-${id}`,huntFound:[]};
  p.completed=true;p.started=false;localStorage.setItem(key,JSON.stringify(p));
 },ids);
 await page.reload();
 for(const id of ids){
  const brief=briefs.find(b=>b.id===id)!;
  await page.evaluate(id=>{location.hash=`reader/${id}`;},id);
  const img=page.locator('img.story-art');await expect(img).toHaveAttribute('alt',brief.alt,{timeout:20000});
  await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth===1536),{timeout:20000}).toBe(true);
  const url=await img.getAttribute('src');
  // In built-preview mode image routing happens in the browser, so fetch there.
  const hash=process.env.TEST_BUILT_WEB==='true'?await page.evaluate(async url=>{
   const bytes=await(await fetch(url!)).arrayBuffer();
   return Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),x=>x.toString(16).padStart(2,'0')).join('');
  },url):createHash('sha256').update(await(await request.get(url!)).body()).digest('hex');
  expect(hash,id).toBe(createHash('sha256').update(readFileSync(resolve('apps/web/src/story-art',brief.file))).digest('hex'));
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:`test-results/story-published-${id}-320.png`});
  await page.getByRole('button',{name:`放大查看《${brief.title}》故事插图`}).click();
  await expect(page.getByRole('dialog')).toBeVisible();
  await page.screenshot({path:`test-results/story-published-${id}-large.png`});
  await page.getByRole('button',{name:'关闭大图',exact:true}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 }
});
