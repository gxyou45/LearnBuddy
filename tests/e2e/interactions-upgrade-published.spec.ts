import {test,expect} from '@playwright/test';
import {readFileSync} from 'node:fs';
const fixture=process.env.INTERACTION_OLD_STORAGE;
test.use({serviceWorkers:'block',viewport:{width:320,height:700},...(fixture?{storageState:fixture}:{})});
test('published upgrade preserves the actual previous release progress and original trace position',async({page},testInfo)=>{
 test.skip(!fixture,'Provide isolated storageState captured from the previous published version.');
 const state=JSON.parse(readFileSync(fixture!,'utf8'));
 const progress=state.origins.flatMap((o:any)=>o.localStorage).find((x:any)=>x.name==='learnbuddy:v1:progress');
 const before=JSON.parse(progress.value);
 await page.goto('./#lesson');
 const trace=page.getByRole('region',{name:'描一描：妈',exact:true});
 await expect(trace).toHaveAttribute('data-stroke','1');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!))).toEqual(before);
 await page.reload();await expect(trace).toHaveAttribute('data-stroke','1');
 expect(await page.evaluate(()=>JSON.parse(localStorage.getItem('learnbuddy:v1:progress')!))).toEqual(before);
 await page.screenshot({path:testInfo.outputPath('pages-upgrade-old-ma-progress-320.png')});
});
