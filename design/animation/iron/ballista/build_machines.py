from pathlib import Path
import runpy,json,sys
ROOT=Path(__file__).resolve().parents[4];sys.argv=['metadata'];H=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'));DIRS=H['DIRS']
def ordered(path,cols,count):
 im,cs=H['components'](path);cs=sorted(cs,key=lambda c:c['sourceRect'][1]);assert len(cs)==count,(str(path),len(cs),count)
 return sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,count,cols)],[])
for u in ['ballista','warengine']:
 p=ROOT/'public/art/rigs/iron'/u;core=['body','launcher','bolt' if u=='ballista' else 'stack'];wheels=['frontLeftWheel','frontRightWheel','rearLeftWheel','rearRightWheel'];sources=[('core.png',core),('wheels.png',wheels)];data=[(f,n,ordered(p/f,len(n),len(n)*6)) for f,n in sources];names=core+wheels
 m={'version':1,'unit':u,'faction':'iron','style':'Arcane Vanguard','skeleton':'mechanical','directions':DIRS,'partOrder':names,'views':{},'creature':{'views':{}},'attack':'shoot','group':1,'notes':['Wheels, chassis and launcher animate independently. Fixed bow assembly; release bolt is separate.']}
 for i,d in enumerate(DIRS):
  ps={n:{'file':f,'sourceRect':cs[i*len(ns)+j]['sourceRect'],'pivot':[.5,.5],'isolate':True} for f,ns,cs in data for j,n in enumerate(ns)};m['views'][d]={'file':'core.png','parts':ps};layout={};sign=1 if d in ['e','se','ne'] else -1;side=d in ['e','w'];back=d in ['nw','ne']
  def part(n,xy,size,pivot=(.5,.5),motion=None):
   layout[n]={'anchor':xy,'displaySize':size,'pivot':list(pivot)}
   if motion:layout[n]['motion']=motion
  part('body',[0,-43],[145,78] if u=='warengine' else [135,72]);part('launcher',[sign*12,-79],[142,65] if u=='warengine' else [137,68],motion='recoil')
  for j,n in enumerate(wheels):part(n,[sign*(47 if j<2 else -47)+(8 if j%2 else -8),-20 if j%2 else -34],[38 if side else 30,38],motion='wheel')
  if u=='ballista':part('bolt',[sign*25,-82],[100,14],motion='bolt')
  else:part('stack',[-sign*46,-76],[26,64])
  order=['frontLeftWheel','rearLeftWheel','body','frontRightWheel','rearRightWheel','launcher',core[2]]
  m['creature']['views'][d]={'parts':layout,'order':order}
 (p/'manifest.json').write_text(json.dumps(m,indent=2));print(u,len(names),'parts/view')
