import {randomUUID} from 'node:crypto';
import {Hono} from 'hono';
import {bodyLimit} from 'hono/body-limit';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import {manifestSchema,type ContentManifest} from '@learnbuddy/contracts';
import {principal} from './accounts.js';
import type {Auth} from './auth.js';
import type {database} from './db.js';
import {writeRelease} from './release-writer.js';
import {validatePublication} from './content-validation.js';
import {mediaBytes,publishMedia,storeUpload} from './content-media.js';
const revision=z.number().int().positive();
const saveSchema=z.object({revision,manifest:manifestSchema}).strict();
const publishSchema=z.object({draftId:z.uuid(),revision,channelRevision:revision}).strict();
const activationSchema=z.object({channelRevision:revision}).strict();
const conflict=()=>new HTTPException(409,{message:'内容已被其他操作修改，请重新加载后再试'});
function parse<T>(schema:z.ZodType<T>,value:unknown):T {const r=schema.safeParse(value);if(!r.success)throw new HTTPException(400,{message:'输入格式不正确，请检查内容'});return r.data;}
export function contentAdminRoutes(db:ReturnType<typeof database>,auth:Auth,origins:string[]) {
 const app=new Hono<{Variables:{actorId:string}}>();
 app.use('*',async(c,next)=>{
  c.header('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(c.req.method)&&!origins.includes(c.req.header('Origin')||''))throw new HTTPException(403,{message:'请求来源不受信任'});
  const user=await principal(auth,c.req.raw.headers);
  if(user.role!=='admin')throw new HTTPException(403,{message:'需要内容管理员权限'});
  c.set('actorId',user.accountId);await next();
 });
 app.use('/uploads',bodyLimit({maxSize:20*1024*1024}));
 app.use('/drafts/*',bodyLimit({maxSize:16*1024*1024}));
 app.use('/drafts',bodyLimit({maxSize:4096}));
 app.use('/releases*',bodyLimit({maxSize:4096}));
 app.get('/content',async c=>c.json({
  channel:await db.contentChannel.findUniqueOrThrow({where:{id:'default'}}),
  releases:await db.contentRelease.findMany({select:{id:true,createdAt:true},orderBy:{createdAt:'desc'}}),
  drafts:await db.contentDraft.findMany({select:{id:true,baseReleaseId:true,revision:true,updatedAt:true,publishedReleaseId:true},orderBy:{updatedAt:'desc'},take:50}),
  audit:await db.contentAudit.findMany({orderBy:{createdAt:'desc'},take:30}),
 }));
 app.post('/drafts',async c=>{
  const {baseReleaseId}=parse(z.object({baseReleaseId:z.string()}).strict(),await c.req.json().catch(()=>null));
  const base=await db.contentRelease.findUnique({where:{id:baseReleaseId}});
  if(!base)throw new HTTPException(404,{message:'内容版本不存在'});
  const result=await db.$transaction(async tx=>{
   const draft=await tx.contentDraft.create({data:{baseReleaseId,manifest:base.manifest!,createdBy:c.get('actorId')}});
   await tx.contentAudit.create({data:{actorId:c.get('actorId'),action:'create-draft',targetId:draft.id,detail:{baseReleaseId}}});return draft;
  });return c.json(result,201);
 });
 app.get('/drafts/:id',async c=>{
  if(!z.uuid().safeParse(c.req.param('id')).success)throw new HTTPException(404);
  const d=await db.contentDraft.findUnique({where:{id:c.req.param('id')}});if(!d)throw new HTTPException(404);return c.json(d);
 });
 app.put('/drafts/:id',async c=>{
  if(!z.uuid().safeParse(c.req.param('id')).success)throw new HTTPException(404);
  const input=parse(saveSchema,await c.req.json().catch(()=>null));
  const result=await db.$transaction(async tx=>{
   const changed=await tx.contentDraft.updateMany({where:{id:c.req.param('id'),revision:input.revision,publishedReleaseId:null},data:{manifest:input.manifest,revision:{increment:1}}});
   if(!changed.count)throw conflict();
   await tx.contentAudit.create({data:{actorId:c.get('actorId'),action:'save-draft',targetId:c.req.param('id'),detail:{revision:input.revision+1}}});
   return tx.contentDraft.findUniqueOrThrow({where:{id:c.req.param('id')}});
  });return c.json(result);
 });
 app.post('/drafts/:id/validate',async c=>{
  if(!z.uuid().safeParse(c.req.param('id')).success)throw new HTTPException(404);
  const d=await db.contentDraft.findUnique({where:{id:c.req.param('id')}});if(!d)throw new HTTPException(404);
  const base=await db.contentRelease.findUniqueOrThrow({where:{id:d.baseReleaseId}});
  try {const m=validatePublication(d.manifest,base.manifest as ContentManifest);for(const a of m.assets)await mediaBytes(db,a);return c.json({valid:true,revision:d.revision,warnings:['当前素材仍待人工审校；发布仅供内部体验。']});}
  catch(e){return c.json({valid:false,revision:d.revision,errors:[(e as Error).message]},422);}
 });
 app.post('/uploads',async c=>{
  try {const asset=await storeUpload(db,c.get('actorId'),Buffer.from(await c.req.arrayBuffer()));return c.json(asset,201);}
  catch(e){throw new HTTPException(400,{message:(e as Error).message});}
 });
 app.get('/media/:hash',async c=>{
  const sha256=c.req.param('hash');if(!/^[a-f0-9]{64}$/.test(sha256))throw new HTTPException(404);
  const uploaded=await db.contentUpload.findUnique({where:{sha256}});
  const published=await db.assetVersion.findFirst({where:{sha256}});
  if(!uploaded&&!published)throw new HTTPException(404);
  const asset=published?published.metadata as ContentManifest['assets'][number]:{...uploaded!,durationMs:uploaded!.durationMs??undefined};
  const bytes=await mediaBytes(db,asset);
  return new Response(new Uint8Array(bytes),{headers:{'Content-Type':asset.mimeType,'Cache-Control':'no-store','X-Content-Type-Options':'nosniff','Content-Security-Policy':"default-src 'none'; sandbox"}});
 });
 app.post('/releases',async c=>{
  const input=parse(publishSchema,await c.req.json().catch(()=>null));
  const d=await db.contentDraft.findUnique({where:{id:input.draftId}});
  if(!d||d.revision!==input.revision||d.publishedReleaseId)throw conflict();
  const base=await db.contentRelease.findUniqueOrThrow({where:{id:d.baseReleaseId}});
  let manifest:ContentManifest;
  try {manifest=validatePublication(d.manifest,base.manifest as ContentManifest);await publishMedia(db,manifest.assets);}
  catch(e){throw new HTTPException(422,{message:(e as Error).message});}
  const releaseId=`release-${randomUUID()}`;manifest.releaseId=releaseId;
  await db.$transaction(async tx=>{
   // CAS both draft and active pointer; any failure rolls back the entire normalized release.
   const changed=await tx.contentDraft.updateMany({where:{id:d.id,revision:input.revision,publishedReleaseId:null},data:{revision:{increment:1}}});if(!changed.count)throw conflict();
   await writeRelease(tx,manifest);
   const channel=await tx.contentChannel.updateMany({where:{id:'default',revision:input.channelRevision},data:{releaseId,revision:{increment:1}}});if(!channel.count)throw conflict();
   await tx.contentDraft.update({where:{id:d.id},data:{publishedReleaseId:releaseId}});
   await tx.contentAudit.create({data:{actorId:c.get('actorId'),action:'publish',targetId:releaseId,detail:{draftId:d.id,baseReleaseId:d.baseReleaseId}}});
  },{timeout:180000});return c.json({releaseId},201);
 });
 app.post('/releases/:id/activate',async c=>{
  const input=parse(activationSchema,await c.req.json().catch(()=>null)),releaseId=c.req.param('id');
  const release=await db.contentRelease.findUnique({where:{id:releaseId}});if(!release)throw new HTTPException(404);
  try {for(const a of manifestSchema.parse(release.manifest).assets)await mediaBytes(db,a);}
  catch{throw new HTTPException(422,{message:'版本素材不可用，不能启用'});}
  await db.$transaction(async tx=>{
   const channel=await tx.contentChannel.updateMany({where:{id:'default',revision:input.channelRevision},data:{releaseId,revision:{increment:1}}});if(!channel.count)throw conflict();
   await tx.contentAudit.create({data:{actorId:c.get('actorId'),action:'activate',targetId:releaseId,detail:{}}});
  });return c.json({releaseId});
 });
 return app;
}
