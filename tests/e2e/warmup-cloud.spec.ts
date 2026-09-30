import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test('cloud warmup invitation resumes an existing fixed round without replacing its destination or evidence',async({page,request})=>{
 test.setTimeout(180000);
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 const email=await verifiedAccount(request);await login(page,email);
 const origin=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:8080';
 try{
  await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();
  await expect(page.getByRole('button',{name:'用小云的档案学习'})).toBeVisible();
  const me=await(await page.request.get('/api/v1/me')).json(),root=`/api/v1/learners/${me.learners[0].id}`;
  const post=async(path:string,data:unknown)=>{const r=await page.request.post(root+path,{headers:{Origin:origin},data});expect(r.ok(),await r.text()).toBe(true);return r.json();};
  const catalog=await(await page.request.get('/api/v1/catalog')).json();
  let result=await post('/sessions',{requestId:randomUUID(),releaseId:catalog.releaseId,lessonId:'family',mode:'lesson',huntLayoutVersion:2});
  const items:Record<string,unknown>[]=[];
  const event=async(data:Record<string,unknown>)=>{result=await post('/events',{clientEventId:randomUUID(),sessionId:result.session.id,expectedRevision:result.session.revision,...data});};
  // Only this disposable child receives fixture attempts. No production DB edits or clock changes.
  while(!result.session.completed){
   const s=result.session;
   if(s.presentation){
    if(s.stepId.startsWith('meaning-'))items.push({targetId:s.stepId.slice(8),kind:'meaning',dueDate:'2000-01-01',lessonId:s.lessonId,releaseId:s.releaseId,questionVersionId:s.presentation.questionVersionId,ruleVersion:3});
    await event({type:'answer',presentationId:s.presentation.id,selectedId:null,skipped:true});
   }
   await event({type:'advance'});
  }
  const before=result.progress;
  // Fixed-round selection is now server-authoritative. An already-open comprehensive
  // round must win over another entry point, even when the warmup invitation is visible.
  const fixed=await post('/review-round',{requestId:randomUUID(),entry:'comprehensive',lessonId:'family'});
  const target=fixed.round.items[0].targetId;
  const wrong=fixed.session.presentation.options.find((o:any)=>o.id!==target).word;
  const correct=fixed.session.presentation.options.find((o:any)=>o.id===target).word;
  // Only the invitation's due queue is simulated. The round and all events are real.
  await page.route('**/reviews',route=>route.fulfill({json:{today:'2000-01-01',timeZone:'Asia/Shanghai',items}}));
  const queue=page.waitForResponse(r=>r.url().endsWith('/reviews'));
  await choose(page);await queue;
  await page.getByRole('button',{name:'回顾花园',exact:true}).click();
  await expect(page.getByText('3 个老朋友想见你',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'汉字小屋',exact:true}).click();
  await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await expect(page.locator('.warmup-invitation')).toBeVisible();
  await page.getByRole('button',{name:'继续上次复习 →',exact:true}).click();
  await expect(page.getByText('老朋友 1 / 2',{exact:true})).toBeVisible();
  const progress=async()=>await(await page.request.get(root+'/progress')).json();
  expect((await progress()).activeSessionId).toBe(before.activeSessionId);
  await page.getByRole('button',{name:wrong,exact:true}).click();await expect(page.locator('.feedback')).toContainText('换一个答案');
  await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  await page.screenshot({path:'test-results/warmup-cloud-correction-320.png'});
  expect((await progress()).sessions).toEqual(before.sessions);
  await page.getByRole('button',{name:correct,exact:true}).click();
  await expect(page.getByText('老朋友 2 / 2',{exact:true})).toBeVisible();
  await page.getByRole('button',{name:'这次先跳过',exact:true}).click();
  await expect(page.getByRole('heading',{name:'回顾花园',exact:true})).toBeVisible();
  const closed=await(await page.request.get(root+'/review-round')).json();
  expect(closed.round.id).toBe(fixed.round.id);expect(closed.round.closed).toBe(true);
  expect((await progress()).sessions).toEqual(before.sessions);
  expect((await progress()).completedLessons).toEqual(['family']);
 }finally{
  const r=await page.request.delete('/api/v1/account',{headers:{Origin:origin},data:{requestId:randomUUID(),confirmation:email,password:'Cloud-learning-test-password'}});
  expect(r.ok(),'remove only the generated fixture account').toBe(true);
 }
});
