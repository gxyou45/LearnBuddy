// IndexedDB transactions own durable learning writes and local deletion tombstones.
let connection:Promise<IDBDatabase>|undefined;
function database(){return connection??=new Promise<IDBDatabase>((resolve,reject)=>{const r=indexedDB.open('learnbuddy-offline',1);r.onupgradeneeded=()=>r.result.createObjectStore('records');r.onsuccess=()=>{r.result.onversionchange=()=>{r.result.close();connection=undefined;};resolve(r.result);};r.onerror=()=>{connection=undefined;reject(r.error);};});}
const markers=(key:string)=>{const [,account,learner]=key.split(':');return [`deleted:${account}`,`deleted:${account}:${learner}`];};
export async function readLocal<T>(key:string):Promise<T|undefined>{const db=await database();return new Promise((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').get(key);r.onsuccess=()=>resolve(r.result);r.onerror=()=>reject(r.error);});}
export async function writeLocal(key:string,value:unknown){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),keys=store.getAllKeys();keys.onsuccess=()=>{try{
 if(key.startsWith('learning:')&&markers(key).some(m=>keys.result.includes(m))){tx.abort();return;}
 if(key==='last-family'){
  const family=structuredClone(value) as {account:{accountId:string};learners:{id:string}[]};const id=family.account.accountId;
  if(keys.result.includes(`deleted:${id}`)){store.delete(key);return;}
  family.learners=family.learners.filter(l=>!keys.result.includes(`deleted:${id}:${l.id}`));store.put(family,key);
 }else if(!key.startsWith('cleanup-proof:')||!keys.result.includes(`deleted:${key.slice(14)}`))store.put(value,key);
 }catch{tx.abort();}};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||new Error('本机存储不可用或档案已删除'));});}
export async function removeLocal(key:string){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite');tx.objectStore('records').delete(key);tx.oncomplete=()=>resolve();tx.onabort=()=>reject(tx.error);});}
export async function compareWrite<T extends {generation:number}>(key:string,value:T,expected:number){const db=await database();return new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records'),keys=store.getAllKeys();let reason='本机存储失败，尚未保存，请释放空间后重试';keys.onsuccess=()=>{if(markers(key).some(m=>keys.result.includes(m))){reason='档案已删除，本机写入已停止';tx.abort();return;}const r=store.get(key);r.onsuccess=()=>{try{if((r.result?.generation??0)!==expected){reason='另一个页面已更新本机记录，请刷新后继续';tx.abort();}else store.put(value,key);}catch{tx.abort();}};};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(new Error(reason));});}
export async function localRecords(prefix:string){const db=await database();return new Promise<{key:string;value:any}[]>((resolve,reject)=>{const tx=db.transaction('records','readonly'),r=tx.objectStore('records').openCursor(),items:{key:string;value:any}[]=[];r.onsuccess=()=>{const c=r.result;if(c){if(typeof c.key==='string'&&c.key.startsWith(prefix))items.push({key:c.key,value:c.value});c.continue();}else resolve(items);};r.onerror=()=>reject(r.error);});}
export async function purgeLocal(accountId:string,learnerId?:string,notify=true){
 const db=await database(),prefix=`learning:${accountId}:${learnerId||''}`;
 await new Promise<void>((resolve,reject)=>{const tx=db.transaction('records','readwrite'),store=tx.objectStore('records');store.put(true,`deleted:${accountId}${learnerId?':'+learnerId:''}`);const r=store.openCursor();r.onsuccess=()=>{const c=r.result;if(!c)return;const key=String(c.key);
  if(key.startsWith(prefix))c.delete();
  if(key==='last-family'&&c.value.account.accountId===accountId){if(!learnerId)c.delete();else c.update({...c.value,learners:c.value.learners.filter((l:{id:string})=>l.id!==learnerId)});}
  c.continue();};tx.oncomplete=()=>resolve();tx.onabort=tx.onerror=()=>reject(tx.error||new Error('清理本机数据失败，请重试'));});
 const legacy=`learnbuddy:v1:progress:${accountId}:${learnerId||''}`;
 for(const key of Object.keys(localStorage))if(key.startsWith(legacy))localStorage.removeItem(key);
 if(!learnerId||localStorage.getItem(`learnbuddy:child:${accountId}`)===learnerId)localStorage.removeItem(`learnbuddy:child:${accountId}`);
 if(!learnerId)await removeLocal(`cleanup-proof:${accountId}`);
 if(notify){window.dispatchEvent(new Event('family-data-deleted'));localStorage.setItem('learnbuddy:account-change',`${Date.now()}-${Math.random()}`);}
}
