const assert=require('node:assert/strict');
const{chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 for(const width of [1440,480]){
 const p=await b.newPage({viewport:{width,height:1000}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
 await p.goto('http://localhost:4323/?arttest=factions');await p.waitForFunction(()=>typeof S!=='undefined'&&S?.units?.length>0);
 await p.locator('#hvfm [data-a=ok]').click();await p.waitForTimeout(2000);
 await p.evaluate(()=>{document.querySelector('#hv-faction-test')?.remove();S.pool.p=['druid','wolves','sprites'];sel=S.units.find(u=>u.side==='p');render();});
 await p.waitForFunction(()=>[...document.querySelectorAll('#res canvas.hv-inline-portrait')].length===3&&[...document.querySelectorAll('#res canvas.hv-inline-portrait')].every(c=>c.classList.contains('ready')&&c.getContext('2d').getImageData(0,0,c.width,c.height).data.some((v,i)=>i%4===3&&v>64)));
 const bounded=await p.evaluate(()=>[...document.querySelectorAll('#res canvas,.ucs canvas')].every(c=>{const a=c.getBoundingClientRect(),b=c.parentElement.getBoundingClientRect();return a.width>0&&a.height>0&&a.left>=b.left-1&&a.top>=b.top-1&&a.right<=b.right+1&&a.bottom<=b.bottom+1;}));assert(bounded,'Portrait escaped its container at '+width);
 await p.locator('#res .chip').first().click();assert.equal(await p.evaluate(()=>spSel),0);
 await p.evaluate(()=>{const h=spawnHexes('p')[0];submit({t:'spawn',s:'p',i:0,x:h.x,y:h.y});});
 await p.waitForFunction(()=>S.pool.p.length===2);await p.waitForFunction(()=>[...document.querySelectorAll('#res canvas')].length===2&&[...document.querySelectorAll('#res canvas')].every(c=>c.classList.contains('ready')));
 await p.evaluate(()=>{sel=null;insp=null;render();});await p.waitForTimeout(300);
 assert(await p.locator('#udock').isHidden());
 await p.screenshot({path:`design/animation/reserve-portrait-${width}.png`});assert.deepEqual(errors,[]);console.log('Selection, reserve portraits and spawning passed at '+width+'px');await p.close();
 }
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
