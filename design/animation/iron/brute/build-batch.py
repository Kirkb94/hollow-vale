"""Source alpha analysis and metadata only; generated PNGs stay untouched."""
import json
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
code=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text()
exec(code[code.index('def components'):code.index('def rect_in_cell')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
for k in ['brute','sapper','gunner','spotter']:
    out=ROOT/'public/art/rigs/iron'/k;doc=ROOT/'design/animation/iron'/k
    im=Image.open(out/'body.png');cs=components(im)
    (doc/'components.json').write_text(json.dumps(cs,indent=2))
    cols=[sorted([c for c in cs if int((c['rect'][0]+c['rect'][2]/2)/im.width*6)==i],key=lambda c:c['rect'][1]) for i in range(6)]
    if k=='gunner':
        for col in cols:
            if len(col)==11:col.insert(7,col[6].copy())
    print(k,[len(c) for c in cols])
    if any(len(c)!=12 for c in cols):continue
    m={'version':1,'unit':k,'faction':'iron','style':'Arcane Vanguard','attack':'attack' if k=='brute' else 'cast' if k=='sapper' else 'shoot','partOrder':NAMES,'views':{}}
    if k=='gunner':m['bodyScale']=[1.12,.84]
    if k=='brute':m['bodyScale']=[1.12,1.03]
    for i,d in enumerate(DIRS):
        m['views'][d]={'file':'body.png','parts':{name:{'sourceRect':p['rect'],'isolate':True,'flipX':k=='gunner' and name=='rightForearm'} for name,p in zip(NAMES,cols[i])}}
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'equipment.png').exists():continue
    eq=Image.open(out/'equipment.png');items=components(eq)
    rows_count={'brute':1,'sapper':2,'gunner':1,'spotter':3}[k]
    items=sorted(items,key=lambda p:p['pixels'],reverse=True)[:rows_count*6];items.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2)
    rows=[sorted(items[j:j+6],key=lambda p:p['rect'][0]+p['rect'][2]/2) for j in range(0,rows_count*6,6)]
    config={'brute':[('axe','right',[30,88],[.3,.78])],'sapper':[('dynamite','right',[19,39],[.5,.7]),('hammer','left',[25,52],[.5,.82])],'gunner':[('gun','right',[25,82],[.5,.73])],'spotter':[('pistol','right',[18,48],[.5,.75])]}
    m['equipment']={'file':'equipment.png','views':{}}
    for i,d in enumerate(DIRS):
        pieces={}
        for j,(name,hand,size,pivot) in enumerate(config[k]):
            r=rows[2 if k=='spotter' else j][i]['rect'];scale=min(size[0]/r[2],size[1]/r[3]);pieces[name]={'sourceRect':r,'hand':hand,'displaySize':[r[2]*scale,r[3]*scale],'pivot':pivot}
            if k=='brute':pieces[name]['pivot']=[[.15,.78],[.25,.78],[.76,.78],[.65,.78],[.76,.78],[.4,.78]][i]
        m['equipment']['views'][d]=pieces
    if k=='spotter':
        m['extras']={'file':'equipment.png','views':{}}
        for i,d in enumerate(DIRS):
            sign=1 if i in [0,1,5] else -1
            m['extras']['views'][d]={'tripod':{'sourceRect':rows[1][i]['rect'],'anchor':[80+sign*39,178],'displaySize':[45,64],'pivot':[.5,1],'layer':'front'},'scope':{'sourceRect':rows[0][i]['rect'],'anchor':[80+sign*39,112],'displaySize':[15,41],'pivot':[.5,.5],'rotation':sign*1.5708,'layer':'front'}}
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'vfx.png').exists():continue
    fn=code[code.index('def effect_rects'):code.index('def build')].replace('i*h/5','i*h/4').replace('range(1,5)','range(1,4)').replace('range(5)','range(4)');exec(fn)
    rects=effect_rects(Image.open(out/'vfx.png'))
    names={'brute':['slash','impact','arrival','trail'],'sapper':['projectile','explosion','arrival','fracture'],'gunner':['projectile','impact','arrival','muzzle'],'spotter':['projectile','impact','flare','arrival']}[k]
    bindings={'attack':{'cast':'slash','impact':'impact'},'spawn':'arrival','movement':'trail'} if k=='brute' else {'attack':{'projectile':'projectile','impact':'explosion' if k=='sapper' else 'impact'},'spawn':'arrival'}
    if k=='gunner':bindings['attack']['cast']='muzzle'
    if k=='spotter':bindings['abilities']={'flare':{'impact':'flare'}}
    fx={'version':1,'unit':k,'faction':'iron','file':'vfx.png','grid':{'columns':6,'rows':4},'clips':{name:{'row':i,'frames':6,'fps':12,'sourceRects':rects[i],'sizeInHexes':1} for i,name in enumerate(names)},'bindings':bindings}
    (out/'vfx.json').write_text(json.dumps(fx,indent=2)+'\n')
