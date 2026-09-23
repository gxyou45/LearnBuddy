import {beforeEach,it,expect,vi,afterEach} from 'vitest';
import {catalogFixture,packageFixture} from './content-fixture';
import {installCatalog,installLesson,loadCatalog,releaseId,loadLesson,isLessonLoaded,assetURL,lessonData} from '../apps/web/src/contentRepository';
import {fresh,serializeProgress,parseProgress} from '../apps/web/src/progress';
beforeEach(()=>installCatalog(catalogFixture));
afterEach(()=>vi.unstubAllGlobals());
it('rejects mixed versions and incomplete packages before installing',()=>{
 const wrong=packageFixture('family');wrong.releaseId='future';expect(()=>installLesson(wrong)).toThrow('version');
 const missing=packageFixture('family');missing.assets=[];expect(()=>installLesson(missing)).toThrow('Incomplete');expect(isLessonLoaded('family')).toBe(false);
});
it('loads one versioned lesson, deduplicates requests and resolves media URLs',async()=>{
 const fetcher=vi.fn(async()=>({ok:true,json:async()=>packageFixture('family')}));vi.stubGlobal('fetch',fetcher);
 await Promise.all([loadLesson('family'),loadLesson('family')]);expect(fetcher).toHaveBeenCalledTimes(1);
 expect(fetcher.mock.calls[0][0]).toContain('/releases/prototype-v4/lessons/family');
 expect(assetURL('audio-family-reading')).toMatch(/^\/media\/assets\/audio\//);expect(lessonData('family').lesson.story.text).toContain('爸爸');
});
it('can retry a failed request without inventing fallback content',async()=>{
 vi.stubGlobal('fetch',vi.fn().mockResolvedValueOnce({ok:false,status:503}).mockResolvedValueOnce({ok:true,json:async()=>packageFixture('family')}));
 await expect(loadLesson('family')).rejects.toThrow();expect(isLessonLoaded('family')).toBe(false);
 await loadLesson('family');expect(isLessonLoaded('family')).toBe(true);
});
it('records release and stable step IDs, restoring the ID over an obsolete numeric position',()=>{
 const p=JSON.parse(serializeProgress({...fresh(),started:true,step:14,session:'s'}));expect(p.stepId).toBe('story');expect(p.releaseId).toBe('prototype-v4');
 p.step=2;expect(parseProgress(JSON.stringify(p)).step).toBe(14);
 p.releaseId='future';expect(()=>parseProgress(JSON.stringify(p))).toThrow('release');
});

it('ignores an older catalog response after a newer child catalog loads',async()=>{
 const responses:Array<(v:unknown)=>void>=[];vi.stubGlobal('fetch',vi.fn(()=>new Promise(resolve=>responses.push(resolve))));
 const old=loadCatalog('old');const rejected=expect(old).rejects.toThrow('Superseded');const current=loadCatalog('current');
 responses[1]({ok:true,json:async()=>({...catalogFixture,releaseId:'current'})});await current;
 responses[0]({ok:true,json:async()=>({...catalogFixture,releaseId:'old'})});await rejected;expect(releaseId).toBe('current');
});
it('does not install or clear a newer pending lesson when an old request arrives',async()=>{
 const responses:Array<(v:unknown)=>void>=[];const fetcher=vi.fn(()=>new Promise(resolve=>responses.push(resolve)));vi.stubGlobal('fetch',fetcher);
 const old=loadLesson('family');const rejected=expect(old).rejects.toThrow('Superseded');installCatalog(catalogFixture);const current=loadLesson('family');
 responses[0]({ok:true,json:async()=>packageFixture('family')});await rejected;expect(isLessonLoaded('family')).toBe(false);
 const duplicate=loadLesson('family');expect(fetcher).toHaveBeenCalledTimes(2);
 responses[1]({ok:true,json:async()=>packageFixture('family')});await Promise.all([current,duplicate]);expect(isLessonLoaded('family')).toBe(true);
});
