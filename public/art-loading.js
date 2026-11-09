/* Cover startup and match transitions until the current artwork can be painted. */
(()=>{
 const screen=document.getElementById('art-loading'),label=screen.querySelector('p'),retry=screen.querySelector('button');
 let busy=false,booted=false,lastMatch=null;
 const delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const paint=()=>new Promise(resolve=>requestAnimationFrame(()=>requestAnimationFrame(resolve)));
 const currentMatch=()=>typeof S!=='undefined'&&S&&!document.getElementById('game')?.hidden?S:null;
 async function until(check){const end=Date.now()+30000;while(!check()){if(Date.now()>end)throw Error('Artwork took too long to load.');await delay(50);}}
 function visibleLegacyArt(){return [...document.querySelectorAll('img[src*="art/tiles/"],img[src*="art/p/"],img[src*="art/t/"],img[src*="art/env/"]')].some(el=>el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true}));}
 async function show(){
  if(busy)return;busy=true;screen.hidden=false;retry.hidden=true;
  screen.setAttribute('aria-busy','true');label.textContent=booted?'Preparing the battlefield…':'Preparing Hollow Vale…';
  try{
   await until(()=>window.HVFrames&&window.HVArcaneTerrain?.ready&&window.HVIllustratedUI?.objects.size===16&&window.HVIllustratedUI?.iconImages.size===72);
   await HVFrames.ready;await HVFrames.effectsReady;await window.HVFactionFX?.ready;
   const match=currentMatch();
   if(match){
    await until(()=>window.HVW?.ready&&window.HVZ?.on);
    const keys=new Set((match.units||[]).map(u=>u.bat&&HVFrames.registry[u.k+'_bat']?u.k+'_bat':u.k));
    for(const key of keys)if(!await HVFrames.ensure(key))throw Error('A character sheet could not load.');
    await window.HVFactionFX?.readyFor([...keys]);
    if(currentMatch()===match)render();
   }
   await paint();
   await until(()=>!visibleLegacyArt()&&[...document.querySelectorAll('.hv-rig-portrait[data-rig-key]')].every(el=>!el.checkVisibility({checkVisibilityCSS:true,checkOpacity:true})||HVFrames.assets.has(el.dataset.rigKey)));
   await paint();
   if(currentMatch()!==match){setTimeout(show,0);return;}
   lastMatch=match;booted=true;screen.hidden=true;screen.setAttribute('aria-busy','false');
  }catch(error){label.textContent='Artwork could not finish loading. Please retry.';retry.hidden=false;screen.setAttribute('aria-busy','false');console.warn('Art loading screen:',error.message);}
  finally{busy=false;}
 }
 retry.addEventListener('click',()=>location.reload());
 new MutationObserver(()=>{if(booted&&!busy&&screen.hidden&&currentMatch()&&currentMatch()!==lastMatch)show();}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['hidden','style','class']});
 show();
})();
