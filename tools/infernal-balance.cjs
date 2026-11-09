/* Diagnostic only: run the shipped rules and AI decisions in an isolated browser. */
const fs=require('node:fs');
const{chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const browser=await chromium.launch({channel:'msedge',headless:true});try{
 const page=await browser.newPage();await page.goto('http://localhost:4323/?fast');
 await page.evaluate(()=>{
  RP=true;NET=null;HOST=false;HOTSEAT=false;runAI=()=>{};render=()=>{};finish3=()=>{};music=()=>{};sfx=()=>{};
  window.setTimeout=()=>0;window.requestAnimationFrame=()=>0;
  window.balanceMatch=({foe,seed,swap,boss,variant='baseline'})=>{
   let random=seed>>>0;Math.random=()=>{random=(Math.imul(random,1664525)+1013904223)>>>0;return random/4294967296;};
   function draft(f){const keys=Object.keys(H).filter(k=>H[k].fac===f&&!H[k].hidden&&k!=='raidboss'),out=[];let left=10;
    if(boss){const elites=keys.filter(k=>H[k].elite);const k=elites[Math.floor(Math.random()*elites.length)];out.push(k);left-=slotCost(k);}
    const fill=[true];for(let n=1;n<=10;n++)fill[n]=keys.some(k=>!H[k].elite&&slotCost(k)<=n&&fill[n-slotCost(k)]);
    while(left){const opts=keys.filter(k=>!H[k].elite&&slotCost(k)<=left&&fill[left-slotCost(k)]);const k=opts[Math.floor(Math.random()*opts.length)];if(!k)throw Error('Unfillable draft');out.push(k);left-=slotCost(k);}return out;
   }
   const infernal=draft('infernal'),opponent=draft(foe),inf=swap?'e':'p',other=swap?'p':'e';
   HVFAC.heatCost=variant==='no-overheat'?100000:5;
   startGame({n:2,seat:{p:'a',e:'a'},me:null,seed,picks:{[inf]:infernal,[other]:opponent},opts:{map:'classic'},order:['p','e']});DIFF=2;
   let turns=0,failed=0,actions=0;
   while(!S.over&&S.round<=60&&turns++<125){const sd=S.turn;
    if(MOPT.ults&&(S.ult[sd]||0)>=ULT_MAX&&aiUltGood(sd))submit({t:'ult',s:sd});
    if(S.over)break;aiDiplo(sd);aiShop(sd);aiSpawnTurn(sd);aiCards(sd);
    const list=S.units.filter(u=>u.side===sd&&!u.used);let hasted=false;
    for(let i=0;i<list.length&&!S.over&&S.turn===sd;i++){
     const u=list[i];for(let repeat=0;repeat<10&&u.hp>0&&!u.used&&S.units.includes(u)&&!S.over;repeat++){
      if(u.moved&&!targets(u).some(t=>!t.heal)){u.used=true;break;}
      const a=choose(u);let ok;
      if(a.act)ok=submit(Object.assign({t:'act',s:sd,fx:u.x,fy:u.y,x:a.act.x,y:a.act.y},a.act.summon?{i:1}:{}));
      else if(a.mv)ok=submit({t:'move',s:sd,fx:u.x,fy:u.y,x:a.mv.x,y:a.mv.y});
      actions++;if(!ok){failed++;break;}if(!a.act&&!H[u.k].charge)break;
     }
     if(i===list.length-1&&!hasted&&MOPT.cards){const hi=S.hand[sd].indexOf('haste');if(hi>=0&&S.mana[sd]>=1){const hu=S.units.find(u=>u.side===sd&&u.used&&!u.stun&&(()=>{u.used=false;const r=targets(u).some(t=>!t.heal&&!t.summon);u.used=true;return r;})());if(hu&&submit({t:'card',s:sd,i:hi,x:hu.x,y:hu.y})){hasted=true;list.push(hu);}}}
    }
    if(!S.over&&S.turn===sd)submit({t:'end',s:sd});
   }
   return{foe,seed,swap,boss,variant,infernal,opponent,slots:[infernal.reduce((n,k)=>n+slotCost(k),0),opponent.reduce((n,k)=>n+slotCost(k),0)],winner:S.over?(S.winner===inf?'infernal':foe):'timeout',round:S.round,failed,actions,mechanics:S.fm?.st,options:MOPT};
  };
  window.balanceMetadata=()=>({infernal:Object.fromEntries(Object.entries(H).filter(([k,h])=>h.fac==='infernal').map(([k,h])=>[k,{name:h.n,hp:h.hp,damage:h.dmg,range:h.rng,slots:slotCost(k),group:h.group||1}])),knobs:HVFAC});
 });
 const output='design/balance/infernal-results.json';
 const metadata=await page.evaluate(()=>balanceMetadata()),results=process.env.BALANCE_RESUME&&fs.existsSync(output)?JSON.parse(fs.readFileSync(output,'utf8')).results:[];
 const seeds=Number(process.env.BALANCE_SEEDS||5),variants=(process.env.BALANCE_VARIANTS||'baseline').split(',');
 for(const variant of variants)for(const foe of ['kingdom','vamp','undead','wilds','iron','arcane']){
  for(const boss of [false,true])for(let i=0;i<seeds;i++)for(const swap of [false,true]){
   const config={foe,boss,swap,seed:104729+i*7919,variant};
   if(results.some(r=>Object.keys(config).every(k=>r[k]===config[k])))continue;
   results.push(await page.evaluate(c=>balanceMatch(c),config));
   fs.mkdirSync('design/balance',{recursive:true});fs.writeFileSync(output,JSON.stringify({testedAt:new Date().toISOString(),metadata,results},null,2));
  }
  const rows=results.filter(r=>r.foe===foe&&r.variant===variant);console.log(JSON.stringify({variant,foe,games:rows.length,infernalWins:rows.filter(r=>r.winner==='infernal').length,timeouts:rows.filter(r=>r.winner==='timeout').length,failedActions:rows.reduce((n,r)=>n+r.failed,0)}));
  fs.mkdirSync('design/balance',{recursive:true});fs.writeFileSync('design/balance/infernal-results.json',JSON.stringify({testedAt:new Date().toISOString(),metadata,results},null,2));
 }
}finally{await browser.close();}})().catch(e=>{console.error(e);process.exitCode=1});
