import {randomUUID} from 'node:crypto';
import {mkdir,open,readFile,readdir,link,unlink} from 'node:fs/promises';
import {join} from 'node:path';
import {z} from 'zod';
export const deletionIntentSchema=z.object({requestId:z.uuid(),scope:z.enum(['learner','account']),accountId:z.uuid(),learnerIds:z.array(z.uuid()),deletedAt:z.string().datetime(),cleanupTokenHash:z.string().regex(/^[a-f0-9]{64}$/).nullable()}).strict();
export type DeletionIntent=z.infer<typeof deletionIntentSchema>;
const directory=()=>process.env.DELETION_LOG_DIR||'/app/deletions';
// Write ahead of the database commit; replay on startup completes an interrupted deletion.
export async function recordDeletion(value:DeletionIntent) {
 const intent=deletionIntentSchema.parse(value),dir=directory();await mkdir(dir,{recursive:true,mode:0o700});const file=join(dir,intent.requestId+'.json'),temp=file+'.'+randomUUID()+'.partial';
 const handle=await open(temp,'wx',0o600);
 try{await handle.writeFile(JSON.stringify(intent));await handle.sync();}finally{await handle.close();}
 try{
  try{await link(temp,file);}catch(e){
   if((e as NodeJS.ErrnoException).code!=='EEXIST')throw e;
   const existing=deletionIntentSchema.parse(JSON.parse(await readFile(file,'utf8')));
   if(JSON.stringify(existing)!==JSON.stringify(intent))throw new Error('Deletion intent mismatch');
  }
 }finally{await unlink(temp);}
 const folder=await open(dir,'r');try{await folder.sync();}finally{await folder.close();}
}
export async function deletionIntents(dir=directory()) {
 await mkdir(dir,{recursive:true,mode:0o700});const names=await readdir(dir),items:DeletionIntent[]=[];
 for(const name of names.filter(n=>n.endsWith('.json')).sort())items.push(deletionIntentSchema.parse(JSON.parse(await readFile(join(dir,name),'utf8'))));
 return items;
}

export async function pendingDeletion(requestId:string){
 const id=z.uuid().parse(requestId);try{return deletionIntentSchema.parse(JSON.parse(await readFile(join(directory(),id+'.json'),'utf8')));}catch(e){if((e as NodeJS.ErrnoException).code==='ENOENT')return;throw e;}
}
