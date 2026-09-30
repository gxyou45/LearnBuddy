import {it,expect} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import queue from '../apps/web/src/story-art/production-queue.json';
import {lessons as legacyLessons} from '../apps/web/src/content';
import briefs from '../apps/web/src/story-art/briefs.json';
import {storyIllustration} from '../apps/web/src/story-art/StoryIllustration';
it('ships distinct real images matching the published story source',()=>{
 const source=JSON.parse(readFileSync('课程设计/1000字课程.json','utf8'));
 expect(briefs.length).toBe(204);expect(new Set(briefs.map(b=>b.id)).size).toBe(briefs.length);
 for(const b of briefs){
  const story=source.lessons.find((l:any)=>l.id.toLowerCase()===b.id)?.readTogether ?? legacyLessons.find(l=>l.id===b.id)?.story.text;
  expect(story,b.id).toBe(b.story);
  const bytes=readFileSync('apps/web/src/story-art/'+b.file);expect(bytes.subarray(1,4).toString()).toBe('PNG');
  expect([bytes.readUInt32BE(16),bytes.readUInt32BE(20)]).toEqual([1536,1024]);
  const registered=queue.lessons.find(x=>x.id===b.id)!;
  expect(registered.story,b.id).toBe(b.story);
  if(registered.status==='generated')expect(registered.file,b.id).toBe(b.file);
  else expect(registered.status,b.id).toBe('existing');
  if('sha256' in registered&&registered.sha256)expect(createHash('sha256').update(bytes).digest('hex'),b.id).toBe(registered.sha256);
  expect(createHash('sha256').update(readFileSync('apps/web/public/static-content/story-art/'+b.file.split('/').pop())).digest('hex'),b.id).toBe(createHash('sha256').update(bytes).digest('hex'));
  expect(storyIllustration(b.id,b.story,'curriculum-1000-v1')?.alt).toBe(b.alt);
 }
});
it('does not apply a story image to changed text, another release or an unillustrated lesson',()=>{
 const b=briefs[0];expect(storyIllustration(b.id,'完全不同的故事','curriculum-1000-v1')).toBeUndefined();
 expect(storyIllustration(b.id,b.story,'another-release')).toBeUndefined();
 expect(storyIllustration('unknown-lesson','','curriculum-1000-v1')).toBeUndefined();
 expect(storyIllustration(b.id,'','curriculum-1000-v1')).toBeDefined();
});
