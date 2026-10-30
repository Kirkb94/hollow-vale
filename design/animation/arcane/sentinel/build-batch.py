import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
s=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text();exec(s[s.index('def components'):s.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CFG={
'sentinel':(['smash','impact','aura','arrival','death'],[],{}),
'spellblade':(['slash','impact','aura','arrival','death'],[['sword','right',[17,80],[.5,.85]],['orb','left',[22,22],[.5,.5]]],{}),
'chronomancer':(['cast','projectile','impact','aura','death'],[['staff','right',[27,103],[.5,.7]]],{}),
'voidlord':(['cast','projectile','impact','mana','death'],[['staff','right',[20,103],[.5,.7]],['orb','left',[27,27],[.5,.5]]],{'mana:burn':{'impact':'mana'}}),
'mirrormage':(['cast','projectile','impact','reflect','death'],[['mirror','right',[27,64],[.5,.83]]],{'reflect:hit':{'projectile':'reflect','impact':'impact'}}),
'runekeeper':(['smash','impact','ward','arrival','death'],[['shield','left',[40,65],[.5,.35]],['hammer','right',[29,74],[.5,.84]]],{'ward:block':{'impact':'ward'}})}
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/arcane'/key;doc=ROOT/'design/animation/arcane'/key;im=Image.open(out/'body.png');cs=components(im);(doc/'components.json').write_text(json.dumps(cs,indent=2))
 names=['body','head','leftWing','rightWing'] if key=='wisp' else NAMES
 columns=[sorted([p for p in cs if int((p['rect'][0]+p['rect'][2]/2)/im.width*6)==i],key=lambda p:p['rect'][1]) for i in range(6)]
 m={'version':1,'unit':key,'faction':'arcane','style':'Arcane Vanguard','attack':'cast' if key in ['chronomancer','voidlord','mirrormage'] else 'attack','group':1,'partOrder':names,'directions':DIRS,'views':{},'status':'art-review'}
 if key=='wisp':m['skeleton']='wisp'
 for i,d in enumerate(DIRS):
  pp=columns[i]
  if key=='sentinel' and len(pp)!=12:
   bands=[0,118,247,388,468,563,647,763,874,1037,1206,1288,1393];pp=[]
   for lo,hi in zip(bands,bands[1:]):
    x0=round(i*im.width/6);x1=round((i+1)*im.width/6);bb=im.getchannel('A').crop((x0,lo,x1,hi)).getbbox();pp.append({'rect':[x0+bb[0],lo+bb[1],bb[2]-bb[0],bb[3]-bb[1]]})
  if key=='spellblade' and d in ['se','sw']:
   r0=pp[0]['rect'];pp=[{'rect':[r0[0],r0[1],r0[2],96]},{'rect':[r0[0],106,r0[2],107]}]+pp[1:]
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   r=pp[j]['rect'].copy();flip=False
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':True,'flipX':False}
   sizes={}
   if key=='sentinel':sizes={'pelvis':[45,50],'torso':[55,60],'cape':[48,65]}
   if name in sizes:view['parts'][name]['displaySize']=sizes[name]
  m['views'][d]=view
 clips,props,events=CFG[key]
 if props:
  eq=Image.open(out/'equipment.png');ep=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:len(props)*6];ep.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);rows=[sorted(ep[j*6:(j+1)*6],key=lambda p:p['rect'][0]) for j in range(len(props))]
  m['equipment']={'file':'equipment.png','views':{d:{name:{'sourceRect':rows[j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate(props)} for i,d in enumerate(DIRS)}}
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 fx=Image.open(out/'vfx.png');rects=effect_rects(fx);bindings={'attack':{'cast':clips[0],'impact':'impact','releaseMs':250,'travelMs':0}}
 if key in ['chronomancer','voidlord','mirrormage']:bindings={'attack':{'cast':'cast','projectile':'projectile','impact':'impact','releaseMs':250,'travelMs':300}}
 if 'arrival' in clips:bindings['spawn']='arrival'
 if 'death' in clips:bindings['death']='death'
 # Plague aura is cosmetic; actual tick damage is a separate event-bound effect.
 if key in ['sentinel','spellblade','chronomancer']:bindings['aura']={'clip':'aura','durationMs':1200,'sizeInHexes':1.2}
 v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':bindings,'statusEvents':events}
 (out/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'built')
