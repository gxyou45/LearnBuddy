import {test,expect} from '@playwright/test';
import {lessonInteractions} from '../../apps/web/src/interactionPilot';
import {strokeData} from '../../apps/web/src/strokeData';
test.use({viewport:{width:320,height:700},serviceWorkers:'block'});
test('all 204 lessons render both production trace boards and a completed river',async({page},testInfo)=>{
 test.setTimeout(120000);
 const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 await page.goto(`/@fs/${process.cwd()}/tests/fixtures/interactions.html`);
 for(const [i,lesson] of lessonInteractions.entries()){
  await page.getByLabel('课程',{exact:true}).selectOption(String(i));
  await expect(page.locator('.trace-character')).toHaveCount(2);
  for(const target of lesson.characters){
   const trace=page.getByRole('region',{name:`描一描：${target.text}`,exact:true});
   await expect(trace).toBeVisible();await expect(trace).toContainText(`第 1 / ${strokeData[target.text].strokes.length} 笔`);
   await expect(trace.locator('svg>g>path')).toHaveCount(strokeData[target.text].strokes.length);
  }
  await expect(page.locator('.river-journey')).toHaveAttribute('data-solved',i<10?'6':'10');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  if([0,10,49,100,203].includes(i))await page.screenshot({path:testInfo.outputPath(`components-${lesson.lessonId}-320.png`),fullPage:true});
 }
 expect(errors).toEqual([]);
});
test('both final-unit characters can be completely drawn in the real component',async({page},testInfo)=>{
 test.setTimeout(90000);
 await page.goto(`/@fs/${process.cwd()}/tests/fixtures/interactions.html`);
 await page.getByLabel('课程',{exact:true}).selectOption('203');
 const {sampleStroke}=await import('../../apps/web/src/traceGeometry');
 for(const target of lessonInteractions[203].characters){
  const trace=page.getByRole('region',{name:`描一描：${target.text}`,exact:true}),board=trace.locator('.trace-board');
  await board.scrollIntoViewIfNeeded();
  for(const [i,median] of strokeData[target.text].medians.entries()){
   const box=(await board.boundingBox())!,points=sampleStroke(median);
   const at=(p:readonly [number,number])=>[box.x+p[0]/1024*box.width,box.y+p[1]/1024*box.height] as const;
   await page.mouse.move(...at(points[0]));await page.mouse.down();
   for(let j=1;j<points.length;j+=3)await page.mouse.move(...at(points[j]));
   await page.mouse.move(...at(points.at(-1)!));await page.mouse.up();
   await expect(trace).toHaveAttribute('data-stroke',String(i+1));
  }
  await expect(trace).toContainText('汉字长出来啦');
 }
 await page.screenshot({path:testInfo.outputPath('last-unit-both-complete-320.png'),fullPage:true});
});
