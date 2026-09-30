import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test('garden and lesson-end keep the selected kind and bounded distinct targets',async({page})=>{
 test.setTimeout(90000);
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/')||path.startsWith('/static-content/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await page.evaluate(()=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  p.sound=false;
  p.attempts=['wo','ba','ma','ren','jia','men'].flatMap((id,i)=>['sound','meaning'].map(kind=>({id:`${id}-${kind}`,session:'review-fixture',step:`${kind}-${id}`,characterId:id,kind,correct:!(id==='wo'&&kind==='meaning'),hintUsed:false,skipped:false,date:'2020-01-01',timestamp:i+1,selectedId:id})));
  localStorage.setItem(key,JSON.stringify(p));location.hash='garden';
 });
 await page.reload();await page.getByRole('button',{name:'开始回顾 →',exact:true}).click();
 await expect(page.getByText('老朋友 1 / 5',{exact:true})).toBeVisible();
 await expect(page.locator('.activity-meaning')).toBeVisible();await expect(page.locator('.quiz-hanzi')).toHaveText('我');
 const formal=await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!);return [p.session,p.stepId,p.completed];});
 await page.screenshot({path:'test-results/review-selection-garden-320.png'});
 await page.getByRole('button',{name:'我自己',exact:true}).click();
 await expect(page.getByText('老朋友 2 / 5',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'结束回顾',exact:false}).click();
 expect(await page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!);return [p.session,p.stepId,p.completed];})).toEqual(formal);
 await page.evaluate(()=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  p.started=false;p.completed=true;localStorage.setItem(key,JSON.stringify(p));location.hash='done';
 });
 await page.reload();await page.getByRole('button',{name:'综合练习 · 新字和老朋友 →',exact:true}).click();
 await expect(page.getByText('老朋友 1 / 5',{exact:true})).toBeVisible();
 await page.screenshot({path:'test-results/review-selection-mixed-320.png'});
 const targets:string[]=[];
 for(let i=0;i<5;i++){
  await expect(page.getByText(`老朋友 ${i+1} / 5`,{exact:true})).toBeVisible();
  const text=await page.locator('.quiz-hanzi').textContent();targets.push(text!);
  await page.getByRole('button',{name:'这次先跳过',exact:true}).click();
 }
 expect(new Set(targets).size).toBe(5);
 expect(targets.filter(x=>['我','爸','妈'].includes(x))).toHaveLength(2);
 await expect(page.getByRole('button',{name:'开始回顾 →',exact:true})).toBeVisible();
});
