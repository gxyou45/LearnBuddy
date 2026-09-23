import {createHash} from 'node:crypto';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve,dirname} from 'node:path';
import type {ImportedAsset} from '@learnbuddy/contracts';
import type {database} from './db.js';
export const digest=(bytes:Buffer)=>createHash('sha256').update(bytes).digest('hex');
const root=()=>resolve(process.env.MEDIA_DIR || '../../media');
const stage=(key:string)=>resolve(root(),'.drafts',key);
async function immutableWrite(path:string,bytes:Buffer) {
 await mkdir(dirname(path),{recursive:true});
 try {await writeFile(path,bytes,{flag:'wx',mode:0o600});}
 catch(e) {if((e as NodeJS.ErrnoException).code!=='EEXIST'||digest(await readFile(path))!==digest(bytes))throw e;}
}
export function inspectUpload(data:Buffer) {
 if(data.length<32 || data.length>20*1024*1024) throw new Error('文件须在 32 字节至 20 MB 之间');
 if(data.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) {
  if(data.toString('ascii',12,16)!=='IHDR'||data.readUInt32BE(8)!==13)throw new Error('PNG 文件头无效');
  const width=data.readUInt32BE(16),height=data.readUInt32BE(20);
  if(!width||!height||width>4096||height>4096)throw new Error('图片尺寸须在 1–4096 像素之间');
  let p=8,ended=false,hasData=false;
  while(p+12<=data.length) {
   const n=data.readUInt32BE(p),tag=data.toString('ascii',p+4,p+8);
   if(p+12+n>data.length)throw new Error('PNG 数据不完整');
   if(tag==='IDAT')hasData=true;
   p+=12+n;if(tag==='IEND'){ended=n===0&&p===data.length;break;}
  }
  if(!ended||!hasData)throw new Error('PNG 数据不完整');
  return {kind:'image' as const,mimeType:'image/png' as const,extension:'png'};
 }
 if(data.toString('ascii',0,4)!=='RIFF'||data.toString('ascii',8,12)!=='WAVE'||data.readUInt32LE(4)+8!==data.length)throw new Error('仅支持 PNG 图片和 PCM WAV 音频');
 let rate=0,size=0,alignment=0;
 for(let p=12;p+8<=data.length;) {
  const tag=data.toString('ascii',p,p+4),n=data.readUInt32LE(p+4);
  if(p+8+n>data.length)throw new Error('WAV 数据不完整');
  if(tag==='fmt ') {
   if(n<16||data.readUInt16LE(p+8)!==1)throw new Error('请使用 PCM WAV 音频');
   const channels=data.readUInt16LE(p+10),frequency=data.readUInt32LE(p+12),bits=data.readUInt16LE(p+22);
   rate=data.readUInt32LE(p+16);alignment=data.readUInt16LE(p+20);
   if(![1,2].includes(channels)||![8,16,24,32].includes(bits)||frequency<8000||frequency>96000||alignment!==channels*bits/8||rate!==frequency*alignment)throw new Error('WAV 音频参数无效');
  }
  if(tag==='data')size+=n;
  p+=8+n+(n%2);
 }
 if(!rate||!size||size%alignment)throw new Error('WAV 缺少有效音频');
 const durationMs=size/rate*1000;
 if(durationMs>180000)throw new Error('音频不得超过 3 分钟');
 return {kind:'audio' as const,mimeType:'audio/wav' as const,extension:'wav',durationMs};
}
export async function storeUpload(db:ReturnType<typeof database>,actorId:string,bytes:Buffer) {
 const info=inspectUpload(bytes),sha256=digest(bytes),objectKey=`assets/${info.kind==='audio'?'audio':'images'}/${sha256}.${info.extension}`;
 await immutableWrite(stage(objectKey),bytes);
 return db.contentUpload.upsert({where:{sha256},create:{sha256,objectKey,bytes:bytes.length,mimeType:info.mimeType,durationMs:info.durationMs,createdBy:actorId},update:{}});
}
export async function mediaBytes(db:ReturnType<typeof database>,a:{sha256:string;objectKey:string;bytes:number;mimeType:string;durationMs?:number}) {
 const published=await db.assetVersion.findFirst({where:{sha256:a.sha256,objectKey:a.objectKey,bytes:a.bytes,mimeType:a.mimeType}});
 const uploaded=await db.contentUpload.findUnique({where:{sha256:a.sha256}});
 if(!published && (!uploaded||uploaded.objectKey!==a.objectKey||uploaded.bytes!==a.bytes||uploaded.mimeType!==a.mimeType||uploaded.durationMs!== (a.durationMs??null)))throw new Error('素材未上传或元数据不匹配');
 if(published && a.mimeType==='audio/wav' && (published.metadata as ImportedAsset).durationMs!==a.durationMs) throw new Error('音频时长不匹配');
 const bytes=await readFile(published?resolve(root(),a.objectKey):stage(a.objectKey));
 if(digest(bytes)!==a.sha256||bytes.length!==a.bytes)throw new Error('素材文件缺失或校验失败');
 return bytes;
}
export async function publishMedia(db:ReturnType<typeof database>,assets:ImportedAsset[]) {
 // Verify the whole collection before making any new media publicly addressable.
 for(const a of assets)await mediaBytes(db,a);
 // Files are append-only; a second streaming-sized pass bounds peak memory per asset.
 for(const a of assets)await immutableWrite(resolve(root(),a.objectKey),await mediaBytes(db,a));
}
