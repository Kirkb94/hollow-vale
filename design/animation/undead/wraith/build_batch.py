"""Analyze alpha and author rig metadata; does not modify raster artwork."""
from pathlib import Path
import json,runpy,sys,copy
ROOT=Path(__file__).resolve().parents[4]
sys.argv=['analysis']
H=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'))
components=H['components'];DIRS=H['DIRS'];PARTS=H['PARTS']
BASE=ROOT/'public/art/rigs/undead'
def rect(c,file='body.png',name=''):
 r=list(c['sourceRect']);return dict(file=file,sourceRect=r,renderRect=r.copy(),pivot=[.5,.92 if name=='head' else .08],isolate=True)
def near(cs,x,y):
 return min(cs,key=lambda c:(c['sourceRect'][0]+c['sourceRect'][2]/2-x)**2+(c['sourceRect'][1]+c['sourceRect'][3]/2-y)**2)
def panels(path,cols=3,rows=2):
 im,cs=components(path);return im,[[c for c in cs if int((c['sourceRect'][0]+c['sourceRect'][2]/2)/(im.width/cols))==i%cols and int((c['sourceRect'][1]+c['sourceRect'][3]/2)/(im.height/rows))==i//cols] for i in range(cols*rows)]
def regular(path,n,cols):
 im,cs=components(path);cs=sorted(cs,key=lambda c:c['sourceRect'][1]);return im,sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,n,cols)],[])
for u in ['wraith','skeletons','ghoul','graveknight','bonerider']:
 p=BASE/u
 if not (p/'body.png').exists():continue
 strip=u in ['graveknight','bonerider'];im,groups=panels(p/'body.png',6 if strip else 3,1 if strip else 2)
 m=dict(version=1,unit=u,faction='undead',style='Arcane Vanguard',directions=DIRS,partOrder=PARTS,views={},attack='thrust' if u=='skeletons' else 'attack',notes=['Six independently illustrated facings; explicit source rectangles preserve generated alpha.'],handedness={'screenLeftIsAnatomicalLeft':{d:d in ['nw','ne'] for d in DIRS}})
 if u=='skeletons':m['group']=3
 if u=='wraith':m['locomotion']='hover'
 if u=='skeletons':m['notes'].append('Bare leg cutouts share the matching Bone Rider supplement; each leg is independently animated. Squad count remains three.')
 if u=='graveknight':m['notes'].append('Profile upper arms share a mirrored matching armor cutout. Torso source is cropped above the separately generated pelvis.')
 if u=='bonerider':m['notes'].append('Head and torso use distinct rectangles of the neck-connected source art; cape and paired legs use the separate supplement.')
 for i,d in enumerate(DIRS):
  cs=groups[i];ox=(i%(6 if strip else 3))*im.width/(6 if strip else 3);oy=0 if strip else (i//3)*im.height/2;w=im.width/(6 if strip else 3);h=im.height if strip else im.height/2
  if u=='wraith':pos=[(.2,.14),(.49,.16),(.81,.22),(.2,.4),(.49,.4),(.8,.4),(.15,.6),(.46,.6),(.82,.7),(.15,.85),(.6,.85),(.6,.85)]
  elif u=='skeletons':pos=[(.28,.13),(.55,.16),(.87,.16),(.27,.4),(.59,.41),(.85,.41),(.22,.66),(.54,.66),(.85,.68),(.28,.85),(.57,.9),(.87,.9)]
  elif u=='ghoul':pos=[(.24,.13),(.54,.15),(.8,.14),(.5,.39),(.26,.34),(.74,.34),(.16,.58),(.84,.58),(.37,.6),(.63,.6),(.3,.88),(.7,.88)]
  elif u=='graveknight':pos=[(.5,.055),(.42,.23),(.82,.23),(.2,.42),(.25,.42),(.75,.42),(.25,.55),(.75,.55),(.25,.74),(.75,.74),(.25,.92),(.75,.92)]
  else:pos=[(.6,.075),(.5,.23),(.5,.23),(.55,.4),(.17,.4),(.92,.4),(.17,.58),(.85,.58),(.5,.66),(.5,.66),(.3,.88),(.75,.88)]
  ps={n:rect(near(cs,ox+x*w,oy+y*h),name=n) for n,(x,y) in zip(PARTS,pos)}
  if u=='bonerider':
   full=ps['head']['sourceRect'];x,y,rw,rh=full
   ps['head']['sourceRect']=ps['head']['renderRect']=[x,y,rw,round(h*.14)-y]
   ps['torso']['sourceRect']=ps['torso']['renderRect']=[x,round(h*.14),rw,round(h*.33)-round(h*.14)]
  if u=='graveknight' and d in ['e','w','nw']:
   arm='rightUpperArm' if d in ['e','w'] else 'leftUpperArm';other='leftUpperArm' if arm=='rightUpperArm' else 'rightUpperArm';ps[other]=copy.deepcopy(ps[arm]);ps[other]['flipX']=True
  if u=='ghoul' and d=='ne':ps['head']=rect(near(cs,ox+.81*w,oy+.12*h),name='head');ps['cape']=rect(near(cs,ox+.22*w,oy+.14*h),name='cape')
  if u=='ghoul' and d=='se':ps['head']['flipX']=True
  if u=='wraith' and (p/'supplement.png').exists():
   _,sup=regular(p/'supplement.png',18,3);ps['rightBoot']=rect(sup[i*3+2],'supplement.png','rightBoot')
  if u in ['bonerider','skeletons'] and (BASE/'bonerider/supplement.png').exists():
   _,sup=regular(BASE/'bonerider/supplement.png',18,3);file='supplement.png' if u=='bonerider' else '../bonerider/supplement.png'
   for j,n in enumerate(['cape','leftLeg','rightLeg']):
    if u=='bonerider' or j:ps[n]=rect(sup[i*3+j],file,n)
  if u=='graveknight' and (p/'supplement.png').exists():
   _,sup=regular(p/'supplement.png',12,3)
   ps['cape']=rect(sup[i*2],'supplement.png','cape');ps['pelvis']=rect(sup[i*2+1],'supplement.png','pelvis')
   ps['torso']['renderRect'][3]=round(ps['torso']['renderRect'][3]*.65)
  m['views'][d]=dict(file='body.png',size=list(im.size),parts=ps)
 if (p/'equipment.png').exists():
  ei,eq=regular(p/'equipment.png',6 if u=='bonerider' else 12,3);m['equipment']={'file':'equipment.png','views':{}}
  for i,d in enumerate(DIRS):
   names=['scythe'] if u=='bonerider' else ['spear' if u=='skeletons' else 'sword','shield'];v={}
   for j,n in enumerate(names):
    c=copy.deepcopy(eq[i*len(names)+j]);c.update(pivot=[.5,.68 if n in ['spear','scythe'] else .85 if n=='sword' else .5],hand='left' if n=='shield' else 'right',displaySize=[27,112] if n in ['spear','scythe'] else [24,91] if n=='sword' else [40,60]);v[n]=c
   m['equipment']['views'][d]=v
 (p/'manifest.json').write_text(json.dumps(m,indent=2))
 print(u,'body source counts',list(map(len,groups)))
