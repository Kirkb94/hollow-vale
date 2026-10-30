from pathlib import Path
import runpy,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.argv=['metadata'];H=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'));DIRS=H['DIRS']
def ordered(path,cols,count):
 im,cs=H['components'](path);cs=sorted(cs,key=lambda c:c['sourceRect'][1]);assert len(cs)==count,(str(path),len(cs),count)
 return sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,count,cols)],[])
p=ROOT/'public/art/rigs/raidboss/raidboss';sources=[('core.png',['body','head','pelvis']),('limbs.png',['leftArm','rightArm','leftLeg','rightLeg'])];data=[(f,n,ordered(p/f,len(n),len(n)*6)) for f,n in sources];names=sum([n for _,n in sources],[])
m={'version':1,'unit':'raidboss','faction':'raidboss','style':'Arcane Vanguard','skeleton':'quadruped','directions':DIRS,'partOrder':names,'views':{},'creature':{'views':{},'scale':.76},'attack':'attack','group':1,'notes':['Custom upright giant skeleton; whole limbs articulate at shoulders/hips.']}
for i,d in enumerate(DIRS):
 ps={n:{'file':f,'sourceRect':cs[i*len(ns)+j]['sourceRect'],'pivot':[.5,.1],'isolate':True} for f,ns,cs in data for j,n in enumerate(ns)};m['views'][d]={'file':'core.png','parts':ps};layout={};sign=1 if d in ['e','se','ne'] else -1;side=d in ['e','w'];back=d in ['nw','ne']
 def part(n,xy,size,pivot=(.5,.1),motion=None,phase=0):
  layout[n]={'anchor':xy,'displaySize':size,'pivot':list(pivot),'phase':phase}
  if motion:layout[n]['motion']=motion
 part('body',[0,-100],[86 if side else 106,90],(.5,.5));part('head',[sign*6,-147],[75,72],(.5,.7),'head');part('pelvis',[0,-61],[66,58],(.5,.2))
 for j,n in enumerate(['leftArm','rightArm']):part(n,[(-1 if j==0 else 1)*(28 if side else 43),-126],[46,92],(.65,.08),'arm',j)
 for j,n in enumerate(['leftLeg','rightLeg']):part(n,[(-1 if j==0 else 1)*22,-54],[43,66],(.5,.05),'leg',j)
 order=['leftArm','leftLeg','rightLeg','pelvis','body','rightArm','head'] if not back else ['leftLeg','rightLeg','head','body','pelvis','leftArm','rightArm']
 m['creature']['views'][d]={'parts':layout,'order':order}
(p/'manifest.json').write_text(json.dumps(m,indent=2))
from PIL import Image
w,h=Image.open(p/'vfx.png').size;names=['cleave','impact','spawn','enrage','summon'];clips={}
for row,n in enumerate(names):clips[n]={'row':row,'frames':4,'fps':8,'durationMs':500,'loop':False,'anchor':[.5,.65],'attachment':'ground','lifecycle':'remove at completion','sourceRects':[[round(c*w/4),round(row*h/5),round((c+1)*w/4)-round(c*w/4),round((row+1)*h/5)-round(row*h/5)] for c in range(4)]}
fx={'file':'vfx.png','size':[w,h],'columns':4,'rows':5,'clips':clips,'bindings':{'attack':{'cast':'cleave','impact':'impact','releaseMs':260,'travelMs':0},'spawn':'spawn'},'statusEvents':{'raid:enrage':{'impact':'enrage'},'raid:summon':{'impact':'summon'}},'notes':['Actual raid phase transitions and successful summons; no added abilities.']};(p/'vfx.json').write_text(json.dumps(fx,indent=2))
