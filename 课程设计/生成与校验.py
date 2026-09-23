"""从两份人工源稿生成设计文档；不读写应用或数据库。运行：python3 课程设计/生成与校验.py"""
from pathlib import Path
import csv
import json
from collections import Counter

ROOT = Path(__file__).resolve().parent
STAGES = ['身边的世界', '幼儿园与自理', '自然观察', '出行与社区', '家庭生活拓展', '时间数量与探索', '故事与感受', '表达与规则', '阅读理解', '入学衔接与阅读拓展']
LEGACY = ['我爸妈','家门人','你好来','小猫狗','水喝吃','鱼鸟看','有在的','日月山','木花草','上下大']
NOTES = {
    '喝':'喝水：hē', '的':'我的：de', '了':'好了：le', '什':'什么：shén',
    '么':'什么：me', '干':'干衣服／干净：gān', '脏':'脏了：zāng', '便':'方便：biàn',
    '觉':'觉得：jué；睡觉：jiào 作为词语陪读', '种':'种子：zhǒng；种下：zhòng',
    '长':'长大：zhǎng；长短：cháng 另随词示范', '爪':'爪子：zhuǎ', '行':'行走：xíng；银行：háng',
    '转':'转身：zhuǎn；车轮转动：zhuàn', '铺':'店铺：pù', '扇':'风扇：shàn',
    '薄':'薄被：báo', '数':'数一数：shǔ；数量：shù', '少':'多少／少了：shǎo',
    '只':'一只：zhī；只有：zhǐ 另随词示范', '重':'重量：zhòng；重复：chóng',
    '量':'测量：liáng；重量：liàng', '称':'称重：chēng', '乐':'快乐：lè；音乐：yuè',
    '难':'难过：nán', '着':'着急：zháo；沿着：zhe', '结':'结果／团结：jié',
    '假':'真假：jiǎ', '强':'强壮：qiáng；勉强：qiǎng', '钻':'钻洞：zuān',
    '藏':'藏好：cáng', '舍':'舍不得：shě', '还':'还有：hái；归还：huán',
    '得':'做得好：de', '地':'轻轻地：de；地上：dì', '都':'都是：dōu；首都：dū',
    '应':'应该：yīng；回应：yìng', '仔':'仔细：zǐ', '兴':'高兴／兴奋：xìng／xīng',
    '背':'背后：bèi', '角':'牛角：jiǎo；角色：jué', '奔':'奔跑：bēn',
    '将':'将来：jiāng', '传':'传话：chuán；传统：chuán', '划':'计划：huà',
    '更':'更好：gèng', '校':'学校：xiào',
}
rows = list(csv.DictReader((ROOT/'1000字课程源稿.tsv').open(), delimiter='\t'))
readings = [line.split('|') for line in (ROOT/'共读源稿.txt').read_text().splitlines() if line.strip()]
assert len(rows) == len(readings) == 200, '必须有 200 条课程和共读内容'
chars = ''.join(row['目标字'] for row in rows)
assert len(chars) == len(set(chars)) == 1000, '目标字必须恰好 1000 且不重复'
assert set(''.join(LEGACY)) <= set(chars), '必须覆盖已有 30 字'
assert set(chars[:30]) == set(''.join(LEGACY)), '前六设计单元保留已有 30 字'
assert Counter(int(r['阶段']) for r in rows) == Counter({n:20 for n in range(1,11)})

def han(text):
    return list(dict.fromkeys(c for c in text if '\u4e00' <= c <= '\u9fff'))

lessons, index, known = [], [], set()
for i, (r, reading) in enumerate(zip(rows, readings), 1):
    stage = int(r['阶段'])
    assert stage == (i-1)//20+1
    target = list(r['目标字'])
    words = r['例词（依次对应目标字）'].split('/')
    assert len(target) == len(words) == 5
    assert all(c in w for c,w in zip(target,words)), f'{i}: 例词未包含目标字'
    assert len(reading) == 3 and all(reading), f'{i}: 共读字段缺失'
    text, question, answer = reading
    assert set(target) & set(text), f'{i}: 共读没有目标字'
    # 文本中出现的已学字优先；不足三字时补最近教学字。仅供无个性化数据时设计参考。
    pool = [c for c in han(text) if c in known]
    pool += [c for c in reversed(chars[:(i-1)*5]) if c not in pool]
    review = pool[:3]
    assert set(review) <= known and not set(review) & set(target)
    known.update(target)
    item = dict(id=f'C{i:03}', stage=stage, stageTitle=STAGES[stage-1], title=r['课题'], targets=target,
                words=[dict(character=c,word=w,readingNote=NOTES.get(c,'')) for c,w in zip(target,words)],
                readTogether=text, question=question, referenceAnswer=answer,
                parentReadCharacters=[c for c in han(text) if c not in known],
                wordSupportCharacters=[c for c in han(''.join(words)) if c not in known],
                targetCharactersInReading=[c for c in target if c in text], reviewCandidates=review,
                reviewPolicy='课末3—5题：本课1—2题，历史错题／到期重点2—3题；首课无历史题，允许少做。候选字不等于实际排题。')
    lessons.append(item)
    for c,w in zip(target,words):
        index.append(dict(汉字=c,阶段=stage,单元=item['id'],课题=r['课题'],例词=w,读音提示=NOTES.get(c,'')))

reviews=[]
for block in range(50):
    units=lessons[block*4:block*4+4]
    sample=[c for u in units for c in u['targets'][:2]]
    story=units[-1]
    reviews.append(dict(id=f'R{block+1:02}', after=story['id'], sourceUnits=[u['id'] for u in units],
                        sampleCharacters=sample, questionSource=story['id'],
                        tasks=[f"换顺序、遮图认读：{sample[0]}、{sample[2]}（允许求助）",
                               f"听词找字并说意思：{units[1]['words'][1]['word']}、{units[2]['words'][1]['word']}",
                               f"共读 {story['id']} 后回答：{story['question']}",
                               '若有历史记录，再抽1—2道过往错题或到期重点；无记录则不补新字。']))

(ROOT/'1000字课程.json').write_text(json.dumps(dict(version='0.1-design-draft',status='设计初稿，未发布、未经儿童试读',
    audience='5—6岁亲子共读',applicationImportCompatible=False,stages=STAGES,lessons=lessons,reviewUnits=reviews),ensure_ascii=False,indent=2)+'\n')
with (ROOT/'1000字字表.csv').open('w',newline='',encoding='utf-8-sig') as f:
    out=csv.DictWriter(f,fieldnames=list(index[0]));out.writeheader();out.writerows(index)

lines=['# 1000 字课程总表','', '版本 v0.1 · 设计初稿 · 200 个新字单元，每单元 5 字。共读不等于独立阅读，陪读字由大人支持。', '',
       '配套规则见 [课程设计说明](1000字课程设计.md)。每课例词依次对应五个目标字；完整辅助字段见 JSON。', '']
for stage, name in enumerate(STAGES,1):
    lines += [f'## 第 {stage} 阶：{name}（累计 {stage*100} 字）','']
    for item in lessons[(stage-1)*20:stage*20]:
        lines += [f"### {item['id']} {item['title']}",'',f"- 新字：{'、'.join(item['targets'])}。例词：{'／'.join(w['word'] for w in item['words'])}。",
                  f"- 共读：{item['readTogether']}", f"- 理解：{item['question']} 参考：{item['referenceAnswer']}",
                  f"- 历史复习候选：{'、'.join(item['reviewCandidates']) or '首课暂无'}；实际优先使用孩子的错题和到期重点。",
                  f"- 共读陪读字：{'、'.join(item['parentReadCharacters']) or '无新增陪读字；仍需观察理解'}。", '']
(ROOT/'1000字课程总表.md').write_text('\n'.join(lines))
lines=['# 50 次主题复习','', '每完成 4 个新字单元可选一次，不新增首次教学字；不是固定测验。抽样不代表这 20 字全部掌握。每次只做适量任务，可分次。', '',
       '具体任务如下。历史题从全部已学内容选择，尚未实现的个性化排题见课程设计说明；不能直接用本表代替运行时队列。','']
for r in reviews:
    lines += [f"## {r['id']} · {r['after']} 后",'', f"范围：{'—'.join([r['sourceUnits'][0],r['sourceUnits'][-1]])}；轮换候选：{'、'.join(r['sampleCharacters'])}。",'']
    lines += [f'{n}. {task}' for n,task in enumerate(r['tasks'],1)] + ['']
(ROOT/'主题复习表.md').write_text('\n'.join(lines))
lines=['# 课程结构校验报告','','由 `python3 课程设计/生成与校验.py` 生成。仅证明结构与引用一致，不证明教学效果或语言已完成专业审校。','',
       '- 通过：200 个单元；10 阶各 20 单元；每课 5 个目标字。',
       '- 通过：首次教学字总计 1000，去重后 1000；重复首次教学字为 0。',
       '- 通过：已有 30 字全部覆盖，前 6 个设计单元包含且仅包含这 30 字。',
       '- 通过：1000 个例词字段逐项含对应目标字。',
       '- 通过：200 条共读、200 个理解问题及参考答案完整，每篇至少含一个本课目标字。',
       '- 通过：课末复习候选仅引用此前已教字，无本课／未来字混入。',
       '- 通过：50 个主题复习节点，分别引用已完成的 4 个单元。',
       '- 已输出：逐课共读陪读字和例词辅助字；均按教学顺序计算，不推断某个孩子实际已会。',
       '', '## 共读目标字覆盖（不要求五个字硬塞进每篇）','', '| 本篇出现的本课目标字数 | 篇数 |','| --- | --- |']
for count,total in sorted(Counter(len(u['targetCharactersInReading']) for u in lessons).items()):
    lines.append(f'| {count} | {total} |')
lines += ['', '本报告只校验设计源稿。配套本地发布版已制作机器语音、SVG 图文卡和辨认题；发布验证见项目验收记录。专业人工审校、儿童试读、全量拼音及真人录音仍待开展。', '']
(ROOT/'校验报告.md').write_text('\n'.join(lines))
print('校验通过：200 单元 / 1000 不重复汉字 / 1000 例词 / 200 共读问答 / 50 复习节点')
