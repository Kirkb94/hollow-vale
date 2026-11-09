"""Register new Pocket Chibi sheets; align whole poses without modifying artwork."""
from pathlib import Path
from PIL import Image
import importlib.util,json,numpy as np
root=Path(__file__).resolve().parents[1]
spec=importlib.util.spec_from_file_location('pose_regions',Path(__file__).with_name('whole-pose-regions.py'));mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
p=root/'public/art/frames/catalog.json';cat=json.loads(p.read_text());report=[]
clips={'idle':(0,[0,1],1000),'walk':(1,[0,1,3,4],600),'cast':(2,list(range(6)),800),'hurt':(3,[0,2,5],450),'death':(4,[0,2,3,5],1100),'spawn':(5,[0,2,3,5],600)}
for file in sorted((root/'public/art/frames').glob('*-pocket-chibi-v1.png')):
 key=file.name.removesuffix('-pocket-chibi-v1.png')
 if key=='mage' or key not in cat['units']:continue
 im=Image.open(file).convert('RGBA');alpha=np.asarray(im.getchannel('A'));entry={'key':key,'file':file.name}
 if np.mean(alpha<10)<.15:entry['error']='Opaque background';report.append(entry);continue
 w,h=im.width/6,im.height/6
 if any(not im.getchannel('A').crop((c*w,r*h,(c+1)*w,(r+1)*h)).point(lambda v:255 if v>128 else 0).getbbox() for r in range(6) for c in range(6)):
  entry['error']='Empty frame';report.append(entry);continue
 try:regions=mod.describe(im,6,6,{2:w*.1})
 except ValueError as e:entry['error']=str(e);report.append(entry);continue
 anchors={}
 for c in mod.regions(im):
  slot=(min(5,int(c['cy']/h)),min(5,int(c['cx']/w)))
  if slot not in anchors or c['area']>anchors[slot]['area']:anchors[slot]=c
 for row,line in enumerate(regions):
  for col,r in enumerate(line):
   a=anchors[row,col];x0,y0,x1,y1=a['box'];height=y1-y0;band=[(y,lo,hi) for y,lo,hi in a['runs'] if y0+height*.65<=y<y0+height*.85] or a['runs'];center=float(np.median([(lo+hi)/2 for y,lo,hi in band]));scale=r['width']/r['rect'][2]
   r['left']=round(160+(r['rect'][0]-center)*scale);r['anchorX']=center;r['anchorTarget']=160
 # Attached spell effects can bias the lower-body midpoint. Keep the anchor
 # near the idle body's position within its cell, while allowing modest lean.
 idle_anchors=[r['anchorX'] for r in regions[0]]
 for line in regions:
  for col,r in enumerate(line):
   r['anchorX']=float(np.clip(r['anchorX'],idle_anchors[col]-w*.08,idle_anchors[col]+w*.08))
 # Normalize scale after anchoring; atlas padding must not shrink a character.
 reach=max(max(abs(r['rect'][0]-r['anchorX']),abs(r['rect'][0]+r['rect'][2]-r['anchorX'])) for line in regions for r in line)
 max_h=max(r['rect'][3] for line in regions for r in line);idle_h=float(np.median([r['rect'][3] for r in regions[0]]));scale=min(174/max(1,idle_h),184/max_h,144/max(1,reach))
 for line in regions:
  for r in line:
   x,y,rw,rh=r['rect'];r.update(left=round(160+(x-r['anchorX'])*scale),top=round(198-rh*scale),width=round(rw*scale,3),height=round(rh*scale,3))
 u=cat['units'][key];u.update(file=file.name,artwork='new-whole-character',pixelArt=True,interpolate=False,artStyle='07 — Pocket Chibi',columns=6,frameWidth=w,frameHeight=h,poseRegions=regions,alignment='lower-torso-fixed-x');u.pop('frameOffsets',None)
 u['clips']={s:{'row':r,'frames':frames,'duration':duration,'loop':s in ['idle','walk']} for s,(r,frames,duration) in clips.items()}
 for s in ['attack','shoot','thrust']:u['clips'][s]=dict(u['clips']['cast'])
 entry['frames']=36;report.append(entry)
p.write_text(json.dumps(cat,separators=(',',':')),encoding='utf-8');(root/'design/art-directions/pocket-chibi/validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'enabled':sum(bool(u.get('pixelArt')) for u in cat['units'].values()),'total':len(cat['units']),'errors':[r for r in report if 'error' in r]}))
