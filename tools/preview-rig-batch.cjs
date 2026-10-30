/* Render real runtime poses for human visual review; never marks a unit approved. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
let playwright;try{playwright=require('playwright');}catch{playwright=require(path.join(process.env.USERPROFILE||process.env.HOME,'.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright'));}
const root=path.resolve(__dirname,'..'),keys=process.argv.slice(2);
if(!keys.length){console.error('Usage: node tools/preview-rig-batch.cjs unit [unit...]');process.exit(2);}
(async()=>{
  const browser=await playwright.chromium.launch({channel:process.env.RIG_BROWSER||'msedge',headless:true});
  try{
    const page=await browser.newPage({viewport:{width:1440,height:1100}}),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.goto(process.env.HV_TEST_URL||'http://localhost:4323/animation-preview.html');
    await page.evaluate(()=>HVRig.ready);
    const roster=JSON.parse(fs.readFileSync(path.join(root,'design/animation/game-roster.json'),'utf8'));
    for(const key of keys){
      const unit=roster.find(u=>u.id===key);if(!unit)throw Error('Unknown unit '+key);
      const result=await page.evaluate(async({key,faction,name})=>{
        const config=HVRig.registry[key]||{folder:faction+'/'+key,manifest:'manifest.json'};
        if(!await HVRig.register(key,config))throw Error(HVRig.failures[key]);
        const attack=HVRig.registry[key].attack||'attack';
        const poses=[['idle',0],['walk',130],[attack,320],['cast',340],['hurt',200],['death',600],['spawn',200]];
        document.querySelector('#batch-proof')?.remove();
        const proof=document.createElement('section');proof.id='batch-proof';proof.style.cssText='position:absolute;inset:0 auto auto 0;width:1440px;z-index:9999;background:#1b2730;padding:20px;box-sizing:border-box;color:#fff';
        const title=document.createElement('h1');title.textContent=name+' — runtime pose review';proof.append(title);
        const report=[];
        for(const[state,t]of poses){
          const row=document.createElement('div');row.style.cssText='display:grid;grid-template-columns:repeat(6,1fr);gap:8px';
          for(let d=0;d<6;d++){
            const cell=document.createElement('div');cell.style.cssText='background:#30443d;border:1px solid #697b70;text-align:center';
            const label=document.createElement('div');label.textContent=HVRig.directions[d]+' · '+state;
            const canvas=document.createElement('canvas');canvas.width=320;canvas.height=240;canvas.style.cssText='width:100%;display:block';
            HVRig.draw(canvas,key,d,state,t);cell.append(label,canvas);row.append(cell);
            const px=canvas.getContext('2d').getImageData(0,0,320,240).data;let opaque=0,border=0;
            for(let y=0;y<240;y++)for(let x=0;x<320;x++)if(px[(y*320+x)*4+3]>64){opaque++;if(x===0||x===319||y===0||y===239)border++;}
            if(!opaque)throw Error('Empty pose '+key+'/'+d+'/'+state);
            report.push({direction:HVRig.directions[d],state,opaquePixels:opaque,borderPixels:border});
          }proof.append(row);
        }
        document.body.append(proof);return {unit:key,attack,poses:report,equipment:HVRig.models.get(key).equipment.map(a=>a.map(e=>e.name))};
      },{key,faction:unit.faction,name:unit.name});
      const out=path.join(root,'design/animation',unit.faction,key);fs.mkdirSync(out,{recursive:true});
      await page.locator('#batch-proof').screenshot({path:path.join(out,'runtime-poses.png')});
      fs.writeFileSync(path.join(out,'runtime-check.json'),JSON.stringify({...result,errors,visualReview:'pending'},null,2)+'\n');
      console.log(JSON.stringify({unit:key,poses:result.poses.length,border:result.poses.filter(p=>p.borderPixels>0),errors}));
    }
    if(errors.length)process.exitCode=1;
  }finally{await browser.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
