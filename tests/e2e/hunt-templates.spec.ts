import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {huntTemplates} from '@learnbuddy/contracts';
test.use({channel:'chrome',serviceWorkers:'block'});
const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
for(const width of [320,393])test(`scene templates preview, cancel, save and recover at ${width}px`,async({page})=>{
 test.setTimeout(90000);
 await page.setViewportSize({width,height:851});
 if(process.env.TEST_BUILT_WEB==='true')await page.route('**/*',route=>{
  const path=new URL(route.request().url()).pathname;
  if(path==='/'||path==='/admin')return route.fulfill({path:resolve('apps/web/dist/index.html'),contentType:'text/html'});
  if(path.startsWith('/assets/'))return route.fulfill({path:resolve('apps/web/dist',path.slice(1))});
  return route.continue();
 });
 let draft={id:'a1234567-1234-4123-8123-123456789012',baseReleaseId:manifest.releaseId,revision:1,manifest:structuredClone(manifest),publishedReleaseId:null};
 let templateCalls=0;
 await page.route('**/api/v1/admin/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname;
  if(path.endsWith('/content'))return route.fulfill({json:{channel:{releaseId:manifest.releaseId,revision:1},releases:[],drafts:[draft],audit:[]}});
  if(path.includes('/hunt-templates/')){
   templateCalls++;const t=huntTemplates.find(t=>path.endsWith(t.id))!,sha256=createHash('sha256').update(t.svg).digest('hex');
   return route.fulfill({json:{id:`image-hunt-${t.id}`,kind:'image',sha256,bytes:Buffer.byteLength(t.svg),objectKey:`assets/images/${sha256}.svg`,mimeType:'image/svg+xml',source:'test',reviewStatus:'pending'}});
  }
  if(path.endsWith('/validate'))return route.fulfill({json:{valid:true,revision:draft.revision}});
  if(path.includes('/media/')){
   const t=huntTemplates.find(t=>path.endsWith(createHash('sha256').update(t.svg).digest('hex')));
   if(t)return route.fulfill({body:t.svg,contentType:'image/svg+xml'});
   return route.fulfill({status:404});
  }
  if(req.method()==='PUT'){const body=req.postDataJSON();expect(body.revision).toBe(draft.revision);draft={...draft,manifest:body.manifest,revision:draft.revision+1};}
  return route.fulfill({json:draft});
 });
 await page.goto('/admin');await page.locator('.admin-draft').click();await page.getByRole('button',{name:'找字场景',exact:true}).click();
 const card=page.locator('.admin-editor > fieldset > .admin-card').first();
 await card.getByText('选用找字场景模板（6 幅）',{exact:true}).click();
 await expect(card.locator('.hunt-template-preview')).toHaveCount(6);
 for(const preview of await card.locator('.hunt-template-preview').all()){
  await expect(preview.locator('span')).toHaveCount(7);
  const boxes=await preview.locator('span').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
  for(const [i,a] of boxes.entries()){
   expect(a.w).toBeGreaterThanOrEqual(48);expect(a.h).toBeGreaterThanOrEqual(48);
   for(const b of boxes.slice(i+1))expect(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y).toBe(true);
  }
 }
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await card.screenshot({path:`test-results/hunt-templates-${width}.png`});
 page.once('dialog',d=>d.dismiss());await card.getByRole('button',{name:'选用温暖的客厅'}).click();expect(templateCalls).toBe(0);
 page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'选用温暖的客厅'}).click();
 await expect(page.getByRole('status')).toContainText('尚未发布');expect(templateCalls).toBe(1);
 await expect(page.getByRole('button',{name:'发布为当前版本'})).toBeDisabled();
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.getByRole('status')).toContainText('草稿已保存');
 expect(draft.manifest.huntScenes[0].slots).toHaveLength(7);expect(draft.manifest.lessons).toEqual(manifest.lessons);
 await page.reload();await page.locator('.admin-draft').click();await page.getByRole('button',{name:'校验并预览'}).click();
 await page.getByLabel('选择步骤').selectOption(String(manifest.lessons[0].steps.findIndex((s:any)=>s.kind==='hunt')));
 await expect(page.locator('.admin-preview .admin-scene span')).toHaveCount(3);
 await expect(page.locator('.admin-preview .admin-scene img')).toHaveAttribute('alt',huntTemplates[0].description);
 for(const t of huntTemplates.slice(2)){
  await page.getByRole('button',{name:'找字场景',exact:true}).click();
  await card.getByText('选用找字场景模板（6 幅）',{exact:true}).click();
  page.once('dialog',d=>d.accept());await card.getByRole('button',{name:`选用${t.title}`,exact:true}).click();
  await expect(page.getByRole('status')).toContainText('尚未发布');
  await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.getByRole('status')).toContainText('草稿已保存');
  expect(draft.manifest.huntScenes[0].imageAssetId).toBe(`image-hunt-${t.id}`);
  expect(draft.manifest.huntScenes[0].play).toBeUndefined();
  expect(draft.manifest.lessons).toEqual(manifest.lessons);
  await page.reload();await page.locator('.admin-draft').click();await page.getByRole('button',{name:'校验并预览'}).click();
  await page.getByLabel('选择步骤').selectOption(String(manifest.lessons[0].steps.findIndex((s:any)=>s.kind==='hunt')));
  await expect(page.locator('.admin-preview .admin-scene img')).toHaveAttribute('alt',t.description);
 }
 await page.getByRole('button',{name:'找字场景',exact:true}).click();
 page.once('dialog',d=>d.accept());await card.getByRole('button',{name:'启用客厅／厨房轮换玩法'}).click();
 await expect(page.getByRole('status')).toContainText('轮换玩法已加入草稿');
 await expect(card.getByLabel('干扰字候选 ID（逗号分隔，需审校）')).toBeVisible();
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.getByRole('status')).toContainText('草稿已保存');
 expect(draft.manifest.huntScenes[0].play.sceneIds).toHaveLength(2);
 await page.getByRole('button',{name:'校验并预览'}).click();await page.getByLabel('选择步骤').selectOption(String(manifest.lessons[0].steps.findIndex((s:any)=>s.kind==='hunt')));
 await expect(page.locator('.admin-preview .admin-scene span')).toHaveCount(5);
 await page.getByLabel('预览轮换场景').selectOption(draft.manifest.huntScenes[0].play.sceneIds[1]);
 await expect(page.locator('.admin-preview .admin-scene img')).toHaveAttribute('alt',huntTemplates[1].description);
});
