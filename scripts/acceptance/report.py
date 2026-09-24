"""Generate an offline screenshot gallery and Markdown report from actual Playwright JSON."""
import argparse, html, json
from pathlib import Path
from datetime import datetime
p=argparse.ArgumentParser()
p.add_argument('--out',default='验收/2026-09-23')
p.add_argument('results',nargs='+',help='Playwright JSON reports, oldest first; later runs override the same test')
a=p.parse_args();out=Path(a.out);out.mkdir(parents=True,exist_ok=True)
all_cases={};runs=[]
def collect(suite):
 for spec in suite.get('specs',[]):
  for test in spec.get('tests',[]):
   results=test.get('results',[]);last=results[-1] if results else {}
   status=last.get('status','not-run');key=spec.get('file','')+' :: '+spec['title']
   previous=all_cases.get(key)
   all_cases[key]=dict(name=spec['title'],file=spec.get('file',''),status=status,durationMs=sum(x.get('duration',0) for x in results),previousFailure=bool(previous and (previous['status']!='passed' or previous['previousFailure'])))
 for child in suite.get('suites',[]):collect(child)
for file in a.results:
 data=json.loads(Path(file).read_text());runs.append(dict(file=Path(file).name,stats=data.get('stats',{})))
 for suite in data.get('suites',[]):collect(suite)
shots=json.loads((out/'截图清单.json').read_text())
env=json.loads((out/'运行环境.json').read_text())
missing=[s['file'] for s in shots if not (out/s['file']).exists()]
assert not missing,missing
cases=list(all_cases.values());passed=sum(c['status']=='passed' for c in cases);failed=sum(c['status'] not in ['passed','skipped'] for c in cases);skipped=sum(c['status']=='skipped' for c in cases)
summary=f'{passed} 个场景通过，{failed} 个未通过，{skipped} 个跳过；{len(shots)} 张截图。'
findings=[
 '素材待优化：截图 08 中香蕉、葡萄、橙子的选项均使用餐盘图标，无法通过图像区分含义，仍依赖读词和家长陪读。建议优先替换为与词义对应、彼此可辨的图片。',
 '共读素材待优化：截图 11 的配图是图文词卡，尚不是表现故事情节的场景插画。建议为代表性课文补充情境图，再进行儿童理解效果试读。',
 '截图是当前视口的画面；共读和阶段复习长内容需要向下滚动，截图不代表全部正文。'
]
if any(c['previousFailure'] for c in cases):
 findings.append('稳定性待跟踪：首轮存在失败场景，单独重测结果见明细。重测通过不等于已定位或修复原因；本轮未修改应用代码。')
if failed:
 findings.append('存在尚未通过的自动化场景，不能将本轮判为全部验收通过；详见结果明细。')
notes=[
 '本轮通过 Playwright 操作当前本地已发布应用。图片为浏览器实拍，不是设计稿；手机尺寸由桌面 Chrome 模拟。',
 '全量内容检查覆盖 204 课内容包及故事音频、图片；完整点击流程覆盖原十课与代表性五字课。不能把接口可用等同于逐课人工教学审校。',
 '截图中的开放目录由家长入口操作；错题来自故意选错。网络异常通过拦截测试页请求模拟，未关闭真实服务。',
 '仅使用独立浏览器访客记录与专用测试账号，未进入或修改用户真实孩子档案。截图不包含真实家长邮箱、密码或令牌。',
 '机器朗读的读音自然度、长句难度、儿童实际理解效果仍需人工审听与试读。本次不替代真机触控、正式 HTTPS 或互联网部署验收。'
]
md=['# 课程自动验收与画面记录','',f'生成时间：{datetime.now().isoformat(timespec="seconds")}。内容版本：`{env["releaseId"]}`。','',f'**{summary}**','',f'范围：{env["lessons"]} 课、{env["characters"]} 字；本地应用 `{env["baseURL"]}`。','', '[打开截图画廊](index.html) · [机器结果摘要](验收结果.json)','']
md+=['- '+n for n in notes]+['','## 发现的问题与建议','']+['- '+n for n in findings]+['','## 关键场景截图','']
for s in shots:md += [f'### {s["id"]} · {s["title"]}','',s['check'],'',f'操作方式：{s["method"]}；视口 {s["viewport"]["width"]}×{s["viewport"]["height"]}。','',f'![{s["title"]}]({s["file"]})','']
md+=['## 自动化结果明细','','| 场景 | 最后结果 | 耗时 |','| --- | --- | --- |']
for c in cases:md.append(f'| {c["name"].replace("|","／")} | {c["status"]}{"（此前失败，已重测）" if c["previousFailure"] else ""} | {c["durationMs"]/1000:.1f} 秒 |')
md+=['','## 复验方式','','见 [验收脚本说明](../../scripts/acceptance/README.md)。文档图片保存在同级 `截图/`，不会被 Playwright 清理临时输出时删除。','']
(out/'课程验收报告.md').write_text('\n'.join(md))
(out/'验收结果.json').write_text(json.dumps(dict(environment=env,summary=dict(passed=passed,failed=failed,skipped=skipped,screenshots=len(shots)),findings=findings,runs=runs,cases=cases),ensure_ascii=False,indent=2)+'\n')
e=html.escape
cards=[]
for s in shots:
 cards.append(f'<article id="{e(s["id"])}" data-title="{e(s["title"])}"><h2>{e(s["title"])}</h2><p>{e(s["check"])}</p><a href="{e(s["file"])}" target="_blank"><img loading="lazy" src="{e(s["file"])}" alt="{e(s["title"])}"></a><small>{e(s["method"])} · {s["viewport"]["width"]}×{s["viewport"]["height"]} · 点击查看原图</small></article>')
rows=''.join(f'<tr><td>{e(c["name"])}</td><td>{e(c["status"])}{"（此前失败，已重测）" if c["previousFailure"] else ""}</td><td>{c["durationMs"]/1000:.1f}s</td></tr>' for c in cases)
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>汉字小屋 · 课程验收画廊</title><style>
*{box-sizing:border-box}body{margin:0;background:#f4f4ed;color:#293d32;font:16px/1.7 system-ui,"PingFang SC",sans-serif}header,main,footer{max-width:1240px;margin:auto;padding:28px}h1{margin:0 0 12px;font-size:32px}h2{font-size:19px;margin:0 0 12px}.summary{background:#dce8d5;border-radius:12px;padding:18px;font-weight:650}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:24px}article{background:#fffdf7;border:1px solid #dfe5d9;padding:20px;border-radius:18px;scroll-margin:20px}article p{font-size:14px;min-height:72px}img{display:block;width:100%;height:540px;object-fit:contain;object-position:top;background:#f0f1e9;border-radius:10px}small{display:block;color:#647365;font-size:12px;margin-top:12px}a{color:#3e683c}input{width:100%;padding:14px;border:1px solid #b8c9b2;border-radius:10px;margin:12px 0;font:inherit}details{margin:22px 0}summary{cursor:pointer;font-weight:650}table{border-collapse:collapse;width:100%;font-size:13px}td,th{border-bottom:1px solid #d9dfd4;padding:10px;text-align:left}.table-wrap{overflow:auto}[hidden]{display:none!important}@media(max-width:600px){header,main,footer{padding:18px}h1{font-size:26px}article p{min-height:0}}
</style><header><h1>汉字小屋 · 课程验收画廊</h1>'''
page+=f'<p>内容版本 {e(env["releaseId"])} · {env["lessons"]} 课 / {env["characters"]} 字</p><div class="summary">{e(summary)}</div><p>先看画面，再看检查结论。点击截图可查看原图。</p><details><summary>这次验收检查了什么？</summary><ul>'+''.join('<li>'+e(n)+'</li>' for n in notes)+'</ul></details><label for="search">按场景筛选</label><input id="search" placeholder="例如：认字、复习、网络、小屏"></header><main><section class="grid">'
page+=''.join(cards)+'</section><section><h2>发现的问题与建议</h2><ul>'+''.join('<li>'+e(n)+'</li>' for n in findings)+'</ul></section><details><summary>展开全部自动化结果</summary><div class="table-wrap"><table><tr><th>场景</th><th>结果</th><th>耗时</th></tr>'+rows+'</table></div></details></main><footer><a href="课程验收报告.md">Markdown 报告</a> · <a href="验收结果.json">机器结果摘要</a></footer><script>document.getElementById("search").addEventListener("input",e=>{const q=e.target.value.trim();document.querySelectorAll("article").forEach(x=>x.hidden=!x.innerText.includes(q))})</script></html>'
(out/'index.html').write_text(page)
print(summary)
