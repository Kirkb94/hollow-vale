from pathlib import Path
import runpy,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.argv=['metadata'];H=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'));DIRS=H['DIRS']
def ordered(path,cols,count):
 im,cs=H['components'](path);cs=sorted(cs,key=lambda c:c['sourceRect'][1]);assert len(cs)==count,(str(path),len(cs),count)
 return sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,count,cols)],[])
for u in ['wolves','direwolf','cavebear','stormroc','mammoth','boarrider']:
 p=ROOT/'public/art/rigs/wilds'/u
 if not (p/'limbs.png').exists():continue
 core=['body','head','tail'];limbs=['leftWing','rightWing','leftLeg','rightLeg'] if u=='stormroc' else ['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg'];sources=[('core.png',core),('limbs.png',limbs)]
 if u=='mammoth':sources.append(('face.png',['leftTusk','trunk','rightTusk']))
 if u=='boarrider':sources.extend([('ridercore.png',['riderBody','riderHead','spear']),('riderlimbs.png',['riderLeftArm','riderRightArm','riderLeftLeg','riderRightLeg'])])
 if any(not(p/f).exists() for f,_ in sources):continue
 data=[(f,n,ordered(p/f,len(n),len(n)*6)) for f,n in sources];names=sum([n for _,n in sources],[])
 m={'version':1,'unit':u,'faction':'wilds','style':'Arcane Vanguard','skeleton':'bird' if u=='stormroc' else 'quadruped','directions':DIRS,'partOrder':names,'views':{},'creature':{'views':{}},'attack':'thrust' if u=='boarrider' else 'attack','group':3 if u=='wolves' else 1,'notes':['All six facings independently illustrated. Whole limbs articulate at attachment; not separate knee joints.']}
 for i,d in enumerate(DIRS):
  ps={n:{'file':f,'sourceRect':cs[i*len(ns)+j]['sourceRect'],'pivot':[.5,.1],'isolate':True} for f,ns,cs in data for j,n in enumerate(ns)};m['views'][d]={'file':'core.png','parts':ps};layout={};sign=1 if d in ['e','se','ne'] else -1;side=d in ['e','w'];back=d in ['nw','ne']
  def part(n,xy,size,pivot=(.5,.1),motion=None,phase=0,flip=False):
   layout[n]={'anchor':xy,'displaySize':size,'pivot':list(pivot),'phase':phase}
   if motion:layout[n]['motion']=motion
   if flip:layout[n]['flipX']=True
  if u=='stormroc':
   part('body',[0,-72],[48,78],(.5,.5));part('head',[sign*10,-103],[51,58],(.5,.8),'head');part('tail',[0,-40],[65,65],(.5,.05),'tail')
   part('leftWing',[-7,-95],[102,92],(.9,.18),'wing',0);part('rightWing',[7,-95],[102,92],(.1,.18),'wing',1)
   part('leftLeg',[-9,-44],[22,37],(.5,.05),'leg',0);part('rightLeg',[9,-44],[22,37],(.5,.05),'leg',1)
   order=['tail','leftLeg','rightLeg','leftWing','body','rightWing','head'] if not back else ['tail','leftLeg','rightLeg','head','body','leftWing','rightWing']
  elif u=='cavebear':
   m['creature']['scale']=.88
   part('body',[0,-79],[79 if side else 87,105],(.5,.5));part('head',[sign*7,-129],[65,59],(.5,.68),'head');part('tail',[-sign*31,-39],[19,22],(.5,.5),'tail')
   for j,n in enumerate(['frontLeftLeg','frontRightLeg']):part(n,[(-1 if j==0 else 1)*34,-111],[32,74],(.5,.05),'arm',j)
   for j,n in enumerate(['hindLeftLeg','hindRightLeg']):part(n,[(-1 if j==0 else 1)*21,-38],[35,48],(.5,.05),'leg',j)
   order=['tail','hindLeftLeg','frontLeftLeg','body','hindRightLeg','frontRightLeg','head']
  else:
   big=u=='mammoth';bw=(132 if big else 108) if side else (111 if big else 91);bh=88 if big else 53;by=-76 if big else -53;hx=sign*(50 if big else 43)
   part('body',[0,by],[bw,bh],(.5,.5));part('head',[hx,by-20],[76 if big else 58,84 if big else 58],(.5,.7),'head',flip=u=='boarrider' and d=='w')
   part('tail',[-sign*(55 if big else 43),by+5],[29,38] if u in ['mammoth','boarrider'] else [65,46],(.12,.5),'tail',flip=sign==1)
   for j,n in enumerate(['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg']):part(n,[sign*((39 if big else 31) if j<2 else (-42 if big else -33))+(5 if j%2 else -5),by+(26 if big else 12)],[37 if big else 25,60 if big else 44],(.5,.05),'leg',j%2)
   order=['tail','frontLeftLeg','hindRightLeg','body','frontRightLeg','hindLeftLeg','head']
   if big:
    part('trunk',[hx+sign*16,by-9],[35,78],(.5,.04),'head');part('leftTusk',[hx+sign*8,by-5],[55,56],(.15 if sign==1 else .85,.08),'head');part('rightTusk',[hx+sign*21,by-2],[55,56],(.15 if sign==1 else .85,.08),'head');order+=['leftTusk','trunk','rightTusk'];m['creature']['scale']=.73
   if u=='boarrider':
    part('riderBody',[0,-99],[38,49],(.5,.5));part('riderHead',[sign*2,-126],[30,32],(.5,.8),'head');part('riderLeftArm',[-17,-117],[17,39],(.5,.05),'arm',0);part('riderRightArm',[17,-117],[17,39],(.5,.05),'arm',1)
    part('riderLeftLeg',[-12,-79],[20,44],(.5,.08));part('riderRightLeg',[12,-79],[20,44],(.5,.08));part('spear',[sign*20,-78],[17,108],(.5,.75),'weapon')
    order=['tail','frontLeftLeg','hindRightLeg','riderLeftLeg','body','frontRightLeg','hindLeftLeg','head','riderRightLeg','riderBody','riderLeftArm','riderRightArm','riderHead','spear']
  m['creature']['views'][d]={'parts':layout,'order':order}
 (p/'manifest.json').write_text(json.dumps(m,indent=2));print(u,len(names),'parts/view')
