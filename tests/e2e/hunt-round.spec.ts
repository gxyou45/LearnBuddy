import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block'});

for(const [lessonId,width,height] of [['family',320,568],['c019',393,851],['c019',320,568],['c032',320,568],['c032',393,851]] as const){
 test(`${lessonId} ${width}: saved hunt survives reload and replay moves every target`,async({page,request})=>{
  await page.setViewportSize({width,height});
  if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
   if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
   return route.continue();
  });
  const catalog=await(await request.get('/api/v1/catalog')).json();
  const pkg=await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${lessonId}`)).json(),lesson=pkg.lesson;
  await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
  if(lessonId!=='family'){
   await page.evaluate(id=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push(id);localStorage.setItem(key,JSON.stringify(p));},lessonId);
   await page.goto('/#home');await page.reload();await page.getByRole('button',{name:`开始${lesson.title}`,exact:true}).click();
  }
  await expect.poll(()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).huntRound)).toBeTruthy();
  const seekHunt=async()=>{
   await page.evaluate(index=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.step=index;p.stepId='hunt';localStorage.setItem(key,JSON.stringify(p));},lesson.steps.findIndex((s:any)=>s.kind==='hunt'));
   await page.reload();await expect(page.locator('.hidden-character')).toHaveCount(lesson.characters.length);
  };
  await seekHunt();
  if(lessonId!=='family'){
   await expect(page.locator('svg[data-plain-garden]')).toHaveCount(1);
   await expect(page.locator('svg[data-plain-garden] rect')).toHaveCount(1);
   await expect(page.locator('svg[data-plain-garden] rect')).toHaveAttribute('width','600');
  }
  const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
  const before=await snapshot(),round=before.huntRound;
  await page.getByRole('button',{name:'给我一点提示',exact:false}).click();
  const first=round.placements[0],clue=pkg.scene.slots.find((s:any)=>s.id===first.slotId).clue;
  await expect(page.locator('.hunt-feedback')).toContainText(lessonId==='family'?clue:clue.replaceAll('字牌','汉字'));
  const boxes=await page.locator('.hidden-character').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,width:r.width,height:r.height};}));
  for(const [i,a] of boxes.entries()){
   expect(a.width).toBeGreaterThanOrEqual(48);expect(a.height).toBeGreaterThanOrEqual(48);expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.width).toBeLessThanOrEqual(width);
   for(const b of boxes.slice(i+1))expect(a.x+a.width<=b.x||b.x+b.width<=a.x||a.y+a.height<=b.y||b.y+b.height<=a.y).toBe(true);
  }
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.getByRole('button',{name:`图中的${lesson.characters[0].text}`,exact:true}).click();
  await page.getByRole('button',{name:`图中的${lesson.characters[0].text}`,exact:true}).click();
  await page.reload();await expect(page.locator('.hidden-character.found')).toHaveCount(1);
  const saved=await snapshot();expect(saved.huntRound).toEqual(round);expect(saved.huntFound).toEqual([lesson.characters[0].id]);expect(saved.attempts).toEqual(before.attempts);expect(saved.seen).toEqual(before.seen);
  if(lessonId==='family'){
   await page.evaluate(()=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);delete p.huntRound;delete p.huntRoundIndex;localStorage.setItem(key,JSON.stringify(p));});
   await page.reload();await expect(page.locator('.hunt-scene')).toHaveAttribute('data-round','legacy');await expect(page.locator('.hidden-character.found')).toHaveCount(1);
  }
  await page.getByRole('button',{name:'和家长一起，先去读故事'}).click();await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
  await page.goto('/#home');await page.getByRole('button',{name:`重玩${lesson.title}`,exact:true}).click();
  await expect.poll(async()=> (await snapshot()).huntRound?.ordinal).toBe(round.ordinal+1);
  await seekHunt();
  const replay=await snapshot();expect(replay.huntFound).toEqual([]);expect(replay.huntRound.placements.every((p:any,i:number)=>p.slotId!==round.placements[i].slotId)).toBe(true);
 });
}
