import {it,expect} from 'vitest';
import {selectReviewItems,type ReviewCandidate} from '@learnbuddy/contracts';
import {guestReviewItems} from '../apps/web/src/reviewSelection';
import {fresh,type Attempt} from '../apps/web/src/progress';
const today='2026-09-30';
const item=(targetId:string,change:Partial<ReviewCandidate>={}):ReviewCandidate=>({targetId,kind:'sound',dueDate:today,wrongCount:0,status:'consolidating',...change});
it('caps garden at five different characters and keeps the selected task type',()=>{
 const rows=Array.from({length:40},(_,i)=>item(`c-${i}`,{dueDate:'2026-09-01'}));
 rows.push(item('wo',{kind:'meaning',status:'practice',wrongCount:2}),item('wo',{wrongCount:1}));
 const before=structuredClone(rows),result=selectReviewItems(rows,today);
 expect(result).toHaveLength(5);expect(new Set(result.map(x=>x.targetId)).size).toBe(5);
 expect(result[0]).toEqual(item('wo',{kind:'meaning',status:'practice',wrongCount:2}));expect(rows).toEqual(before);
 expect(selectReviewItems([...rows].reverse(),today)).toEqual(result);
});
it('excludes future items from garden and demotes old errors that are now stable',()=>{
 const rows=[item('future',{dueDate:'2099-01-01',wrongCount:99,status:'practice'}),item('stable',{wrongCount:100,status:'stable'}),item('needs-help',{status:'practice'}),item('overdue',{dueDate:'2026-08-01'})];
 expect(selectReviewItems(rows,today).map(x=>x.targetId)).toEqual(['needs-help','overdue','stable']);
});
it('mixes at most two current and three historical targets without padding or inventing questions',()=>{
 const rows=['own-a','own-b','own-c','past-a','past-b','past-c','past-d'].map(id=>item(id));
 const own=['own-a','own-b','own-c'];
 const result=selectReviewItems(rows,today,own);
 expect(result.map(x=>x.targetId)).toEqual(['own-a','own-b','past-a','past-b','past-c']);
 expect(selectReviewItems([rows[0]],today,own)).toHaveLength(1);
 expect(selectReviewItems([],today,own)).toEqual([]);
 expect(selectReviewItems([item('history',{wrongCount:1,status:'practice',dueDate:'2099-01-01'})],today,own)).toHaveLength(1);
 expect(selectReviewItems([item('stable',{wrongCount:100,status:'stable',dueDate:'2099-01-01'})],today,own)).toEqual([]);
});
it('guest selection uses real attempted kinds, not round-index alternation or unattempted current letters',()=>{
 const attempt=(id:string,kind:Attempt['kind'],change:Partial<Attempt>={}):Attempt=>({id,session:'s',step:`${kind}-${id}`,characterId:id,kind,correct:false,hintUsed:false,skipped:false,date:'2026-09-29',timestamp:1,...change});
 const p={...fresh(),attempts:[attempt('wo','meaning'),attempt('ba','sound',{correct:true}),attempt('ma','sound',{date:today})]};
 const before=structuredClone(p);
 expect(guestReviewItems(p,today).map(x=>[x.targetId,x.kind])).toEqual([['wo','meaning'],['ba','sound']]);
 const end=guestReviewItems(p,today,['ma','ren']);expect(end.some(x=>x.targetId==='ren')).toBe(false);
 expect(p).toEqual(before);
});
it('retry success cannot erase the original wrong candidate or add another question',()=>{
 const p=fresh();p.attempts=[{id:'a',session:'s',step:'sound-wo',characterId:'wo',kind:'sound',correct:false,hintUsed:false,skipped:false,date:'2026-09-29',timestamp:1,retries:[{id:'r',timestamp:2,selectedId:'wo',correct:true,skipped:false}]}];
 expect(guestReviewItems(p,today)).toMatchObject([{targetId:'wo',wrongCount:1,status:'practice'}]);
});
it('guest cooldown crosses entries and kinds, survives serialization, and expires next day',()=>{
 const p=fresh();p.attempts=['sound','meaning'].map(kind=>({id:kind,session:'s',step:`${kind}-wo`,characterId:'wo',kind:kind as Attempt['kind'],correct:false,hintUsed:false,skipped:false,date:'2026-09-29',timestamp:1}));
 p.attempts.push({...p.attempts[0],id:'review',step:'review-sound-wo',date:today,skipped:true});
 const restored=JSON.parse(JSON.stringify(p));
 expect(guestReviewItems(restored,today)).toEqual([]);
 expect(guestReviewItems(restored,today,['wo'])).toEqual([]);
 expect(guestReviewItems(restored,'2026-10-01')).toHaveLength(1);
});
it('guest schedule requires new audio evidence and lesson errors rest before comprehensive practice',()=>{
 const p=fresh();
 const base:Attempt={id:'first',session:'s',step:'sound-wo',characterId:'wo',kind:'sound',correct:true,hintUsed:false,skipped:false,date:'2026-09-28',timestamp:1,scheduleUsable:true};
 p.attempts=[base,{...base,id:'second',date:'2026-09-29',scheduleUsable:false}];
 expect(guestReviewItems(p,today)[0].dueDate).toBe('2026-09-29');
 p.attempts[1].scheduleUsable=true;expect(guestReviewItems(p,today)).toEqual([]);
 expect(guestReviewItems(p,'2026-10-02')[0].dueDate).toBe('2026-10-02');
 p.attempts.push({...base,id:'wrong',date:today,correct:false});
 expect(guestReviewItems(p,today,['wo'])).toEqual([]);
 expect(guestReviewItems(p,'2026-10-01')[0].dueDate).toBe('2026-10-01');
});
