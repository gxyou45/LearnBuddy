import { test, expect } from '@playwright/test';
test.use({ channel: 'chrome' });

test('words and stories highlight progressively, finish and restart', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始今天的冒险' }).click();
  await page.getByRole('button', { name: '准备好啦，出发' }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '继续探索' }).click();
  await expect(page.getByRole('heading', { name: '读词语', exact: true })).toBeVisible();
  await page.screenshot({ path: 'test-results/word-stage.png', fullPage: true });
  await page.getByRole('button', { name: '听词语', exact: false }).click();
  await expect(page.locator('.word-card h2 .is-read').first()).toBeVisible();
  await expect(page.locator('.word-card h2 .is-read')).toHaveCount(3);
  await expect(page.locator('.word-card h2 .is-current')).toHaveCount(0);
  await page.evaluate(() => {
    const key = 'learnbuddy:v1:progress';
    const progress = JSON.parse(localStorage.getItem(key)!);
    progress.step = 14; delete progress.stepId;
    localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.reload();
  await page.getByRole('button', { name: '听完整故事' }).click();
  await expect(page.locator('.story-text .is-read').first()).toBeVisible();
  expect(await page.locator('.story-text .is-read').count()).toBeLessThan(11);
  await expect(page.locator('.story-text .is-read')).toHaveCount(11);
  await expect(page.locator('.story-text .is-current')).toHaveCount(0);
  await page.getByRole('button', { name: '听完整故事' }).click();
  expect(await page.locator('.story-text .is-read').count()).toBeLessThan(11);
  await page.getByRole('button', { name: '读完啦，去综合练习' }).click();
  await page.getByRole('button', { name: '打开我的小故事' }).click();
  await expect(page.locator('.reader .is-read')).toHaveCount(0);
  await page.getByRole('button', { name: '听完整故事' }).click();
  await expect(page.locator('.reader .is-read').first()).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('learnbuddy:v1:progress'));
  await page.getByRole('button', { name: '读词语', exact: true }).click();
  await expect(page.getByRole('heading', { name: '读词语', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '读完啦，回到故事' }).click();
  await expect(page.locator('.reader h1')).toHaveText('爸爸妈妈和我一起看书。');
  expect(await page.evaluate(() => localStorage.getItem('learnbuddy:v1:progress'))).toBe(saved);
});

test('legacy story progress can reopen words and return without modifying learning evidence', async ({ page }) => {
  await page.goto('/');
  await page.getByRole('button', { name: '开始今天的冒险' }).click();
  await page.evaluate(() => {
    const key = 'learnbuddy:v1:progress';
    const p = JSON.parse(localStorage.getItem(key)!);
    delete p.releaseId; delete p.stepId; p.contentVersion = 3; p.step = 11; p.huntFound = ['wo', 'ba', 'ma'];
    localStorage.setItem(key, JSON.stringify(p));
  });
  await page.reload();
  await expect(page.getByRole('heading', { name: '读句子', exact: true })).toBeVisible();
  const saved = await page.evaluate(() => localStorage.getItem('learnbuddy:v1:progress'));
  await page.getByRole('navigation', { name: '本课学习阶段' }).getByRole('button', { name: '读词语', exact: true }).click();
  await expect(page.getByRole('heading', { name: '读词语', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '爸爸', exact: true }).click();
  await expect(page.locator('.word-card h2')).toHaveText('爸爸');
  await page.getByRole('button', { name: '听词语' }).click();
  await expect(page.locator('.word-card .is-read').first()).toBeVisible();
  await page.reload();
  await expect(page.getByRole('heading', { name: '读词语', exact: true })).toBeVisible();
  await page.getByRole('button', { name: '读完啦，返回课程' }).click();
  await expect(page.getByRole('heading', { name: '读句子', exact: true })).toBeVisible();
  expect(await page.evaluate(() => localStorage.getItem('learnbuddy:v1:progress'))).toBe(saved);
  await page.setViewportSize({ width: 320, height: 740 });
  expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
});

test('unreached reading stages cannot be opened by guessing a URL', async ({ page }) => {
  await page.goto('/#practice/home/words/lesson');
  await expect(page.getByRole('heading', { name: '先认识这些字吧' })).toBeVisible();
  await expect(page.locator('.word-card')).toHaveCount(0);
});
