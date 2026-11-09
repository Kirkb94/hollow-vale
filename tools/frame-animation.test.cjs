const fs=require('node:fs'),assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.goto('http://localhost:4323/animation-preview.html');await p.evaluate(()=>HVFrames.ready);await p.waitForFunction(()=>HVFrames.assets.has('mage'));await p.screenshot({path:'design/animation/frame-workshop.png'});
 const keys=await p.evaluate(()=>Object.keys(HVFrames.registry)),report=[];
 for(const k of keys)report.push(await p.evaluate(async k=>{
  if(!await HVFrames.ensure(k))throw Error('Failed '+k);const cv=document.createElement('canvas');cv.width=320;cv.height=240;const ctx=cv.getContext('2d'),original=ctx.drawImage.bind(ctx);let draws=0;ctx.drawImage=(...args)=>{draws++;return original(...args)};
  for(const state of ['idle','walk','attack','cast','shoot','thrust','hurt','death','spawn'])for(const t of [100,240,400,650]){draws=0;HVFrames.draw(cv,k,0,state,t,true);if(draws!==1)throw Error('Not whole-frame playback: '+k)}
  HVFrames.draw(cv,k,0,'idle',0,true);const first=cv.toDataURL();HVFrames.draw(cv,k,5,'idle',0,true);if(first!==cv.toDataURL())throw Error('Facing changed '+k);
  const data=ctx.getImageData(0,0,320,240).data;let pixels=0;for(let i=3;i<data.length;i+=4)if(data[i]>32)pixels++;if(!pixels)throw Error('Blank '+k);return {k,pixels};
 },k));
 for(let start=0;start<keys.length;start+=28){const image=await p.evaluate(async keys=>{const c=document.createElement('canvas');c.width=1400;c.height=1000;const g=c.getContext('2d');g.fillStyle='#253b3b';g.fillRect(0,0,c.width,c.height);const frame=document.createElement('canvas');frame.width=320;frame.height=240;for(let i=0;i<keys.length;i++){const k=keys[i];await HVFrames.ensure(k);HVFrames.draw(frame,k,0,'idle',0,true);g.drawImage(frame,(i%7)*200,Math.floor(i/7)*250,200,150);g.fillStyle='#e6d9b5';g.font='15px sans-serif';g.fillText(k,(i%7)*200+12,Math.floor(i/7)*250+175)}return c.toDataURL().split(',')[1]},keys.slice(start,start+28));fs.writeFileSync('design/animation/frame-roster-'+start+'.png',Buffer.from(image,'base64'));}
 await p.goto('http://localhost:4323/?arttest=factions&faction=infernal');await p.waitForFunction(()=>window.HVFrames&&typeof S!=='undefined'&&S?.units?.length>0&&document.querySelector('#board canvas.hv-rig'));await p.waitForTimeout(1200);await p.screenshot({path:'design/animation/frame-match.png'});
 assert(!requests.some(u=>/\/(creature-rigs|rig-animation)\.js|\/art\/rigs\/.*(?:manifest|\.rig)\.json/.test(u)),'Runtime requested skeleton assets');assert.deepEqual(errors,[]);
 const roster=JSON.parse(fs.readFileSync('design/animation/game-roster.json','utf8'));assert(roster.every(u=>keys.includes(u.id)),'Missing game unit');
 fs.writeFileSync('design/animation/frame-validation.json',JSON.stringify({units:keys.length,gameUnits:roster.length,errors,report},null,2));console.log(JSON.stringify({units:keys.length,gameUnits:roster.length,errors,wholeFrameDraws:true,fixedFacing:true}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
