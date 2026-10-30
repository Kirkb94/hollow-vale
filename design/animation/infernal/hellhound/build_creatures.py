"""Source-alpha analysis and articulated rig metadata. Raster art remains untouched."""
from pathlib import Path
import json,runpy,sys
ROOT=Path(__file__).resolve().parents[4];sys.argv=['metadata']
H=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'));components=H['components'];DIRS=H['DIRS']
def ordered(path,cols,count):
 im,cs=components(path);cs=sorted(cs,key=lambda c:c['sourceRect'][1]);assert len(cs)==count,(path,len(cs),count)
 return im,sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,count,cols)],[])
for u in ['hellhound','phoenix','dragon','imps']:
 p=ROOT/'public/art/rigs/infernal'/u
 if not (p/'limbs.png').exists():continue
 core=['body','head','tail']+(['flameMane'] if u=='hellhound' else [])
 limbs=['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg'] if u=='hellhound' else ['leftWing','rightWing','leftLeg','rightLeg'] if u=='phoenix' else ['leftWing','rightWing','frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg'] if u=='dragon' else ['leftWing','rightWing','leftArm','rightArm','leftLeg','rightLeg']
 ci,cc=ordered(p/'core.png',len(core),len(core)*6);li,lc=ordered(p/'limbs.png',len(limbs),len(limbs)*6)
 m={'version':1,'unit':u,'faction':'infernal','style':'Arcane Vanguard','skeleton':{'hellhound':'quadruped','phoenix':'bird','dragon':'dragon','imps':'imp'}[u],'directions':DIRS,'partOrder':core+limbs,'views':{},'creature':{'views':{}},'attack':'cast' if u in ['dragon','phoenix'] else 'attack','group':3 if u=='imps' else 1,'notes':['Independent creature anatomy; whole leg and wing illustrations articulate at their attachment joints.','Six independently illustrated facings; minor texture variation between views.']}
 for i,d in enumerate(DIRS):
  ps={}
  for file,names,cs in [('core.png',core,cc),('limbs.png',limbs,lc)]:
   for j,n in enumerate(names):ps[n]={'file':file,'sourceRect':cs[i*len(names)+j]['sourceRect'],'pivot':[.5,.1],'isolate':True}
  m['views'][d]={'file':'core.png','parts':ps};sign=1 if d in ['e','se','ne'] else -1;side=d in ['e','w'];back=d in ['nw','ne'];layout={}
  def part(n,xy,size,pivot=(.5,.1),motion=None,phase=0,flip=False):
   layout[n]={'anchor':xy,'displaySize':size,'pivot':list(pivot),'phase':phase}
   if motion:layout[n]['motion']=motion
   if flip:layout[n]['flipX']=True
  if u in ['hellhound','dragon']:
   dragon=u=='dragon';bw=110 if side else 91;bh=63 if dragon else 50;by=-66 if dragon else -52
   part('body',[0,by],[bw,bh],(.5,.5));part('head',[sign*(43 if side else 34),by-20],[65 if dragon else 58,70 if dragon else 56],(.5,.7),'head')
   part('tail',[-sign*40,by+5],[90 if dragon else 63,48 if dragon else 55],(.12,.75),'tail',flip=sign==1)
   for j,n in enumerate(['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg']):
    x=sign*(31 if j<2 else -33)+(5 if j%2 else -5);part(n,[x,by+12],[27 if dragon else 24,48 if dragon else 43],(.5,.08),'leg',j%2)
   order=['tail','frontLeftLeg','hindRightLeg']
   if dragon:
    part('leftWing',[-10,by-25],[95,105],(.9,.10),'wing',0);part('rightWing',[10,by-25],[95,105],(.1,.10),'wing',1);order=['tail','leftWing','frontLeftLeg','hindRightLeg']
   order+=['body','frontRightLeg','hindLeftLeg','head']
   if dragon:order.insert(5,'rightWing')
   else:part('flameMane',[0,by-14],[110 if side else 90,45],(.5,.7),'flame');order.insert(4,'flameMane')
  elif u=='phoenix':
   part('body',[0,-72],[46,78],(.5,.5));part('head',[sign*9,-100],[51,62],(.5,.8),'head');part('tail',[0,-42],[72,90],(.5,.05),'tail')
   part('leftWing',[-7,-95],[100,95],(.9,.18),'wing',0);part('rightWing',[7,-95],[100,95],(.1,.18),'wing',1)
   part('leftLeg',[-9,-44],[22,37],(.5,.05),'leg',0);part('rightLeg',[9,-44],[22,37],(.5,.05),'leg',1)
   order=['tail','leftLeg','rightLeg','leftWing','body','rightWing','head'] if not back else ['tail','leftLeg','rightLeg','head','body','leftWing','rightWing']
  else:
   part('body',[0,-70],[43,59],(.5,.5));part('head',[sign*3,-101],[47,46],(.5,.8),'head');part('tail',[-sign*13,-49],[57,39],(.13,.8),'tail',flip=sign==1)
   part('leftWing',[-12,-91],[63,67],(.9,.14),'wing',0);part('rightWing',[12,-91],[63,67],(.1,.14),'wing',1)
   for j,n in enumerate(['leftArm','rightArm']):part(n,[(-1 if j==0 else 1)*19,-91],[19,46],(.5,.05),'arm',j)
   for j,n in enumerate(['leftLeg','rightLeg']):part(n,[(-1 if j==0 else 1)*10,-45],[23,42],(.5,.05),'leg',j)
   order=['tail','leftWing','rightWing','leftLeg','rightLeg','body','leftArm','rightArm','head']
   if back:order=['tail','leftLeg','rightLeg','body','leftArm','rightArm','head','leftWing','rightWing']
  m['creature']['views'][d]={'parts':layout,'order':order}
 if u=='dragon':m['creature']['scale']=.92
 (p/'manifest.json').write_text(json.dumps(m,indent=2));print(u,len(core)+len(limbs),'parts/view')
