import {useState} from 'react';
import briefs from './briefs.json';
import {isStaticDemo} from '../staticDemo';
const images=import.meta.glob('./images/*.png',{eager:true,query:'?url',import:'default'}) as Record<string,string>;
export function storyIllustration(lessonId:string,story:string,version:string){
 if(version!=='curriculum-1000-v1')return undefined;
 const brief=briefs.find(b=>b.id===lessonId);
 if(!brief||(story&&story!==brief.story))return undefined;
 const src=isStaticDemo
  ? `${import.meta.env.BASE_URL}static-content/story-art/${brief.file.split('/').pop()}`
  : images['./'+brief.file];
 return src?{src,alt:brief.alt,title:brief.title}:undefined;
}
export function StoryIllustration({src,alt,title,interactive=true}:{src:string;alt:string;title:string;interactive?:boolean}){
 const [failed,setFailed]=useState(false);const [retry,setRetry]=useState(0);const [expanded,setExpanded]=useState(false);
 if(failed)return <div className="notice" role="status">故事图片暂时未加载，可以继续读故事。<button onClick={()=>{setFailed(false);setRetry(v=>v+1);}}>重试故事图片</button></div>;
 if(!interactive)return <img className="sentence-picture story-art" src={src} alt={alt} onError={()=>setFailed(true)}/>;
 return <>
  <button className="story-art-button" aria-label={`放大查看《${title}》故事插图`} onClick={()=>setExpanded(true)}><img key={retry} className="sentence-picture story-art" src={src} alt={alt} onError={()=>setFailed(true)}/><span>点图放大</span></button>
  {expanded&&<dialog ref={node=>{if(node&&!node.open)node.showModal();}} onClose={()=>setExpanded(false)} className="story-art-dialog" aria-label={`${title}故事插图`} onKeyDown={e=>{if(e.key==='Escape')setExpanded(false);}}><button autoFocus onClick={()=>setExpanded(false)}>关闭大图</button><img src={src} alt={alt}/></dialog>}
 </>;
}
