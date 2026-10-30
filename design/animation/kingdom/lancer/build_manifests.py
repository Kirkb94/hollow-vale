"""Read-only image analysis; writes metadata, never changes raster artwork."""
from PIL import Image
from pathlib import Path
import json,sys
ROOT=Path(__file__).resolve().parents[4]
DIRS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
def components(path):
 im=Image.open(path); w,h=im.size; a=im.getchannel('A'); data=bytearray(1 if x>32 else 0 for x in a.tobytes()); cs=[]
 for start in range(w*h):
  if not data[start]: continue
  data[start]=0; stack=[start]; count=0; x0=w;y0=h;x1=y1=0
  while stack:
   p=stack.pop(); x=p%w;y=p//w;count+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   for q in ([p-1] if x else [])+([p+1] if x<w-1 else [])+([p-w] if y else [])+([p+w] if y<h-1 else []):
    if data[q]:data[q]=0;stack.append(q)
  if count>250:cs.append({'sourceRect':[x0,y0,x1-x0+1,y1-y0+1],'alphaPixels':count})
 cs.sort(key=lambda c:c['alphaPixels'],reverse=True)
 return im,cs
def ordered(cs,n=12,cols=3):
 cs=sorted(cs[:n],key=lambda c:c['sourceRect'][1]+c['sourceRect'][3]/2)
 return sum([sorted(cs[i:i+cols],key=lambda c:c['sourceRect'][0]) for i in range(0,n,cols)],[])
for unit in sys.argv[1:]:
 out=ROOT/'public/art/rigs/kingdom'/unit
 m={'version':1,'unit':unit,'faction':'kingdom','style':'Arcane Vanguard','directions':DIRS,'atlasGrid':[3,4],'partOrder':PARTS,'views':{},'notes':['Explicit alpha-component rectangles; nominal grid is only an ordering convention.','Generated direction artwork has minor costume variation; no mirrored direction placeholders.'],'handedness':{'screenLeftIsAnatomicalLeft':{d:d in ['nw','ne'] for d in DIRS}},'animationHints':{'idle':{'loopMs':1800},'walk':{'loopMs':690},'attack':{'durationMs':800,'contactMs':360},'hurt':{'durationMs':450},'death':{'durationMs':1100},'spawn':{'durationMs':600}}}
 for d in DIRS:
  path=out/(d+'.png')
  if not path.exists():continue
  im,cs=components(path); cs=ordered(cs)
  if len(cs)!=12:raise ValueError((unit,d,len(cs)))
  ps={}
  for key,c in zip(PARTS,cs):
   c['renderRect']=list(c['sourceRect']);c['pivot']=[.5,.92 if key=='head' else .08]
   if key=='torso':c['renderRect'][3]=round(c['renderRect'][3]*.80)
   ps[key]=c
  m['views'][d]={'file':d+'.png','size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'parts':ps}
 if (out/'equipment.png').exists():
  im,cs=components(out/'equipment.png'); cs=ordered(cs); names={'lancer':['spear','shield'],'templar':['mace','shield'],'seraph':['staff','halo'],'warlord':['sword','banner']}.get(unit,['sword','shield'])
  m['equipment']={'file':'equipment.png','size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'views':{}}
  for i,d in enumerate(DIRS):
   m['equipment']['views'][d]={}
   for j,n in enumerate(names):
    v=cs[i*2+j];v['pivot']=[.5,.85 if j==0 else .48];v['hand']='right' if j==0 else 'left';v['displaySize']=[20,92] if j==0 else [40,62]
    if n=='spear':v['displaySize']=[24,130];v['pivot']=[.5,.65]
    if n=='staff':v['displaySize']=[24,130];v['pivot']=[.5,.65]
    if n=='banner':v['displaySize']=[52,150];v['pivot']=[.2,.75]
    if unit=='kinglion' and j==0:v['displaySize']=[32,110]
    if unit=='templar' and j==1:v['displaySize']=[47,84]
    m['equipment']['views'][d][n]=v
 (out/'manifest.json').write_text(json.dumps(m,indent=2))
 print(unit,len(m['views']),'views; equipment',bool(m.get('equipment')))
