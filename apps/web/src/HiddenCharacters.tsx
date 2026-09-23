import {LearningActions} from './LearningActions';
import { ContentImage } from './ContentImage';
import { lessonData } from './contentRepository';
import { lessons, type Lesson, type CharacterId } from './contentRepository';
import { useState } from 'react';

export function HiddenCharacters({ lesson, found, onFind, listen, next, disabled }: {
  disabled?:boolean;lesson: Lesson; found: CharacterId[]; onFind: (id: CharacterId) => void; listen: (id: string) => void; next: () => void;
}) {
  const characters = lesson.characters;
  const {scene}=lessonData(lesson.id);
  const locations=scene.slots;
  const offset = lessons.indexOf(lesson) % locations.length;
  const hidingPlaces = characters.map((c, i) => ({ ...locations[(i + offset) % locations.length], id: c.id }));
  const [hint, setHint] = useState<CharacterId | null>(null);
  const [message, setMessage] = useState('汉字藏在风景里，轻轻点一下试试。');
  const complete = characters.every(c => found.includes(c.id));
  const find = (id: CharacterId) => {
    if (found.includes(id)) return;
    onFind(id); setHint(null);
    const c = characters.find(c => c.id === id)!;
    setMessage(`找到「${c.text}」啦！再看看其他地方。`);
    listen(c.audio);
  };
  return <div className="activity-body hunt-game">
    <span className="eyebrow">汉字捉迷藏</span>
    <div className="hunt-heading"><h1>汉字藏在哪里？</h1>
    <button className="audio-button" onClick={() => listen('hunt')}>♪ 听听怎么玩</button></div>
    <div className="hunt-targets" aria-label="要找的汉字">{characters.map(c => <span key={c.id} className={found.includes(c.id) ? 'is-found' : ''}><b>{c.text}</b><small>{found.includes(c.id) ? '✓ 找到啦' : '找一找'}</small></span>)}</div>
    <div className="hunt-scene" role="group" aria-label="藏着汉字的花园场景" onClick={() => setMessage('再仔细看看风筝、木牌和花盆，不着急。')}>
      <ContentImage id={scene.imageAssetId} alt="花园找字场景" className="hunt-background"/>
      {hidingPlaces.map(place => {
        const c = characters.find(c => c.id === place.id)!;
        const selected = found.includes(c.id);
        return <button key={c.id} disabled={disabled} className={`hidden-character ${selected ? 'found' : ''} ${hint === c.id ? 'hinted' : ''}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} aria-label={`图中的${c.text}`} aria-pressed={selected} onClick={e => { e.stopPropagation(); find(c.id); }}>{c.text}{selected && <span aria-hidden="true">✓</span>}</button>;
      })}
    </div>
    <div className="hunt-feedback" role="status"><strong>{found.length} / {characters.length} 已找到</strong><p>{complete ? '本课汉字都找到啦！一起去读小故事吧。' : message}</p></div>
    <LearningActions>{complete ? <button className="primary" disabled={disabled} onClick={next}>都找到啦，去读故事 →</button> : <><button className="audio-button" onClick={() => { const place = hidingPlaces.find(p => !found.includes(p.id))!; setHint(place.id); setMessage(place.clue); }}>✦ 给我一点提示</button><button disabled={disabled} className="text-button hunt-skip" onClick={next}>和家长一起，先去读故事</button></>}</LearningActions>
  </div>;
}
