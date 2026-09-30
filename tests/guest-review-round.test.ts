import {it,expect} from 'vitest';
import {createGuestReviewRound,validateGuestReviewRound} from '../apps/web/src/guestReviewRound';
import {fresh,serializeProgress,parseProgress,record} from '../apps/web/src/progress';
const items=[{targetId:'wo',kind:'meaning' as const,lessonId:'family'},{targetId:'ba',kind:'sound' as const,lessonId:'family'}];
it('round, fixed options, prompted state and original answer survive serialization without new evidence',()=>{
 const round=createGuestReviewRound('round-1','warmup','home',items);round.items[0].prompted=true;
 const p=record({...fresh(),reviewRound:round},{id:'answer',session:round.id,step:'review-meaning-wo',characterId:'wo',kind:'meaning',correct:false,hintUsed:true,skipped:false,date:'2026-09-30',timestamp:1,selectedId:'ba'});
 const restored=parseProgress(serializeProgress(p));
 expect(restored.reviewRound).toEqual(round);expect(restored.attempts).toEqual(p.attempts);expect(restored.session).toBe(p.session);
});
it('rejects corrupt, foreign-release, repeated-target and changed-option snapshots',()=>{
 const round=createGuestReviewRound('round-2','garden',null,items);
 for(const change of [{index:3},{releaseId:'foreign'},{items:[round.items[0],round.items[0]]},{items:[{...round.items[0],optionIds:['wo','wo','ba']}]},{items:[]}])expect(()=>validateGuestReviewRound({...round,...change})).toThrow();
});
it('completed or explicitly closed rounds stay closed without filling missing answers',()=>{
 const round={...createGuestReviewRound('round-3','garden',null,items),index:1,closed:true};
 const restored=parseProgress(serializeProgress({...fresh(),reviewRound:round}));
 expect(restored.reviewRound?.closed).toBe(true);expect(restored.attempts).toEqual([]);
});
