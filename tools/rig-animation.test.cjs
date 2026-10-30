const {test}=require('node:test');
const assert=require('node:assert/strict');
const {direction,pose}=require('../public/rig-animation.js');
test('all six neighbors map to separate facings for both row parities',()=>{
  for(const a of [{x:4,y:4},{x:4,y:5}]){
    const parity=a.y&1,neighbors=[{x:5,y:a.y},{x:4+parity,y:a.y+1},{x:3+parity,y:a.y+1},{x:3,y:a.y},{x:3+parity,y:a.y-1},{x:4+parity,y:a.y-1}];
    assert.deepEqual(neighbors.map(b=>direction(a,b)),[0,1,2,3,4,5]);assert.equal(direction(a,a,4),4);
  }
});
test('walk alternates legs, cast recovers, death is finite and fades',()=>{
  assert.ok(pose('walk',Math.PI*85/2).stride>.99);assert.ok(pose('walk',Math.PI*85*1.5).stride<-.99);
  assert.equal(pose('cast',350).cast,1);assert.equal(pose('cast',900).cast,0);
  assert.equal(pose('death',1200).alpha,0);assert.equal(pose('death',1200).fall,1);
  for(const action of ['idle','walk','cast','hurt','death','spawn'])for(const t of [-1,0,100,450,900,3000])assert.ok(Object.values(pose(action,t)).every(Number.isFinite));
});
