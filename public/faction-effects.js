/* Optional presentation layer. No combat or network state is changed here. */
(() => {
  'use strict';
  const definitions = {
    knight: 'art/rigs/kingdom/knight/vfx.json',
    blade: 'art/rigs/vamp/blade-vfx.json',
    necromancer: 'art/rigs/undead/necromancer-fx.json'
  };
  const assets = new Map(), pending = new Map(), errors = {}, reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let effects = [], raf = 0, last = 0;
  const game = () => typeof S !== 'undefined' ? S : null;
  const point = o => ({x:o.x,y:o.y});
  const disabled = () => reduced.matches || (typeof RP !== 'undefined' && RP) || (typeof RUNFAST !== 'undefined' && RUNFAST);
  const inGame = () => !!game() && !document.getElementById('game')?.hidden;
  function visible(o, unit) {
    if (!o || !game()) return false;
    const viewer = typeof FOGV === 'function' ? FOGV() : null;
    if (!viewer) return true;
    if (unit && typeof visU === 'function') return visU(unit);
    return typeof seesCell === 'function' && seesCell(viewer,o.x,o.y);
  }
  function loadImage(url) {
    return new Promise((resolve,reject) => {const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(Error('Image failed: '+url));im.src=url;});
  }
  // Share the new pixel atlas while retaining each unit's event bindings,
  // durations, anchors and fog-of-war checks from its existing manifest.
  let pixelAtlas;
  function effectFamily(key,name,faction){
    const n=name.toLowerCase();
    if(/heal|restore|renew|revive|regener/.test(n))return 2;
    if(/shield|ward|block|armor|protect|mitigat/.test(n))return 11;
    if(/frost|snow|ice|freeze|blizzard/.test(n))return 1;
    if(/poison|plague|necrot|deathbolt|soul|bone|raise|ossuary/.test(n))return 3;
    if(/lightning|thunder|shock|electric/.test(n))return 4;
    if(/blood|drain|vamp|mist|bat/.test(n))return 9;
    if(/root|leaf|vine|grove|nature|wild/.test(n))return 8;
    if(/holy|sun|radiance|bless|rally|banner/.test(n))return 10;
    if(/fire|flame|ember|lava|burn|cinder|inferno|explosion/.test(n))return 0;
    if(/slash|spark|steel|arrow|bullet|pierce|lance|sword|cleave/.test(n))return 6;
    if(/dust|stone|quake|stomp|crack|shatter|siege|rubble/.test(n))return 7;
    if(/rune|arcane|void|portal|teleport|mirror|time|mana|hex|spell/.test(n))return 5;
    if(key==='witch')return 1;if(key==='storm'||key==='thunderking')return 4;
    return {kingdom:10,vamp:9,undead:3,infernal:0,wilds:8,iron:6,arcane:5,raidboss:3}[faction]??5;
  }
  function pixelManifest(key,m,im){
    const faction=(window.HVRig?.registry[key]?.folder||m.faction||'').split('/')[0],clips={};
    for(const [name,c]of Object.entries(m.clips||{})){
      const count=Array.isArray(c.frames)?c.frames.length:c.frames;
      const duration=c.durationMs||count/(c.fps||8)*1000;
      const family=effectFamily(key,name,faction),order=c.loop?[0,1,2,1]:[0,1,2,3];
      clips[name]={...c,frames:order,sourceRects:order.map(frame=>{const col=(family%2)*4+frame,row=Math.floor(family/2);return [col*im.width/8,row*im.height/6,im.width/8,im.height/6];}),durationMs:duration,fps:4/(duration/1000)};
    }
    return {...m,columns:8,rows:6,clips};
  }
  function normalize(manifest, im) {
    const cols=manifest.columns||manifest.grid?.columns, rows=manifest.rows||manifest.grid?.rows, clips={};
    if (!(cols>0 && rows>0)) throw Error('Invalid VFX grid');
    for (const [name,c] of Object.entries(manifest.clips||{})) {
      const count=Array.isArray(c.frames)?c.frames.length:c.frames;
      if (!(count>0)) throw Error('Empty VFX clip '+name);
      const rects=c.sourceRects || (Array.isArray(c.frames?.[0])?c.frames:(Array.isArray(c.frames)?c.frames:Array.from({length:count},(_,i)=>i)).map(n=>{
        const x=Math.round(n*im.width/cols),y=Math.round(c.row*im.height/rows);
        return [x,y,Math.round((n+1)*im.width/cols)-x,Math.round((c.row+1)*im.height/rows)-y];
      }));
      if (rects.some(r=>r.length!==4||r.some(v=>!Number.isFinite(v))||r[2]<=0||r[3]<=0||r[0]<0||r[1]<0||r[0]+r[2]>im.width||r[1]+r[3]>im.height)) throw Error('Invalid source rectangle '+name);
      const fps=c.fps || count/(c.durationMs/1000||.5);
      clips[name]={rects,fps,loop:!!c.loop,duration:c.durationMs||count/fps*1000,anchor:c.anchor||c.pivot||[.5,.5],size:c.sizeInHexes||1,rotation:c.rotation||0};
    }
    return {image:im,clips,bindings:manifest.bindings||{},delayedEvents:manifest.delayedEvents||{},statusEvents:manifest.statusEvents||{}};
  }
  function load(key,url){if(pending.has(key))return pending.get(key);const task=(async()=>{
    try {const response=await fetch(url);if(!response.ok)throw Error('Manifest HTTP '+response.status);const m=await response.json();const im=await(pixelAtlas||(pixelAtlas=loadImage('art/effects-pocket-chibi.png')));assets.set(key,normalize(pixelManifest(key,m,im),im));return key;}
    catch(e){errors[key]=e.message;console.warn('Faction VFX fallback ('+key+'):',e.message);return null;}
  })();pending.set(key,task);return task;}
  const ready=Promise.all(Object.entries(definitions).map(([key,url])=>load(key,url)));
  window.addEventListener('hv-rig-ready',event=>{const {key,config}=event.detail,url=config.effects?'art/rigs/'+config.folder+'/'+config.effects+(config.revision?'?v='+encodeURIComponent(config.revision):''):definitions[key];if(url)load(key,url);});
  window.addEventListener('hv-rig-evicted',event=>{assets.delete(event.detail.key);pending.delete(event.detail.key);});
  function clear(){effects.forEach(e=>e.canvas.remove());effects=[];if(raf)cancelAnimationFrame(raf);raf=0;last=0;}
  function projectileKind(key,name=''){
    if(['bowmen','archer','lookout','trapper','falconer'].includes(key)||/arrow/i.test(name))return 'arrow';
    if(['ballista','cagewright'].includes(key))return 'bolt';
    if(['gunner','spotter'].includes(key))return 'bullet';
    if(['sapper','bomber','warengine'].includes(key))return 'bomb';
    return null;
  }
  function drawProjectile(ctx,kind){
    ctx.save();ctx.scale(6,6);
    if(kind==='bomb'){
      ctx.fillStyle='#182630';ctx.fillRect(10,10,14,13);ctx.fillRect(13,7,8,3);
      ctx.fillStyle='#647b86';ctx.fillRect(12,12,9,8);ctx.fillStyle='#f0c76b';ctx.fillRect(18,5,3,5);ctx.fillStyle='#ffe6a0';ctx.fillRect(21,3,3,3);
    }else if(kind==='bullet'){
      ctx.fillStyle='#563d26';ctx.fillRect(9,13,16,6);ctx.fillStyle='#f0c76b';ctx.fillRect(10,14,16,4);ctx.fillStyle='#fff1c9';ctx.fillRect(25,15,3,2);
    }else{
      const heavy=kind==='bolt'||kind==='lance';
      ctx.fillStyle='#172a30';ctx.fillRect(3,14,23,4);
      ctx.fillStyle=heavy?'#8295a1':'#bb884d';ctx.fillRect(3,15,23,2);
      ctx.fillStyle='#172a30';ctx.fillRect(24,10,2,12);ctx.fillRect(26,12,2,8);ctx.fillRect(28,14,3,4);
      ctx.fillStyle='#d9edf0';ctx.fillRect(24,12,2,8);ctx.fillRect(26,14,3,4);
      if(kind!=='lance'){ctx.fillStyle='#f6e6be';ctx.fillRect(3,11,3,3);ctx.fillRect(6,13,3,2);ctx.fillRect(3,18,3,3);ctx.fillRect(6,17,3,2);}
    }
    ctx.restore();
  }
  function add(key,clip,from,to,options={}) {
    const pack=assets.get(key),c=pack?.clips[clip],layer=document.getElementById('fxl');
    if (!c||!layer||disabled()||!inGame()) return false;
    if (!visible(from,options.sourceUnit)||!visible(to,options.targetUnit)) return false;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=192;
    canvas.getContext('2d').imageSmoothingEnabled=false;
    canvas.className='hv-faction-fx';canvas.setAttribute('aria-hidden','true');canvas.style.visibility='hidden';layer.appendChild(canvas);
    effects.push({canvas,pack,clip:c,key,name:clip,from:point(from),to:point(to),sourceUnit:options.sourceUnit,targetUnit:options.targetUnit,owner:options.owner,match:game(),start:performance.now()+(options.delay||0),duration:options.owner?Infinity:(options.duration||c.duration),loopPeriod:options.duration||c.duration,loop:!!options.owner||c.loop,travel:!!options.travel,rotate:!!options.rotate,feet:!!options.feet,size:options.size||c.size});
    Object.assign(effects[effects.length-1],{projectile:options.projectile,beam:!!options.beam});
    if(options.projectile)canvas.dataset.projectile=options.projectile;
    if(options.beam)canvas.dataset.beam='lance';
    // Cap visual work even if a network peer sends a burst of legitimate actions.
    while(effects.length>96)effects.shift().canvas.remove();
    if(!raf){last=performance.now();raf=requestAnimationFrame(frame);}return true;
  }
  function along(a,b,t){
    const aq=a.x-(a.y-(a.y&1))/2,bq=b.x-(b.y-(b.y&1))/2;
    const x=aq+(bq-aq)*t,z=a.y+(b.y-a.y)*t,y=-x-z;
    let rx=Math.round(x),ry=Math.round(y),rz=Math.round(z);
    const dx=Math.abs(rx-x),dy=Math.abs(ry-y),dz=Math.abs(rz-z);
    if(dx>dy&&dx>dz)rx=-ry-rz;else if(dy>dz)ry=-rx-rz;else rz=-rx-ry;
    return {x:rx+(rz-(rz&1))/2,y:rz};
  }
  function frame(now){
    raf=0;const delta=Math.max(0,now-last);last=now;
    if(!inGame()||disabled()){clear();return;}
    const paused=document.hidden||document.body.classList.contains('hv-paused');
    effects=effects.filter(e=>{
      if(e.match!==game()||!e.canvas.isConnected){e.canvas.remove();return false;}
      if(e.owner&&(!game().units.includes(e.owner)||e.owner.hp<=0)){e.canvas.remove();return false;}
      if(e.owner)e.from=e.to=point(e.owner);
      if(paused){e.start+=delta;e.canvas.style.visibility='hidden';return true;}
      const dt=now-e.start;
      if(dt>=e.duration){e.canvas.remove();return false;}
      if(dt<0)return true;
      const t=e.travel?Math.min(1,dt/e.duration):1;
      const sourceVisible=visible(e.from,e.sourceUnit),targetVisible=visible(e.to,e.targetUnit);
      const seen=sourceVisible&&targetVisible&&(!e.travel||visible(along(e.from,e.to,t)));
      e.canvas.style.visibility=seen?'visible':'hidden';if(!seen)return true;
      const a=cpx(e.from),b=cpx(e.to),board=document.getElementById('board');
      if(!board||!board.clientWidth)return true;
      const cell=board.clientWidth/(typeof WF==='number'?WF:10),size=Math.max(20,cell*e.size);
      const x=a[0]+(b[0]-a[0])*t,y=a[1]+(b[1]-a[1])*t+(e.feet?cell*.16:-cell*.2);
      e.canvas.style.width=e.canvas.style.height=size+'px';e.canvas.style.left=x+'px';e.canvas.style.top=y+'px';
      e.canvas.style.transformOrigin=(e.clip.anchor[0]*100)+'% '+(e.clip.anchor[1]*100)+'%';
      e.canvas.style.transform=`translate(${-e.clip.anchor[0]*100}%,${-e.clip.anchor[1]*100}%) rotate(${e.rotate?Math.atan2(b[1]-a[1],b[0]-a[0])+(e.projectile?0:e.clip.rotation):0}rad)`;
      if(e.beam){
        const reach=Math.hypot(b[0]-a[0],b[1]-a[1])+cell*.4;
        const extension=Math.min(1,dt/140,Math.max(0,(e.duration-dt)/160));
        e.canvas.style.width=reach*extension+'px';e.canvas.style.height=cell*.3+'px';
        e.canvas.style.left=a[0]+'px';e.canvas.style.top=(a[1]-cell*.2)+'px';
        e.canvas.style.transformOrigin='0 50%';e.canvas.style.transform=`translateY(-50%) rotate(${Math.atan2(b[1]-a[1],b[0]-a[0])}rad)`;
      }
      let n=Math.floor(dt*e.clip.fps/1000);n=e.clip.loop?n%e.clip.rects.length:Math.min(n,e.clip.rects.length-1);
      if(e.loop)n=Math.floor(dt%e.loopPeriod/e.loopPeriod*e.clip.rects.length);
      const ctx=e.canvas.getContext('2d');ctx.clearRect(0,0,192,192);ctx.imageSmoothingEnabled=false;if(e.projectile||e.beam)drawProjectile(ctx,e.beam?'lance':e.projectile);else ctx.drawImage(e.pack.image,...e.clip.rects[n],0,0,192,192);return true;
    });
    if(effects.length)raf=requestAnimationFrame(frame);else last=0;
  }
  function dispatch(u,t,binding,packKey=u?.k){
    if(!binding||!u||!t)return false;
    const pack=assets.get(packKey);if(!pack)return false;
    const names=['cast','projectile','impact'].filter(n=>binding[n]&&pack.clips[binding[n]]);if(!names.length)return false;
    const delay=Math.max(0,(u.fx?.t||performance.now())-performance.now());
    const release=binding.releaseMs??250,travel=binding.projectile?(binding.travelMs??300):0;
    if(names.includes('cast'))add(packKey,binding.cast,u,u,{sourceUnit:u,targetUnit:u,delay,feet:true});
    if(names.includes('projectile')){const kind=projectileKind(packKey,binding.projectile);add(packKey,binding.projectile,u,t,{sourceUnit:u,targetUnit:t.v,delay:delay+release,travel:true,rotate:true,duration:travel,projectile:kind,size:kind?(kind==='bullet'?.65:.9):undefined});}
    if(names.includes('impact'))add(packKey,binding.impact,t,t,{targetUnit:t.v,delay:delay+release+travel});
    return true;
  }
  function attack(u,t){
    if(!u||!t||t.heal||t.summon||t.ab||!assets.has(u.k)||disabled()||!inGame())return false;
    // A successful cosmetic dispatch may draw nothing if the attack is concealed.
    if(!visible(u,u)||!visible(t,t.v))return true;
    if(u.k==='lancer'){
      const cells=typeof pierceCells==='function'?pierceCells(u,t):[t];
      const seen=[];for(const cell of cells){if((typeof VALID!=='undefined'&&!VALID.has(cell.x+','+cell.y))||!visible(cell))break;seen.push(cell);}
      if(!seen.length)return true;
      const delay=Math.max(0,(u.fx?.t||performance.now())-performance.now())+100;
      add(u.k,'thrust',u,seen[seen.length-1],{sourceUnit:u,beam:true,delay,duration:550});
      seen.forEach((cell,i)=>add(u.k,'hitSpark',cell,cell,{delay:delay+150+i*80,size:.65}));
      return true;
    }
    if(dispatch(u,t,assets.get(u.k)?.bindings.attack))return true;
    const speed=typeof PACEMODE!=='undefined'&&PACEMODE==='fast'?.65:1;
    const delayed=Math.max(0,(u.fx?.t||performance.now())-performance.now());
    if(u.k==='necromancer'){
      const release=158*speed,travel=320;
      add(u.k,'castingAura',u,u,{sourceUnit:u,targetUnit:u,delay:delayed,duration:release+120,feet:true});
      add(u.k,'deathBolt',u,t,{sourceUnit:u,targetUnit:t.v,delay:delayed+release,travel:true,rotate:true,duration:travel});
      add(u.k,'necroticImpact',t,t,{targetUnit:t.v,delay:delayed+release+travel});
    }else if(u.k==='knight'||u.k==='blade'){
      const contact=(u.k==='knight'?192:252)*speed;
      add(u.k,'slash',u,t,{sourceUnit:u,targetUnit:t.v,delay:delayed+Math.max(0,contact-100),rotate:true,size:1.15});
      add(u.k,u.k==='knight'?'hitSpark':'impact',t,t,{targetUnit:t.v,delay:delayed+contact,size:.85});
    }else return false;
    return true;
  }
  if(typeof atkFx==='function'){const original=atkFx;atkFx=function(u,t){if(attack(u,t))return;return original.apply(this,arguments);};}
  if(typeof perform==='function'){
    const original=perform;perform=function(action){
      const u=action?.t==='move'&&typeof at==='function'?at(action.fx,action.fy):null,from=u?point(u):null;
      const result=original.apply(this,arguments),clip=u&&assets.get(u.k)?.bindings.movement;
      if(result&&clip&&u.hp>0&&(u.x!==from.x||u.y!==from.y))add(u.k,clip,from,u,{targetUnit:u,travel:true,feet:true,duration:window.hvWalk?.get(u)?.dur||300});
      return result;
    };
  }
  if(typeof hit==='function'){
    const original=hit;hit=function(target,damage){
      const u=target?.t==='u'?target.v:null,attacker=typeof curAtk!=='undefined'?curAtk:null,clip=u&&assets.get(u.k)?.bindings.rangedMitigation;
      const mitigates=clip&&u.k==='templar'&&!u.ward&&attacker&&dist(attacker,u)>=2&&damage>1,hp=u?.hp;
      const result=original.apply(this,arguments);
      if(mitigates&&u.hp<hp)add(u.k,clip,u,u,{sourceUnit:u,targetUnit:u});
      return result;
    };
  }
  if(typeof act==='function'){
    const original=act;act=function(u,t){const hp=t?.v?.hp,wasUsed=u?.used;
      const priorSummons=t?.summon&&!t.ab&&assets.get(u?.k)?.bindings.summon?new Set(S.units):null;
      const result=original.apply(this,arguments);
      // Elite cinematics bypass atkFx; use their existing delayed fx timestamp.
      if(typeof CUT!=='undefined'&&CUT[u?.k]&&!t?.heal&&!t?.summon&&!t?.ab&&!t?.sp)attack(u,t);
      if(t?.heal&&t.v.hp>hp)dispatch(u,t,assets.get(u.k)?.bindings.heal);
      if(priorSummons){
        const summoned=S.units.find(v=>!priorSummons.has(v)&&v.side===u.side&&v.x===t.x&&v.y===t.y&&v.sumBy===u.k);
        if(summoned)dispatch(u,{x:summoned.x,y:summoned.y,v:summoned},assets.get(u.k)?.bindings.summon);
      }
      if(t?.ab&&!wasUsed&&u?.used)dispatch(u,t,assets.get(u.k)?.bindings.abilities?.[t.ab]);
      if(u?.k==='nosferatu'&&u.mist&&!t?.heal&&!t?.ab&&!t?.summon)window.dispatchEvent(new CustomEvent('hv-unit-effect',{detail:{unitKey:u.k,event:'mist:gain',target:u}}));
      return result;
    };
  }
  if(typeof bossKill==='function'){
    const original=bossKill;bossKill=function(u,v){const hp=u?.hp,result=original.apply(this,arguments);
      if(u?.k==='bloodqueen'&&u.hp>hp)window.dispatchEvent(new CustomEvent('hv-unit-effect',{detail:{unitKey:u.k,event:'kill:heal',target:u,amount:u.hp-hp}}));
      return result;
    };
  }
  if(typeof summonNear==='function'){
    const original=summonNear;summonNear=function(c,k,side,by){const result=original.apply(this,arguments);
      if(result&&by==='batking')window.dispatchEvent(new CustomEvent('hv-unit-effect',{detail:{unitKey:'batking',event:'swarm:spawn',target:result}}));
      if(result&&by==='demonprince')window.dispatchEvent(new CustomEvent('hv-unit-effect',{detail:{unitKey:'demonprince',event:'hellgate:spawn',target:result}}));
      return result;
    };
  }
  const onCast=window.hvOnCast;window.hvOnCast=function(key,u,t,o,originalKey){const result=onCast?.apply(this,arguments);const effectTarget=(['rally','hook','swap','rewind'].includes(key))&&t.v?Object.assign({},t,{x:t.v.x,y:t.v.y}):t,packKey=assets.has(originalKey)?originalKey:u.k;dispatch(u,effectTarget,assets.get(packKey)?.bindings.abilities?.[key],packKey);return result;};
  window.addEventListener('hv-unit-effect',event=>{
    const {unitKey,key,target}=Object.assign({key:event.detail.event},event.detail),pack=assets.get(unitKey);
    if(key==='drain'){
      const binding=pack?.bindings.drain,clip=typeof binding==='string'?binding:binding?.clip||(unitKey==='blade'?'drain':null),source=event.detail.source;
      if(clip&&source)add(unitKey,clip,source,target,{sourceUnit:source,targetUnit:target,delay:Math.max(0,(target.fx?.t||performance.now())-performance.now())+250,travel:true,rotate:true,duration:400});
      return;
    }
    const binding=pack?.delayedEvents[key]||pack?.statusEvents[key],source=event.detail.source;
    if(binding?.projectile&&source){
      if(visible(source,source)&&visible(target,typeof H!=='undefined'&&H[target.k]?target:null))dispatch(source,{x:target.x,y:target.y,v:target},binding,unitKey);
      return;
    }
    if(binding?.impact)add(unitKey,binding.impact,target,target,{targetUnit:typeof H!=='undefined'&&H[target.k]?target:null,delay:Math.max(0,(target.fx?.t||performance.now())-performance.now())});
  });
  if(typeof fx==='function'){
    const original=fx;fx=function(o,n){const result=original.apply(this,arguments);
      if(n==='dead'&&o&&!disabled()){
        const clip=assets.get(o.k)?.bindings.death;
        if(clip)add(o.k,clip,o,o,{sourceUnit:o,targetUnit:o,delay:Math.max(0,(o.fx?.t||performance.now())-performance.now()),feet:true});
      }
      if(n==='undying'&&o&&!disabled()){
        const pack=assets.get(o.k),clip=pack?.bindings.revive||pack?.statusEvents?.undying?.impact;
        if(clip)add(o.k,clip,o,o,{sourceUnit:o,targetUnit:o,delay:Math.max(0,(o.fx?.t||performance.now())-performance.now())+850,feet:true});
      }
      if(n==='spawn'&&o&&!disabled()){
        const delay=Math.max(0,(o.fx?.t||performance.now())-performance.now());
        const clip=assets.get(o.k)?.bindings.spawn;
        if(clip)add(o.k,clip,o,o,{sourceUnit:o,targetUnit:o,delay,feet:true});
        else if(o.k==='knight')add('knight','spawn',o,o,{sourceUnit:o,targetUnit:o,delay,feet:true});
        else if(o.k==='blade')add('blade','arrival',o,o,{sourceUnit:o,targetUnit:o,delay,feet:true});
        else if(o.sumBy==='raise')add('necromancer','raiseSlain',o,o,{sourceUnit:o,targetUnit:o,delay,feet:true});
      }
      return result;
    };
  }
  const style=document.createElement('style');style.textContent='.hv-faction-fx{position:absolute;pointer-events:none;z-index:4;user-select:none;image-rendering:pixelated}';document.head.appendChild(style);
  // Cosmetic foot-level auras belong to living, visible units and never grant vision.
  setInterval(()=>{
    if(!inGame()||disabled()||document.hidden||document.body.classList.contains('hv-paused'))return;
    for(const u of game().units||[]){const aura=assets.get(u.k)?.bindings.aura;
      if(!aura?.clip||u.hp<=0||!visible(u,u)||effects.some(e=>e.owner===u&&e.name===aura.clip))continue;
      add(u.k,aura.clip,u,u,{sourceUnit:u,targetUnit:u,owner:u,feet:true,size:aura.sizeInHexes||1,duration:aura.durationMs||1000});
    }
  },200);
  window.HVFactionFX=window.HVFactionEffects={ready,assets,errors,clear,load,effectFamily,readyFor:keys=>Promise.all(keys.map(k=>pending.get(k)).filter(Boolean)),get active(){return effects.length;},get loaded(){return [...assets.keys()];}};
})();
