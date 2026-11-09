const {test}=require('node:test'),assert=require('node:assert/strict');
const {wingLayer}=require('../public/rig-animation.js');
const {drawOrder}=require('../public/creature-rigs.js');
test('rear wings cover the back, front wings stay behind, side wings straddle the body',()=>{
 for(const d of [4,5])for(const x of [72,88])assert.equal(wingLayer(d,x),'shoulders');
 for(const d of [1,2])for(const x of [72,88])assert.equal(wingLayer(d,x),'behind');
 assert.equal(wingLayer(0,72),'shoulders');assert.equal(wingLayer(0,88),'behind');
 assert.equal(wingLayer(3,72),'behind');assert.equal(wingLayer(3,88),'shoulders');
});
test('dragon wing depth follows facing without losing or duplicating parts',()=>{
 const m=require('../public/art/rigs/infernal/dragon/manifest.json');
 m.directions.forEach((d,i)=>{const view=m.creature.views[d],original=view.order.slice(),order=drawOrder(view,i,'dragon');
  assert.deepEqual([...order].sort(),[...original].sort());assert.deepEqual(view.order,original);
  const wings=order.filter(n=>view.parts[n].motion==='wing');
  for(const n of wings){const front=i>=4||(view.parts[n].anchor[0]>=0)===(i<=1);assert.equal(order.indexOf(n)>order.indexOf('body'),front);}
  assert(order.indexOf('head')>order.indexOf('body'));
 });
});
