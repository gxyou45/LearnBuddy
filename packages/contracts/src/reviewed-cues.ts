import {readingCueSchema,validateReadingCues,type ReadingCues} from './reading-cues.js';

/** Separate from generated estimates: stale human work must fail, never silently disappear. */
export function applyReviewedCues<T extends {id:string;text?:string;sha256:string;durationMs?:number;cues?:ReadingCues}>(assets:T[],input:unknown):T[] {
 if(!input || typeof input!=='object' || Array.isArray(input))throw new Error('Invalid reviewed cue registry');
 const entries=Object.entries(input);
 for(const [id,raw] of entries) {
  const asset=assets.find(a=>a.id===id);
  if(!asset)throw new Error(`Unknown reviewed audio: ${id}`);
  const cues=readingCueSchema.parse(raw);
  if(cues.status!=='reviewed')throw new Error(`Expected reviewed cues: ${id}`);
  validateReadingCues(cues,asset.text,asset.sha256,asset.durationMs);
 }
 return assets.map(a=>Object.hasOwn(input,a.id)?{...a,cues:readingCueSchema.parse((input as Record<string,unknown>)[a.id])}:a);
}
