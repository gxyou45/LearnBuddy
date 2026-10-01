import {test,expect,type Page} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {lessonInteractions} from '../../apps/web/src/interactionPilot';
import {strokeData} from '../../apps/web/src/strokeData';
import {sampleStroke} from '../../apps/web/src/traceGeometry';
const manifest=JSON.parse(readFileSync('apps/web/public/static-content/manifest.json','utf8'));
test.use({serviceWorkers:'block',viewport:{width:320,height:700}});
async function seek(page:Page,lessonId:string,step:string){
 await page.evaluate(({lessonId,step})=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  Object.assign(p,{activeLesson:lessonId,session:'all-'+lessonId,stepId:step,step:0,started:true,completed:false,huntFound:[]});
  delete p.huntRound;delete p.huntRoundIndex;
  localStorage.setItem(key,JSON.stringify(p));
 },{lessonId,step});
 await page.goto('./#lesson');await page.reload();
}
async function draw(page:Page,points:readonly (readonly [number,number])[]){
 const board=page.locator('.trace-board');await board.scrollIntoViewIfNeeded();
 const box=(await board.boundingBox())!;
 const at=(p:readonly [number,number])=>[box.x+p[0]/1024*box.width,box.y+p[1]/1024*box.height] as const;
 await page.mouse.move(...at(points[0]));await page.mouse.down();
 for(let i=1;i<points.length;i+=3)await page.mouse.move(...at(points[i]));
 await page.mouse.move(...at(points.at(-1)!));await page.mouse.up();
}
const saved=(page:Page)=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
for(const lesson of manifest.lessons)test(`${lesson.id}: two independent tracing records and ${lesson.characters.length*2}-step river`,async({page},testInfo)=>{
 test.setTimeout(90000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.locator('.activity-intro')).toBeVisible();
 const config=lessonInteractions.find(l=>l.lessonId===lesson.id)!;
 const before=(await saved(page)).attempts;
 for(const target of config.characters){
  await seek(page,lesson.id,`teach-${target.characterId}`);
  const trace=page.locator('.trace-character');
  await expect(trace).toContainText(`描一描 · ${target.text}`);await expect(trace).toHaveAttribute('data-stroke','0');
  await draw(page,sampleStroke(strokeData[target.text].medians[0]));
  await expect(trace).toHaveAttribute('data-stroke','1');await page.reload();await expect(trace).toHaveAttribute('data-stroke','1');
  expect((await saved(page)).attempts).toEqual(before);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.screenshot({path:testInfo.outputPath(`trace-${lesson.id}-${target.characterId}-320.png`)});
 }
 // Return to the first target after drawing the second; neither overwrites the other.
 await seek(page,lesson.id,`teach-${config.characters[0].characterId}`);
 await expect(page.locator('.trace-character')).toHaveAttribute('data-stroke','1');
 const quiz=lesson.steps.find((s:any)=>s.kind==='meaning');
 await seek(page,lesson.id,quiz.id);
 const river=page.locator('.river-journey');await expect(river).toHaveAttribute('data-total',String(lesson.characters.length*2));
 await expect(river).toHaveAttribute('data-solved','0');
 const target=lesson.characters.find((c:any)=>c.id===quiz.characterId),wrong=lesson.characters.find((c:any)=>c.word!==target.word);
 await page.locator('.answer-grid').getByRole('button',{name:wrong.word,exact:true}).click();
 await expect(page.locator('.feedback')).toContainText('换一个答案');await expect(river).toHaveAttribute('data-solved','0');
 await page.locator('.answer-grid').getByRole('button',{name:target.word,exact:true}).click();
 await expect.poll(async()=>(await saved(page)).stepId).not.toBe(quiz.id);
 await page.reload();await expect(river).toHaveAttribute('data-solved','1');
 expect((await saved(page)).attempts.find((a:any)=>a.step===quiz.id).correct).toBe(false);
 await page.getByRole('button',{name:'这次先跳过',exact:true}).click();await expect(river).toHaveAttribute('data-solved','1');
 await page.screenshot({path:testInfo.outputPath(`river-${lesson.id}-320.png`)});
 expect(errors).toEqual([]);
});
test('a five-character lesson finishes ten steps, keeps trace optional, and resets on replay',async({page},testInfo)=>{
 const lesson=manifest.lessons[10],config=lessonInteractions.find(l=>l.lessonId===lesson.id)!;
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.locator('.activity-intro')).toBeVisible();
 await seek(page,lesson.id,`teach-${config.characters[0].characterId}`);
 await page.emulateMedia({reducedMotion:'reduce'});
 await page.getByRole('button',{name:'看这一笔怎么走'}).click();await expect(page.locator('.trace-demo')).toHaveCSS('animation-name','none');
 await expect(page.getByRole('button',{name:'看这一笔怎么走'})).toBeEnabled();
 await expect(page.locator('.trace-character')).toHaveAttribute('data-stroke','0');
 for(const median of strokeData[config.characters[0].text].medians)await draw(page,sampleStroke(median));
 await expect(page.locator('.trace-character')).toContainText('汉字长出来啦');
 const quizzes=lesson.steps.filter((s:any)=>['sound','meaning'].includes(s.kind));
 await seek(page,lesson.id,quizzes.at(-1).id);
 await page.evaluate(steps=>{
  const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);
  p.attempts=steps.slice(0,-1).map((s:any,i:number)=>({id:'fixture-'+i,session:p.session,step:s.id,characterId:s.characterId,kind:s.kind,correct:true,hintUsed:false,skipped:false,selectedId:s.characterId,date:'2026-10-01',timestamp:1}));
  localStorage.setItem(key,JSON.stringify(p));
 },quizzes);
 await page.reload();await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','9');
 const target=lesson.characters.find((c:any)=>c.id===quizzes.at(-1).characterId);
 await page.locator('.answer-grid').getByRole('button',{name:target.word,exact:true}).click();
 await expect(page.locator('.river-journey.compact')).toContainText('到对岸');
 await page.reload();await expect(page.locator('.river-journey')).toHaveAttribute('data-solved','10');
 await page.screenshot({path:testInfo.outputPath('river-ten-complete-320.png')});
 await page.getByRole('button',{name:'和家长一起，先去读故事'}).click();await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
 await page.goto('./#home');await page.getByRole('button',{name:`重玩${lesson.title}`,exact:true}).click();
 // Advance normally to the first teach page in the new session.
 await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.trace-character')).toHaveAttribute('data-stroke','0');
 expect((await saved(page)).session).not.toBe('all-'+lesson.id);
});
test('stroke originals and licenses are served as actual files',async({request})=>{
 for(const file of ['NOTICE.txt','ARPHICPL.TXT','妈.json','一.json',lessonInteractions.at(-1)!.characters[1].text+'.json']){
  const response=await request.get('./strokes/'+file);expect(response.ok()).toBe(true);
  expect(response.headers()['content-type']).not.toContain('text/html');expect((await response.body()).length).toBeGreaterThan(50);
 }
});
test('new tracing target supports touch lift/resume and never completes from an endpoint tap',async({page},testInfo)=>{
 const target=lessonInteractions.find(l=>l.lessonId==='home')!.characters.find(c=>c.text!=='人')!;
 await page.goto('./');await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.locator('.activity-intro')).toBeVisible();
 await seek(page,'home',`teach-${target.characterId}`);
 const trace=page.locator('.trace-character'),board=page.locator('.trace-board');
 const points=sampleStroke(strokeData[target.text].medians[0]);await expect(trace).toHaveAttribute('data-stroke','0');
 const box=(await board.boundingBox())!,end=points.at(-1)!;
 await page.mouse.click(box.x+end[0]/1024*box.width,box.y+end[1]/1024*box.height);await expect(trace).toHaveAttribute('data-stroke','0');
 const cdp=await page.context().newCDPSession(page);
 const touch=async(type:'touchStart'|'touchMove'|'touchEnd',index:number)=>{
  const box=(await board.boundingBox())!,p=points[index];
  await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:type==='touchEnd'?[]:[{x:box.x+p[0]/1024*box.width,y:box.y+p[1]/1024*box.height}]});
 };
 const pause=Math.min(5,points.length-2);
 await touch('touchStart',0);for(let i=1;i<=pause;i++)await touch('touchMove',i);await touch('touchEnd',pause);
 const index=Number(await trace.getAttribute('data-point'));expect(index).toBeGreaterThan(0);
 await page.reload();await expect(trace).toHaveAttribute('data-point',String(index));await touch('touchStart',index);
 for(let i=index+1;i<points.length;i+=3)await touch('touchMove',i);
 await touch('touchMove',points.length-1);await touch('touchEnd',points.length-1);
 await expect(trace).toHaveAttribute('data-stroke','1');
 await page.screenshot({path:testInfo.outputPath('new-target-touch-320.png')});
 await page.getByRole('button',{name:'继续探索'}).click();
 await expect.poll(async()=>(await saved(page)).stepId).not.toBe(`teach-${target.characterId}`);
});
