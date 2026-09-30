import {it,expect} from 'vitest';
import {reviewSchedule,reviewCooling,addReviewDays,type ReviewEvidence} from '@learnbuddy/contracts';
const a=(day:string,extra:Partial<ReviewEvidence>={}):ReviewEvidence=>({day,correct:true,prompted:false,skipped:false,usable:true,trusted:true,...extra});
it('advances 1 / 3 / 7 days and stays at seven; early practice cannot postpone due',()=>{
 const rows=[a('2026-09-01')];
 expect(reviewSchedule(rows,'2026-09-01')).toEqual({level:1,dueDate:'2026-09-02'});
 rows.push(a('2026-09-02'));expect(reviewSchedule(rows,'2026-09-01')).toEqual({level:2,dueDate:'2026-09-05'});
 rows.push(a('2026-09-03'));expect(reviewSchedule(rows,'2026-09-01').dueDate).toBe('2026-09-05');
 rows.push(a('2026-09-05'));expect(reviewSchedule(rows,'2026-09-01')).toEqual({level:3,dueDate:'2026-09-12'});
 rows.push(a('2026-09-15'));expect(reviewSchedule(rows,'2026-09-01')).toEqual({level:3,dueDate:'2026-09-22'});
});
it('same-day success never upgrades and cannot erase a wrong or prompted attempt',()=>{
 const good=Array.from({length:30},()=>a('2026-09-01'));
 expect(reviewSchedule(good,'2026-09-01').level).toBe(1);
 for(const reset of [{correct:false},{prompted:true}]){
  const rows=[a('2026-08-30'),a('2026-08-31'),a('2026-09-03'),a('2026-09-04',reset),a('2026-09-04')];
  expect(reviewSchedule(rows,'2026-08-30')).toEqual({level:0,dueDate:'2026-09-05'});
  expect(reviewSchedule([...rows].reverse(),'2026-08-30')).toEqual(reviewSchedule(rows,'2026-08-30'));
 }
});
it('skip, audio failure/unheard and untrusted dates preserve due state',()=>{
 for(const invalid of [{skipped:true},{usable:false},{trusted:false}]){
  expect(reviewSchedule([a('2026-09-01'),a('2026-09-02',invalid)],'2026-09-01')).toEqual({level:1,dueDate:'2026-09-02'});
 }
 expect(reviewSchedule([a('2026-09-01',{skipped:true})],'2026-09-01')).toEqual({level:0,dueDate:'2026-09-02'});
});
it('calendar arithmetic spans leap days and year boundaries',()=>{
 expect(addReviewDays('2028-02-28',1)).toBe('2028-02-29');
 expect(addReviewDays('2026-12-29',7)).toBe('2027-01-05');
});
it('cooldown rests all reviewed outcomes and lesson errors/help, but not unanswered items',()=>{
 const base={day:'2026-09-30',review:true,correct:true,prompted:false,skipped:false};
 for(const extra of [{},{correct:false},{prompted:true},{skipped:true}])expect(reviewCooling({...base,...extra},base.day)).toBe(true);
 expect(reviewCooling(base,'2026-10-01')).toBe(false);
 expect(reviewCooling({...base,review:false},base.day)).toBe(false);
 expect(reviewCooling({...base,review:false,correct:false},base.day)).toBe(true);
 expect(reviewCooling({...base,review:false,prompted:true},base.day)).toBe(true);
 expect(reviewCooling({...base,review:false,correct:false,skipped:true},base.day)).toBe(false);
});
