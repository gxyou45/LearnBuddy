import {createHash} from 'node:crypto';
import type {ContentManifest} from '@learnbuddy/contracts';
import type {Prisma} from './generated/prisma/client.js';
export async function writeRelease(tx:Prisma.TransactionClient,m:ContentManifest) {
 const checksum=createHash('sha256').update(JSON.stringify(m)).digest('hex');
   await tx.contentRelease.create({data:{id:m.releaseId,contentVersion:m.contentVersion,checksum,manifest:m}});
   for(const t of m.themes) await tx.theme.create({data:{id:`${m.releaseId}:${t.id}`,releaseId:m.releaseId,title:t.title,position:t.order,metadata:t}});
   for(const a of m.assets) await tx.assetVersion.create({data:{id:`${m.releaseId}:${a.id}`,releaseId:m.releaseId,sourceId:a.id,objectKey:a.objectKey,sha256:a.sha256,bytes:a.bytes,mimeType:a.mimeType,metadata:a}});
   for(const [position,l] of m.lessons.entries()) {
    const id=`${m.releaseId}:${l.id}`;
    await tx.lessonVersion.create({data:{id,releaseId:m.releaseId,lessonId:l.id,title:l.title,position,content:l}});
    for(const c of l.characters) {
     await tx.characterVersion.create({data:{id:`${m.releaseId}:${c.id}`,lessonVersionId:id,characterId:c.id,text:c.text,content:c}});
     await tx.wordVersion.create({data:{id:`${id}:word-${c.id}`,lessonVersionId:id,text:c.word,audioAssetId:`${m.releaseId}:audio-word-${c.id}`}});
    }
    await tx.storyVersion.create({data:{id:`${id}:story`,lessonVersionId:id,text:l.story.text,content:l.story}});
    for(const [position,s] of l.steps.entries()) {
     const stepId=`${id}:${s.id}`;
     await tx.lessonStep.create({data:{id:stepId,lessonVersionId:id,position,kind:s.kind,config:s}});
     if(['sound','meaning','hunt'].includes(s.kind)) await tx.questionVersion.create({data:{id:`${stepId}:v1`,stepId,answer:s.characterId?[s.characterId]:l.characters.map(c=>c.id),options:l.characters.filter((c,i,all)=>!s.characterId || c.id===s.characterId || (c.word!==all.find(x=>x.id===s.characterId)!.word && all.findIndex(x=>x.word===c.word)===i)).map(c=>({id:c.id,text:c.text,word:c.word,icon:c.icon}))}});
    }
   }
   for(const s of m.huntScenes) await tx.huntSceneVersion.create({data:{id:`${m.releaseId}:${s.id}`,releaseId:m.releaseId,imageAssetId:`${m.releaseId}:${s.imageAssetId}`,config:s}});
}
