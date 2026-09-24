import {test,expect} from '@playwright/test';
import {mkdir} from 'node:fs/promises';
const out=process.env.ACCEPTANCE_REPORT_DIR ? `${process.env.ACCEPTANCE_REPORT_DIR}/截图` : '/tmp/learnbuddy-word-visuals';
test.use({channel:'chrome'});
for(const [id,kind,label] of [['c090','emoji','水果精确图标'],['c091','sketch','萝卜简笔画'],['c044','sketch','蜻蜓简笔画'],['c128','scene','因果情境配图']] as const){
 test(`whole-word illustrations: ${label}`,async({page,request})=>{
  test.setTimeout(90000);await mkdir(out,{recursive:true});
  const catalog=await(await request.get('/api/v1/catalog')).json();
  const lesson=(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${id}`)).json()).lesson;
  await page.goto('/');await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();await page.getByRole('switch',{name:'家长开放全部课程'}).click();await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
  await page.getByRole('button',{name:'开始'+lesson.title,exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
  await expect(page.locator(`.teaching-card [data-visual-kind="${kind}"]`)).toBeVisible();
  if(kind==='sketch')await expect(page.getByRole('img',{name:lesson.characters[0].word+'简笔画',exact:true})).toBeVisible();
  else if(kind==='scene')await expect(page.locator('.teaching-card .word-visual')).toHaveAttribute('aria-label',/因为下雨/);
  else await expect(page.locator('.teaching-card .word-visual')).toHaveText('🍌');
  await page.screenshot({path:`${out}/${id}-teach.png`});
  for(const c of lesson.characters)await page.getByRole('button',{name:'继续探索'}).click();
  await expect(page.locator(`.word-card [data-visual-kind="${kind}"]`)).toBeVisible();
  await page.screenshot({path:`${out}/${id}-word.png`});
  for(const c of lesson.characters)await page.getByRole('button',{name:'读好了，继续'}).click();
  for(const c of lesson.characters){await page.getByRole('button',{name:'听听要找哪个字'}).click();await page.getByRole('button',{name:c.text,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
  await expect(page.locator(`.answer-grid [data-visual-kind="${kind}"]`).first()).toBeVisible();
  if(id==='c090')expect((await page.locator('.answer-grid .word-visual').allTextContents()).sort()).toEqual(['🍌','🍇','🍊'].sort());
  await page.screenshot({path:`${out}/${id}-meaning.png`});
  for(const c of lesson.characters){await page.getByRole('button',{name:c.word,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
  for(const c of lesson.characters)await page.getByRole('button',{name:'图中的'+c.text,exact:true}).click();
  await page.getByRole('button',{name:'都找到啦，去读故事'}).click();
  if(['c090','c128'].includes(id))await expect(page.locator('img.story-art')).toBeVisible();
  else await expect(page.locator('.word-picture-card')).toHaveCount(new Set(lesson.characters.map((c:any)=>c.word)).size);
  await expect(page.locator('.word-picture img')).toHaveCount(0);
  await page.screenshot({path:`${out}/${id}-story.png`});
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.setViewportSize({width:320,height:568});await expect(page.getByRole('button',{name:'读完啦，去综合练习'})).toBeInViewport();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 });
}
