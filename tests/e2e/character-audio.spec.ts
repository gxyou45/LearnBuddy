import { test, expect } from '@playwright/test';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
test.use({ channel: 'chrome',...(process.env.AUDIO_AUDIT_PROXY?{launchOptions:{proxy:{server:process.env.AUDIO_AUDIT_PROXY}}}:{}) });
const sha = (bytes: Buffer) => createHash('sha256').update(bytes).digest('hex');

test('头 plays a single-character WAV in recognition and listening, and 点头 only in words', async ({ page }) => {
  const manifest = JSON.parse(readFileSync('apps/web/public/static-content/manifest.json', 'utf8'));
  const wordHash = manifest.assets.find((a: { id: string }) => a.id === 'audio-word-han-5934').sha256;
  const singleHash = sha(readFileSync('apps/web/src/character-audio/5934.wav'));
  expect(singleHash).not.toBe(wordHash);
  await page.addInitScript(() => {
    const original = HTMLMediaElement.prototype.play;
    (window as any).__playedAudio = [];
    HTMLMediaElement.prototype.play = function() {
      (window as any).__playedAudio.push(this.src);return original.call(this);
    };
  });
  await page.goto('./');
  if(process.env.LEGACY_CACHE==='true'){
    const old=structuredClone(manifest);
    for(const lesson of old.lessons)for(const c of lesson.characters){
      const audio=old.assets.find((a:{id:string})=>a.id===`audio-${c.audio}`);
      const word=old.assets.find((a:{id:string})=>a.id===`audio-word-${c.id}`);
      Object.assign(audio,word,{id:audio.id});c.audioText=c.word;
    }
    await page.evaluate(async old=>{
      await navigator.serviceWorker.ready;
      for(const key of await caches.keys()){
        const cache=await caches.open(key);
        await cache.put(new URL('static-content/manifest.json',location.href),new Response(JSON.stringify(old),{headers:{'Content-Type':'application/json'}}));
      }
    },old);
    await page.reload();
  }
  await page.getByRole('button', { name: '开始今天的冒险' }).click();
  await expect(page.getByRole('button', { name: '准备好啦，出发' })).toBeVisible();
  await page.evaluate(() => {
    const key = 'learnbuddy:v1:progress';
    const progress = JSON.parse(localStorage.getItem(key)!);
    progress.unlocked.push('c009');
    localStorage.setItem(key, JSON.stringify(progress));
  });
  await page.goto('./#home');
  await page.reload();
  await page.getByRole('button', { name: '开始身体会说话', exact: true }).click();
  await page.getByRole('button', { name: '准备好啦，出发' }).click();
  async function checkPlayback(button: string, expectedHash: string) {
    await page.getByRole('button', { name: button, exact: false }).click();
    const src = await page.evaluate(() => (window as any).__playedAudio.at(-1));
    expect(src).toBeTruthy();
    const response = await page.evaluate(async url=>{
      const response=await fetch(url);return {ok:response.ok,bytes:Array.from(new Uint8Array(await response.arrayBuffer()))};
    },new URL(src,page.url()).href);
    expect(response.ok).toBe(true);
    expect(sha(Buffer.from(response.bytes))).toBe(expectedHash);
    await expect(page.getByText('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。')).toHaveCount(0);
  }
  await expect(page.locator('.hanzi')).toHaveText('头');
  await checkPlayback('听一听', singleHash);
  await expect(page.locator('.hanzi .is-read')).toHaveText('头');
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '继续探索' }).click();
  await expect(page.locator('.word-card h2')).toHaveText('点头');
  await checkPlayback('听词语', wordHash);
  for (let i = 0; i < 5; i++) await page.getByRole('button', { name: '读好了，继续' }).click();
  await checkPlayback('听听要找哪个字', singleHash);
  await expect(page.getByRole('heading', { name: '听声音，找汉字' })).toBeVisible();
});
