import {test,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {readFileSync} from 'node:fs';
const briefs=JSON.parse(readFileSync(new URL('../../apps/web/src/story-art/briefs.json',import.meta.url),'utf8'));
const out=process.env.ACCEPTANCE_REPORT_DIR ? `${process.env.ACCEPTANCE_REPORT_DIR}/截图` : '验收/2026-09-23-故事配图/截图';
for(const brief of briefs){test(`故事配图 ${brief.id} ${brief.title}`,async({page,request})=>{
 await mkdir(out,{recursive:true});
 const catalog=await(await request.get('/api/v1/catalog')).json();
 const lesson=(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${brief.id}`)).json()).lesson;
 expect(lesson.story.text).toBe(brief.story);
 await page.goto('/');await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();await page.getByRole('switch',{name:'家长开放全部课程'}).click();await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'开始'+lesson.title,exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(const c of lesson.characters)await page.getByRole('button',{name:'继续探索'}).click();
 for(const c of lesson.characters)await page.getByRole('button',{name:'读好了，继续'}).click();
 for(const c of lesson.characters){await page.getByRole('button',{name:'听听要找哪个字'}).click();await page.getByRole('button',{name:c.text,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
 for(const c of lesson.characters){await page.getByRole('button',{name:c.word,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
 for(const c of lesson.characters)await page.getByRole('button',{name:'图中的'+c.text,exact:true}).click();
 await page.getByRole('button',{name:'都找到啦，去读故事'}).click();
 const img=page.locator('img.story-art');await expect(img).toHaveAttribute('alt',brief.alt);await expect.poll(()=>img.evaluate((el:HTMLImageElement)=>el.complete&&el.naturalWidth>0)).toBe(true);
 await expect(page.locator('.story-text')).toHaveText(brief.story);await expect(page.getByRole('button',{name:'读完啦，去综合练习'})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 if(brief.id==='c090'){
  await page.evaluate(()=>navigator.serviceWorker.ready);
  await expect.poll(()=>page.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
  const src=await img.getAttribute('src');
  await expect.poll(()=>page.evaluate(async src=>!!await caches.match(src!),src)).toBe(true);
  await page.context().setOffline(true);
  expect(await page.evaluate(src=>new Promise<boolean>(resolve=>{const i=new Image();i.onload=()=>resolve(i.naturalWidth>0);i.onerror=()=>resolve(false);i.src=src!;}),src)).toBe(true);
  await page.context().setOffline(false);
 }
 await page.screenshot({path:`${out}/${brief.id}-phone.png`});
 await page.getByRole('button',{name:`放大查看《${brief.title}》故事插图`}).click();await expect(page.getByRole('dialog')).toBeVisible();
 await page.setViewportSize({width:1100,height:800});await page.screenshot({path:`${out}/${brief.id}-large.png`});
 await page.getByRole('button',{name:'关闭大图'}).click();await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.setViewportSize({width:320,height:568});await expect(page.getByRole('button',{name:'读完啦，去综合练习'})).toBeInViewport();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.getByRole('button',{name:`放大查看《${brief.title}》故事插图`}).click();await page.keyboard.press('Escape');await expect(page.getByRole('dialog')).toHaveCount(0);
 await page.getByRole('button',{name:'读完啦，去综合练习'}).click();await page.getByRole('button',{name:'打开我的小故事'}).click();await expect(page.locator('img.story-art')).toBeVisible();
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();await page.getByRole('button',{name:'我的书架',exact:true}).click();
 const book=page.getByRole('button',{name:'阅读'+brief.title,exact:true});await expect(book.locator('img.story-art')).toBeVisible();await expect(book.locator('button')).toHaveCount(0);
});}
