// Test-only harness: exercises every production tracing component without a curriculum DB.
import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {TraceCharacter} from '../../apps/web/src/TraceCharacter';
import {RiverJourney} from '../../apps/web/src/RiverJourney';
import {lessonInteractions} from '../../apps/web/src/interactionPilot';
import '../../apps/web/src/style.css';
function Harness(){
 const [index,setIndex]=useState(0),lesson=lessonInteractions[index];
 const steps=Array.from({length:index<10?6:10},(_,i)=>({id:'q'+i,kind:'meaning' as const,title:'',subtitle:'',audio:''}));
 return <main style={{maxWidth:360,margin:'auto',padding:12}}>
 <label>课程<select aria-label="课程" value={index} onChange={e=>setIndex(Number(e.target.value))}>{lessonInteractions.map((l,i)=><option value={i} key={l.lessonId}>{l.lessonId}</option>)}</select></label>
 <h1>{lesson.lessonId}</h1>
 {lesson.characters.map(c=><TraceCharacter key={c.characterId} text={c.text} storageKey={'test-trace:'+c.characterId}/>)}
 <RiverJourney steps={steps} solvedSteps={steps.map(s=>s.id)}/>
 </main>;
}
createRoot(document.getElementById('root')!).render(<Harness/>);
