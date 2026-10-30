"""Source alpha analysis and metadata only; generated PNGs stay untouched."""
import json
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
code=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text(encoding='utf8')
exec(code[code.index('def components'):code.index('def rect_in_cell')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
for k in ['witch','storm','archmage','seer']:
    out=ROOT/'public/art/rigs/arcane'/k;doc=ROOT/'design/animation/arcane'/k
    im=Image.open(out/'body.png');cs=components(im)
    (doc/'components.json').write_text(json.dumps(cs,indent=2))
    cols=[sorted([c for c in cs if int((c['rect'][0]+c['rect'][2]/2)/im.width*6)==i],key=lambda c:c['rect'][1]) for i in range(6)]
    if k=='seer':
        for col in cols:col.insert(9,col[8].copy())
    if k=='archmage' and len(cols[1])==11:
        merged=cols[1][5];x,y,w,h=merged['rect'];cols[1][5:6]=[dict(merged,rect=[x,y,w,111]),dict(merged,rect=[x,850,w,y+h-850])]
    print(k,[len(c) for c in cols])
    if any(len(c)!=12 for c in cols):continue
    m={'version':1,'unit':k,'faction':'arcane','style':'Arcane Vanguard','attack':'cast','partOrder':NAMES,'views':{}}
    for i,d in enumerate(DIRS):
        m['views'][d]={'file':'body.png','parts':{name:{'sourceRect':p['rect'],'isolate':True,'flipX':k=='seer' and name=='rightLeg'} for name,p in zip(NAMES,cols[i])}}
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'equipment.png').exists():continue
    eq=Image.open(out/'equipment.png');items=components(eq)
    items=sorted(items,key=lambda p:p['pixels'],reverse=True)[:6];items.sort(key=lambda p:p['rect'][0]+p['rect'][2]/2)
    m['equipment']={'file':'equipment.png','views':{d:{'staff':{'sourceRect':items[i]['rect'],'hand':'right','displaySize':[22,98],'pivot':[.5,.72]}} for i,d in enumerate(DIRS)}}
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'vfx.png').exists():continue
    fn=code[code.index('def effect_rects'):code.index('def build')].replace('i*h/5','i*h/4').replace('range(1,5)','range(1,4)').replace('range(5)','range(4)');exec(fn)
    rects=effect_rects(Image.open(out/'vfx.png'))
    names=['projectile','impact','cast','arrival']
    if k=='seer':names[2]='heal'
    bindings={'attack':{'projectile':'projectile','impact':'impact','cast':'cast' if k!='seer' else 'impact'},'spawn':'arrival'}
    if k=='seer':bindings['heal']={'impact':'heal'}
    fx={'version':1,'unit':k,'faction':'arcane','file':'vfx.png','grid':{'columns':6,'rows':4},'clips':{name:{'row':i,'frames':6,'fps':12,'sourceRects':rects[i],'sizeInHexes':2 if k=='archmage' and name=='impact' else 1} for i,name in enumerate(names)},'bindings':bindings}
    if k=='archmage':fx['clips']['projectile']['rotation']=-2.35619449
    (out/'vfx.json').write_text(json.dumps(fx,indent=2)+'\n')
