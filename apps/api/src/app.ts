import {privacyRoutes} from './privacy-routes.js';
import {learningRoutes} from './learning-routes.js';
import {contentAdminRoutes} from './content-admin.js';
import {publicMedia} from './public-media.js';
import {bodyLimit} from 'hono/body-limit';
import {accountsRoutes} from './accounts.js';
import type {Auth} from './auth.js';
import { createHash } from 'node:crypto';
import { contentOpenAPI } from './openapi.js';
import { Hono } from 'hono';
import { requestId } from 'hono/request-id';
import type { database } from './db.js';
import { HTTPException } from 'hono/http-exception';
import { inventory, catalog, lessonPackage, catalogUpgrade } from './content-service.js';
export function createApp(db: ReturnType<typeof database>, auth?: Auth, origins: string[] = []) {
 const app = new Hono();
 app.use('*', requestId());
 app.use('/api/auth/*',bodyLimit({maxSize:32768}));
 app.use('/api/v1/learners*',bodyLimit({maxSize:524288}));
 app.use('/api/v1/account*',bodyLimit({maxSize:4096}));
 app.use('/api/v1/deletion-status',bodyLimit({maxSize:4096}));
 app.onError((error, c) => {
  if(error instanceof HTTPException) return c.json({error:{code:error.status===404?'CONTENT_NOT_FOUND':'INVALID_REQUEST',message:error.message}},error.status);
  console.error(JSON.stringify({requestId:c.get('requestId'),error:error.message}));
  return c.json({error:{code:'INTERNAL_ERROR',message:'服务暂时不可用',requestId:c.get('requestId')}},500);
 });
 app.notFound(c => c.json({error:{code:'NOT_FOUND',message:'接口不存在'}},404));
 app.get('/api/health', async c => {
  try {
   await db.$queryRaw`SELECT 1`;
   if(auth) await auth.api.getSession({headers:new Headers({host:new URL(origins[0]).host})});
   const channel=await db.contentChannel.findUnique({where:{id:'default'},include:{release:true}});
   const release=channel?.release;
   if (!release) throw new Error('Content missing');
   return c.json({status:'ok',phase:'R7-local',releaseId:release.id});
  } catch { return c.json({error:{code:'NOT_READY',message:'数据库或初始内容尚未就绪'}},503); }
 });
 app.get('/media/*',c=>publicMedia(db,c));
 if(auth) {
  app.on(['GET','POST'],'/api/auth/*',c=>auth.handler(c.req.raw));
  app.route('/api/v1/admin',contentAdminRoutes(db,auth,origins));
  app.route('/api/v1',privacyRoutes(db,auth,origins));
  app.route('/api/v1',learningRoutes(db,auth,origins));
  app.route('/api/v1',accountsRoutes(db,auth,origins));
 }
 app.get('/api/v1/content/inventory', async c => c.json(await inventory(db)));
 app.get('/api/v1/openapi.json',c=>c.json(contentOpenAPI));
 app.use('/api/v1/*',async(c,next)=>{await next();if(c.res.status!==200)return;const body=await c.res.clone().text();const tag='\"'+createHash('sha256').update(body).digest('hex')+'\"';c.header('ETag',tag);c.header('Cache-Control','private, no-cache');if(c.req.header('If-None-Match')?.split(',').map(s=>s.trim()).some(s=>s===tag||s==='*')) c.res=new Response(null,{status:304,headers:c.res.headers});});
 app.get('/api/v1/catalog-upgrade',async c=>c.json(await catalogUpgrade(db,c.req.query('from')||'')));
 app.get('/api/v1/catalog', async c => c.json(await catalog(db,c.req.query('releaseId'))));
 app.get('/api/v1/releases/:releaseId/lessons/:lessonId', async c => {
  const data=await lessonPackage(db,c.req.param('releaseId'),c.req.param('lessonId'));
  c.header('Cache-Control','private, max-age=0, must-revalidate');
  return c.json(data);
 });
 return app;
}
