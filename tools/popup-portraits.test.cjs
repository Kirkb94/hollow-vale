const assert=require('node:assert/strict');
const{chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1200,height:800}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4323/');await p.evaluate(()=>HVRig.ready);
 const keys=await p.evaluate(()=>Object.keys(HVRig.registry));
 await p.evaluate(()=>{document.body.classList.add('hv-paused');const d=document.createElement('div');d.id='portrait-proof';d.style.cssText='position:fixed;inset:80px;z-index:99999;background:#17272b;color:white;display:flex;gap:24px;padding:24px;font-size:48px';document.body.append(d);});
 for(const k of keys){
  await p.evaluate(k=>{document.querySelector('#portrait-proof').innerHTML=`<div style="position:relative;width:240px;height:300px">${port(k)}</div><div>${spr(k,'p')}</div><div style="position:relative;width:240px;height:300px"><span class="hvf" data-hvk="${k}"><img src="data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg'/%3E"></span></div>`;},k);
  await p.waitForFunction(()=>{const els=[...document.querySelectorAll('#portrait-proof .hv-rig-portrait')];return els.length===3&&els.every(el=>{const c=el.querySelector('canvas');return el.classList.contains('ready')&&c&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>64);});});
 }
 const freeze=await p.locator('#portrait-proof canvas').first().evaluate(c=>c.toDataURL());await p.waitForTimeout(200);assert.equal(await p.locator('#portrait-proof canvas').first().evaluate(c=>c.toDataURL()),freeze);
 await p.screenshot({path:'design/animation/popup-portrait-review.png'});
 assert.deepEqual(errors,[]);console.log(JSON.stringify({characters:keys.length,portraitContexts:3,pausedPortraits:true,errors}));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
