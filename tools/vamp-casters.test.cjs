'use strict';
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4323/?arttest=factions&faction=kingdom');
 await page.waitForFunction(()=>typeof S!=='undefined'&&S?.units&&window.HVRig&&window.HVFactionFX);
 await page.evaluate(async()=>{for(const k of ['nightwatch','hemomancer','mesmerist','duskweaver','matriarch']){await HVRig.register(k,{folder:'vamp/'+k,manifest:'manifest.json',attack:['nightwatch','duskweaver'].includes(k)?'attack':'cast',effects:'vfx.json'});await HVFactionFX.load(k,'art/rigs/vamp/'+k+'/vfx.json')}});
 await page.waitForFunction(()=>['nightwatch','hemomancer','mesmerist','duskweaver','matriarch'].every(k=>HVRig.assets.has(k)&&HVFactionFX.assets.has(k)));
 const report=await page.evaluate(async()=>{
 const keys=['nightwatch','hemomancer','mesmerist','duskweaver','matriarch'],wait=n=>new Promise(r=>setTimeout(r,n)),out={};
 const assert=(x,m)=>{if(!x)throw Error(m)};
 function setup(k,range=1){HVFactionFX.clear();hvPause.close();S.turn='p';S.over=false;S.mana.p=5;S.mana.e=10;S.zones=[];S.tethers=[];S.flares=[];S.walls=[];S.traps=[];MOPT.sight=false;MOPT.fog=false;MOPT.clash=false;busy=false;const c=GEO.cells.find(c=>c.x===4&&c.y===4)||GEO.cells.find(c=>!twAt(c.x,c.y));const d=GEO.cells.find(d=>dist(c,d)===range&&!twAt(d.x,d.y));const u=mk(k,'p',c.x,c.y),v=mk('knight','e',d.x,d.y);v.hp=100;S.units=[u,v];S.ter[c.x+','+c.y]='grass';S.ter[d.x+','+d.y]='grass';sel=u;render();return[u,v]}
 for(const k of keys){
  const c=document.createElement('canvas');c.width=c.height=240;const faces=[];
  for(let d=0;d<6;d++){HVRig.draw(c,k,d,'walk',200,true);faces.push(c.toDataURL())}
  HVRig.draw(c,k,1,'walk',400,true);
  const data=out[k]={sixFacings:new Set(faces).size===6,movableParts:c.toDataURL()!==faces[1],equipment:HVRig.models.get(k).equipment.every(e=>e.length>=1),group:HVRig.models.get(k).meta.group,attackPose:HVRig.registry[k].attack};
  data.correctGroup=data.group===1;
  HVRig.draw(c,k,1,'idle',0,true);const single=c.toDataURL();HVRig.draw(c,k,1,'idle',0,false);data.groupRendered=data.group===1||single!==c.toDataURL();
  let[u,v]=setup(k,['hemomancer','matriarch'].includes(k)?2:1);const target=targets(u).find(t=>t.v===v&&!t.sp&&!t.heal&&!t.ab);assert(target,'No legal attack '+k);const hp=v.hp;act(u,target);render();await wait(30);
  data.damage=hp-v.hp;data.attackFX=HVFactionFX.active;data.gameplay=data.damage>0&&data.correctGroup&&data.groupRendered;data.effects=data.attackFX>0;
  hvPause.open();await wait(80);const canvases=[...document.querySelectorAll('.hv-faction-fx')],count=HVFactionFX.active;
  const hidden=count>0&&canvases.every(c=>getComputedStyle(c).visibility==='hidden');await wait(250);const held=HVFactionFX.active===count;
  hvPause.close();let resumed=false;for(let n=0;n<100&&!resumed;n++){await wait(50);resumed=[...document.querySelectorAll('.hv-faction-fx')].some(c=>getComputedStyle(c).visibility==='visible');if(!HVFactionFX.active)break}data.pauseEvidence={hidden,held,resumed,count};
  data.pause=hidden&&held&&resumed;
 }
 const events=[];window.addEventListener('hv-unit-effect',e=>events.push(e.detail.event));
 let[u,v]=setup('nightwatch',3);const mana=S.mana.p,t=targets(u).find(t=>t.ab==='flare'&&t.x===v.x&&t.y===v.y);assert(t,'No flare');
 let ok=perform({t:'act',s:'p',i:true,fx:u.x,fy:u.y,x:t.x,y:t.y});await wait(40);
 out.nightwatch.flare={ok,manaSpent:mana-S.mana.p,created:S.flares.some(f=>f.x===v.x&&f.y===v.y),marked:v.markBy==='p',effects:HVFactionFX.active};
 out.nightwatch.gameplay&&=ok&&out.nightwatch.flare.created&&out.nightwatch.flare.marked&&out.nightwatch.flare.manaSpent===H.nightwatch.fcost;
 out.nightwatch.effects&&=out.nightwatch.flare.effects>0;
 function cast(u,t,extra={}){return perform({t:'act',s:'p',i:true,fx:u.x,fy:u.y,x:t.x,y:t.y,item:HVSP.enc(extra)})}
 [u,v]=setup('hemomancer',2);u.hp=3;let st=HVSP.spTargets(u,'tether').find(t=>t.v===v);assert(st,'No tether');ok=cast(u,st);await wait(30);
 out.hemomancer.tether={ok,created:S.tethers.length===1,castEffects:HVFactionFX.active};HVFactionFX.clear();const hp=v.hp,heal=u.hp;phaseStart('p');await wait(30);
 Object.assign(out.hemomancer.tether,{damage:hp-v.hp,healed:u.hp-heal,statusEvent:events.includes('tether:tick'),tickEffects:HVFactionFX.active});
 out.hemomancer.gameplay&&=ok&&out.hemomancer.tether.created&&v.hp<hp&&u.hp>heal;out.hemomancer.effects&&=out.hemomancer.tether.statusEvent&&HVFactionFX.active>0;
 [u,v]=setup('mesmerist',2);const dest=GEO.cells.find(d=>dist(v,d)===1&&!at(d.x,d.y)&&!twAt(d.x,d.y));const w=mk('footmen','e',dest.x,dest.y);w.hp=100;S.units.push(w);S.ter[w.x+','+w.y]='grass';st=HVSP.spTargets(u,'command').find(t=>t.v===v);assert(st,'No command');const whp=w.hp;ok=cast(u,st,{x2:w.x,y2:w.y});await wait(30);
 out.mesmerist.command={ok,damage:whp-w.hp,noCounter:!!v.nocnt,effects:HVFactionFX.active};out.mesmerist.gameplay&&=ok&&w.hp<whp&&!!v.nocnt;out.mesmerist.effects&&=HVFactionFX.active>0;
 [u,v]=setup('duskweaver',2);st=HVSP.spTargets(u,'veil').find(t=>t.x===u.x&&t.y===u.y);assert(st,'No veil');ok=cast(u,st);await wait(30);
 out.duskweaver.veil={ok,zone:S.zones.some(z=>z.k==='veil'&&z.cells.length===7),hiddenFromEnemy:!seesCell('e',u.x,u.y),effects:HVFactionFX.active};out.duskweaver.gameplay&&=ok&&out.duskweaver.veil.zone&&out.duskweaver.veil.hiddenFromEnemy;out.duskweaver.effects&&=HVFactionFX.active>0;
 [u,v]=setup('matriarch',2);const pm=S.mana.p,em=S.mana.e;act(u,targets(u).find(t=>t.v===v&&!t.ab&&!t.sp));await wait(30);
 out.matriarch.bloodpact={gained:S.mana.p-pm,stolen:em-S.mana.e,event:events.includes('bloodpact:gain'),effects:HVFactionFX.active};out.matriarch.gameplay&&=S.mana.p===pm+1&&S.mana.e===em-1;out.matriarch.effects&&=out.matriarch.bloodpact.event&&HVFactionFX.active>0;
 for(const k of keys){
  setup(k);HVFactionFX.clear();MOPT.sight=true;MOPT.fog=true;ME='p';S.units=[mk('footmen','p',1,1)];S.flares=[];
  const hidden=GEO.cells.find(c=>!seesCell('p',c.x,c.y)&&GEO.cells.some(d=>dist(c,d)===(['hemomancer','matriarch'].includes(k)?2:1)&&!seesCell('p',d.x,d.y)));assert(hidden,'No hidden hex');
  const dest=GEO.cells.find(d=>dist(hidden,d)===(['hemomancer','matriarch'].includes(k)?2:1)&&!seesCell('p',d.x,d.y));const a=mk(k,'e',hidden.x,hidden.y),b=mk('knight','p',dest.x,dest.y);
  S.units.push(a);render();await wait(50);const hiddenRig=!document.querySelector('#board .cell[data-x="'+a.x+'"][data-y="'+a.y+'"] canvas.hv-rig');
  atkFx(a,{t:'u',v:b,x:b.x,y:b.y});await wait(30);out[k].visibility=!visU(a)&&HVFactionFX.active===0&&hiddenRig;
 }
 HVFactionFX.clear();MOPT.sight=false;MOPT.fog=false;S.units=keys.map((k,i)=>mk(k,'p',3+i%3,3+Math.floor(i/3)));render();await wait(80);
 const measure=()=>({board:document.getElementById('board').getBoundingClientRect().width,rigs:keys.map(k=>{const u=S.units.find(u=>u.k===k),c=document.querySelector('#board .cell[data-x="'+u.x+'"][data-y="'+u.y+'"] canvas.hv-rig');return c?.getBoundingClientRect().width||0})});
 const before=measure(),btn=['bzin','bzi'].map(id=>document.getElementById(id)).find(b=>b&&b.getBoundingClientRect().width>0);assert(btn,'No zoom button');btn.click();await wait(150);const after=measure();
 keys.forEach((k,i)=>{out[k].zoom=before.rigs[i]>0&&after.board!==before.board&&Math.abs(after.rigs[i]/after.board-before.rigs[i]/before.board)<.01;out[k].zoomMeasurements={before:{board:before.board,rig:before.rigs[i]},after:{board:after.board,rig:after.rigs[i]}}});
 return out;
 });
 const result={report,errors};console.log(JSON.stringify(result,null,2));
 const root=path.resolve(__dirname,'..');
 for(const[k,r]of Object.entries(report)){fs.writeFileSync(path.join(root,'design/animation/vamp',k,'validation.json'),JSON.stringify({...r,test:'tools/vamp-casters.test.cjs',testedAt:new Date().toISOString(),pageErrors:errors},null,2));}
 await page.screenshot({path:path.join(root,'design/animation/vamp/nightwatch/gameplay-qa.png')});
 await browser.close();
 const flags=['sixFacings','movableParts','equipment','effects','gameplay','pause','visibility','zoom'];
 if(errors.length||Object.values(report).some(r=>flags.some(f=>r[f]!==true)))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
