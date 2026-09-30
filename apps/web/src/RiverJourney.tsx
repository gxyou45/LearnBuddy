import type {Step} from '@learnbuddy/contracts';
import {journeyProgress} from './interactionPilot';
export function RiverJourney({steps,solvedSteps,compact=false}:{steps:readonly Step[];solvedSteps:readonly string[];compact?:boolean}){
 const {total,solved}=journeyProgress(steps,solvedSteps);
 if(!total)return null;
 const finished=solved===total,x=34+(solved/total)*252;
 const message=finished?'小兔到对岸啦，朋友在等你！':`帮小兔过河 · 已走 ${solved} / ${total} 步`;
 return <section className={'river-journey'+(compact?' compact':'')} aria-label="小兔过河" data-solved={solved} data-total={total}>
  {!compact&&<svg viewBox="0 0 320 116" role="img" aria-label={message}>
   <rect x="49" y="28" width="222" height="76" rx="32" fill="#dceceb"/>
   <path d="M65 56q12 6 24 0m114 31q15 6 30 0m-98-48q12 6 24 0" fill="none" stroke="#b3d2d0" strokeWidth="3" strokeLinecap="round"/>
   <ellipse cx="29" cy="95" rx="29" ry="13" fill="#b8cc9b"/><ellipse cx="291" cy="95" rx="29" ry="13" fill="#b8cc9b"/>
   {Array.from({length:total-1},(_,i)=><ellipse key={i} cx={34+((i+1)/total)*252} cy="94" rx={Math.min(19,100/total)} ry="8" fill={i<solved?'#a8b68f':'#dddcc9'}/>)}
   <g className="river-rabbit" style={{transform:`translateX(${x}px)`}}>
    <ellipse cy="77" rx="14" ry="16" fill="#fffaf0" stroke="#a78f75" strokeWidth="1.5"/>
    <ellipse cx="-6" cy="44" rx="5" ry="17" fill="#fffaf0" stroke="#a78f75" strokeWidth="1.5"/>
    <ellipse cx="6" cy="44" rx="5" ry="17" fill="#fffaf0" stroke="#a78f75" strokeWidth="1.5"/>
    <ellipse cy="64" rx="17" ry="14" fill="#fffaf0" stroke="#a78f75" strokeWidth="1.5"/>
    <circle cx="-6" cy="62" r="2" fill="#5f5548"/><circle cx="6" cy="62" r="2" fill="#5f5548"/>
    <path d="m-3 69 3 2 3-2" fill="none" stroke="#bc8c7b" strokeWidth="2" strokeLinecap="round"/>
   </g>
   {finished&&<path className="river-finish" d="M265 20c-9-12-20 2 0 13 20-11 9-25 0-13" fill="#cc987b"/>}
  </svg>}
  <p role="status">{message}</p>
  {compact&&!finished&&<small>小兔先在这里休息，我们也可以继续读故事。</small>}
 </section>;
}
