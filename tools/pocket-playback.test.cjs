'use strict';
const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true});
 try {
  const page=await browser.newPage();
  await page.goto('http://localhost:4323/animation-preview.html?unit=mage');
  await page.evaluate(()=>HVFrames.ready);
  const result=await page.evaluate(async()=>{
   const results=[];
   for(const key of ['mage','knight']){
    await HVFrames.ensure(key);
    const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;
    for(const state of ['idle','walk','attack']){
     const clip=HVFrames.clipFor(key,state),step=clip.duration/clip.frames.length;
     HVFrames.paintFrame(canvas,key,state,0,true);const first=canvas.toDataURL();
     HVFrames.draw(canvas,key,0,state,step-1,true);const held=canvas.toDataURL()===first;
     HVFrames.paintFrame(canvas,key,state,1,true);const second=canvas.toDataURL();
     HVFrames.draw(canvas,key,0,state,step+1,true);
     results.push({key,state,held,next:canvas.toDataURL()===second,blend:HVFrames.frameSample(key,state,step-.1).blend});
    }
   }
   return results;
  });
  for(const r of result){assert(r.held,JSON.stringify(r));assert(r.next,JSON.stringify(r));assert.equal(r.blend,0);}
  await page.emulateMedia({reducedMotion:'reduce'});
  assert(await page.evaluate(()=>{const c=document.createElement('canvas');c.width=320;c.height=240;HVFrames.draw(c,'mage',0,'walk',0,true);const a=c.toDataURL();HVFrames.draw(c,'mage',0,'walk',372,true);return a===c.toDataURL();}));
  console.log(JSON.stringify({result,reducedMotion:true}));
 }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
