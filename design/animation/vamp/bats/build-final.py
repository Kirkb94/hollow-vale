"""Read-only alpha analysis and explicit manifest generation; never edits raster art."""
import json,sys
from pathlib import Path
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
helper=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text()
exec(helper[helper.index('def components'):helper.index('def build')])
from collections import deque
DIRS=['e','se','sw','w','nw','ne']
HUMAN=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
BAT=['body','head','leftWing','rightWing']
CFG={
 'bats':(['bite','impact','drain','arrival','death'],{'drain':'drain'},{}),
 'vlord':(['slash','impact','drain','nova','arrival'],{'drain':'drain'},{}),
 'bloodqueen':(['slash','impact','feast','arrival','death'],{}, {'kill:heal':{'impact':'feast'}}),
 'nosferatu':(['slash','impact','mist','arrival','death'],{}, {'mist:gain':{'impact':'mist'}}),
 'batking':(['bite','impact','swarm','arrival','death'],{}, {'swarm:spawn':{'impact':'swarm'}})
}
for key in sys.argv[1:] or CFG:
 out=ROOT/'public/art/rigs/vamp'/key;doc=ROOT/'design/animation/vamp'/key
 if not (out/'body.png').exists():continue
 im=Image.open(out/'body.png');bat=key in ['bats','batking'];names=BAT if bat else HUMAN
 kit=json.loads((doc/'kit.json').read_text());m={'version':1,'unit':key,'faction':'vamp','style':'Arcane Vanguard','attack':'attack','group':kit.get('group',1),'directions':DIRS,'partOrder':names,'views':{},'status':'art-review','notes':['Explicit source rectangles are authoritative. PNG sources remain unchanged.']}
 if bat:m['skeleton']='bat'
 allparts=components(im)
 for i,d in enumerate(DIRS):
  panel=[p for p in allparts if int((p['rect'][0]+p['rect'][2]/2)/im.width*3)==i%3 and int((p['rect'][1]+p['rect'][3]/2)/im.height*2)==i//3]
  panel.sort(key=lambda p:p['rect'][1])
  cols=2 if bat else 3
  pp=[]
  for row in range(2 if bat else 4):pp+=sorted(panel[row*cols:(row+1)*cols],key=lambda p:p['rect'][0])
  assert len(pp)==len(names),(key,d,len(pp))
  view={'file':'body.png','size':list(im.size),'parts':{}}
  for j,name in enumerate(names):
   cols=2 if bat else 3;rows=2 if bat else 4
   r=pp[j]['rect'].copy()
   if key=='bloodqueen' and name=='torso' and d not in ['se','nw']:
    cut=72 if d in ['e','sw'] else 70;r[1]+=cut;r[3]-=cut
   if key=='vlord' and 'UpperArm' in name:r[3]=min(r[3],95)
   if key=='nosferatu' and name in ['leftLeg','rightLeg']:r[3]=round(r[3]*.82)
   view['parts'][name]={'sourceRect':r,'pivot':[.5,.08],'isolate':True}
   if key=='nosferatu' and d=='se' and name=='head':view['parts'][name]['flipX']=True
  m['views'][d]=view
 if (out/'equipment.png').exists():
  eq=Image.open(out/'equipment.png');eqparts=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:18 if key=='vlord' else 6];eqparts.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2);eqrows=[sorted(eqparts[j*6:j*6+6],key=lambda p:p['rect'][0]) for j in range(3 if key=='vlord' else 1)];m['equipment']={'file':'equipment.png','views':{}}
  for i,d in enumerate(DIRS):
   row=2 if key=='vlord' else 0;rows=3 if key=='vlord' else 1
   name='rubyOrb' if key=='vlord' else 'goblet'
   m['equipment']['views'][d]={name:{'sourceRect':eqrows[row][i]['rect'],'pivot':[.5,.5] if key=='vlord' else [.5,.7],'hand':'right','displaySize':[26,26] if key=='vlord' else [20,38]}}
  if key=='vlord':
   m['extras']={'file':'equipment.png','views':{}}
   for i,d in enumerate(DIRS):
    m['extras']['views'][d]={name:{'sourceRect':eqrows[j][i]['rect'],'pivot':([.85,.08] if j==0 else [.15,.08]),'anchor':[72 if j==0 else 88,64],'displaySize':[66,80],'layer':'behind','motion':'wing','phase':j} for j,name in enumerate(['leftWing','rightWing'])}
 (doc/'components.json').write_text(json.dumps(components(im),indent=2))
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 if (out/'vfx.png').exists():
  im=Image.open(out/'vfx.png');clips,extra,events=CFG[key];rects=effect_rects(im)
  fx={'version':1,'unit':key,'file':'vfx.png','size':list(im.size),'columns':6,'rows':5,'clips':{name:{'frames':6,'fps':12,'loop':False,'anchor':[.5,.5],'sourceRects':rects[i],'durationMs':500} for i,name in enumerate(clips)},'bindings':{'attack':{'cast':'nova' if key=='vlord' else clips[0],'impact':'impact','releaseMs':250,'travelMs':0},'spawn':'arrival',**({'death':'death'} if 'death' in clips else {}),**extra},'statusEvents':events}
  (out/'vfx.json').write_text(json.dumps(fx,indent=2))
 print(key,'manifest built; manual review required')
