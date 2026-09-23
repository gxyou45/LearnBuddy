import {learnerInputSchema} from '@learnbuddy/contracts';
import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { z } from 'zod';
import type { database } from './db.js';
import type { Auth } from './auth.js';

// All business modules consume this principal, not provider-specific identities.
export async function principal(auth:Auth,headers:Headers) {
 const session=await auth.api.getSession({headers});
 if(!session?.user.emailVerified) throw new HTTPException(401,{message:'请先验证邮箱并登录'});
 return {accountId:session.user.id,role:session.user.role,email:session.user.email};
}
export async function ownedLearner(db:ReturnType<typeof database>,accountId:string,id:string) {
 if(!z.uuid().safeParse(id).success) throw new HTTPException(404,{message:'没有找到孩子档案'});
 const learner=await db.learner.findFirst({where:{id,accountId},select:{id:true,nickname:true,createdAt:true}});
 if(!learner){if(await db.dataDeletion.findFirst({where:{accountId,learnerId:id}}))throw new HTTPException(410,{message:'这个孩子档案已删除，请清理本机记录'});throw new HTTPException(404,{message:'没有找到孩子档案'});}
 return learner;
}
export function accountsRoutes(db:ReturnType<typeof database>,auth:Auth,origins:string[]) {
 const app=new Hono();
 app.use('*',async(c,next)=>{
  c.header('Cache-Control','no-store');
  if(!['GET','HEAD','OPTIONS'].includes(c.req.method)&&!origins.includes(c.req.header('Origin')||'')) throw new HTTPException(403,{message:'请求来源不受信任'});
  await next();
 });
 app.get('/me',async c=>{
  const user=await principal(auth,c.req.raw.headers);
  const learners=await db.learner.findMany({where:{accountId:user.accountId},select:{id:true,nickname:true,createdAt:true},orderBy:[{createdAt:'asc'},{id:'asc'}]});
  const account=await db.familyAccount.findUniqueOrThrow({where:{id:user.accountId},select:{cleanupToken:true}});
  const deleted=await db.dataDeletion.findMany({where:{accountId:user.accountId,scope:'learner'},select:{learnerId:true}});
  return c.json({account:{...user,cleanupToken:account.cleanupToken},learners,deletedLearnerIds:deleted.map(x=>x.learnerId!)});
 });
 const nickname=learnerInputSchema;
 app.post('/learners',async c=>{
  const user=await principal(auth,c.req.raw.headers);
  const input=nickname.safeParse(await c.req.json().catch(()=>null));
  if(!input.success) throw new HTTPException(400,{message:'请填写 1–20 字的孩子昵称'});
  const learner=await db.$transaction(async tx=>{
   // Serialize per-family creation so the limit also holds under concurrent requests.
   await tx.$queryRaw`SELECT id FROM "Account" WHERE id = ${user.accountId}::uuid FOR UPDATE`;
   if(await tx.learner.count({where:{accountId:user.accountId}})>=8) throw new HTTPException(409,{message:'每个家庭最多创建 8 个档案'});
   return tx.learner.create({data:{accountId:user.accountId,nickname:input.data.nickname},select:{id:true,nickname:true,createdAt:true}});
  });
  return c.json(learner,201);
 });
 app.get('/learners/:id',async c=>c.json(await ownedLearner(db,(await principal(auth,c.req.raw.headers)).accountId,c.req.param('id'))));
 app.patch('/learners/:id',async c=>{
  const user=await principal(auth,c.req.raw.headers);
  const learner=await ownedLearner(db,user.accountId,c.req.param('id'));
  const input=nickname.safeParse(await c.req.json().catch(()=>null));
  if(!input.success) throw new HTTPException(400,{message:'请填写 1–20 字的孩子昵称'});
  return c.json(await db.learner.update({where:{id:learner.id,accountId:user.accountId},data:input.data,select:{id:true,nickname:true,createdAt:true}}));
 });
 app.get('/learners/:id/entitlements',async c=>{
  await ownedLearner(db,(await principal(auth,c.req.raw.headers)).accountId,c.req.param('id'));
  // Single server policy boundary; paid plans can replace this implementation later.
  return c.json({plan:'free',capabilities:{publishedCourses:true,practice:true},dailyPracticeLimit:null,expiresAt:null});
 });
 app.get('/admin/access',async c=>{
  const user=await principal(auth,c.req.raw.headers);
  if(user.role!=='admin') throw new HTTPException(403,{message:'需要内容管理员权限'});
  return c.json({allowed:true});
 });
 return app;
}
