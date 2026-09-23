import {Comprehension} from './Comprehension';
import {useEffect,useRef,useState} from 'react';
import {LearningActions} from './LearningActions';
import {characters,shuffled,type Lesson,type Step} from './contentRepository';
import {ReadingText} from './ReadingText';
import {CharacterIllustration,LessonPicture} from './ContentImage';
import {WordCard} from './ReadingPractice';
import type {LearningSessionState} from '@learnbuddy/contracts';
export type RemoteActivity={presentation:LearningSessionState['presentation'];busy:boolean;answer:(selectedId:string|null,skipped:boolean)=>Promise<boolean>;hint:()=>Promise<boolean>;audio:(result:'played'|'failed')=>Promise<boolean>};
export function Activity({ lesson, step, listen, next, answer, answered, remote }: { lesson: Lesson; step: Step; listen: (id: string,waitForEnd?:boolean) => void | Promise<boolean|void>; next: () => void; answer: (correct: boolean, hint: boolean, skipped: boolean) => void; answered: boolean;remote?:RemoteActivity }) {
  const [localOptions] = useState(() => shuffled(lesson.characters.filter((c,i,all)=>!step.characterId || c.id===step.characterId || (c.word!==all.find(x=>x.id===step.characterId)?.word && all.findIndex(x=>x.word===c.word)===i))));
  const options=remote?.presentation?remote.presentation.options.map(o=>({...lesson.characters.find(c=>c.id===o.id)!,...o})):localOptions;
  const [localChoice, setChoice] = useState<string | null>(null);
  const [localHint, setHint] = useState(false);
  const [localHeard, setHeard] = useState(false);
  const choice=remote?remote.presentation?.answer?.selectedId??null:localChoice;
  const hint=remote?remote.presentation?.prompted??false:localHint;
  const heard=remote?remote.presentation?.audioHeard??false:localHeard;
  const saved=remote?.presentation?.answer;
  const live=useRef(true);useEffect(()=>{live.current=true;return()=>{live.current=false;};},[]);
  const submitted = useRef(false);
  const c = characters.find(c => c.id === step.characterId);
  const quiz = step.kind === 'sound' || step.kind === 'meaning';
  const submit = (id: string) => { if(remote){void remote.answer(id,false);return;} if (submitted.current) return; submitted.current = true; setChoice(id); answer(id === step.characterId, hint, false); };
  return <div className={`activity-body activity-${step.kind}`}><span className="eyebrow">{step.kind === 'teach' ? '发现汉字' : step.kind === 'word' ? '把汉字读成词语' : quiz ? '一起玩一玩' : '温暖的小小世界'}</span><h1>{step.title}</h1><p>{step.subtitle}</p>
    {step.kind === 'intro' && <><LessonPicture lessonId={lesson.id}/><div className="mini-characters">{lesson.characters.map(c=>c.text).join(' · ')}</div><p className="parent-note">先请家长陪在身边，点一下声音再出发。</p></>}
    {step.kind === 'teach' && c && <div className="teaching-card"><div className="character-illustration"><CharacterIllustration character={c}/></div><div className="hanzi"><ReadingText text={c.text} audio={c.audio}/></div><strong><ReadingText text={c.word} audio={`word-${c.id}`}/></strong></div>}
    {step.kind === 'word' && c && <WordCard character={c}/>}
    {step.kind === 'meaning' && c && <div className="hanzi quiz-hanzi">{c.text}</div>}
    {step.kind === 'sound' && <div className="listening-art" aria-hidden="true">♫</div>}
    {step.kind === 'story' && <><LessonPicture lessonId={lesson.id}/><h2 className="story-text"><ReadingText text={lesson.story.text} audio={lesson.story.audio}/></h2><p className="parent-note">{lesson.story.note}<br/>陪读字：{lesson.story.supportCharacters.join('、')}，可以请家长帮忙读。</p></>}
    <button className="audio-button" disabled={remote?.busy||!!saved} onClick={async() => {if(!remote){setHeard(true);void listen(step.audio);return;}const played=await listen(step.audio,step.kind==='sound');if(!live.current)return;if(remote.presentation)await remote.audio(played===true?'played':'failed');}}>♪ {step.kind === 'sound' ? '听听要找哪个字' : step.kind === 'story' ? '听完整故事' : step.kind === 'word' ? '听词语' : '听一听'}</button>
    {step.kind === 'word' && <p className="parent-note">可以指着文字，和家长读一读。不用录音，也不打分。</p>}
    {quiz && <><div className={`answer-grid ${step.kind === 'meaning' ? 'meaning' : ''}`}>{options.map(o => <button key={o.id} disabled={remote?.busy || !!saved || choice !== null || (step.kind === 'sound' && !heard && !hint && !answered)} className={`${choice === o.id ? 'chosen' : ''} ${choice !== null && o.id === c?.id ? 'correct' : ''}`} aria-label={step.kind === 'sound' ? o.text : o.word} onClick={() => submit(o.id)}>{step.kind === 'sound' ? o.text : <><CharacterIllustration character={o}/><small>{o.word}</small></>}</button>)}</div>{saved?.skipped?<p className="hint">这次已跳过，可以继续。</p>:choice !== null ? <div className="feedback" role="status">{(saved?saved.correct:choice === c?.id) ? '找到啦！我们再往前走一小步。' : `没关系，一起看看「${c?.text}」。下次再来认一认。`}</div> : hint || answered ? <p className="hint">一起读「{c?.text}」，它说的是{c?.word}。</p> : <p className="muted">{step.kind === 'sound' && !heard ? '先点上面的声音按钮，也可以请家长帮忙。' : '慢慢选，不着急。'}</p>}
    </>}
    {step.kind==='story' && <Comprehension lesson={lesson}/>}
    <LearningActions>{quiz && <button className="text-button" disabled={remote?.busy||!!saved||hint} onClick={() => {if(remote)void remote.hint();else setHint(true);}}>请家长帮一帮</button>}
    {(!quiz || choice !== null || !!saved) ? <button className="primary" disabled={remote?.busy} onClick={next}>{step.kind === 'intro' ? '准备好啦，出发 →' : step.kind === 'story' ? '读完啦，去综合练习 ✦' : step.kind === 'word' ? '读好了，继续 →' : '继续探索 →'}</button> : <button className="text-button" disabled={remote?.busy} onClick={async() => {if(remote){if(await remote.answer(null,true))next();}else{answer(false,hint,true);next();}}}>这次先跳过</button>}</LearningActions>
  </div>;
}
