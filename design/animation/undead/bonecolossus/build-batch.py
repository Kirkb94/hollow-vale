import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
s=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text();exec(s[s.index('def components'):s.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CFG={
 'bonecolossus':(['smash','impact','ossuary','arrival','death'],[],{'ossuary:spawn':{'impact':'ossuary'}}),
 'deathknight':(['slash','impact','wither','arrival','death'],[['greatsword','right',[23,80],[.5,.83]]],{'wither:apply':{'impact':'wither'}}),
 'plaguelord':(['strike','impact','plague','aura','death'],[['staff','right',[25,85],[.5,.65]],['censer','left',[20,46],[.5,.06]]],{'plague:tick':{'impact':'plague'}}),
 'wisp':(['projectile','impact','flare','mark','arrival'],[],{})}
PLAGUE=[[5,10,17,18,24,25,39,39,42,47,53,62],[1,6,13,23,26,35,26,40,44,48,56,60],[3,7,14,19,27,28,36,28,28,49,57,59],[4,8,15,20,29,30,41,41,43,50,54,61],[2,11,12,21,31,32,38,38,45,51,58,63],[0,9,16,22,33,34,37,37,46,52,55,64]]
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/undead'/key;doc=ROOT/'design/animation/undead'/key;im=Image.open(out/'body.png');cs=components(im);(doc/'components.json').write_text(json.dumps(cs,indent=2))
 names=['body','head','leftWing','rightWing'] if key=='wisp' else NAMES
 columns=[sorted([p for p in cs if int((p['rect'][0]+p['rect'][2]/2)/im.width*6)==i],key=lambda p:p['rect'][1]) for i in range(6)]
 if key=='deathknight':
  bands=[0,143,288,500,636,760,858,947,1055,1210,1342,1438,im.height]
  for ci in range(6):
   fixed=[]
   for lo,hi in zip(bands,bands[1:]):
    r=max(columns[ci],key=lambda p:max(0,min(hi,p['rect'][1]+p['rect'][3])-max(lo,p['rect'][1]))*p['rect'][2])['rect'];y=max(lo,r[1]);bottom=min(hi,r[1]+r[3]);fixed.append({'rect':[r[0],y,r[2],bottom-y]})
   columns[ci]=fixed
 if key=='bonecolossus':
  columns[2][6:7]=[{'rect':[389,748,75,129]},{'rect':[389,881,75,126]}]
  columns[3][8:9]=[{'rect':[557,1003,79,168]},{'rect':[557,1175,79,161]}]
 m={'version':1,'unit':key,'faction':'undead','style':'Arcane Vanguard','attack':'cast' if key=='wisp' else 'attack','group':1,'partOrder':names,'directions':DIRS,'views':{},'status':'art-review'}
 if key=='wisp':m['skeleton']='wisp'
 for i,d in enumerate(DIRS):
  pp=[cs[j] for j in PLAGUE[i]] if key=='plaguelord' else columns[i]
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   r=pp[j]['rect'].copy();flip=False
   if key=='bonecolossus' and name=='head' and d=='nw':r=columns[5][0]['rect'].copy();flip=True
   if key=='bonecolossus' and name=='rightForearm' and d=='se':r=pp[6]['rect'].copy();flip=True
   if key=='deathknight' and name=='leftLeg':r=pp[9]['rect'].copy();flip=True
   if key=='deathknight' and name in ['leftLeg','rightLeg']:r[3]=round(r[3]*.80)
   if key=='plaguelord':
    if i==1 and name=='leftUpperArm':r[3]=76
    if i==1 and name=='leftForearm':r[1]+=72;r[3]-=72
    if i==2 and name=='rightUpperArm':r[3]=78
    if i==2 and name=='rightForearm':r=[667,644,60,87]
    if i==2 and name=='leftLeg':r=[626,719,60,88]
    if i in [0,3,4,5] and name=='rightForearm':flip=True
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':key!='wisp','flipX':flip}
   if key=='bonecolossus' and name=='pelvis':view['parts'][name]['displaySize']=[40,22]
  m['views'][d]=view
 clips,props,events=CFG[key]
 if props:
  eq=Image.open(out/'equipment.png');ep=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:len(props)*6];ep.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);rows=[sorted(ep[j*6:(j+1)*6],key=lambda p:p['rect'][0]) for j in range(len(props))]
  m['equipment']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate(props)} for i,d in enumerate(DIRS)}}
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 fx=Image.open(out/'vfx.png');rects=effect_rects(fx);bindings={'attack':{'cast':clips[0],'impact':'impact','releaseMs':250,'travelMs':0}}
 if key=='wisp':bindings={'attack':{'projectile':'projectile','impact':'impact','releaseMs':250,'travelMs':300},'abilities':{'flare':{'cast':'flare','impact':'mark'}}}
 if 'arrival' in clips:bindings['spawn']='arrival'
 if 'death' in clips:bindings['death']='death'
 # Plague aura is cosmetic; actual tick damage is a separate event-bound effect.
 if key=='plaguelord':bindings['aura']={'clip':'aura','durationMs':1200,'sizeInHexes':1.2}
 v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':bindings,'statusEvents':events}
 (out/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'built')
