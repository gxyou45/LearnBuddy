import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test.beforeEach(async({page})=>{
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/')||path.startsWith('/static-content/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
});
async function seed(page:Page){
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await expect(page.locator('.activity-intro')).toBeVisible();
 await page.evaluate(()=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  p.sound=false;p.started=false;p.completed=true;
  p.attempts=['wo','ba','ma'].map((id,i)=>({id:`old-${id}`,session:'old',step:`meaning-${id}`,characterId:id,kind:'meaning',correct:id!=='wo',hintUsed:false,skipped:false,date:'2020-01-01',timestamp:i+1,selectedId:id==='wo'?'ba':id}));
  localStorage.setItem(key,JSON.stringify(p));location.hash='home';
 });
 await page.reload();
}
const formal=async(page:Page)=>page.evaluate(()=>{const p=JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!);return {session:p.session,activeLesson:p.activeLesson,completed:p.completed,started:p.started,stepId:p.stepId};});

test('optional warmup survives invitation refresh, keeps corrections, caps at two and starts selected lesson',async({page})=>{
 test.setTimeout(90000);await seed(page);const before=await formal(page);
 await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await expect(page.locator('.warmup-invitation')).toContainText('只回顾 2 个学过的字');
 expect(await formal(page)).toEqual(before);
 await page.reload();await expect(page.locator('.warmup-invitation')).toBeVisible();
 await page.screenshot({path:'test-results/warmup-invitation-320.png'});
 await page.getByRole('button',{name:'先回顾 2 个字 →',exact:true}).click();
 await expect(page.getByText('课前热身 1 / 2',{exact:true})).toBeVisible();
 await expect(page.locator('.quiz-hanzi')).toHaveText('我');
 await page.getByRole('button',{name:'爸爸',exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('换一个答案');
 await page.waitForTimeout(700);await expect(page.getByText('课前热身 1 / 2',{exact:true})).toBeVisible();
 expect(await formal(page)).toEqual(before);
 await page.screenshot({path:'test-results/warmup-correction-320.png'});
 await page.getByRole('button',{name:'我自己',exact:true}).click();
 await expect(page.getByText('课前热身 2 / 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'这次先跳过',exact:true}).click();
 await expect(page.locator('.activity-top')).toContainText('1/15');
 expect((await formal(page)).activeLesson).toBe('home');
 const attempts=await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).attempts);
 expect(attempts).toHaveLength(5);expect(attempts[3].correct).toBe(false);expect(attempts[3].retries[0].correct).toBe(true);
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'继续我的冒险'}).click();
 await expect(page.locator('.activity-intro')).toBeVisible();await expect(page.locator('.warmup-invitation')).toHaveCount(0);
});

test('declining or exiting warmup never blocks a new lesson; replay does not prompt',async({page})=>{
 test.setTimeout(90000);await seed(page);
 await page.getByRole('button',{name:'重玩认识家人',exact:true}).click();
 await expect(page.locator('.activity-intro')).toBeVisible();await expect(page.locator('.warmup-invitation')).toHaveCount(0);
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'开始一起回家',exact:true}).click();
 await expect(page.locator('.warmup-invitation')).toBeVisible();
 const count=await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).attempts.length);
 await page.getByRole('button',{name:'直接开始新课 →',exact:true}).click();
 await expect(page.locator('.activity-intro')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).attempts.length)).toBe(count);
 // A separate isolated browser fixture lets us exercise early exit without touching user data.
 await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.started=false;p.completed=false;localStorage.setItem(key,JSON.stringify(p));location.hash='home';});
 await page.reload();await page.getByRole('button',{name:'开始一起回家',exact:true}).click();
 await page.getByRole('button',{name:'先回顾 2 个字 →',exact:true}).click();
 await expect(page.getByText('课前热身 1 / 2',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'跳过回顾，开始新课 →',exact:true}).click();
 await expect(page.locator('.activity-intro')).toBeVisible();
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).attempts.length)).toBe(count);
});
