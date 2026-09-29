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
  load = vi.fn(() => { this.currentTime=0; });
  removeAttribute = vi.fn(() => { this.src=''; });
  constructor(public src = '') { FakeAudio.instances.push(this); }
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
  vi.stubGlobal('fetch',vi.fn().mockRejectedValue(new Error('Audio playback failed')));
});
afterEach(async () => { (await import('../apps/web/src/audio')).stopAudio();vi.unstubAllGlobals();vi.useRealTimers(); });

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
  expect(FakeAudio.instances).toHaveLength(1);
  expect(first.pause).toHaveBeenCalled();
  expect(first.removeAttribute).toHaveBeenCalledWith('src');
  first.ontimeupdate?.();
  expect(audio.getPlayback()).toBe(null);
  expect(listener).toHaveBeenCalled();
  unsubscribe();
});

test('a replaced recording cannot change the new recording’s progress', async () => {
  const audio = await import('../apps/web/src/audio');
  await audio.playAudio('word-wo');
  const first = FakeAudio.instances[0];
  const staleTime=first.ontimeupdate,staleEnd=first.onended,staleError=first.onerror;
  await audio.playAudio('word-ba');
  first.currentTime = 3;
  staleTime?.();staleEnd?.();staleError?.();
  expect(audio.getPlayback()?.id).toBe('word-ba');
  first.onerror?.();
  await vi.waitFor(()=>expect(audio.getPlayback()).toBe(null));
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
 const failed=audio.playAudio('ba',true);const rejected=expect(failed).rejects.toThrow('Audio playback failed');await Promise.resolve();FakeAudio.instances[0].onerror?.();await rejected;
 const cancelled=audio.playAudio('ma',true);const stopped=expect(cancelled).rejects.toMatchObject({name:'AbortError'});audio.stopAudio();await stopped;
});

test('a failed media request retries a full WAV download on the same player and completes',async()=>{
 const wav=await import('node:fs').then(fs=>fs.readFileSync('apps/web/public/assets/audio/wo.wav'));
 vi.mocked(fetch).mockResolvedValue(new Response(wav));
 const audio=await import('../apps/web/src/audio');
 const played=audio.playAudio('wo',true);await Promise.resolve();
 const player=FakeAudio.instances[0];player.onerror?.();
 await vi.waitFor(()=>expect(player.src).toMatch(/^blob:/));
 expect(FakeAudio.instances).toHaveLength(1);expect(fetch).toHaveBeenCalledTimes(1);
 player.currentTime=1;player.ontimeupdate?.();expect(audio.getPlayback()?.time).toBe(1);
 player.onended?.();await played;expect(audio.getPlayback()?.ended).toBe(true);expect(player.src).toBe('');
});

test('stopping during retry aborts fetch and cannot restart an old recording',async()=>{
 let signal!:AbortSignal;
 vi.mocked(fetch).mockImplementation((_url,options)=>new Promise((_resolve,reject)=>{signal=options!.signal!;signal.addEventListener('abort',()=>reject(new DOMException('stopped','AbortError')));}));
 const audio=await import('../apps/web/src/audio');
 const played=audio.playAudio('wo',true);const rejected=expect(played).rejects.toMatchObject({name:'AbortError'});
 FakeAudio.instances[0].onerror?.();await vi.waitFor(()=>expect(signal).toBeDefined());
 audio.stopAudio();await rejected;expect(signal.aborted).toBe(true);expect(audio.getPlayback()).toBe(null);
});

test('denied playback permission is not retried',async()=>{
 const audio=await import('../apps/web/src/audio');
 vi.stubGlobal('Audio',class extends FakeAudio{override play=vi.fn().mockRejectedValue(new DOMException('tap required','NotAllowedError'));});
 await expect(audio.playAudio('wo',true)).rejects.toMatchObject({name:'NotAllowedError'});expect(fetch).not.toHaveBeenCalled();
});

test('a stalled stream times out, retries at most twice, and never reports completion',async()=>{
 vi.useFakeTimers();
 const audio=await import('../apps/web/src/audio');
 const played=audio.playAudio('wo',true);const rejected=expect(played).rejects.toThrow();
 await vi.advanceTimersByTimeAsync(15000);await rejected;
 expect(fetch).toHaveBeenCalledTimes(2);expect(audio.getPlayback()).toBe(null);
});

test('download timeouts report failure, not a user cancellation',async()=>{
 vi.useFakeTimers();
 vi.mocked(fetch).mockImplementation((_url,options)=>new Promise((_resolve,reject)=>{
  options!.signal!.addEventListener('abort',()=>reject(new DOMException('aborted','AbortError')));
 }));
 const audio=await import('../apps/web/src/audio');
 const played=audio.playAudio('wo',true);const rejected=expect(played).rejects.toThrow('Audio download timed out');
 FakeAudio.instances[0].onerror?.();
 await vi.advanceTimersByTimeAsync(24000);await rejected;expect(fetch).toHaveBeenCalledTimes(2);
});
