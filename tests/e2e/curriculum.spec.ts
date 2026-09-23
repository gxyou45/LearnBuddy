import {test,expect} from '@playwright/test';
test.use({channel:'chrome'});
test('complete published catalog and every lesson package resolve their media',async({request})=>{
 test.setTimeout(180000);
 const catalog=await(await request.get('/api/v1/catalog')).json();
 test.skip(catalog.lessons.length<200,'Run after publishing the complete curriculum');
 expect(catalog.lessons).toHaveLength(204);
 const chars=catalog.lessons.flatMap((l:any)=>l.characters.map((c:any)=>c.text));expect(chars).toHaveLength(1000);expect(new Set(chars).size).toBe(1000);
 const pending=[...catalog.lessons];
 await Promise.all(Array.from({length:4},async()=>{while(pending.length){const l=pending.shift();const response=await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${l.id}`);expect(response.ok(),l.id).toBe(true);const p=await response.json();expect(p.lesson.characters.length).toBe(l.characters.length);expect(p.scene.slots.length).toBeGreaterThanOrEqual(l.characters.length);
 const audio=p.assets.find((a:any)=>a.id==='audio-'+p.lesson.story.audio);expect(audio.text).toBe(p.lesson.story.text);const wav=await request.get(audio.url,{headers:{Range:'bytes=0-43'}});expect(wav.status()).toBe(206);expect((await wav.body()).subarray(0,4).toString()).toBe('RIFF');
 const img=p.assets.find((a:any)=>a.id===p.lesson.imageAssetId);expect((await request.get(img.url)).ok()).toBe(true);
 }}));
});
test('five-character compound-word lesson completes without ambiguous options or overlapping hunt targets',async({page,request})=>{
 test.setTimeout(90000);
 const catalog=await(await request.get('/api/v1/catalog')).json();test.skip(catalog.lessons.length<200,'Full curriculum required');
 const lesson=(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/c090`)).json()).lesson;
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
 await page.evaluate(ids=>{const key='learnbuddy:v1:progress',p=JSON.parse(localStorage.getItem(key)!);p.unlocked=ids;localStorage.setItem(key,JSON.stringify(p));},catalog.lessons.map((l:any)=>l.id));
 await page.goto('/#home');await page.reload();await page.getByRole('button',{name:'开始'+lesson.title,exact:true}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(const c of lesson.characters){await expect(page.locator('.hanzi')).toHaveText(c.text);await page.getByRole('button',{name:'继续探索'}).click();}
 for(const c of lesson.characters){await expect(page.locator('.word-card h2')).toHaveText(c.word);await page.getByRole('button',{name:'读好了，继续'}).click();}
 for(const c of lesson.characters){await page.getByRole('button',{name:'听听要找哪个字'}).click();await page.getByRole('button',{name:c.text,exact:true}).click();await expect(page.locator('.feedback')).toContainText('找到啦');await page.getByRole('button',{name:'继续探索'}).click();}
 for(const c of lesson.characters){expect(await page.locator('.answer-grid button').count()).toBe(3);await page.getByRole('button',{name:c.word,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();}
 const positions=await page.locator('.hidden-character').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y].join(',');}));expect(new Set(positions).size).toBe(5);
 for(const c of lesson.characters)await page.getByRole('button',{name:'图中的'+c.text,exact:true}).click();
 await page.getByRole('button',{name:'都找到啦，去读故事'}).click();await expect(page.getByText(lesson.story.question,{exact:true})).toBeVisible();
 await page.getByRole('button',{name:'读完啦，去综合练习'}).click();await page.getByRole('button',{name:'综合练习 · 新字和老朋友'}).click();await expect(page.getByText('老朋友 1 / 2',{exact:true})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
test('last curriculum unit, stage review and the full mobile directory render',async({page,request})=>{
 const catalog=await(await request.get('/api/v1/catalog')).json();test.skip(catalog.lessons.length<200,'Full curriculum required');
 await page.setViewportSize({width:320,height:568});await page.goto('/');await expect(page.getByText('13 个主题 · 1000 个汉字 · 204 个共读单元')).toBeVisible();expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const p=await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/c200`)).json();expect(p.lesson.characters.map((c:any)=>c.text).join('')).toBe('展获奖留念');expect(p.lesson.reviewTasks.some((t:string)=>t.startsWith('阶段共读：'))).toBe(true);
 await page.screenshot({path:'test-results/curriculum-directory.png',fullPage:false});
});
