const assert=require('node:assert/strict'),fs=require('node:fs');
const corrections=require('../design/animation/wing-attachment-corrections.json');
for(const[key,fix]of Object.entries(corrections)){
 const m=JSON.parse(fs.readFileSync(`public/art/rigs/${key}/manifest.json`));
 for(const d of m.directions){
  const wings=fix.creature?m.creature.views[d].parts:m.extras.views[d];
  const sides=[];
  for(const name of ['leftWing','rightWing']){
   const w=wings[name],left=(w.pivot[0]>.5)!==!!w.flipX;
   sides.push(left);
   assert.equal(w.anchor[0]<(fix.creature?0:80),left,`${key}/${d}/${name}: root attached to wrong shoulder`);
   assert.equal(w.motionSign,left?-1:1);
   const source=fix.creature?m.views[d].parts[name]:w,rect=source.renderRect||source.sourceRect;
   assert(Math.abs(w.displaySize[0]/w.displaySize[1]-rect[2]/rect[3])<.001,`${key}: distorted wing`);
  }
  assert.notEqual(...sides,`${key}/${d}: both wings point to the same side`);
 }
}
const sprite=require('../public/art/rigs/wilds/sprites/manifest.json').extras.views.nw;
assert(sprite.leftWing.pivot[0]<.1&&sprite.rightWing.pivot[0]>.9);
assert(sprite.leftWing.pivot[1]>.5&&sprite.rightWing.pivot[1]>.5);
console.log('Seven corrected wing rigs: all six facings have opposing shoulder roots and preserved proportions.');
