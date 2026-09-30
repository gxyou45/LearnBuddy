import {test,expect} from '@playwright/test';
import {randomUUID} from 'node:crypto';
import {resolve} from 'node:path';
import {verifiedAccount,login,choose} from './cloud-helpers';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:393,height:851}});
test('cloud correction keeps first wrong answer and advances after success',async({page,request})=>{
 test.setTimeout(180000);
 await page.addInitScript(()=>{
  const play=HTMLMediaElement.prototype.play;(window as any).__holdAudio=true;
  HTMLMediaElement.prototype.play=function(){
   (window as any).__audio=this;
   if((window as any).__holdAudio)return new Promise<void>(()=>{});
   return play.call(this);
  };
 });
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',r=>{
  const path=new URL(r.request().url()).pathname;
  if(path==='/')return r.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return r.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return r.continue();
 });
 const email=await verifiedAccount(request);await login(page,email);
 try{
  await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
  await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'继续探索'}).click();
  for(let i=0;i<3;i++)await page.getByRole('button',{name:'读好了，继续'}).click();
  const option=(text:string)=>page.locator('.answer-grid').getByRole('button',{name:text,exact:true});
  await expect(option('爸')).toBeEnabled();
  const top=await page.locator('.activity-top').boundingBox();
  let releaseBatch!:()=>void;
  const batchGate=new Promise<void>(resolve=>{releaseBatch=resolve;});
  let batchStarted=false;
  await page.route('**/events:batch',async route=>{batchStarted=true;await batchGate;await route.continue();});
  try{
   await option('爸').click();await expect(page.locator('.feedback')).toContainText('换一个答案');
   await expect.poll(()=>batchStarted).toBe(true);
   await expect(page.locator('.cloud-status')).toBeHidden();
   expect((await page.locator('.activity-top').boundingBox())!.y).toBe(top!.y);
  }finally{releaseBatch();}
  await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  await page.unroute('**/events:batch');
  expect((await page.locator('.activity-top').boundingBox())!.y).toBe(top!.y);
  await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','0');
  const me=await(await page.request.get('/api/v1/me')).json(),root=`/api/v1/learners/${me.learners[0].id}`;
  const progress=async()=>await(await page.request.get(root+'/progress')).json();
  const first=(await progress()).sessions[0];expect(first.presentation.answer.correct).toBe(false);expect(first.presentation.answer.selectedId).toBe('ba');
  expect(first.presentation.audioHeard).toBe(false);expect(first.presentation.answer.independent).toBe(false);
  await page.reload();await expect(page.locator('.feedback')).toContainText('换一个答案');
  await page.getByRole('button',{name:'听听要找哪个字'}).click();await expect(option('我')).toBeEnabled({timeout:20000});
  await option('我').click();await expect(page.locator('.feedback')).toContainText('重试后答对');
  await expect(page.locator('.activity-top')).toContainText('9/15');await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  const after=(await progress()).sessions[0];expect(after.stepIndex).toBe(8);
  expect(after.solvedSteps).toEqual(['sound-wo']);
  await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','1');
  await page.reload();await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','1');
  const mistakes=await(await page.request.get(root+'/mistakes')).json();
  // Answering before the recording finishes is allowed, but is not falsely
  // promoted to independent listening evidence (or an independent mistake).
  expect(mistakes.items.some((x:any)=>x.targetId==='wo')).toBe(false);
  await page.evaluate(()=>(window as any).__holdAudio=false);
  await page.getByRole('button',{name:'听听要找哪个字'}).click();
  await expect(page.getByText('听完啦，慢慢选，不着急。',{exact:true})).toBeVisible({timeout:20000});
  await expect(option('我')).toBeEnabled();
  await expect(page.locator('.cloud-status')).toBeHidden();
  await option('我').click();await expect(page.locator('.feedback')).toContainText('换一个答案');
  await expect(page.locator('.cloud-status')).toHaveText('已保存到云端');
  const heard=(await progress()).sessions[0].presentation;
  expect(heard.audioHeard).toBe(true);expect(heard.answer.independent).toBe(true);
  const heardMistakes=await(await page.request.get(root+'/mistakes')).json();
  expect(heardMistakes.items.find((x:any)=>x.targetId==='ba')?.wrongCount).toBe(1);
 }finally{
  const removed=await page.request.delete('/api/v1/account',{headers:{Origin:process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:8080'},data:{requestId:randomUUID(),confirmation:email,password:'Cloud-learning-test-password'}});
  expect(removed.ok(),'remove only this generated test account').toBe(true);
 }
});
