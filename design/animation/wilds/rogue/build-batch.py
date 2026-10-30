"""Measure generated cutouts; write metadata without changing PNGs."""
import json
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
code=(ROOT/'design/animation/vamp/nightwatch/build-batch.py').read_text()
exec(code[code.index('def components'):code.index('def build')])
DIRS=['e','se','sw','w','nw','ne']
NAMES=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
for k in ['rogue','archer','trapper']:
    out=ROOT/'public/art/rigs/wilds'/k
    doc=ROOT/'design/animation/wilds'/k
    im=Image.open(out/'body.png');cs=components(im)
    (doc/'components.json').write_text(json.dumps(cs,indent=2))
    cols=[sorted([c for c in cs if int((c['rect'][0]+c['rect'][2]/2)/im.width*6)==i],key=lambda c:c['rect'][1]) for i in range(6)]
    if k=='archer':
        for col in cols:
            r=col[0]['rect'];cut=139
            col[:1]=[{'rect':[r[0],r[1],r[2],cut-r[1]]},{'rect':[r[0],cut,r[2],r[1]+r[3]-cut]}]
    print(k,[len(c) for c in cols])
    if any(len(c)!=12 for c in cols):continue
    m={'version':1,'unit':k,'faction':'wilds','style':'Arcane Vanguard','attack':'shoot' if k=='archer' else 'thrust','partOrder':NAMES,'views':{}}
    for i,d in enumerate(DIRS):
        m['views'][d]={'file':'body.png','parts':{name:{'sourceRect':p['rect'],'isolate':True} for name,p in zip(NAMES,cols[i])}}
    if k=='rogue':
        m['views']['sw']['parts']['head']['flipX']=True
        m['views']['ne']['parts']['head']={'sourceRect':cols[4][0]['rect'],'flipX':True,'isolate':True}
    if k=='archer':
        m['views']['sw']['parts']['head']['flipX']=True
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'equipment.png').exists():continue
    eq=Image.open(out/'equipment.png');items=components(eq)
    count=18 if k=='archer' else 12
    items=sorted(items,key=lambda p:p['pixels'],reverse=True)[:count]
    items.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2)
    rows=[sorted(items[j:j+6],key=lambda p:p['rect'][0]+p['rect'][2]/2) for j in range(0,count,6)]
    m['equipment']={'file':'equipment.png','views':{}}
    for i,d in enumerate(DIRS):
        if k=='rogue':
            r=rows[0][i]['rect'];scale=46/max(r[2:]);pivots=[[.13,.5],[.8,.18],[.8,.18],[.85,.5],[.8,.82],[.2,.85]]
            rotation=[-1.5708,2.6,2.4,1.5708,.7854,-.7854][i]
            pieces={'dagger':{'sourceRect':r,'hand':'right','displaySize':[r[2]*scale,r[3]*scale],'pivot':pivots[i],'rotation':rotation}}
        elif k=='archer':
            pieces={name:{'sourceRect':rows[j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate([('bow','left',[24,80],[.5,.5]),('arrow','right',[8,63],[.5,.72]),('quiver','back',[26,57],[.5,.2])])}
        else:
            pieces={name:{'sourceRect':rows[j][i]['rect'],'hand':hand,'displaySize':size,'pivot':pivot} for j,(name,hand,size,pivot) in enumerate([('spear','right',[14,94],[.5,.68]),('trap','left',[36,31],[.5,.15])])}
        if k=='archer':
            for piece in pieces.values():
                r=piece['sourceRect'];w,h=piece['displaySize'];scale=min(w/r[2],h/r[3]);piece['displaySize']=[r[2]*scale,r[3]*scale]
        m['equipment']['views'][d]=pieces
    (out/'manifest.json').write_text(json.dumps(m,indent=2)+'\n')
    if not (out/'vfx.png').exists():continue
    fn=code[code.index('def effect_rects'):code.index('def build')].replace('i*h/5','i*h/4').replace('range(1,5)','range(1,4)').replace('range(5)','range(4)')
    exec(fn)
    rects=effect_rects(Image.open(out/'vfx.png'))
    names=['slash','impact','arrival','trail'] if k=='rogue' else ['projectile','impact','arrival','release'] if k=='archer' else ['projectile','impact','snare','arrival']
    bindings={'attack':{'cast':'slash','impact':'impact'},'spawn':'arrival','movement':'trail'} if k=='rogue' else {'attack':{'projectile':'projectile','impact':'impact'},'spawn':'arrival'}
    if k=='archer':bindings['attack']['cast']='release'
    if k=='trapper':bindings['abilities']={'trap':{'impact':'snare'}}
    fx={'version':1,'unit':k,'faction':'wilds','file':'vfx.png','grid':{'columns':6,'rows':4},'clips':{name:{'row':i,'frames':6,'fps':12,'sourceRects':rects[i],'sizeInHexes':1} for i,name in enumerate(names)},'bindings':bindings}
    (out/'vfx.json').write_text(json.dumps(fx,indent=2)+'\n')
