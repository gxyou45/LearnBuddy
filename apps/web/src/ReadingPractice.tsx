import {LearningActions} from './LearningActions';
import { useState } from 'react';
import { type Character, type Lesson, type Step } from './contentRepository';
import { ReadingText } from './ReadingText';
import { CharacterIllustration } from './ContentImage';
import { LessonPicture } from './ContentImage';
import { stopAudio } from './audio';

export function WordCard({ character }: { character: Character }) {
  return <div className="word-card">
    <CharacterIllustration character={character}/>
    <h2><ReadingText text={character.word} audio={`word-${character.id}`}/></h2>
    <p>词语里认识的字：<b>{character.text}</b></p>
  </div>;
}

export function LessonStages({ step, wordsAvailable, storyAvailable, open }: {
  step: Step; wordsAvailable: boolean; storyAvailable: boolean; open: (kind: 'words' | 'story') => void;
}) {
  const current = step.kind === 'intro' || step.kind === 'teach' ? 0 : step.kind === 'word' ? 1 : step.kind === 'story' ? 3 : 2;
  return <nav className="lesson-stages" aria-label="本课学习阶段">
    {['认字', '读词语', '玩一玩', '读句子'].map((label, i) => {
      const kind = i === 1 ? 'words' : 'story';
      const available = i === 1 ? wordsAvailable : storyAvailable;
      return i === 1 || i === 3
        ? <button key={label} aria-current={current === i ? 'step' : undefined} disabled={!available}
          title={available ? `打开${label}` : '先完成前面的学习环节'} onClick={() => open(kind)}>{label}{!available && <small>待学习</small>}</button>
        : <span key={label} aria-current={current === i ? 'step' : undefined}>{label}</span>;
    })}
  </nav>;
}

export function ReadingPractice({ lesson, kind, listen, back, backLabel }: {
  lesson: Lesson; kind: 'words' | 'story'; listen: (id: string) => void; back: () => void; backLabel: string;
}) {
  const [index, setIndex] = useState(0);
  const character = lesson.characters[index];
  const select = (next: number) => { stopAudio(); setIndex(next); };
  return <section className="reading-practice inner-page">
    <button className="text-button" onClick={back}>‹ {backLabel}</button>
    <span className="eyebrow">{lesson.title} · 随时读一读</span>
    <h1>{kind === 'words' ? '读词语' : '读句子'}</h1>
    <p>先听一听，再和家长一起读。</p>
    {kind === 'words' ? <>
      <div className="word-tabs" role="group" aria-label="选择词语">
        {lesson.characters.map((c, i) => <button key={c.id} aria-pressed={i === index} onClick={() => select(i)}>{c.word}</button>)}
      </div>
      <WordCard character={character}/>
      <button className="audio-button" onClick={() => listen(`word-${character.id}`)}>♪ 听词语</button>
      <p className="parent-note">可以指着文字，和家长读一读。不用录音，也不打分。</p>

    </> : <>
      <LessonPicture lessonId={lesson.id}/>
      <h2 className="story-text"><ReadingText text={lesson.story.text} audio={lesson.story.audio}/></h2>
      <button className="audio-button" onClick={() => listen(lesson.story.audio)}>♪ 听完整故事</button>
      <p className="parent-note">{lesson.story.note}</p>
    </>}
    <LearningActions>{kind === 'words' && index < lesson.characters.length - 1 && <button className="primary" onClick={() => select(index + 1)}>下一个词语 →</button>}<button className="text-button reading-back" onClick={back}>读完啦，{backLabel}</button></LearningActions>
  </section>;
}
