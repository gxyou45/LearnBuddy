import {test,expect,type Page} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
async function parent(page:Page){
 await page.locator('.parent-link').click();await page.getByRole('button',{name:'27',exact:true}).click();
}
test.beforeEach(async({page})=>{
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
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
  const me=await(await page.request.get('/api/v1/me')).json(),root=`/api/v1/learners/${me.learners[0].id}`;
  const progress=async()=>await(await page.request.get(root+'/progress')).json();
  const before=await progress();await parent(page);
  await page.getByLabel('新找字局的干扰字').selectOption('4');
  await expect.poll(async()=>(await progress()).huntDistractorCount).toBe(4);
  await page.reload();await parent(page);await expect(page.getByLabel('新找字局的干扰字')).toHaveValue('4');
  const after=await progress();expect(after.sessions).toEqual(before.sessions);expect(after.seen).toEqual(before.seen);expect(after.skills).toEqual(before.skills);
  expect(after.sessions[0].huntRound.version).toBe(1);
  await page.getByLabel('新找字局的干扰字').selectOption('auto');await expect.poll(async()=>(await progress()).huntDistractorCount).toBeNull();
 }finally{
  test.setTimeout(test.info().timeout+30000);
  const removed=await page.request.delete('/api/v1/account',{headers:{Origin:process.env.PLAYWRIGHT_BASE_URL!},data:{requestId:randomUUID(),confirmation:email,password:'Cloud-learning-test-password'}});
  expect(removed.ok(),'remove only this generated test account').toBe(true);
 }
});
