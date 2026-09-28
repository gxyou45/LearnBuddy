import {expect,test} from 'vitest';
import {applyReviewedCues,readingPosition,validateReadingCues,type ReadingCues} from '../packages/contracts/src/index';
const hash='a'.repeat(64);
const cues:ReadingCues={text:'爸爸。',starts:[.1,.6,1],ends:[.4,.9,1],status:'reviewed',audioSha256:hash};
const asset={id:'audio-word-ba',sha256:hash,text:cues.text,durationMs:1200,cues:{text:cues.text,starts:[0,.3,.6],status:'estimated' as const}};
test('reviewed cues require exact text and recording version',()=>{
 expect(()=>validateReadingCues(cues,cues.text,hash,1200)).not.toThrow();
 expect(()=>validateReadingCues(cues,'妈妈。',hash,1200)).toThrow(/text/);
 expect(()=>validateReadingCues(cues,cues.text,'b'.repeat(64),1200)).toThrow(/version/);
 expect(()=>validateReadingCues({...cues,audioSha256:undefined},cues.text,hash,1200)).toThrow();
 expect(()=>validateReadingCues({...cues,ends:undefined},cues.text,hash,1200)).toThrow();
});
test('invalid, overlapping, missing and out-of-duration end times are rejected',()=>{
 for(const ends of [[.7,.9,1],[.4,.9],[0,.9,1],[.4,.9,2],[NaN,.9,1]])expect(()=>validateReadingCues({...cues,ends},cues.text,hash,1200)).toThrow();
});
test('gaps and silent punctuation have no current highlight; read progress remains',()=>{
 expect(readingPosition(cues,0)).toEqual({read:-1,current:-1});
 expect(readingPosition(cues,.2)).toEqual({read:0,current:0});
 expect(readingPosition(cues,.5)).toEqual({read:0,current:-1});
 expect(readingPosition(cues,.6)).toEqual({read:1,current:1});
 expect(readingPosition(cues,1)).toEqual({read:2,current:-1});
 expect(readingPosition(cues,.1)).toEqual({read:0,current:0});
 expect(readingPosition({starts:[0,.6]},.7).current).toBe(1);
});
test('generation overlay preserves human work without modifying generated estimates',()=>{
 const result=applyReviewedCues([asset],{[asset.id]:cues});
 expect(result[0].cues).toEqual(cues);expect(asset.cues.status).toBe('estimated');
 expect(()=>applyReviewedCues([{...asset,sha256:'b'.repeat(64)}],{[asset.id]:cues})).toThrow(/version/);
 expect(()=>applyReviewedCues([asset],{missing:cues})).toThrow(/Unknown/);
 expect(()=>applyReviewedCues([asset],{[asset.id]:asset.cues})).toThrow(/reviewed/);
});
