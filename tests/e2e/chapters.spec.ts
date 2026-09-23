import { test, expect } from '@playwright/test';
import { lessons } from '../../apps/web/src/content';
test.use({channel:'chrome'});
test('all ten chapters unlock, teach the right characters, finish their hunts and open matching stories',async({page,request})=>{
 test.setTimeout(180000);
 const total=(await (await request.get('/api/v1/catalog')).json()).lessons.length;
 await page.goto('/');
 for(const [index,lesson] of lessons.entries()){
  await page.getByRole('button',{name:`开始${lesson.title}`,exact:true}).click();
  await expect(page.getByRole('heading',{name:lesson.intro,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'准备好啦，出发'}).click();
  for(const c of lesson.characters){await expect(page.locator('.hanzi')).toHaveText(c.text);await page.getByRole('button',{name:'继续探索'}).click();}
  for(const c of lesson.characters){await expect(page.locator('.word-card h2')).toHaveText(c.word);await page.getByRole('button',{name:'读好了，继续'}).click();}
  for(const c of lesson.characters){await page.getByRole('button',{name:'听听要找哪个字'}).click();await page.getByRole('button',{name:c.text,exact:true}).click();await expect(page.locator('.feedback')).toContainText('找到啦');await page.getByRole('button',{name:'继续探索'}).click();}
  for(const c of lesson.characters){await page.getByRole('button',{name:c.word,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
  await expect(page.locator('.hunt-targets')).toContainText(lesson.characters[0].text);
  for(const c of lesson.characters) await page.getByRole('button',{name:`图中的${c.text}`,exact:true}).click();
  await page.getByRole('button',{name:'都找到啦，去读故事'}).click();
  await expect(page.getByRole('heading',{name:lesson.story.text,exact:true})).toBeVisible();
  await expect(page.locator('.sentence-picture')).toBeVisible();
  await page.getByRole('button',{name:'听完整故事'}).click();
  await expect(page.locator('.notice')).toHaveCount(0);
  await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
  await page.getByRole('button',{name:'打开我的小故事'}).click();
  await expect(page.getByRole('heading',{name:lesson.story.text,exact:true})).toBeVisible();
  await page.reload();await expect(page.getByRole('heading',{name:lesson.story.text,exact:true})).toBeVisible();
  await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
  await expect(page.locator('.section-title')).toContainText(`${index+1} / ${total}`);
 }
 await page.getByRole('button',{name:'我的书架',exact:true}).click();
 await expect(page.locator('.book:enabled')).toHaveCount(10);
});
test('parent access and switching keep independent lesson progress',async({page,request})=>{
 const total=(await (await request.get('/api/v1/catalog')).json()).lessons.length;
 await page.goto('/');await expect(page.getByRole('button',{name:'一起回家，完成上一课后开启'})).toBeDisabled();
 await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();
 await page.getByRole('switch',{name:'家长开放全部课程'}).click();
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'开始一起回家',exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 await expect(page.locator('.hanzi')).toHaveText('家');await page.getByRole('button',{name:'继续探索'}).click();
 await page.getByRole('button',{name:'回小屋',exact:false}).last().click();
 await page.getByRole('button',{name:'开始认识家人',exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 await expect(page.locator('.hanzi')).toHaveText('我');await page.getByRole('button',{name:'回小屋',exact:false}).last().click();
 await page.getByRole('button',{name:'开始一起回家',exact:true}).click();await page.reload();await expect(page.locator('.hanzi')).toHaveText('门');
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();await expect(page.locator('.section-title')).toContainText(`0 / ${total}`);
});
