import {z} from 'zod';

export const readingCueSchema=z.object({
 text:z.string(), starts:z.array(z.number().nonnegative()),
 ends:z.array(z.number().nonnegative()).optional(),
 status:z.enum(['estimated','reviewed']),
 audioSha256:z.string().regex(/^[a-f0-9]{64}$/).optional(),
});
export type ReadingCues=z.infer<typeof readingCueSchema>;
export function validateReadingCues(cues:ReadingCues, text:string|undefined, sha256:string, durationMs:number|undefined) {
 readingCueSchema.parse(cues);
 if(cues.text!==text || cues.starts.length!==Array.from(cues.text).length) throw new Error('Cue text mismatch');
 const duration=(durationMs??0)/1000;
 if(cues.starts.some((t,i)=>t>duration || (i>0&&t<cues.starts[i-1]))) throw new Error('Invalid cue time');
 if(cues.ends && (cues.ends.length!==cues.starts.length || cues.ends.some((t,i)=>t<cues.starts[i] || t>duration || (i+1<cues.starts.length&&t>cues.starts[i+1])))) throw new Error('Invalid cue end');
 if(cues.audioSha256 && cues.audioSha256!==sha256) throw new Error('Cue audio version mismatch');
 if(cues.status==='reviewed' && (!cues.audioSha256 || !cues.ends || !cues.starts.length)) throw new Error('Reviewed cues require audio version and end times');
}
export function readingPosition(cues:Pick<ReadingCues,'starts'|'ends'>,time:number) {
 let read=-1;
 cues.starts.forEach((start,i)=>{if(start<=time)read=i;});
 return {read,current:read>=0&&(!cues.ends||time<cues.ends[read])?read:-1};
}
