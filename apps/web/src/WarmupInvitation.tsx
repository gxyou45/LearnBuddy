import {LearningActions} from './LearningActions';

export function WarmupInvitation({title,count,busy,review,start,back,resuming=false}:{title:string;count:number;busy:boolean;review:()=>void;start:()=>void;back:()=>void;resuming?:boolean}){
 return <section className="center-page warmup-invitation">
  <span className="eyebrow">新冒险前 · 可选的小热身</span>
  <h1>{resuming?'上次的复习还在这里':count?'先和老朋友打个招呼？':'准备开始新冒险吧'}</h1>
  <p>{resuming?`还剩 ${count} 个字。可以继续原题单，也可以直接进入「${title}」。`:count?`只回顾 ${count} 个学过的字，之后进入「${title}」。`:`接下来是「${title}」。`}</p>
  <div className="soft-card"><p>不想复习也没关系。直接开始新课，不影响学习进度。</p></div>
  <LearningActions>
   {count>0&&<button className="primary" disabled={busy} onClick={review}>{resuming?'继续上次复习 →':`先回顾 ${count} 个字 →`}</button>}
   <button className={count?'text-button':'primary'} disabled={busy} onClick={start}>直接开始新课 →</button>
  </LearningActions>
  <button className="text-button" disabled={busy} onClick={back}>回小屋看看</button>
 </section>;
}
