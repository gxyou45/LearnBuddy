import type {Context} from 'hono';
import type {database} from './db.js';
import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
export async function publicMedia(db:ReturnType<typeof database>,c:Context) {
 const key=c.req.path.slice('/media/'.length);
 if(!/^assets\/(audio|images)\/[a-f0-9]{64}\.(wav|svg|png)$/.test(key))return c.notFound();
 const asset=await db.assetVersion.findFirst({where:{objectKey:key}});
 if(!asset)return c.notFound(); // Draft uploads never pass this publication gate.
 let bytes:Buffer;
 try {bytes=await readFile(resolve(process.env.MEDIA_DIR||'../../media',key));}catch{return c.notFound();}
 const headers:Record<string,string>={'Content-Type':asset.mimeType,'Cache-Control':'public, max-age=31536000, immutable','X-Content-Type-Options':'nosniff','Accept-Ranges':'bytes','ETag':`"${asset.sha256}"`,'Content-Security-Policy':"default-src 'none'; sandbox"};
 if(c.req.header('If-None-Match')===headers.ETag)return new Response(null,{status:304,headers});
 const range=c.req.header('Range');
 if(range && (!c.req.header('If-Range')||c.req.header('If-Range')===headers.ETag)) {
  const match=/^bytes=(\d*)-(\d*)$/.exec(range);
  let start=0,end=bytes.length-1;
  if(match && (match[1]||match[2])) {
   if(match[1]){start=Number(match[1]);if(match[2])end=Math.min(end,Number(match[2]));}
   else start=Math.max(0,bytes.length-Number(match[2]));
  }else start=bytes.length;
  if(start>end||start>=bytes.length){headers['Content-Range']=`bytes */${bytes.length}`;return new Response(null,{status:416,headers});}
  headers['Content-Range']=`bytes ${start}-${end}/${bytes.length}`;headers['Content-Length']=String(end-start+1);
  return new Response(new Uint8Array(bytes.subarray(start,end+1)),{status:206,headers});
 }
 headers['Content-Length']=String(bytes.length);
 return new Response(new Uint8Array(bytes),{headers});
}
