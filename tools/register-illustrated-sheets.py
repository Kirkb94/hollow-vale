"""Register newly illustrated sheets; inspect alpha/geometry without editing images."""
from pathlib import Path
from PIL import Image
import json, importlib.util
spec=importlib.util.spec_from_file_location("pose_regions",Path(__file__).with_name("whole-pose-regions.py"));module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
root=Path(__file__).resolve().parents[1]
p=root/'public/art/frames/catalog.json'
cat=json.loads(p.read_text(encoding='utf-8'))
report=[]
for file in sorted((root/'public/art/frames').glob('*-illustrated.png')):
 key=file.name.removesuffix('-illustrated.png')
 if key not in cat['units'] or cat['units'][key].get('pixelArt'): continue
 im=Image.open(file).convert('RGBA');a=im.getchannel('A');hist=a.histogram()
 if sum(hist[:10])<im.width*im.height*.12:
  report.append({'key':key,'error':'Background is not sufficiently transparent'});continue
 w,h=im.width//4,im.height//6;offsets=[];missing=[]
 for row in range(6):
  offsets.append([])
  for col in range(4):
   bbox=a.crop((col*w,row*h,(col+1)*w,(row+1)*h)).point(lambda v:255 if v>128 else 0).getbbox()
   if not bbox: missing.append([row,col]);offsets[-1].append(0)
   else:offsets[-1].append(round(198-bbox[3]/h*208,2))
 if missing:
  report.append({'key':key,'error':'Empty cells','cells':missing});continue
 u=cat['units'][key];u.update(file=file.name,artwork='new-whole-character',frameWidth=w,frameHeight=h,columns=4,frameOffsets=offsets)
 try:u['poseRegions']=module.describe(im)
 except ValueError as error:
  u.pop('poseRegions',None);report.append({'key':key,'warning':str(error)+'; using fixed complete-frame cells'})
 u['clips']={'idle':{'row':0,'frames':[0,1,2,3,2,1],'duration':1600,'loop':True},'walk':{'row':1,'frames':[0,1,2,3],'duration':600,'loop':True},'cast':{'row':2,'frames':[0,1,2,3],'duration':800},'hurt':{'row':3,'frames':[0,1,2,3],'duration':450},'death':{'row':4,'frames':[0,1,2,3],'duration':1100},'spawn':{'row':5,'frames':[0,1,2,3],'duration':600}}
 for k in ['attack','shoot','thrust']:u['clips'][k]=dict(u['clips']['cast'])
 report.append({'key':key,'size':[im.width,im.height],'transparentPixels':sum(hist[:10]),'frames':24})
p.write_text(json.dumps(cat,separators=(",",":")),encoding='utf-8')
(root/'design/animation/redraw/validation.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps({'enabled':sum(u.get('artwork')=='new-whole-character' for u in cat['units'].values()),'total':len(cat['units']),'errors':[r for r in report if 'error' in r]}))
