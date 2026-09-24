import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out=process.env.ACCEPTANCE_REPORT_DIR||'验收/2026-09-23-词义情境配图';
for(const word of ['我和你','他来','吃东西','力气','跳一跳','虽然'])test(`词义配图 ${word}`,async({page,request})=>{
 await mkdir(`${out}/截图`,{recursive:true});
 const catalog=await(await request.get('/api/v1/catalog')).json();
 // Match the actual published lesson, including the original first ten lessons.
 let lesson:any;
 for(const brief of catalog.lessons){
  if(brief.characters.some((c:any)=>c.word===word)){
   lesson=(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${brief.id}`)).json()).lesson;break;
  }
 }
 expect(lesson,`published lesson containing ${word}`).toBeTruthy();
 await page.goto('/');await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();await page.getByRole('switch',{name:'家长开放全部课程'}).click();await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'开始'+lesson.title,exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 const index=lesson.characters.findIndex((c:any)=>c.word===word);
 const kind=word==='力气'?'emoji':word==='虽然'?'context':'scene';
 for(let i=0;i<lesson.characters.length;i++){
  if(i===index){
   await expect(page.locator(`.teaching-card [data-visual-kind="${kind}"]`)).toBeVisible();
   if(kind==='scene')await expect(page.locator('.teaching-card svg')).toHaveAttribute('aria-label',new RegExp(word+'：'));
   if(kind==='emoji')await expect(page.locator('.teaching-card .word-visual')).toHaveText('💪');
   await page.screenshot({path:`${out}/截图/${word}-认字.png`});
  }
  await page.getByRole('button',{name:'继续探索'}).click();
 }
 for(let i=0;i<lesson.characters.length;i++){
  if(i===index){
   await expect(page.locator(`.word-card [data-visual-kind="${kind}"]`)).toBeVisible();
   await page.screenshot({path:`${out}/截图/${word}-词语.png`});
   await page.setViewportSize({width:320,height:568});
   await expect(page.getByRole('button',{name:'读好了，继续'})).toBeInViewport();
   expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
   await page.setViewportSize({width:393,height:851});
  }
  await page.getByRole('button',{name:'读好了，继续'}).click();
 }
});
