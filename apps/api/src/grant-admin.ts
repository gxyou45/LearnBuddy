import {database} from './db.js';
const email=process.argv[2]?.trim().toLowerCase();
if(!email||process.argv.length!==3)throw new Error('用法：node dist/grant-admin.js <已验证的家长邮箱>');
const db=database();
try {
 const account=await db.familyAccount.findUnique({where:{email}});
 if(!account?.emailVerified)throw new Error('请先通过注册流程验证该邮箱');
 await db.$transaction(async tx=>{
  await tx.familyAccount.update({where:{id:account.id},data:{role:'admin'}});
  await tx.contentAudit.create({data:{actorId:account.id,action:'grant-admin-cli',targetId:account.id,detail:{}}});
 });
 console.log('管理员权限已设置。请通过 /admin 访问内容工作台。');
}finally{await db.$disconnect();}
