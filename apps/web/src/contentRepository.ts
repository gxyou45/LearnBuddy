import {readLocal,writeLocal} from './offlineStore';
import { catalogSchema, lessonPackageSchema, type Catalog, type LessonPackage, type Lesson, type Character, type Step } from '@learnbuddy/contracts';
export type { Lesson, Character, CharacterId, Step, Story } from '@learnbuddy/contracts';
export let lessons: Lesson[] = [];
export let characters: Character[] = [];
export let themes: Catalog['themes'] = [];
export let contentVersion = 4;
export let releaseId = '';
export let steps: Step[] = [];
let catalogRequest=0,contentGeneration=0;
const localMedia=new Map<string,string>();
const images=new Map<string,string>();
const indexes = new Map<string, Step[]>();
const packages = new Map<string, LessonPackage>();
const pending = new Map<string, Promise<void>>();
export const readingTimings: Record<string,{text:string;starts:number[]}> = {};
const assets = new Map<string,string>();
export function installCatalog(input:unknown) {
 const data=catalogSchema.parse(input);
 if(new Set(data.lessons.map(l=>l.id)).size!==data.lessons.length || new Set(data.lessons.flatMap(l=>l.characters.map(c=>c.id))).size!==data.lessons.flatMap(l=>l.characters).length) throw new Error('Invalid catalog');
 for(const l of data.lessons) if(!l.stepIndex.length || new Set(l.stepIndex.map(s=>s.id)).size!==l.stepIndex.length || !data.themes.some(t=>t.order===l.theme)) throw new Error('Invalid lesson index');
 contentGeneration++;
 releaseId=data.releaseId;contentVersion=data.contentVersion;themes=data.themes;
 for(const url of localMedia.values())URL.revokeObjectURL(url);localMedia.clear();
 images.clear();indexes.clear();packages.clear();pending.clear();assets.clear();
 for(const key of Object.keys(readingTimings)) delete readingTimings[key];
 lessons=data.lessons.map(l=>{
  images.set(l.id,l.image.id);assets.set(l.image.id,l.image.url);
  indexes.set(l.id,l.stepIndex.map(s=>({...s,title:'',subtitle:'',audio:''})));
  return {...l,introAudio:'',lifeTask:'',story:{text:'',audio:'',note:'',supportCharacters:[]}};
 });
 characters=lessons.flatMap(l=>l.characters);steps=getSteps(lessons[0]);
}
export function installLesson(input:unknown) {
 const data=lessonPackageSchema.parse(input);
 if(data.releaseId!==releaseId || data.contentVersion!==contentVersion) throw new Error('Content version mismatch');
 const l=lessons.find(l=>l.id===data.lesson.id);
 if(!l || JSON.stringify(getSteps(l).map(s=>s.id))!==JSON.stringify(data.lesson.steps.map(s=>s.id))) throw new Error('Lesson index mismatch');
 const files=new Map(data.assets.map(a=>[a.id,a]));
 const required=[data.lesson.imageAssetId,data.scene.imageAssetId,...Object.values(data.characterImages),...data.lesson.steps.map(s=>`audio-${s.audio}`),...data.lesson.characters.flatMap(c=>[`audio-${c.audio}`,`audio-word-${c.id}`])];
 if(required.some(id=>!files.has(id))) throw new Error('Incomplete lesson package');
 for(const a of data.assets){
  if(a.url!==`/media/${a.objectKey}` || !a.objectKey.includes(a.sha256)) throw new Error('Invalid asset URL');
  if(a.cues && (a.cues.text!==a.text || a.cues.starts.length!==Array.from(a.cues.text).length || a.cues.starts.some((t,i)=>t*1000>(a.durationMs??0)||(i>0&&t<a.cues!.starts[i-1])))) throw new Error('Invalid audio cues');
 }
 Object.assign(l,data.lesson);indexes.set(l.id,data.lesson.steps);packages.set(l.id,data);
 characters=lessons.flatMap(l=>l.characters);steps=getSteps(lessons[0]);
 for(const a of data.assets){assets.set(a.id,a.url);if(a.cues)readingTimings[a.id.replace(/^audio-/,'')]=a.cues;}
}
async function fetchJSON(path:string) {
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try {if(typeof navigator!=='undefined'&&navigator.onLine===false){const cached=await readLocal<unknown>(`content:${path}`);if(cached)return cached;throw new Error('此课程尚未缓存，请联网加载');}const response=await fetch(path,{signal:controller.signal});if(!response.ok) throw new Error(`课程服务暂时不可用（${response.status}）`);const data=await response.json();if(typeof indexedDB!=='undefined')void writeLocal(`content:${path}`,data).catch(()=>{});return data;}
 finally {clearTimeout(timeout);}
}
export async function loadCatalog(pinned?:string) {const request=++catalogRequest;const data=await fetchJSON(`/api/v1/catalog${pinned?`?releaseId=${encodeURIComponent(pinned)}`:''}`);if(request!==catalogRequest)throw new Error('Superseded catalog request');installCatalog(data);if(typeof indexedDB!=='undefined')await writeLocal(`content:/api/v1/catalog?releaseId=${encodeURIComponent(releaseId)}`,data).catch(()=>{});}
export function isLessonLoaded(id:string) {return packages.has(id);}
export async function loadLesson(id:string) {
 if(packages.has(id)) return;
 if(!pending.has(id)){const generation=contentGeneration;const request=fetchJSON(`/api/v1/releases/${encodeURIComponent(releaseId)}/lessons/${encodeURIComponent(id)}`).then(async data=>{if(generation!==contentGeneration)throw new Error('Superseded lesson request');installLesson(data);if(typeof indexedDB!=='undefined'){if(!navigator.onLine)await cacheLessonMedia(data,generation);else void cacheLessonMedia(data,generation);}}).finally(()=>{if(pending.get(id)===request)pending.delete(id);});pending.set(id,request);}
 return pending.get(id);
}
export function lessonData(id:string) {const data=packages.get(id);if(!data)throw new Error('Lesson has not loaded');return data;}
export function assetURL(id:string) {const url=assets.get(id);if(!url)throw new Error(`Missing asset: ${id}`);return typeof navigator!=='undefined'&&navigator.onLine===false?(localMedia.get(url)||url):url;}
export function getSteps(lesson:Lesson) {return indexes.get(lesson.id)??[];}
export function lessonForCharacter(id:string) {return lessons.find(l=>l.characters.some(c=>c.id===id))||lessons[0];}
export function shuffled<T>(items:readonly T[]):T[] {const result=[...items];for(let i=result.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[result[i],result[j]]=[result[j],result[i]];}return result;}

export function lessonImage(id:string){return images.get(id)!;}

async function cacheLessonMedia(input:unknown,generation:number){
 const data=lessonPackageSchema.parse(input);const files=[...data.assets];
 const worker=async()=>{while(files.length){const a=files.shift()!;try{
  let blob=await readLocal<Blob>(`media:${a.url}`);
  if(!blob&&navigator.onLine){const response=await fetch(a.url);if(!response.ok)continue;blob=await response.blob();await writeLocal(`media:${a.url}`,blob);}
  if(blob&&generation===contentGeneration&&!localMedia.has(a.url))localMedia.set(a.url,URL.createObjectURL(blob));
 }catch{/* Missing media is presented as assisted playback, never independent success. */}}};
 await Promise.all([worker(),worker(),worker(),worker()]);
}
