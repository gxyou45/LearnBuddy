import { assetURL } from './contentRepository';
type Playback = { id: string; time: number; ended: boolean } | null;
let active: HTMLAudioElement | null = null;
let player: HTMLAudioElement | null = null;
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
const cancelled=()=>new DOMException('Playback replaced','AbortError');
function resetPlayer(audio:HTMLAudioElement){
 audio.onplaying=audio.ontimeupdate=audio.onended=audio.onerror=null;
 audio.pause();audio.removeAttribute('src');audio.load();
}
async function downloadRecording(url:string,signal:AbortSignal){
 const download=new AbortController(),abort=()=>download.abort();
 if(signal.aborted)throw cancelled();
 signal.addEventListener('abort',abort,{once:true});
 const timer=setTimeout(abort,12000);
 try{
  const response=await fetch(url,{signal:download.signal});
  if(response.status!==200)throw new Error(`Audio request failed (${response.status})`);
  return await response.arrayBuffer();
 }catch(error){
  if(signal.aborted)throw cancelled();
  if(download.signal.aborted)throw new Error('Audio download timed out');
  throw error;
 }finally{clearTimeout(timer);signal.removeEventListener('abort',abort);}
}
export function stopAudio() {
 generation++;
 cancelCompletion?.();cancelCompletion=null;
 cancelAnimationFrame(frame);
 if(active)resetPlayer(active);
 active=null;publish(null);
}
export async function playAudio(id: string,waitForEnd=false) {
 stopAudio();
 const request=generation,url=assetURL(`audio-${id}`);
 // Reuse the user-activated player, and release its previous source on every stop.
 const audio=player??(player=new Audio());active=audio;
 const controller=new AbortController();
 let rejectAttempt:((error:Error)=>void)|undefined,blobURL:string|undefined;
 const releaseBlob=()=>{if(blobURL){URL.revokeObjectURL(blobURL);blobURL=undefined;}};
 cancelCompletion=()=>{controller.abort();rejectAttempt?.(cancelled());releaseBlob();};
 const current=()=>request===generation;
 let started!:(value?:void)=>void,failed!:(error:unknown)=>void;
 const start=new Promise<void>((resolve,reject)=>{started=resolve;failed=reject;});
 void start.catch(()=>{});
 const run=async()=>{
  try{
   for(let attempt=0;attempt<3;attempt++){
    try{
     let source=url;
     if(attempt){
      // Full GET can use the static/offline cache and avoids a broken Range
      // response. Never substitute synthesis or a different recording.
      const bytes=await downloadRecording(url,controller.signal);
      const header=new Uint8Array(bytes,0,Math.min(bytes.byteLength,12));
      if(String.fromCharCode(...header.slice(0,4))!=='RIFF'||String.fromCharCode(...header.slice(8,12))!=='WAVE')throw new Error('Invalid audio response');
      if(!current())throw cancelled();
      blobURL=URL.createObjectURL(new Blob([bytes],{type:'audio/wav'}));source=blobURL;
     }
     if(!current())throw cancelled();
     await new Promise<void>((resolve,reject)=>{
      let timer:ReturnType<typeof setTimeout>;
      let settled=false;
      let lastTime=-1;
      const finish=(error?:Error)=>{if(settled)return;settled=true;clearTimeout(timer);rejectAttempt=undefined;error?reject(error):resolve();};
      rejectAttempt=finish;
      const watchdog=()=>{clearTimeout(timer);timer=setTimeout(()=>finish(new Error('Audio playback timed out')),15000);};
      const update=()=>{if(current()&&!settled)publish({id,time:audio.currentTime,ended:false});};
      const tick=()=>{update();if(current()&&!settled&&!audio.paused)frame=requestAnimationFrame(tick);};
      audio.onplaying=()=>{if(!current()||settled)return;watchdog();cancelAnimationFrame(frame);tick();};
      audio.ontimeupdate=()=>{if(current()&&!settled){if(audio.currentTime>lastTime){lastTime=audio.currentTime;watchdog();}update();}};
      audio.onended=()=>{if(!current()||settled)return;publish({id,time:audio.duration,ended:true});finish();};
      audio.onerror=()=>{if(current())finish(new Error('Audio playback failed'));};
      audio.src=source;audio.load();watchdog();
      // Invoke play on the original tap to retain mobile playback permission.
      void audio.play().then(()=>{if(current()&&!settled)started();},error=>finish(error));
     });
     return;
    }catch(error){
     if(!current())throw cancelled();
     cancelAnimationFrame(frame);resetPlayer(audio);releaseBlob();
     if(attempt===2||(error instanceof DOMException&&error.name==='NotAllowedError'))throw error;
    }
   }
  }finally{
   releaseBlob();
   if(current()){cancelAnimationFrame(frame);resetPlayer(audio);active=null;cancelCompletion=null;}
  }
 };
 const complete=run().catch(error=>{failed(error);if(current())publish(null);throw error;});
 void complete.catch(()=>{});
 return waitForEnd?complete:start;
}
document.addEventListener('visibilitychange', () => { if (document.hidden) stopAudio(); });
