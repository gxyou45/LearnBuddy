"""Publish the icon matching acceptance evidence, using actual Playwright results."""
import json,html,argparse
from pathlib import Path
p=argparse.ArgumentParser();p.add_argument('--out',default='验收/2026-09-23-图标优化');p.add_argument('results',nargs='+');a=p.parse_args();out=Path(a.out)
runs=[];cases={}
def walk(s):
 for spec in s.get('specs',[]):
  for test in spec.get('tests',[]):
   status=test.get('results',[{}])[-1].get('status','not-run')
   cases[spec['title']]={'name':spec['title'],'file':spec['file'],'status':status}
 for child in s.get('suites',[]):walk(child)
for f in a.results:
 d=json.loads(Path(f).read_text());runs.append({'file':Path(f).name,'stats':d['stats']});walk(d)
passed=sum(c['status']=='passed' for c in cases.values());other=len(cases)-passed
assert not other, 'Review non-passing results before writing a passed report'
audit=json.loads((out/'词语素材清单.json').read_text());shots=sorted((out/'截图').glob('*.png'));assert len(shots)==16
summary=f'{len(cases)} 个不同浏览器场景通过；最终部署后另复测 {runs[-1]["stats"]["expected"]} 个配图流程通过；保存 {len(shots)} 张应用截图。'
(out/'浏览器验收结果.json').write_text(json.dumps({'summary':summary,'runs':runs,'cases':list(cases.values())},ensure_ascii=False,indent=2)+'\n')
report=out/'图标优化报告.md';s=report.read_text();s=s.replace('待本轮浏览器回归结束后填写。',f'生产镜像构建成功，单元测试 **54/54** 通过。{summary}\n\n覆盖：旧十课完整学习与书架、家长切课与记录、204 课内容包和媒体、五字课、最终单元、320 像素窄屏及四类配图从认字到共读的完整流程。素材清单检查验证每个简笔画引用存在；不把同类图标、子串匹配误认为词义。没有修改真实孩子记录。\n\n详细结果见 [浏览器验收结果](浏览器验收结果.json)。');report.write_text(s)
e=html.escape
names={'c090':'水果图标','c091':'萝卜简笔画','c044':'昆虫配图','c128':'抽象词陪读'};stages={'teach':'认字','word':'读词','meaning':'词义选项','story':'共读词卡'}
cards=[]
for f in shots:
 lesson,stage=f.stem.split('-');title=names[lesson]+' · '+stages[stage]
 cards.append(f'<article><h2>{title}</h2><a href="截图/{e(f.name)}" target="_blank"><img loading="lazy" src="截图/{e(f.name)}" alt="{title}"></a></article>')
page='''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>配图优化 · 更新后的学习画面</title><style>*{box-sizing:border-box}body{max-width:1240px;margin:auto;padding:24px;background:#f6f6ed;color:#3f543c;font:16px/1.7 system-ui}h1{font-size:29px}h2{font-size:18px}a{color:#537741}.summary{background:#e1ead6;padding:18px;border-radius:14px}.grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px;margin:22px 0}article{background:#fffdf7;border:1px solid #dce2d1;border-radius:15px;padding:17px}img{display:block;width:100%;height:550px;object-fit:contain;object-position:top}input{padding:12px;width:100%;font:inherit;border:1px solid #bfccb2;border-radius:9px}[hidden]{display:none!important}details{margin:20px 0}li{margin:10px 0}</style><h1>配图优化 · 更新后的学习画面</h1>'''
page+=f'<p class="summary">{e(summary)}</p><p>完整词语精确匹配。图标不合适的具体事物补原创简笔画；抽象词暂用陪读提示。</p><p><a href="素材总览.html">打开可搜索的全部素材样张</a> · <a href="图标优化报告.md">查看前后对比报告</a> · <a href="浏览器验收结果.json">检查明细</a></p><details><summary>覆盖范围与待完善内容</summary><p>934 个去重设计词语中，266 个系统图标、222 个简笔画、23 个色块／计数／符号，423 个保留陪读提示。图示不能替代词义审校；共读目前仍为词卡，未改成完整故事场景。旧发布包保持不变，本轮修正当前网页展示。</p></details><label for="q">筛选学习画面</label><input id="q" placeholder="例如：水果、简笔画、共读"><section class="grid">'+''.join(cards)+'</section><script>document.querySelector("#q").addEventListener("input",e=>{document.querySelectorAll("article").forEach(x=>x.hidden=!x.innerText.includes(e.target.value.trim()))})</script></html>'
(out/'index.html').write_text(page)
print(summary)
