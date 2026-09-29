import {z} from 'zod';

const legacyRoundSchema=z.object({
 version:z.literal(1),roundId:z.string().min(1).max(200),ordinal:z.number().int().nonnegative(),
 sceneId:z.string().min(1),sceneVersion:z.string().regex(/^[a-f0-9]{64}$/),
 placements:z.array(z.object({characterId:z.string().min(1),slotId:z.string().min(1)})).min(1).max(5),
}).strict();
const playRoundSchema=legacyRoundSchema.extend({version:z.literal(2),placements:z.array(z.object({characterId:z.string().min(1),slotId:z.string().min(1),isTarget:z.boolean()}).strict()).min(5).max(7)}).strict().superRefine((r,ctx)=>{
 if(r.placements.filter(p=>p.isTarget).length!==3||new Set(r.placements.map(p=>p.characterId)).size!==r.placements.length||new Set(r.placements.map(p=>p.slotId)).size!==r.placements.length)ctx.addIssue({code:'custom',message:'Invalid play hunt placements'});
});
export const huntRoundSchema=z.union([legacyRoundSchema,playRoundSchema]);
export type HuntRound=z.infer<typeof huntRoundSchema>;
type Scene={id:string;slots:{id:string;x:number;y:number;clue:string}[]};
type Target={id:string;text?:string};

/** Stable, persisted rotation: replay always moves every target, without randomness on render. */
export function createHuntRound(scene:Scene,sceneVersion:string,targets:Target[],lessonIndex:number,ordinal:number,roundId:string,previous?:HuntRound):HuntRound {
 if(scene.slots.length<targets.length||scene.slots.length<2)throw new Error('Insufficient hunt slots');
 const round=legacyRoundSchema.parse({version:1,roundId,ordinal,sceneId:scene.id,sceneVersion,
  placements:targets.map((c,i)=>({characterId:c.id,slotId:scene.slots[(lessonIndex+i+ordinal)%scene.slots.length].id})),
 });
 if(previous?.sceneId===scene.id&&round.placements.every(p=>previous.placements.some(old=>old.characterId===p.characterId&&old.slotId===p.slotId))){
  round.placements=round.placements.map(p=>({...p,slotId:scene.slots[(scene.slots.findIndex(s=>s.id===p.slotId)+1)%scene.slots.length].id}));
 }
 resolveHuntRound(round,scene,sceneVersion,targets);
 return round;
}
export function huntTargetIds(round:HuntRound|undefined,targets:Target[]) {return round?.version===2?round.placements.filter(p=>p.isTarget).map(p=>p.characterId):targets.map(c=>c.id);}
export function resolveHuntRound(round:HuntRound,scene:Scene,sceneVersion:string,targets:Target[],distractors:Target[]=[]) {
 huntRoundSchema.parse(round);
 if(round.sceneId!==scene.id||round.sceneVersion!==sceneVersion)throw new Error('Hunt scene version mismatch');
 if(round.version===2){const texts=round.placements.map(p=>[...targets,...distractors].find(c=>c.id===p.characterId)?.text);if(texts.some(t=>!t)||new Set(texts).size!==texts.length)throw new Error('Duplicate or unknown hunt glyph');}
 if(round.version===1&&(round.placements.length!==targets.length||new Set(round.placements.map(p=>p.characterId)).size!==targets.length||new Set(round.placements.map(p=>p.slotId)).size!==targets.length))throw new Error('Invalid hunt placements');
 return round.placements.map(p=>{
  const slot=scene.slots.find(s=>s.id===p.slotId);
  const isTarget=!('isTarget' in p)||p.isTarget;
  const decoy=distractors.find(c=>c.id===p.characterId);
  if(!slot||!(isTarget?targets:distractors).some(c=>c.id===p.characterId)||(!isTarget&&targets.some(c=>c.id===p.characterId||c.text===decoy?.text)))throw new Error('Unknown hunt placement');
  return {...slot,characterId:p.characterId,isTarget};
 });
}

/** Content-enabled v2 only. Current lesson letters can never become distractors. */
export function createPlayHuntRound(scenes:(Scene&{sha256:string})[],targets:(Target&{text:string})[],candidates:(Target&{text:string})[],lessonIndex:number,ordinal:number,roundId:string,previousSceneId?:string,previous?:HuntRound, count:2|3|4=ordinal===0?2:3):HuntRound {
 if(targets.length<3||new Set(targets.map(c=>c.text)).size!==targets.length)throw new Error('Invalid hunt targets');
 const available=scenes.filter(s=>s.slots.length>=3+count);
 const alternatives=available.filter(s=>s.id!==previousSceneId);
 if(available.length<2)throw new Error('Two complete hunt scenes required');
 const scene=(alternatives.length?alternatives:available)[(lessonIndex+ordinal)%(alternatives.length||available.length)];
 const excluded=new Set(targets.map(c=>c.text)),ids=new Set(targets.map(c=>c.id));
 const pool=candidates.filter(c=>{if(excluded.has(c.text)||ids.has(c.id))return false;excluded.add(c.text);ids.add(c.id);return true;});
 if(pool.length<count)throw new Error('Insufficient distinct hunt distractors');
 const selected=Array.from({length:3},(_,i)=>targets[(ordinal+i)%targets.length]);
 const entries=[...selected.map(c=>({...c,isTarget:true})),...pool.slice(0,count).map(c=>({...c,isTarget:false}))];
 let offset=(lessonIndex+ordinal)%scene.slots.length;
 if(previous&&entries.filter(c=>c.isTarget).every((c,i)=>previous.placements.some(p=>p.characterId===c.id&&p.slotId===scene.slots[(i+offset)%scene.slots.length].id)))offset=(offset+1)%scene.slots.length;
 const round=huntRoundSchema.parse({version:2,roundId,ordinal,sceneId:scene.id,sceneVersion:scene.sha256,placements:entries.map((c,i)=>({characterId:c.id,isTarget:c.isTarget,slotId:scene.slots[(i+offset)%scene.slots.length].id}))});
 resolveHuntRound(round,scene,scene.sha256,targets,pool);return round;
}
