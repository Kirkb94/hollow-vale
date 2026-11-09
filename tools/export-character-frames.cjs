// Authoring-only conversion. The game consumes flattened sheets, never these parts.
const fs=require('node:fs'),path=require('node:path');
const {chromium}=require(path.join(process.env.USERPROFILE,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));
const root=path.resolve(__dirname,'..'),out=path.join(root,'public/art/frames');fs.mkdirSync(out,{recursive:true});
const roster=JSON.parse(fs.readFileSync(path.join(root,'design/animation/game-roster.json'),'utf8'));
const states={idle:{duration:1600,loop:true},walk:{duration:534,loop:true},attack:{duration:800},cast:{duration:800},shoot:{duration:800},thrust:{duration:800},hurt:{duration:450},death:{duration:1100},spawn:{duration:600}};
(async()=>{const b=await chromium.launch({channel:'msedge',headless:true});try{
 const p=await b.newPage();await p.goto('http://localhost:4323/frame-authoring.html');await p.evaluate(()=>HVRig.ready);
 const catalog={version:1,facing:'se',frameWidth:256,frameHeight:192,columns:8,states,units:{}};
 const previous=fs.existsSync(path.join(out,'catalog.json'))?JSON.parse(fs.readFileSync(path.join(out,'catalog.json'),'utf8')):{units:{}};
 const keys=await p.evaluate(()=>Object.keys(HVRig.registry));
 for(let at=0;at<keys.length;at++){
  const key=keys[at];if(previous.units[key]?.artwork==='new-whole-character'){catalog.units[key]=previous.units[key];continue;}const result=await p.evaluate(async({key,states})=>{
   if(!await HVRig.ensure(key))throw Error(key+': '+HVRig.failures[key]);
   const config=HVRig.registry[key],meta=HVRig.models.get(key)?.meta;
   const sheet=document.createElement('canvas');sheet.width=2048;sheet.height=192*9;
   const ctx=sheet.getContext('2d'),frame=document.createElement('canvas');frame.width=256;frame.height=192;
   for(const [row,[state,clip]]of Object.entries(states).entries())for(let f=0;f<8;f++){
    // Endpoint for one-shots, no duplicate endpoint for loops.
    HVRig.draw(frame,key,1,state,clip.duration*f/(clip.loop?8:7),true);
    ctx.drawImage(frame,f*256,row*192);
   }
   return {png:sheet.toDataURL('image/webp',.94).split(',')[1],config,group:meta?.group||1,variants:Object.keys(HVRig.registry)};
  },{key,states});
  fs.writeFileSync(path.join(out,key+'.webp'),Buffer.from(result.png,'base64'));
  const unit=roster.find(u=>u.id===key);
  catalog.units[key]={...result.config,name:unit?.name||result.config.name||key,faction:unit?.faction||result.config.faction||result.config.folder.split('/')[0],file:key+'.webp',group:unit?.group||result.group};
  for(const k of result.variants)if(!keys.includes(k))keys.push(k);
  if((at+1)%10===0)console.log('Exported '+(at+1)+' / '+keys.length+' complete-character sheets');
 }
 fs.writeFileSync(path.join(out,'catalog.json'),JSON.stringify(catalog,null,2));console.log('Complete: '+keys.length+' sheets / '+keys.length*72+' frames');
}finally{await b.close()}})().catch(e=>{console.error(e);process.exitCode=1});
