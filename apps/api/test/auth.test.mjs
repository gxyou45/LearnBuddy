import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomBytes} from 'node:crypto';
import {database} from '../dist/db.js';
import {createAuth} from '../dist/auth.js';
import {createApp} from '../dist/app.js';
const db=database();
const origin='http://localhost:8080';
const config={local:true,origins:[origin],secret:randomBytes(48).toString('base64url')};
const messages=[];
const auth=createAuth(db,config,async(to,subject,url)=>{messages.push({to,subject,url});});
const app=createApp(db,auth,config.origins);
let ip=1;
function request(path,{cookie='',body,method=body?'POST':'GET',from=origin,address='10.0.0.1'}={}) {
 return app.request(new URL(path,origin).href,{method,headers:{Host:new URL(origin).host,'Content-Type':'application/json',Origin:from,Cookie:cookie,'x-real-ip':address},body:body?JSON.stringify(body):undefined});
}
function cookies(r){return r.headers.getSetCookie().map(v=>v.split(';')[0]).join('; ');}
async function signup(email){
 const r=await request('/api/auth/sign-up/email',{body:{email,password:'a-safe-test-password',name:'测试家长',callbackURL:origin+'/#account'},address:`10.0.0.${++ip}`});
 assert.equal(r.status,200,await r.clone().text());
 assert.equal((await db.familyAccount.findUnique({where:{email}})).role,'parent');
 const link=messages.findLast(m=>m.to===email).url;
 return link;
}
async function login(email,password='a-safe-test-password'){
 const r=await request('/api/auth/sign-in/email',{body:{email,password},address:`10.0.0.${++ip}`});
 assert.equal(r.status,200,await r.clone().text());assert.match(r.headers.get('set-cookie'),/HttpOnly/i);
 return cookies(r);
}
test('family authentication, ownership and session lifecycle',async t=>{
 try {
  const first='family-a@auth.test',second='family-b@auth.test';
  await t.test('unverified email cannot login; verification then persistent login',async()=>{
   const link=await signup(first);
   assert.equal((await request('/api/auth/sign-in/email',{body:{email:first,password:'a-safe-test-password'}})).status,403);
   assert.equal((await request(link)).status,302);
  });
  const a=await login(first);
  const secondLink=await signup(second);await request(secondLink);const b=await login(second);
  let learner;
  await t.test('create, rename and read own child; foreign IDs and injected ownership rejected',async()=>{
   const r=await request('/api/v1/learners',{cookie:a,body:{nickname:'小星星'}});assert.equal(r.status,201,await r.clone().text());learner=await r.json();
   assert.equal((await request(`/api/v1/learners/${learner.id}`,{cookie:b})).status,404);
   assert.equal((await request(`/api/v1/learners/${learner.id}`,{cookie:b,method:'PATCH',body:{nickname:'被修改'}})).status,404);
   assert.equal((await request(`/api/v1/learners/${learner.id}/entitlements`,{cookie:b})).status,404);
   assert.equal((await request('/api/v1/learners',{cookie:a,body:{nickname:'孩子',accountId:(await db.familyAccount.findUnique({where:{email:second}})).id}})).status,400);
   const rename=await request(`/api/v1/learners/${learner.id}`,{cookie:a,method:'PATCH',body:{nickname:'小太阳'}});assert.equal((await rename.json()).nickname,'小太阳');
   const entitlement=await request(`/api/v1/learners/${learner.id}/entitlements`,{cookie:a});assert.equal((await entitlement.json()).plan,'free');
  });
  await t.test('CSRF, unauthenticated access and parent/admin separation',async()=>{
   assert.equal((await request('/api/v1/me')).status,401);
   const promoted=await request('/api/auth/sign-up/email',{body:{name:'bad',email:'bad@auth.test',password:'a-safe-test-password',role:'admin'},address:'10.8.8.8'});
   assert.equal(promoted.status,200);
   assert.equal((await db.familyAccount.findUnique({where:{email:'bad@auth.test'}})).role,'parent');
   assert.equal((await request('/api/auth/update-user',{cookie:a,body:{role:'admin'}})).status,400);
   assert.equal((await request('/api/v1/admin/access',{cookie:a})).status,403);
   assert.equal((await request('/api/v1/learners',{cookie:a,from:'https://evil.test',body:{nickname:'坏请求'}})).status,403);
   assert.equal((await request('/api/auth/sign-out',{cookie:a,from:'https://evil.test',body:{}})).status,403);
   assert.equal((await request('/api/v1/learners',{cookie:a,from:'',body:{nickname:'无来源'}})).status,403);
   assert.equal((await request('/api/v1/me',{cookie:a})).headers.get('cache-control'),'no-store');
   const newInstance=createApp(db,createAuth(db,config,async()=>{}),config.origins);
   assert.equal((await newInstance.request(origin+'/api/v1/me',{headers:{Cookie:a,Host:new URL(origin).host}})).status,200);
  });
  await t.test('revoke other sessions, password reset once, sign out invalidates cookies',async()=>{
   const other=await login(first);
   assert.equal((await request('/api/auth/revoke-other-sessions',{cookie:a,body:{}})).status,200);
   assert.equal((await request('/api/v1/me',{cookie:other})).status,401);
   assert.equal((await request('/api/auth/request-password-reset',{body:{email:first,redirectTo:origin+'/?reset=1#account'}})).status,200);
   const resetLink=messages.findLast(m=>m.to===first).url;
   const redirect=await request(resetLink);assert.equal(redirect.status,302);
   const token=new URL(redirect.headers.get('location')).searchParams.get('token');assert.ok(token);
   const body={token,newPassword:'another-safe-password'};
   assert.equal((await request('/api/auth/reset-password',{body})).status,200);
   assert.notEqual((await request('/api/auth/reset-password',{body})).status,200);
   assert.equal((await request('/api/v1/me',{cookie:a})).status,401);
   assert.equal((await request('/api/auth/sign-in/email',{body:{email:first,password:'a-safe-test-password'}})).status,401);
   const renewed=await login(first,'another-safe-password');
   assert.equal((await request('/api/auth/sign-out',{cookie:renewed,body:{}})).status,200);
   assert.equal((await request('/api/v1/me',{cookie:renewed})).status,401);
  });
  await t.test('login rate limit applies',async()=>{
   let last;for(let i=0;i<12;i++)last=await request('/api/auth/sign-in/email',{body:{email:'unknown@auth.test',password:'bad-password'},address:'10.9.9.9'});
   assert.equal(last.status,429);
  });
 }finally{await db.$disconnect();}
});
