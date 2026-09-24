import {test,expect,type Page} from '@playwright/test';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {verifiedAccount,login,choose} from '../e2e/cloud-helpers';
const out=resolve(process.env.ACCEPTANCE_REPORT_DIR||'验收/2026-09-23');
test.beforeAll(async()=>{await mkdir(out,{recursive:true});});
async function capture(page:Page,id:string,title:string,check:string,method='真实浏览器操作',locator?:any){
 await mkdir(resolve(out,'截图'),{recursive:true});
 await page.evaluate(()=>document.fonts.ready);
 await expect.poll(()=>page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
 const path=resolve(out,'截图',id+'.png');
 await (locator||page).screenshot({path,animations:'disabled'});
 const prior=await readFile(resolve(out,'截图清单.json'),'utf8').then(t=>JSON.parse(t)).catch(()=>[]);
 const shots=prior.filter((s:any)=>s.id!==id);
 shots.push({id,title,check,method,file:'截图/'+id+'.png',viewport:page.viewportSize(),capturedAt:new Date().toISOString()});shots.sort((a:any,b:any)=>a.id.localeCompare(b.id));
 await writeFile(resolve(out,'截图清单.json'),JSON.stringify(shots,null,2)+'\n');
}
async function parentOpenAll(page:Page){
 await page.getByRole('button',{name:'家长',exact:false}).first().click();await page.getByRole('button',{name:'27',exact:true}).click();
 await page.getByRole('switch',{name:'家长开放全部课程'}).click();
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
}
async function toStory(page:Page,l:any,photograph=false){
 await page.getByRole('button',{name:'准备好啦，出发'}).click();
 for(const [i,c] of l.characters.entries()){
  await expect(page.locator('.hanzi')).toHaveText(c.text);
  if(photograph&&i===0)await capture(page,'04-character','认字：在“香蕉”里认识“香”','目标汉字、例词与继续按钮可见。');
  await page.getByRole('button',{name:'继续探索'}).click();
 }
 for(const [i,c] of l.characters.entries()){
  await expect(page.locator('.word-card h2')).toHaveText(c.word);
  if(photograph&&i===0){await page.getByRole('button',{name:'听词语',exact:false}).click();await capture(page,'05-word','读词语：完整词语与目标字对应','显示“香蕉”和目标字“香”，不把词语拆成无意义释义。');}
  await page.getByRole('button',{name:'读好了，继续'}).click();
 }
 for(const [i,c] of l.characters.entries()){
  await page.getByRole('button',{name:'听听要找哪个字'}).click();
  if(photograph&&i===0)await capture(page,'06-sound','听词找字：同词字不互作干扰','“香”和“蕉”不会同时作为“香蕉”录音的两个候选答案。');
  const wrong=l.characters.find((x:any)=>x.word!==c.word)!;
  await page.getByRole('button',{name:i===0?wrong.text:c.text,exact:true}).click();
  if(photograph&&i===0){await expect(page.locator('.feedback')).toContainText('没关系');await capture(page,'07-wrong','答错反馈：支持继续尝试','故意选择错误答案，出现提示并允许继续，没有卡住流程。');}
  await page.getByRole('button',{name:'继续探索'}).click();
 }
 for(const [i,c] of l.characters.entries()){
  const labels=await page.locator('.answer-grid button').allTextContents();expect(new Set(labels).size).toBe(labels.length);
  if(photograph&&i===0)await capture(page,'08-meaning','词义联系：候选词不重复','同一题没有两个“香蕉”选项；词语与图标一同呈现，需要家长陪读选项。');
  await page.getByRole('button',{name:c.word,exact:true}).click();await page.getByRole('button',{name:'继续探索'}).click();
 }
 const positions=await page.locator('.hidden-character').evaluateAll(nodes=>nodes.map(n=>{const r=n.getBoundingClientRect();return [r.x,r.y].join(',');}));expect(new Set(positions).size).toBe(l.characters.length);
 if(photograph)await capture(page,'09-hunt','找字：五个独立位置','五个目标字都有独立点击位置，计数从 0/5 开始。');
 for(const c of l.characters)await page.getByRole('button',{name:'图中的'+c.text,exact:true}).click();
 if(photograph)await capture(page,'10-hunt-done','找字完成：五字全部找到','计数为 5/5，并出现进入故事的按钮。');
 await page.getByRole('button',{name:'都找到啦，去读故事'}).click();
 await expect(page.locator('.story-text')).toHaveText(l.story.text);
}

test('截图验收：目录、旧课与五字课、历史错题综合练习、最后一课',async({page,request})=>{
 const catalog=await(await request.get('/api/v1/catalog')).json();expect(catalog.lessons.length).toBe(204);
 const lesson=async(id:string)=>(await(await request.get(`/api/v1/releases/${catalog.releaseId}/lessons/${id}`)).json()).lesson;
 await writeFile(resolve(out,'运行环境.json'),JSON.stringify({date:new Date().toISOString(),releaseId:catalog.releaseId,lessons:catalog.lessons.length,characters:new Set(catalog.lessons.flatMap((l:any)=>l.characters.map((c:any)=>c.text))).size,baseURL:'http://localhost:8080',browser:'Chromium / system Chrome'},null,2));
 await page.goto('/');await expect(page.getByRole('button',{name:'开始今天的冒险'})).toBeVisible();
 await capture(page,'01-home','首页：完整课程入口','首页可加载；测试环境为手机宽度，课程数量另由 API 全量校验。');
 await page.getByRole('button',{name:'开始今天的冒险'}).click();await toStory(page,await lesson('family'));
 await page.getByRole('button',{name:'读完啦，去综合练习'}).click();await page.getByRole('button',{name:'回到汉字小屋',exact:true}).click();
 await parentOpenAll(page);
 const group=page.locator('.theme').filter({has:page.getByRole('heading',{name:'家庭生活拓展',exact:true})});await group.scrollIntoViewIfNeeded();
 await capture(page,'02-directory','课程目录：20 个单元自动换行','通过家长入口开放目录后，整组课程可选；开放不会记为已学。','真实家长入口操作',group);
 await page.getByRole('button',{name:'开始再尝一种水果',exact:true}).click();await capture(page,'03-intro','五字课开场：香蕉、葡萄、橙','课程含 5 字，明确提示可以分两次学习。');
 const fruit=await lesson('c090');await toStory(page,fruit,true);
 await page.getByRole('heading',{name:'读懂了吗？'}).scrollIntoViewIfNeeded();await page.getByText('家长参考',{exact:true}).click();
 await capture(page,'11-story','共读与理解问答','正文、理解问题、家长参考和底部完成按钮可用；长内容在正文区域滚动。');
 await page.getByRole('button',{name:'读完啦，去综合练习'}).click();
 await capture(page,'12-done','完成页：综合练习入口','完成共读后可以进入新字与老朋友的综合练习。');
 await page.getByRole('button',{name:'综合练习 · 新字和老朋友'}).click();
 await expect(page.getByText('老朋友 1 / 3',{exact:true})).toBeVisible();
 await capture(page,'13-comprehensive','综合练习：本课两字＋历史错题一字','先在旧“认识家人”课故意答错“我”，再完成本课；得到 3 题队列，未通过篡改进度制造错题。');
 for(let i=0;i<3;i++){await page.getByRole('button',{name:'这次先跳过'}).click();}
 await page.getByRole('button',{name:'回汉字小屋',exact:true}).click();
 await page.getByRole('button',{name:'开始我的成长小书',exact:true}).click();await toStory(page,await lesson('c200'));
 await page.getByRole('heading',{name:'主题复习 · 可以分次做'}).scrollIntoViewIfNeeded();await page.locator('.learning-shell>main').evaluate(el=>{el.scrollTop=el.scrollHeight;});
 await capture(page,'14-final-stage','最后一课：主题复习和阶段共读','实际走到 C200 的共读环节，阶段材料可滚动阅读，课程没有中途缺页。');
 await page.setViewportSize({width:320,height:568});
 const box=await page.locator('.learning-actions').boundingBox();expect(box!.y+box!.height).toBeLessThanOrEqual(569);
 await capture(page,'15-narrow','320 像素小屏：长内容与操作区','没有横向溢出；长材料可滚动，完成按钮保持在屏幕内。');
});

test('截图验收：云端档案、断网记录和恢复同步',async({page,request})=>{
 const email=await verifiedAccount(request);await login(page,email);
 await page.getByLabel('添加孩子昵称').fill('小云');await page.getByRole('button',{name:'创建孩子档案'}).click();await choose(page);
 await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeEnabled();
 await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.cloud-status')).toContainText('已保存到云端');
 await capture(page,'16-cloud','云端学习：进度已确认','使用专用验收账号和新建测试孩子，未进入用户真实孩子档案。');
 await page.route('**/api/v1/learners/*/events:batch',r=>r.abort());
 await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.cloud-status')).toContainText('待同步 1 条');
 await capture(page,'17-pending','网络异常：明确提示本机待同步','主动阻断测试页的同步请求，操作保存在本机，页面没有显示成云端成功。','Playwright 阻断同步接口，模拟网络失败');
 await page.unroute('**/api/v1/learners/*/events:batch');await page.getByRole('button',{name:'重试保存'}).click();await expect(page.locator('.cloud-status')).toContainText('云端记录已读取');
 await capture(page,'18-synced','恢复网络：继续原位置','解除请求阻断并重试，待同步提示消失，继续同一课次。');
});

test('截图验收：课程服务失败与重试恢复',async({page})=>{
 await page.route('**/api/v1/catalog*',r=>r.abort());await page.goto('/');
 await expect(page.getByRole('heading',{name:'课程暂时没加载出来'})).toBeVisible();
 await capture(page,'19-error','课程加载失败：提供重试入口','阻断目录请求，错误页保留重试入口，不假装加载成功。','Playwright 阻断目录接口，模拟服务失败');
 await page.unroute('**/api/v1/catalog*');await page.getByRole('button',{name:'重新加载课程'}).click();await expect(page.getByRole('button',{name:'开始今天的冒险'})).toBeVisible();
});
