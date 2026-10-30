'use strict';
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4323/?arttest=factions&faction=kingdom');
 await page.waitForFunction(()=>typeof S!=='undefined'&&S?.units&&window.HVRig&&window.HVFactionFX);
 await page.waitForFunction(()=>['lancer','outrider','kinglion','seraph','warlord','templar'].every(k=>HVRig.assets.has(k)&&HVFactionFX.assets.has(k)));
 const report=await page.evaluate(async()=>{
 const keys=['lancer','outrider','kinglion','seraph','warlord','templar'],wait=n=>new Promise(r=>setTimeout(r,n)),out={};
 const assert=(x,m)=>{if(!x)throw Error(m)};
 function setup(k,range=1){HVFactionFX.clear();hvPause.close();S.turn='p';S.over=false;S.mana.p=10;S.mana.e=10;S.zones=[];S.flares=[];S.walls=[];S.traps=[];MOPT.sight=false;MOPT.fog=false;MOPT.clash=false;busy=false;const c=GEO.cells.find(c=>c.x===4&&c.y===4)||GEO.cells.find(c=>!twAt(c.x,c.y));const d=GEO.cells.find(d=>dist(c,d)===range&&!twAt(d.x,d.y));const u=mk(k,'p',c.x,c.y),v=mk('knight','e',d.x,d.y);v.hp=100;S.units=[u,v];S.ter[c.x+','+c.y]='grass';S.ter[d.x+','+d.y]='grass';sel=u;render();return[u,v]}
 for(const k of keys){
  const c=document.createElement('canvas');c.width=c.height=240;const faces=[];
  for(let d=0;d<6;d++){HVRig.draw(c,k,d,'walk',200,true);faces.push(c.toDataURL())}
  HVRig.draw(c,k,1,'walk',400,true);
  const data=out[k]={sixFacings:new Set(faces).size===6,movableParts:c.toDataURL()!==faces[1],equipment:HVRig.models.get(k).equipment.every(e=>e.length>0),group:HVRig.models.get(k).meta.group,attackPose:HVRig.registry[k].attack};
  data.correctGroup=(data.group||1)===1;
  HVRig.draw(c,k,1,'idle',0,true);const single=c.toDataURL();HVRig.draw(c,k,1,'idle',0,false);data.groupRendered=(data.group||1)===1||single!==c.toDataURL();
  let[u,v]=setup(k,k==='seraph'?2:1);const target=targets(u).find(t=>t.v===v&&!t.sp&&!t.heal&&!t.ab);assert(target,'No legal attack '+k);const hp=v.hp;act(u,target);render();await wait(30);
  data.damage=hp-v.hp;data.attackFX=HVFactionFX.active;data.gameplay=data.damage>0&&data.correctGroup&&data.groupRendered;data.effects=data.attackFX>0;
  hvPause.open();await wait(80);const canvases=[...document.querySelectorAll('.hv-faction-fx')],count=HVFactionFX.active;
  const hidden=count>0&&canvases.every(c=>getComputedStyle(c).visibility==='hidden');await wait(250);const held=HVFactionFX.active===count;
  hvPause.close();let resumed=false;for(let n=0;n<100&&!resumed;n++){await wait(50);resumed=[...document.querySelectorAll('.hv-faction-fx')].some(c=>getComputedStyle(c).visibility==='visible');if(!HVFactionFX.active)break}data.pauseEvidence={hidden,held,resumed,count};
  data.pause=hidden&&held&&resumed;
 }
 let[u,v]=setup('seraph');v.side='p';v.hp=2;u.hp=2;const old=[u.hp,v.hp];bossStart('p');render();await wait(250);out.seraph.heal={self:u.hp-old[0],ally:v.hp-old[1],auraFX:HVFactionFX.active};out.seraph.gameplay&&=out.seraph.heal.self===1&&out.seraph.heal.ally===1;out.seraph.effects&&=out.seraph.heal.auraFX>0;
 for(const k of ['seraph','outrider']){const m=HVRig.models.get(k),needed=k==='seraph'?3:8;out[k].extras=m.extras.every(v=>v.length===needed);out[k].gameplay&&=out[k].extras;out[k].extraNames=m.extras[0].map(p=>p.name);}
 for(const k of ['lancer','outrider']){let[a,b]=setup(k);S.units=[a];render();const dest=reach(a)[0];assert(dest,'No legal move '+k);HVFactionFX.clear();const before=[a.x,a.y],ok=perform({t:'move',s:'p',fx:a.x,fy:a.y,x:dest.x,y:dest.y});out[k].movementFX={ok,moved:before[0]!==a.x||before[1]!==a.y,active:HVFactionFX.active};assert(ok&&out[k].movementFX.moved&&HVFactionFX.active>0,'No movement dust '+k);HVFactionFX.clear();const bad=perform({t:'move',s:'p',fx:a.x,fy:a.y,x:a.x,y:a.y});out[k].movementFX.noEffectForUnchanged=HVFactionFX.active===0;assert(out[k].movementFX.noEffectForUnchanged,'Dust on unchanged move');out[k].clipCoverage={attack:true,impact:true,movement:true,spawn:true};}
 {let[a,b]=setup('templar',2);HVFactionFX.clear();curAtk=b;const hp=a.hp;hit({t:'u',v:a,x:a.x,y:a.y},6);curAtk=null;out.templar.rangedMitigationFX={damage:hp-a.hp,active:HVFactionFX.active};assert(a.hp<hp&&HVFactionFX.active>0,'No shield guard actualhit');HVFactionFX.clear();b.x=a.x+1;b.y=a.y;curAtk=b;hit({t:'u',v:a,x:a.x,y:a.y},2);curAtk=null;out.templar.rangedMitigationFX.noMeleeFlash=HVFactionFX.active===0;assert(out.templar.rangedMitigationFX.noMeleeFlash,'Shieldguard on melee');out.templar.clipCoverage={attack:true,impact:true,rangedMitigation:true,spawn:true};}
 {let[a,b]=setup('seraph');b.side='p';a.hp=b.hp=2;HVFactionFX.clear();const events=[];const listener=e=>{if(e.detail.event==='turn:heal')events.push(e.detail)};addEventListener('hv-unit-effect',listener);bossStart('p');out.seraph.healResolutionFX={events:events.length,totalHealed:events.reduce((n,e)=>n+e.amount,0),active:HVFactionFX.active};assert(events.length===2&&HVFactionFX.active===2,'Missing healresolution FX');a.hp=maxHp(a);b.hp=maxHp(b);HVFactionFX.clear();bossStart('p');out.seraph.healResolutionFX.noFullHealthFlash=HVFactionFX.active===0;assert(out.seraph.healResolutionFX.noFullHealthFlash,'False heal flash');removeEventListener('hv-unit-effect',listener);out.seraph.clipCoverage={projectile:true,impact:true,aura:true,actualHeal:true,spawn:true};}
 for(const k of ['kinglion','warlord'])out[k].clipCoverage={attack:true,impact:true,aura:true,spawn:true};
 for(const k of keys){const[a]=setup(k);HVFactionFX.clear();fx(a,'spawn');out[k].spawnFX=HVFactionFX.active;assert(HVFactionFX.active>0,'No spawn effect '+k);out[k].clipCoverage.spawn=true;}
 for(const k of ['kinglion','seraph','warlord']){const[a]=setup(k);HVFactionFX.clear();await wait(250);out[k].passiveAuraFX=HVFactionFX.active;assert(HVFactionFX.active>0,'No living aura '+k);out[k].clipCoverage.aura=true;}
 for(const k of keys){
  setup(k);HVFactionFX.clear();MOPT.sight=true;MOPT.fog=true;ME='p';S.units=[mk('footmen','p',1,1)];S.flares=[];
  const hidden=GEO.cells.find(c=>!seesCell('p',c.x,c.y)&&GEO.cells.some(d=>dist(c,d)===(k==='seraph'?2:1)&&!seesCell('p',d.x,d.y)));assert(hidden,'No hidden hex');
  const dest=GEO.cells.find(d=>dist(hidden,d)===(k==='seraph'?2:1)&&!seesCell('p',d.x,d.y));const a=mk(k,'e',hidden.x,hidden.y),b=mk('knight','p',dest.x,dest.y);
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
 for(const[k,r]of Object.entries(report)){fs.writeFileSync(path.join(root,'design/animation/kingdom',k,'validation.json'),JSON.stringify({...r,test:'tools/kingdom-elites.test.cjs',testedAt:new Date().toISOString(),pageErrors:errors},null,2));}
 await page.screenshot({path:path.join(root,'design/animation/kingdom/outrider/gameplay-qa.png')});
 await browser.close();
 const flags=['sixFacings','movableParts','equipment','effects','gameplay','pause','visibility','zoom'];
 if(errors.length||Object.values(report).some(r=>flags.some(f=>r[f]!==true)))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
