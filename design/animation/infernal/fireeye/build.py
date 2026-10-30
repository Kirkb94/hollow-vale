"""Read original alpha and generate metadata only. No raster files are edited."""
import json
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
code=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text()
exec(code[code.index('def components'):code.index('def rect_in_cell')])
out=ROOT/'public/art/rigs/infernal/fireeye'
im=Image.open(out/'body.png')
cs=components(im)
Path(__file__).with_name('components.json').write_text(json.dumps(cs,indent=2))
dirs=['e','se','sw','w','nw','ne']
m={'version':1,'unit':'fireeye','faction':'infernal','style':'Arcane Vanguard','skeleton':'bat','group':1,'attack':'cast','partOrder':['body','head','leftWing','rightWing'],'views':{},'batLayout':{'headBehindRear':True,'body':{'position':[0,-20],'size':[56,56],'pivot':[.5,.5]},'head':{'position':[9,-18],'size':[26,30]}}}
for i,d in enumerate(dirs):
    col,row=i%3,i//3
    pp=[c for c in cs if int((c['rect'][0]+c['rect'][2]/2)/im.width*3)==col and int((c['rect'][1]+c['rect'][3]/2)/im.height*2)==row]
    pp=sorted(pp,key=lambda c:c['pixels'],reverse=True)[:4]
    assert len(pp)==4,(d,len(pp))
    pp.sort(key=lambda c:c['rect'][1]+c['rect'][3]/2)
    pp=sorted(pp[:2],key=lambda c:c['rect'][0])+sorted(pp[2:],key=lambda c:c['rect'][0])
    m['views'][d]={'file':'body.png','parts':{name:{'sourceRect':c['rect'],'isolate':True,'flipX':name=='head' and d=='w'} for name,c in zip(m['partOrder'],pp)}}
(out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
print([(d,m['views'][d]['parts']) for d in dirs])
