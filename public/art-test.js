/* Explicit opt-in local art test. Never runs in ordinary or network games. */
(() => {
  if(!new URLSearchParams(location.search).has('arttest'))return;
  if(new URLSearchParams(location.search).get('arttest')==='factions')return;
  let subject=null,arena=null,timers=[];
  const valid=()=>S===arena&&subject&&S.units.includes(subject)&&!document.getElementById('game').hidden;
  const normalAutoEnd=autoEnd;autoEnd=function(){if(S===arena)return;return normalAutoEnd.apply(this,arguments);};
  // The practice opponent is a stationary target, not an unattended human seat.
  // Advance through its turn normally so round effects and action refresh still run.
  const normalRunAI=runAI;runAI=function(side){
    if(S!==arena)return normalRunAI.apply(this,arguments);
    const match=arena;
    function pass(){
      if(S!==match||S.over||S.turn!==side)return;
      if(window.hvPause&&hvPause.defer(pass))return;
      submit({t:'end',s:side});
    }
    timers.push(setTimeout(pass,350));
  };
  function reset(){
    timers.forEach(clearTimeout);timers=[];
    document.querySelector('#hv-news')?.remove();document.querySelector('#splash')?.setAttribute('hidden','');
    NET=null;mode='local';HOST=true;HOTSEAT=false;HUM=1;CAMP=null;
    try{localStorage.setItem('hv-cheat','1');}catch(_){}
    startGame({n:2,seat:{p:'h',e:'a'},me:'p',seed:5412,picks:{p:['mage','mage'],e:['brute','mage']},opts:{map:'classic'}});
    arena=S;S.mana.p=10;S.pool.p=[];S.pool.e=[];
    const center=GEO.cells.filter(c=>!twAt(c.x,c.y)).sort((a,b)=>(a.x-4)**2+(a.y-4)**2-((b.x-4)**2+(b.y-4)**2))[0];
    subject=mk('mage','p',center.x,center.y);S.units=[subject];S.ter[center.x+','+center.y]='grass';
    const dest=GEO.cells.find(c=>dist(center,c)===2&&!twAt(c.x,c.y)&&c.x>center.x);
    if(dest){S.ter[dest.x+','+dest.y]='grass';const dummy=mk('brute','e',dest.x,dest.y);dummy.hp=100;S.units.push(dummy);}
    MOPT.sight=false;MOPT.fog=false;busy=false;sel=subject;render();
    msg('Art test: move the Pyromancer normally, or use the animation controls below. Reset restores the arena.');
  }
  const bar=document.createElement('details');bar.id='hv-art-test';bar.open=true;
  bar.innerHTML='<summary>Pyromancer art test</summary><div><label>Facing <select id="art-facing">'+HVRig.directions.map((d,i)=>'<option value="'+i+'">'+d.toUpperCase()+'</option>').join('')+'</select></label><button data-art="cast">Cast at target</button><button data-art="hurt">Hit reaction</button><button data-art="dead">Death</button><button data-art="spawn">Spawn</button><button data-art="refresh">Ready again</button><button data-art="reset">Reset arena</button><a href="animation-preview.html" target="_blank">Animation workshop</a></div>';
  const style=document.createElement('style');style.textContent='#hv-art-test{position:fixed;bottom:8px;left:50%;translate:-50% 0;max-width:94vw;width:max-content;z-index:1200;padding:10px;background:#172a2af2;color:#f0dfbb;border:1px solid #b99a59;border-radius:8px;font:14px system-ui}#hv-art-test div{display:flex;gap:6px;flex-wrap:wrap;max-width:900px}#hv-art-test button,#hv-art-test select{padding:7px;background:#354c48;color:#fff;border:1px solid #a59161;border-radius:5px}#hv-art-test a{color:#efd28a;padding:7px}#hv-art-test summary{cursor:pointer;margin-bottom:6px}';document.head.appendChild(style);document.body.appendChild(bar);
  bar.querySelector('select').onchange=e=>{if(valid())HVRig.face(subject,+e.target.value)};
  bar.onclick=e=>{const action=e.target.dataset.art;if(!action)return;if(action==='reset'){reset();return;}if(!valid())return;
    if(action==='cast'){const t=targets(subject).find(t=>!t.heal&&t.v&&t.v.side!=='p');if(t){subject.used=false;S.mana.p=10;act(subject,t);render();}else msg('Move within casting range of the target or reset the arena.');}
    else if(action==='refresh'){subject.used=false;S.turn='p';ME='p';S.mana.p=10;busy=false;sel=subject;render();}
    else {fx(subject,action);render();}
  };
  const ready=()=>{if(!HVRig.assets.has('mage')||!window.HVArcaneTerrain?.ready){timers.push(setTimeout(ready,100));return;}reset();};
  timers.push(setTimeout(ready,300));
})();
