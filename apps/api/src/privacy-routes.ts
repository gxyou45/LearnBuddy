import {Hono} from 'hono';
import {HTTPException} from 'hono/http-exception';
import {z} from 'zod';
import {deletionRequestSchema,deletionStatusSchema} from '@learnbuddy/contracts';
import type {database} from './db.js';
import type {Auth} from './auth.js';
import {principal} from './accounts.js';
import {cleanupHash,deleteFamilyData,exportFamily,privacyRateLimit} from './data-management.js';
export function privacyRoutes(db:ReturnType<typeof database>,auth:Auth,origins:string[]){
 const app=new Hono();
 app.use('*',async(c,next)=>{c.header('Cache-Control','no-store');if(!['GET','HEAD'].includes(c.req.method)&&!origins.includes(c.req.header('Origin')||''))throw new HTTPException(403,{message:'请求来源不受信任'});await next();});
 app.post('/deletion-status',async c=>{
  const input=deletionStatusSchema.safeParse(await c.req.json().catch(()=>null));if(!input.success)throw new HTTPException(400,{message:'清理凭据无效'});
  const found=await db.dataDeletion.findFirst({where:{accountId:input.data.accountId,scope:'account',cleanupTokenHash:cleanupHash(input.data.cleanupToken)}});
  // Capability authorizes only learning that this previously visited account was deleted.
  return c.json({deleted:!!found});
 });
 for(const path of ['/account/export','/learners/:id/export'])app.get(path,async c=>{
  const user=await principal(auth,c.req.raw.headers),id=c.req.param('id');if(id&&!z.uuid().safeParse(id).success)throw new HTTPException(404,{message:'没有找到孩子档案'});
  const data=await exportFamily(db,user.accountId,id);c.header('Content-Disposition','attachment; filename="learnbuddy-data.json"');return c.json(data);
 });
 for(const path of ['/account','/learners/:id'])app.delete(path,async c=>{
  const user=await principal(auth,c.req.raw.headers),id=c.req.param('id');if(id&&!z.uuid().safeParse(id).success)throw new HTTPException(404,{message:'没有找到孩子档案'});
  const input=deletionRequestSchema.safeParse(await c.req.json().catch(()=>null));if(!input.success)throw new HTTPException(400,{message:'请确认删除目标并输入当前密码'});
  if(id&&!await db.learner.findFirst({where:{id,accountId:user.accountId}})&&!await db.dataDeletion.findFirst({where:{requestId:input.data.requestId,accountId:user.accountId,learnerId:id}}))throw new HTTPException(404,{message:'没有找到孩子档案'});
  await privacyRateLimit(db,user.accountId);
  try{await auth.api.verifyPassword({headers:c.req.raw.headers,body:{password:input.data.password}});}catch{throw new HTTPException(403,{message:'密码验证失败或登录已失效，请重新确认'});}
  return c.json(await deleteFamilyData(db,user.accountId,input.data.requestId,input.data.confirmation,id));
 });
 return app;
}
