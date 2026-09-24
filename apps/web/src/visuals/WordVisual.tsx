import {wordVisual} from './resolveWordVisual';
import {sketches} from './sketches';
import {semanticScenes} from './semanticScenes';
export function WordVisual({word}:{word:string}) {
 const spec=wordVisual(word);
 if(!spec)return <span className="word-visual word-visual-context" data-visual-kind="context" aria-hidden="true">一起<br/>说一说</span>;
 if(spec.kind==='emoji')return <span className="word-visual word-visual-emoji" data-visual-kind="emoji" role="img" aria-label={word}>{spec.value}</span>;
 if(spec.kind==='scene')return <svg className="word-visual character-scene" data-visual-kind="scene" viewBox="0 0 120 100" role="img" aria-label={`${word}：${spec.description}`}><g dangerouslySetInnerHTML={{__html:semanticScenes[spec.value]}}/></svg>;
 if(spec.kind==='sketch')return <svg className="word-visual character-scene" data-visual-kind="sketch" viewBox="0 0 120 100" role="img" aria-label={`${word}简笔画`}><g dangerouslySetInnerHTML={{__html:sketches[spec.value]}}/></svg>;
 return <svg className="word-visual character-scene" data-visual-kind={spec.kind} viewBox="0 0 120 100" role="img" aria-label={word}>
  {spec.kind==='color'?<rect x="22" y="15" width="76" height="70" rx="17" fill={spec.value} stroke="#62725b" strokeWidth="3"/>:spec.kind==='count'?Array.from({length:Number(spec.value)},(_,i)=><circle key={i} cx={20+(i%5)*20} cy={i<5?35:65} r="7" fill="#8ca777"/>):<text x="60" y="62" textAnchor="middle" fontSize={spec.value.length>4?24:32} fill="#536d46">{spec.value}</text>}
 </svg>;
}
