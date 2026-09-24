import {Comprehension} from './Comprehension';
import {getReviews} from './cloudClient';
import {Activity,type RemoteActivity} from './Activity';
import {useCloud,projectCloud} from './CloudLearning';
import {LegacyImportPanel} from './LegacyImportPanel';
import {MistakesPanel} from './MistakesPanel';
import {LearningActions,LearningActionsContext} from './LearningActions';
import {FamilyShell,useProgressStorage} from './FamilyAccount';
import { ContentBootstrap, ContentStatus, useLessonContent } from './ContentLoading';
import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { characters, shuffled, getSteps, lessons, lessonForCharacter, themes, type Lesson, type CharacterId, type Step } from './contentRepository';
import { dueCharacters, canReadLesson, completedCount, lessonState, startLesson, isUnlocked, recommendedLesson, fresh, localDate, parseProgress, serializeProgress, record, status, type Progress } from './progress';
import { playAudio, stopAudio } from './audio';
import './style.css';
import { ReadingText } from './ReadingText';
import { LessonStages, ReadingPractice, WordCard } from './ReadingPractice';
import { CharacterIllustration } from './ContentImage';
import { LessonPicture } from './ContentImage';
import { HiddenCharacters } from './HiddenCharacters';
import {isStaticDemo} from './staticDemo';

function House({ small = false }: { small?: boolean }) {
  return <svg className={small ? 'house small' : 'house'} viewBox="0 0 420 285" role="img" aria-label="花园里的汉字小屋"><ellipse cx="218" cy="256" rx="160" ry="16" fill="#dce6c5"/><path d="M65 249v-70m0 38-20-17m20 1 17-21" stroke="#798761" strokeWidth="6" strokeLinecap="round"/><circle cx="65" cy="161" r="33" fill="#adc78b"/><circle cx="42" cy="185" r="26" fill="#adc78b"/><circle cx="83" cy="188" r="28" fill="#adc78b"/><rect x="118" y="115" width="189" height="137" rx="12" fill="#ffedc4"/><rect x="126" y="130" width="174" height="14" rx="5" fill="#f5d9a3"/><path d="m95 121 111-92q7-6 14 0l111 92q7 9-6 9H102q-13 0-7-9" fill="#d98262"/><path d="m113 109 99-79 100 79" fill="none" stroke="#eda78b" strokeWidth="6" strokeLinecap="round"/><rect x="269" y="41" width="24" height="47" rx="4" fill="#c97257"/><circle cx="213" cy="93" r="23" fill="#fff5dd"/><text x="213" y="103" textAnchor="middle" fill="#8b694d" fontSize="29" fontWeight="700">字</text><rect x="192" y="169" width="48" height="83" rx="24" fill="#849a6b"/><circle cx="230" cy="216" r="3" fill="#f6e4b8"/><rect x="139" y="162" width="35" height="41" rx="10" fill="#b9d4d0"/><path d="M156 163v39m-16-19h33" stroke="#fff5dd" strokeWidth="4"/><rect x="255" y="162" width="35" height="41" rx="10" fill="#b9d4d0"/><path d="M272 163v39m-16-19h33" stroke="#fff5dd" strokeWidth="4"/><path d="M182 252h67l17 20H168z" fill="#ead6ac"/><path d="M329 253v-30m-7 13 7 7 8-12" stroke="#879864" strokeWidth="4" strokeLinecap="round"/><circle cx="329" cy="218" r="10" fill="#e8a28a"/><circle cx="329" cy="218" r="4" fill="#ffe7a6"/><path d="M103 250v-22" stroke="#879864" strokeWidth="4"/><circle cx="103" cy="222" r="9" fill="#e7bd61"/><path d="M30 63q11-15 22 0m282 51q9-12 18 0" fill="none" stroke="#a8bca0" strokeWidth="3" strokeLinecap="round"/><circle cx="343" cy="47" r="20" fill="#f1d47d"/></svg>;
}
function Icon({ name }: { name: string }) { return <span aria-hidden="true">{name}</span>; }
const uid = () => `${Date.now()}-${Math.random().toString(36).slice(2)}`;
function App() {
  const cloud=useCloud();
  const [actionsHost,setActionsHost]=useState<HTMLDivElement|null>(null);
  const STORAGE_KEY=useProgressStorage();
  const [storageError, setStorageError] = useState('');
  const [blockedStorage, setBlockedStorage] = useState(false);
  const [localP, setP] = useState<Progress>(() => { try { if(cloud){const prefs=JSON.parse(localStorage.getItem(`${STORAGE_KEY}:cloud-preferences`)||'{}');return {...fresh(),sound:typeof prefs.sound==='boolean'?prefs.sound:true,observations:prefs.observations||{}};}return parseProgress(localStorage.getItem(STORAGE_KEY)); } catch { return fresh(); } });
  const p=cloud?projectCloud(cloud.progress,localP):localP;
  const characterStatus=(id:string)=>cloud?cloud.progress.characters.find(c=>c.id===id)?.status||'未开始':status(p,id);
  const [cloudReviewPlan,setCloudReviewPlan]=useState<NonNullable<typeof cloud>['reviews']>([]);
  const [route, setRoute] = useState(location.hash.slice(1) || 'home');
  const [audioError, setAudioError] = useState('');
  const [online, setOnline] = useState(navigator.onLine);
  const [parentGate, setParentGate] = useState(false);
  const [parentVerified, setParentVerified] = useState(false);
  const [resetAsk, setResetAsk] = useState(false);
  const [bookId, setBookId] = useState(location.hash.startsWith('#reader/') ? location.hash.split('/')[1] : 'family');
  const lesson = lessons.find(l => l.id === p.activeLesson) || lessons[0];
  const steps = getSteps(lesson);
  const recommendation = recommendedLesson(p);
  const bookLesson = lessons.find(l => l.id === bookId) || lessons[0];
  const openBook = (id: string) => { setBookId(id); go(`reader/${id}`); };
  const isReader = route === 'reader' || route.startsWith('reader/');
  const isPractice = route.startsWith('practice/');
  const [, practiceId, practiceKind, practiceOrigin] = route.split('/');
  const practiceLesson = lessons.find(l => l.id === practiceId);
  const validPracticeKind = practiceKind === 'words' || practiceKind === 'story';
  const practiceAllowed = practiceLesson && validPracticeKind && canReadLesson(p, practiceLesson.id, practiceKind);
  const returnToLesson = practiceOrigin !== 'reader' && practiceId === p.activeLesson && p.started;
  const practiceBack = () => go(practiceOrigin === 'reader' ? `reader/${practiceId}` : returnToLesson ? 'lesson' : 'home');
  const [review, setReview] = useState<CharacterId[]>([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [reviewSession, setReviewSession] = useState('');
  const neededLesson = route==='lesson'||route==='done' ? lesson.id : isReader ? bookLesson.id : isPractice&&practiceAllowed ? practiceLesson.id : route==='review'&&review[reviewIndex] ? cloud?.reviewSession?.lessonId||lessonForCharacter(review[reviewIndex]).id : undefined;
  const content = useLessonContent(neededLesson);
  const storageBlocked = useRef(false);
  useEffect(() => { if(cloud)return;try { parseProgress(localStorage.getItem(STORAGE_KEY)); } catch { storageBlocked.current = true; setBlockedStorage(true); setStorageError('原有进度暂时无法读取，已保留原始数据。本次可继续体验；请在家长中心选择重置后恢复保存。'); } }, []);
  useEffect(() => {if(cloud){try{localStorage.setItem(`${STORAGE_KEY}:cloud-preferences`,JSON.stringify({sound:localP.sound,observations:localP.observations}));}catch{/* Preferences are optional; cloud state remains authoritative. */}return;} if (storageBlocked.current) return; try { const raw=localStorage.getItem(STORAGE_KEY); if(raw&&!JSON.parse(raw).releaseId&&!localStorage.getItem(`${STORAGE_KEY}:before-api`)) localStorage.setItem(`${STORAGE_KEY}:before-api`,raw); localStorage.setItem(STORAGE_KEY, serializeProgress(p)); } catch { setStorageError('浏览器暂时不能保存进度。本次仍可体验，请检查浏览器存储设置。'); } }, [p]);
  useEffect(() => {
    const hash = () => { stopAudio(); setAudioError(''); setRoute(location.hash.slice(1) || 'home'); if (location.hash.startsWith('#reader/')) setBookId(location.hash.split('/')[1]); };
    const net = () => setOnline(navigator.onLine);
    const storage = (e: StorageEvent) => { if (!cloud && e.key === STORAGE_KEY) { storageBlocked.current = true; setBlockedStorage(true); setStorageError('另一个页面更新了进度。本页已暂停保存，请刷新后继续，避免覆盖。'); } };
    addEventListener('hashchange', hash); addEventListener('online', net); addEventListener('offline', net); addEventListener('storage', storage);
    return () => { removeEventListener('hashchange', hash); removeEventListener('online', net); removeEventListener('offline', net); removeEventListener('storage', storage); };
  }, []);
  useEffect(() => { window.scrollTo(0, 0); document.querySelector('.learning-shell>main')?.scrollTo(0, 0); }, [route, p.activeLesson, p.step, content.ready]);
  useEffect(() => {
    if(cloud){if(route==='lesson'&&!p.started)location.hash='home';return;}
    if (route === 'lesson' && !p.started) setP(old => startLesson(old, old.activeLesson, uid()));
  }, [route]);
  useEffect(() => {
    if (!parentGate && !resetAsk) return;
    const previous = document.activeElement as HTMLElement | null;
    const dialog = document.querySelector<HTMLElement>('[role=dialog]');
    const buttons = dialog?.querySelectorAll<HTMLButtonElement>('button');
    buttons?.[0]?.focus();
    const trap = (event: KeyboardEvent) => {
      if (event.key === 'Escape') { setParentGate(false); setResetAsk(false); }
      if (event.key === 'Tab' && buttons?.length) {
        const first = buttons[0], last = buttons[buttons.length - 1];
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus(); }
      }
    };
    document.addEventListener('keydown', trap);
    return () => { document.removeEventListener('keydown', trap); previous?.focus(); };
  }, [parentGate, resetAsk]);
  const go = (next: string) => { stopAudio(); setAudioError(''); location.hash = next; };
  const listen = async (id: string,waitForEnd=false) => { if (!p.sound) { setAudioError('声音已关闭，可以请家长陪读，也可以到家长中心打开声音。'); return false; } try { setAudioError(''); await playAudio(id,waitForEnd); return true; } catch (e) { if (e instanceof DOMException && e.name === 'AbortError') return false; setAudioError('这段声音暂时没播放出来。请再点一次，也可以和家长一起读。'); return false; } };
  const start = (id = recommendation.id) => { if (!isUnlocked(p,id)) return;if(cloud){void cloud.start(id,()=>go('lesson'));return;} setP(old => startLesson(old,id,uid())); go('lesson'); };
  const lessonStep = steps[p.step] || steps[0];
  useEffect(() => {
    if (cloud || route !== 'lesson' || !content.ready) return;
    const id = lessonStep.characterId;
    if (lessonStep.kind === 'teach' && id) setP(old => old.seen.includes(id) ? old : { ...old, seen: [...old.seen, id] });
  }, [route, lessonStep.id, content.ready]);
  const next = () => {if(cloud){stopAudio();void cloud.event({type:'advance'},s=>{setAudioError('');if(s.completed)go('done');});return;} stopAudio(); setAudioError(''); if (p.step === steps.length - 1) { setP(old => ({ ...old, completed: true, started: false, step: 0 })); go('done'); } else setP(old => ({ ...old, step: old.step + 1 })); };
  const saveAnswer = (step: Step, correct: boolean, hint: boolean, skipped: boolean, session: string) => { if (!step.characterId || (step.kind !== 'sound' && step.kind !== 'meaning')) return; const characterId = step.characterId; const kind = step.kind; if (!skipped && p.sound) void playAudio(correct ? 'answer-correct' : 'answer-incorrect').catch(() => { /* Optional feedback must not interrupt learning. */ }); setP(old => record(old, { id: uid(), session, step: step.id, characterId, kind, correct, hintUsed: hint, skipped, date: localDate(), timestamp: Date.now() })); };
  const nav = [{ id: 'home', icon: '⌂', label: '汉字小屋' }, { id: 'garden', icon: '♧', label: '回顾花园' }, { id: 'books', icon: '▤', label: '我的书架' }];
  const activeLesson = route === 'lesson' || route === 'review' || isPractice || isReader || route === 'done';
  const due = cloud?cloud.reviews.filter((q,i,all)=>all.findIndex(x=>x.targetId===q.targetId)===i).map(q=>characters.find(c=>c.id===q.targetId)!).filter(Boolean):dueCharacters(p);
  const remoteFor=(review=false):RemoteActivity|undefined=>{
   if(!cloud)return undefined;const session=review?cloud.reviewSession:cloud.progress.sessions.find(s=>s.id===cloud.progress.activeSessionId);const presentation=session?.presentation;
   return {presentation:presentation??null,busy:cloud.blocked||!!session?.completed,
    answer:(selectedId,skipped)=>presentation?cloud.event({type:'answer',presentationId:presentation.id,selectedId,skipped},s=>{if(!skipped&&p.sound)void playAudio(s.presentation?.answer?.correct?'answer-correct':'answer-incorrect').catch(()=>{});},review):Promise.resolve(false),
    hint:()=>presentation?cloud.event({type:'hint',presentationId:presentation.id},undefined,review):Promise.resolve(false),
    audio:result=>presentation?cloud.event({type:'audio',presentationId:presentation.id,result},undefined,review):Promise.resolve(false)};
  };
  const startReview=()=>{
   if(!cloud){setReview(due.slice(0,5).map(c=>c.id));setReviewIndex(0);setReviewSession(uid());go('review');return;}
   const plan=cloud.reviews.filter((q,i,all)=>all.findIndex(x=>x.targetId===q.targetId)===i).slice(0,5);if(!plan.length)return;
   void cloud.start(plan[0].lessonId,()=>{setCloudReviewPlan(plan);setReview(plan.map(q=>q.targetId));setReviewIndex(0);go('review');},plan[0]);
  };
  const startComprehensive=async()=>{
   if(!cloud){
    const own=lesson.characters.slice(0,2).map(c=>c.id);
    const past=characters.filter(c=>!own.includes(c.id)&&!lesson.characters.some(x=>x.id===c.id)&&p.attempts.some(a=>a.characterId===c.id&&(!a.correct||a.date<localDate()))).slice(0,3).map(c=>c.id);
    setReview([...own,...past]);setReviewIndex(0);setReviewSession(uid());go('review');return;
   }
   try{const {items}=await getReviews(cloud.progress.learnerId,lesson.id);if(!items.length){setAudioError('这次没有需要复习的题，可以先休息。');return;}await cloud.start(items[0].lessonId,()=>{setCloudReviewPlan(items);setReview(items.map(q=>q.targetId));setReviewIndex(0);go('review');},items[0]);}catch(e){setAudioError(e instanceof Error?e.message:'练习暂时未加载，请联网重试');}
  };
  const nextReview=()=>{
   if(!cloud){stopAudio();if(reviewIndex+1===review.length)go('garden');else setReviewIndex(i=>i+1);return;}
   void cloud.event({type:'advance'},()=>{const item=cloudReviewPlan[reviewIndex+1];if(!item){go('garden');return;}void cloud.start(item.lessonId,()=>setReviewIndex(i=>i+1),item);},true);
  };
  if(!content.ready) return <ContentStatus error={content.error} retry={content.retry} back={()=>go('home')}/>;
  return <LearningActionsContext.Provider value={actionsHost}><div className={`app-shell${activeLesson ? ' learning-shell' : ''}`}>
    <header className="header"><button className="brand" onClick={() => go('home')} aria-label="回汉字小屋"><span className="brand-icon">字</span><span>汉字小屋<small>LEARNBUDDY</small></span></button><button className="parent-link" onClick={() => { setParentGate(true); }}>家长 <span aria-hidden="true">⚙</span></button></header>
    {!online && <div className="notice" role="status">{cloud?'网络断开了，请联网后继续保存学习记录。':'网络断开了，已加载的内容可以继续。声音可能需要联网后重试。'}</div>}
    {storageError && <div className="notice" role="status">{storageError}</div>}
    <main>
      {route === 'home' && <>
        <section className="hero"><div className="eyebrow"><span/> 5–6 岁 · 亲子识字时光</div><h1>一起认汉字，<br/>慢慢读世界。</h1><p>每天一小步，发现文字里的大世界。</p><House/><span className="hero-sticker">今天，也有新发现 ✦</span></section>
        <section className="today"><div className="today-top"><span className="pill">今日的小冒险</span><span className="muted">约 3–6 分钟</span></div><h2>{recommendation.intro} <span>👋</span></h2><p>认识「{recommendation.characters.map(c => c.text).join('、')}」，读一句温暖的话。</p><button className="primary" disabled={cloud?.blocked} onClick={() => start()}>{p.started ? '继续我的冒险' : completedCount(p) === lessons.length ? '再玩一次' : '开始今天的冒险'} <span>→</span></button></section>
        <div className="section-title"><h2>我的成长阶梯</h2><span>{completedCount(p)} / {lessons.length} 次活动</span></div>
        <div className="journey">{themes.map((theme, ti) => <section className={`theme theme-${ti}`} key={theme.title}><div className="theme-heading"><span className="theme-icon">{theme.icon}</span><div><small>第 {ti+1} 阶</small><h3>{theme.title}</h3><p>{theme.subtitle}</p></div><span className="coming">{lessons.filter(l => l.theme === ti && lessonState(p,l.id).completed).length} / {lessons.filter(l => l.theme === ti).length}</span></div><div className="lesson-path">{lessons.filter(l => l.theme === ti).map((item, li) => { const available = isUnlocked(p,item.id); const state = lessonState(p,item.id); return <div className="lesson-node" key={item.id}><button disabled={!available||cloud?.blocked} onClick={() => start(item.id)} aria-label={available ? `${state.completed ? '重玩' : '开始'}${item.title}` : `${item.title}，完成上一课后开启`} className={available ? 'node active' : 'node'}>{state.completed ? '✓' : li+1}</button><span>{item.title}</span>{available && <small>{state.started ? '继续探索' : state.completed ? '已完成' : '从这里出发'}</small>}</div>; })}</div></section>)}</div><p className="footnote">{themes.length} 个主题 · {characters.length} 个汉字 · {lessons.length} 个共读单元</p>
      </>}
      {route === 'lesson' && <div className="activity"><div className="activity-top"><button className="text-button" onClick={() => go('home')}>‹ 回小屋</button><span>{lesson.title} · {p.step + 1}/{steps.length}</span></div><div className="progress-track"><div style={{ width: `${(p.step+1)/steps.length*100}%` }}/></div><LessonStages step={lessonStep} wordsAvailable={canReadLesson(p,lesson.id,'words')} storyAvailable={canReadLesson(p,lesson.id,'story')} open={kind => go(`practice/${lesson.id}/${kind}/lesson`)}/>{lessonStep.kind === 'hunt' ? <HiddenCharacters key={`${p.activeLesson}-${p.session}`} lesson={lesson} found={p.huntFound} disabled={cloud?.blocked} onFind={id => {if(cloud){void cloud.event({type:'hunt',characterId:id});return;}setP(old => old.huntFound.includes(id) ? old : { ...old, huntFound: [...old.huntFound, id] });}} listen={listen} next={next}/> : <Activity remote={remoteFor()} lesson={lesson} key={`${p.activeLesson}-${p.session}-${lessonStep.id}`} step={lessonStep} listen={listen} next={next} answer={(a,b,c) => saveAnswer(lessonStep,a,b,c,p.session)} answered={p.attempts.some(a => a.session === p.session && a.step === lessonStep.id)}/>}</div>}
      {isPractice && (practiceAllowed ? <ReadingPractice key={route} lesson={practiceLesson} kind={practiceKind} listen={listen} back={practiceBack} backLabel={practiceOrigin === 'reader' ? '回到故事' : returnToLesson ? '返回课程' : '回到小屋'}/> : <section className="center-page"><h1>先认识这些字吧</h1><p>学到这里后，就能随时回来读一读。</p><button className="primary" onClick={() => go('home')}>回到小屋</button></section>)}
      {route === 'done' && <section className="center-page"><div className="celebrate">🌼</div><span className="pill">小屋多了一朵花</span><h1>今天，又长大一小步！</h1><p>你和「{lesson.characters.map(c => c.text).join('、')}」见面啦。<br/>一起把这句话读给家人听吧。</p><div className="mini-characters">{lesson.characters.map(c => c.text).join(' · ')}</div><div className="soft-card"><strong>离开屏幕，也有小发现</strong><p>{lesson.lifeTask}</p></div><LearningActions><button className="primary" disabled={cloud?.blocked||cloud?.pending} onClick={()=>void startComprehensive()}>综合练习 · 新字和老朋友 →</button><button className="text-button" onClick={() => openBook(lesson.id)}>打开我的小故事 →</button><button className="text-button" onClick={() => go('home')}>回到汉字小屋</button></LearningActions></section>}
      {route === 'garden' && <section className="inner-page"><span className="eyebrow">让认识的字，再见一面</span><h1>回顾花园</h1><p>不用着急，熟悉也是一点点长出来的。</p><div className="garden-art">🌱 <span>🌼</span> 🌿</div><div className="soft-card"><h2>{due.length ? `${due.length} 个老朋友想见你` : '今天的花园很轻松'}</h2><p>{due.length ? '听一听，认一认，一起给记忆浇点水。' : p.started ? '今天认识的字，明天再来打个招呼吧。' : '先去小屋认识几个汉字，再来这里相遇。'}</p></div>{due.length > 0 && <button className="primary" disabled={cloud?.blocked} onClick={startReview}>开始回顾 →</button>}<button className="text-button" onClick={() => go('home')}>回小屋看看</button></section>}
      {route === 'review' && (review[reviewIndex] ? <section className="activity"><button className="text-button" onClick={() => go('garden')}>‹ 结束回顾</button><p className="muted">老朋友 {reviewIndex+1} / {review.length}</p>{(() => { const id = review[reviewIndex]; const fallback: Step = { id: `review-${id}`, kind: reviewIndex % 2 ? 'meaning' : 'sound', characterId: id, title: reviewIndex % 2 ? '这个字是什么意思？' : '听听，是哪位老朋友？', subtitle: '慢慢来，也可以一起完成。', audio: reviewIndex % 2 ? 'meaning' : id }; const reviewLesson=cloud?.reviewSession?lessons.find(l=>l.id===cloud.reviewSession!.lessonId)!:lessonForCharacter(id);const step=cloud?.reviewSession?getSteps(reviewLesson)[cloud.reviewSession.stepIndex]:fallback;return <Activity remote={remoteFor(true)} lesson={reviewLesson} key={cloud?.reviewSession?.id||step.id} step={step} listen={listen} next={nextReview} answer={(a,b,c) => saveAnswer(step,a,b,c,reviewSession)} answered={false}/>; })()}</section> : <section className="center-page"><h1>从花园开始吧</h1><button className="primary" onClick={() => go('garden')}>回到回顾花园</button></section>)}
      {route === 'books' && <section className="inner-page"><span className="eyebrow">把认识的字，读成故事</span><h1>我的小书架</h1><p>每完成一课，点亮一个图画故事。</p>{themes.map((theme,index) => <section key={theme.title} className="book-group"><h2>{theme.icon} {theme.title}</h2>{lessons.filter(l=>l.theme===index).map(item => { const ready = lessonState(p,item.id).completed; return <button key={item.id} className="book" disabled={!ready} onClick={()=>openBook(item.id)} aria-label={`${ready?'阅读':'未解锁'}${item.title}`}><div className="book-cover"><small>第 {lessons.indexOf(item)+1} 个共读单元</small><LessonPicture lessonId={item.id} interactive={false}/><strong>{item.title}</strong><span>{item.characters.map(c=>c.text).join(' · ')}</span></div><div className="book-caption"><span>{ready ? '一起读一读' : `完成「${item.title}」后打开`}</span><span>{ready?'→':'♡'}</span></div></button>; })}</section>)}</section>}
      {isReader && (lessonState(p,bookLesson.id).completed ? <section className="reader inner-page"><button className="text-button" onClick={() => go('books')}>‹ 回书架</button><span className="eyebrow">亲子共读 · {bookLesson.title}</span><LessonPicture lessonId={bookLesson.id}/><h1><ReadingText text={bookLesson.story.text} audio={bookLesson.story.audio}/></h1><button className="audio-button" onClick={() => listen(bookLesson.story.audio)}>♪ 听完整故事</button><button className="audio-button word-audio" onClick={() => go(`practice/${bookLesson.id}/words/reader`)}>读词语</button><p className="parent-note">陪读小提示：{bookLesson.story.note}<br/>陪读字：{bookLesson.story.supportCharacters.join('、') || '这句话都学过啦'}</p><Comprehension lesson={bookLesson}/><LearningActions><button className="primary" onClick={()=>go('books')}>读完啦 ✓</button></LearningActions></section> : <section className="center-page"><h1>故事还在等你</h1><p>完成「{bookLesson.title}」就可以来读啦。</p><button className="primary" onClick={()=>go('home')}>回到小屋</button></section>)}
      {route === 'parent' && parentVerified && <section className="inner-page parent-page"><span className="eyebrow">陪伴，让每一步更有意义</span><h1>家长中心</h1>{!isStaticDemo&&<button className="primary" onClick={()=>go('account')}>家长账户与孩子档案</button>}<div className="stats"><div><b>{p.seen.length}</b><span>已接触</span></div><div><b>{characters.filter(c => characterStatus(c.id) === '练习中').length}</b><span>练习中</span></div><div><b>{characters.filter(c => characterStatus(c.id) === '较稳定').length}</b><span>较稳定</span></div></div>{cloud&&<LegacyImportPanel storage={STORAGE_KEY} disabled={cloud.blocked||cloud.pending||!online}/>} {cloud&&<MistakesPanel learnerId={cloud.progress.learnerId} revision={cloud.progress.revision}/>}<h2>最近认识的字</h2>{characters.map(c => <div className="character-row" key={c.id}><b>{c.text}</b><div><strong>{characterStatus(c.id)}</strong><small>{p.observations[c.id] ? `亲子认读：${p.observations[c.id]}` : '尚无亲子认读记录'}</small></div><button onClick={() => setP(old => ({ ...old, observations: { ...old.observations, [c.id]: `${localDate()} ${old.observations[c.id]?.endsWith('能认出') ? '需要陪伴' : '能认出'}` } }))}>记录认读</button></div>)}<p className="muted">点击“记录认读”切换能认出／需要陪伴。亲子观察单独保存在本机，不等同于题目表现。</p><div className="setting"><span>学习声音</span><button role="switch" aria-label="学习声音" aria-checked={p.sound} onClick={() => { stopAudio(); setP(old => ({ ...old, sound: !old.sound })); }}>{p.sound ? '已开启 ♪' : '已关闭'}</button></div><div className="setting"><span>家长开放全部课程</span><button role="switch" aria-label="家长开放全部课程" aria-checked={p.unlocked.length === lessons.length} disabled={cloud?.blocked} onClick={()=>{if(cloud){void cloud.settings(!cloud.progress.openAllCourses);return;}setP(old=>({...old,unlocked:old.unlocked.length === lessons.length ? [] : lessons.map(l=>l.id)}));}}>{p.unlocked.length === lessons.length ? '已开放' : '按阶梯学习'}</button></div><div className="soft-card"><strong>关于本次体验</strong><p>当前目录有 {lessons.length} 课、{characters.length} 个汉字。声音为机器生成的试听素材，尚待人工审听，不是正式课程录音。</p><p>{cloud?'新学习记录由云端保存，联网换设备可继续。已缓存课次可离线记录并在联网后补传；旧记录可由家长确认导入。':'进度只保存在当前浏览器。更换设备、浏览器、网址或清除数据后，进度不会自动同步。'}</p><p>“较稳定”基于跨日、不同任务的辨认表现，不能代表已经会独立朗读。</p></div>{!cloud&&<button className="danger" onClick={() => setResetAsk(true)}>{blockedStorage ? '重置本机数据并恢复保存' : '清除本机学习进度'}</button>}</section>}
      {route === 'parent' && !parentVerified && <section className="center-page"><h1>请家长帮忙打开</h1><button className="primary" onClick={() => setParentGate(true)}>打开家长入口</button></section>}
      {!isReader && !isPractice && !['home','lesson','done','garden','review','books','reader','parent'].includes(route) && <section className="center-page"><h1>我们回小屋吧</h1><button className="primary" onClick={() => go('home')}>回小屋</button></section>}
      {audioError && <div className="notice" role="status">{audioError}</div>}
    </main>
    <div className="learning-actions-slot" ref={setActionsHost}/>
    {!activeLesson && <nav className="bottom-nav" aria-label="主要导航">{nav.map(n => <button key={n.id} aria-current={route === n.id ? 'page' : undefined} className={route === n.id ? 'selected' : ''} onClick={() => go(n.id)}><Icon name={n.icon}/><span>{n.label}</span></button>)}</nav>}
    {parentGate && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="gate-title"><span className="modal-icon">☀</span><h2 id="gate-title">请家长来帮忙</h2><p>这里可以查看进度、调整声音。<br/>请选择数字「二十七」进入。</p><div className="gate-options">{[12,27,35].map(n => <button key={n} onClick={() => { if (n === 27) { setParentVerified(true); setParentGate(false); go('parent'); } }}>{n}</button>)}</div><small>简单操作隔离，不是身份验证。</small><button className="text-button" onClick={() => setParentGate(false)}>返回</button></section></div>}
    {resetAsk && <div className="modal-backdrop"><section className="modal" role="dialog" aria-modal="true" aria-labelledby="reset-title"><h2 id="reset-title">清除全部本机进度？</h2><p>活动记录、练习和亲子认读记录会被删除，无法撤销。</p><button className="primary" onClick={() => setResetAsk(false)}>保留进度</button><button className="danger" onClick={() => { try { localStorage.removeItem(`${STORAGE_KEY}:before-api`); localStorage.removeItem(STORAGE_KEY); } catch { setStorageError('暂时无法清除本机数据，请检查浏览器存储设置。'); setResetAsk(false); return; } storageBlocked.current = false; setBlockedStorage(false); setStorageError(''); setP(fresh()); setResetAsk(false); go('home'); }}>确认清除</button></section></div>}
  </div></LearningActionsContext.Provider>;
}
const Admin=React.lazy(()=>import('./admin/Admin'));
createRoot(document.getElementById('root')!).render(location.pathname.replace(/\/$/,'')==='/admin'?<React.Suspense fallback={<p>正在打开内容工作台…</p>}><Admin/></React.Suspense>:<FamilyShell><ContentBootstrap><App/></ContentBootstrap></FamilyShell>);

if('serviceWorker' in navigator&&(location.hostname==='localhost'||location.protocol==='https:'))void navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(()=>{/* LAN HTTP cannot install an offline shell. Durable records remain in IndexedDB. */});
