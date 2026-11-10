/* Generic faction-vs-faction AI balance harness. Injected into a page running the shipped game (?fast).
   Same AI turn loop as infernal-balance.cjs, any two factions, random 10-slot drafts (optional boss). */
(()=>{
 RP=true;NET=null;HOST=false;HOTSEAT=false;runAI=()=>{};render=()=>{};finish3=()=>{};music=()=>{};sfx=()=>{};
 window.setTimeout=()=>0;window.requestAnimationFrame=()=>0;
 if(!window.__hookedSpawn){window.__hookedSpawn=1;const ds=doSpawn;doSpawn=function(sd,i,x,y){const k=S.pool[sd]&&S.pool[sd][i];const own=S.tw[sd].filter(T=>T.hp>0).map(T=>dist(T,{x,y}));const foeT=Object.keys(S.tw).filter(o=>o!==sd).flatMap(o=>S.tw[o].filter(T=>T.hp>0)).map(T=>dist(T,{x,y}));const r=ds.apply(this,arguments);
 if(r&&k&&H[k].fac=='undead'&&own.length&&Math.min(...own)>1&&window.__gsp)window.__gsp.push({k,round:S.round,foe:Math.min(...foeT),own:Math.min(...own)});return r}}
 window.balanceMatch=({a,b,seed,swap,boss})=>{
  let random=seed>>>0;Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
  function draft(f){const keys=Object.keys(H).filter(k=>H[k].fac===f&&!H[k].hidden&&k!=='raidboss'),out=[];let left=10;
   if(boss){const elites=keys.filter(k=>H[k].elite);const k=elites[Math.floor(Math.random()*elites.length)];out.push(k);left-=slotCost(k);}
   const fill=[true];for(let n=1;n<=10;n++)fill[n]=keys.some(k=>!H[k].elite&&slotCost(k)<=n&&fill[n-slotCost(k)]);
   while(left){const opts=keys.filter(k=>!H[k].elite&&slotCost(k)<=left&&fill[left-slotCost(k)]);const k=opts[Math.floor(Math.random()*opts.length)];if(!k)throw Error('Unfillable draft');out.push(k);left-=slotCost(k);}return out;}
  const da=draft(a),db=draft(b),sa=swap?'e':'p',sb=swap?'p':'e';
  const gsp=[];window.__gsp=gsp;
  startGame({n:2,seat:{p:'a',e:'a'},me:null,seed,picks:{[sa]:da,[sb]:db},opts:{map:'classic'},order:['p','e']});DIFF=2;
  let turns=0,failed=0;
  while(!S.over&&S.round<=60&&turns++<125){const sd=S.turn;
   if(MOPT.ults&&(S.ult[sd]||0)>=ULT_MAX&&aiUltGood(sd))submit({t:'ult',s:sd});
   if(S.over)break;aiDiplo(sd);aiShop(sd);aiSpawnTurn(sd);aiCards(sd);
   const list=S.units.filter(u=>u.side===sd&&!u.used);let hasted=false;
   for(let i=0;i<list.length&&!S.over&&S.turn===sd;i++){
    const u=list[i];for(let repeat=0;repeat<10&&u.hp>0&&!u.used&&S.units.includes(u)&&!S.over;repeat++){
     if(u.moved&&!targets(u).some(t=>!t.heal)){u.used=true;break;}
     const c=choose(u);let ok;
     if(c.act)ok=submit(Object.assign({t:'act',s:sd,fx:u.x,fy:u.y,x:c.act.x,y:c.act.y},c.act.summon?{i:1}:{}));
     else if(c.mv)ok=submit({t:'move',s:sd,fx:u.x,fy:u.y,x:c.mv.x,y:c.mv.y});
     if(!ok){failed++;break;}if(!c.act&&!H[u.k].charge)break;
    }
    if(i===list.length-1&&!hasted&&MOPT.cards){const hi=S.hand[sd].indexOf('haste');if(hi>=0&&S.mana[sd]>=1){const hu=S.units.find(u=>u.side===sd&&u.used&&!u.stun&&(()=>{u.used=false;const r=targets(u).some(t=>!t.heal&&!t.summon);u.used=true;return r;})());if(hu&&submit({t:'card',s:sd,i:hi,x:hu.x,y:hu.y})){hasted=true;list.push(hu);}}}
   }
   if(!S.over&&S.turn===sd)submit({t:'end',s:sd});
  }
  const st=S.fm&&S.fm.st?JSON.parse(JSON.stringify(S.fm.st)):null;
  const alive=sd=>S.units.filter(u=>u.side===sd&&u.hp>0).length;
  return{a,b,seed,swap,boss,da,db,winner:S.over?(S.winner===sa?a:S.winner===sb?b:'draw'):'timeout',round:S.round,failed,
   left:{[a]:alive(sa),[b]:alive(sb)},towers:{[a]:S.tw[sa].filter(T=>T.hp>0).length,[b]:S.tw[sb].filter(T=>T.hp>0).length},
   st,gsp,kills:{[a]:(G[sa]||{}).kills,[b]:(G[sb]||{}).kills},lost:{[a]:(G[sa]||{}).lost,[b]:(G[sb]||{}).lost}};
 };
})();
