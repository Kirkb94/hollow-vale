const assert=require('node:assert/strict');
const {chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto('http://localhost:4323/?fast');
 const r=await p.evaluate(()=>{
  RP=true;HOST=false;NET=null;render=()=>{};runAI=()=>{};window.setTimeout=()=>0;
  startGame({n:2,seat:{p:'h',e:'h'},me:'p',seed:123,picks:{p:['knight'],e:['imps','knight']},opts:{map:'classic'}});
  MOPT.levels=true;MOPT.sight=false;MOPT.fog=false;
  const u=mk('knight','p',4,4),steps=[];
  for(let i=0;i<15;i++){levelUp(u,{k:'imps'});steps.push({xp:u.xpThirds,star:u.star||0,text:heroXP(u)})}
  const mixed=mk('knight','p',4,4);levelUp(mixed,{k:'knight'});for(let i=0;i<3;i++)levelUp(mixed,{k:'imps'});
  const all=Object.keys(H).filter(k=>H[k].group>1).map(k=>{const a=mk('knight','p',4,4);levelUp(a,{k});return[k,a.xpThirds]});
  const legacy=mk('knight','p',4,4);legacy.kills=1;levelUp(legacy,{k:'imps'});
  const delayed=mk('knight','p',4,4);hvKC({k:'imps',side:'e',kbU:delayed,x:5,y:4});
  const vpos=GEO.cells.find(c=>dist(u,c)===1&&!twAt(c.x,c.y));
  const attacker=mk('knight','p',4,4),victim=mk('imps','e',vpos.x,vpos.y);victim.hp=1;S.units=[attacker,victim];
  S.ter['4,4']='grass';S.ter[vpos.x+','+vpos.y]='grass';
  const target=targets(attacker).find(t=>t.v===victim);if(!target)throw Error('Missing attack target');act(attacker,target);
  const off=mk('knight','p',4,4);MOPT.levels=false;levelUp(off,{k:'imps'});
  return{steps,mixed:{xp:mixed.xpThirds,star:mixed.star},all,legacy:legacy.xpThirds,delayed:delayed.xpThirds,direct:attacker.xpThirds,off:off.xpThirds??0};
 });
 assert.equal(r.steps[0].text,'⅓');assert.equal(r.steps[2].text,'1');
 assert.equal(r.steps[4].star,0);assert.equal(r.steps[5].star,1);
 assert.equal(r.steps[13].star,1);assert.equal(r.steps[14].star,2);
 assert.deepEqual(r.mixed,{xp:6,star:1});assert(r.all.length>0&&r.all.every(([,xp])=>xp===1));
 assert.equal(r.legacy,4);assert.equal(r.delayed,1);assert.equal(r.direct,1);assert.equal(r.off,0);
 console.log('PASS: all '+r.all.length+' squad types, exact thresholds, mixed kills, legacy progress, direct and delayed kill credit, levels disabled.');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
