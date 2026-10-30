/* Opt-in local match for reviewing the completed faction representatives. */
(() => {
  if(new URLSearchParams(location.search).get('arttest')!=='factions')return;
  const roster=['mage','knight','blade','necromancer'];
  const requestedFaction=new URLSearchParams(location.search).get('faction');
  let arena=null,subject=null,waiting=false,passTimer=null;
  const bar=document.createElement('details');bar.id='hv-faction-test';bar.open=true;
  bar.innerHTML=`<summary>New-art test match · 4 faction representatives</summary>
    <p>Infernal, Kingdom, Vampires and Undead have new character art. Wilds, Iron and Arcane retain existing art.</p>
    <div><label>Inspect <select id="faction-unit">${roster.map(k=>`<option value="${k}">${H[k].n}</option>`).join('')}</select></label>
    <label>Facing <select id="faction-facing">${HVRig.directions.map((d,i)=>`<option value="${i}">${d.toUpperCase()}</option>`).join('')}</select></label>
    <button data-review="ready">Refresh actions</button><button data-review="reset">Restart match</button>
    <label><input id="faction-dummy" type="checkbox"> Stationary opponents</label>
    <a href="?arttest=factions&faction=kingdom">Full Kingdom roster</a><a href="animation-preview.html" target="_blank">Animation workshop</a><a href="/">Exit test</a></div>
    <p id="faction-status" role="status">Loading new artwork…</p>`;
  document.body.appendChild(bar);
  const css=document.createElement('style');css.textContent=`#hv-faction-test{position:fixed;bottom:8px;left:50%;translate:-50% 0;width:min(920px,94vw);box-sizing:border-box;z-index:1200;padding:10px;background:#172a2af5;color:#f0dfbb;border:1px solid #b99a59;border-radius:8px;font:13px system-ui}#hv-faction-test summary{cursor:pointer;font-weight:bold}#hv-faction-test p{margin:6px 0}#hv-faction-test div{display:flex;gap:6px;flex-wrap:wrap;align-items:center}#hv-faction-test button,#hv-faction-test select{padding:7px;background:#354c48;color:white;border:1px solid #a59161;border-radius:5px}#hv-faction-test a{color:#efd28a;padding:7px}`;document.head.appendChild(css);
  const status=bar.querySelector('#faction-status');
  const originalRunAI=runAI;
  runAI=function(side){
    if(!arena||S!==arena||!bar.querySelector('#faction-dummy').checked)return originalRunAI.apply(this,arguments);
    const match=arena;clearTimeout(passTimer);
    function pass(){if(S!==match||S.over||S.turn!==side)return;if(window.hvPause&&hvPause.defer(pass))return;submit({t:'end',s:side});}
    passTimer=setTimeout(pass,350);
  };
  function choose(){
    if(S!==arena)return;
    subject=S.units.find(u=>u.side==='p'&&u.k===bar.querySelector('#faction-unit').value);
    if(subject){sel=subject;render();status.textContent=H[subject.k].n+': select a highlighted hex to move or an enemy in range to attack. End Turn lets the AI respond.';}
    else status.textContent='That character has fallen. Restart the match to bring it back.';
  }
  function reset(){
    clearTimeout(passTimer);
    document.querySelector('#hv-news')?.remove();document.querySelector('#splash')?.setAttribute('hidden','');
    NET=null;mode='local';HOST=true;HOTSEAT=false;HUM=1;CAMP=null;
    startGame({n:2,seat:{p:'h',e:'a'},me:'p',seed:5412,picks:{p:roster.slice(),e:roster.slice()},opts:{map:'classic'},names:{p:'Your art squad',e:'Rival art squad'}});
    arena=S;S.units=[];S.pool.p=[];S.pool.e=[];S.mana.p=10;S.mana.e=10;
    // Place both squads on valid non-tower cells, spread along opposite flanks.
    const cells=GEO.cells.filter(c=>!twAt(c.x,c.y));
    const minX=Math.min(...cells.map(c=>c.x)),maxX=Math.max(...cells.map(c=>c.x));
    const minY=Math.min(...cells.map(c=>c.y)),maxY=Math.max(...cells.map(c=>c.y));
    const occupied=new Set();
    ['p','e'].forEach(side=>roster.forEach((k,i)=>{
      const tx=side==='p'?minX+(maxX-minX)*.3:minX+(maxX-minX)*.7;
      const ty=minY+(maxY-minY)*(i+1)/5;
      const cell=cells.filter(c=>!occupied.has(c.x+','+c.y)).sort((a,b)=>((a.x-tx)**2+(a.y-ty)**2)-((b.x-tx)**2+(b.y-ty)**2))[0];
      occupied.add(cell.x+','+cell.y);S.ter[cell.x+','+cell.y]='grass';
      S.units.push(mk(k,side,cell.x,cell.y));
    }));
    MOPT.sight=false;MOPT.fog=false;busy=false;choose();
    msg('New-art match: move and attack normally. '+roster.length+' completed character kits are on each side.');
  }
  bar.querySelector('#faction-unit').onchange=choose;
  bar.querySelector('#faction-facing').onchange=e=>{if(S===arena&&subject)HVRig.face(subject,+e.target.value);};
  bar.addEventListener('click',e=>{
    if(waiting)return;
    if(e.target.dataset.review==='reset'){reset();return;}
    if(e.target.dataset.review==='ready'&&S===arena&&S.turn==='p'&&!busy&&!S.over){
      S.units.filter(u=>u.side==='p').forEach(u=>{u.used=false;u.moved=false;});S.mana.p=10;render();
      status.textContent='Your squad’s movement, attacks and mana are refreshed.';
    }
  });
  async function ready(){
    waiting=true;
    try{
      await HVRig.ready;
      if(requestedFaction){
        const keys=Object.keys(HVRig.registry).filter(k=>H[k]?.fac===requestedFaction);
        if(!keys.length)throw new Error('No completed kits are available for that faction yet.');
        roster.splice(0,roster.length,...keys);
        bar.querySelector('#faction-unit').innerHTML=roster.map(k=>`<option value="${k}">${H[k].n}</option>`).join('');
        bar.querySelector('summary').textContent=(FAC[requestedFaction]?.n||requestedFaction)+' art test · '+roster.length+' units';
        const total=Object.values(H).filter(h=>h.fac===requestedFaction).length;
        bar.querySelector('p').textContent=roster.length+' of '+total+' faction units have integrated new art. Each side uses these kits.';
        await Promise.all(roster.map(k=>HVRig.ensure(k)));
      }
      const missing=roster.filter(k=>!HVRig.assets.has(k));
      if(missing.length)throw new Error('Could not load '+missing.map(k=>H[k].n).join(', ')+'. Reload to retry.');
      if(window.HVFactionFX)await HVFactionFX.ready;
      if(window.HVFactionFX)await Promise.all(roster.map(k=>{const c=HVRig.registry[k];return c.effects?HVFactionFX.load(k,'art/rigs/'+c.folder+'/'+c.effects):null;}));
      reset();
    }catch(e){status.textContent=e.message;}
    finally{waiting=false;}
  }
  ready();
})();
