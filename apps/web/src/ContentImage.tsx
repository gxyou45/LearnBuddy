import { useState } from 'react';
import { assetURL, lessonData, lessons, lessonImage, type Character } from './contentRepository';
export function ContentImage({id,alt,className}:{id:string;alt:string;className?:string}) {
 const [failed,setFailed]=useState(false);
 const [retry,setRetry]=useState(0);
 if(failed) return <div className="notice" role="status">图片暂时未加载，可以继续陪读。<button onClick={()=>{setRetry(n=>n+1);setFailed(false);}}>重新加载图片</button></div>;
 return <img loading="lazy" key={retry} src={assetURL(id)} alt={alt} className={className} onError={()=>setFailed(true)}/>;
}
export function LessonPicture({lessonId}:{lessonId:string}) {const lesson=lessons.find(l=>l.id===lessonId)!;return <ContentImage key={lessonId} id={lessonImage(lessonId)} alt={lesson.story.text || lesson.title} className="sentence-picture"/>;}
export function CharacterIllustration({character}:{character:Character}) {
 // Image IDs are resolved from the loaded content package; most characters use catalog emoji.
 const lessonId=characterLesson(character.id);
 const image=lessonData(lessonId).characterImages[character.id];
 return image?<ContentImage id={image} alt={character.example} className="character-scene"/>:<span aria-hidden="true">{character.icon}</span>;
}
import { lessonForCharacter } from './contentRepository';
function characterLesson(id:string){return lessonForCharacter(id).id;}
