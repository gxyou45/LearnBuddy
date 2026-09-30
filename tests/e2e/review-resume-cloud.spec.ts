import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test('cloud fixed round restores wrong choice on refresh and resumes the same sessions on a second device',async({page,request,browser})=>{
 test.setTimeout(180000);const origin=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:8080';
 const configure=async(p:typeof page)=>{
  if(process.env.TEST_LOCAL_NETWORK==='true')await p.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
  if(process.env.TEST_BUILT_WEB==='true')await p.route('**/*',route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
   if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
   return route.continue();
  });
 };
 await configure(page);const email=await verifiedAccount(request);await login(page,email);
 let other:Awaited<ReturnType<typeof browser.newContext>>|undefined;
 try{
  await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();
  await expect(page.getByRole('button',{name:'用小云的档案学习'})).toBeVisible();
  const me=await(await page.request.get('/api/v1/me')).json(),root=`/api/v1/learners/${me.learners[0].id}`;
  const post=async(path:string,data:unknown)=>{const r=await page.request.post(root+path,{headers:{Origin:origin},data});expect(r.ok(),await r.text()).toBe(true);return r.json();};
  const catalog=await(await page.request.get('/api/v1/catalog')).json();
  let result=await post('/sessions',{requestId:randomUUID(),releaseId:catalog.releaseId,lessonId:'family',mode:'lesson',huntLayoutVersion:2});
  const event=async(data:Record<string,unknown>)=>{result=await post('/events',{clientEventId:randomUUID(),sessionId:result.session.id,expectedRevision:result.session.revision,...data});};
  while(!result.session.completed){if(result.session.presentation)await event({type:'answer',presentationId:result.session.presentation.id,selectedId:null,skipped:true});await event({type:'advance'});}
  const formal=result.progress;
  await choose(page);await page.evaluate(()=>location.hash='done');
  let loseResponse=true;
  await page.route('**/review-round',async route=>{
   if(loseResponse&&route.request().method()==='POST'){loseResponse=false;const response=await route.fetch();expect(response.ok()).toBe(true);await route.abort('failed');return;}
   await route.continue();
  });
  await page.getByRole('button',{name:'综合练习 · 新字和老朋友 →',exact:true}).click();
  await expect(page.locator('.cloud-status')).toContainText('未能确认云端保存');
  const committed=await(await page.request.get(root+'/review-round')).json();
  await page.reload();await page.getByRole('button',{name:'继续上次复习 · 第 1 / 2 题 →',exact:true}).click();
  await expect(page.getByText('老朋友 1 / 2',{exact:true})).toBeVisible();
  const round=async()=>await(await page.request.get(root+'/review-round')).json();
  const first=await round(),target=first.round.items[0].targetId;
  expect(first.round.id).toBe(committed.round.id);expect(first.round.items).toEqual(committed.round.items);
  const wrong=first.session.presentation.options.find((x:any)=>x.id!==target),correct=first.session.presentation.options.find((x:any)=>x.id===target);
  await page.getByRole('button',{name:wrong.word,exact:true}).click();await expect(page.locator('.feedback')).toContainText('换一个答案');
  await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  const options=await page.locator('.answer-grid button').allTextContents();
  await page.reload();await expect(page.locator('.answer-grid .chosen')).toHaveAttribute('aria-label',wrong.word);
  expect(await page.locator('.answer-grid button').allTextContents()).toEqual(options);
  expect((await round()).round.items).toEqual(first.round.items);
  await page.screenshot({path:'test-results/review-resume-cloud-refresh-320.png'});
  // New storage and IndexedDB, sharing only the authenticated family's cookie.
  other=await browser.newContext({baseURL:origin,viewport:{width:320,height:700},serviceWorkers:'block',storageState:{cookies:(await page.context().storageState()).cookies,origins:[]}});
  const second=await other.newPage();await configure(second);await second.goto('/#account');await choose(second);
  await second.getByRole('button',{name:'继续上次复习 · 第 1 / 2 题 →',exact:true}).click();
  await expect(second.locator('.answer-grid .chosen')).toHaveAttribute('aria-label',wrong.word);
  expect(await second.locator('.answer-grid button').allTextContents()).toEqual(options);
  await second.getByRole('button',{name:correct.word,exact:true}).click();await expect(second.getByText('老朋友 2 / 2',{exact:true})).toBeVisible();
  await second.screenshot({path:'test-results/review-resume-cloud-second-device-320.png'});
  await page.reload();await expect(page.getByText('老朋友 2 / 2',{exact:true})).toBeVisible();
  expect((await round()).round.items).toEqual(first.round.items);
  const progress=await(await page.request.get(root+'/progress')).json();expect(progress.sessions).toEqual(formal.sessions);expect(progress.activeSessionId).toBe(formal.activeSessionId);
  await second.getByRole('button',{name:'这次先跳过',exact:true}).click();
  await expect(second.getByRole('heading',{name:'回顾花园',exact:true})).toBeVisible();
  expect((await round()).round.closed).toBe(true);
  const exported=await(await page.request.get(root+'/export')).json();
  const roundSessions=exported.learners[0].sessions.filter((s:any)=>first.round.items.some((i:any)=>i.sessionId===s.id));
  expect(roundSessions).toHaveLength(2);expect(roundSessions.flatMap((s:any)=>s.presentations.flatMap((p:any)=>p.attempts))).toHaveLength(2);
 }finally{
  await other?.close();const removed=await page.request.delete('/api/v1/account',{headers:{Origin:origin},data:{requestId:randomUUID(),confirmation:email,password:'Cloud-learning-test-password'}});expect(removed.ok()).toBe(true);
 }
});
