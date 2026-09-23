import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
test.use({channel:'chrome'});
const manifest=JSON.parse(readFileSync('content/manifest.json','utf8'));
const draftId='a1234567-1234-4123-8123-123456789012';
// UI behavior is isolated from live content. Real auth/transactions run in publishing.test.mjs.
test('admin editing, preview, publishing and rollback at phone width',async({page})=>{
 let draft:any;let channel={releaseId:manifest.releaseId,revision:1};let published=false;
 await page.route('**/api/v1/admin/**',async route=>{
  const req=route.request(),path=new URL(req.url()).pathname,body=req.method()==='GET'?null:req.postDataJSON();
  let data:any={};
  if(path.endsWith('/content'))data={channel,releases:[{id:manifest.releaseId,createdAt:new Date().toISOString()},...(published?[{id:'release-test',createdAt:new Date().toISOString()}]:[])],drafts:draft?[draft]:[],audit:[]};
  else if(path.endsWith('/drafts')){draft={id:draftId,baseReleaseId:manifest.releaseId,revision:1,manifest:structuredClone(manifest),publishedReleaseId:null};data=draft;}
  else if(path.endsWith('/validate'))data={valid:true,revision:draft.revision};
  else if(path.endsWith(`/drafts/${draftId}`)) {if(req.method()==='PUT'){expect(body.revision).toBe(draft.revision);draft={...draft,manifest:body.manifest,revision:draft.revision+1};}data=draft;}
  else if(path.endsWith('/releases')){expect(body.revision).toBe(draft.revision);expect(body.channelRevision).toBe(channel.revision);published=true;draft.publishedReleaseId='release-test';channel={releaseId:'release-test',revision:2};data={releaseId:'release-test'};}
  else if(path.endsWith('/activate')){channel={releaseId:manifest.releaseId,revision:3};data={releaseId:manifest.releaseId};}
  else if(path.includes('/media/')){const hash=path.split('/').at(-1);const a=manifest.assets.find((a:any)=>a.sha256===hash);if(a){await route.fulfill({contentType:a.mimeType,body:readFileSync('content/files/'+a.objectKey)});return;}}
  await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
 });
 page.on('dialog',dialog=>dialog.accept());
 await page.goto('/admin');await expect(page.getByRole('heading',{name:'课程管理与发布'})).toBeVisible();
 await page.getByRole('button',{name:'新建草稿',exact:true}).click();
 await page.getByLabel('课程名称').fill('认识家人新标题');await expect(page.getByRole('button',{name:'发布为当前版本'})).toBeDisabled();
 await page.getByRole('button',{name:'保存草稿',exact:true}).click();await expect(page.getByRole('status')).toContainText('草稿已保存');
 await page.getByRole('button',{name:'校验并预览'}).click();await expect(page.getByRole('heading',{name:'课程预览 · 认识家人新标题'})).toBeVisible();
 await page.getByLabel('选择步骤').selectOption('14');await expect(page.locator('.admin-reading')).toHaveText(manifest.lessons[0].story.text);
 await expect(page.locator('.admin-preview audio')).toHaveAttribute('src',/\/api\/v1\/admin\/media\//);
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 await page.screenshot({path:'test-results/admin-preview.png',fullPage:true});
 await page.getByRole('button',{name:'发布为当前版本'}).click();await expect(page.getByRole('status')).toContainText('已发布：release-test');
 await page.getByText('版本历史与回滚',{exact:true}).click();await page.getByRole('button',{name:'启用此版本',exact:true}).click();await expect(page.getByRole('status')).toContainText('当前版本已切换');
});
test('admin access failure and save conflict preserve unsaved text',async({page})=>{
 let allowed=false;
 await page.route('**/api/v1/admin/**',route=>{
  const path=new URL(route.request().url()).pathname;
  if(!allowed)return route.fulfill({status:403,json:{error:{message:'需要内容管理员权限'}}});
  if(path.endsWith('/content'))return route.fulfill({json:{channel:{releaseId:manifest.releaseId,revision:1},releases:[],drafts:[],audit:[]}});
  if(path.endsWith('/drafts'))return route.fulfill({json:{id:draftId,baseReleaseId:manifest.releaseId,revision:1,manifest,publishedReleaseId:null}});
  return route.fulfill({status:409,json:{error:{message:'内容已被其他操作修改，请重新加载后再试'}}});
 });
 await page.goto('/admin');await expect(page.getByRole('alert')).toContainText('需要内容管理员权限');await expect(page.getByRole('link',{name:'前往家长账户登录'})).toBeVisible();
 allowed=true;await page.getByRole('button',{name:'重新检查权限'}).click();await page.getByRole('button',{name:'新建草稿',exact:true}).click();
 await page.getByLabel('故事文字').fill('保留我的未保存故事');await page.getByRole('button',{name:'保存草稿',exact:true}).click();
 await expect(page.getByRole('alert')).toContainText('重新加载');await expect(page.getByLabel('故事文字')).toHaveValue('保留我的未保存故事');await expect(page.getByRole('button',{name:'发布为当前版本'})).toBeDisabled();
});
