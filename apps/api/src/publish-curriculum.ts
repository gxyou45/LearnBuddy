/** Explicit local operator publication. Does not change any existing learning record. */
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import {createHash} from 'node:crypto';
import {isCompatibleExpansion,validateManifest} from '@learnbuddy/contracts';
import {database} from './db.js';
import {validatePublication} from './content-validation.js';
import {writeRelease} from './release-writer.js';
const source=resolve(process.argv[2]||''),email=process.argv[3];
if(!email||!process.argv[2])throw new Error('Usage: publish-curriculum DIR VERIFIED_ADMIN_EMAIL');
const db=database(),sha=(b:Buffer)=>createHash('sha256').update(b).digest('hex');
try {
 const actor=await db.familyAccount.findUnique({where:{email}});
 if(!actor?.emailVerified||actor.role!=='admin')throw new Error('指定账号不是已验证管理员');
 const base=validateManifest(JSON.parse(await readFile(resolve(source,'base.json'),'utf8')));
 const m=validatePublication(JSON.parse(await readFile(resolve(source,'manifest.json'),'utf8')),base);
 if(!isCompatibleExpansion(m,base))throw new Error('完整课程必须保留基线所有内容');
 const chars=m.lessons.flatMap(l=>l.characters.map(c=>c.text));
 if(chars.length!==1000||new Set(chars).size!==1000)throw new Error('Expected exactly 1000 unique characters');
 for(const a of m.assets){
  const bytes=await readFile(resolve(source,'files',a.objectKey));if(bytes.length!==a.bytes||sha(bytes)!==a.sha256)throw new Error(`素材校验失败: ${a.id}`);
  const dest=resolve(process.env.MEDIA_DIR||'../../media',a.objectKey);await mkdir(dirname(dest),{recursive:true});
  try{await writeFile(dest,bytes,{flag:'wx'});}catch(e){if((e as NodeJS.ErrnoException).code!=='EEXIST'||sha(await readFile(dest))!==a.sha256)throw e;}
 }
 await db.$transaction(async tx=>{
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(72841001)`;
  const channel=await tx.contentChannel.findUniqueOrThrow({where:{id:'default'}});
  const existing=await tx.contentRelease.findUnique({where:{id:m.releaseId}});
  const checksum=createHash('sha256').update(JSON.stringify(m)).digest('hex');
  if(existing){if(existing.checksum!==checksum)throw new Error('发布编号已存在且内容不同');if(channel.releaseId===m.releaseId)return;throw new Error('版本已存在但当前指针不同，请通过后台明确启用');}
  if(channel.releaseId!==base.releaseId)throw new Error('当前课程已变化，请重新导出基线');
  const live=await tx.contentRelease.findUniqueOrThrow({where:{id:base.releaseId}});
  if(!isCompatibleExpansion(m,validateManifest(live.manifest)))throw new Error('基线内容不匹配');
  await writeRelease(tx,m);
  const updated=await tx.contentChannel.updateMany({where:{id:'default',revision:channel.revision},data:{releaseId:m.releaseId,revision:{increment:1}}});
  if(!updated.count)throw new Error('发布发生冲突，已撤销事务');
  await tx.contentAudit.create({data:{actorId:actor.id,action:'publish-curriculum',targetId:m.releaseId,detail:{baseReleaseId:base.releaseId,lessons:m.lessons.length,characters:1000,materialReview:'pending'}}});
 },{timeout:180000});
 console.log(`Published ${m.releaseId}: ${m.lessons.length} lessons / 1000 characters / ${m.assets.length} assets; original learning records preserved.`);
} finally {await db.$disconnect();}
