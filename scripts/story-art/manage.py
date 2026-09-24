"""Persist generated story assets without overwriting existing illustrations."""
from pathlib import Path
import json,sys,shutil,hashlib,datetime
ROOT=Path('apps/web/src/story-art'); Q=ROOT/'production-queue.json'; B=ROOT/'briefs.json'
def save(p,d):
 tmp=p.with_suffix('.tmp');tmp.write_text(json.dumps(d,ensure_ascii=False,indent=2)+'\n');tmp.replace(p)
q=json.loads(Q.read_text()); briefs=json.loads(B.read_text())
if sys.argv[1]=='record':
 id,source=sys.argv[2:4];row=next(r for r in q['lessons'] if r['id']==id)
 dst=ROOT/'images'/f'{id}.png';src=Path(source)
 if dst.exists() or any(b['id']==id for b in briefs):raise SystemExit(f'{id} already exists; refusing overwrite')
 raw=src.read_bytes()
 if raw[:8]!=b'\x89PNG\r\n\x1a\n':raise SystemExit('Expected PNG')
 shutil.copy2(src,dst)
 briefs.append({k:row[k] for k in ['id','title','story','prompt']}|{'alt':row['story'],'method':'built-in image_gen','file':f'images/{id}.png'})
 order={r['id']:r['order'] for r in q['lessons']};briefs.sort(key=lambda b:order[b['id']]);save(B,briefs)
 row.update(status='generated',file=f'images/{id}.png',sha256=hashlib.sha256(raw).hexdigest(),generatedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 q['nextLessonId']=next((r['id'] for r in q['lessons'] if r['status']=='pending'),None)
 q['productionStatus']='generating' if q['nextLessonId'] else 'complete'
 save(Q,q)
 print(json.dumps({'id':id,'newlyGenerated':sum(r['status']=='generated' for r in q['lessons']),'totalReady':len(briefs),'remaining':sum(r['status']=='pending' for r in q['lessons'])}))
elif sys.argv[1]=='next':
 pending=[r for r in q['lessons'] if r['status']=='pending'];print(json.dumps(pending[0] if pending else None,ensure_ascii=False))
