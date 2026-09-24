import {test,expect} from '@playwright/test';
test.use({channel:'chrome'});
for(const viewport of [{width:393,height:650},{width:320,height:568}]) {
 test(`lesson actions stay onscreen with browser toolbars (${viewport.width}x${viewport.height})`,async({page})=>{
  test.setTimeout(60000);
  await page.setViewportSize(viewport);
  await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
  for(let step=0;step<15;step++) {
   if(step>0){await page.evaluate(step=>{const key='learnbuddy:v1:progress';const p=JSON.parse(localStorage.getItem(key)!);p.step=step;delete p.stepId;localStorage.setItem(key,JSON.stringify(p));},step);await page.reload();}
   await expect(page.locator('.learning-actions button').first()).toBeVisible();
   const actions=page.locator('.learning-actions');
   const box=await actions.boundingBox();expect(box!.y).toBeGreaterThanOrEqual(0);expect(box!.y+box!.height).toBeLessThanOrEqual(viewport.height+1);
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   expect(await page.evaluate(()=>document.documentElement.scrollHeight<=innerHeight+1)).toBe(true);
   for(const button of await actions.locator('button').all()) {const b=await button.boundingBox();expect(b!.height).toBeGreaterThanOrEqual(48);}
   if(viewport.height===650&&step!==14){const overflow=await page.locator('.learning-shell>main').evaluate(el=>el.scrollHeight-el.clientHeight);expect(overflow,`step ${step} content fits`).toBeLessThanOrEqual(2);}
   if(step===7){await page.getByRole('button',{name:'请家长帮一帮'}).click();await page.getByRole('button',{name:'我',exact:true}).click();const b=await page.getByRole('button',{name:'继续探索'}).boundingBox();expect(b!.y+b!.height).toBeLessThanOrEqual(viewport.height);}
  }
  await page.screenshot({path:`test-results/compact-story-${viewport.width}.png`});
  await page.setViewportSize({width:viewport.width,height:420});
  const action=await page.locator('.learning-actions').boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(421);
  await page.locator('.learning-shell>main').evaluate(el=>{el.scrollTop=el.scrollHeight;});
  await expect(page.getByRole('button',{name:'听完整故事'})).toBeInViewport();
  await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
  await expect(page.getByRole('button',{name:'打开我的小故事'})).toBeInViewport();
  await page.getByRole('button',{name:'打开我的小故事'}).click();
  await expect(page.getByRole('button',{name:'读完啦 ✓',exact:true})).toBeInViewport();
  await page.getByRole('button',{name:'读词语',exact:true}).click();
  await expect(page.getByRole('button',{name:'下一个词语'})).toBeInViewport();
 });
}

test('legacy stories fit and expanded stage stories remain readable on compact screens',async({page,request})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width:393,height:650});
 const catalog=await (await request.get('/api/v1/catalog')).json();
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 for(const lesson of catalog.lessons.filter((l:any,i:number)=>i<10||/^c(020|040|060|080|100|120|140|160|164|180|200)$/.test(l.id))){
  await page.evaluate(id=>{const key='learnbuddy:v1:progress';const p=JSON.parse(localStorage.getItem(key)!);p.activeLesson=id;p.step=14;p.stepId='story';p.huntFound=[];localStorage.setItem(key,JSON.stringify(p));},lesson.id);
  await page.reload();await expect(page.locator('.story-text'),`lesson ${lesson.id} is ready`).toBeVisible({timeout:15000});
  const overflow=await page.locator('.learning-shell>main').evaluate(el=>el.scrollHeight-el.clientHeight);
  if(lesson.characters.length===3)expect(overflow,lesson.id).toBeLessThanOrEqual(2);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),lesson.id).toBe(true);
  const action=await page.locator('.learning-actions').boundingBox();expect(action!.y+action!.height).toBeLessThanOrEqual(651);
  if(lesson.characters.length===5){await page.locator('.learning-shell>main').evaluate(el=>{el.scrollTop=el.scrollHeight;});await expect(page.getByRole('heading',{name:'读懂了吗？'})).toBeVisible();}
 }
});
