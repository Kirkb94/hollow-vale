const assert=require('node:assert/strict'),fs=require('node:fs');
const{chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1440,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4323/?arttest=factions&faction=kingdom');
 await p.waitForFunction(()=>typeof S!=='undefined'&&S?.units.some(u=>u.k==='footmen')&&HVRig.assets.has('footmen'));
 await p.waitForFunction(()=>window.HVArcaneTerrain?.ready);
 await p.evaluate(()=>document.body.classList.add('hv-paused'));
 const result=await p.evaluate(()=>{
   const u=S.units.find(u=>u.k==='footmen'),c=document.querySelector(`#board .cell[data-x="${u.x}"][data-y="${u.y}"] canvas.hv-rig`);
   const source=c.getContext('2d').getImageData(0,0,c.width,c.height).data;
   const test=document.createElement('canvas');test.width=c.width;test.height=c.height;
   // Shape occupancy is stable despite idle bob. One figure must be much taller than a pack.
   const bounds=a=>{let top=c.height,bottom=0;for(let y=0;y<c.height;y++)for(let x=0;x<c.width;x++)if(a[(y*c.width+x)*4+3]>64){top=Math.min(top,y);bottom=Math.max(bottom,y);}return bottom-top;};
   HVRig.draw(test,'footmen',1,'idle',0,true);const one=bounds(test.getContext('2d').getImageData(0,0,c.width,c.height).data);
   HVRig.draw(test,'footmen',1,'idle',0,false);const pack=bounds(test.getContext('2d').getImageData(0,0,c.width,c.height).data);
   let bg=document.querySelector('#hvbg');if(!bg){bg=document.createElement('div');bg.id='hvbg';document.querySelector('#bw').append(bg);}
   const probes=Array.from({length:6},(_,i)=>{const e=document.createElement('i');e.className=`t r${i} m tt-forest_0`;bg.append(e);return e;});
   const forest=probes.map(e=>getComputedStyle(e).transform);probes.forEach(e=>e.remove());
   return{battle:bounds(source),one,pack,group:H.footmen.group,forest};
 });assert(Math.abs(result.battle-result.one)<6,JSON.stringify(result));assert.equal(result.group,3);assert(result.forest.length);assert(result.forest.every(x=>x==='matrix(1.04, 0, 0, 1.04, 0, 0)'));
 await p.goto('http://localhost:4323/');await p.evaluate(()=>HVRig.ready);await p.waitForTimeout(1500);
 await p.screenshot({path:'design/animation/current-menu.png'});
 await p.evaluate(()=>{document.querySelector('#hvfm')?.remove();openDraft('Ready',()=>{});});
 await p.waitForFunction(()=>document.querySelector('#cards .hv-current-portrait.ready'));
 await p.evaluate(()=>{const c=document.querySelector('#cards [data-k="footmen"]');c?.scrollIntoView();});await p.waitForFunction(()=>document.querySelector('#cards [data-k="footmen"] .hv-current-portrait.ready'));
 const selection=await p.evaluate(()=>{const el=document.querySelector('#cards [data-k="footmen"] .hv-current-portrait');return{ready:el?.classList.contains('ready'),width:el?.getBoundingClientRect().width,height:el?.getBoundingClientRect().height};});assert(selection.ready&&selection.width>20&&selection.height>20,JSON.stringify(selection));
 await p.screenshot({path:'design/animation/current-selection.png'});assert.deepEqual(errors,[]);console.log(JSON.stringify({result,selection,errors},null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
