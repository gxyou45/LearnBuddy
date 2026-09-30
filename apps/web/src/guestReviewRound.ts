import {learningOptions} from '@learnbuddy/contracts';
import {lessons,releaseId,shuffled} from './contentRepository';
export type GuestReviewRound={id:string;releaseId:string;entry:'garden'|'comprehensive'|'warmup';lessonId:string|null;index:number;closed:boolean;items:{targetId:string;kind:'sound'|'meaning';lessonId:string;optionIds:string[];prompted:boolean}[]};
export function createGuestReviewRound(id:string,entry:GuestReviewRound['entry'],lessonId:string|null,items:readonly {targetId:string;kind:'sound'|'meaning';lessonId:string}[]):GuestReviewRound{
 return {id,entry,lessonId,releaseId,index:0,closed:false,items:items.map(item=>({...item,optionIds:shuffled(learningOptions(lessons.find(l=>l.id===item.lessonId)!.characters,item.targetId,item.kind)).map(c=>c.id),prompted:false}))};
}
export function validateGuestReviewRound(value:unknown):GuestReviewRound{
 const r=value as GuestReviewRound;
 if(!r||typeof r.id!=='string'||!r.id||r.id.length>100||r.releaseId!==releaseId||!['garden','comprehensive','warmup'].includes(r.entry)||!(r.lessonId===null||lessons.some(l=>l.id===r.lessonId))||typeof r.closed!=='boolean'||!Array.isArray(r.items)||!r.items.length||r.items.length>(r.entry==='warmup'?2:5)||!Number.isInteger(r.index)||r.index<0||r.index>r.items.length||new Set(r.items.map(i=>i.targetId)).size!==r.items.length)throw new Error('Invalid review round');
 for(const i of r.items){
  const lesson=lessons.find(l=>l.id===i.lessonId);
  if(!lesson||!lesson.characters.some(c=>c.id===i.targetId)||!['sound','meaning'].includes(i.kind)||typeof i.prompted!=='boolean'||!Array.isArray(i.optionIds))throw new Error('Invalid review item');
  const expected=learningOptions(lesson.characters,i.targetId,i.kind).map(c=>c.id);
  if(i.optionIds.length!==expected.length||new Set(i.optionIds).size!==expected.length||i.optionIds.some(id=>!expected.includes(id)))throw new Error('Invalid review options');
 }
 return r;
}
