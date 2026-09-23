import {test,expect,type Page,type APIRequestContext} from '@playwright/test';
test.use({channel:'chrome'});
import {verifiedAccount,login,choose} from './cloud-helpers';
test('cloud saves real answers, resumes on another device and preserves formal position during reading',async({page,browser,request})=>{
 test.setTimeout(180000);
 const email=await verifiedAccount(request);await login(page,email);
 await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
 await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
 const second=await browser.newContext({baseURL:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5173',viewport:{width:393,height:650}});
 try {
  const other=await second.newPage();await login(other,email);await choose(other);await other.getByRole('button',{name:'继续我的冒险'}).click();await expect(other.locator('.hanzi')).toHaveText('爸');const actions=await other.locator('.learning-actions').boundingBox();expect(actions!.y+actions!.height).toBeLessThanOrEqual(651);
  for(let i=0;i<2;i++)await other.getByRole('button',{name:'继续探索'}).click();
  for(let i=0;i<3;i++)await other.getByRole('button',{name:'读好了，继续'}).click();
  await other.getByRole('button',{name:'听听要找哪个字'}).click();await other.getByRole('button',{name:'爸',exact:true}).click();await expect(other.locator('.feedback')).toContainText('没关系');
  const selectedBefore=await other.locator('.answer-grid button').allTextContents();await other.reload();await expect(other.locator('.feedback')).toContainText('没关系');expect(await other.locator('.answer-grid button').allTextContents()).toEqual(selectedBefore);
  const me=await(await other.request.get('/api/v1/me')).json();const learner=me.learners[0].id;
  const before=await(await other.request.get(`/api/v1/learners/${learner}/progress`)).json();
  await other.getByRole('button',{name:'读词语',exact:true}).click();await expect(other.locator('.reading-practice')).toBeVisible();await other.getByRole('button',{name:'听词语'}).click();await other.locator('.reading-back').click();
  const after=await(await other.request.get(`/api/v1/learners/${learner}/progress`)).json();expect(after.revision).toBe(before.revision);expect(after.sessions[0].stepIndex).toBe(7);
  await page.reload();await expect(page.locator('.feedback')).toContainText('没关系');
  const woQuestion=after.sessions[0].presentation.questionVersionId;
  await other.getByRole('button',{name:'继续探索'}).click();
  await expect(other.locator('.activity-top')).toContainText('9/15');
  await expect(other.locator('.cloud-status')).toHaveText('已保存到云端');
  const atBa=await(await other.request.get(`/api/v1/learners/${learner}/progress`)).json();
  const baQuestion=atBa.sessions[0].presentation.questionVersionId;
  await other.getByRole('button',{name:'这次先跳过'}).click();await expect(other.locator('.activity-top')).toContainText('10/15');
  await expect(other.locator('.cloud-status')).toHaveText('已保存到云端');
  const formal=await(await other.request.get(`/api/v1/learners/${learner}/progress`)).json();
  // Simulate tomorrow's due queue only; review sessions/answers use the real backend.
  await other.route('**/api/v1/learners/*/reviews',r=>r.fulfill({json:{today:'2026-09-23',timeZone:'Asia/Shanghai',items:[['wo',woQuestion],['ba',baQuestion]].map(([targetId,questionVersionId])=>({targetId,questionVersionId,kind:'sound',dueDate:'2026-09-23',releaseId:formal.releaseId,lessonId:'family',ruleVersion:1}))}}));
  await other.goto('/#garden');await other.reload();await other.getByRole('button',{name:'开始回顾'}).click();
  for(const text of ['我','爸']){await other.getByRole('button',{name:'听听要找哪个字'}).click();await other.getByRole('button',{name:text,exact:true}).click();await expect(other.locator('.feedback')).toContainText('找到啦');await other.getByRole('button',{name:'继续探索'}).click();}
  await expect(other.getByRole('heading',{name:'回顾花园'})).toBeVisible();
  const reviewed=await(await other.request.get(`/api/v1/learners/${learner}/progress`)).json();expect(reviewed.sessions[0].id).toBe(formal.sessions[0].id);expect(reviewed.sessions[0].stepIndex).toBe(9);
  await other.getByRole('button',{name:'家长',exact:false}).first().click();await other.getByRole('button',{name:'27',exact:true}).click();await expect(other.locator('.mistakes-panel')).toContainText('当时选择：爸');await expect(other.locator('.mistakes-panel')).toContainText('正确答案：我');await expect(other.locator('.mistakes-panel')).toContainText('累计 1 次');
  await other.screenshot({path:'test-results/cloud-mistakes.png',fullPage:true});
 }finally{await second.close();}
});
test('lost advance response retries the same event without advancing twice; offline queues writes',async({page,request})=>{
 test.setTimeout(180000);await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();const legacy=await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'));const email=await verifiedAccount(request);await login(page,email);
 await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
 const family=await(await page.request.get('/api/v1/me')).json();const legacyKey=`learnbuddy:v1:progress:${family.account.accountId}:${family.learners[0].id}`;
 await page.evaluate(({key,raw})=>localStorage.setItem(key,raw!),{key:legacyKey,raw:legacy});await page.reload();await expect(page.getByText('本机旧记录已保留',{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'开始今天的冒险'}).click();
 let intercepted=false;
 await page.route('**/api/v1/learners/*/events:batch',async route=>{if(!intercepted&&route.request().postDataJSON().events[0]?.command.type==='advance'){intercepted=true;await route.fetch();await route.abort();}else await route.continue();});
 await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.getByRole('button',{name:'重试保存'})).toBeVisible();await page.getByRole('button',{name:'重试保存'}).click();await expect(page.locator('.hanzi')).toHaveText('我');await expect(page.locator('.cloud-status')).toContainText('云端');
 await page.context().setOffline(true);await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');await page.context().setOffline(false);await expect(page.locator('.cloud-status')).not.toContainText('待同步');
 expect(await page.evaluate(key=>localStorage.getItem(key),legacyKey)).toBe(legacy);
 const box=await page.locator('.learning-actions').boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(852);
});
