const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage(),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4323/animation-preview.html');await p.waitForFunction(()=>window.HVRig&&Object.keys(HVRig.registry).length>100);
 const keys=await p.evaluate(()=>Object.keys(HVRig.registry)),rows=[];
 for(const k of keys){rows.push(await p.evaluate(async k=>{
  if(!await HVRig.ensure(k))throw Error('Failed rig '+k);
  const c=document.createElement('canvas');c.width=320;c.height=240;const ctx=c.getContext('2d'),draw=ctx.drawImage.bind(ctx);let draws=0;
  ctx.drawImage=function(...args){const m=ctx.getTransform();if(![m.a,m.b,m.c,m.d,m.e,m.f,...args.slice(1)].every(Number.isFinite))throw Error('Invalid transform '+k);draws++;return draw(...args)};
  let frames=0;
  for(let d=0;d<6;d++)for(const state of ['idle','walk','attack','cast','shoot','thrust','hurt','death','spawn'])for(const t of [100,240,400,650]){HVRig.draw(c,k,d,state,t,true);frames++}
  return {key:k,frames,draws};
 },k));if(rows.length%25===0)console.log('Animation pass: '+rows.length+'/'+keys.length);}
 assert.equal(errors.length,0,errors.join('\n'));assert(rows.every(r=>r.draws>0));
 const report={testedAt:new Date().toISOString(),kits:rows.length,frames:rows.reduce((n,r)=>n+r.frames,0),errors,rows};
 fs.writeFileSync('design/animation/layer-audit/animation-passes.json',JSON.stringify(report,null,2));console.log(JSON.stringify({kits:report.kits,frames:report.frames,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
