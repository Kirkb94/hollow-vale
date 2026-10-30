import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
s=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text();exec(s[s.index('def components'):s.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CFG={
'treant':(['smash','impact','regrowth','arrival','death'],[],{'regrowth:heal':{'impact':'regrowth'}}),
'eldertreant':(['smash','impact','root','regrowth','death'],[],{'root:apply':{'impact':'root'},'regrowth:heal':{'impact':'regrowth'}}),
'sprites':(['cast','projectile','impact','regrowth','death'],[['wand','right',[10,60],[.5,.8]]],{'regrowth:heal':{'impact':'regrowth'}})}
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/wilds'/key;doc=ROOT/'design/animation/wilds'/key;im=Image.open(out/'body.png');cs=components(im);(doc/'components.json').write_text(json.dumps(cs,indent=2))
 names=['body','head','leftWing','rightWing'] if key=='wisp' else NAMES
 columns=[sorted([p for p in cs if int((p['rect'][0]+p['rect'][2]/2)/im.width*6)==i],key=lambda p:p['rect'][1]) for i in range(6)]
 m={'version':1,'unit':key,'faction':'wilds','style':'Arcane Vanguard','attack':'cast' if key=='sprites' else 'attack','group':3 if key=='sprites' else 1,'partOrder':names,'directions':DIRS,'views':{},'status':'art-review'}
 if key=='wisp':m['skeleton']='wisp'
 for i,d in enumerate(DIRS):
  pp=columns[i]
  if key=='treant' and d=='nw':
   pp=pp[:5]+[{'rect':[680,622,126,104]},{'rect':[680,727,126,124]}]+pp[6:]
  if key=='sprites' and d in ['se','sw']:
   r0=pp[0]['rect'];pp=[{'rect':[r0[0],r0[1],r0[2],180]},{'rect':[r0[0],194,r0[2],152]}]+pp[1:]
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   r=pp[j]['rect'].copy();flip=False
   if key=='sprites' and name=='torso':r[3]=int(r[3]*.67)
   if key=='sprites' and name=='cape':r=[r[0]+int(r[2]*.35),r[1],int(r[2]*.3),int(r[3]*.6)]
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':True,'flipX':False}
   if key in ['treant','eldertreant']:
    sizes={'head':[54,62],'torso':[52,60],'cape':[45,70],'pelvis':[42,48],'leftUpperArm':[23,35],'rightUpperArm':[23,35],'leftForearm':[23,37],'rightForearm':[23,37]}
   else:sizes={'cape':[22,38],'pelvis':[40,48]}
   if name in sizes:view['parts'][name]['displaySize']=sizes[name]
  m['views'][d]=view
 clips,props,events=CFG[key]
 if props:
  eq=Image.open(out/'equipment.png');ep=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:18];ep.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);rows=[sorted(ep[j*6:(j+1)*6],key=lambda p:p['rect'][0]) for j in range(3)]
  m['equipment']={'file':'equipment.png','views':{d:{'wand':{'sourceRect':rows[2][i]['rect'],'hand':'right','displaySize':[10,60],'pivot':[.5,.8]}} for i,d in enumerate(DIRS)}}
  m['extras']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j][i]['rect'],'pivot':[.9,.15] if j==0 else [.1,.15],'anchor':[74 if j==0 else 86,64],'displaySize':[64,76],'layer':'behind','motion':'wing','phase':j} for j,name in enumerate(['leftWing','rightWing'])} for i,d in enumerate(DIRS)}}
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 fx=Image.open(out/'vfx.png');rects=effect_rects(fx);bindings={'attack':{'cast':clips[0],'impact':'impact','releaseMs':250,'travelMs':0}}
 if key=='sprites':bindings={'attack':{'cast':'cast','projectile':'projectile','impact':'impact','releaseMs':250,'travelMs':300}}
 if 'arrival' in clips:bindings['spawn']='arrival'
 if 'death' in clips:bindings['death']='death'
 # Plague aura is cosmetic; actual tick damage is a separate event-bound effect.
 if key in ['magmagolem','pitlord']:bindings['aura']={'clip':'aura','durationMs':1200,'sizeInHexes':1.2}
 v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':bindings,'statusEvents':events}
 (out/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'built')
