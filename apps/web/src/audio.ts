import { assetURL } from './contentRepository';
type Playback = { id: string; time: number; ended: boolean } | null;
let active: HTMLAudioElement | null = null;
let frame = 0;
let generation = 0;
let cancelCompletion:(()=>void)|null=null;
let playback: Playback = null;
const listeners = new Set<() => void>();
export const getPlayback = () => playback;
export function subscribePlayback(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(value: Playback) {
  playback = value;
  listeners.forEach(listener => listener());
}
export function stopAudio() {
  generation += 1;
  cancelCompletion?.();cancelCompletion=null;
  cancelAnimationFrame(frame);
  const previous = active;
  active = null;
  if (previous) { previous.pause(); previous.currentTime = 0; }
  publish(null);
}
export async function playAudio(id: string,waitForEnd=false) {
  stopAudio();
  const request = generation;
  const audio = new Audio(assetURL(`audio-${id}`));
  active = audio;
  let finish:(error?:Error)=>void=()=>{};
  const completion=waitForEnd?new Promise<void>((resolve,reject)=>{finish=error=>error?reject(error):resolve();}):null;
  void completion?.catch(()=>{});
  if(waitForEnd)cancelCompletion=()=>finish(new DOMException('Playback replaced','AbortError'));
  const update = () => {
    if (active !== audio) return;
    publish({ id, time: audio.currentTime, ended: false });
  };
  const tick = () => { update(); if (active === audio && !audio.paused) frame = requestAnimationFrame(tick); };
  audio.onplaying = () => { if (active === audio) { cancelAnimationFrame(frame); tick(); } };
  audio.ontimeupdate = update;
  audio.onended = () => {
    if (active !== audio) return;
    cancelAnimationFrame(frame);
    active = null;cancelCompletion=null;finish();
    publish({ id, time: audio.duration, ended: true });
  };
  audio.onerror = () => {
    if (active !== audio) return;
    cancelAnimationFrame(frame);
    active = null;cancelCompletion=null;finish(new Error('Audio playback failed'));
    publish(null);
  };
  try { await audio.play();if(completion)await completion; }
  catch (error) {
    if (request !== generation) throw new DOMException('Playback replaced', 'AbortError');
    if (active === audio) stopAudio();
    throw error;
  }
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
