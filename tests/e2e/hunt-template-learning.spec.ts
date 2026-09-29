import {test,expect} from '@playwright/test';
import {createHash} from 'node:crypto';
import {huntTemplates} from '@learnbuddy/contracts';
test.use({channel:'chrome',serviceWorkers:'block'});
// Read real lesson packages, substitute only scene content in the isolated browser.
// No content release, user account, or deployed learning data is changed.
for(const template of huntTemplates)for(const [lessonId,width] of [['family',393],['c019',320]] as const){
 test(`${template.id} ${lessonId}: targets, hints and saved rounds at ${width}px`,async({page,request})=>{
  await page.setViewportSize({width,height:568});
  if(process.env.TEST_LOCAL_NETWORK==='true')await page.addInitScript(()=>Object.defineProperty(Navigator.prototype,'onLine',{get:()=>true,configurable:true}));
  const catalog=await(await request.get('/api/v1/catalog')).json();
  const path=`/api/v1/releases/${catalog.releaseId}/lessons/${lessonId}`;
  const pkg=await(await request.get(path)).json(),lesson=pkg.lesson;
  const sha256=createHash('sha256').update(template.svg).digest('hex'),url=`/media/assets/images/${sha256}.svg`;
  const asset={id:`image-hunt-${template.id}`,kind:'image',sha256,bytes:Buffer.byteLength(template.svg),objectKey:`assets/images/${sha256}.svg`,url,mimeType:'image/svg+xml',source:'test',reviewStatus:'pending'};
  pkg.assets.push(asset);Object.assign(pkg.scene,{imageAssetId:asset.id,description:template.description,slots:template.slots});
  await page.route(`**${path}`,r=>r.fulfill({json:pkg}));
  await page.route(`**${url}`,r=>r.fulfill({body:template.svg,contentType:'image/svg+xml'}));
  await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
  if(lessonId!=='family'){
   await page.evaluate(id=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push(id);localStorage.setItem(key,JSON.stringify(p));},lessonId);
   await page.goto('/#home');await page.reload();await page.getByRole('button',{name:`开始${lesson.title}`,exact:true}).click();
  }
  const snapshot=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!));
  await expect.poll(async()=>(await snapshot()).huntRound?.sceneVersion).toBe(sha256);
  await page.evaluate(index=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.step=index;p.stepId='hunt';localStorage.setItem(key,JSON.stringify(p));},lesson.steps.findIndex((s:any)=>s.kind==='hunt'));
  await page.reload();await expect(page.locator('.hidden-character')).toHaveCount(lesson.characters.length);
  await expect(page.locator('.hunt-background')).toHaveAttribute('src',url);
  const before=await snapshot(),round=before.huntRound;
  await page.getByRole('button',{name:'给我一点提示',exact:false}).click();
  await expect(page.locator('.hunt-feedback')).toContainText(template.slots.find(s=>s.id===round.placements[0].slotId)!.clue);
  const boxes=await page.locator('.hidden-character').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const [i,a] of boxes.entries()){
   expect(a.w).toBeGreaterThanOrEqual(48);expect(a.h).toBeGreaterThanOrEqual(48);expect(a.x).toBeGreaterThanOrEqual(0);expect(a.x+a.w).toBeLessThanOrEqual(width);
   for(const b of boxes.slice(i+1))expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);
  }
  await page.screenshot({path:`test-results/${template.id}-${lessonId}-${width}.png`});
  await page.locator('.hidden-character').first().click();await page.reload();await expect(page.locator('.hidden-character.found')).toHaveCount(1);
  const after=await snapshot();expect(after.huntRound).toEqual(round);expect(after.attempts).toEqual(before.attempts);expect(after.seen).toEqual(before.seen);
 });
}
