import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
async function parent(page:Page){
 await page.locator('.parent-link').click();await page.getByRole('button',{name:'27',exact:true}).click();
}
test.beforeEach(async({page})=>{
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
});
test('published guest difficulty persists without enabling new content',async({page})=>{
 await page.goto('./');await parent(page);
 const select=page.getByLabel('新找字局的干扰字');await expect(select).toHaveValue('auto');await select.selectOption('4');
 await page.reload();await parent(page);await expect(select).toHaveValue('4');
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).huntRound?.version)).toBe(1);
});
test('published cloud saves difficulty for the child and preserves the current round',async({page,request})=>{
 test.skip(process.env.TEST_PUBLISHED_CLOUD!=='true','Cloud smoke runs only on the local API deployment');
 test.setTimeout(180000);
 page.setDefaultTimeout(15000);
 const email=await verifiedAccount(request);await login(page,email);
 try{
  await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
  await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await expect(page.locator('.activity-top')).toContainText('1/15');
  await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  await expect(page.locator('.cloud-status')).toBeHidden();
  await expect(page.locator('.learner-banner')).toHaveCount(0);
  // A retained guest record must remain available in the parent center, not above the lesson.
  await page.evaluate(()=>localStorage.setItem('learnbuddy:v1:progress','{"test":"retained legacy record"}'));
  await page.reload();await expect(page.locator('.activity-top')).toContainText('1/15');
  await expect(page.locator('.cloud-status')).toBeHidden();
  await expect(page.locator('.cloud-learning > .legacy-notice')).toHaveCount(0);
  await page.screenshot({path:'test-results/quiet-learning-header-320.png'});
  await page.evaluate(()=>{Object.defineProperty(Navigator.prototype,'onLine',{get:()=>false,configurable:true});dispatchEvent(new Event('offline'));});
  await expect(page.locator('.cloud-status')).toBeVisible();await expect(page.locator('.cloud-status')).toContainText('离线模式');
  await page.evaluate(()=>{Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true});dispatchEvent(new Event('online'));});
  await expect(page.locator('.cloud-status')).toBeHidden();
  const me=await(await page.request.get('/api/v1/me')).json(),root=`/api/v1/learners/${me.learners[0].id}`;
  const progress=async()=>await(await page.request.get(root+'/progress')).json();
  const before=await progress();await parent(page);
  await expect(page.getByText('本机旧记录已保留 · 导入记录',{exact:true})).toBeVisible();
  expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe('{"test":"retained legacy record"}');
  await page.getByLabel('新找字局的干扰字').selectOption('4');
  await expect.poll(async()=>(await progress()).huntDistractorCount).toBe(4);
  await page.reload();await parent(page);await expect(page.getByLabel('新找字局的干扰字')).toHaveValue('4');
  const after=await progress();expect(after.sessions).toEqual(before.sessions);expect(after.seen).toEqual(before.seen);expect(after.skills).toEqual(before.skills);
  expect(after.sessions[0].huntRound.version).toBe(1);
  await page.getByLabel('新找字局的干扰字').selectOption('auto');await expect.poll(async()=>(await progress()).huntDistractorCount).toBeNull();
  await page.route('**/learning-settings',route=>route.abort());
  await page.getByLabel('新找字局的干扰字').selectOption('2');
  await expect(page.locator('.cloud-status')).toBeVisible();
  await expect(page.getByRole('button',{name:'重试保存',exact:true})).toBeVisible();
  await page.unroute('**/learning-settings');await page.getByRole('button',{name:'重试保存',exact:true}).click();
  await expect(page.locator('.cloud-status')).toBeHidden();
 }finally{
  test.setTimeout(test.info().timeout+30000);
  const removed=await page.request.delete('/api/v1/account',{headers:{Origin:process.env.PLAYWRIGHT_BASE_URL!},data:{requestId:randomUUID(),confirmation:email,password:'Cloud-learning-test-password'}});
  expect(removed.ok(),'remove only this generated test account').toBe(true);
 }
});
