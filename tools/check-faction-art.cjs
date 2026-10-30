/* Release gate: a full faction requires every roster unit, not one pilot. */
'use strict';
const fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..'),art=path.join(root,'public/art/rigs');
const directions=['e','se','sw','w','nw','ne'];
const names=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot'];
const read=p=>JSON.parse(fs.readFileSync(p,'utf8'));
function imageSize(file){const b=fs.readFileSync(file);if(b.toString('hex',0,8)!=='89504e470d0a1a0a')throw Error('Not PNG: '+file);return [b.readUInt32BE(16),b.readUInt32BE(20)];}
function resolveAsset(base,file){if(typeof file!=='string')throw Error('Missing asset file');const p=path.resolve(base,file);if(!p.startsWith(art+path.sep))throw Error('Asset outside rig folder');return p;}
function rect(r,size,label){if(!Array.isArray(r)||r.length!==4||r.some(n=>!Number.isFinite(n))||r[0]<0||r[1]<0||r[2]<=0||r[3]<=0||r[0]+r[2]>size[0]||r[1]+r[3]>size[1])throw Error('Invalid '+label+' rectangle');}
function inspect(id,config){
  if(!config)throw Error('Not integrated in catalog');
  const base=resolveAsset(art,config.folder),m=read(resolveAsset(base,config.manifest));
  const external=m.sourceRects?read(resolveAsset(base,m.sourceRects)):null;
  for(const d of directions){
    const view=m.views?.[d],file=view?.file||m.atlases?.[d];if(!file)throw Error('Missing facing '+d);
    const size=imageSize(resolveAsset(base,file));
    for(const [i,n]of (['bat','wisp','quadruped','dragon','bird','imp'].includes(m.skeleton)?m.partOrder:names).entries()){const part=view?.parts?.[n],r=part?.renderRect||part?.sourceRect||external?.rects?.[d]?.[i];if(!r)throw Error('Missing '+d+'/'+n);rect(r,part?.file?imageSize(resolveAsset(base,part.file)):size,d+'/'+n);}
  }
  const fxFile=config.effects||'vfx.json',fx=read(resolveAsset(base,fxFile));
  imageSize(resolveAsset(path.dirname(resolveAsset(base,fxFile)),fx.file||fx.image));
  if(!Object.keys(fx.clips||{}).length)throw Error('No effect clips');
  const evidence=path.join(root,'design/animation',m.faction||config.folder.split('/')[0],id,'validation.json');
  if(!fs.existsSync(evidence))throw Error('Missing per-unit visual and gameplay validation');
  const qa=read(evidence);
  for(const check of ['sixFacings','movableParts','equipment','effects','gameplay','pause','visibility','zoom'])if(qa[check]!==true)throw Error('Incomplete validation: '+check);
  return {id,facings:6,effects:Object.keys(fx.clips),validation:evidence};
}
if(require.main===module){
  const faction=process.argv[2];if(!faction){console.error('Usage: node tools/check-faction-art.cjs <faction>');process.exit(2);}
  const roster=read(path.join(root,'design/animation/game-roster.json')).filter(u=>u.faction===faction);
  if(!roster.length)throw Error('Unknown faction '+faction);
  const catalog=read(path.join(art,'catalog.json')).units;
  const legacy={knight:{folder:'kingdom/knight',manifest:'manifest.json',effects:'vfx.json'},blade:{folder:'vamp',manifest:'blade-rig.json',effects:'blade-vfx.json'},necromancer:{folder:'undead',manifest:'necromancer.rig.json',effects:'necromancer-fx.json'},mage:{folder:'infernal/mage',manifest:'manifest.json',effects:'vfx.json'}};
  const report=roster.map(u=>{try{return {...inspect(u.id,catalog[u.id]||legacy[u.id]),ok:true};}catch(e){return {id:u.id,ok:false,reason:e.message};}});
  console.log(JSON.stringify({faction,total:roster.length,passed:report.filter(r=>r.ok).length,report},null,2));
  if(report.some(r=>!r.ok))process.exitCode=1;
}
module.exports={inspect,rect,imageSize};
