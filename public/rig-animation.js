/* Six-direction cutout animation. Gameplay state stays untouched: poses live in WeakMaps. */
(function () {
  'use strict';
  const directions = ['e','se','sw','w','nw','ne'];
  function direction(a,b,fallback=1) {
    const dx=b.x+(b.y&1)*.5-a.x-(a.y&1)*.5,dy=(b.y-a.y)*Math.sqrt(3)/2;
    return Math.abs(dx)+Math.abs(dy)<1e-6?fallback:(Math.round(Math.atan2(dy,dx)/(Math.PI/3))+6)%6;
  }
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const smooth=v=>{v=clamp(v,0,1);return v*v*(3-2*v);};
  function pose(state,time) {
    const t=Math.max(0,time),wave=Math.sin(t/85),p={bob:Math.sin(t/330)*.8,stride:0,arm:0,bend:0,cast:0,attack:0,shoot:0,thrust:0,fall:0,alpha:1};
    if(state==='walk'){p.stride=wave;p.arm=-wave*.35;p.bob=-Math.abs(Math.sin(t/85))*2;}
    if(state==='cast'){p.cast=t<250?smooth(t/250):t<500?1:1-smooth((t-500)/300);p.bend=-p.cast*.07;}
    if(state==='attack'){p.attack=t<230?-.28*smooth(t/230):t<420?-.28+1.28*smooth((t-230)/190):1-smooth((t-420)/380);p.bend=p.attack*.06;}
    if(state==='shoot'){p.shoot=t<300?smooth(t/300):t<420?1:1-smooth((t-420)/380);p.bend=-p.shoot*.035;}
    if(state==='thrust'){p.thrust=t<200?-.15*smooth(t/200):t<350?-.15+1.15*smooth((t-200)/150):1-smooth((t-350)/450);p.bend=p.thrust*.08;}
    if(state==='hurt'){p.bend=-Math.sin(clamp(t/450,0,1)*Math.PI)*.15;p.bob=1;}
    if(state==='death'){p.fall=smooth(t/800);p.alpha=1-smooth((t-750)/350);}
    if(state==='spawn'){p.alpha=smooth(t/400);p.bob=-8*(1-smooth(t/400));}
    return p;
  }
  if(typeof module!=='undefined'&&module.exports){module.exports={directions,direction,pose};return;}
  const root='art/rigs/',assets=new Map(),models=new Map(),facing=new WeakMap(),pending=new Map(),images=new Map(),groupCanvases=new WeakMap();
  const reduced=matchMedia('(prefers-reduced-motion: reduce)');
  const registry={
    mage:{folder:'infernal/mage',manifest:'manifest.json',attack:'cast',effects:'vfx.json'},
    knight:{folder:'kingdom/knight',manifest:'manifest.json',attack:'attack'},
    blade:{folder:'vamp',manifest:'blade-rig.json',attack:'attack'},
    necromancer:{folder:'undead',manifest:'necromancer.rig.json',attack:'cast'}
  };
  const failures={},loadStatus={};
  const lastUse=new Map();let usageTick=0;
  function prune(keep){
    if(assets.size<=24)return;
    const protectedKeys=new Set([keep,document.querySelector('#character')?.value]);
    if(typeof S!=='undefined'&&S&&!document.getElementById('game')?.hidden)for(const u of [...(S.units||[]),...(S.ghosts||[])]){protectedKeys.add(u.k);protectedKeys.add(displayKey(u.k,u));}
    for(const el of portraits)if(el.isConnected&&portraitVisibility.get(el))protectedKeys.add(el.dataset.rigKey);
    let removed=false;
    for(const key of [...assets.keys()].sort((a,b)=>(lastUse.get(a)||0)-(lastUse.get(b)||0))){
      if(assets.size<=24)break;if(protectedKeys.has(key))continue;
      assets.delete(key);models.delete(key);pending.delete(key);lastUse.delete(key);loadStatus[key]='unloaded';removed=true;
      window.dispatchEvent(new CustomEvent('hv-rig-evicted',{detail:{key}}));
    }
    if(removed)images.clear();
  }
  const partNames=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot'];
  let items=[],ground=[],last=0,clock=0,fx=[];
  const portraits=new Set(),portraitVisibility=new WeakMap();
  const portraitObserver=new IntersectionObserver(entries=>{for(const entry of entries){portraitVisibility.set(entry.target,entry.isIntersecting);if(entry.isIntersecting)ensure(entry.target.dataset.rigKey);}},{rootMargin:'120px'});
  function scanPortraits(node){
    const list=node.matches?.('.hv-rig-portrait')?[node]:[...(node.querySelectorAll?.('.hv-rig-portrait')||[])];
    for(const el of list)if(!portraits.has(el)){portraits.add(el);portraitObserver.observe(el);}
  }
  function image(url){if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const i=new Image();i.onload=()=>resolve(i);i.onerror=()=>{images.delete(url);reject(new Error('Missing rig asset: '+url));};i.src=url;}));return images.get(url);}
  // Extract each disconnected piece at runtime; preserve source atlases unchanged on disk.
  function pieces(im){
    const c=document.createElement('canvas');c.width=im.width;c.height=im.height;
    const ctx=c.getContext('2d',{willReadFrequently:true});ctx.drawImage(im,0,0);
    const data=ctx.getImageData(0,0,c.width,c.height).data,out=[];
    for(let n=0;n<12;n++){
      const x0=Math.round(n%3*c.width/3),x1=Math.round((n%3+1)*c.width/3),y0=Math.round(Math.floor(n/3)*c.height/4),y1=Math.round((Math.floor(n/3)+1)*c.height/4);
      let l=x1,r=x0,t=y1,b=y0,best=0;
      const cw=x1-x0,ch=y1-y0,visited=new Uint8Array(cw*ch),queue=new Int32Array(cw*ch);
      // Generators may leave tiny neighboring slivers at cell edges. Use the main component only.
      for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){
        const start=(y-y0)*cw+x-x0;if(visited[start]||data[(y*c.width+x)*4+3]<=64)continue;
        let head=0,tail=1,cl=x,cr=x,ct=y,cb=y;queue[0]=start;visited[start]=1;
        while(head<tail){const at=queue[head++],px=at%cw,py=Math.floor(at/cw);cl=Math.min(cl,px+x0);cr=Math.max(cr,px+x0);ct=Math.min(ct,py+y0);cb=Math.max(cb,py+y0);
          for(const [nx,ny]of [[px-1,py],[px+1,py],[px,py-1],[px,py+1]]){if(nx<0||ny<0||nx>=cw||ny>=ch)continue;const ni=ny*cw+nx;if(!visited[ni]&&data[((ny+y0)*c.width+nx+x0)*4+3]>64){visited[ni]=1;queue[tail++]=ni;}}
        }
        if(tail>best){best=tail;l=cl;r=cr;t=ct;b=cb;}
      }
      if(r<l||b<t)throw new Error('Empty cutout cell '+n);
      out.push({image:im,x:l,y:t,w:r-l+1,h:b-t+1});
    }
    return out;
  }
  async function json(url){const r=await fetch(url);if(!r.ok)throw new Error('Missing rig metadata: '+url);return r.json();}
  function source(im,rect,extra={}){
    if(!Array.isArray(rect)||rect.length!==4||rect.some(v=>!Number.isFinite(v))||rect[0]<0||rect[1]<0||rect[2]<=0||rect[3]<=0||rect[0]+rect[2]>im.width||rect[1]+rect[3]>im.height)throw new Error('Invalid rig source rectangle');
    return Object.assign({image:im,x:rect[0],y:rect[1],w:rect[2],h:rect[3]},extra);
  }
  function isolate(s){
    const canvas=document.createElement('canvas');canvas.width=Math.ceil(s.w);canvas.height=Math.ceil(s.h);
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(s.image,s.x,s.y,s.w,s.h,0,0,canvas.width,canvas.height);
    const pixels=ctx.getImageData(0,0,canvas.width,canvas.height),w=canvas.width,h=canvas.height,seen=new Uint8Array(w*h),queue=new Int32Array(w*h);let best=[];
    for(let start=0;start<seen.length;start++){
      if(seen[start]||pixels.data[start*4+3]<=32)continue;
      let head=0,tail=1;queue[0]=start;seen[start]=1;
      while(head<tail){const at=queue[head++],x=at%w,y=Math.floor(at/w);
        for(const[nx,ny]of [[x-1,y],[x+1,y],[x,y-1],[x,y+1]]){if(nx<0||ny<0||nx>=w||ny>=h)continue;const n=ny*w+nx;if(!seen[n]&&pixels.data[n*4+3]>32){seen[n]=1;queue[tail++]=n;}}
      }
      if(tail>best.length)best=queue.slice(0,tail);
    }
    if(!best.length)throw Error('Empty isolated rig piece');
    let l=w,r=0,t=h,b=0;for(const i of best){const x=i%w,y=Math.floor(i/w);l=Math.min(l,x);r=Math.max(r,x);t=Math.min(t,y);b=Math.max(b,y);}
    const out=document.createElement('canvas');out.width=r-l+1;out.height=b-t+1;const oc=out.getContext('2d'),clean=oc.createImageData(out.width,out.height);
    for(const i of best){const target=((Math.floor(i/w)-t)*out.width+i%w-l)*4;clean.data.set(pixels.data.subarray(i*4,i*4+4),target);}
    oc.putImageData(clean,0,0);return Object.assign({},s,{image:out,x:0,y:0,w:out.width,h:out.height});
  }
  async function load(k,config){
    loadStatus[k]='loading';delete failures[k];
    try{
      const base=root+config.folder+'/',meta=config.manifest?await json(base+config.manifest):null;
      const assetImage=file=>image(base+file+(config.revision?'?v='+encodeURIComponent(config.revision):''));
      const explicit=meta?.sourceRects?await json(base+meta.sourceRects):null;
      const sheets=await Promise.all(directions.map(d=>assetImage(meta?.views?.[d]?.file||meta?.atlases?.[d]||d+'.png')));
      const body=await Promise.all(sheets.map(async(im,i)=>{
        const d=directions[i];
        if(meta?.views?.[d]?.parts)return Promise.all((['bat','wisp','quadruped','dragon','bird','imp','mechanical'].includes(meta.skeleton)?meta.partOrder:partNames).map(async name=>{const p=meta.views[d].parts[name],s=source(p.file?await assetImage(p.file):im,p.renderRect||p.sourceRect,{pivot:p.pivot,flipX:!!p.flipX,displaySize:p.displaySize});return p.isolate?isolate(s):s;}));
        if(explicit?.rects?.[d])return explicit.rects[d].map((rect,n)=>source(im,rect,{pivot:meta.parts[n]?.pivot}));
        return pieces(im);
      }));
      const equipment=directions.map(()=>[]),add=(di,im,rect,pivot,name,hand,w,h,extra={})=>equipment[di].push(Object.assign(source(im,rect),{pivot:pivot||[.5,.85],name,hand,dw:w,dh:h,rotation:extra.rotation||0,offset:extra.offset||[0,0],motion:extra.motion,phase:extra.phase||0}));
      // Kingdom packs all directional weapons in one atlas; Undead has one directional staff atlas.
      if(meta?.equipment?.file&&meta.equipment.views){
        const im=await assetImage(meta.equipment.file);
        directions.forEach((d,di)=>Object.entries(meta.equipment.views[d]).forEach(([name,p])=>add(di,im,p.renderRect||p.sourceRect,p.pivot,name,p.hand||(name==='shield'?'left':'right'),p.displaySize?.[0]||(name==='shield'?35:19),p.displaySize?.[1]||(name==='shield'?48:56),p)));
      }else if(meta?.equipment){
        await Promise.all(Object.entries(meta.equipment).map(async([name,eq])=>{
          if(!eq.file||!eq.views)return;const im=await assetImage(eq.file);
          directions.forEach((d,di)=>{const p=eq.views[d];add(di,im,p.renderRect||p.sourceRect,p.pivot||eq.grip,name,/left/i.test(eq.attachTo)?'left':'right',name==='staff'?20:22,name==='staff'?88:68);});
        }));
      }
      if(meta?.weapons)await Promise.all(meta.weapons.map(async eq=>{
        const im=await assetImage(eq.file),rect=explicit?.[eq.id]||[0,0,im.width,im.height];
        directions.forEach((d,di)=>add(di,im,rect,eq.pivot,eq.id,eq.grip||'right',18,58));
      }));
      const extras=await Promise.all(directions.map(async d=>Promise.all(Object.entries(meta?.extras?.views?.[d]||{}).map(async([name,p])=>{
        const im=await assetImage(p.file||meta.extras.file);return Object.assign(source(im,p.renderRect||p.sourceRect),p,{name});
      }))));
      models.set(k,{meta,equipment,extras});assets.set(k,body);loadStatus[k]='ready';
      lastUse.set(k,++usageTick);prune(k);
      if(meta?.attack)config.attack=meta.attack;
      for(const[state,v]of Object.entries(meta?.variants||{}))registry[k+'_'+state]=Object.assign({},v,{folder:config.folder+'/'+v.folder,revision:config.revision});
      window.dispatchEvent(new CustomEvent('hv-rig-ready',{detail:{key:k,config}}));
      if(typeof render==='function'&&typeof S!=='undefined'&&S)render();return true;
    }catch(e){failures[k]=e.message;loadStatus[k]='failed';console.warn('Hollow Vale rig fallback:',k,e.message);return false;}
  }
  function ensure(k){
    if(assets.has(k))return Promise.resolve(true);
    if(!registry[k])return Promise.resolve(false);
    if(!pending.has(k))pending.set(k,load(k,registry[k]));
    return pending.get(k);
  }
  function displayKey(k,u){if(u?.shape?.kind==='mim'&&registry[u.shape.look])return u.shape.look;return u?.bat&&registry[k+'_bat']?k+'_bat':k;}
  function part(ctx,a,n,x,y,w,h,angle=0,px=.5,py=.08){
    const s=a[n];if(s.displaySize){w=s.displaySize[0];h=s.displaySize[1];}ctx.save();ctx.translate(x,y);ctx.rotate(angle);if(s.flipX)ctx.scale(-1,1);ctx.drawImage(s.image,s.x,s.y,s.w,s.h,-w*px,-h*py,w,h);ctx.restore();
  }
  function draw(canvas,k,dir,state,t,single=false){
    const all=assets.get(k);if(!all)return;
    lastUse.set(k,++usageTick);
    if(window.HVCreatureRig?.draw(canvas,models.get(k),all[clamp(Math.floor(dir),0,5)],dir,state,reduced.matches?0:t,pose(state,reduced.matches?0:t),single))return;
    if(models.get(k)?.meta?.skeleton==='wisp'){
      const a=all[clamp(Math.floor(dir),0,5)],ctx=canvas.getContext('2d'),p=pose(state,reduced.matches?0:t),sway=reduced.matches?0:Math.sin(t/240)*.16;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/320,canvas.height/240);ctx.translate(160,146+p.bob);ctx.globalAlpha=p.alpha;ctx.rotate(p.fall*1.2);
      part(ctx,a,2,-10,-2,29,64,sway,.5,.05);part(ctx,a,3,12,-2,25,58,-sway,.5,.05);
      part(ctx,a,0,0,-35,56,72,0,.5,.5);part(ctx,a,1,[1,1,-1,-1,-1,1][dir]*5,-29,24,26,0,.5,.5);ctx.restore();return;
    }
    if(models.get(k)?.meta?.skeleton==='bat'&&(single||(models.get(k).meta.group||(typeof H!=='undefined'?H[k]?.group:1)||1)===1)){
      const a=all[clamp(Math.floor(dir),0,5)],ctx=canvas.getContext('2d'),p=pose(state,reduced.matches?0:t),flap=reduced.matches?0:Math.sin(t/(state==='attack'?65:110))*.45;
      ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/320,canvas.height/240);ctx.translate(160,158+p.bob);ctx.globalAlpha=p.alpha;ctx.rotate(p.fall*1.3);
      part(ctx,a,2,-8,-30,70,75,-flap,.9,.22);part(ctx,a,3,8,-30,70,75,flap,.1,.22);
      const layout=models.get(k)?.meta?.batLayout||{},body=layout.body||{},head=layout.head||{},sign=[1,1,-1,-1,-1,1][dir];
      const drawHead=()=>part(ctx,a,1,sign*(head.position?.[0]??5),head.position?.[1]??-40,head.size?.[0]??28,head.size?.[1]??29,0,.5,.5),behind=layout.headBehindRear&&dir>=4;
      if(behind)drawHead();part(ctx,a,0,body.position?.[0]??0,body.position?.[1]??-30,body.size?.[0]??30,body.size?.[1]??55,0,.5,body.pivot?.[1]??.1);if(!behind)drawHead();ctx.restore();return;
    }
    const group=models.get(k)?.meta?.group||(typeof H!=='undefined'?H[k]?.group:1)||1;
    if(group>1&&!single){
      let temp=groupCanvases.get(canvas);if(!temp){temp=document.createElement('canvas');temp.width=320;temp.height=240;groupCanvases.set(canvas,temp);}
      const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/320,canvas.height/240);
      const spots=[[130,178],[190,178],[160,210]];
      for(let i=0;i<Math.min(3,group);i++){draw(temp,k,dir,state,t+((state==='idle'||state==='walk')?i*70:0),true);ctx.drawImage(temp,spots[i][0]-160*.65,spots[i][1]-198*.65,320*.65,240*.65);}
      ctx.restore();return;
    }
    dir=clamp(Math.floor(dir),0,5);
    const model=models.get(k),a=all[dir],ctx=canvas.getContext('2d'),p=pose(state,reduced.matches?0:t),equipment=model?.equipment[dir]||[];
    if(model?.meta?.locomotion==='hover'){p.stride=0;p.arm=0;if(!reduced.matches)p.bob+=Math.sin(t/240)*3-6;}
    const back=dir===4||dir===5,side=dir===0||dir===3,sign=[1,1,-1,-1,-1,1][dir];
    const width=side?.72:1,nearLeft=dir===2||dir===3||dir===4;
    // Forty pixels of side padding and twenty above/below keep full swings and falls inside the bitmap.
    ctx.clearRect(0,0,canvas.width,canvas.height);ctx.save();ctx.scale(canvas.width/320,canvas.height/240);
    ctx.translate(160,198+p.bob);ctx.globalAlpha=p.alpha;
    ctx.translate(-sign*30*p.fall,0);ctx.scale(1-.35*p.fall,1-.35*p.fall);
    ctx.rotate(p.fall*sign*1.38);ctx.translate(0,-p.fall*10);ctx.rotate(p.bend*sign);
    function extra(layer){for(const s of model?.extras?.[dir]||[]){if((s.layer||'behind')!==layer)continue;
      const anchor=s.anchor||[80,120],size=s.displaySize||[50,50],pivot=s.pivot||[.5,.5];
      const motion=reduced.matches?0:s.motion==='wing'?Math.sin(t/210)*(state==='walk'?.35:.12)*(s.name.toLowerCase().includes('left')?-1:1):s.motion==='leg'?p.stride*.24*(s.phase===1?-1:1):0;
      ctx.save();ctx.translate(anchor[0]-80,anchor[1]-178);ctx.rotate((s.rotation||0)+motion);if(s.flipX)ctx.scale(-1,1);ctx.drawImage(s.image,s.x,s.y,s.w,s.h,-size[0]*pivot[0],-size[1]*pivot[1],size[0],size[1]);ctx.restore();
    }}
    extra('behind');ctx.save();
    if(model?.meta?.bodyOffset)ctx.translate(...model.meta.bodyOffset);
    if(model?.meta?.bodyScale){const bs=model.meta.bodyScale;ctx.scale(...(Array.isArray(bs)?bs:[bs,bs]));}
    const anatomy=back?-1:1,lx=10*width*anatomy,rx=-10*width*anatomy,held=[];
    function leg(left){const n=left?8:9,x=left?lx:rx,s=p.stride*(left?1:-1);
      if(model?.meta?.mounted){const piece=a[n];ctx.save();ctx.translate(x,-49);ctx.rotate(-sign*.75+s*.04);
        ctx.drawImage(piece.image,piece.x,piece.y,piece.w,piece.h/2,-8,0,16,18);ctx.translate(0,17);ctx.rotate(sign*.9);
        ctx.drawImage(piece.image,piece.x,piece.y+piece.h/2,piece.w,piece.h/2,-8,0,16,18);part(ctx,a,left?10:11,0,18,23,18,0,.5,.15);ctx.restore();return;
      }
      part(ctx,a,n,x,-44,17,32,s*.22);part(ctx,a,left?10:11,x+s*8,-14-Math.max(0,s)*5,23,20,s*.15);}
    function arm(left){const far=left!==nearLeft,x=(left?1:-1)*anatomy*19*width;
      const swing=p.arm*(left?1:-1),cast=far?p.cast*.45:p.cast;
      const firearm=equipment.some(e=>e.name==='gun'||e.name==='pistol');
      const shootAngle=firearm?(left?1.15:1.25):(left?1.4:.65);
      const attack=left?p.attack*.2:p.attack,angle=swing-sign*cast*1.35-sign*attack*1.65-sign*p.shoot*shootAngle-sign*p.thrust*(left?.3:1.5);
      ctx.save();ctx.translate(x,-119);ctx.rotate(angle);part(ctx,a,left?4:5,0,0,20,33);ctx.translate(0,27);ctx.rotate(-sign*(cast*.35+attack*.35));part(ctx,a,left?6:7,0,0,18,35);
      for(const eq of equipment)if(eq.hand===(left?'left':'right')){
        if(eq.name==='arrow'&&state==='shoot'&&t>330&&t<650)continue;
        ctx.save();ctx.translate(eq.offset?.[0]||0,27+(eq.offset?.[1]||0));ctx.rotate((eq.rotation||0)+(eq.motion==='wing'&&!reduced.matches?Math.sin(t/180+eq.phase)*.25:0));
        if(['sword','mace','hammer','axe','dagger'].includes(eq.name))ctx.rotate(sign*(-.2+p.attack*3.2));
        if(['spear','lance'].includes(eq.name))ctx.rotate(sign*p.thrust*(Math.PI/2+1.5));
        if(eq.name==='staff')ctx.rotate(sign*cast*1.7);
        if(eq.name==='bow')ctx.rotate(sign*p.shoot*(left?1.4:.65));
        if(eq.name==='arrow')ctx.rotate(sign*p.shoot*(Math.PI/2+.65));
        if(['gun','pistol'].includes(eq.name))ctx.rotate(sign*p.shoot*(Math.PI/2+shootAngle));
        held.push({eq,matrix:ctx.getTransform()});
        ctx.restore();
      }
      ctx.restore();}
    part(ctx,a,2,0,-131,70*width,116,p.stride*.035,.5,.02);
    for(const eq of equipment)if(eq.hand==='back'){ctx.save();ctx.translate(-sign*12,-124);ctx.rotate(-sign*.2);ctx.drawImage(eq.image,eq.x,eq.y,eq.w,eq.h,-eq.pivot[0]*eq.dw,-eq.pivot[1]*eq.dh,eq.dw,eq.dh);ctx.restore();}
    leg(!nearLeft);if(back)arm(!nearLeft);leg(nearLeft);
    part(ctx,a,3,0,-88,65*width,73,p.stride*.035,.5,.02);
    part(ctx,a,1,0,-127,52*width,55,0,.5,.02);
    if(back)part(ctx,a,2,0,-131,65*width,105,p.stride*.025,.5,.02);
    if(!back)arm(!nearLeft);arm(nearLeft);
    for(const{eq,matrix}of held){ctx.save();ctx.setTransform(matrix);ctx.drawImage(eq.image,eq.x,eq.y,eq.w,eq.h,-eq.pivot[0]*eq.dw,-eq.pivot[1]*eq.dh,eq.dw,eq.dh);ctx.restore();}
    part(ctx,a,0,sign*(side?4:2),-158,41*(side?.85:1),44,p.cast*sign*.035,.5,.05);
    ctx.restore();extra('front');
    ctx.restore();
  }
  function frame(now){
    const paused=document.body.classList.contains('hv-paused');
    if(!paused&&!document.hidden)clock+=Math.min(80,now-(last||now));last=now;
    if(!paused&&!document.hidden){
      for(const item of items){const {canvas,u,k}=item;if(!canvas.isConnected)continue;let dir=facing.get(u)??(u.side==='p'?1:4),state='idle',t=clock;
        const walk=window.hvWalk&&hvWalk.get(u);
        if(walk){const step=clamp(Math.floor((now-(walk.t0||now))/walk.dur*walk.n),0,walk.n-1);dir=direction(walk.p[step],walk.p[step+1],dir);facing.set(u,dir);state='walk';t=now-(walk.t0||now);}
        const f=u.fx,elapsed=f?now-f.t:-1;
        if(elapsed>=0){const map={atk:[registry[k]?.attack||'cast',800],hurt:['hurt',450],dead:['death',1100],spawn:['spawn',600],undying:['spawn',1700]};const def=map[f.n];if(def&&elapsed<def[1]){state=def[0];t=elapsed;if(f.n==='undying')t=Math.max(0,elapsed-850);}}
        draw(canvas,k,dir,state,t);
      }
      renderEffects(now);
      for(const el of portraits){
        if(!el.isConnected){portraits.delete(el);portraitObserver.unobserve(el);continue;}
        if(!portraitVisibility.get(el)||!assets.has(el.dataset.rigKey))continue;
        el.classList.add('ready');draw(el.querySelector('canvas'),el.dataset.rigKey,1,'idle',clock);
      }
      if(flame)for(const c of ground){if(!c.isConnected)continue;const cell=c.closest('.cell');c.style.visibility=cell?.classList.contains('fogw')?'hidden':'';const ctx=c.getContext('2d'),col=reduced.matches?0:Math.floor(clock/90)%8;ctx.clearRect(0,0,128,128);ctx.drawImage(flame,col*flame.width/8,flame.height*2/3,flame.width/8,flame.height/3,0,0,128,128);}
    }
    requestAnimationFrame(frame);
  }
  function bind(){
    if(typeof S==='undefined'||!S)return;items=[];ground=[];
    document.querySelectorAll('#board canvas.hv-rig').forEach(canvas=>{const cell=canvas.closest('.cell'),x=+cell.dataset.x,y=+cell.dataset.y;
      const u=(S.units||[]).find(u=>u.x===x&&u.y===y)||(S.ghosts||[]).find(u=>u.x===x&&u.y===y);
      if(u)items.push({canvas,u,k:canvas.dataset.rigKey||u.k});
    });
    if(flame)document.querySelectorAll('#board .hvm-fire').forEach(el=>{if(el.tagName.toLowerCase()!=='canvas'){const c=document.createElement('canvas');c.width=c.height=128;c.className='hvm hvm-fire hv-rig-ground';el.replaceWith(c);ground.push(c);}else ground.push(el);});
  }
  let flame=null;
  image(root+'infernal/fire-effects.png').then(im=>{flame=im;bind();}).catch(()=>{});
  function renderEffects(now){
    fx=fx.filter(f=>{if(!f.canvas.isConnected||f.match!==S||now-f.t>1050){f.canvas.remove();return false;}
      const dt=now-f.t;if(dt<0)return true;
      const v=typeof FOGV==='function'?FOGV():null;
      const toVisible=!v||seesCell(v,f.to.x,f.to.y),fromVisible=!v||seesCell(v,f.from.x,f.from.y);
      // Never draw a projectile across unrevealed terrain; impact requires visible destination.
      const travel=dt<300,show=travel?(fromVisible&&toVisible):toVisible;
      f.canvas.style.visibility=show?'visible':'hidden';if(!show)return true;
      const a=cpx(f.from),b=cpx(f.to),p=travel?dt/300:1;
      f.canvas.style.left=(a[0]+(b[0]-a[0])*p)+'px';f.canvas.style.top=(a[1]+(b[1]-a[1])*p)+'px';
      f.canvas.style.rotate=travel?Math.atan2(b[1]-a[1],b[0]-a[0])+'rad':'0rad';
      const ctx=f.canvas.getContext('2d'),col=travel?Math.floor(dt/45)%8:Math.min(7,Math.floor((dt-300)/90)),row=travel?0:1;
      ctx.clearRect(0,0,128,128);ctx.drawImage(flame,col*flame.width/8,row*flame.height/3,flame.width/8,flame.height/3,0,0,128,128);return true;
    });
  }
  function launch(u,t){if(!flame||reduced.matches)return false;const layer=document.getElementById('fxl');if(!layer)return false;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.className='hv-rig-fire';layer.appendChild(canvas);
    fx.push({canvas,from:{x:u.x,y:u.y},to:{x:t.x,y:t.y},t:performance.now()+340,match:S});return true;}
  const css=document.createElement('style');css.textContent=`
    html body #board .cell .u:has(>canvas.hv-rig){animation:none!important}
    html body #board .cell .u>canvas.hv-rig{width:3.9em;height:3.18em;margin:-.815em -1.325em -.265em;animation:none!important;object-fit:contain;pointer-events:none}
    .hv-rig-fire{position:absolute;width:90px;height:90px;translate:-50% -50%;pointer-events:none}
    #board .hv-rig-ground{animation:none!important;pointer-events:none}
    .hv-rig-portrait{display:inline-block;position:relative;vertical-align:middle}
    .hv-rig-portrait>canvas{position:absolute;left:-43.333%;top:-20%;width:186.667%;height:140%;pointer-events:none;visibility:hidden}
    .hv-rig-portrait.ready>canvas{visibility:visible}
    .hv-rig-portrait.ready>:not(canvas){visibility:hidden}
  `;document.head.appendChild(css);
  if(typeof spr==='function'){
    const oldSpr=spr;spr=function(k,s,u){const visual=displayKey(k,u);if(u&&assets.has(visual))return `<canvas class="sp pt hv-rig" data-rig-key="${visual}" width="320" height="240" aria-hidden="true"></canvas>`;if(u&&registry[visual]&&!pending.has(visual))ensure(visual);const original=oldSpr.apply(this,arguments);if(!u&&registry[k])return `<span class="hv-rig-portrait" data-rig-key="${k}">${original}<canvas width="240" height="240" aria-hidden="true"></canvas></span>`;return original;};
    const oldRender=render;render=function(){const result=oldRender.apply(this,arguments);bind();return result;};
    const oldAct=act;act=function(u,t){if(u&&t&&assets.has(u.k))facing.set(u,direction(u,t,facing.get(u)??1));return oldAct.apply(this,arguments);};
    const oldAtk=atkFx;atkFx=function(u,t){if(u.k==='mage'&&assets.has('mage')&&!RP&&!RUNFAST&&launch(u,t))return;return oldAtk.apply(this,arguments);};
  }
  function drawParts(canvas,k,dir){const a=assets.get(k)?.[dir];if(!a)return;const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);a.forEach((s,i)=>{const cw=canvas.width/3,ch=canvas.height/4,scale=Math.min((cw-10)/s.w,(ch-10)/s.h);ctx.drawImage(s.image,s.x,s.y,s.w,s.h,(i%3+.5)*cw-s.w*scale/2,(Math.floor(i/3)+.5)*ch-s.h*scale/2,s.w*scale,s.h*scale);});}
  window.HVRig={directions,direction,pose,draw,drawParts,assets,models,registry,load,ensure,bind,failures,loadStatus,face:(u,d)=>facing.set(u,d),register(k,config){registry[k]=config;pending.delete(k);return ensure(k);}};
  const initial=Object.keys(registry);
  HVRig.ready=Promise.all([json(root+'catalog.json').then(c=>{for(const[k,v]of Object.entries(c.units||{}))if(!registry[k])registry[k]=v;}).catch(e=>{failures.catalog=e.message;console.warn(e.message);}),...initial.map(async k=>({unit:k,ok:await ensure(k)}))]).then(results=>{bind();if(typeof render==='function'&&typeof S!=='undefined'&&S)render();return results.slice(1);});
  new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scanPortraits(n);}).observe(document.body,{childList:true,subtree:true});
  scanPortraits(document);
  requestAnimationFrame(frame);
})();
