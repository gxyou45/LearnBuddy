import type { ContentInventory } from '@learnbuddy/contracts';
import type { database } from './db.js';
export async function inventory(db: ReturnType<typeof database>): Promise<ContentInventory> {
  const release=await activeRelease(db);
  if(!release) throw new Error('Content has not been imported');
  const where={releaseId:release.id};
  const lessons=await db.lessonVersion.findMany({where,orderBy:{position:'asc'},include:{characters:true,story:true,_count:{select:{words:true,steps:true}}}});
  return {phase:'ARC-03',releaseId:release.id,contentVersion:release.contentVersion,reviewStatus:'pending',frontendDataSource:'api',counts:{themes:await db.theme.count({where}),lessons:lessons.length,characters:lessons.reduce((n,l)=>n+l.characters.length,0),words:lessons.reduce((n,l)=>n+l._count.words,0),stories:lessons.filter(l=>l.story).length,steps:lessons.reduce((n,l)=>n+l._count.steps,0),assets:await db.assetVersion.count({where}),scenes:await db.huntSceneVersion.count({where})},lessons:lessons.map(l=>({id:l.lessonId,title:l.title,characters:l.characters.map(c=>c.text),story:l.story?.text??''}))};
}

import { catalogSchema, lessonPackageSchema, validateManifest } from '@learnbuddy/contracts';
import { HTTPException } from 'hono/http-exception';
async function activeRelease(db:ReturnType<typeof database>) {
 const channel=await db.contentChannel.findUnique({where:{id:'default'}});
 return channel?db.contentRelease.findUnique({where:{id:channel.releaseId}}):null;
}
async function releaseFor(db:ReturnType<typeof database>, releaseId?:string) {
 if (releaseId && !/^[a-z0-9][a-z0-9-]*$/.test(releaseId)) throw new HTTPException(400,{message:'Invalid release'});
 const release=releaseId ? await db.contentRelease.findUnique({where:{id:releaseId}}) : await activeRelease(db);
 if(!release) throw new HTTPException(404,{message:'Content version unavailable'});
 return release;
}
export async function catalog(db:ReturnType<typeof database>, releaseId?:string) {
 const release=await releaseFor(db,releaseId);
 const rows=await db.lessonVersion.findMany({where:{releaseId:release.id},orderBy:{position:'asc'},include:{steps:{orderBy:{position:'asc'}}}});
 const themes=await db.theme.findMany({where:{releaseId:release.id},orderBy:{position:'asc'}});
 // Validate stored content at the API boundary; never return ORM records directly.
 const manifest=validateManifest(release.manifest);
 return catalogSchema.parse({apiVersion:1,releaseId:release.id,contentVersion:release.contentVersion,themes:themes.map(t=>t.metadata),lessons:rows.map(row=>{
  const l=manifest.lessons.find(l=>l.id===row.lessonId)!;
  return {id:l.id,title:row.title,theme:l.theme,intro:l.intro,image:{id:l.imageAssetId,url:`/media/${manifest.assets.find(a=>a.id===l.imageAssetId)!.objectKey}`},characters:l.characters,stepIndex:row.steps.map(s=>{const config=s.config as {id:string;characterId?:string};return {id:config.id,kind:s.kind,characterId:config.characterId};})};
 })});
}
export async function lessonPackage(db:ReturnType<typeof database>, releaseId:string, lessonId:string) {
 const release=await releaseFor(db,releaseId);
 const row=await db.lessonVersion.findUnique({where:{releaseId_lessonId:{releaseId:release.id,lessonId}},include:{steps:{orderBy:{position:'asc'}},story:true,characters:true}});
 if(!row) throw new HTTPException(404,{message:'Lesson unavailable'});
 const manifest=validateManifest(release.manifest);
 const base=manifest.lessons.find(l=>l.id===lessonId)!;
 const lesson={...base,...row.content as object,title:row.title,steps:row.steps.map(s=>s.config),story:row.story?.content};
 const theme=manifest.themes.find(t=>t.order===base.theme)!;
 const sceneConfig=manifest.huntScenes.find(s=>s.themeIds.includes(theme.id));
 const sceneRow=sceneConfig?await db.huntSceneVersion.findUnique({where:{id:`${release.id}:${sceneConfig.id}`}}):null;
 if(!sceneRow) throw new Error('Scene unavailable');
 const scene=sceneRow.config as typeof manifest.huntScenes[number];
 const needed=new Set([base.imageAssetId,scene.imageAssetId,...base.steps.map(s=>`audio-${s.audio}`),...base.characters.flatMap(c=>[`audio-${c.audio}`,`audio-word-${c.id}`]),...['meaning','hunt','answer-correct','answer-incorrect'].map(id=>`audio-${id}`)]);
 const characterImages:Record<string,string>={};
 for(const c of base.characters) if(manifest.assets.some(a=>a.id===`image-character-${c.id}`)){characterImages[c.id]=`image-character-${c.id}`;needed.add(characterImages[c.id]);}
 const assets=await db.assetVersion.findMany({where:{releaseId:release.id,sourceId:{in:[...needed]}}});
 return lessonPackageSchema.parse({apiVersion:1,releaseId:release.id,contentVersion:release.contentVersion,lesson,scene,characterImages,assets:assets.map(a=>({...a.metadata as object,url:`/media/${a.objectKey}`}))});
}

/** Public catalogs contain no learner data; only advertise strictly additive upgrades. */
export async function catalogUpgrade(db:ReturnType<typeof database>,from:string) {
 const previous=await releaseFor(db,from),current=await activeRelease(db);
 if(!current)return {releaseId:from};
 const {isCompatibleExpansion}=await import('@learnbuddy/contracts');
 return {releaseId:isCompatibleExpansion(validateManifest(current.manifest),validateManifest(previous.manifest))?current.id:from};
}
