// Refresh illustrations only. Do not regenerate course manifests or recordings.
import {readFile,mkdir,copyFile} from 'node:fs/promises';
import {basename,dirname,resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'../..');
const source=resolve(root,'apps/web/src/story-art');
const output=resolve(root,'apps/web/public/static-content/story-art');
const briefs=JSON.parse(await readFile(resolve(source,'briefs.json'),'utf8'));
if(new Set(briefs.map(b=>b.id)).size!==briefs.length)throw new Error('Duplicate story IDs');
for(const b of briefs){
 if(!/^images\/[a-z0-9-]+\.png$/.test(b.file))throw new Error(`Invalid illustration path: ${b.id}`);
 const bytes=await readFile(resolve(source,b.file));
 if(bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error(`Invalid PNG: ${b.id}`);
}
await mkdir(output,{recursive:true});
for(const b of briefs)await copyFile(resolve(source,b.file),resolve(output,basename(b.file)));
console.log(`Synced ${briefs.length} story illustrations; course/audio files unchanged.`);
