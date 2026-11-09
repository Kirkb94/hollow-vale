const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage({viewport:{width:1100,height:850}}),errors=[],requests=[];
 p.on('pageerror',e=>errors.push(e.message));p.on('request',r=>requests.push(r.url()));
 await p.goto('http://localhost:4323/?arttest=pyromancer');
 await p.waitForFunction(()=>document.querySelector('#art-loading').hidden);
 const result=await p.evaluate(async()=>{
  for(const[k,c]of Object.entries(HVRig.registry))if(c.effects)await HVFactionFX.load(k,'art/rigs/'+c.folder+'/'+c.effects);
  const packs=[...HVFactionFX.assets.values()];
  const clips=packs.flatMap(p=>Object.values(p.clips));
  psInit();eliteBurst('dragon',300,200,80,1);psRun();
  const e=document.createElement('i');e.className='f-orb';document.querySelector('#fxl').append(e);const s=getComputedStyle(e);
  const result={packs:packs.length,clips:clips.length,pixelPacks:packs.every(p=>p.image.src.endsWith('effects-pocket-chibi.png')),shortClips:clips.every(c=>c.rects.length===4),errors:HVFactionFX.errors,particleScale:PS.dp,pixel:getComputedStyle(PS.cv).imageRendering,orbBackground:s.backgroundImage,orbShadow:s.boxShadow};e.remove();
  const u=S.units.find(u=>u.k==='mage'),target=S.units.find(u=>u.side!==S.turn);if(u&&target)atkFx(u,{x:target.x,y:target.y,v:target,t:'u'});
  return result;
 });
 await p.waitForTimeout(450);
 const fx=await p.locator('.hv-faction-fx').evaluateAll(es=>es.map(e=>({pixel:getComputedStyle(e).imageRendering,smoothing:e.getContext('2d').imageSmoothingEnabled})));
 await p.screenshot({path:'design/art-directions/pocket-chibi/pixel-effects-check.png'});
 assert(result.packs>=100);assert(result.clips>300);assert(result.pixelPacks&&result.shortClips);assert.deepEqual(result.errors,{});
 assert.equal(result.particleScale,1/3);assert.equal(result.pixel,'pixelated');assert.equal(result.orbBackground,'none');assert.equal(result.orbShadow,'none');
 assert(!requests.some(x=>/art\/rigs\/.*\.(png|webp)/.test(x)),'Legacy effect texture requested');
 assert(fx.length);assert(fx.every(e=>e.pixel==='pixelated'&&!e.smoothing));assert.deepEqual(errors,[]);
 console.log(JSON.stringify({result,liveEffects:fx.length,legacyTextures:false,errors}));
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
