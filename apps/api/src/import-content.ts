import {writeRelease} from './release-writer.js';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve, dirname } from 'node:path';
import { createHash } from 'node:crypto';
import { validateManifest } from '@learnbuddy/contracts';
import { database } from './db.js';
const hash = (b: Buffer|string) => createHash('sha256').update(b).digest('hex');
export async function importContent() {
 const source=resolve(process.env.CONTENT_DIR || '../../content');
 const media=resolve(process.env.MEDIA_DIR || '../../media');
 const raw=await readFile(resolve(source,'manifest.json'),'utf8');
 const m=validateManifest(JSON.parse(raw)), checksum=hash(JSON.stringify(m));
 // Check every file before any database write. Paths are restricted by the contract.
 for(const a of m.assets) {
  const data=await readFile(resolve(source,'files',a.objectKey));
  if(hash(data)!==a.sha256 || data.length!==a.bytes || !a.objectKey.includes(a.sha256)) throw new Error(`Asset checksum mismatch: ${a.id}`);
  const target=resolve(media,a.objectKey); await mkdir(dirname(target),{recursive:true});
  try { const existing=await readFile(target); if(hash(existing)!==a.sha256) throw new Error(`Corrupt stored asset: ${a.id}`); }
  catch(e) { if((e as NodeJS.ErrnoException).code!=='ENOENT') throw e; await writeFile(target,data,{flag:'wx'}).catch(async e=>{if(e.code!=='EEXIST' || hash(await readFile(target))!==a.sha256) throw e;}); }
 }
 const db=database();
 try {
  const result=await db.$transaction(async tx=>{
   await tx.$executeRaw`SELECT pg_advisory_xact_lock(72841001)`;
   const existing=await tx.contentRelease.findUnique({where:{id:m.releaseId}});
   if(existing) {if(existing.checksum!==checksum) throw new Error('Release content changed: use a new releaseId; existing data will not be overwritten.'); return 'already imported';}
   await writeRelease(tx,m);
   await tx.contentChannel.upsert({where:{id:'default'},create:{id:'default',releaseId:m.releaseId},update:{}});
   return 'imported';
  },{timeout:60000});
  console.log(`${m.releaseId}: ${result}; ${m.lessons.length} lessons, ${m.assets.length} assets verified`);
 } finally {await db.$disconnect();}
}
importContent().catch(e=>{console.error(e);process.exitCode=1;});
