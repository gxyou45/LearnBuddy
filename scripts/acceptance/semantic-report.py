"""Build a durable review document from the exact registry and browser evidence."""
import json, html
from pathlib import Path
out=Path('验收/2026-09-23-词义情境配图')
audit=json.loads((out/'词语素材清单.json').read_text())
baseline=json.loads(Path('验收/2026-09-23-图标优化/词语素材清单.json').read_text())
old={r['word']:r for r in baseline['words']}
changed=[r for r in audit['words'] if old[r['word']]['kind']=='context' and r['kind']!='context']
remaining=[r for r in audit['words'] if r['kind']=='context']
function_words=set('我是 好了 也是 就是 但是 而且 却没有 虽然 并且 或者 如果 假若 即使 一定 应该 可以 另外 更好 曾经 然后 发生 怎么 谁呢 谁来 啊哈 立即 始终'.split())
for r in remaining:r['reviewNote']='需要配合完整句子设计前后对照，暂保留陪读。' if r['word'] in function_words else '可以继续尝试配图；当前小图尚不能把关键动作或关系讲清，待补更明确的情境或多格画面。'
(out/'本轮变化与待配词.json').write_text(json.dumps({'before':baseline['counts'],'after':audit['counts'],'newlyIllustrated':changed,'remaining':remaining},ensure_ascii=False,indent=2)+'\n')
results=[]
for name,path in [('六个词语实际流程','/tmp/learnbuddy-semantic-browser.json'),('已有读词、故事和小屏回归','/tmp/learnbuddy-semantic-regression.json'),('小屏故事就绪等待复验','/tmp/learnbuddy-semantic-readiness-recheck.json')]:
 data=json.loads(Path(path).read_text())
 assert data['stats']['skipped']==0 and not data.get('errors'), name+' has incomplete checks'
 assert data['stats']['unexpected']==(1 if 'regression.json' in path else 0), name+' has unreviewed failures'
 (out/Path(path).name.replace('learnbuddy-semantic-', '')).write_text(json.dumps(data,ensure_ascii=False,indent=2)+'\n')
 results.append(f"{name}：{data['stats']['expected']} 通过，{data['stats']['unexpected']} 失败，{data['stats']['flaky']} 重试通过。")
shots=[]
for w in ['我和你','他来','吃东西','力气','跳一跳','虽然']:
 for step in ['认字','词语']:
  name=f'{w}-{step}.png';assert (out/'截图'/name).exists();shots.append((w,step,name))
sheet_names=sorted(p.name for p in (out/'情境样张').glob('*.png'))
cards=''.join(f'<figure><a href="截图/{html.escape(n)}"><img src="截图/{html.escape(n)}" loading="lazy" alt="{w}{s}页实际截图"></a><figcaption>{w} · {s}页</figcaption></figure>' for w,s,n in shots)
sheets=''.join(f'<a href="情境样张/{n}">样张 {i+1}</a> ' for i,n in enumerate(sheet_names))
(out/'index.html').write_text(f'''<!doctype html><html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>词义情境配图验收</title><style>body{{max-width:1200px;margin:auto;padding:24px;background:#f7f6ed;color:#40533d;font:16px/1.8 system-ui}}h1{{font-size:28px}}a{{color:#537844}}.grid{{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:20px}}figure{{margin:0;background:#fffdf6;padding:12px;border:1px solid #dfe3d1;border-radius:14px}}img{{display:block;width:100%;height:auto}}figcaption{{text-align:center}}nav a{{margin-right:14px}}</style><h1>从“陪读提示”到词义情境配图</h1><p>934 个不同词语中，陪读提示从 423 减少到 79；新增 342 个词的情境图、2 个词的 💪 图标。当前 855 个词有图，占 91.5%。原有课程的“吃东西”也已补图，对应设计稿的“吃饭”。</p><nav><a href="素材总览.html">搜索全部词语和画意说明</a><a href="词义情境配图报告.md">验收报告及剩余词清单</a></nav><p>下面是本地应用的真实浏览器截图。最后的“虽然”用来确认需要进一步设计的词仍保留陪读提示。</p><p>{' '.join(results)}</p><p>回归首轮有一次课程加载等待超时，延长就绪等待后单独复验通过；详细记录见报告。</p><section class="grid">{cards}</section><h2>完整新情境样张</h2><p>235 幅不同情境服务 342 个词；近义词可共享情境。以下是素材展示，非学习页截图。</p><nav>{sheets}</nav></html>''')
report=f'''# 词义情境配图验收（2026-09-23）

按完整词语理解含义，用人物动作、关系与生活小情境补图。可表达的抽象词采用明确例子，如“因为”：下雨 → 撑伞。情境图只是用法示例，不替代原例句。

## 覆盖变化

统计范围：200 个设计单元中的 934 个去重词语，原十课的专用图片继续优先展示。

| 类别 | 调整前 | 调整后 |
| --- | ---: | ---: |
| 陪读提示 | 423 | 79 |
| 词义情境图 | 0 | 342 |
| 系统图标 | 266 | 268 |
| 原创物件简笔画 | 222 | 222 |
| 计数／符号／色块 | 23 | 23 |

新增配图 **344 个词**；陪读提示减少 **81.3%**；有图覆盖率由 **54.7% 提升至 91.5%**。235 幅不同情境服务 342 个词；数量按词语计算，并非生成 342 张不同图片。新增图形是项目内原创 SVG，不是重新生成绘本故事图。另补原有已发布课程的“吃东西”映射，不计入设计稿的 934 词统计。

## 重点示例与截图

| 词语 | 配图含义 | 认字页 | 词语页 |
| --- | --- | --- | --- |
'''
for w in ['我和你','他来','吃东西','力气','跳一跳','虽然']:
 row=next(r for r in audit['words'] if r['word']==('吃饭' if w=='吃东西' else w))
 desc=row.get('description') or ('💪 表示力气' if w=='力气' else '保留陪读，待设计完整转折情境')
 report+=f'| {w} | {desc} | [查看](截图/{w}-认字.png) | [查看](截图/{w}-词语.png) |\n'
report+='''
原有已发布课程使用“吃东西”，设计稿使用“吃饭”；两个完整词语都已绑定吃饭情境。实拍按应用实际词语标注。

## 验证和发布

- 本地生产构建成功，58/58 单元测试通过。
- '''+'\n- '.join(results)+'''
- 已有回归首轮 9/10 通过；一个小屏故事场景停在“正在准备课程”超过原 5 秒等待。把该处课程就绪等待上限改为 15 秒（布局断言不变）后单独复验 1/1 通过。此调整提高测试容忍度，不代表已定位或改善加载耗时；[首次失败记录](小屏首次等待超时.md)保留。
- 所有新增情境检查 SVG 可渲染、无缺失引用和无越界告警；逐张查看 10 页情境样张，修正鸟形、人物与道具遮挡、门框越界等细节。
- 首轮浏览器验收 5/6 通过：“吃饭”在保留的原课中实际叫“吃东西”，导致按词语查课失败。补齐对应映射并按实际词语修正验收后重跑；首轮结果已保留。
- 保存 12 张实际应用截图，覆盖五个用户示例和一个保留陪读的词；验证 320×568 小屏按钮可操作且没有横向溢出。
- 本地 Docker web 已更新；测试使用隔离游客，不改真实家庭记录。课程、题目与内容版本保持 `curriculum-1000-v1`，原十幅故事插图继续使用。
- Vite 提示主脚本超过 500 kB（未压缩）；本轮未做性能基准。教学理解效果仍需结合孩子实际使用观察。

## 仍保留陪读的 79 个词

这些词不代表“不能画”。有些需要完整句子，有些需要把动作前后或人物关系画得更清楚，暂不使用容易造成误解的小图。下一轮可按多格情境继续完善。

'''
for reason,words in [('需要句子或前后对照',[r['word'] for r in remaining if r['word'] in function_words]),('待进一步设计清楚的情境',[r['word'] for r in remaining if r['word'] not in function_words])]:report+=f'**{reason}**：'+ '、'.join(words)+'。\n\n'
report+='''## 审阅入口与复验

- [实际学习画面](index.html)
- [完整词语素材总览（可搜索、分类）](素材总览.html)
- [逐词变化、剩余词与原因](本轮变化与待配词.json)
- [SVG 边界检查](绘图边界检查.json)

```sh
ACCEPTANCE_REPORT_DIR=验收/2026-09-23-词义情境配图 node --import tsx scripts/acceptance/visual-catalog.ts
node scripts/acceptance/semantic-sheets.mjs
npx playwright test --config playwright.acceptance.config.ts semantic-words.spec.ts
PLAYWRIGHT_BASE_URL=http://localhost:8080 npx playwright test tests/e2e/word-visuals.spec.ts tests/e2e/reading.spec.ts tests/e2e/viewport.spec.ts --workers=1
```

浏览器需能访问本地服务，并具备启动 Chrome 的权限。完整执行时遵循仓库约定，在 workbench 的验收窗格运行。
'''
(out/'词义情境配图报告.md').write_text(report)
print('report generated')
