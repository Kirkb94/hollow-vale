import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
s=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text();exec(s[s.index('def components'):s.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CFG={
'colossus':(['smash','impact','aura','arrival','death'],[],{}),
'guard':(['smash','impact','guard','arrival','death'],[['shield','left',[40,65],[.5,.35]],['hammer','right',[28,68],[.5,.82]]],{}),
'titan':(['smash','impact','aura','arrival','death'],[],{}),
'juggernaut':(['smash','impact','spikes','arrival','death'],[['mace','right',[33,74],[.5,.85]]],{'spikes:hit':{'impact':'spikes'}}),
'thunderking':(['cast','projectile','impact','chain','death'],[['hammer','right',[32,76],[.5,.84]]],{'chain:hit':{'projectile':'chain','impact':'impact'}})}
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/iron'/key;doc=ROOT/'design/animation/iron'/key;im=Image.open(out/'body.png');cs=components(im);(doc/'components.json').write_text(json.dumps(cs,indent=2))
 names=['body','head','leftWing','rightWing'] if key=='wisp' else NAMES
 columns=[sorted([p for p in cs if int((p['rect'][0]+p['rect'][2]/2)/im.width*6)==i],key=lambda p:p['rect'][1]) for i in range(6)]
 m={'version':1,'unit':key,'faction':'iron','style':'Arcane Vanguard','attack':'cast' if key=='thunderking' else 'attack','group':1,'partOrder':names,'directions':DIRS,'views':{},'status':'art-review'}
 if key=='wisp':m['skeleton']='wisp'
 for i,d in enumerate(DIRS):
  pp=columns[i]
  if len(pp)!=12 or key=='juggernaut':
   bands={'colossus':[0,100,222,337,422,545,662,782,895,1020,1153,1236,1359],'titan':[0,87,241,358,466,580,691,810,912,1062,1215,1288,1374],'juggernaut':[0,118,251,399,503,608,701,819,1001,1166,1260,1366],'thunderking':[0,157,281,439,545,636,727,819,912,1041,1189,1267,1374]}[key]
   pp=[]
   for lo,hi in zip(bands,bands[1:]):
    x0=round(i*im.width/6);x1=round((i+1)*im.width/6);bb=im.getchannel('A').crop((x0,lo,x1,hi)).getbbox();assert bb;pp.append({'rect':[x0+bb[0],lo+bb[1],bb[2]-bb[0],bb[3]-bb[1]]})
   if key=='juggernaut':pp.insert(7,pp[6])
   columns[i]=pp
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   r=pp[j]['rect'].copy();flip=False
   if key=='juggernaut' and name=='rightForearm':r=pp[6]['rect'].copy();flip=True
   if key=='thunderking' and d=='nw' and name=='head':r=columns[5][0]['rect'].copy();flip=True
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':True,'flipX':flip}
   sizes={'pelvis':[48,50]}
   if key in ['colossus','titan','juggernaut']:sizes.update({'torso':[60,60],'cape':[50,63],'leftUpperArm':[25,37],'rightUpperArm':[25,37],'leftForearm':[25,40],'rightForearm':[25,40]})
   if name in sizes:view['parts'][name]['displaySize']=sizes[name]
  m['views'][d]=view
 clips,props,events=CFG[key]
 if props:
  eq=Image.open(out/'equipment.png');ep=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:len(props)*6];ep.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);rows=[sorted(ep[j*6:(j+1)*6],key=lambda p:p['rect'][0]) for j in range(len(props))]
  m['equipment']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate(props)} for i,d in enumerate(DIRS)}}
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 fx=Image.open(out/'vfx.png');rects=effect_rects(fx);bindings={'attack':{'cast':clips[0],'impact':'impact','releaseMs':250,'travelMs':0}}
 if key=='thunderking':bindings={'attack':{'cast':'cast','projectile':'projectile','impact':'impact','releaseMs':250,'travelMs':300}}
 if 'arrival' in clips:bindings['spawn']='arrival'
 if 'death' in clips:bindings['death']='death'
 # Plague aura is cosmetic; actual tick damage is a separate event-bound effect.
 if key in ['colossus','titan']:bindings['aura']={'clip':'aura','durationMs':1200,'sizeInHexes':1.2}
 v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':bindings,'statusEvents':events}
 (out/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'built')
