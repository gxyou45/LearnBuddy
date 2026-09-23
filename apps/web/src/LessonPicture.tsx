import { StoryPicture } from './StoryPicture';
import { lessons } from './content';
function Person({ x, y, scale=1, color='#d8a08c', waving=false }: {x:number;y:number;scale?:number;color?:string;waving?:boolean}) {
 return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="m-14 37-2 31m28-31 3 31" stroke="#77856c" strokeWidth="12" strokeLinecap="round"/><path d="M-25 42V8q0-21 25-21T25 8v34Z" fill={color}/><circle cy="-32" r="25" fill="#f2ccaa"/><path d="M-25-33q-4-36 27-32 29 0 24 33-15-4-23-19-12 18-28 18" fill="#736153"/><path d="m-10-31 2 0m16 0 2 0" stroke="#685b4c" strokeWidth="3" strokeLinecap="round"/><path d="M-5-20q5 5 11 0" stroke="#b78770" fill="none" strokeWidth="2"/><path d={waving?'M-20 3q-27-12-26-40M22 4l12 26':'M-21 4l-11 30m53-30 12 30'} fill="none" stroke="#f2ccaa" strokeWidth="10" strokeLinecap="round"/></g>;
}
function Cat({x,y,scale=1,sleep=false}:{x:number;y:number;scale?:number;sleep?:boolean}) {return <g transform={`translate(${x} ${y}) scale(${scale})`}><ellipse cx="12" cy="19" rx="31" ry="22" fill="#f6e5bc"/><path d="M35 23q31-11 20-34" fill="none" stroke="#f6e5bc" strokeWidth="10" strokeLinecap="round"/><path d="m-22-2 1-26 17 13L13-27 18 0Z" fill="#f6e5bc"/><circle cx="-2" cy="-1" r="23" fill="#f6e5bc"/><path d={sleep?'m-16-2 9 3m8 0 9-3':'m-12-2 1 0m13 0 1 0'} stroke="#82765c" strokeWidth="3" strokeLinecap="round"/><path d="m-6 7 8 0-4 4Z" fill="#ce9f86"/><path d="m-22 5-12-3m12 9-12 3m48-9 12-3m-12 9 12 3" stroke="#a49b7c" strokeWidth="1.5"/></g>}
function Dog({x,y,scale=1}:{x:number;y:number;scale?:number}) {return <g transform={`translate(${x} ${y}) scale(${scale})`}><ellipse cy="22" rx="33" ry="23" fill="#c89973"/><path d="M29 23q22-14 19-28" stroke="#c89973" strokeWidth="10" fill="none" strokeLinecap="round"/><circle cy="-5" r="25" fill="#d9ad84"/><ellipse cx="-24" cy="-7" rx="9" ry="22" fill="#9d795f"/><ellipse cx="24" cy="-7" rx="9" ry="22" fill="#9d795f"/><path d="m-10-8 1 0m17 0 1 0" stroke="#675748" strokeWidth="3" strokeLinecap="round"/><ellipse cy="5" rx="10" ry="8" fill="#efd5b5"/><ellipse cy="2" rx="5" ry="3" fill="#786355"/></g>}
function Bird({x,y,scale=1}:{x:number;y:number;scale?:number}) {return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="m-12 7-17-10 7 20" fill="#7e9fab"/><ellipse cy="10" rx="20" ry="14" fill="#91b2bd"/><circle cx="11" cy="-1" r="12" fill="#91b2bd"/><path d="m22-2 11 5-11 4" fill="#dab66d"/><circle cx="15" cy="-3" r="2" fill="#4b5d58"/><path d="m-8 8q12-7 15 5" stroke="#638895" fill="none" strokeWidth="3"/><path d="m-3 24v7m9-7v7" stroke="#a39063" strokeWidth="2"/></g>}
function Tree({x=90,y=220,scale=1}:{x?:number;y?:number;scale?:number}) {return <g transform={`translate(${x} ${y}) scale(${scale})`}><path d="M0 48V-90m0 62-30-30m30 47 33-34" stroke="#a08c68" strokeWidth="14" fill="none" strokeLinecap="round"/><g fill="#97b887"><circle cy="-98" r="49"/><circle cx="-32" cy="-66" r="39"/><circle cx="35" cy="-67" r="40"/></g><path d="M3-39h44" stroke="#a08c68" strokeWidth="8" strokeLinecap="round"/></g>}
function Home() {return <g><rect x="70" y="120" width="254" height="156" rx="10" fill="#fae9c6"/><path d="m46 129 150-105 150 105Z" fill="#cf8e71"/><rect x="144" y="153" width="78" height="122" rx="30" fill="#8fa47a"/><circle cx="204" cy="216" r="4" fill="#f7e5ac"/><rect x="253" y="160" width="43" height="46" rx="8" fill="#b1d2c7"/><path d="M274 160v46m-20-23h42" stroke="#fff6dc" strokeWidth="4"/></g>}
function Flower({x,y}:{x:number;y:number}) {return <g transform={`translate(${x} ${y})`}><path d="M0 0v37m0-12-12-9m12 0 10-8" stroke="#799969" strokeWidth="4"/><g fill="#dfa18b"><circle cy="-9" r="9"/><circle cx="-9" r="9"/><circle cx="9" r="9"/><circle cy="9" r="9"/></g><circle r="6" fill="#f3d98b"/></g>}
export function LessonPicture({lessonId}:{lessonId:string}) {
 if(lessonId==='family') return <StoryPicture/>;
 const lesson=lessons.find(l=>l.id===lessonId)!;
 return <svg className="sentence-picture" viewBox="0 0 400 320" role="img" aria-label={lesson.story.text}>
 <rect width="400" height="320" rx="24" fill="#e7eee0"/><path d="M0 226q110-30 217 0t183-2v96H0Z" fill="#c7d4ae"/>
 {lessonId!=='sky' && <><circle cx="342" cy="46" r="23" fill="#f2d28a"/><path d="M26 53h79m-58-9h35" stroke="#fffaf0" strokeWidth="14" strokeLinecap="round"/></>}
 {lessonId==='home' && <><Home/><Person x={132} y={222} scale={.8} color="#8da9b7"/><Person x={250} y={222} scale={.8}/><Person x={192} y={251} scale={.58} color="#dfbd77"/></>}
 {lessonId==='welcome' && <><Home/><Person x={184} y={214} scale={.78} color="#dbb77b" waving/><Person x={311} y={247} scale={.7} color="#8caab3"/><path d="M325 278q-3 16-17 16" stroke="#aec294" strokeWidth="4" fill="none"/></>}
 {lessonId==='pets' && <><Tree x={70} y={175} scale={.55}/><Cat x={99} y={204}/><Dog x={290} y={204}/><circle cx="201" cy="257" r="23" fill="#dfa084"/><path d="m180 248 37 17m-20-30 8 42" stroke="#f5d6a4" strokeWidth="7"/><path d="M20 287h53m265-12h39" stroke="#9eb780" strokeWidth="4" strokeLinecap="round"/></>}
 {lessonId==='snack' && <>
   <ellipse cx="113" cy="192" rx="45" ry="32" fill="#f6e5bc"/>
   <path d="M149 189q37-27 22-46" stroke="#f6e5bc" strokeWidth="12" fill="none" strokeLinecap="round"/>
   <path d="m77 216-4-40 24 19 22-21 5 40" fill="#f6e5bc"/>
   <ellipse cx="100" cy="217" rx="30" ry="26" fill="#f6e5bc"/>
   <path d="m84 219 8 3m14 0 8-3" stroke="#82765c" strokeWidth="3" fill="none" strokeLinecap="round"/>
   <path d="m96 233 8 0-4 5Z" fill="#bd9582"/>
   <path d="M100 239v10" stroke="#dfa5a0" strokeWidth="5" strokeLinecap="round"/>
   <path d="m78 227-16-4m16 10-17 2m62-8 15-4m-15 10 17 2" stroke="#a99b7d" strokeWidth="2"/>
   <ellipse cx="292" cy="195" rx="45" ry="31" fill="#c89973"/>
   <path d="M326 190q28-26 16-39" stroke="#c89973" strokeWidth="11" fill="none" strokeLinecap="round"/>
   <ellipse cx="286" cy="219" rx="31" ry="28" fill="#d9ad84"/>
   <ellipse cx="258" cy="215" rx="10" ry="27" fill="#9d795f"/><ellipse cx="313" cy="215" rx="10" ry="27" fill="#9d795f"/>
   <path d="m272 222 7 2m13 0 7-2" stroke="#675748" strokeWidth="3" fill="none" strokeLinecap="round"/>
   <ellipse cx="286" cy="239" rx="14" ry="9" fill="#efd5b5"/><ellipse cx="286" cy="237" rx="6" ry="4" fill="#786355"/>
   <path d="M58 251h90l-8 29H66Z" fill="#91b7c6"/><ellipse cx="103" cy="251" rx="45" ry="8" fill="#b9dbe2"/><path d="M93 253q10 5 21 0m-32-6 4-7m34 8 4-7" stroke="#f6fcf5" strokeWidth="2" fill="none"/>
   <path d="M244 251h89l-8 29h-73Z" fill="#d5a178"/><ellipse cx="289" cy="251" rx="44" ry="9" fill="#f4dab0"/>
   {[264,277,289,301,314].map(x=><circle key={x} cx={x} cy={251+(x%3)} r="5" fill="#b3895d"/>)}
 </>}
 {lessonId==='pond' && <><Tree x={304} y={166} scale={.85}/><Bird x={329} y={119} scale={.75}/><ellipse cx="215" cy="274" rx="128" ry="35" fill="#a1c7c7"/><g fill="#e5ae77"><ellipse cx="214" cy="271" rx="22" ry="10"/><path d="m233 271 15-10v20Z"/></g><circle cx="200" cy="268" r="2" fill="#79664d"/><path d="M137 283h24m92-16h30" stroke="#d1e5d5" strokeWidth="3"/><Person x={67} y={211} scale={.7} color="#dcbf7f"/><path d="m93 211 32 20" stroke="#f2ccaa" strokeWidth="7" strokeLinecap="round"/></>}
 {lessonId==='basket' && <><Person x={92} y={194} scale={.95} color="#daba77"/><path d="m118 195 41 38" stroke="#f2ccaa" strokeWidth="10" strokeLinecap="round"/><path d="M213 219q-7-91 68-91t50 96" stroke="#b99164" strokeWidth="9" fill="none"/><Cat x={270} y={216} scale={1.2} sleep/><path d="M203 227h136l-13 57H214Z" fill="#d8b27e"/><path d="M211 245h120m-115 18h112m-99-33 6 52m27-53v55m29-55-4 54m28-54-7 52" stroke="#b89564" strokeWidth="3"/><path d="M328 147h13l-13 14h13m10-32h10l-10 11h10" stroke="#8b9b7c" strokeWidth="3" fill="none"/></>}
 {lessonId==='sky' && <><path d="M200 0h176q24 0 24 24v272q0 24-24 24H200Z" fill="#657786"/><circle cx="68" cy="70" r="29" fill="#f1cc75"/><path d="M336 38a32 32 0 1 0 20 50 31 31 0 0 1-20-50" fill="#f7e6b0"/>{[[233,50],[290,103],[367,134]].map(([x,y])=><path key={x} d={`M${x-4} ${y}h8m-4-4v8`} stroke="#d9e3d6" strokeWidth="2"/>)}<path d="m0 256 85-132 80 94 35-43v145H0Z" fill="#a6ba93"/><path d="m200 256 86-132 81 94 33-43v145H200Z" fill="#829895"/><path d="m60 162 25-38 32 38-22-10-12 9-11-8Z" fill="#f7f0d7"/><path d="m261 162 25-38 32 38-22-10-12 9-11-8Z" fill="#cdd8d1"/><path d="M200 16v289" stroke="#f9f4de" strokeWidth="3" strokeDasharray="6 7"/></>}
 {lessonId==='plants' && <><Tree x={118} y={202} scale={1.1}/><Flower x={245} y={226}/><Flower x={294} y={212}/><Flower x={336} y={235}/>{[215,240,266,292,319,345].map(x=><path key={x} d={`m${x} 290-5-18m5 18 7-23m-7 23 13-11`} stroke="#7c9d62" strokeWidth="4" fill="none" strokeLinecap="round"/>)}</>}
 {lessonId==='positions' && <><Tree x={194} y={212} scale={1.2}/><Bird x={239} y={141} scale={1.05}/><Cat x={193} y={269} scale={.8}/></>}
 </svg>;
}
