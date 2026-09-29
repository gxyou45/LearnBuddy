import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {huntTemplates} from '@learnbuddy/contracts';
test.use({channel:'chrome',serviceWorkers:'block'});
for(const [lessonId,width] of [['family',393],['c019',320]] as const)test(`v2 hunt ${lessonId}: decoys are harmless; saved scenes rotate on replay`,async({page,request})=>{
 test.setTimeout(90000);await page.setViewportSize({width,height:568});
 if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
 await page.addInitScript(()=>{const play=HTMLMediaElement.prototype.play;(window as any).__plays=0;HTMLMediaElement.prototype.play=function(){(window as any).__plays++;return play.call(this);};});
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 const catalog=await(await request.get('/api/v1/catalog')).json(),path=`/api/v1/releases/${catalog.releaseId}/lessons/${lessonId}`;
 const pkg=await(await request.get(path)).json(),lesson=pkg.lesson;
 pkg.scenePool=huntTemplates.map(t=>{
  const sha256=createHash('sha256').update(t.svg).digest('hex'),id=`image-hunt-${t.id}`,url=`/media/assets/images/${sha256}.svg`;
  pkg.assets.push({id,sha256,objectKey:`assets/images/${sha256}.svg`,url,kind:'image',mimeType:'image/svg+xml',bytes:Buffer.byteLength(t.svg),source:'test',reviewStatus:'pending'});
  return {id:t.id,imageAssetId:id,description:t.description,themeIds:[],slots:t.slots};
 });
 pkg.huntCandidates=catalog.lessons.flatMap((l:any)=>l.characters).slice(0,15);
 pkg.scene.play={sceneIds:pkg.scenePool.map((s:any)=>s.id),distractorIds:pkg.huntCandidates.map((c:any)=>c.id)};
 await page.route(`**${path}`,r=>r.fulfill({json:pkg}));
 for(const t of huntTemplates)await page.route(`**/media/assets/images/${createHash('sha256').update(t.svg).digest('hex')}.svg`,r=>r.fulfill({body:t.svg,contentType:'image/svg+xml'}));
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 if(lessonId!=='family'){
  await page.evaluate(id=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push(id);localStorage.setItem(key,JSON.stringify(p));},lessonId);
  await page.goto('/#home');await page.reload();await page.getByRole('button',{name:`开始${lesson.title}`,exact:true}).click();
 }
 const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
 await expect.poll(async()=>(await snapshot()).huntRound?.version).toBe(2);
 const seek=async()=>{await page.evaluate(index=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.step=index;p.stepId='hunt';localStorage.setItem(key,JSON.stringify(p));},lesson.steps.findIndex((s:any)=>s.kind==='hunt'));await page.reload();await expect(page.locator('.hunt-targets > span')).toHaveCount(3);};
 await seek();await expect(page.locator('.hidden-character')).toHaveCount(5);
 const before=await snapshot(),round=before.huntRound;
 const decoy=round.placements.find((p:any)=>!p.isTarget),text=pkg.huntCandidates.find((c:any)=>c.id===decoy.characterId).text;
 const plays=await page.evaluate(()=>(window as any).__plays);
 await page.getByRole('button',{name:`图中的${text}`,exact:true}).click();await expect(page.locator('.hunt-feedback')).toContainText('不是这次要找的');
 expect(await page.evaluate(()=>(window as any).__plays)).toBe(plays);
 const afterWrong=await snapshot();expect(afterWrong.huntFound).toEqual([]);expect(afterWrong.attempts).toEqual(before.attempts);expect(afterWrong.seen).toEqual(before.seen);
 await page.getByRole('button',{name:'给我一点提示',exact:false}).click();
 const target=round.placements.find((p:any)=>p.isTarget);const scene=pkg.scenePool.find((s:any)=>s.id===round.sceneId);
 await expect(page.locator('.hunt-feedback')).toContainText(scene.slots.find((s:any)=>s.id===target.slotId).clue);
 await page.getByRole('button',{name:`图中的${lesson.characters.find((c:any)=>c.id===target.characterId).text}`,exact:true}).click();
 await page.reload();await expect(page.locator('.hidden-character.found')).toHaveCount(1);expect((await snapshot()).huntRound).toEqual(round);
 await page.getByRole('button',{name:'和家长一起，先去读故事'}).click();await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
 await page.goto('/#home');await page.getByRole('button',{name:`重玩${lesson.title}`,exact:true}).click();
 await expect.poll(async()=>(await snapshot()).huntRound?.ordinal).toBe(1);await seek();
 const replay=await snapshot();expect(replay.huntRound.sceneId).not.toBe(round.sceneId);await expect(page.locator('.hidden-character')).toHaveCount(6);
 const boxes=await page.locator('.hidden-character').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
 for(const [i,a] of boxes.entries()){expect(a.w).toBeGreaterThanOrEqual(48);expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.w).toBeLessThanOrEqual(width);for(const b of boxes.slice(i+1))expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);}
 await page.screenshot({path:`test-results/hunt-play-${lessonId}-${width}.png`});
 for(const target of replay.huntRound.placements.filter((p:any)=>p.isTarget))await page.getByRole('button',{name:`图中的${lesson.characters.find((c:any)=>c.id===target.characterId).text}`,exact:true}).click();
 await expect(page.getByRole('button',{name:'都找到啦，去读故事'})).toBeVisible();expect((await snapshot()).huntFound).toHaveLength(3);
});
