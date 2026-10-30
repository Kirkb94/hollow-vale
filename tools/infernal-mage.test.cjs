'use strict';
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
const fs=require('node:fs'),path=require('node:path');
(async()=>{
 const browser=await chromium.launch({channel:'msedge',headless:true}),page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[];
 page.on('pageerror',e=>errors.push(e.message));
 await page.goto('http://localhost:4323/?arttest=factions&faction=kingdom');
 await page.waitForFunction(()=>typeof S!=='undefined'&&S?.units&&window.HVRig&&window.HVFactionFX);
 await page.evaluate(async()=>{await HVRig.ensure('mage');await HVFactionFX.load('mage','art/rigs/infernal/mage/vfx.json')});
 await page.waitForFunction(()=>['mage'].every(k=>HVRig.assets.has(k)&&HVFactionFX.assets.has(k)));
 const report=await page.evaluate(async()=>{
 const keys=['mage'],wait=n=>new Promise(r=>setTimeout(r,n)),out={};
 const assert=(x,m)=>{if(!x)throw Error(m)};
 function setup(k,range=1){HVFactionFX.clear();hvPause.close();S.turn='p';S.over=false;S.mana.p=5;S.mana.e=10;S.zones=[];S.tethers=[];S.flares=[];S.walls=[];S.traps=[];MOPT.sight=false;MOPT.fog=false;MOPT.clash=false;busy=false;const c=GEO.cells.find(c=>c.x===4&&c.y===4)||GEO.cells.find(c=>!twAt(c.x,c.y));const d=GEO.cells.find(d=>dist(c,d)===range&&!twAt(d.x,d.y));const u=mk(k,'p',c.x,c.y),v=mk('knight','e',d.x,d.y);v.hp=100;S.units=[u,v];S.ter[c.x+','+c.y]='grass';S.ter[d.x+','+d.y]='grass';sel=u;render();return[u,v]}
 for(const k of keys){
  const c=document.createElement('canvas');c.width=c.height=240;const faces=[];
  for(let d=0;d<6;d++){HVRig.draw(c,k,d,'walk',200,true);faces.push(c.toDataURL())}
  HVRig.draw(c,k,1,'walk',400,true);
  const data=out[k]={sixFacings:new Set(faces).size===6,movableParts:c.toDataURL()!==faces[1],equipment:k==='mage'||HVRig.models.get(k).equipment.every(e=>e.length>=1),group:HVRig.models.get(k).meta.group||H[k].group||1,attackPose:HVRig.registry[k].attack};
  data.correctGroup=data.group===(k==='bats'?3:1);
  HVRig.draw(c,k,1,'idle',0,true);const single=c.toDataURL();HVRig.draw(c,k,1,'idle',0,false);data.groupRendered=data.group===1||single!==c.toDataURL();
  let[u,v]=setup(k,2);const target=targets(u).find(t=>t.v===v&&!t.sp&&!t.heal&&!t.ab);assert(target,'No legal attack '+k);const hp=v.hp;act(u,target);render();await wait(30);
  data.damage=hp-v.hp;data.attackFX=HVFactionFX.active;data.gameplay=data.damage>0&&data.correctGroup&&data.groupRendered;data.effects=data.attackFX>0;
  hvPause.open();await wait(80);const canvases=[...document.querySelectorAll('.hv-faction-fx')],count=HVFactionFX.active;
  const hidden=count>0&&canvases.every(c=>getComputedStyle(c).visibility==='hidden');await wait(250);const held=HVFactionFX.active===count;
  hvPause.close();let resumed=false;for(let n=0;n<100&&!resumed;n++){await wait(50);resumed=[...document.querySelectorAll('.hv-faction-fx')].some(c=>getComputedStyle(c).visibility==='visible');if(!HVFactionFX.active)break}data.pauseEvidence={hidden,held,resumed,count};
  data.pause=hidden&&held&&resumed;
 }

 for(const k of keys){
  setup(k);HVFactionFX.clear();MOPT.sight=true;MOPT.fog=true;ME='p';S.units=[mk('footmen','p',1,1)];S.flares=[];
  const hidden=GEO.cells.find(c=>!seesCell('p',c.x,c.y)&&GEO.cells.some(d=>dist(c,d)===(1)&&!seesCell('p',d.x,d.y)));assert(hidden,'No hidden hex');
  const dest=GEO.cells.find(d=>dist(hidden,d)===(1)&&!seesCell('p',d.x,d.y));const a=mk(k,'e',hidden.x,hidden.y),b=mk('knight','p',dest.x,dest.y);
  S.units.push(a);render();await wait(50);const hiddenRig=!document.querySelector('#board .cell[data-x="'+a.x+'"][data-y="'+a.y+'"] canvas.hv-rig');
  atkFx(a,{t:'u',v:b,x:b.x,y:b.y});a.hp=0;fx(a,'dead');await wait(30);out[k].visibility=!visU(a)&&HVFactionFX.active===0&&hiddenRig;
 }
 HVFactionFX.clear();MOPT.sight=false;MOPT.fog=false;S.units=keys.map((k,i)=>mk(k,'p',3+i%3,3+Math.floor(i/3)));render();await wait(80);
 const measure=()=>({board:document.getElementById('board').getBoundingClientRect().width,rigs:keys.map(k=>{const u=S.units.find(u=>u.k===k),c=document.querySelector('#board .cell[data-x="'+u.x+'"][data-y="'+u.y+'"] canvas.hv-rig');return c?.getBoundingClientRect().width||0})});
 const before=measure(),btn=['bzin','bzi'].map(id=>document.getElementById(id)).find(b=>b&&b.getBoundingClientRect().width>0);assert(btn,'No zoom button');btn.click();await wait(150);const after=measure();
 keys.forEach((k,i)=>{out[k].zoom=before.rigs[i]>0&&after.board!==before.board&&Math.abs(after.rigs[i]/after.board-before.rigs[i]/before.board)<.01;out[k].zoomMeasurements={before:{board:before.board,rig:before.rigs[i]},after:{board:after.board,rig:after.rigs[i]}}});
 return out;
 });
 const result={report,errors};console.log(JSON.stringify(result,null,2));
 const root=path.resolve(__dirname,'..');
 for(const[k,r]of Object.entries(report)){fs.mkdirSync(path.join(root,'design/animation/infernal',k),{recursive:true});fs.writeFileSync(path.join(root,'design/animation/infernal',k,'validation.json'),JSON.stringify({...r,test:'tools/infernal-mage.test.cjs',testedAt:new Date().toISOString(),pageErrors:errors},null,2));}
 await page.screenshot({path:path.join(root,'design/animation/infernal/mage/gameplay-qa.png')});
 await browser.close();
 const flags=['sixFacings','movableParts','equipment','effects','gameplay','pause','visibility','zoom'];
 if(errors.length||Object.values(report).some(r=>flags.some(f=>r[f]!==true)))process.exitCode=1;
})().catch(e=>{console.error(e);process.exit(1)});
