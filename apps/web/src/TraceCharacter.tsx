import {useEffect,useId,useMemo,useRef,useState,type PointerEvent} from 'react';
import {strokeData} from './strokeData';
import {canResumeStroke,sampleStroke,traceForward,type Point} from './traceGeometry';
type Position={stroke:number;point:number};
export function TraceCharacter({text,storageKey}:{text:string;storageKey:string}){
 const data=strokeData[text],tracks=useMemo(()=>data.medians.map(sample=>sampleStroke(sample)),[data]);
 const [initial]=useState(()=>{
  try{
   const raw=localStorage.getItem(storageKey);if(!raw)return {position:{stroke:0,point:0},blocked:false};
   const p=JSON.parse(raw);
   if(p.version!==1||!Number.isInteger(p.stroke)||!Number.isInteger(p.point)||p.stroke<0||p.stroke>tracks.length||p.point<0||(p.stroke===tracks.length?p.point!==0:p.point>=tracks[p.stroke].length))throw Error('invalid trace position');
   return {position:{stroke:p.stroke,point:p.point} as Position,blocked:false};
  }catch{return {position:{stroke:0,point:0},blocked:true};}
 });
 const [position,setPosition]=useState(initial.position),current=useRef(position);
 const [notice,setNotice]=useState(initial.blocked?'描写记录暂时无法读取，原记录已保留；可以继续体验或直接继续课程。':'');
 const blocked=useRef(initial.blocked),pointer=useRef<number|null>(null);
 const [demo,setDemo]=useState(false),[hint,setHint]=useState('从小圆点出发，沿着淡色笔画慢慢描。');
 const uid=useId().replace(/:/g,'');
 const done=position.stroke===tracks.length,track=tracks[position.stroke];
 const commit=(next:Position)=>{current.current=next;setPosition(next);};
 useEffect(()=>{
  if(blocked.current)return;
  try{localStorage.setItem(storageKey,JSON.stringify({version:1,...position}));}
  catch{blocked.current=true;setNotice('这次描写暂时不能保存，不影响继续课程。');}
 },[position,storageKey]);
 useEffect(()=>{
  const changed=(e:StorageEvent)=>{if(e.key===storageKey){blocked.current=true;pointer.current=null;setNotice('另一个页面更新了描写记录，请刷新后继续；本页不再覆盖保存。');}};
  addEventListener('storage',changed);return()=>removeEventListener('storage',changed);
 },[storageKey]);
 useEffect(()=>{if(!demo)return;const timer=setTimeout(()=>setDemo(false),1300);return()=>clearTimeout(timer);},[demo,position.stroke]);
 const point=(e:PointerEvent<SVGSVGElement>):Point=>{
  const r=e.currentTarget.getBoundingClientRect();return [(e.clientX-r.left)*1024/r.width,(e.clientY-r.top)*1024/r.height];
 };
 const move=(e:PointerEvent<SVGSVGElement>)=>{
  if(pointer.current!==e.pointerId||demo)return;
  const p=current.current,points=tracks[p.stroke];if(!points)return;
  const next=traceForward(points,p.point,point(e));
  if(next===points.length-1){pointer.current=null;commit({stroke:p.stroke+1,point:0});setHint('这一笔描好啦！从下一个小圆点继续。');}
  else if(next!==p.point)commit({...p,point:next});
 };
 const end=(e:PointerEvent<SVGSVGElement>)=>{if(pointer.current===e.pointerId)pointer.current=null;if(e.currentTarget.hasPointerCapture(e.pointerId))e.currentTarget.releasePointerCapture(e.pointerId);};
 return <section className="trace-character" aria-label={`描一描：${text}`} data-stroke={position.stroke} data-point={position.point}>
  <div className="trace-heading"><strong>描一描 · {text}</strong><span>{done?'描好啦':`第 ${position.stroke+1} / ${tracks.length} 笔`}</span></div>
  <svg className="trace-board" viewBox="0 0 1024 1024" role="img" aria-label={`沿起点描写${text}，可抬手后从小圆点继续`}
   onPointerDown={e=>{
    if(!e.isPrimary||e.button!==0||done||demo||pointer.current!==null)return;
    if(!canResumeStroke(track,position.point,point(e))){setHint('找到小圆点，从那里继续就好。');return;}
    e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);pointer.current=e.pointerId;
   }} onPointerMove={move} onPointerUp={end} onPointerCancel={end} onLostPointerCapture={()=>{pointer.current=null;}}>
   <path d="M512 0v1024M0 512h1024M0 0l1024 1024M1024 0 0 1024" stroke="#dce3d1" strokeWidth="3" strokeDasharray="14 14"/>
   <g transform="translate(0 900) scale(1 -1)">{data.strokes.map((d,i)=><path key={i} d={d} fill={i<position.stroke?'#557944':i===position.stroke?'#ccd7be':'#edf0e5'}/>)}</g>
   {!done&&<>
    <defs><clipPath id={uid}><path d={data.strokes[position.stroke]} transform="translate(0 900) scale(1 -1)"/></clipPath></defs>
    <polyline points={track.slice(0,position.point+1).map(p=>p.join(',')).join(' ')} fill="none" stroke="#557944" strokeWidth="150" strokeLinejoin="round" strokeLinecap="round" clipPath={`url(#${uid})`}/>
    {demo&&<polyline className="trace-demo" pathLength="1" points={track.map(p=>p.join(',')).join(' ')} fill="none" stroke="#809b64" strokeWidth="150" strokeLinecap="round" strokeLinejoin="round" clipPath={`url(#${uid})`}/>}
    <circle cx={track[position.point][0]} cy={track[position.point][1]} r="24" fill="#dfac55" stroke="#fffdf6" strokeWidth="8"/>
   </>}
  </svg>
  <div className="trace-response" role="status"><span key={position.stroke} className={position.stroke?'trace-leaf':''} aria-hidden="true">{position.stroke?'🌱':'·'}</span>{done?'一笔一笔，汉字长出来啦！':hint}</div>
  {!done&&<button className="text-button" disabled={demo} onClick={()=>{pointer.current=null;setDemo(true);}}>看这一笔怎么走</button>}
  <small className="trace-note">可以抬手再接着描，也可以直接继续。不打分，不用反复写。</small>
  {notice&&<p className="notice" role="status">{notice}</p>}
 </section>;
}
