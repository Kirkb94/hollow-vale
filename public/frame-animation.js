/* Complete-character frame playback. No bones, limb transforms or directional rigs. */
(function(){
'use strict';
const assets=new Map(),models=new Map(),registry={},pending=new Map(),images=new Map(),facing=new WeakMap(),failures={},loadStatus={};
const directions=['se'],clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),direction=()=>0;
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let items=[],ground=[],statuses=[],last=0,clock=0,fx=[],catalog,groupBuffer;
function image(url){if(!images.has(url))images.set(url,new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>{images.delete(url);reject(Error('Missing sprite sheet: '+url));};im.src=url;}));return images.get(url);}
async function json(url){const r=await fetch(url);if(!r.ok)throw Error('Missing '+url);return r.json();}
function prune(keep){
 if(assets.size<=24)return;
 const protect=new Set([keep,document.querySelector('#character')?.value]);
 for(const item of items)if(item.canvas.isConnected)protect.add(item.k);
 for(const el of portraits)if(el.isConnected&&portraitVisibility.get(el))protect.add(el.dataset.rigKey);
 for(const key of assets.keys()){if(assets.size<=24)break;if(protect.has(key))continue;assets.delete(key);pending.delete(key);images.delete('art/frames/'+registry[key].file);loadStatus[key]='unloaded';}
}
async function load(k){loadStatus[k]='loading';try{const im=await image('art/frames/'+registry[k].file);assets.set(k,im);loadStatus[k]='ready';prune(k);window.dispatchEvent(new CustomEvent('hv-rig-ready',{detail:{key:k,config:registry[k]}}));if(typeof render==='function'&&typeof S!=='undefined'&&S)render();return true;}catch(e){failures[k]=e.message;loadStatus[k]='failed';return false;}}
function ensure(k){if(assets.has(k))return Promise.resolve(true);if(!registry[k])return Promise.resolve(false);if(!pending.has(k))pending.set(k,load(k));return pending.get(k);}
function displayKey(k,u){if(u?.shape?.kind==='mim'&&registry[u.shape.look])return u.shape.look;return u?.bat&&registry[k+'_bat']?k+'_bat':k;}
function sample(state,time){const clip=catalog.states[state]||catalog.states.idle,t=Math.max(0,time);return clip.loop?Math.floor(t%clip.duration/clip.duration*8):Math.min(7,Math.floor(t/clip.duration*8));}
function clipFor(k,state){const custom=registry[k]?.clips?.[state];if(custom)return state==='idle'&&registry[k]?.interpolate!==false?{...custom,duration:1200}:custom;return {...catalog.states[state],row:Math.max(0,Object.keys(catalog.states).indexOf(state)),frames:[0,1,2,3,4,5,6,7]};}
function paintFrame(canvas,k,state,index,single=true){
 const im=assets.get(k),unit=registry[k];if(!im||!canvas)return;
 const clip=clipFor(k,state),f=clip.frames[Math.min(index,clip.frames.length-1)],row=clip.row;
 const w=unit.frameWidth||catalog.frameWidth,h=unit.frameHeight||catalog.frameHeight;
 const ctx=canvas.getContext('2d');ctx.clearRect(0,0,canvas.width,canvas.height);ctx.imageSmoothingEnabled=!unit.pixelArt;canvas.style.imageRendering=unit.pixelArt?'pixelated':'auto';
 if(unit.artwork==='new-whole-character'){
  const region=unit.poseRegions?.[row]?.[f];
  if(region){
   // Crop the complete illustrated pose, including weapons that cross nominal cell borders.
   // The stencil excludes neighbouring poses; it never moves individual body parts.
   if(!region.path){region.path=new Path2D();for(const rect of region.mask)region.path.rect(...rect);}
   ctx.save();ctx.translate(region.left/320*canvas.width,region.top/240*canvas.height);
   ctx.scale(region.width/320*canvas.width/region.rect[2],region.height/240*canvas.height/region.rect[3]);
   ctx.clip(region.path);ctx.drawImage(im,...region.rect,0,0,region.rect[2],region.rect[3]);ctx.restore();return;
  }
  // Preserve the illustrated proportions and align whole poses to a shared ground line.
  const y=unit.frameOffsets[row][f];ctx.drawImage(im,f*w,row*h,w,h,56/320*canvas.width,y/240*canvas.height,208/320*canvas.width,208/240*canvas.height);return;
 }
 const group=single?1:unit.group||1;
 if(group>1){for(const [x,y]of [[-.1,-.06],[.1,-.06],[0,.08]])ctx.drawImage(im,f*w,row*h,w,h,canvas.width*(.175+x),canvas.height*(.175+y),canvas.width*.65,canvas.height*.65);}
 else ctx.drawImage(im,f*w,row*h,w,h,0,0,canvas.width,canvas.height);
}
// Blend complete painted poses; no limb transforms or skeletal interpolation.
const poseCache=new Map();let blendBuffer;
function poseCanvas(k,state,index){
 const key=k+':'+state+':'+index;let c=poseCache.get(key);
 if(c){poseCache.delete(key);poseCache.set(key,c);return c;}
 c=document.createElement('canvas');c.width=320;c.height=240;paintFrame(c,k,state,index,true);poseCache.set(key,c);
 if(poseCache.size>64)poseCache.delete(poseCache.keys().next().value);return c;
}
function frameSample(k,state,time){
 const clip=clipFor(k,state),n=clip.frames.length,t=Math.max(0,time);
 if(reduced.matches)return {index:0,next:0,blend:0};
 const phase=(clip.loop?t%clip.duration:Math.min(t,clip.duration))/clip.duration*n;
 const index=Math.min(n-1,Math.floor(phase)),next=clip.loop?(index+1)%n:Math.min(n-1,index+1);
 const window=state==='idle'?1:state==='walk'?.75:.55;
 const x=clamp((phase-Math.floor(phase)-(1-window))/window,0,1);
 return {index,next,blend:registry[k]?.interpolate===false||index===next?0:x*x*(3-2*x)};
}
function paintSmooth(canvas,k,state,time){
 const s=frameSample(k,state,time);
 if(!s.blend){paintFrame(canvas,k,state,s.index,true);return;}
 if(!blendBuffer){blendBuffer=document.createElement('canvas');blendBuffer.width=320;blendBuffer.height=240;}
 const ctx=blendBuffer.getContext('2d');ctx.clearRect(0,0,320,240);ctx.save();
 ctx.globalAlpha=1-s.blend;ctx.drawImage(poseCanvas(k,state,s.index),0,0);
 // Add weighted premultiplied colors, preserving opacity where poses overlap.
 ctx.globalCompositeOperation='lighter';ctx.globalAlpha=s.blend;ctx.drawImage(poseCanvas(k,state,s.next),0,0);ctx.restore();
 const out=canvas.getContext('2d');out.clearRect(0,0,canvas.width,canvas.height);out.drawImage(blendBuffer,0,0,canvas.width,canvas.height);
}
function draw(canvas,k,dir,state='idle',time=0,single=false){
 if(!assets.has(k)||!canvas)return;
 if(!single&&(registry[k].group||1)>1){
  if(!groupBuffer){groupBuffer=document.createElement('canvas');groupBuffer.width=320;groupBuffer.height=240;}
  paintSmooth(groupBuffer,k,state,time);
  const ctx=canvas.getContext('2d');ctx.imageSmoothingEnabled=!registry[k]?.pixelArt;canvas.style.imageRendering=registry[k]?.pixelArt?'pixelated':'auto';ctx.clearRect(0,0,canvas.width,canvas.height);
  for(const [x,y]of [[-.1,-.06],[.1,-.06],[0,.08]])ctx.drawImage(groupBuffer,canvas.width*(.175+x),canvas.height*(.175+y),canvas.width*.65,canvas.height*.65);
 }else paintSmooth(canvas,k,state,time);
}
function loopSample(time,count,period){const phase=((time%period)+period)%period/period*count,index=Math.floor(phase),fraction=phase-index;return {index,next:(index+1)%count,blend:fraction*fraction*(3-2*fraction)};}
function drawLoop(ctx,image,rects,time,period,width,height){const s=loopSample(time,rects.length,period);ctx.save();ctx.globalAlpha=1-s.blend;ctx.drawImage(image,...rects[s.index],0,0,width,height);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=s.blend;ctx.drawImage(image,...rects[s.next],0,0,width,height);ctx.restore();}
  const portraits=new Set(),portraitVisibility=new WeakMap();
  const portraitObserver=new IntersectionObserver(entries=>{for(const entry of entries){portraitVisibility.set(entry.target,entry.isIntersecting);if(entry.isIntersecting)ensure(entry.target.dataset.rigKey);}},{rootMargin:'120px'});
  function scanPortraits(node){
    // Legacy popups can hold split SVG/blob portraits created before the catalog loads.
    const legacy=node.matches?.('.hvf[data-hvk]')?[node]:[...(node.querySelectorAll?.('.hvf[data-hvk]')||[])];
    for(const el of legacy){if(el.closest('#board')||el.classList.contains('hv-rig-portrait'))continue;
      el.classList.add('hv-rig-portrait','hv-current-portrait');el.dataset.rigKey=el.dataset.hvk;
      el.innerHTML='<canvas width="320" height="240" aria-hidden="true"></canvas>';
    }
    const list=node.matches?.('.hv-rig-portrait')?[node]:[...(node.querySelectorAll?.('.hv-rig-portrait')||[])];
    for(const el of list)if(!portraits.has(el)){portraits.add(el);portraitObserver.observe(el);}
  }
  // Effect timestamps belong to gameplay/replays. Map each effect to the local
  // presentation clock once, so a paused attack keeps its remaining pose time.
  const transientStarts=new WeakMap();
  function transientElapsed(effect,now){
    if(!effect)return -1;
    if(!transientStarts.has(effect))transientStarts.set(effect,clock-(now-effect.t));
    return clock-transientStarts.get(effect);
  }
  const portraitBounds=new Map();
  let portraitBuffer;
  function drawInlinePortrait(canvas,k,t,single){
    if(!portraitBuffer){portraitBuffer=document.createElement('canvas');portraitBuffer.width=320;portraitBuffer.height=240;}
    draw(portraitBuffer,k,1,'idle',t,single);
    const key=k+':'+single;
    if(!portraitBounds.has(key)){
      const a=portraitBuffer.getContext('2d').getImageData(0,0,320,240).data;
      let l=320,r=0,top=240,bottom=0;
      for(let y=0;y<240;y++)for(let x=0;x<320;x++)if(a[(y*320+x)*4+3]>32){l=Math.min(l,x);r=Math.max(r,x);top=Math.min(top,y);bottom=Math.max(bottom,y);}
      if(r<=l)return;
      portraitBounds.set(key,[Math.max(0,l-10),Math.max(0,top-10),Math.min(320,r+11)-Math.max(0,l-10),Math.min(240,bottom+11)-Math.max(0,top-10)]);
    }
    const [x,y,w,h]=portraitBounds.get(key),ctx=canvas.getContext('2d');
    // Match the element's aspect ratio so the bitmap is not stretched in square reserve buttons.
    const box=canvas.getBoundingClientRect(),width=Math.max(1,box.width),height=Math.max(1,box.height);
    const scale=Math.min(width/w,height/h);
    const dw=w*scale/width*canvas.width,dh=h*scale/height*canvas.height;
    ctx.imageSmoothingEnabled=!registry[k]?.pixelArt;canvas.style.imageRendering=registry[k]?.pixelArt?'pixelated':'auto';ctx.clearRect(0,0,canvas.width,canvas.height);ctx.drawImage(portraitBuffer,x,y,w,h,(canvas.width-dw)/2,(canvas.height-dh)/2,dw,dh);
  }
  function frame(now){
    const paused=document.body.classList.contains('hv-paused');
    if(!paused&&!document.hidden)clock+=Math.min(80,now-(last||now));last=now;
    for(const item of items)if(item.canvas.isConnected)transientElapsed(item.u.fx,now);
    if(!paused&&!document.hidden){
      for(const item of items){const {canvas,u,k}=item;if(!canvas.isConnected)continue;let dir=facing.get(u)??(u.side==='p'?1:4),state='idle',t=clock;
        const walk=window.hvWalk&&hvWalk.get(u);
        if(walk){const step=clamp(Math.floor((now-(walk.t0||now))/walk.dur*walk.n),0,walk.n-1);dir=direction(walk.p[step],walk.p[step+1],dir);facing.set(u,dir);state='walk';t=now-(walk.t0||now);}
        const f=u.fx,elapsed=transientElapsed(f,now);
        if(elapsed>=0){const map={atk:[registry[k]?.attack||'cast',800],hurt:['hurt',450],dead:['death',1100],spawn:['spawn',600],undying:['spawn',1700]};const def=map[f.n];if(def&&elapsed<def[1]){state=def[0];t=elapsed;if(f.n==='undying')t=Math.max(0,elapsed-850);}}
        draw(canvas,k,dir,state,t,true);
      }
      renderEffects(now);
      for(const {canvas,family,burn}of statuses){
        const sheet=burn?groundFlame:statusAtlas;if(!sheet||!canvas.isConnected)continue;
        const f=Math.floor((reduced.matches?0:clock)%960/240),pose=burn?f:[0,1,2,1][f];
        const rect=burn?groundFrames[pose]:[((family%2)*4+pose)*sheet.width/8,Math.floor(family/2)*sheet.height/6,sheet.width/8,sheet.height/6];
        const ctx=canvas.getContext('2d');ctx.clearRect(0,0,96,96);ctx.imageSmoothingEnabled=false;ctx.drawImage(sheet,...rect,0,0,96,96);
      }
      if(groundFlame)for(const c of ground){if(!c.isConnected)continue;const cell=c.closest('.cell');c.style.visibility=cell?.classList.contains('fogw')?'hidden':'';const ctx=c.getContext('2d');ctx.clearRect(0,0,128,128);ctx.imageSmoothingEnabled=false;c.style.imageRendering='pixelated';const f=Math.floor((reduced.matches?0:clock)%720/180);ctx.drawImage(groundFlame,...groundFrames[f],0,0,128,128);}
    }
    // Dialog portraits must populate while gameplay is paused; the pose clock stays frozen.
    if(!document.hidden)for(const el of portraits){
      if(!el.isConnected){portraits.delete(el);portraitObserver.unobserve(el);continue;}
      if(!portraitVisibility.get(el))continue;
      if(!assets.has(el.dataset.rigKey)){ensure(el.dataset.rigKey);continue;}
      el.classList.add('ready');
      if(el.matches('canvas'))drawInlinePortrait(el,el.dataset.rigKey,clock,!el.closest('#draft'));
      else draw(el.querySelector('canvas'),el.dataset.rigKey,1,'idle',clock,!el.closest('#draft'));
    }
    requestAnimationFrame(frame);
  }
  function bind(){
    if(typeof S==='undefined'||!S)return;items=[];ground=[];statuses=[];
    document.querySelectorAll('#board canvas.hv-rig').forEach(canvas=>{const cell=canvas.closest('.cell'),x=+cell.dataset.x,y=+cell.dataset.y;
      const u=(S.units||[]).find(u=>u.x===x&&u.y===y)||(S.ghosts||[]).find(u=>u.x===x&&u.y===y);
      if(u){const k=canvas.dataset.rigKey||u.k;items.push({canvas,u,k});draw(canvas,k,0,'idle',clock,true);}
    });
    if(groundFlame)document.querySelectorAll('#board .hvm-fire').forEach(el=>{if(el.tagName.toLowerCase()!=='canvas'){const c=document.createElement('canvas');c.width=c.height=128;c.className='hvm hvm-fire hv-rig-ground';el.replaceWith(c);ground.push(c);}else ground.push(el);});
    for(const [cls,family]of Object.entries({sburn:0,sroot:8,sstun:10,ssil:5,sward:11})){
      document.querySelectorAll('#board .ssp.'+cls).forEach(el=>{
        let canvas=el.querySelector('canvas.hv-status-pixel');
        if(!canvas){canvas=document.createElement('canvas');canvas.width=canvas.height=96;canvas.className='hv-status-pixel';canvas.setAttribute('aria-hidden','true');el.replaceChildren(canvas);}
        statuses.push({canvas,family,burn:cls==='sburn'});
      });
    }
  }
  let pixelFlame=null,groundFlame=null,statusAtlas=null,groundFrames=[];
  const effectsReady=Promise.all([
    image('art/ground-fire-pocket-chibi.png').then(im=>{groundFlame=im;groundFrames=Array.from({length:4},(_,i)=>[i*im.width/4,0,im.width/4,im.height]);bind();}),
    image('art/frames/mage-pocket-chibi-fire.png').then(im=>{pixelFlame=im;}),
    image('art/effects-pocket-chibi.png').then(im=>{statusAtlas=im;bind();})
  ]);
  effectsReady.catch(e=>{failures.effects=e.message;});
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
      const sheet=pixelFlame,rows=2;ctx.imageSmoothingEnabled=false;
      ctx.clearRect(0,0,128,128);ctx.drawImage(sheet,col*sheet.width/8,row*sheet.height/rows,sheet.width/8,sheet.height/rows,0,0,128,128);return true;
    });
  }
  function launch(u,t){if(!pixelFlame||reduced.matches)return false;const layer=document.getElementById('fxl');if(!layer)return false;
    const canvas=document.createElement('canvas');canvas.width=canvas.height=128;canvas.className='hv-rig-fire';layer.appendChild(canvas);
    const pixel=true;canvas.style.imageRendering=pixel?'pixelated':'auto';
    fx.push({pixel,canvas,from:{x:u.x,y:u.y},to:{x:t.x,y:t.y},t:performance.now()+340,match:S});return true;}
  const css=document.createElement('style');css.textContent=`
    html body #board .cell .u:has(>canvas.hv-rig){animation:none!important}
    html body #board .cell .u>canvas.hv-rig{width:3.9em;height:3.18em;margin:-.815em -1.325em -.265em;animation:none!important;object-fit:contain;pointer-events:none}
    /* Squad figures are smaller in combat; keep their anchored feet on the tile. */
    html body #board .cell .u>canvas.hv-rig.hv-squad{scale:.72;transform-origin:50% 82.5%}
    .hv-rig-fire{position:absolute;width:90px;height:90px;translate:-50% -50%;pointer-events:none}
    #board .hv-rig-ground{animation:none!important;pointer-events:none}
    .hv-rig-portrait{display:inline-block;position:relative;vertical-align:middle}
    .hv-rig-portrait>canvas{position:absolute;left:-43.333%;top:-20%;width:186.667%;height:140%;pointer-events:none;visibility:hidden}
    .hv-rig-portrait.ready>canvas{visibility:visible}
    canvas.hv-inline-portrait{position:relative;inset:auto;display:block;width:1.7em;height:2.55em;margin:0;object-fit:contain;pointer-events:none;overflow:hidden}
    .chip>canvas.hv-inline-portrait,.ucs>canvas.hv-inline-portrait{width:100%;height:100%;max-width:100%;max-height:100%}
    .ucs{position:relative;overflow:hidden}
    .rchip>canvas.hv-inline-portrait,.hchip>canvas.hv-inline-portrait{width:44px;height:40px}
    .hv-current-portrait{position:absolute;inset:0;width:100%;height:100%;overflow:hidden;background:radial-gradient(ellipse at 50% 75%,#526957,#192830 75%)}
    .hv-current-portrait>canvas{left:0;top:0;width:100%;height:100%;object-fit:contain;transform:none!important}
    .hv-rig-portrait.ready>:not(canvas){visibility:hidden}
  `;document.head.appendChild(css);
  if(typeof spr==='function'){
    const oldPort=port;port=function(k){return (registry[k]||(typeof H!=='undefined'&&H[k]))?`<span class="hvf hv-rig-portrait hv-current-portrait" data-rig-key="${k}"><canvas width="320" height="240" aria-hidden="true"></canvas></span>`:oldPort(k);};
    const oldSpr=spr;spr=function(k,s,u){const visual=displayKey(k,u);if(u&&assets.has(visual))return `<canvas class="sp pt hv-rig${(registry[visual]?.group||1)>1?' hv-squad':''}" data-rig-key="${visual}" width="320" height="240" aria-hidden="true"></canvas>`;if(u&&registry[visual]&&!pending.has(visual))ensure(visual);const original=oldSpr.apply(this,arguments);if(!u&&(registry[k]||(typeof H!=='undefined'&&H[k])))return `<canvas class="sp hv-rig-portrait hv-inline-portrait" data-rig-key="${k}" width="320" height="240" aria-hidden="true"></canvas>`;return original;};
    const oldRender=render;render=function(){const result=oldRender.apply(this,arguments);bind();scanPortraits(document);return result;};
    const oldAct=act;act=function(u,t){if(u&&t&&assets.has(u.k))facing.set(u,direction(u,t,facing.get(u)??1));return oldAct.apply(this,arguments);};
    const oldAtk=atkFx;atkFx=function(u,t){if(u.k==='mage'&&assets.has('mage')&&!RP&&!RUNFAST&&launch(u,t))return;return oldAtk.apply(this,arguments);};
  }

// Compatibility name preserves existing gameplay/UI hooks; this is a frame player.
window.HVFrames=window.HVRig={directions,direction,draw,paintFrame,clipFor,frameSample,loopSample,drawLoop,assets,models,registry,load,ensure,bind,failures,loadStatus,effectsReady,face:()=>{},sample};
HVRig.ready=json('art/frames/catalog.json').then(c=>{catalog=c;Object.assign(registry,c.units);scanPortraits(document);for(const el of portraits)if(portraitVisibility.get(el))ensure(el.dataset.rigKey);bind();if(typeof render==='function'&&typeof S!=='undefined'&&S)render();return true;}).catch(e=>{failures.catalog=e.message;console.error(e);throw e;});
new MutationObserver(records=>{for(const r of records)for(const n of r.addedNodes)if(n.nodeType===1)scanPortraits(n);}).observe(document.body,{childList:true,subtree:true});
scanPortraits(document);requestAnimationFrame(frame);
})();
