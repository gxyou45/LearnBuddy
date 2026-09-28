import {test,expect} from '@playwright/test';
import {resolve} from 'node:path';
test.use({channel:'chrome',serviceWorkers:'block'});

for(const [lessonId,group] of [['c019',['他','她','它']],['c155',['秘','密']]] as const){
 test(`${lessonId}: homophones never compete in single-character listening`,async({page,request})=>{
  // Preview a newly built client against the running API without deploying it.
  if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',async route=>{
   const path=new URL(route.request().url()).pathname;
   if(path==='/'||path==='/index.html')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
   if(path.startsWith('/assets/')&&!path.includes('..'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
   return route.continue();
  });
  const catalog=await(await request.get('/api/v1/catalog')).json();
  const lesson=(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${lessonId}`)).json()).lesson;
  await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
  await page.evaluate(id=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked.push(id);localStorage.setItem(key,JSON.stringify(p));},lessonId);
  await page.goto('/#home');await page.reload();
  await page.getByRole('button',{name:`开始${lesson.title}`,exact:true}).click();
  await page.getByRole('button',{name:'准备好啦，出发'}).click();
  for(const _ of lesson.characters)await page.getByRole('button',{name:'继续探索'}).click();
  for(const _ of lesson.characters)await page.getByRole('button',{name:'读好了，继续'}).click();
  for(const c of lesson.characters){
   const buttons=page.locator('.answer-grid button');
   const texts=await buttons.allTextContents();
   expect(texts).toContain(c.text);expect(texts.length).toBeGreaterThanOrEqual(2);
   if((group as readonly string[]).includes(c.text))expect(texts.filter(text=>(group as readonly string[]).includes(text))).toEqual([c.text]);
   await page.getByRole('button',{name:'听听要找哪个字'}).click();
   await buttons.filter({hasText:new RegExp(`^${c.text}$`)}).click();
   await expect(page.locator('.feedback')).toContainText('找到啦');
   await page.getByRole('button',{name:'继续探索'}).click();
  }
 });
}
