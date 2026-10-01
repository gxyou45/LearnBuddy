"""Reproduce the two tracing targets per lesson from the pinned Hanzi Writer Data checkout.
Usage: python3 scripts/strokes/prepare.py /path/to/hanzi-writer-data
Original JSON is copied byte-for-byte. Existing ten targets stay enabled.
"""
import json, shutil, sys
from pathlib import Path
root = Path(__file__).resolve().parents[2]
source = Path(sys.argv[1]) / 'data'
static = json.loads((root/'apps/web/public/static-content/manifest.json').read_text())
design = json.loads((root/'课程设计/1000字课程.json').read_text())
legacy = dict(zip(['family','home','welcome','pets','snack','pond','basket','sky','plants','positions'], '妈人来小水鸟有山木大'))
lessons = [{'lessonId': l['id'], 'characters': [{'characterId':c['id'],'text':c['text']} for c in l['characters']]} for l in static['lessons'][:10]]
lessons += [{'lessonId':l['id'].lower(), 'characters':[{'characterId':f'han-{ord(c):x}','text':c} for c in l['targets']]} for l in design['lessons'][6:]]
assert len(lessons) == 204
records, config = {}, []
for lesson in lessons:
    available = []
    for c in lesson['characters']:
        path = source / (c['text']+'.json')
        if path.exists():
            data = json.loads(path.read_text())
            assert data['strokes'] and len(data['strokes']) == len(data['medians'])
            available.append((c, data))
    available.sort(key=lambda pair:(pair[0]['text'] != legacy.get(lesson['lessonId']), len(pair[1]['strokes'])))
    assert len(available) >= 2, lesson['lessonId']
    selected = available[:2]
    config.append({'lessonId':lesson['lessonId'], 'characters':[c for c, _ in selected]})
    for c, data in selected:
        records[c['text']] = data
        destination = root/'apps/web/public/strokes'/(c['text']+'.json')
        if destination.exists():
            assert json.loads(destination.read_text()) == data, 'Never replace existing tracing geometry'
        else:
            shutil.copyfile(source/(c['text']+'.json'), destination)
(root/'apps/web/src/lessonInteractions.json').write_text(json.dumps(config, ensure_ascii=False, indent=2)+'\n')
header = '''// Original Hanzi Writer Data records; Arphic Public License (public/strokes/).
// Pinned source: chanind/hanzi-writer-data@68d10a4b21150cae5e1ebbd223eed289cf32d90c.
// Reproduce with scripts/strokes/prepare.py. Keep geometry stable for saved v1 positions.
export type StrokeData={strokes:string[];medians:[number,number][][];radStrokes?:number[]};
export const strokeData:Record<string,StrokeData>='''
(root/'apps/web/src/strokeData.ts').write_text(header+json.dumps(records,ensure_ascii=False,separators=(',',':'))+';\n')
print(f'{len(config)} lessons, {len(records)} characters, two tracing targets each')
