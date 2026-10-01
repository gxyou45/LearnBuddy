import {test,expect,type Page} from '@playwright/test';
import {resolve} from 'node:path';
import {interactionPilot} from '../../apps/web/src/interactionPilot';
import {strokeData} from '../../apps/web/src/strokeData';
import {sampleStroke} from '../../apps/web/src/traceGeometry';
test.use({channel:'chrome',serviceWorkers:'block',viewport:{width:320,height:700}});
test.beforeEach(async({page})=>{
 page.setDefaultTimeout(15000);
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',r=>{
  const p=new URL(r.request().url()).pathname;
  if(p==='/')return r.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(p.startsWith('/assets/'))return r.fulfill({path:resolve('apps/web/dist',p.slice(1))});
  if(p.startsWith('/static-content/')||p.startsWith('/strokes/'))return r.fulfill({path:resolve('apps/web/dist',p.slice(1))});
  return r.continue();
 });
});
const saved=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
async function seek(page:Page,lessonId:string,step:string){
 await page.evaluate(({lessonId,step})=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  Object.assign(p,{activeLesson:lessonId,session:'pilot-'+lessonId,stepId:step,step:0,started:true,completed:false,huntFound:[]});
  delete p.huntRound;delete p.huntRoundIndex;
  localStorage.setItem(key,JSON.stringify(p));
 },{lessonId,step});
 await page.goto('/#lesson');await page.reload();
}
for(const pilot of interactionPilot)test(`first-ten ${pilot.lessonId}: trace ${pilot.text}, persist, and advance the river honestly`,async({page,request})=>{
 test.setTimeout(90000);
 const catalog=await(await request.get('/api/v1/catalog')).json();
 const {lesson}=await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${pilot.lessonId}`)).json();
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 const step=lesson.steps.find((s:any)=>s.kind==='teach'&&s.characterId===pilot.characterId);
 await seek(page,pilot.lessonId,step.id);
 const board=page.locator('.trace-board'),trace=page.locator('.trace-character');
 await expect(trace).toHaveAttribute('data-stroke','0');
 // An endpoint tap is not a completed stroke.
 const tracks=strokeData[pilot.text].medians.map(m=>sampleStroke(m));
 const draw=async(points:readonly (readonly [number,number])[])=>{
  const box=(await board.boundingBox())!;const at=(p:readonly [number,number])=>[box.x+p[0]/1024*box.width,box.y+p[1]/1024*box.height] as const;
  await page.mouse.move(...at(points[0]));await page.mouse.down();
  for(let i=1;i<points.length;i+=3)await page.mouse.move(...at(points[i]));
  await page.mouse.move(...at(points.at(-1)!));await page.mouse.up();
 };
 const box=(await board.boundingBox())!,end=tracks[0].at(-1)!;
 await page.mouse.click(box.x+end[0]/1024*box.width,box.y+end[1]/1024*box.height);await expect(trace).toHaveAttribute('data-stroke','0');
 const before=await saved(page);
 await draw(tracks[0]);await expect(trace).toHaveAttribute('data-stroke','1');
 await page.reload();await expect(trace).toHaveAttribute('data-stroke','1');
 for(let i=1;i<tracks.length;i++){await draw(tracks[i]);await expect(trace).toHaveAttribute('data-stroke',String(i+1));}
 await expect(trace).toContainText('汉字长出来啦');expect((await saved(page)).attempts).toEqual(before.attempts);
 await page.screenshot({path:`test-results/trace-${pilot.lessonId}-320.png`});
 const quiz=lesson.steps.find((s:any)=>s.kind==='meaning');
 await seek(page,pilot.lessonId,quiz.id);const river=page.locator('.river-journey');
 await expect(river).toHaveAttribute('data-solved','0');
 const target=lesson.characters.find((c:any)=>c.id===quiz.characterId),wrong=lesson.characters.find((c:any)=>c.id!==quiz.characterId);
 await page.locator('.answer-grid').getByRole('button',{name:wrong.word,exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('换一个答案');await expect(river).toHaveAttribute('data-solved','0');
 await page.locator('.answer-grid').getByRole('button',{name:target.word,exact:true}).click();
 await expect(river).toHaveAttribute('data-solved','1');
 await expect.poll(async()=>(await saved(page)).stepId).not.toBe(quiz.id);
 await page.reload();await expect(river).toHaveAttribute('data-solved','1');
 expect((await saved(page)).attempts.find((a:any)=>a.step===quiz.id).correct).toBe(false);
 await page.getByRole('button',{name:'这次先跳过',exact:true}).click();
 await expect(river).toHaveAttribute('data-solved','1');
 await page.screenshot({path:`test-results/river-${pilot.lessonId}-320.png`});
});
test('lesson eleven now includes tracing and the ten-question river',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await seek(page,'c007','teach-han-4e00');await expect(page.locator('.trace-character')).toContainText('描一描 · 一');
 await seek(page,'c007','sound-han-4e00');await expect(page.locator('.river-journey')).toHaveAttribute('data-total','10');
});
test('touch tracing survives a lift and refresh; demonstration is not completion',async({page})=>{
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await seek(page,'home','teach-ren');
 const board=page.locator('.trace-board'),trace=page.locator('.trace-character');
 await page.getByRole('button',{name:'看这一笔怎么走'}).click();await expect(page.locator('.trace-demo')).toHaveCSS('animation-name','none');
 await expect(page.getByRole('button',{name:'看这一笔怎么走'})).toBeEnabled();
 await expect(trace).toHaveAttribute('data-stroke','0');
 const points=sampleStroke(strokeData['人'].medians[0]),cdp=await page.context().newCDPSession(page);
 const touch=async(type:'touchStart'|'touchMove'|'touchEnd',index:number)=>{
  const box=(await board.boundingBox())!,p=points[index];
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:box.x+p[0]/1024*box.width,y:box.y+p[1]/1024*box.height}]});
 };
 await touch('touchStart',0);
 for(let i=1;i<=9;i++)await touch('touchMove',i);
 await touch('touchEnd',9);
 const index=Number(await trace.getAttribute('data-point'));expect(index).toBeGreaterThan(0);
 await page.reload();await expect(trace).toHaveAttribute('data-point',String(index));
 await touch('touchStart',index);
 for(let i=index+1;i<points.length;i+=3)await touch('touchMove',i);
 await touch('touchMove',points.length-1);await touch('touchEnd',points.length-1);
 await expect(trace).toHaveAttribute('data-stroke','1');
 await page.getByRole('button',{name:'继续探索',exact:false}).click();
 await expect(page.getByRole('button',{name:'读好了，继续'})).toBeVisible();
});
test('finishing the final answer reaches the bank; replay starts a fresh journey',async({page,request})=>{
 const catalog=await(await request.get('/api/v1/catalog')).json();
 const {lesson}=await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/family`)).json();
 const quizzes=lesson.steps.filter((s:any)=>['sound','meaning'].includes(s.kind));
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await seek(page,'family',quizzes.at(-1).id);
 await page.evaluate(steps=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  p.attempts=steps.slice(0,-1).map((s:any,i:number)=>({id:'fixture-'+i,session:p.session,step:s.id,characterId:s.characterId,kind:s.kind,correct:true,hintUsed:false,skipped:false,selectedId:s.characterId,date:'2026-09-29',timestamp:1}));
  localStorage.setItem(key,JSON.stringify(p));
 },quizzes);
 await page.reload();await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','5');
 const target=lesson.characters.find((c:any)=>c.id===quizzes.at(-1).characterId);
 await page.locator('.answer-grid').getByRole('button',{name:target.word,exact:true}).click();
 await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','6');
 await expect(page.locator('.river-journey.compact')).toContainText('到对岸');
 await page.reload();await expect(page.locator('.river-journey.compact')).toHaveAttribute('data-solved','6');
 await page.getByRole('button',{name:'和家长一起，先去读故事'}).click();await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
 await page.goto('/#home');await page.getByRole('button',{name:'重玩认识家人',exact:true}).click();
 await page.evaluate(step=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.stepId=step;p.step=10;localStorage.setItem(key,JSON.stringify(p));
 },quizzes.find((s:any)=>s.kind==='meaning').id);
 await page.reload();await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','0');
});
