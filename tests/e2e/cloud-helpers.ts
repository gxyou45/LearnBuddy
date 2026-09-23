import {expect,type Page,type APIRequestContext} from '@playwright/test';
const password='Cloud-learning-test-password';
export async function verifiedAccount(request:APIRequestContext){
 const email=`cloud-${Date.now()}-${Math.random().toString(16).slice(2)}@learnbuddy.test`;
 const base=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5173';
 let response;await expect.poll(async()=>{response=await request.post('/api/auth/sign-up/email',{headers:{Origin:base},data:{name:'云端测试',email,password,callbackURL:base+'/#account'}});if(response.status()!==429)expect(response.ok(),`registration status ${response.status()}`).toBe(true);return response.status();},{timeout:75000,intervals:[1000,5000,10000]}).not.toBe(429);
 let url='';await expect.poll(async()=>{
  const list=await(await request.get(`http://localhost:8025/api/v1/search?query=${encodeURIComponent('to:'+email)}`)).json();if(!list.messages?.length)return false;
  const mail=await(await request.get(`http://localhost:8025/api/v1/message/${list.messages[0].ID}`)).json();url=mail.Text.match(/https?:\/\/\S+/)?.[0]||'';return !!url;
 }).toBe(true);await request.get(url);return email;
}
export async function login(page:Page,email:string){await page.goto('/#account');await page.getByLabel('家长邮箱').fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await expect.poll(async()=>{const [r]=await Promise.all([page.waitForResponse(r=>r.url().endsWith('/api/auth/sign-in/email')),page.getByRole('button',{name:'登录小屋'}).click()]);if(r.status()!==429)expect(r.ok(),`login status ${r.status()}`).toBe(true);return r.status();},{timeout:75000,intervals:[1000,5000,10000]}).not.toBe(429);await expect(page.getByRole('heading',{name:'家庭与孩子'})).toBeVisible();}
export async function choose(page:Page){await page.getByRole('button',{name:'用小云的档案学习'}).click();await expect(page.locator('.cloud-status')).toContainText('云端记录已读取');}
