const fs=require('fs');
const{chromium}=require('C:/Users/Uno/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright');
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
const p=await b.newPage(),roster=JSON.parse(fs.readFileSync('design/animation/game-roster.json')),report=[];
await p.goto('http://localhost:4323/animation-preview.html');await p.evaluate(()=>HVRig.ready);
for(const faction of new Set(roster.map(u=>u.faction))){
 const data=await p.evaluate(async units=>{
  const sheet=document.createElement('canvas');sheet.width=960;sheet.height=units.length*140;const ctx=sheet.getContext('2d');ctx.fillStyle='#23353b';ctx.fillRect(0,0,sheet.width,sheet.height);const result=[];
  for(let row=0;row<units.length;row++){
   const k=units[row].id;await HVRig.ensure(k);const model=HVRig.models.get(k);if(!model)throw Error('Missing '+k);
   const poses=[['idle',0],['walk',130],[HVRig.registry[k].attack||'attack',320],['cast',340],['hurt',200],['death',600],['spawn',200]];
   const c=document.createElement('canvas');c.width=320;c.height=240;const issues=[];
   for(let d=0;d<6;d++)for(const[state,t]of poses){
    HVRig.draw(c,k,d,state,t,true);const a=c.getContext('2d').getImageData(0,0,320,240).data;let count=0,edge=0;
    for(let y=0;y<240;y++)for(let x=0;x<320;x++)if(a[(y*320+x)*4+3]>64){count++;if(x===0||y===0||x===319||y===239)edge++;}
    if(!count||edge)issues.push({direction:d,state,pixels:count,edge});
    if(state===poses[2][0]){ctx.drawImage(c,d*160,row*140+20,160,120);ctx.fillStyle='#eedeb0';ctx.font='12px sans-serif';ctx.fillText(k+' '+HVRig.directions[d],d*160+5,row*140+15);}
   }result.push({unit:k,poses:42,issues});
  }return{result,png:sheet.toDataURL().split(',')[1]};
 },roster.filter(u=>u.faction===faction));
 fs.writeFileSync(`design/animation/rig-audit-${faction}.png`,Buffer.from(data.png,'base64'));report.push(...data.result);console.log(faction,JSON.stringify(data.result.filter(x=>x.issues.length)));
}
fs.writeFileSync('design/animation/rig-pose-audit.json',JSON.stringify({testedAt:new Date().toISOString(),report},null,2));
}finally{await b.close();}})().catch(e=>{console.error(e);process.exitCode=1});
