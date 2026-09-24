/** Review actual rendered SVGs, one sheet per 24 distinct meaning scenes. */
import {chromium} from '@playwright/test';
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
const out=process.env.ACCEPTANCE_REPORT_DIR||'验收/2026-09-23-词义情境配图';
const audit=JSON.parse(await readFile(`${out}/词语素材清单.json`,'utf8'));
const seen=new Set();const samples=audit.words.filter(r=>r.kind==='scene'&&!seen.has(r.value)&&seen.add(r.value));
await mkdir(`${out}/情境样张`,{recursive:true});
const browser=await chromium.launch({channel:'chrome'});
try{
 const page=await browser.newPage({viewport:{width:1200,height:1080},deviceScaleFactor:1});
 await page.goto('file://'+resolve(`${out}/素材总览.html`));
 await page.addStyleTag({content:'nav{position:static}.grid{grid-template-columns:repeat(6,1fr)}article{min-height:202px}h1{font-size:22px}body{padding:18px}body>p{font-size:13px}'});
 const svgErrors=await page.locator('svg').evaluateAll(nodes=>nodes.flatMap(svg=>{
  const box=svg.getBBox(); const bad=(!box.width&&!box.height)||/undefined|NaN/.test(svg.innerHTML);
  return bad?[svg.getAttribute('aria-label')]:[];
 }));
 if(svgErrors.length)throw new Error(JSON.stringify(svgErrors));
 const bounds=await page.locator('svg[data-visual-kind="scene"]').evaluateAll(nodes=>nodes.map(svg=>({word:svg.getAttribute('aria-label'),box:(()=>{const b=svg.getBBox();return {x:b.x,y:b.y,width:b.width,height:b.height};})()})).filter(r=>r.box.x < -3||r.box.y < -3||r.box.x+r.box.width>123||r.box.y+r.box.height>103));
 await writeFile(`${out}/绘图边界检查.json`,JSON.stringify(bounds,null,2)+'\n');
 for(let i=0;i<samples.length;i+=24){
  await page.evaluate(({words,number})=>{
   document.querySelectorAll('article').forEach(a=>a.hidden=!words.includes(a.querySelector('b').textContent));
   document.querySelector('h1').textContent=`词义情境图 · 样张 ${number}（素材展示，非学习页截图）`;
  },{words:samples.slice(i,i+24).map(r=>r.word),number:Math.floor(i/24)+1});
  await page.screenshot({path:`${out}/情境样张/${String(Math.floor(i/24)+1).padStart(2,'0')}.png`,fullPage:true});
 }
 console.log(JSON.stringify({distinctScenes:samples.length,sheets:Math.ceil(samples.length/24),svgErrors,boundsWarnings:bounds.length}));
}finally{await browser.close();}
