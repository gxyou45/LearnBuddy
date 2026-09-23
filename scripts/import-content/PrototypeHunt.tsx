import { lessons, type Lesson, type CharacterId } from '../../apps/web/src/content';
import { useState } from 'react';

const locations: { x: number; y: number; clue: string }[] = [
  { x: 22, y: 24, clue: '看看天上的小风筝。' },
  { x: 72, y: 51, clue: '看看小屋旁边的木牌。' },
  { x: 32, y: 80, clue: '看看花丛旁边的小花盆。' },
];

export function HiddenCharacters({ lesson, found, onFind, listen, next }: {
  lesson: Lesson; found: CharacterId[]; onFind: (id: CharacterId) => void; listen: (id: string) => void; next: () => void;
}) {
  const characters = lesson.characters;
  const offset = lessons.indexOf(lesson) % 3;
  const hidingPlaces = characters.map((c, i) => ({ ...locations[(i + offset) % 3], id: c.id }));
  const [hint, setHint] = useState<CharacterId | null>(null);
  const [message, setMessage] = useState('汉字藏在风景里，轻轻点一下试试。');
  const complete = characters.every(c => found.includes(c.id));
  const find = (id: CharacterId) => {
    if (found.includes(id)) return;
    onFind(id); setHint(null);
    const c = characters.find(c => c.id === id)!;
    setMessage(`找到「${c.text}」啦！再看看其他地方。`);
    listen(id);
  };
  return <div className="activity-body hunt-game">
    <span className="eyebrow">汉字捉迷藏</span>
    <h1>汉字藏在哪里？</h1>
    <p>在图里找一找，点出今天认识的三个字。</p>
    <button className="audio-button" onClick={() => listen('hunt')}>♪ 听听怎么玩</button>
    <div className="hunt-targets" aria-label="要找的汉字">{characters.map(c => <span key={c.id} className={found.includes(c.id) ? 'is-found' : ''}><b>{c.text}</b><small>{found.includes(c.id) ? '✓ 找到啦' : '找一找'}</small></span>)}</div>
    <div className="hunt-scene" role="group" aria-label="藏着汉字的花园场景" onClick={() => setMessage('再仔细看看风筝、木牌和花盆，不着急。')}>
      <svg viewBox="0 0 400 430" aria-hidden="true" focusable="false">
        <defs><linearGradient id="hunt-sky" x2="0" y2="1"><stop stopColor="#e4f0ed"/><stop offset="1" stopColor="#faf1d8"/></linearGradient></defs>
        <rect width="400" height="430" rx="24" fill="url(#hunt-sky)"/>
        {lesson.theme === 1 && <g><ellipse cx="285" cy="385" rx="64" ry="20" fill="#9fc7c3"/><path d="m274 384 13-8v16Z" fill="#e5ae77"/><ellipse cx="266" cy="384" rx="12" ry="6" fill="#e5ae77"/></g>}
        <circle cx="334" cy="54" r="25" fill="#f4d17c"/>
        <g fill="#fffdf4"><rect x="147" y="45" width="97" height="23" rx="12"/><circle cx="182" cy="43" r="19"/><circle cx="208" cy="45" r="14"/><rect x="16" y="39" width="63" height="15" rx="8"/></g>
        <path d="M0 267Q90 216 204 271Q319 221 400 254V430H0Z" fill="#c3d2a2"/>
        <path d="M0 321Q107 273 217 319Q321 286 400 315V430H0Z" fill="#aabb8b"/>
        <path d="M241 266Q268 302 216 343T211 430" fill="none" stroke="#ead9ad" strokeWidth="40"/>
        <path d="M88 136Q123 151 94 175T109 218" stroke="#ad9981" strokeWidth="2" fill="none"/>
        <path d="m88 64 34 39-34 37-35-37Z" fill="#f0c28a" stroke="#d9a473" strokeWidth="2"/>
        <path d="m93 157 15-4-3 12Z" fill="#cf927c"/>
        <rect x="178" y="154" width="99" height="122" rx="8" fill="#ffebc2"/>
        <path d="m160 164 68-67 67 67Z" fill="#d78f70"/>
        <rect x="197" y="176" width="27" height="30" rx="7" fill="#b0d1c7"/>
        <path d="M210 177v28m-12-15h25" stroke="#fff8df" strokeWidth="3"/>
        <path d="M234 275v-47a15 15 0 0 1 30 0v47" fill="#879d70"/>
        <circle cx="258" cy="249" r="2" fill="#f7e6b5"/>
        <path d="M288 238v47" stroke="#9d8262" strokeWidth="8"/>
        <rect x="262" y="193" width="53" height="53" rx="7" fill="#e6c893" stroke="#c6a16c" strokeWidth="2"/>
        <path d="M44 287v-86" stroke="#8c9670" strokeWidth="12"/>
        <g fill="#92b391"><circle cx="45" cy="176" r="37"/><circle cx="21" cy="207" r="31"/><circle cx="66" cy="208" r="33"/></g>
        <g fill="#dbe2b1"><circle cx="29" cy="172" r="6"/><circle cx="65" cy="197" r="5"/></g>
        <path d="M128 323v-39m-2 24-17-15m21 7 17-18" fill="none" stroke="#738f5f" strokeWidth="5"/>
        <g fill="#e5aa94"><circle cx="128" cy="279" r="13"/><circle cx="113" cy="287" r="10"/><circle cx="141" cy="288" r="11"/></g><circle cx="128" cy="287" r="7" fill="#f6d98c"/>
        <path d="M101 320h54l-6 53h-41Z" fill="#e7b694"/><rect x="98" y="315" width="60" height="13" rx="5" fill="#dca181"/>
        <g transform="translate(308 323)"><ellipse cx="18" cy="28" rx="22" ry="17" fill="#f6e6c9"/><path d="M0 13 2-9 16 3 29-9 34 16" fill="#f6e6c9"/><circle cx="17" cy="12" r="19" fill="#f6e6c9"/><path d="m10 11 2 0m11 0 2 0" stroke="#7f7a63" strokeWidth="3" strokeLinecap="round"/><path d="M37 31q24-21 17-31" fill="none" stroke="#f6e6c9" strokeWidth="8" strokeLinecap="round"/></g>
        <g stroke="#859c70" strokeWidth="3" fill="none"><path d="m32 368 4-13 6 12m284 38 5-12 5 12m30-131 5-12 5 12"/></g>
        <g fill="#f7e6ab"><circle cx="59" cy="323" r="5"/><circle cx="355" cy="386" r="5"/><circle cx="71" cy="403" r="4"/></g>
      </svg>
      {hidingPlaces.map(place => {
        const c = characters.find(c => c.id === place.id)!;
        const selected = found.includes(c.id);
        return <button key={c.id} className={`hidden-character ${selected ? 'found' : ''} ${hint === c.id ? 'hinted' : ''}`} style={{ left: `${place.x}%`, top: `${place.y}%` }} aria-label={`图中的${c.text}`} aria-pressed={selected} onClick={e => { e.stopPropagation(); find(c.id); }}>{c.text}{selected && <span aria-hidden="true">✓</span>}</button>;
      })}
    </div>
    <div className="hunt-feedback" role="status"><strong>{found.length} / {characters.length} 已找到</strong><p>{complete ? '三个汉字都找到啦！一起去读小故事吧。' : message}</p></div>
    {complete ? <button className="primary" onClick={next}>都找到啦，去读故事 →</button> : <><button className="audio-button" onClick={() => { const place = hidingPlaces.find(p => !found.includes(p.id))!; setHint(place.id); setMessage(place.clue); }}>✦ 给我一点提示</button><button className="text-button hunt-skip" onClick={next}>和家长一起，先去读故事</button></>}
  </div>;
}
