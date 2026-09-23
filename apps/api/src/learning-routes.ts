import {upgradeCurriculum} from './curriculum-upgrade.js';
import {prepareSync,syncBatch,learningChanges} from './sync-service.js';
import {importLegacy} from './legacy-import.js';
import {Hono} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import {syncPrepareSchema,syncBatchSchema,legacyImportSchema,startLearningSchema,learningEventSchema} from '@learnbuddy/contracts';
import type {database} from './db.js';
import type {Auth} from './auth.js';
import {principal,ownedLearner} from './accounts.js';
import {applyLearningEvent,learningProgress,mistakes,reviewQueue,startLearning,setLearningSettings} from './learning-service.js';
export function learningRoutes(db:ReturnType<typeof database>,auth:Auth,origins:string[]) {
 const app=new Hono<{Variables:{accountId:string;learnerId:string}}>();
 app.use('/learners/:id/*',async(c,next)=>{
  c.header('Cache-Control','no-store');
  if(!['GET','HEAD'].includes(c.req.method)&&!origins.includes(c.req.header('Origin')||''))throw new HTTPException(403,{message:'请求来源不受信任'});
  const user=await principal(auth,c.req.raw.headers),id=c.req.param('id')!;
  await ownedLearner(db,user.accountId,id);c.set('accountId',user.accountId);c.set('learnerId',id);await next();
 });
 const parse=<T>(schema:z.ZodType<T>,value:unknown)=>{const r=schema.safeParse(value);if(!r.success)throw new HTTPException(400,{message:'学习请求格式不正确'});return r.data;};
 app.post('/learners/:id/curriculum-upgrade',async c=>{const input=parse(z.object({expectedReleaseId:z.string().regex(/^[a-z0-9][a-z0-9-]*$/)}).strict(),await c.req.json().catch(()=>null));return c.json(await upgradeCurriculum(db,c.get('accountId'),c.get('learnerId'),input.expectedReleaseId));});
 app.post('/learners/:id/sync-streams',async c=>{const input=parse(syncPrepareSchema,await c.req.json().catch(()=>null));return c.json(await prepareSync(db,c.get('accountId'),c.get('learnerId'),input.streamId,input.sessionId));});
 app.post('/learners/:id/events:batch',async c=>{const input=parse(syncBatchSchema,await c.req.json().catch(()=>null));return c.json(await syncBatch(db,c.get('accountId'),c.get('learnerId'),input.streamId,input.events));});
 app.get('/learners/:id/changes',async c=>{const input=parse(z.object({cursor:z.coerce.number().int().min(0)}).strict(),c.req.query());return c.json(await db.$transaction(tx=>learningChanges(tx,c.get('learnerId'),input.cursor),{isolationLevel:'RepeatableRead'}));});
 app.post('/learners/:id/imports',async c=>{const input=parse(legacyImportSchema,await c.req.json().catch(()=>null));return c.json(await importLegacy(db,c.get('accountId'),c.get('learnerId'),input.progress));});
 app.get('/learners/:id/imports',async c=>c.json({items:await db.legacyImport.findMany({where:{learnerId:c.get('learnerId')},select:{id:true,source:true,fingerprint:true,createdAt:true}})}));
 app.get('/learners/:id/progress',async c=>c.json(await db.$transaction(tx=>learningProgress(tx,c.get('learnerId')),{isolationLevel:'RepeatableRead'})));
 app.post('/learners/:id/sessions',async c=>c.json(await startLearning(db,c.get('accountId'),c.get('learnerId'),parse(startLearningSchema,await c.req.json().catch(()=>null)))));
 app.post('/learners/:id/events',async c=>c.json(await applyLearningEvent(db,c.get('accountId'),c.get('learnerId'),parse(learningEventSchema,await c.req.json().catch(()=>null)))));
 app.patch('/learners/:id/learning-settings',async c=>{const input=parse(z.object({openAllCourses:z.boolean()}).strict(),await c.req.json().catch(()=>null));return c.json(await setLearningSettings(db,c.get('accountId'),c.get('learnerId'),input.openAllCourses));});
 app.get('/learners/:id/mistakes',async c=>{
  const query=parse(z.object({cursor:z.uuid().optional(),status:z.enum(['active','all']).optional()}).strict(),c.req.query());
  return c.json(await db.$transaction(tx=>mistakes(tx,c.get('learnerId'),query.cursor,query.status),{isolationLevel:'RepeatableRead'}));
 });
 app.get('/learners/:id/reviews',async c=>{const q=parse(z.object({lessonId:z.string().regex(/^[a-z0-9][a-z0-9-]*$/).optional()}).strict(),c.req.query());return c.json(await db.$transaction(tx=>reviewQueue(tx,c.get('learnerId'),q.lessonId),{isolationLevel:'RepeatableRead'}));});
 return app;
}
