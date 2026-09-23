import {test,expect,type Page} from '@playwright/test';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome'});
async function create(page:Page,email:string){await login(page,email);await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeEnabled();}
async function local(page:Page){return page.evaluate(async()=>{const db=await new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('learnbuddy-offline',1);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});return new Promise<any[]>((resolve,reject)=>{const r=db.transaction('records').objectStore('records').getAll();r.onsuccess=()=>resolve(r.result.filter(x=>x?.events));r.onerror=()=>reject(r.error);});});}
test('offline answer survives reload, synchronizes actual choices once and leaves no phantom cloud save',async({page,request})=>{
 test.setTimeout(180000);const email=await verifiedAccount(request);await create(page,email);
 await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'继续探索'}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'读好了，继续'}).click();
 await expect(page.locator('.activity-top')).toContainText('8/15');
 await page.evaluate(()=>navigator.serviceWorker.ready);await page.reload();await expect(page.getByRole('button',{name:'听听要找哪个字'})).toBeEnabled();
 await page.context().setOffline(true);
 await page.getByRole('button',{name:'听听要找哪个字'}).click();await page.getByRole('button',{name:'爸',exact:true}).click();
 await expect(page.locator('.cloud-status')).toContainText('待同步 2 条');await expect(page.locator('.feedback')).toContainText('没关系');
 const queued=await local(page);expect(queued[0].events).toHaveLength(2);expect(queued[0].confirmed.sessions[0].presentation.answer).toBeNull();
 await page.reload();await expect(page.locator('.feedback')).toContainText('没关系');await expect(page.locator('.cloud-status')).toContainText('待同步 2 条');
 await page.screenshot({path:'test-results/offline-queue.png',fullPage:true});const actions=await page.locator('.learning-actions').boundingBox();expect(actions!.y+actions!.height).toBeLessThanOrEqual(852);
 await page.context().setOffline(false);await expect(page.locator('.cloud-status')).not.toContainText('待同步');
 const me=await(await page.request.get('/api/v1/me')).json(),id=me.learners[0].id;
 const state=await(await page.request.get(`/api/v1/learners/${id}/progress`)).json();expect(state.sessions[0].presentation.answer.selectedId).toBe('ba');expect(state.sessions[0].presentation.answer.correct).toBe(false);
 expect((await local(page))[0].events).toHaveLength(0);
 const mistakes=await(await page.request.get(`/api/v1/learners/${id}/mistakes`)).json();expect(mistakes.items[0].wrongCount).toBe(1);
});
test('other-device conflict preserves local facts and requires explicit server-position choice',async({page,request,browser})=>{
 test.setTimeout(180000);const email=await verifiedAccount(request);await create(page,email);
 await page.context().setOffline(true);await page.getByRole('button',{name:'准备好啦，出发'}).click();await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');
 const context=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://localhost:8080'});
 try{const other=await context.newPage();await login(other,email);await choose(other);await other.getByRole('button',{name:'继续我的冒险'}).click();await other.getByRole('button',{name:'准备好啦，出发'}).click();await expect(other.locator('.hanzi')).toHaveText('我');
  await page.context().setOffline(false);await expect(page.getByRole('button',{name:'保留本机副本，继续云端位置'})).toBeVisible();expect((await local(page))[0].events).toHaveLength(2);
  await page.getByRole('button',{name:'保留本机副本，继续云端位置'}).click();await page.getByRole('button',{name:'继续我的冒险'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
  const records=await local(page);expect(records.some(r=>r.events.length===2&&!!r.conflict)).toBe(true);
 }finally{await context.close();}
});
test('parent previews and imports guest history without deleting it or counting new answers',async({page,request})=>{
 test.setTimeout(180000);await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 const raw=await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'));
 const email=await verifiedAccount(request);await login(page,email);await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
 await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();await page.getByText('本机旧记录已保留 · 导入记录',{exact:true}).click();
 await page.getByRole('button',{name:'查看导入摘要'}).click();await expect(page.getByText('将导入到「小云」',{exact:false})).toBeVisible();await page.getByRole('button',{name:'确认导入所选孩子'}).click();await expect(page.getByText('导入完成，重复导入不会重复记录。')).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe(raw);
 await page.getByRole('button',{name:'重新读取进度',exact:true}).click();await page.getByRole('button',{name:'回汉字小屋'}).click();await page.getByRole('button',{name:'继续我的冒险'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
 const me=await(await page.request.get('/api/v1/me')).json();const progress=await(await page.request.get(`/api/v1/learners/${me.learners[0].id}/progress`)).json();expect(progress.skills).toHaveLength(0);
});
test('failed IndexedDB write does not advance or falsely report a queued save',async({page,request})=>{
 test.setTimeout(180000);await create(page,await verifiedAccount(request));
 await page.evaluate(()=>{IDBObjectStore.prototype.put=function(){throw new DOMException('Quota exhausted','QuotaExceededError');};});
 await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('本机存储失败');await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
 expect((await local(page))[0].events).toHaveLength(0);
});
test('unsent records stay with the original account across sign-out and another family login',async({page,request})=>{
 test.setTimeout(180000);const a=await verifiedAccount(request),b=await verifiedAccount(request);await create(page,a);
 const original=await(await page.request.get('/api/v1/me')).json(),id=original.learners[0].id;
 await page.route(`**/api/v1/learners/${id}/events:batch`,r=>r.abort());await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');
 await page.goto('/#account');await page.getByRole('button',{name:'退出当前账户'}).click();await create(page,b);
 expect((await local(page)).find(r=>r.view.learnerId===id).events).toHaveLength(1);const other=await(await page.request.get('/api/v1/me')).json();expect(other.account.accountId).not.toBe(original.account.accountId);
 const state=await(await page.request.get(`/api/v1/learners/${other.learners[0].id}/progress`)).json();expect(state.sessions[0].stepIndex).toBe(0);
 await page.goto('/#account');await page.getByRole('button',{name:'退出当前账户'}).click();await page.unroute(`**/api/v1/learners/${id}/events:batch`);await login(page,a);await choose(page);await expect(page.locator('.cloud-status')).not.toContainText('待同步');await page.getByRole('button',{name:'继续我的冒险'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
});
