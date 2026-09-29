import {Comprehension} from './Comprehension';
import {useEffect,useRef,useState} from 'react';
import {LearningActions} from './LearningActions';
import {characters,shuffled,type Lesson,type Step} from './contentRepository';
import {ReadingText} from './ReadingText';
import {CharacterIllustration,LessonPicture} from './ContentImage';
import {WordCard} from './ReadingPractice';
import {stopAudio} from './audio';
import type {Attempt} from './progress';
import {learningOptions,type LearningSessionState,type RetryAnswer} from '@learnbuddy/contracts';
export type RemoteActivity={presentation:LearningSessionState['presentation'];busy:boolean;answer:(selectedId:string|null,skipped:boolean,retry:boolean)=>Promise<boolean>;hint:()=>Promise<boolean>;audio:(result:'played'|'failed')=>Promise<boolean>};
export function Activity({lesson,step,listen,next,answer,attempt,remote}:{
 lesson:Lesson;step:Step;listen:(id:string,waitForEnd?:boolean)=>void|Promise<boolean|void>;next:()=>void|Promise<boolean|void>;
 answer:(correct:boolean,hint:boolean,skipped:boolean,selectedId:string|null,retry:boolean)=>void;attempt?:Attempt;remote?:RemoteActivity;
}){
 const [localOptions]=useState(()=>shuffled(learningOptions(lesson.characters,step.characterId,step.kind)));
 const remoteOptions=remote?.presentation?.options.map(o=>({...lesson.characters.find(c=>c.id===o.id)!,...o}));
 const options=remoteOptions?(remote?.presentation?.answer?remoteOptions:learningOptions(remoteOptions,step.characterId,step.kind)):localOptions;
 const quiz=step.kind==='sound'||step.kind==='meaning';
 const assisted=step.kind==='sound'&&options.length<2;
 const initial=attempt?.retries?.at(-1)||attempt;
 const [localAnswer,setAnswer]=useState<RetryAnswer|null>(initial?{selectedId:initial.selectedId??null,correct:initial.correct,skipped:initial.skipped}:null);
 const [localRetried,setRetried]=useState(!!attempt?.retries?.length);
 const [localHint,setHint]=useState(!!attempt?.hintUsed);
 const [heard,setHeard]=useState(false),[playing,setPlaying]=useState(false);
 const saved=remote?(remote.presentation?.retries?.at(-1)||remote.presentation?.answer):localAnswer;
 const retried=remote?!!remote.presentation?.retries?.length:localRetried;
 const hint=remote?remote.presentation?.prompted:localHint;
 const solved=!!saved?.correct,done=solved||!!saved?.skipped;
 const retryLimit=(remote?.presentation?.retries?.length||attempt?.retries?.length||0)>=100;
 const c=characters.find(c=>c.id===step.characterId);
 const live=useRef(true),locked=useRef(false),advanced=useRef(false),autoStarted=useRef(false),audioRun=useRef(0);
 const autoAdvanced=useRef(false);
 const latest=useRef({listen,next,remote,saved,done});latest.current={listen,next,remote,saved,done};
 useEffect(()=>{live.current=true;return()=>{live.current=false;audioRun.current++;stopAudio();};},[]);
 const advance=async()=>{if(!live.current||advanced.current||latest.current.remote?.busy)return;advanced.current=true;audioRun.current++;stopAudio();try{await latest.current.next();}finally{if(live.current)advanced.current=false;}};
 useEffect(()=>{
  if((!solved&&!saved?.skipped)||remote?.busy||autoAdvanced.current)return;
  let timer:ReturnType<typeof setTimeout>|undefined;
  const schedule=()=>{clearTimeout(timer);if(!document.hidden)timer=setTimeout(()=>{autoAdvanced.current=true;void advance();},solved?500:0);};
  schedule();document.addEventListener('visibilitychange',schedule);
  return()=>{clearTimeout(timer);document.removeEventListener('visibilitychange',schedule);};
 },[solved,saved?.skipped,remote?.busy]);
 const play=async()=>{
  if(latest.current.remote?.busy||latest.current.done)return;
  const run=++audioRun.current;setPlaying(true);if(step.kind==='sound')setHeard(false);
  let played=false;
  try{played=await latest.current.listen(step.audio,true)===true;}catch{/* Manual playback remains available. */}
  if(!live.current||run!==audioRun.current)return;
  const r=latest.current.remote;
  if(r?.presentation)played=(await r.audio(played?'played':'failed'))&&played;
  if(!live.current||run!==audioRun.current)return;
  setPlaying(false);if(step.kind==='sound')setHeard(played);
 };
 const playRef=useRef(play);playRef.current=play;
 useEffect(()=>{
  if(step.kind!=='sound'||done||remote?.busy||autoStarted.current)return;
  autoStarted.current=true;void playRef.current();
 },[step.kind,done,remote?.busy]);
 const submit=async(id:string|null,skipped=false)=>{
  if(locked.current||latest.current.done||remote?.busy)return;
  if(retryLimit){if(skipped)void advance();return;}
  if(!skipped&&latest.current.saved?.selectedId===id)return;
  if(!skipped&&step.kind==='sound'&&(playing||(!heard&&!hint)))return;
  locked.current=true;
  const retry=!!latest.current.saved;
  const correct=!skipped&&id===step.characterId;
  try{
   if(remote){if(!await remote.answer(id,skipped,retry))return;}
   else{const result={selectedId:id,correct,skipped};latest.current.saved=result;latest.current.done=correct||skipped;setAnswer(result);setRetried(retry);answer(correct,!!hint||assisted,skipped,id,retry);}
   if(live.current&&skipped)advance();
  }finally{locked.current=false;}
 };
 const help=async()=>{
  if(done||remote?.busy)return;
  audioRun.current++;stopAudio();setPlaying(false);
  if(remote)await remote.hint();else setHint(true);
 };
 return <div className={'activity-body activity-'+step.kind}>
  <span className="eyebrow">{step.kind==='teach'?'发现汉字':step.kind==='word'?'把汉字读成词语':quiz?'一起玩一玩':'温暖的小小世界'}</span><h1>{step.title}</h1><p>{step.subtitle}</p>
  {step.kind==='intro'&&<><LessonPicture lessonId={lesson.id}/><div className="mini-characters">{lesson.characters.map(c=>c.text).join(' · ')}</div><p className="parent-note">先请家长陪在身边，点一下声音再出发。</p></>}
  {step.kind==='teach'&&c&&<div className="teaching-card"><div className="character-illustration"><CharacterIllustration character={c}/></div><div className="hanzi"><ReadingText text={c.text} audio={step.audio}/></div><strong><ReadingText text={c.word} audio={'word-'+c.id}/></strong></div>}
  {step.kind==='word'&&c&&<WordCard character={c}/>}
  {step.kind==='meaning'&&c&&<div className="hanzi quiz-hanzi">{c.text}</div>}
  {step.kind==='sound'&&<div className="listening-art" aria-hidden="true">♫</div>}
  {step.kind==='story'&&<><LessonPicture lessonId={lesson.id}/><h2 className="story-text"><ReadingText text={lesson.story.text} audio={lesson.story.audio}/></h2><p className="parent-note">{lesson.story.note}<br/>陪读字：{lesson.story.supportCharacters.join('、')}</p></>}
  <button className="audio-button" disabled={remote?.busy||done} onClick={()=>void play()}>♪ {step.kind==='sound'?'听听要找哪个字':step.kind==='story'?'听完整故事':step.kind==='word'?'听词语':'听一听'}</button>
  {step.kind==='word'&&<p className="parent-note">可以指着文字，和家长读一读。不用录音，也不打分。</p>}
  {assisted&&<p className="parent-note">这些字的读音相同，这题请和家长一起认一认，也可以跳过。</p>}
  {quiz&&<>
   <div className={'answer-grid '+(step.kind==='meaning'?'meaning':'')}>{options.map(o=><button key={o.id} disabled={remote?.busy||done||retryLimit||(step.kind==='sound'&&(playing||(!heard&&!hint)))} className={(saved?.selectedId===o.id?'chosen ':'')+(solved&&o.id===c?.id?'correct':'')} aria-label={step.kind==='sound'?o.text:o.word} onClick={()=>void submit(o.id)}>{step.kind==='sound'?o.text:<><CharacterIllustration character={o}/><small>{o.word}</small></>}</button>)}</div>
   {retryLimit&&!done&&<p className="hint">这题已经练习很多次，可以先跳过，和家长一起休息一下。</p>}
   {saved?.skipped?<p className="hint">这次已跳过，可以继续。</p>:saved?<div className="feedback" role="status">{solved?(retried?'重试后答对啦！马上进入下一题。':'找到啦！马上进入下一题。'):'没关系，可以换一个答案再试试，也可以重新听一听。'}</div>:<p className="muted" role="status">{step.kind==='sound'?(playing?'先听一听，声音播完就可以选啦。':heard?'听完啦，慢慢选，不着急。':hint?'可以和家长一起选择。':'点“听听要找哪个字”播放，也可以请家长帮忙。'):'慢慢选，不着急。'}</p>}
   {hint&&!done&&<p className="hint">一起读「{c?.text}」，它说的是{c?.word}。</p>}
  </>}
  {step.kind==='story'&&<Comprehension lesson={lesson}/>}
  <LearningActions>{quiz&&!done&&<button className="text-button" disabled={remote?.busy||hint} onClick={()=>void help()}>请家长帮一帮</button>}
   {(!quiz||done)?<button className="primary" disabled={remote?.busy} onClick={advance}>{step.kind==='intro'?'准备好啦，出发 →':step.kind==='story'?'读完啦，去综合练习 ✦':step.kind==='word'?'读好了，继续 →':'继续探索 →'}</button>:<button className="text-button" disabled={remote?.busy} onClick={()=>void submit(null,true)}>这次先跳过</button>}
  </LearningActions>
 </div>;
}
