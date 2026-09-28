import {z} from 'zod';

export const huntRoundSchema=z.object({
 version:z.literal(1),roundId:z.string().min(1).max(200),ordinal:z.number().int().nonnegative(),
 sceneId:z.string().min(1),sceneVersion:z.string().regex(/^[a-f0-9]{64}$/),
 placements:z.array(z.object({characterId:z.string().min(1),slotId:z.string().min(1)})).min(1).max(5),
}).strict();
export type HuntRound=z.infer<typeof huntRoundSchema>;
type Scene={id:string;slots:{id:string;x:number;y:number;clue:string}[]};
type Target={id:string};

/** Stable, persisted rotation: replay always moves every target, without randomness on render. */
export function createHuntRound(scene:Scene,sceneVersion:string,targets:Target[],lessonIndex:number,ordinal:number,roundId:string,previous?:HuntRound):HuntRound {
 if(scene.slots.length<targets.length||scene.slots.length<2)throw new Error('Insufficient hunt slots');
 const round=huntRoundSchema.parse({version:1,roundId,ordinal,sceneId:scene.id,sceneVersion,
  placements:targets.map((c,i)=>({characterId:c.id,slotId:scene.slots[(lessonIndex+i+ordinal)%scene.slots.length].id})),
 });
 if(previous?.sceneId===scene.id&&round.placements.every(p=>previous.placements.some(old=>old.characterId===p.characterId&&old.slotId===p.slotId))){
  round.placements=round.placements.map(p=>({...p,slotId:scene.slots[(scene.slots.findIndex(s=>s.id===p.slotId)+1)%scene.slots.length].id}));
 }
 resolveHuntRound(round,scene,sceneVersion,targets);
 return round;
}
export function resolveHuntRound(round:HuntRound,scene:Scene,sceneVersion:string,targets:Target[]) {
 huntRoundSchema.parse(round);
 if(round.sceneId!==scene.id||round.sceneVersion!==sceneVersion)throw new Error('Hunt scene version mismatch');
 if(round.placements.length!==targets.length||new Set(round.placements.map(p=>p.characterId)).size!==targets.length||new Set(round.placements.map(p=>p.slotId)).size!==targets.length)throw new Error('Invalid hunt placements');
 return round.placements.map(p=>{
  const slot=scene.slots.find(s=>s.id===p.slotId);
  if(!slot||!targets.some(c=>c.id===p.characterId))throw new Error('Unknown hunt placement');
  return {...slot,characterId:p.characterId};
 });
}
