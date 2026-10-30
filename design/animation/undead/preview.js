/* Standalone skeletal cutout QA; shared game renderer is owned by the parent agent. */
const ROOT='../../../public/art/rigs/undead/';
const D=['e','se','sw','w','nw','ne'],images={};
const load=src=>new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=reject;im.src=ROOT+src;});
Promise.all(D.map(async d=>images[d]=await load(M.views[d].file)).concat(load(M.equipment.staff.file).then(im=>images.staff=im))).then(()=>{
 document.querySelector('#loading').textContent='All 72 body parts and six staff views loaded. Separate pieces rotate around their own joints.';
 D.forEach(d=>{const box=document.createElement('article');box.innerHTML=`<h2>${d.toUpperCase()}</h2><canvas width="320" height="400" data-dir="${d}"></canvas>`;document.querySelector('main').appendChild(box);});
 function loop(t){document.querySelectorAll('canvas[data-dir]').forEach(c=>draw(c,t/1000));requestAnimationFrame(loop);}requestAnimationFrame(loop);
}).catch(e=>document.querySelector('#loading').textContent='Load failed: '+e);
function draw(canvas,t){
 const ctx=canvas.getContext('2d'),d=canvas.dataset.dir,view=M.views[d],a=document.querySelector('#action').value,phase=t*6.2;
 const walk=a==='walk',cast=a==='cast',rear=d==='nw'||d==='ne',left=d==='w'||d==='sw'||d==='nw',profile=d==='e'||d==='w';
 const swing=walk?Math.sin(phase)*.32:0,bob=walk?Math.abs(Math.sin(phase))*2:Math.sin(t*2)*1;
 const spread=+document.querySelector('#explode').value;
 ctx.clearRect(0,0,320,400);ctx.save();ctx.translate(0,bob);
 const pieces=[];
 function part(name,x,y,w,h,angle=0,z=0){pieces.push({name,x,y,w,h,angle,z});}
 function arm(side,x,front){const s=side==='left'?-1:1;let r=s*swing*.8;if(cast&&side==='right')r=(left?1:-1)*(1.1+Math.sin(t*4)*.2);const h=47;part(side+'UpperArm',x,143,profile?26:33,h,r,front?8:1);const ex=x-Math.sin(r)*h*.82,ey=143+Math.cos(r)*h*.82;part(side+'Forearm',ex,ey,27,47,r+(cast&&side==='right'?(left?-.35:.35):-.12*s),front?9:2);if(side==='right'){const r2=r+(cast?(left?-.35:.35):-.12*s);pieces.push({name:'staff',x:ex-Math.sin(r2)*39,y:ey+Math.cos(r2)*39,w:40,h:230,angle:cast?(left?.18:-.18):.04,z:front?10:2.5});}}
 const hipL=profile?151:143,hipR=profile?166:177;
 for(const [side,x,s]of[['left',hipL,-1],['right',hipR,1]]){const r=s*swing;part(side+'Leg',x,249,28,70,r,0);part(side+'Boot',x-Math.sin(r)*57,249+Math.cos(r)*57,42,39,r*.25,1);}
 part('cape',160,124,profile?103:140,204,Math.sin(t*2)*.025, rear?6:0);
 part('pelvis',160,215,profile?93:113,109,walk?Math.sin(phase)*.035:0,4);
 part('torso',160,123,profile?65:84,102,0,5);
 const near=left?'left':'right';arm('left',profile?148:128,near==='left');arm('right',profile?172:192,near==='right');
 part('head',160,135,profile?83:98,104,cast?(left?-.06:.06):Math.sin(t*1.5)*.015,11);
 for(const p of pieces.sort((a,b)=>a.z-b.z)){
  const data=p.name==='staff'?M.equipment.staff.views[d]:view.parts[p.name],r=data.renderRect||data.sourceRect,pivot=data.pivot;
  const dx=spread*((p.x-160)/70),dy=spread*((p.y-210)/110);
  ctx.save();ctx.translate(p.x+dx,p.y+dy);ctx.rotate(p.angle);
  ctx.drawImage(p.name==='staff'?images.staff:images[d],...r,-p.w*pivot[0],-p.h*pivot[1],p.w,p.h);
  if(document.querySelector('#joints').checked){ctx.fillStyle='#ffdd80';ctx.beginPath();ctx.arc(0,0,2,0,Math.PI*2);ctx.fill();}ctx.restore();
 }
 ctx.restore();
}
