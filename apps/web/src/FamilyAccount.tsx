import {DataManagementPanel} from './DataManagementPanel';
import {familySchema,type FamilyAccount} from '@learnbuddy/contracts';
import {createContext,useContext,useEffect,useRef,useState,type ReactNode,type FormEvent} from 'react';
import {STORAGE_KEY} from './progress';
import {readLocal,writeLocal,removeLocal,localRecords,purgeLocal} from './offlineStore';
import {stopAudio} from './audio';
import {isStaticDemo} from './staticDemo';

type Family=FamilyAccount;
const ProgressStorage=createContext(STORAGE_KEY);
export const useProgressStorage=()=>useContext(ProgressStorage);
const FamilyContext=createContext<Family|null>(null);
export const useFamily=()=>useContext(FamilyContext);
const LearnerContext=createContext<string|undefined>(undefined);
export const useLearnerId=()=>useContext(LearnerContext);
const signalKey='learnbuddy:account-change';
const errorText:Record<string,string>={INVALID_EMAIL_OR_PASSWORD:'邮箱或密码不正确。',EMAIL_NOT_VERIFIED:'请先打开验证邮件，再回来登录。',USER_ALREADY_EXISTS:'该邮箱已注册，请登录或找回密码。',INVALID_TOKEN:'链接已失效，请重新申请。',TOKEN_EXPIRED:'链接已过期，请重新申请。',PASSWORD_TOO_SHORT:'密码至少需要 10 个字符。',TOO_MANY_REQUESTS:'操作有些频繁，请稍后再试。'};
async function fetchAccount(path:string,init:RequestInit={}) {
 const controller=new AbortController();const timeout=setTimeout(()=>controller.abort(),12000);
 try{return await fetch(path,{...init,signal:controller.signal});}catch{throw new Error('连接暂时不可用，请检查网络后重试。');}finally{clearTimeout(timeout);}
}
export async function accountRequest(path:string,body?:unknown,method=body?'POST':'GET') {
 const r=await fetchAccount(path,{method,credentials:'same-origin',cache:'no-store',headers:body?{'Content-Type':'application/json'}:undefined,body:body?JSON.stringify(body):undefined});
 const data=await r.json().catch(()=>({}));
 if(!r.ok) {if(r.status===401&&(path.startsWith('/api/v1/')||path.endsWith('/sign-out')||path.endsWith('/revoke-other-sessions'))) window.dispatchEvent(new Event('family-session-expired'));throw new Error(data.error?.message||(r.status===429?'操作有些频繁，请稍后再试。':errorText[data.code])||'操作没有完成，请检查填写内容和网络后重试。');}
 return data;
}
function auth(path:string,body:unknown) {return accountRequest(`/api/auth/${path}`,body);}
function selected(family:Family):string {
 try {const id=localStorage.getItem(`learnbuddy:child:${family.account.accountId}`);if(family.learners.some(c=>c.id===id))return id!;}catch{/* Selection can stay in memory. */}
 return family.learners[0]?.id||'';
}
export function FamilyShell({children}:{children:ReactNode}) {
 const [family,setFamily]=useState<Family|null|undefined>(isStaticDemo?null:undefined);
 const [child,setChild]=useState('');
 const [error,setError]=useState(false);
 const [connectionNotice,setConnectionNotice]=useState('');
 const resolved=useRef(false);
 const [accountPage,setAccountPage]=useState(location.hash==='#account'||new URLSearchParams(location.search).has('token')||new URLSearchParams(location.search).has('error'));
 const epoch=useRef(0);
 const accountId=useRef<string|null>(null);
 const reload=async()=>{
  const turn=++epoch.current;
  try {
   const r=await fetchAccount('/api/v1/me',{credentials:'same-origin',cache:'no-store'});
   if(!r.ok&&r.status!==401)throw new Error();
   const next:Family|null=r.status===401?null:familySchema.parse(await r.json());
   let cleanupFailed=false;
   try{
    if(next){for(const id of next.deletedLearnerIds||[])await purgeLocal(next.account.accountId,id,false);if(next.account.cleanupToken)await writeLocal(`cleanup-proof:${next.account.accountId}`,{accountId:next.account.accountId,cleanupToken:next.account.cleanupToken});}
    for(const item of await localRecords('cleanup-proof:')){if(item.value.accountId===next?.account.accountId)continue;const check=await fetchAccount('/api/v1/deletion-status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(item.value)});if(check.ok&&(await check.json()).deleted)await purgeLocal(item.value.accountId,undefined,false);}
   }catch{cleanupFailed=true;}
   if(turn!==epoch.current)return;
   resolved.current=true;setConnectionNotice(cleanupFailed?'本机清理尚未完成，联网后请重新打开家庭与孩子页面重试。':'');
   if(next)void writeLocal('last-family',next).catch(()=>{});else void removeLocal('last-family').catch(()=>{});
   const sameAccount=accountId.current===next?.account.accountId;
   if(accountId.current&&!next){stopAudio();location.hash='account';setAccountPage(true);}
   accountId.current=next?.account.accountId||null;
   setFamily(next);setChild(previous=>next?(sameAccount&&next.learners.some(c=>c.id===previous)?previous:selected(next)):'');setError(false);
  }catch{if(turn===epoch.current){if(!resolved.current&&!navigator.onLine){const cached=await readLocal<Family>('last-family').catch(()=>undefined);if(cached&&turn===epoch.current){resolved.current=true;accountId.current=cached.account.accountId;setFamily(cached);setChild(selected(cached));setError(false);setConnectionNotice('离线使用本机档案；联网后会重新验证登录。');return;}}if(!resolved.current)setError(true);else setConnectionNotice('账户服务暂时未连接，请重试；已有记录会保留。');}}
 };
 useEffect(()=>{
  if(isStaticDemo)return;
  void reload();
  const hash=()=>{stopAudio();setAccountPage(location.hash==='#account');};
  const changed=(e:StorageEvent)=>{if(e.key===signalKey){stopAudio();resolved.current=false;setFamily(undefined);void reload();}};
  const expired=()=>{stopAudio();resolved.current=false;setFamily(undefined);void reload();};
  const focus=()=>{void reload();};
  addEventListener('hashchange',hash);addEventListener('storage',changed);addEventListener('family-session-expired',expired);addEventListener('family-data-deleted',expired);addEventListener('focus',focus);addEventListener('online',focus);
  const timer=setInterval(focus,60000);
  return()=>{epoch.current++;clearInterval(timer);removeEventListener('hashchange',hash);removeEventListener('storage',changed);removeEventListener('family-session-expired',expired);removeEventListener('family-data-deleted',expired);removeEventListener('focus',focus);removeEventListener('online',focus);stopAudio();};
 },[]);
 const changed=async()=>{
  stopAudio();resolved.current=false;setFamily(undefined);
  try{localStorage.setItem(signalKey,`${Date.now()}-${Math.random()}`);}catch{/* Other tabs still recheck on focus. */}
  await reload();
 };
 const choose=(id:string)=>{
  if(!family?.learners.some(c=>c.id===id))return;
  stopAudio();try{localStorage.setItem(`learnbuddy:child:${family.account.accountId}`,id);}catch{/* In-memory selection still works. */}
  setChild(id);location.hash='home';setAccountPage(false);
 };
 if(error)return <div className="app-shell"><section className="content-status" role="status"><h1>账户暂时无法确认</h1><p>请重试。原有档案和进度已保留。</p><button className="primary" onClick={()=>void reload()}>重新连接账户</button></section></div>;
 if(family===undefined)return <div className="app-shell"><section className="content-status" role="status">正在确认学习档案…</section></div>;
 const learner=family?.learners.find(c=>c.id===child);
 const storage=family&&learner?`${STORAGE_KEY}:${family.account.accountId}:${learner.id}`:STORAGE_KEY;
 if(accountPage||(family&&!learner))return <>{connectionNotice&&<div role="status">{connectionNotice}</div>}<AccountPage key={family?.account.accountId||'visitor'} family={family} active={child} refresh={changed} choose={choose} back={()=>{location.hash='home';setAccountPage(false);}}/></>;
 return <FamilyContext.Provider value={family??null}><LearnerContext.Provider value={learner?.id}><ProgressStorage.Provider value={storage}><div className="family-frame">{connectionNotice&&<div className="notice" role="status">{connectionNotice}</div>}<div className="learner-banner">{learner?`${learner.nickname}的小屋 · 云端学习`:'游客体验 · 进度保存在本机'}</div><div className="family-content" key={storage}>{children}</div></div></ProgressStorage.Provider></LearnerContext.Provider></FamilyContext.Provider>;
}
function AccountPage({family,active,refresh,choose,back}:{family:Family|null;active:string;refresh:()=>Promise<void>;choose:(id:string)=>void;back:()=>void}) {
 const params=new URLSearchParams(location.search);
 const [mode,setMode]=useState<'login'|'signup'|'forgot'|'reset'>(params.has('token')?'reset':'login');
 const [email,setEmail]=useState('');const [password,setPassword]=useState('');const [nickname,setNickname]=useState('');
 const [message,setMessage]=useState(params.has('passwordUpdated')?'密码已更新，请重新登录。其他设备也需要重新登录。':params.has('error')?'链接已失效，请重新发送验证邮件或找回密码。':'');
 const [busy,setBusy]=useState(false);
 const [editing,setEditing]=useState<string>();
 const run=async(action:()=>Promise<void>)=>{if(busy)return;setBusy(true);setMessage('');try{await action();}catch(e){setMessage(e instanceof Error?e.message:'请稍后重试。');}finally{setBusy(false);}};
 const callback=`${location.origin}/#account`;
 const submit=(e:FormEvent)=>{e.preventDefault();void run(async()=>{
  if(mode==='signup'){await auth('sign-up/email',{name:'家长',email,password,callbackURL:callback});setMessage('验证邮件已发送。请打开邮件中的链接，再回来登录。');setMode('login');setPassword('');}
  else if(mode==='login'){await auth('sign-in/email',{email,password});await refresh();}
  else if(mode==='forgot'){await auth('request-password-reset',{email,redirectTo:`${location.origin}/?reset=1#account`});setMessage('如果该邮箱已注册，会收到重设密码邮件。请检查收件箱。');}
  else {await auth('reset-password',{token:params.get('token'),newPassword:password});history.replaceState(null,'','/?passwordUpdated=1#account');setPassword('');setMode('login');await refresh();}
 });};
 return <div className="app-shell"><main className="inner-page account-page"><button className="text-button" onClick={back}>‹ 回到小屋</button><h1>{mode==='reset'?'设置新密码':family?'家庭与孩子':'家长账户'}</h1>{message&&<p className="notice" role="status">{message}</p>}
 {(!family||mode==='reset')?<><p>为孩子创建独立档案，家长使用邮箱登录。</p><div className="account-tabs"><button disabled={busy} aria-pressed={mode==='login'} onClick={()=>{setMode('login');setMessage('');}}>登录</button><button disabled={busy} aria-pressed={mode==='signup'} onClick={()=>{setMode('signup');setMessage('');}}>注册</button></div><form onSubmit={submit}>
 {mode!=='reset'&&<label>家长邮箱<input type="email" required autoComplete="email" value={email} onChange={e=>setEmail(e.target.value)}/></label>}
 {mode!=='forgot'&&<label>{mode==='reset'?'新密码':'密码'}<input aria-label={mode==='reset'?'新密码':'密码'} aria-describedby="password-help" type="password" required minLength={mode==='login'?1:10} maxLength={128} autoComplete={mode==='login'?'current-password':'new-password'} value={password} onChange={e=>setPassword(e.target.value)}/><small id="password-help">注册或重设密码需要 10–128 个字符。</small></label>}
 <button disabled={busy} className="primary">{busy?'请稍等…':mode==='signup'?'注册并发送验证邮件':mode==='forgot'?'发送找回邮件':mode==='reset'?'保存新密码':'登录小屋'}</button></form><button disabled={busy} className="text-button" onClick={()=>{setMode('forgot');setMessage('');}}>忘记密码</button><button disabled={busy||!email} className="text-button" onClick={()=>void run(async()=>{await auth('send-verification-email',{email,callbackURL:callback});setMessage('如果邮箱尚未验证，会收到新的验证邮件。');})}>重新发送验证邮件</button><p className="muted">游客进度会保留在原处，不会自动放入孩子档案。登录并选择孩子后，新记录可云端保存、断网暂存。旧本机记录可在家长中心确认导入。</p></>:<><p className="account-email">{family.account.email}</p>{family.account.role==='admin'&&<a href="/admin">打开内容工作台</a>}<p>请选择本次一起学习的孩子。</p><div className="child-list">{family.learners.map(c=><div className="soft-card" key={c.id}><strong>{c.nickname}{c.id===active?' · 当前':''}</strong><button className="primary" disabled={busy} onClick={()=>choose(c.id)}>用{c.nickname}的档案学习</button><button className="text-button" disabled={busy} onClick={()=>{setEditing(c.id);setNickname(c.nickname);}}>修改昵称</button></div>)}</div>
 <form onSubmit={e=>{e.preventDefault();void run(async()=>{await accountRequest(editing?`/api/v1/learners/${editing}`:'/api/v1/learners',{nickname},editing?'PATCH':'POST');await refresh();});}}><label>{editing?'修改孩子昵称':'添加孩子昵称'}<input required maxLength={20} value={nickname} onChange={e=>setNickname(e.target.value)} placeholder="例如：小星星"/></label><button className="primary" disabled={busy}>{editing?'保存昵称':'创建孩子档案'}</button>{editing&&<button type="button" className="text-button" onClick={()=>{setEditing(undefined);setNickname('');}}>取消修改</button>}</form><p className="muted">档案和新学习记录按孩子保存在云端，联网换设备可以续学。旧本机记录保留，尚未自动导入。当前所有课程免费。</p><DataManagementPanel family={family} refresh={refresh}/><button disabled={busy} className="text-button" onClick={()=>void run(async()=>{await auth('revoke-other-sessions',{});setMessage('其他设备已退出登录。');})}>退出其他设备</button><button disabled={busy} className="danger" onClick={()=>void run(async()=>{await auth('sign-out',{});await refresh();})}>退出当前账户</button></>}
 </main></div>;
}
