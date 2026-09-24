"""Build a permanent gallery combining actual app screenshots and generated story originals."""
from pathlib import Path
import json,html,hashlib,sys
out=Path('验收/2026-09-23-故事配图');out.mkdir(parents=True,exist_ok=True)
briefs=json.loads(Path('apps/web/src/story-art/briefs.json').read_text());e=html.escape
results=json.loads(Path(sys.argv[1]).read_text()) if len(sys.argv)>1 else None
notes={
'c012':'三格按晴天、云变多、下雨排列，表现天气变化。',
'c041':'牛吃草、羊走来、马跑过，猪旁有小鸡；五种动物分别可辨。',
'c050':'播种、发芽、长成小苗三个阶段；根位于土层以下。',
'c062':'孩子牵着大人的手站在人行道等候，汽车停下，尚未开始过街。',
'c066':'孩子戴好头盔，大人检查自行车铃与刹车。',
'c090':'孩子把橙子递给家人，桌上是香蕉、成串葡萄和橙子。',
'c097':'孩子扫地、爸爸拖地、妈妈擦桌，三种动作不同。',
'c128':'两格都能看到窗外下雨；室内先共读，再一起画雨天。',
'c154':'孩子举手表示拒绝，大人保持距离，没有擅自触碰。',
'c194':'一家人在护栏内看龙舟，近处有用叶子包裹的粽子。'}
summary='首批 10 课；10 张故事插图、20 张实际页面截图。'
if results:
 assert results['stats']['unexpected']==0 and results['stats']['expected']==10,results['stats']
 summary+=' 10/10 浏览器流程通过。'
 (out/'自动验收摘要.json').write_text(json.dumps({'stats':results['stats'],'scope':'10 课从认字到共读完整流程、原文匹配、图片载入、放大与关闭、320 像素布局、书架、C090 已看图片缓存及断网读取'},ensure_ascii=False,indent=2)+'\n')
md=['# 首批十课故事配图','',summary,'','[打开图文画廊](index.html)','','采用内置 image_gen，逐课根据原文生成。下列原图为生成插图；手机图与放大图为 Playwright 操作本地应用的实拍，未使用真实孩子档案。','', '这十课从不同场景中选取，并非课程顺序的前十课。故事正文与历史学习记录保持原样。','']
cards=[];manifest=[]
for b in briefs:
 id=b['id'];orig='../../apps/web/src/story-art/'+b['file'];phone='截图/'+id+'-phone.png';large='截图/'+id+'-large.png'
 if results:
  assert (out/phone).exists() and (out/large).exists()
 p=out/orig;assert p.exists()
 manifest.append({'id':id,'title':b['title'],'story':b['story'],'image':orig,'sha256':hashlib.sha256(p.read_bytes()).hexdigest(),'check':notes[id],'phone':phone,'large':large})
 md += [f'## {id.upper()} · {b["title"]}','','原文：'+b['story'],'','画面检查：'+notes[id],'',f'![{b["title"]}原图]({orig})','',f'[查看手机截图]({phone}) · [查看放大截图]({large})','']
 cards.append(f'<article id="{id}"><h2>{id.upper()} · {e(b["title"])}</h2><p class="story">{e(b["story"])}</p><p>{e(notes[id])}</p><div class="pictures"><figure><a href="{orig}" target="_blank"><img class="art" src="{orig}" loading="lazy" alt="{e(b["story"])}"></a><figcaption>生成插图 · 点击看原图</figcaption></figure><figure><a href="{phone}" target="_blank"><img class="phone" src="{phone}" loading="lazy" alt="{e(b["title"])}手机页面截图"></a><figcaption>实际手机页面 · <a href="{large}" target="_blank">放大页面截图</a></figcaption></figure></div></article>')
md+=['## 制作与验证','','原文、插图映射与批次提示词保存于 [briefs.json](../../apps/web/src/story-art/briefs.json)。C090 先行样图的实际提示词见 [首次生成记录](C090首次生成提示词.txt)。工作区原图位于 `apps/web/src/story-art/images/`。本轮使用内置 image_gen，没有使用 CLI/API 备用模式。','','构建和单元结果另见项目验收记录。本批只覆盖以上十课，其他课程保留原有素材。', '', '附加检查：游客整页断网刷新会被既有账户确认页面拦住，本轮未修改账户离线逻辑。插图测试验证的是缓存命中和当前页面断网读取，不宣称游客整页离线刷新已通过。见 [检查记录](附加离线检查记录.json)。','']
(out/'故事配图报告.md').write_text('\n'.join(md))
(out/'插图与截图清单.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>十课故事配图 · 画面验收</title><style>*{box-sizing:border-box}body{max-width:1220px;padding:24px;margin:auto;font:16px/1.8 system-ui;background:#f6f3e9;color:#3f503c}h1{font-size:29px}h2{font-size:22px;margin:0}a{color:#567a47}.summary{background:#e2ead6;border-radius:12px;padding:16px}input{font:inherit;width:100%;padding:12px;border:1px solid #c4d0b5;border-radius:10px}article{background:#fffdf6;padding:24px;margin:26px 0;border:1px solid #e1e4d8;border-radius:18px}.story{font-weight:600}.pictures{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:24px;align-items:center}figure{margin:0}img{display:block;max-width:100%;height:auto;border-radius:10px}.phone{height:470px;max-width:100%;object-fit:contain;margin:auto}figcaption{text-align:center;font-size:12px;color:#79876d;margin:10px}article[hidden]{display:none}footer{font-size:13px}@media(max-width:650px){body{padding:14px}article{padding:16px}.pictures{grid-template-columns:1fr}.phone{height:400px}}</style><h1>十课故事配图 · 画面验收</h1>'''
page+=f'<p class="summary">{e(summary)}</p><p>画风：温暖绘本。每课同时展示故事原文、生成插图和实际手机页面，点击图片可以放大。</p><p><a href="故事配图报告.md">图文报告</a> · <a href="插图与截图清单.json">文件与检查清单</a></p><label for="q">找章节或故事</label><input id="q" placeholder="例如：水果、种子、雨、端午">'+''.join(cards)+'<footer>本批选取十种代表性场景，并非课程顺序前十课。内置 image_gen 生成，Playwright 实拍；其余课程尚未替换为本批画风。</footer><script>document.querySelector("#q").addEventListener("input",e=>{document.querySelectorAll("article").forEach(x=>x.hidden=!x.innerText.toLowerCase().includes(e.target.value.trim().toLowerCase()))})</script></html>'
(out/'index.html').write_text(page);print(summary)
