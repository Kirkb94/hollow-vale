const {test}=require('node:test');
const assert=require('node:assert/strict');
const {pose,armAngles,armTransform}=require('../public/rig-animation.js');
test('slanted and mirrored cutouts attach tip exactly to the next joint',()=>{
  for(const root of [[.8,.12],[.2,.1],[.5,.15]])for(const tip of [[.2,.87],[.85,.8],[.5,.79]])for(const flipX of [false,true]){
    const a=armTransform({root,tip},20,35,27,flipX);
    const x=(tip[0]-root[0])*20*a.flip*a.scale,y=(tip[1]-root[1])*35*a.scale;
    assert(Math.abs(x*Math.cos(a.angle)-y*Math.sin(a.angle))<1e-9,'Elbow/hand drifts sideways');
    assert(Math.abs(x*Math.sin(a.angle)+y*Math.cos(a.angle)-27)<1e-9,'Elbow/hand detaches');
  }
});
test('Demon Prince wings root at the shoulder and open away from the torso in six facings',()=>{
  const views=require('../public/art/rigs/infernal/demonprince/manifest.json').extras.views;
  for(const pair of Object.values(views))for(const w of Object.values(pair)){
    assert(w.pivot[1]>.7,'Wing is attached at its upper bend instead of shoulder root');
    assert((w.pivot[0]>.5)===(w.anchor[0]<80),'Wing membrane points across the torso');
    assert.equal(w.motionSign,w.anchor[0]<80?-1:1);
    assert(Math.abs(w.displaySize[0]/w.displaySize[1]-w.sourceRect[2]/w.sourceRect[3])<1e-9,'Wing artwork is stretched');
  }
});
test('elbows never reverse flex during attack wind-up in any facing',()=>{
  for(let dir=0;dir<6;dir++)for(const left of [false,true]){
    const sign=[1,1,-1,-1,-1,1][dir];
    for(const state of ['idle','walk','attack','cast','shoot','thrust','hurt','death','spawn'])for(let t=0;t<=1100;t+=10){
      const p=pose(state,t),a=armAngles(dir,left,p);
      assert(a.elbow*sign<=0,`${dir}/${left}/${state}/${t}: elbow hyperextension`);
      assert(Math.abs(a.elbow)<=Math.PI/2,'Elbow exceeds anatomical flex range');
      assert(Object.values(a).every(Number.isFinite));
    }
    const windup=armAngles(dir,left,pose('attack',200));
    assert(windup.elbow*sign<0,'Wind-up must retain forward elbow flex');
  }
});
test('corrected elbow preserves equipment orientation through the swing',()=>{
  for(let dir=0;dir<6;dir++)for(const left of [false,true])for(const firearm of [false,true])for(let t=0;t<=800;t+=10){
    const p=pose('attack',t),a=armAngles(dir,left,p,firearm),sign=[1,1,-1,-1,-1,1][dir];
    const previousFlex=a.cast*.35+(left?p.attack*.2:p.attack)*.35;
    assert(Math.abs(a.elbow+a.gripCorrection+sign*previousFlex)<1e-10,'Weapon roll changed');
    if(p.attack>=0)assert(a.gripCorrection===0,'Strike and recovery should be unchanged');
  }
});

