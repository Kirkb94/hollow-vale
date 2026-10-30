import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
s=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text();exec(s[s.index('def components'):s.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CFG={
'magmagolem':(['smash','impact','aura','arrival','death'],[],{}),
'pitlord':(['slash','impact','immolation','aura','death'],[['cleaver','right',[30,74],[.5,.86]]],{'immolation:tick':{'impact':'immolation'}}),
'demonprince':(['slash','impact','hellgate','arrival','death'],[['sword','right',[21,78],[.5,.84]],['rune','left',[25,25],[.5,.5]]],{'hellgate:spawn':{'impact':'hellgate'}})}
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/infernal'/key;doc=ROOT/'design/animation/infernal'/key;im=Image.open(out/'body.png');cs=components(im);(doc/'components.json').write_text(json.dumps(cs,indent=2))
 names=['body','head','leftWing','rightWing'] if key=='wisp' else NAMES
 columns=[sorted([p for p in cs if int((p['rect'][0]+p['rect'][2]/2)/im.width*6)==i],key=lambda p:p['rect'][1]) for i in range(6)]
 m={'version':1,'unit':key,'faction':'infernal','style':'Arcane Vanguard','attack':'cast' if key=='wisp' else 'attack','group':1,'partOrder':names,'directions':DIRS,'views':{},'status':'art-review'}
 if key=='wisp':m['skeleton']='wisp'
 for i,d in enumerate(DIRS):
  pp=columns[i]
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   r=pp[j]['rect'].copy();flip=False
   if key=='demonprince' and name=='rightLeg':r=pp[8]['rect'].copy();flip=True
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':key!='wisp','flipX':flip}
   if key=='magmagolem':
    sizes={'torso':[52,60],'cape':[43,45],'pelvis':[40,50],'leftUpperArm':[22,38],'rightUpperArm':[22,38],'leftForearm':[24,42],'rightForearm':[24,42]}
    if name in sizes:view['parts'][name]['displaySize']=sizes[name]
   if key=='pitlord' and name=='pelvis':view['parts'][name]['displaySize']=[40,38]
  m['views'][d]=view
 clips,props,events=CFG[key]
 if props:
  eq=Image.open(out/'equipment.png');ep=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:24 if key=='demonprince' else len(props)*6];ep.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);rows=[sorted(ep[j*6:(j+1)*6],key=lambda p:p['rect'][0]) for j in range(4 if key=='demonprince' else len(props))]
  m['equipment']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j+2 if key=='demonprince' else j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate(props)} for i,d in enumerate(DIRS)}}
 if key=='demonprince':
  m['extras']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j][i]['rect'],'pivot':[.9,.12] if j==0 else [.1,.12],'anchor':[72 if j==0 else 88,64],'displaySize':[65,78],'layer':'behind','motion':'wing','phase':j} for j,name in enumerate(['leftWing','rightWing'])} for i,d in enumerate(DIRS)}}
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 fx=Image.open(out/'vfx.png');rects=effect_rects(fx);bindings={'attack':{'cast':clips[0],'impact':'impact','releaseMs':250,'travelMs':0}}
 if key=='wisp':bindings={'attack':{'projectile':'projectile','impact':'impact','releaseMs':250,'travelMs':300},'abilities':{'flare':{'cast':'flare','impact':'mark'}}}
 if 'arrival' in clips:bindings['spawn']='arrival'
 if 'death' in clips:bindings['death']='death'
 # Plague aura is cosmetic; actual tick damage is a separate event-bound effect.
 if key in ['magmagolem','pitlord']:bindings['aura']={'clip':'aura','durationMs':1200,'sizeInHexes':1.2}
 v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':bindings,'statusEvents':events}
 (out/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'built')
