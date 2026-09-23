import {describe,it,expect} from 'vitest';
import {dayInZone,nextDay,independent,characterStable,skillStatus,type Evidence} from '../apps/api/src/learning-rules';
import {learningEventSchema} from '../packages/contracts/src/index';
const evidence=(overrides:Partial<Evidence>={}):Evidence=>({correct:true,prompted:false,skipped:false,audioHeard:true,audioFailed:false,skillType:'sound',createdAt:new Date('2026-09-22T08:00:00Z'),...overrides});
describe('online learning evidence',()=>{
 it('does not count prompts, skips, failed audio, or unheard sound as independent',()=>{for(const change of [{prompted:true},{skipped:true},{audioFailed:true},{audioHeard:false}])expect(independent(evidence(change))).toBe(false);expect(independent(evidence({audioHeard:false,skillType:'meaning'}))).toBe(true);});
 it('requires cross-day and cross-task evidence for character stability',()=>{const sameDay=[evidence(),evidence({skillType:'meaning'}),evidence()];expect(characterStable(sameDay,'Asia/Shanghai')).toBe(false);sameDay[2].createdAt=new Date('2026-09-21T08:00:00Z');expect(characterStable(sameDay,'Asia/Shanghai')).toBe(true);sameDay[0].correct=false;expect(characterStable(sameDay,'Asia/Shanghai')).toBe(false);expect(skillStatus(sameDay,'Asia/Shanghai')).toBe('practice');});
 it('uses the learner timezone and handles year/month boundaries',()=>{expect(dayInZone(new Date('2026-09-21T16:00:00Z'),'Asia/Shanghai')).toBe('2026-09-22');expect(nextDay('2026-12-31')).toBe('2027-01-01');expect(nextDay('2028-02-28')).toBe('2028-02-29');});
 it('does not accept client-computed correctness or forged hint flags',()=>{const input={clientEventId:'11111111-1111-4111-8111-111111111111',sessionId:'22222222-2222-4222-8222-222222222222',expectedRevision:0,type:'answer',presentationId:'33333333-3333-4333-8333-333333333333',selectedId:'wo',skipped:false};expect(learningEventSchema.safeParse(input).success).toBe(true);expect(learningEventSchema.safeParse({...input,correct:true}).success).toBe(false);expect(learningEventSchema.safeParse({...input,prompted:false}).success).toBe(false);});
});

it('uncertain offline dates cannot supply cross-day mastery',()=>{
 const rows=[{correct:true,prompted:false,skipped:false,audioHeard:true,audioFailed:false,skillType:'sound',createdAt:new Date('2026-09-22T01:00:00Z'),timeTrusted:false},{correct:true,prompted:false,skipped:false,audioHeard:true,audioFailed:false,skillType:'meaning',createdAt:new Date('2026-09-21T01:00:00Z')},{correct:true,prompted:false,skipped:false,audioHeard:true,audioFailed:false,skillType:'sound',createdAt:new Date('2026-09-21T02:00:00Z')}];
 expect(characterStable(rows,'Asia/Shanghai')).toBe(false);expect(skillStatus(rows,'Asia/Shanghai')).not.toBe('stable');
});
