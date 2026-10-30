"""Read-only pixel analysis: persist component source rectangles, never alter PNGs."""
from pathlib import Path
from collections import deque
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[3]
ASSETS = ROOT / 'public/art/rigs/kingdom/knight'
DIRECTIONS = ['e','se','sw','w','nw','ne']
PARTS = ['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']

def analyze(path):
    im=Image.open(path).convert('RGBA'); w,h=im.size
    alpha=im.getchannel('A').tobytes(); seen=bytearray(w*h); components=[]
    for start,v in enumerate(alpha):
        if v<=64 or seen[start]: continue
        seen[start]=1; todo=deque([start]); count=0
        left=right=start%w; top=bottom=start//w
        while todo:
            p=todo.popleft(); x=p%w; y=p//w; count+=1
            left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
            for n in ((p-1 if x else -1),(p+1 if x+1<w else -1),p-w,p+w):
                if n<0 or n>=w*h or seen[n] or alpha[n]<=64:continue
                seen[n]=1;todo.append(n)
        if count>100:components.append({'rect':[left,top,right-left+1,bottom-top+1],'pixels':count})
    components=sorted(components,key=lambda a:a['pixels'],reverse=True)[:12]
    assert len(components)==12, (path,len(components))
    components.sort(key=lambda a:a['rect'][1]+a['rect'][3]*.5)
    ordered=[]
    for row in range(4):ordered+=sorted(components[row*3:row*3+3],key=lambda a:a['rect'][0])
    return {'file':path.name,'size':[w,h],'alpha':list(im.getchannel('A').getextrema()),'components':ordered}

out={'version':1,'unit':'knight','faction':'kingdom','style':'Arcane Vanguard','directions':DIRECTIONS,'atlasGrid':[3,4],
 'partOrder':PARTS,'views':{},'equipment':{},'notes':['Rects are connected-alpha component bounds, not regular grid cells. Source atlas pieces cross nominal row boundaries.','Pivot coordinates are normalized within each rect. Torso crop removes the repeated tabard below the belt.','Equipment E/W shields are illustrated broad-face for readability; narrow them in profile rather than treating the art as geometrically exact.']}
for direction in DIRECTIONS:
    info=analyze(ASSETS/(direction+'.png'))
    parts={}
    for name,c in zip(PARTS,info.pop('components')):
        rect=c['rect'];render=rect.copy()
        if name=='torso':render[3]=round(render[3]*.64)
        if name in ['leftLeg','rightLeg']:render[3]=round(render[3]*.83)
        parts[name]={'sourceRect':rect,'renderRect':render,'pivot':[.5,.08],'alphaPixels':c['pixels']}
    parts['head']['pivot']=[.5,.92]
    parts['pelvis']['pivot']=[.5,.04]
    info['parts']=parts;out['views'][direction]=info
gear=analyze(ASSETS/'equipment.png');components=gear.pop('components');gear['views']={}
for i,direction in enumerate(DIRECTIONS):
    gear['views'][direction]={'sword':{'sourceRect':components[i*2]['rect'],'pivot':[.5,.85]},'shield':{'sourceRect':components[i*2+1]['rect'],'pivot':[.5,.48]}}
out['equipment']=gear
out['handedness']={'sword':'anatomical-right','shield':'anatomical-left','screenLeftIsAnatomicalLeft':{d:d in ['nw','ne'] for d in DIRECTIONS}}
out['animationHints']={'idle':{'loopMs':1800,'headDegrees':1,'capeDegrees':2},'walk':{'loopMs':690,'limbSwingDegrees':14,'footLiftPxAt200Height':5,'opposedArms':True},'attack':{'durationMs':800,'weaponHand':'right','windupMs':240,'contactMs':360,'recoveryMs':440},'hurt':{'durationMs':450},'death':{'durationMs':1100,'collapseMs':800,'fadeFromMs':750},'spawn':{'durationMs':600}}
for d in ['sw','w','nw']:out['views'][d]['parts']['rightBoot']['flipX']=True
(ASSETS/'manifest.json').write_text(json.dumps(out,indent=2),encoding='utf-8')
print('Validated six transparent body atlases (72 parts) and equipment atlas (12 props).')
