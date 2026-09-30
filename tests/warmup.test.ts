import {expect,it} from 'vitest';
import {shouldOfferWarmup,warmupItems} from '../apps/web/src/warmup';

it('offers only for a new lesson with due characters, never for resume or replay',()=>{
 expect(shouldOfferWarmup({started:false,completed:false},2)).toBe(true);
 expect(shouldOfferWarmup({started:false,completed:false},0)).toBe(false);
 expect(shouldOfferWarmup({started:true,completed:false},2)).toBe(false);
 expect(shouldOfferWarmup({started:false,completed:true},2)).toBe(false);
 expect(shouldOfferWarmup({started:true,completed:true},2)).toBe(false);
});
it('keeps at most two unique already-selected tasks, preserving priority and task type',()=>{
 const items=[{targetId:'wo',kind:'meaning'},{targetId:'wo',kind:'sound'},{targetId:'ba',kind:'sound'},{targetId:'ma',kind:'meaning'}];
 const copy=structuredClone(items);
 expect(warmupItems(items)).toEqual([items[0],items[2]]);
 expect(items).toEqual(copy);
 expect(warmupItems([])).toEqual([]);
 expect(warmupItems(items.slice(0,1))).toEqual([items[0]]);
});
