import { test, expect } from '@playwright/test';
test.use({channel:'chrome'});
test('a family completes the lesson, resumes progress, reads and resets',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:/一起认汉字，.*慢慢读世界。/})).toBeVisible();
  await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await page.getByRole('button',{name:'准备好啦，出发'}).click();
  await expect(page.locator('.hanzi')).toHaveText('我');
  await page.reload();
  await expect(page.locator('.hanzi')).toHaveText('我');
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'继续探索'}).click();
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'读好了，继续'}).click();
  for(const char of ['我','爸','妈']){
    await page.getByRole('button',{name:'听听要找哪个字'}).click();
    await page.getByRole('button',{name:char,exact:true}).click();
    await expect(page.getByRole('status')).toContainText('找到啦');
    await page.getByRole('button',{name:'继续探索'}).click();
  }
  for(const char of ['我自己','爸爸','妈妈']){
    await page.getByRole('button',{name:char,exact:true}).click();
    await page.getByRole('button',{name:'继续探索'}).click();
  }
  await expect(page.getByRole('heading',{name:'汉字藏在哪里？'})).toBeVisible();
  await page.getByRole('button',{name:'图中的我',exact:true}).click();
  await page.getByRole('button',{name:'图中的我',exact:true}).click();
  await expect(page.locator('.hunt-feedback')).toContainText('1 / 3');
  await page.reload();
  await expect(page.getByRole('button',{name:'图中的我',exact:true})).toHaveAttribute('aria-pressed','true');
  await expect(page.locator('.hunt-feedback')).toContainText('1 / 3');
  await page.getByRole('button',{name:'给我一点提示'}).click();
  await expect(page.locator('.hunt-feedback')).toContainText('木牌');
  await page.getByRole('button',{name:'图中的爸',exact:true}).click();
  await page.getByRole('button',{name:'图中的妈',exact:true}).click();
  await expect(page.locator('.hunt-feedback')).toContainText('3 / 3');
  expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!).attempts.length)).toBe(6);
  await page.getByRole('button',{name:'都找到啦，去读故事'}).click();
  await expect(page.getByRole('heading',{name:'爸爸妈妈和我一起看书。',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:'爸爸妈妈和我一起看书。'})).toBeVisible();
  await page.getByRole('button',{name:'听完整故事'}).click();
  await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
  await expect(page.getByRole('heading',{name:'今天，又长大一小步！'})).toBeVisible();
  await page.getByRole('button',{name:'打开我的小故事'}).click();
  await expect(page.getByRole('heading',{name:'爸爸妈妈和我一起看书。',exact:true})).toBeVisible();
  await expect(page.getByRole('img',{name:'爸爸妈妈和我一起看书。'})).toBeVisible();
  await page.getByRole('button',{name:'听完整故事'}).click();
  await page.getByRole('button',{name:'读完啦'}).click();
  await page.getByRole('button',{name:'家长',exact:false}).first().click();
  await page.getByRole('button',{name:'27',exact:true}).click();
  await expect(page.locator('.character-row').first()).toContainText('练习中');
  await page.getByRole('button',{name:'清除本机学习进度'}).click();
  await page.getByRole('button',{name:'确认清除'}).click();
  await expect(page.getByRole('button',{name:'开始今天的冒险'})).toBeVisible();
});
test('audio failure and incorrect answers allow assisted completion',async({page})=>{
  await page.route('**/*.wav',route=>route.abort());
  await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await page.getByRole('button',{name:'听一听',exact:false}).click();
  await expect(page.getByRole('status')).toContainText('暂时没播放');
  await page.getByRole('button',{name:'准备好啦，出发'}).click();
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'继续探索'}).click();
  for(let i=0;i<3;i++) await page.getByRole('button',{name:'读好了，继续'}).click();
  await page.getByRole('button',{name:'请家长帮一帮'}).click();
  await page.getByRole('button',{name:'爸',exact:true}).click();
  await expect(page.locator('.feedback')).toContainText('没关系');
  await page.getByRole('button',{name:'继续探索'}).click();
  await page.getByRole('button',{name:'这次先跳过'}).click();
  await expect(page.locator('.activity-top')).toContainText('10/15');
});
test('320px layout fits and corrupted storage is preserved',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await page.evaluate(()=>localStorage.setItem('learnbuddy:v1:progress','broken'));
  await page.reload();await expect(page.getByRole('status')).toContainText('原有进度');
  expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe('broken');
});

test('hidden-character game fits a narrow screen and supports leaving early',async({page})=>{
  await page.setViewportSize({width:320,height:740});await page.goto('/');
  await page.getByRole('button',{name:'开始今天的冒险'}).click();
  await page.evaluate(()=>{const key='learnbuddy:v1:progress';const p=JSON.parse(localStorage.getItem(key)!);p.step=13;p.stepId='hunt';localStorage.setItem(key,JSON.stringify(p));});
  await page.reload();
  await expect(page.getByRole('heading',{name:'汉字藏在哪里？'})).toBeVisible();
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  for(const button of await page.locator('.hidden-character').all()) { const box=await button.boundingBox();expect(box!.width).toBeGreaterThanOrEqual(48);expect(box!.height).toBeGreaterThanOrEqual(48); }
  await page.getByRole('button',{name:'和家长一起，先去读故事'}).click();
  await expect(page.getByRole('heading',{name:'读句子'})).toBeVisible();
});
