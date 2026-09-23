import {test,expect,type Page} from '@playwright/test';
import {readFile} from 'node:fs/promises';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome'});
const password='Cloud-learning-test-password';
async function setup(page:Page,email:string){await login(page,email);await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeEnabled();return (await(await page.request.get('/api/v1/me')).json());}
async function keys(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('learnbuddy-offline',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<string[]>((resolve,reject)=>{const r=db.transaction('records').objectStore('records').getAllKeys();r.onsuccess=()=>resolve(r.result.map(String));r.onerror=()=>reject(r.error);});});}
async function expandManagement(page:Page){const panel=page.locator('.data-management');await expect(panel).toBeVisible();if(!await panel.evaluate(el=>(el as HTMLDetailsElement).open))await panel.locator('summary').click();}
async function openManagement(page:Page){await page.goto('/#account');await expandManagement(page);}
async function confirmDelete(page:Page,label:string){await page.getByRole('button',{name:'删除所选数据',exact:true}).click();await page.getByLabel(`输入${label.includes('@')?'邮箱':'孩子昵称'}「${label}」确认`).fill(label);await page.getByLabel('当前账户密码').fill(password);await page.getByRole('button',{name:'确认永久删除',exact:true}).click();}
test('export includes factual answers and unsent device records; child deletion preserves sibling and guest',async({page,request})=>{
 test.setTimeout(180000);const me=await setup(page,await verifiedAccount(request)),id=me.learners[0].id;
 await page.route(`**/api/v1/learners/${id}/events:batch`,r=>r.abort());await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');
 await page.evaluate(()=>localStorage.setItem('learnbuddy:v1:progress','guest-is-independent'));
 await openManagement(page);await page.getByLabel('添加孩子昵称').fill('妹妹');await page.getByRole('button',{name:'创建孩子档案'}).click();
 await expect(page.getByRole('button',{name:'用妹妹的档案学习'})).toBeVisible();await expandManagement(page);await page.getByLabel('管理范围').selectOption(id);
 const [download]=await Promise.all([page.waitForEvent('download'),page.getByRole('button',{name:'导出所选数据'}).click()]);const exported=JSON.parse(await readFile((await download.path())!,'utf8'));
 expect(exported.cloud.learners).toHaveLength(1);expect(exported.cloud.learners[0].sessions[0].lesson.releaseId).toBeTruthy();expect(exported.local.records[0].value.events).toHaveLength(1);expect(exported.cloud.learners[0].sessions[0].currentStep).toBe(0);expect(JSON.stringify(exported)).not.toMatch(/"(passwordHash|cleanupToken|accessToken)"/);
 await page.getByRole('button',{name:'删除所选数据',exact:true}).click();await page.getByLabel('输入孩子昵称「小云」确认').fill('另一个孩子');await page.getByLabel('当前账户密码').fill(password);await expect(page.getByRole('button',{name:'确认永久删除'})).toBeDisabled();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await page.screenshot({path:'test-results/data-management-mobile.png',fullPage:true});
 await page.getByLabel('输入孩子昵称「小云」确认').fill('小云');await page.getByLabel('当前账户密码').fill('wrong-password');await page.getByRole('button',{name:'确认永久删除'}).click();await expect(page.locator('.data-management [role=status]')).toContainText('密码验证失败');
 expect((await(await page.request.get('/api/v1/me')).json()).learners).toHaveLength(2);
 await page.getByLabel('当前账户密码').fill(password);await page.getByRole('button',{name:'确认永久删除'}).click();await expect(page.getByRole('button',{name:'用妹妹的档案学习'})).toBeVisible();await expect(page.getByRole('button',{name:'用小云的档案学习'})).toHaveCount(0);
 await expect.poll(async()=> (await keys(page)).filter(k=>k.startsWith(`learning:${me.account.accountId}:${id}`))).toHaveLength(0);
 expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe('guest-is-independent');expect((await page.request.get(`/api/v1/learners/${id}/progress`)).status()).toBe(410);
});
test('offline device purges deleted child and unsent queue on reconnect without deleting sibling',async({page,request,browser})=>{
 test.setTimeout(180000);const email=await verifiedAccount(request),me=await setup(page,email),id=me.learners[0].id;
 await page.context().setOffline(true);await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');
 const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://localhost:8080'});
 try{const other=await context.newPage();await login(other,email);await other.getByLabel('添加孩子昵称').fill('妹妹');await other.getByRole('button',{name:'创建孩子档案'}).click();await expect(other.getByRole('button',{name:'用妹妹的档案学习'})).toBeVisible();await expandManagement(other);await other.getByLabel('管理范围').selectOption(id);await confirmDelete(other,'小云');await expect(other.getByRole('button',{name:'用小云的档案学习'})).toHaveCount(0);
  await page.context().setOffline(false);await expect.poll(async()=> (await keys(page)).filter(k=>k.startsWith(`learning:${me.account.accountId}:${id}`))).toHaveLength(0);
  await page.goto('/#account');await expect(page.getByRole('button',{name:'用妹妹的档案学习'})).toBeVisible();expect((await(await page.request.get('/api/v1/me')).json()).learners).toHaveLength(1);
 }finally{await context.close();}
});
test('account deletion revokes other devices and cleanup proof clears unsent local data after reconnect',async({page,request,browser})=>{
 test.setTimeout(180000);const email=await verifiedAccount(request),me=await setup(page,email),prefix=`learning:${me.account.accountId}:`;
 await page.context().setOffline(true);await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');
 const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://localhost:8080'});
 try{const other=await context.newPage();await login(other,email);await other.getByText('导出与删除数据',{exact:true}).click();await confirmDelete(other,email);await expect(other.getByRole('button',{name:'登录小屋'})).toBeVisible();
  await page.context().setOffline(false);await expect(page.getByRole('button',{name:'登录小屋'})).toBeVisible();await expect.poll(async()=> (await keys(page)).filter(k=>k.startsWith(prefix)||k===`cleanup-proof:${me.account.accountId}`||k==='last-family')).toHaveLength(0);
  expect((await page.request.get('/api/v1/account/export')).status()).toBe(401);
  // The account tombstone remains after queue cleanup to guard stale writers.
  const blocked=await page.evaluate(async({prefix})=>{const db=await new Promise<IDBDatabase>(resolve=>{const r=indexedDB.open('learnbuddy-offline',1);r.onsuccess=()=>resolve(r.result);});return new Promise<boolean>(resolve=>{const r=db.transaction('records').objectStore('records').get(prefix.replace('learning:','deleted:').slice(0,-1));r.onsuccess=()=>resolve(r.result===true);});},{prefix});expect(blocked).toBe(true);
 }finally{await context.close();}
});
