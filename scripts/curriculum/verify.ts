import {readFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {validateManifest,isCompatibleExpansion} from '../../packages/contracts/src/index';
import {validatePublication} from '../../apps/api/src/content-validation';
const dir=process.argv[2]||'curriculum-release';
const base=validateManifest(JSON.parse(await readFile(`${dir}/base.json`,'utf8')));
const m=validatePublication(JSON.parse(await readFile(`${dir}/manifest.json`,'utf8')),base);
if(!isCompatibleExpansion(m,base))throw new Error('Not additive');
const chars=m.lessons.flatMap(l=>l.characters.map(c=>c.text));
if(chars.length!==1000||new Set(chars).size!==1000||m.lessons.length!==204)throw new Error('Incomplete curriculum');
let questions=0;
for(const l of m.lessons){
 for(const c of l.characters)for(const kind of ['teach','word','sound','meaning'])if(l.steps.filter(s=>s.kind===kind&&s.characterId===c.id).length!==1)throw new Error(`Missing ${kind}: ${c.id}`);
 if(l.characters.length===5&&(!l.story.question||!l.story.answer))throw new Error(`Missing comprehension ${l.id}`);
 for(const c of l.characters){const options=l.characters.filter((x,i,all)=>x.id===c.id||(x.word!==c.word&&all.findIndex(a=>a.word===x.word)===i));if(options.length<2||new Set(options.map(x=>x.word)).size!==options.length)throw new Error(`Ambiguous quiz ${c.id}`);questions+=2;}
}
for(const a of m.assets){const bytes=await readFile(`${dir}/files/${a.objectKey}`);if(bytes.length!==a.bytes||createHash('sha256').update(bytes).digest('hex')!==a.sha256)throw new Error(`Bad asset ${a.id}`);if(a.kind==='audio'&&bytes.toString('ascii',0,4)!=='RIFF')throw new Error(`Invalid WAV ${a.id}`);}
console.log(JSON.stringify({release:m.releaseId,lessons:m.lessons.length,characters:chars.length,quizQuestions:questions,assets:m.assets.length,stageChecks:m.lessons.filter(l=>l.reviewTasks?.some(t=>t.startsWith('阶段共读：'))).length,legacyUnchanged:true},null,2));
