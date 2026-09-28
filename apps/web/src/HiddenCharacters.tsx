import {LearningActions} from './LearningActions';
import { ContentImage } from './ContentImage';
import { lessonData } from './contentRepository';
import { lessons, type Lesson, type CharacterId } from './contentRepository';
import { useState,useRef,useEffect } from 'react';
import {resolveHuntRound,type HuntRound} from '@learnbuddy/contracts';

export function HiddenCharacters({ lesson, round,pendingRound,found, onFind, listen, next, disabled }: {
  round?:HuntRound;pendingRound?:boolean;disabled?:boolean;lesson: Lesson; found: CharacterId[]; onFind: (id: CharacterId) => void; listen: (id: string) => void; next: () => void;
}) {
  const characters = lesson.characters;
  const {scene,assets}=lessonData(lesson.id);
  const locations=scene.slots;
  const offset = lessons.indexOf(lesson) % locations.length;
  let invalid=false;
  let hidingPlaces=characters.map((c,i)=>({...locations[(i+offset)%locations.length],characterId:c.id}));
  if(round)try{hidingPlaces=resolveHuntRound(round,scene,assets.find(a=>a.id===scene.imageAssetId)!.sha256,characters);}catch{invalid=true;}
  const [hint, setHint] = useState<CharacterId | null>(null);
  const [message, setMessage] = useState('汉字藏在风景里，轻轻点一下试试。');
  const complete = characters.every(c => found.includes(c.id));
  const clicked=useRef(new Set<string>());useEffect(()=>{clicked.current.clear();},[found,disabled]);
  const find = (id: CharacterId) => {
    if (found.includes(id)||clicked.current.has(id)||disabled) return;
    clicked.current.add(id);
    onFind(id); setHint(null);
    const c = characters.find(c => c.id === id)!;
    setMessage(`找到「${c.text}」啦！再看看其他地方。`);
    listen(c.audio);
  };
  if(invalid||pendingRound)return <div className="activity-body hunt-game"><h1>找字场景暂时无法恢复</h1><p>原有进度已保留，请重试或先去读故事；不会重新摆放已找到的字。</p><LearningActions><button className="primary" disabled={disabled} onClick={next}>和家长一起，先去读故事</button></LearningActions></div>;
  return <div className="activity-body hunt-game">
    <span className="eyebrow">汉字捉迷藏</span>
    <div className="hunt-heading"><h1>汉字藏在哪里？</h1>
    <button className="audio-button" onClick={() => listen('hunt')}>♪ 听听怎么玩</button></div>
    <div className="hunt-targets" aria-label="要找的汉字">{characters.map(c => <span key={c.id} className={found.includes(c.id) ? 'is-found' : ''}><b>{c.text}</b><small>{found.includes(c.id) ? '✓ 找到啦' : '找一找'}</small></span>)}</div>
    <div className="hunt-scene" role="group" aria-label={scene.description} data-round={round?.roundId||'legacy'} onClick={() => setMessage('再看看图里的汉字，和上面要找的字比一比，不着急。')}>
      <ContentImage id={scene.imageAssetId} alt={scene.description} className="hunt-background"/>
      {hidingPlaces.map(place => {
        const c = characters.find(c => c.id === place.characterId)!;
        const selected = found.includes(c.id);
        return <button key={c.id} disabled={disabled} className={`hidden-character ${selected ? 'found' : ''} ${hint === c.id ? 'hinted' : ''}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} aria-label={`图中的${c.text}`} aria-pressed={selected} onClick={e => { e.stopPropagation(); find(c.id); }}>{c.text}{selected && <span aria-hidden="true">✓</span>}</button>;
      })}
    </div>
    <div className="hunt-feedback" role="status"><strong>{found.length} / {characters.length} 已找到</strong><p>{complete ? '本课汉字都找到啦！一起去读小故事吧。' : message}</p></div>
    <LearningActions>{complete ? <button className="primary" disabled={disabled} onClick={next}>都找到啦，去读故事 →</button> : <><button className="audio-button" disabled={disabled} onClick={() => { const place = hidingPlaces.find(p => !found.includes(p.characterId))!; setHint(place.characterId); setMessage(place.clue); }}>✦ 给我一点提示</button><button disabled={disabled} className="text-button hunt-skip" onClick={next}>和家长一起，先去读故事</button></>}</LearningActions>
  </div>;
}
