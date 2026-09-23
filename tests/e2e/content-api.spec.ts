import {test,expect} from '@playwright/test';
test.use({channel:'chrome'});
const key='learnbuddy:v1:progress';
test('home loads a catalog, lessons load on demand, media comes from API URLs',async({page})=>{
 const requests:string[]=[];page.on('request',r=>requests.push(r.url()));
 await page.goto('/');await expect(page.getByRole('button',{name:'开始今天的冒险'})).toBeVisible();
 expect(requests.some(u=>u.includes('/api/v1/catalog'))).toBe(true);
 expect(requests.some(u=>u.includes('/releases/')&&u.includes('/lessons/'))).toBe(false);
 await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
 expect(requests.filter(u=>u.includes('/releases/')&&u.includes('/lessons/'))).toHaveLength(1);
 await page.getByRole('button',{name:'听一听',exact:false}).click();
 await expect.poll(()=>requests.some(u=>u.includes('/media/assets/audio/'))).toBe(true);
 expect(requests.some(u=>/\/assets\/audio\/[^/]+\.wav/.test(u)&&!u.includes('/media/'))).toBe(false);
 const saved=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)!),key);const catalog=await(await page.request.get('/api/v1/catalog')).json();expect(saved.releaseId).toBe(catalog.releaseId);expect(saved.stepId).toBe('intro');
});
test('catalog outage preserves raw progress and retry restores the same word step',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(let i=0;i<3;i++)await page.getByRole('button',{name:'继续探索'}).click();
 await expect(page.locator('.word-card')).toBeVisible();
 const saved=await page.evaluate(key=>localStorage.getItem(key),key);
 await page.route('**/api/v1/catalog*',r=>r.fulfill({status:503,body:'{}'}));await page.reload();
 await expect(page.getByRole('button',{name:'重新加载课程'})).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(key),key)).toBe(saved);
 await page.unroute('**/api/v1/catalog*');await page.getByRole('button',{name:'重新加载课程'}).click();
 await expect(page.locator('.word-card h2')).toHaveText('我自己');
});
test('lesson failure offers retry and does not fall back to bundled content',async({page})=>{
 await page.goto('/');await page.route('**/api/v1/releases/*/lessons/family',r=>r.fulfill({status:503,body:'{}'}));
 await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'重新加载课程'})).toBeVisible();
 await expect(page.getByRole('button',{name:'准备好啦，出发'})).toHaveCount(0);
 await page.unroute('**/api/v1/releases/*/lessons/family');await page.getByRole('button',{name:'重新加载课程'}).click();
 await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
});
test('legacy storage is backed up and API text is rendered without a frontend rebuild',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 const original=await page.evaluate(key=>{const p=JSON.parse(localStorage.getItem(key)!);delete p.releaseId;delete p.stepId;p.contentVersion=3;p.step=11;const raw=JSON.stringify(p);localStorage.setItem(key,raw);localStorage.removeItem(`${key}:before-api`);return raw;},key);
 await page.route('**/api/v1/releases/*/lessons/family',async route=>{const response=await route.fetch();const data=await response.json();data.lesson.story.note='来自 API 的陪读说明';await route.fulfill({response,json:data});});
 await page.reload();await expect(page.getByRole('heading',{name:'读句子',exact:true})).toBeVisible();await expect(page.getByText('来自 API 的陪读说明',{exact:false})).toBeVisible();
 expect(await page.evaluate(key=>localStorage.getItem(`${key}:before-api`),key)).toBe(original);
 await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();await page.getByRole('button',{name:'清除本机学习进度'}).click();await page.getByRole('button',{name:'确认清除'}).click();
 expect(await page.evaluate(key=>localStorage.getItem(`${key}:before-api`),key)).toBe(null);
});
test('loaded lesson survives API loss and missing illustration permits assisted reading',async({page})=>{
 await page.route('**/media/assets/images/*.svg',r=>r.abort());
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 await expect(page.getByText('图片暂时未加载，可以继续陪读。',{exact:false})).toBeVisible();
 await page.route('**/api/**',r=>r.abort());
 await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
 await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');
});
