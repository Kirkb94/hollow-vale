/* Data-driven articulated creatures; purely visual, no gameplay mutation. */
(function(){
 'use strict';
 const supported=new Set(['quadruped','dragon','bird','imp','mechanical']);
 function draw(canvas,model,parts,dir,state,time,pose,single=false){
  const meta=model?.meta;if(!supported.has(meta?.skeleton))return false;
  const layout=meta.creature?.views?.[['e','se','sw','w','nw','ne'][dir]];if(!layout)return false;
  const ctx=canvas.getContext('2d'),group=single?1:meta.group||1,sign=[1,1,-1,-1,-1,1][dir];
  ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/320,canvas.height/240);
  function one(ox,oy,scale,phase){
   const t=time+phase,wave=Math.sin(t/105),fly=!['quadruped','mechanical'].includes(meta.skeleton),moving=state==='walk',attack=Math.max(0,pose.attack||pose.cast||pose.shoot||pose.thrust||0),flap=Math.sin(t/(attack?65:125));
   ctx.save();ctx.translate(160+ox,178+oy-pose.fall*24+(fly?Math.sin(t/240)*2:pose.bob)+(state==='hurt'?pose.bob:0));ctx.scale(scale,scale);ctx.rotate(sign*pose.fall*1.35+pose.bend);ctx.globalAlpha=pose.alpha;
   for(const n of layout.order){
    const spec=layout.parts[n],s=parts[meta.partOrder.indexOf(n)];if(!s||!spec)continue;
    let angle=spec.angle||0,x=spec.anchor[0],y=spec.anchor[1],sx=1,sy=1;
    if(spec.motion==='leg'){angle+=(moving?wave:0)*(spec.phase===1?-1:1)*(fly?.07:.25);angle+=fly?.18:0;}
    if(spec.motion==='wing'){angle+=flap*(spec.phase===1?-1:1)*(moving?.32:.2);sx=.86+Math.cos(t/125)*.14;}
    if(spec.motion==='tail')angle+=Math.sin(t/260)*.09;
    if(spec.motion==='head'){x+=sign*attack*8;y-=attack*4;angle-=sign*attack*.12;}
    if(spec.motion==='arm')angle-=sign*attack*1.1+(moving?wave*(spec.phase===1?-1:1)*.1:0);
    if(spec.motion==='weapon'){angle+=sign*(pose.thrust||0)*1.5;x+=sign*attack*10;}
    if(spec.motion==='wheel')angle+=(moving?t/150:0)*sign;
    if(spec.motion==='recoil')x-=sign*attack*14;
    if(spec.motion==='bolt'){x+=sign*attack*24;sy=attack>.65?0:1;}
    if(spec.motion==='flame'){sx=1+Math.sin(t/140)*.025;sy=1+Math.sin(t/110)*.04;}
    const [w,h]=spec.displaySize,[px,py]=spec.pivot||s.pivot||[.5,.1];
    ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.scale(sx*(spec.flipX?-1:1),sy);ctx.drawImage(s.image,s.x,s.y,s.w,s.h,-w*px,-h*py,w,h);ctx.restore();
   }
   ctx.restore();
  }
  if(group===3){one(-28,-14,.64,150);one(28,-14,.64,300);one(0,10,.72,0);}else one(0,0,meta.creature.scale||1,0);
  ctx.restore();return true;
 }
 window.HVCreatureRig={draw};
})();
