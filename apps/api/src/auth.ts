import { betterAuth } from 'better-auth';
import { prismaAdapter } from 'better-auth/adapters/prisma';
import { randomBytes } from 'node:crypto';
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import nodemailer from 'nodemailer';
import type { database } from './db.js';

export function authConfig() {
 const local = process.env.AUTH_MODE === 'local';
 const origins = (process.env.AUTH_ORIGINS || 'http://localhost:8080,http://127.0.0.1:8080').split(',').map(s=>s.trim());
 if (origins.some(origin=>new URL(origin).origin!==origin || (!local && !origin.startsWith('https://')))) throw new Error('AUTH_ORIGINS must contain exact origins (HTTPS outside local mode)');
 let secret = process.env.AUTH_SECRET;
 if (!secret && local) {
  const file = process.env.AUTH_SECRET_FILE || '/app/secrets/auth-secret';
  mkdirSync(dirname(file), {recursive:true});
  try { writeFileSync(file,randomBytes(48).toString('base64url'),{flag:'wx',mode:0o600}); } catch(error) { if ((error as NodeJS.ErrnoException).code!=='EEXIST') throw error; }
  secret=readFileSync(file,'utf8').trim();
 }
 if (!secret || secret.length<32) throw new Error('AUTH_SECRET must contain at least 32 random characters');
 if (!local && (!process.env.SMTP_HOST || !process.env.MAIL_FROM)) throw new Error('Production SMTP_HOST and MAIL_FROM required');
 return {local,origins,secret};
}
export function createAuth(db:ReturnType<typeof database>, config=authConfig(), deliver?: (to:string,subject:string,url:string)=>Promise<void>) {
 const transport=nodemailer.createTransport({host:process.env.SMTP_HOST||'mailpit',port:Number(process.env.SMTP_PORT||1025),secure:process.env.SMTP_SECURE==='true',requireTLS:!config.local&&process.env.SMTP_SECURE!=='true',auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASSWORD}:undefined});
 const mail=deliver || (async(to:string,subject:string,url:string)=>{await transport.sendMail({from:process.env.MAIL_FROM||'汉字小屋 <hello@learnbuddy.test>',to,subject,text:`${subject}\n\n请打开以下链接：\n${url}\n\n如果不是您本人操作，请忽略此邮件。`});});
 return betterAuth({
  appName:'汉字小屋', secret:config.secret,
  baseURL:{allowedHosts:config.origins.map(o=>new URL(o).host),protocol:config.local?'http':'https'},
  trustedOrigins:config.origins,
  database:prismaAdapter(db,{provider:'postgresql'}),
  user:{modelName:'familyAccount',additionalFields:{role:{type:'string',defaultValue:'parent',input:false}}},
  account:{modelName:'identity',fields:{userId:'accountId',accountId:'subject',providerId:'provider',password:'passwordHash'},accountLinking:{enabled:false}},
  session:{modelName:'authSession',fields:{userId:'accountId'},expiresIn:60*60*24*30,updateAge:60*60*24,cookieCache:{enabled:false}},
  verification:{modelName:'verification'},
  emailAndPassword:{enabled:true,requireEmailVerification:true,minPasswordLength:10,maxPasswordLength:128,revokeSessionsOnPasswordReset:true,sendResetPassword:async({user,url})=>mail(user.email,'重设汉字小屋密码',url)},
  emailVerification:{sendOnSignUp:true,sendOnSignIn:false,autoSignInAfterVerification:false,expiresIn:3600,sendVerificationEmail:async({user,url})=>mail(user.email,'验证汉字小屋邮箱',url)},
  rateLimit:{enabled:true,storage:'database',modelName:'rateLimit',window:60,max:100,customRules:{'/sign-in/email':{window:60,max:10},'/sign-up/email':{window:60,max:5},'/request-password-reset':{window:60,max:3},'/send-verification-email':{window:60,max:3}}},
  advanced:{database:{generateId:'uuid'},useSecureCookies:!config.local,ipAddress:{ipAddressHeaders:['x-real-ip']}},
 });
}
export type Auth = ReturnType<typeof createAuth>;
