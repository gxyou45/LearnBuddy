import { beforeEach, afterEach, expect, test, vi } from 'vitest';
import { readingTimings } from '../apps/web/src/readingTimings';
import { lessons } from '../apps/web/src/content';
import { existsSync } from 'node:fs';

class FakeAudio {
  static instances: FakeAudio[] = [];
  currentTime = 0;
  duration = 4;
  paused = true;
  onplaying: (() => void) | null = null;
  ontimeupdate: (() => void) | null = null;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;
  play = vi.fn(async () => { this.paused = false; this.onplaying?.(); });
  pause = vi.fn(() => { this.paused = true; });
  constructor(public src: string) { FakeAudio.instances.push(this); }
}
beforeEach(async () => {
  vi.resetModules();
  const repo=await import('../apps/web/src/contentRepository');
  const fixture=await import('./content-fixture');
  repo.installCatalog(fixture.catalogFixture);repo.installLesson(fixture.packageFixture('family'));
  FakeAudio.instances = [];
  vi.stubGlobal('Audio', FakeAudio);
  vi.stubGlobal('document', { hidden: false, addEventListener: vi.fn() });
  vi.stubGlobal('requestAnimationFrame', vi.fn(() => 1));
  vi.stubGlobal('cancelAnimationFrame', vi.fn());
});
afterEach(() => vi.unstubAllGlobals());

test('progress follows media time, completes, and resets on replay or navigation', async () => {
  const audio = await import('../apps/web/src/audio');
  const listener = vi.fn();
  const unsubscribe = audio.subscribePlayback(listener);
  await audio.playAudio('family-reading');
  const first = FakeAudio.instances[0];
  first.currentTime = 1.5;
  first.ontimeupdate?.();
  expect(audio.getPlayback()).toEqual({ id: 'family-reading', time: 1.5, ended: false });
  first.onended?.();
  expect(audio.getPlayback()?.ended).toBe(true);
  await audio.playAudio('family-reading');
  expect(audio.getPlayback()?.time).toBe(0);
  audio.stopAudio();
  expect(audio.getPlayback()).toBe(null);
  expect(FakeAudio.instances[1].pause).toHaveBeenCalled();
  first.ontimeupdate?.();
  expect(audio.getPlayback()).toBe(null);
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

test('a replaced recording cannot change the new recording’s progress', async () => {
  const audio = await import('../apps/web/src/audio');
  await audio.playAudio('word-wo');
  const first = FakeAudio.instances[0];
  await audio.playAudio('word-ba');
  first.currentTime = 3;
  first.ontimeupdate?.();
  first.onended?.();
  first.onerror?.();
  expect(audio.getPlayback()?.id).toBe('word-ba');
  FakeAudio.instances[1].onerror?.();
  expect(audio.getPlayback()).toBe(null);
});

test('a delayed play rejection after leaving is treated as cancellation', async () => {
  const audio = await import('../apps/web/src/audio');
  let reject!: (error: Error) => void;
  // Override the constructor just for this pending-play case.
  vi.stubGlobal('Audio', class extends FakeAudio {
    override play = vi.fn(() => new Promise<void>((_, fail) => { reject = fail; }));
  });
  const playing = audio.playAudio('word-wo');
  const result = expect(playing).rejects.toMatchObject({ name: 'AbortError' });
  audio.stopAudio();
  reject(new Error('interrupted'));
  await result;
  expect(audio.getPlayback()).toBe(null);
});

test('every taught character, word and story has matching ordered cues and a recording', () => {
  for (const lesson of lessons) {
    const entries = [lesson.story, ...lesson.characters.flatMap(c => [
      { text: c.text, audio: c.audio }, { text: c.word, audio: `word-${c.id}` },
    ])];
    for (const { text, audio } of entries) {
      const timing = readingTimings[audio];
      expect(timing.text).toBe(text);
      expect(timing.starts).toHaveLength(Array.from(text).length);
      expect(timing.starts.every((start, i) => start >= 0 && (i === 0 || start >= timing.starts[i - 1]))).toBe(true);
      expect(existsSync(`apps/web/public/assets/audio/${audio}.wav`)).toBe(true);
    }
  }
});

test('online sound evidence waits for completion and rejects late playback failure',async()=>{
 const audio=await import('../apps/web/src/audio');
 let completed=false;const full=audio.playAudio('wo',true).then(()=>{completed=true;});await Promise.resolve();expect(completed).toBe(false);FakeAudio.instances[0].onended?.();await full;expect(completed).toBe(true);
 const failed=audio.playAudio('ba',true);const rejected=expect(failed).rejects.toThrow('Audio playback failed');await Promise.resolve();FakeAudio.instances[1].onerror?.();await rejected;
 const cancelled=audio.playAudio('ma',true);const stopped=expect(cancelled).rejects.toMatchObject({name:'AbortError'});audio.stopAudio();await stopped;
});
