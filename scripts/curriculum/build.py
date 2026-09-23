"""Build the complete local curriculum, preserving the live ten-lesson baseline.
Speech is macOS Tingting synthesis; timings are estimates, not reviewed alignment.
Run in the workbench: python3 scripts/curriculum/build.py
"""
import array, csv, hashlib, html, json, subprocess, sys, wave
from pathlib import Path
ROOT=Path(__file__).resolve().parents[2]
OUT=ROOT/'curriculum-release'
CACHE=OUT/'speech';CACHE.mkdir(parents=True,exist_ok=True)
m=json.loads((OUT/'base.json').read_text()); source=json.loads((ROOT/'课程设计/1000字课程.json').read_text())
assert len(m['lessons'])==10 and len({c['text'] for l in m['lessons'] for c in l['characters']})==30
m['releaseId']='curriculum-1000-v1'
icons=['🏡','🎒','🌿','🚦','🍎','🔎','🐰','💬','📚','🌈']
colors=['#efe3cb','#dbe8dc','#daead6','#dce8ee','#f0dfcf','#e1e5ed','#eadfec','#f2e4d8','#e3eadb','#dae9e5']
char_icons={}
for group,icon in [('一二三四五六七八九十百千万零两多少几数加减','🔢'),('头口耳目手眼鼻牙舌脸脚足身心肩体腿臂','🙋'),('天太阳星空光亮黑日月','☀️'),('云雨雪冰冷冻雾露霜虹霞风雷晴阴','🌦️'),('红黄蓝绿白色','🎨'),('衣裤鞋袜帽','👕'),('米饭面菜果吃喝','🍚'),('牛羊马猪鸡鸭鹅兔蛙虫蚂蚁蜂蝴蝶蜻蜓蝉蚊蝇虎狮象熊鹿猴狐狼鼠松虾蟹龟蛇鳄鲸海豚鲨贝','🐾'),('种芽根枝苗桃梅杏兰荷竹林森枫杨花草树叶','🌱'),('路街道桥车交通行停斑线过步横船飞机汽轮火铁票乘站骑盔铃刹','🚗'),('书本页封订录册题签版印文句段章篇词语阅汉典','📖'),('笔具橡皮铅胶','✏️'),('洗刷毛巾净澡浴梳镜盆','🧼'),('碗筷勺盘杯锅刀叉瓶罐','🥣'),('苹梨瓜枣莓香蕉葡萄橙萝卜豆蔬橘茄椒葱蒜薯蛋肉乳茶汤饼糕糖饺粉','🍽️'),('爷奶哥姐弟妹叔姨伯亲子孩儿家人','🏠'),('年今明昨时期周岁号历钟表点分秒晨夜半刻久','🕰️'),('快乐笑喜欢情绪兴奋静','🙂'),('哭泪伤难疼怕','💛')]:
 for c in group:char_icons[c]=icon

def asset(id,kind,data,**kw):
 sha=hashlib.sha256(data).hexdigest();ext='wav' if kind=='audio' else 'svg';key=f'assets/{"audio" if kind=="audio" else "images"}/{sha}.{ext}'
 p=OUT/'files'/key;p.parent.mkdir(parents=True,exist_ok=True);p.write_bytes(data)
 result=dict(id=id,kind=kind,objectKey=key,sha256=sha,bytes=len(data),mimeType='audio/wav' if kind=='audio' else 'image/svg+xml',source='LearnBuddy curriculum v1; original vector cards; macOS Tingting synthesized speech',reviewStatus='pending',**kw)
 m['assets'].append(result);return result

def audio(key,text):
 cache=CACHE/(hashlib.sha256(('Tingting:140:v1:'+text).encode()).hexdigest()+'.wav')
 if not cache.exists():
  temp=cache.with_suffix('.partial.wav')
  subprocess.run(['say','-v','Tingting','-r','140','-o',str(temp),'--data-format=LEI16@22050',text],check=True,stdout=subprocess.DEVNULL)
  temp.rename(cache)
 with wave.open(str(cache)) as w:
  assert w.getnchannels()==1 and w.getsampwidth()==2
  rate=w.getframerate();samples=array.array('h',w.readframes(w.getnframes()));duration=len(samples)/rate*1000
 if sys.byteorder!='little':samples.byteswap()
 hop=round(rate*.02);energy=[sum(v*v for v in samples[i:i+hop])/len(samples[i:i+hop]) for i in range(0,len(samples),hop)]
 voiced=[i*hop/rate for i,e in enumerate(energy) if e>max(100,max(energy)*.004)]
 assert voiced, f'Silent speech: {text}'
 spoken=max(1,sum(c.isalnum() for c in text));n=0;starts=[]
 for c in text:
  starts.append(round(voiced[min(len(voiced)-1,int(n*len(voiced)/spoken))],3));n+=c.isalnum()
 return asset('audio-'+key,'audio',cache.read_bytes(),text=text,durationMs=duration,cues=dict(text=text,starts=starts,status='estimated'))

def scene(stage,title,words=None):
 color=colors[stage-1];title=html.escape(title)
 svg=f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 420"><rect width="600" height="420" rx="26" fill="{color}"/><circle cx="525" cy="55" r="25" fill="#edcb7e"/><path d="M0 315Q140 250 290 315T600 300V420H0" fill="#b9cea9"/><path d="M50 310V180M50 250L24 223M50 230L79 202" stroke="#9e8b65" stroke-width="9"/><circle cx="50" cy="164" r="43" fill="#91b58a"/><path d="M470 320V219H556V320" fill="#faf2d9"/><path d="M452 219L513 167L574 219Z" fill="#c79379"/><path d="M503 320V266Q513 249 526 266V320" fill="#96ac99"/>'
 if words:
  svg+=f'<text x="300" y="53" text-anchor="middle" font-family="sans-serif" font-size="24" fill="#46594c">{title}</text>'
  for i,w in enumerate(words):
   x=85+(i%3)*155;y=83+(i//3)*130
   svg+=f'<rect x="{x}" y="{y}" width="135" height="108" rx="16" fill="#fffaf0"/><text x="{x+67}" y="{y+48}" text-anchor="middle" font-size="32">{html.escape(w[1])}</text><text x="{x+67}" y="{y+85}" text-anchor="middle" font-family="sans-serif" font-size="20" fill="#46594c">{html.escape(w[0])}</text>'
 else:
  for x,y in [(20,24),(72,24),(46,51),(20,79),(75,79)]:
   svg+=f'<rect x="{x*6-33}" y="{y*4.2-24}" width="66" height="48" rx="10" fill="#fff8de" stroke="#c7af83" stroke-width="3"/>'
 return (svg+'</svg>').encode()

for stage,title in enumerate(source['stages'],1):
 order=stage+2;tid=f'curriculum-stage-{stage}';sid=f'curriculum-scene-{stage}'
 m['themes'].append(dict(id=tid,title=('生活基础进阶' if stage==1 else title),subtitle=f'1000字课程 · 第{stage}阶 · 可分次学',icon=icons[stage-1],order=order))
 asset('image-'+sid,'image',scene(stage,title))
 m['huntScenes'].append(dict(id=sid,imageAssetId='image-'+sid,themeIds=[tid],description='原创花园字牌场景，五处位置',slots=[dict(id=f'slot-{i}',x=x,y=y,clue=clue) for i,(x,y,clue) in enumerate([(20,24,'看看左上方的字牌。'),(72,24,'看看右上方的字牌。'),(46,51,'看看中间的字牌。'),(20,79,'看看左下方的字牌。'),(75,79,'看看右下方的字牌。')])]))

reviews={r['after']:r for r in source['reviewUnits']}
for unit in source['lessons'][6:]:
 lid=unit['id'].lower();chars=[]
 for w in unit['words']:
  c=w['character'];cid='han-'+format(ord(c),'x');word=w['word'];ico=char_icons.get(c,icons[unit['stage']-1])
  chars.append(dict(id=cid,text=c,word=word,example=f'在“{word}”里认识“{c}”。和家长一起读，再说说这个词。',icon=ico,audio=cid,audioText=word))
  # Say the whole word: keeps polyphonic characters in context and avoids false single-character transcripts.
  a=audio(cid,word);alias=dict(a,id='audio-word-'+cid);m['assets'].append(alias)
 intro=f'一起学习：{unit["title"]}。五个新字，可以分两次认识。';introkey='intro-'+lid;storykey='story-'+lid
 audio(introkey,intro);audio(storykey,unit['readTogether'])
 img='image-lesson-'+lid;asset(img,'image',scene(unit['stage'],unit['title'],[(c['word'],c['icon']) for c in chars]))
 steps=[dict(id='intro',kind='intro',title=unit['title'],subtitle='先认三个，再认两个；累了可以下次继续。',audio=introkey)]
 for kind,title,subtitle in [('teach','一起认识这个字','在词语里听一听、认一认。'),('word','读词语','先听一听，再和家长一起读。'),('sound','听词语，找汉字','听完整词语，选出这个词里的目标字。'),('meaning','读字，找对应的词语','请家长读选项，结合词语说说意思。')]:
  for c in chars:steps.append(dict(id=f'{kind}-{c["id"]}',kind=kind,characterId=c['id'],title=title,subtitle=subtitle,audio=('word-'+c['id'] if kind=='word' else 'meaning' if kind=='meaning' else c['audio'])))
 steps.extend([dict(id='hunt',kind='hunt',title='汉字藏在哪里？',subtitle='找出今天认识的五个字。',audio='hunt'),dict(id='story',kind='story',title='读句子',subtitle='和家长一起读，再聊聊发生了什么。',audio=storykey)])
 review=reviews.get(unit['id']) or (reviews['C004'] if unit['id']=='C007' else None);tasks=review['tasks'][:3] if review else []
 # Replace design source IDs in visible tasks with real lesson titles.
 for s in source['lessons']:tasks=[t.replace(s['id'],f'《{s["title"]}》') for t in tasks]
 if int(unit['id'][1:])%20==0:
  for line in (ROOT/'课程设计/1000字课程设计.md').read_text().splitlines():
   cells=[x.strip() for x in line.split('|')]
   if len(cells)==5 and cells[1]==str(unit['stage']):
    tasks += ['阶段共读：'+cells[2], '共读后聊一聊：'+cells[3]]
 m['lessons'].append(dict(id=lid,title=unit['title'],theme=unit['stage']+2,intro=intro,introAudio=introkey,characters=chars,story=dict(text=unit['readTogether'],audio=storykey,note='先共读，再用自己的话回答。',supportCharacters=unit['parentReadCharacters'],question=unit['question'],answer=unit['referenceAnswer']),lifeTask=f'和家长聊一聊：{unit["question"]}',steps=steps,imageAssetId=img,reviewTasks=tasks))
 print(f'{lid}: {len(m["lessons"])} lessons; {len(m["assets"])} assets',flush=True)
allchars=[c['text'] for l in m['lessons'] for c in l['characters']]
assert len(allchars)==len(set(allchars))==1000
(OUT/'manifest.json').write_text(json.dumps(m,ensure_ascii=False,indent=2)+'\n')
print('COMPLETE: 204 lessons, 1000 characters',flush=True)
