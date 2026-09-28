import type {Context} from 'hono';
import type {database} from './db.js';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {mediaResponse} from './media-response.js';
export async function publicMedia(db:ReturnType<typeof database>,c:Context) {
 const key=c.req.path.slice('/media/'.length);
 if(!/^assets\/(audio|images)\/[a-f0-9]{64}\.(wav|svg|png)$/.test(key))return c.notFound();
 const asset=await db.assetVersion.findFirst({where:{objectKey:key}});
 if(!asset)return c.notFound(); // Draft uploads never pass this publication gate.
 let bytes:Buffer;
 try {bytes=await readFile(resolve(process.env.MEDIA_DIR||'../../media',key));}catch{return c.notFound();}
 const headers:Record<string,string>={'Content-Type':asset.mimeType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','ETag':`"${asset.sha256}"`,'Content-Security-Policy':"default-src 'none'; sandbox"};
 if(c.req.header('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});
 return mediaResponse(bytes,headers,!c.req.header('If-Range')||c.req.header('If-Range')===headers.ETag?c.req.header('Range'):undefined);
}
