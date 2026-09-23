import {useState,type FormEvent} from 'react';
import {dataExportSchema,deletionReceiptSchema,type FamilyAccount} from '@learnbuddy/contracts';
import {accountRequest} from './FamilyAccount';
import {cloudId} from './cloudClient';
import {localRecords,purgeLocal} from './offlineStore';
function download(value:unknown,name:string){const url=URL.createObjectURL(new Blob([JSON.stringify(value,null,2)],{type:'application/json'})),a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);}
export function DataManagementPanel({family,refresh}:{family:FamilyAccount;refresh:()=>Promise<void>}) {
 const [target,setTarget]=useState('account'),[confirm,setConfirm]=useState<{id:string;label:string;requestId:string}>(),[text,setText]=useState(''),[password,setPassword]=useState(''),[busy,setBusy]=useState(false),[message,setMessage]=useState('');
 const root=target==='account'?'/api/v1/account':`/api/v1/learners/${target}`;
 const exportData=async()=>{setBusy(true);setMessage('');try{
  const cloud=dataExportSchema.parse(await accountRequest(root+'/export'));
  const prefix=`learning:${family.account.accountId}:${target==='account'?'':target}`;const records=await localRecords(prefix);
  const legacyPrefix=`learnbuddy:v1:progress:${family.account.accountId}:${target==='account'?'':target}`;
  const legacy=Object.fromEntries(Object.keys(localStorage).filter(k=>k.startsWith(legacyPrefix)).map(k=>[k,localStorage.getItem(k)]));
  download({format:'learnbuddy-device-export',version:1,cloud,local:{records,legacy},notice:'本机副本可能含尚未同步或冲突记录，不能当作云端确认；其他设备未上传记录不在此文件中。'},`learnbuddy-${target==='account'?'family':'child'}-${new Date().toISOString().slice(0,10)}.json`);setMessage('已生成导出文件，请保存在安全的位置。');
 }catch(e){setMessage(e instanceof Error?e.message:'导出失败，请重试');}finally{setBusy(false);}};
 const erase=async(e:FormEvent)=>{e.preventDefault();if(!confirm||busy)return;setBusy(true);setMessage('');try{
  const path=confirm.id==='account'?'/api/v1/account':`/api/v1/learners/${confirm.id}`;
  const receipt=deletionReceiptSchema.parse(await accountRequest(path,{requestId:confirm.requestId,confirmation:text,password},'DELETE'));
  setPassword('');await purgeLocal(receipt.accountId,receipt.scope==='learner'?receipt.learnerIds[0]:undefined);setConfirm(undefined);await refresh();
 }catch(e){setMessage(`${e instanceof Error?e.message:'删除结果未确认'}。可重新连接检查档案；原请求编号会用于重试。`);setPassword('');}finally{setBusy(false);}};
 return <details className="data-management"><summary>导出与删除数据</summary><p>导出包含云端记录及这台设备的待同步副本，不含密码或登录令牌。删除不可撤销；如需保留，请先导出。</p><label>管理范围<select value={target} disabled={busy||!!confirm} onChange={e=>setTarget(e.target.value)}><option value="account">整个家长账户及所有孩子</option>{family.learners.map(l=><option value={l.id} key={l.id}>{l.nickname}</option>)}</select></label><button className="primary" disabled={busy||!!confirm} onClick={()=>void exportData()}>导出所选数据</button><button className="danger" disabled={busy||!!confirm} onClick={()=>{setConfirm({id:target,label:target==='account'?family.account.email:family.learners.find(l=>l.id===target)!.nickname,requestId:cloudId()});setText('');setPassword('');setMessage('');}}>删除所选数据</button>
 {confirm&&<form onSubmit={erase}><h3>{confirm.id==='account'?'永久删除家长账户？':'永久删除这个孩子档案？'}</h3><p>将删除{confirm.id==='account'?'账户、全部孩子和学习记录，并退出所有设备':'所选孩子的学习记录与待同步队列'}。其他设备在下次联网后清理副本；已下载的导出文件由你自行管理。独立游客记录不属于此范围。共用课程内容保留；删除账户会移除其作者关联。</p><label>输入{confirm.id==='account'?'邮箱':'孩子昵称'}「{confirm.label}」确认<input required autoComplete="off" value={text} onChange={e=>setText(e.target.value)}/></label><label>当前账户密码<input type="password" required maxLength={128} autoComplete="current-password" value={password} onChange={e=>setPassword(e.target.value)}/></label><button className="danger" disabled={busy||text!==confirm.label||!password}>确认永久删除</button><button type="button" className="text-button" disabled={busy} onClick={()=>{setConfirm(undefined);setPassword('');}}>取消</button></form>}
 {message&&<p role="status">{message}</p>}</details>;
}
