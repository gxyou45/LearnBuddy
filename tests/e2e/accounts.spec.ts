import {test,expect,type Page,type APIRequestContext} from '@playwright/test';
test.use({channel:'chrome'});
const base=process.env.PLAYWRIGHT_BASE_URL||'http://127.0.0.1:5173';
const mail='http://localhost:8025';
async function emailLink(request:APIRequestContext,email:string,subject:string) {
 let link='';
 await expect.poll(async()=>{
  const r=await request.get(`${mail}/api/v1/search?query=${encodeURIComponent(`to:${email}`)}`);const list=await r.json();
  const item=list.messages?.find((m:{Subject:string})=>m.Subject===subject);if(!item)return false;
  const body=await (await request.get(`${mail}/api/v1/message/${item.ID}`)).json();link=body.Text.match(/https?:\/\/\S+/)?.[0]||'';return !!link;
 }).toBe(true);
 return link;
}
async function login(page:Page,email:string,password:string) {
 await page.goto('/#account');await page.getByRole('button',{name:'登录',exact:true}).click();await page.getByLabel('家长邮箱').fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录小屋'}).click();await expect(page.getByRole('heading',{name:'家庭与孩子'})).toBeVisible();
}
test('phone family flow: verify, isolate children and guest, persist login, reset password',async({page,request})=>{
 test.setTimeout(60000); // Several real email/password and multi-tab flows in one scenario.
 const email=`phone-${Date.now()}@learnbuddy.test`;const password='Test-family-password-27';
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
 const guest=await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'));
 await page.goto('/#account');await page.getByRole('button',{name:'注册',exact:true}).click();await page.getByLabel('家长邮箱').fill(email);await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'注册并发送验证邮件'}).click();await expect(page.getByRole('status')).toContainText('验证邮件已发送');
 await page.getByLabel('密码',{exact:true}).fill(password);await page.getByRole('button',{name:'登录小屋'}).click();await expect(page.getByRole('status')).toContainText('请先打开验证邮件');
 const verification=await emailLink(request,email,'验证汉字小屋邮箱');expect(new URL(verification).origin).toBe(new URL(base).origin);await page.goto(verification);
 await page.goto('/#account');await page.getByLabel('家长邮箱').fill(email);await page.getByLabel('密码',{exact:true}).fill('wrong-password');await page.getByRole('button',{name:'登录小屋'}).click();await expect(page.getByRole('status')).toContainText('邮箱或密码不正确');
 await login(page,email,password);
 await page.getByLabel('添加孩子昵称').fill('小星星');await page.getByRole('button',{name:'创建孩子档案'}).click();await expect(page.getByRole('button',{name:'用小星星的档案学习'})).toBeVisible();
 await page.getByLabel('添加孩子昵称').fill('小月亮');await page.getByRole('button',{name:'创建孩子档案'}).click();await page.getByRole('button',{name:'用小星星的档案学习'}).click();
 await page.getByRole('button',{name:'开始今天的冒险'}).click();await page.getByRole('button',{name:'准备好啦，出发'}).click();await page.getByRole('button',{name:'继续探索'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');await page.reload();await expect(page.locator('.hanzi')).toHaveText('爸');
 await page.goto('/#account');await page.getByRole('button',{name:'用小月亮的档案学习'}).click();await page.getByRole('button',{name:'开始今天的冒险'}).click();await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
 await page.goto('/#account');await page.getByRole('button',{name:'用小星星的档案学习'}).click();await page.getByRole('button',{name:'继续我的冒险'}).click();await expect(page.locator('.hanzi')).toHaveText('爸');
 const otherTab=await page.context().newPage();await otherTab.goto(base+'/');await expect(otherTab.locator('.learner-banner')).toContainText('小星星');
 await page.bringToFront();await page.goto('/#account');await page.getByRole('button',{name:'退出当前账户'}).click();await expect(page.getByRole('heading',{name:'家长账户'})).toBeVisible();await otherTab.bringToFront();await expect(otherTab.getByRole('heading',{name:'家长账户'})).toBeVisible();await otherTab.close();await expect(page.getByRole('heading',{name:'家长账户'})).toBeVisible();expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe(guest);
 await page.getByRole('button',{name:'回到小屋'}).click();await page.getByRole('button',{name:'继续我的冒险'}).click();await expect(page.locator('.hanzi')).toHaveText('我');
 await page.goto('/#account');await page.getByRole('button',{name:'忘记密码'}).click();await page.getByLabel('家长邮箱').fill(email);await page.getByRole('button',{name:'发送找回邮件'}).click();await expect(page.getByRole('status')).toContainText('如果该邮箱已注册');
 const resetLink=await emailLink(request,email,'重设汉字小屋密码');await login(page,email,password);await page.goto(resetLink);await page.getByLabel('新密码').fill('Updated-family-password-27');await page.getByRole('button',{name:'保存新密码'}).click();await expect(page.getByRole('status')).toContainText('密码已更新');
 await login(page,email,'Updated-family-password-27');await expect(page.getByRole('button',{name:'用小星星的档案学习'})).toBeVisible();
 expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});

test('account outage on reload preserves storage and offers a retry',async({page})=>{
 await page.goto('/');await page.getByRole('button',{name:'开始今天的冒险'}).click();
 const saved=await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'));
 await page.route('**/api/v1/me',r=>r.fulfill({status:503,body:'{}'}));await page.reload();
 await expect(page.getByRole('button',{name:'重新连接账户'})).toBeVisible();
 expect(await page.evaluate(()=>localStorage.getItem('learnbuddy:v1:progress'))).toBe(saved);
 await page.unroute('**/api/v1/me');await page.getByRole('button',{name:'重新连接账户'}).click();
 await expect(page.getByRole('button',{name:'准备好啦，出发'})).toBeVisible();
});
