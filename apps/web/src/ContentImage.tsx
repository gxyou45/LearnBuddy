import { useState } from 'react';
import { assetURL, lessonData, lessons, lessonImage, releaseId, type Character } from './contentRepository';
import {WordVisual} from './visuals/WordVisual';
import {wordVisual} from './visuals/resolveWordVisual';
import {StoryIllustration,storyIllustration} from './story-art/StoryIllustration';
export function ContentImage({id,alt,className}:{id:string;alt:string;className?:string}) {
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 if(failed) return <div className="notice" role="status">图片暂时未加载，可以继续陪读。<button onClick={()=>{setRetry(n=>n+1);setFailed(false);}}>重新加载图片</button></div>;
 return <img loading="lazy" key={retry} src={assetURL(id)} alt={alt} className={className} onError={()=>setFailed(true)}/>;
}
export function LessonPicture({lessonId,interactive=true}:{lessonId:string;interactive?:boolean}) {
 const lesson=lessons.find(l=>l.id===lessonId)!;
 const illustration=storyIllustration(lessonId,lesson.story.text,releaseId);
 if(illustration)return <StoryIllustration key={lessonId} {...illustration} interactive={interactive}/>;
 // Replace only the known generated v1 word-card image, never an authored scene.
 if(releaseId==='curriculum-1000-v1'&&lessonImage(lessonId)===`image-lesson-${lessonId}`&&/^c\d{3}$/.test(lessonId))return <div className="sentence-picture word-picture" role="group" aria-label={`${lesson.title}词语图卡`}>
  {[...new Set(lesson.characters.map(c=>c.word))].map(word=><div className="word-picture-card" key={word}><WordVisual word={word}/><span>{word}</span></div>)}
 </div>;
 return <ContentImage key={lessonId} id={lessonImage(lessonId)} alt={lesson.story.text || lesson.title} className="sentence-picture"/>;
}
export function CharacterIllustration({character}:{character:Character}) {
 // Authored character scenes take precedence. Never guess an illustration from a single character.
 const lessonId=characterLesson(character.id);
 const image=lessonData(lessonId).characterImages[character.id];
 if(image)return <ContentImage id={image} alt={character.example} className="character-scene"/>;
 if(wordVisual(character.word)||character.id.startsWith('han-'))return <WordVisual word={character.word}/>;
 return <span aria-hidden="true">{character.icon}</span>;
}
import { lessonForCharacter } from './contentRepository';
function characterLesson(id:string){return lessonForCharacter(id).id;}
