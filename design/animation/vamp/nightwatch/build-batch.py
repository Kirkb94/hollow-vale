"""Read source alpha and write rig metadata. Source PNG artwork is never modified."""
import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
DIRS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CONFIG=json.loads('{"nightwatch":{"attack":"attack","props":[["spyglass","right",[14,45],[0.5,0.65]],["lantern","left",[25,38],[0.5,0.1]]],"clips":["slash","impact","flare","reveal","arrival"],"bindings":{"attack":{"cast":"slash","impact":"impact","releaseMs":250,"travelMs":0},"abilities":{"flare":{"cast":"flare","impact":"reveal"}},"spawn":"arrival"}},"hemomancer":{"attack":"cast","props":[["vial","right",[14,42],[0.5,0.5]],["bloodOrb","left",[26,26],[0.5,0.5]]],"clips":["projectile","impact","cast","tether","drain"],"bindings":{"attack":{"cast":"cast","projectile":"projectile","impact":"impact","releaseMs":250,"travelMs":300},"abilities":{"tether":{"cast":"cast","impact":"tether"}}},"statusEvents":{"tether:tick":{"impact":"drain"}}},"mesmerist":{"attack":"cast","props":[["fan","right",[46,35],[0.5,0.94]],["eyeOrb","left",[28,28],[0.5,0.5]]],"clips":["projectile","impact","command","charmed","arrival"],"bindings":{"attack":{"projectile":"projectile","impact":"impact","releaseMs":250,"travelMs":300},"abilities":{"command":{"cast":"command","impact":"charmed"}},"spawn":"arrival"}},"duskweaver":{"attack":"attack","props":[["veilCloth","left",[38,44],[0.08,0.08]]],"clips":["slash","impact","cast","veil","arrival"],"bindings":{"attack":{"cast":"slash","impact":"impact","releaseMs":250,"travelMs":0},"abilities":{"veil":{"cast":"cast","impact":"veil"}},"spawn":"arrival"}},"matriarch":{"attack":"cast","props":[["fan","right",[43,38],[0.5,0.94]],["rubyOrb","left",[30,30],[0.5,0.5]]],"clips":["projectile","impact","cast","siphon","receipt"],"bindings":{"attack":{"cast":"cast","projectile":"projectile","impact":"impact","releaseMs":250,"travelMs":300}},"statusEvents":{"bloodpact:gain":{"impact":"receipt"}}}}')

def components(im):
 w,h=im.size;a=bytearray(im.getchannel('A').point(lambda x:255 if x>32 else 0).tobytes());out=[]
 for i in range(w*h):
  if not a[i]:continue
  a[i]=0;q=deque([i]);n=0;x0=w;y0=h;x1=y1=0
  while q:
   p=q.popleft();y,x=divmod(p,w);n+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   for z in ([p-1] if x else [])+([p+1] if x+1<w else [])+([p-w] if y else [])+([p+w] if y+1<h else []):
    if a[z]:a[z]=0;q.append(z)
  if n>160:out.append({'pixels':n,'rect':[x0,y0,x1-x0+1,y1-y0+1]})
 return out
def rect_in_cell(im,col,row,cols,rows):
 x0=round(col*im.width/cols);y0=round(row*im.height/rows);x1=round((col+1)*im.width/cols);y1=round((row+1)*im.height/rows)
 bb=im.getchannel('A').crop((x0,y0,x1,y1)).point(lambda x:255 if x>32 else 0).getbbox()
 if not bb:raise ValueError('empty equipment cell')
 return [x0+bb[0],y0+bb[1],bb[2]-bb[0],bb[3]-bb[1]]

def effect_rects(im):
 # Generators space rows unevenly; find transparent separator bands rather than clipping at nominal cells.
 a=im.getchannel('A');px=a.load();w,h=im.size
 ys=[sum(px[x,y]>64 for x in range(w)) for y in range(h)]
 def boundary(scores,at,span):
  return min(range(max(2,at-span),min(len(scores)-2,at+span)),key=lambda n:sum(scores[n-2:n+3])+abs(n-at)*.01)
 yb=[0]+[boundary(ys,round(i*h/5),round(h/12)) for i in range(1,5)]+[h]
 result=[]
 for r in range(5):
  xs=[sum(px[x,y]>64 for y in range(yb[r],yb[r+1])) for x in range(w)]
  xb=[0]+[boundary(xs,round(i*w/6),round(w/30)) for i in range(1,6)]+[w]
  result.append([[xb[c],yb[r],xb[c+1]-xb[c],yb[r+1]-yb[r]] for c in range(6)])
 return result
def build(key):
 conf=CONFIG[key];out=ROOT/'public/art/rigs/vamp'/key;doc=ROOT/'design/animation/vamp'/key
 im=Image.open(out/'body.png');parts=components(im);panels={d:[] for d in DIRS}
 for v in parts:
  x,y,w,h=v['rect'];col=min(2,int((x+w/2)/im.width*3));row=min(1,int((y+h/2)/im.height*2));panels[DIRS[row*3+col]].append(v)
 kit=json.loads((doc/'kit.json').read_text(encoding='utf-8'))
 m={'version':1,'unit':key,'faction':'vamp','style':'Arcane Vanguard','attack':conf['attack'],'group':kit.get('group',1),'directions':DIRS,'layout':'explicit-source-rectangles','partOrder':PARTS,'views':{},'notes':['Generated atlas layouts vary; explicit rectangles are authoritative.','One rig is one member; actual squad group count is '+str(kit.get('group',1))+'.','Original PNG sources unchanged. Alpha connected components locate pieces.','Independent articulated pieces; source PNG remains unchanged.','Minor hand/cloth shading differences across generated views remain.'],'animationHints':{'idle':{'loopMs':1800},'walk':{'loopMs':680,'limbSwingDegrees':14},'attack':{'durationMs':800,'weaponHand':'right'},'hurt':{'durationMs':450},'death':{'durationMs':1100},'spawn':{'durationMs':600}}}
 for d in DIRS:
  maps=json.loads((ROOT/'design/animation/vamp/nightwatch/part-maps.json').read_text(encoding='utf-8-sig'))
  cs=json.loads((doc/'components.json').read_text())
  pp=[cs[i] for i in maps[key][d]]
  view={'file':'body.png','size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'parts':{}}
  for name,p in zip(PARTS,pp):
   r=p['rect'];rr=r.copy()
   if key=='nightwatch':
    if name=='head':rr[3]=100
    if name=='torso':rr={'e':[72,115,97,140],'se':[325,115,112,140],'sw':[590,115,105,140],'w':[840,115,100,140],'nw':[1090,115,110,140],'ne':[1370,115,95,140]}[d]
    if name=='cape' and d=='ne':rr=[1452,141,70,240]
   if key=='hemomancer':
    if name=='rightLeg':rr[3]=round(rr[3]*.82)
    if name=='head':rr[3]=round(rr[3]*.8)
   if key=='mesmerist':
    if d=='sw' and name=='head':rr=[1178,9,116,122]
    if d=='sw' and name=='torso':rr=[1185,129,109,81]
    if d=='ne' and name=='head':rr=[1170,522,124,118]
    if d=='ne' and name=='torso':rr=[1170,640,124,81]
    if d=='ne' and name=='cape':rr=[1348,640,129,103]
    if d=='nw' and name=='rightUpperArm':rr[3]=80
   if key=='matriarch':
    if name=='cape':rr[1]+=30;rr[3]-=30
    if name in ['leftLeg','rightLeg']:rr[3]=round(rr[3]*.63)
    if d=='se' and name=='pelvis':rr=[551,168,207,177]
    if d=='se' and name=='leftLeg':rr=[602,345,80,97]
   view['parts'][name]={'sourceRect':r,'renderRect':rr,'pivot':[.5,.9] if name=='head' else [.5,.08],'alphaPixels':p['pixels'],'isolate':True}
   if key=='mesmerist' and d=='e' and name=='head':view['parts'][name]['flipX']=True
   if key=='hemomancer' and d!='sw' and name=='rightForearm':view['parts'][name]['flipX']=True
   if key=='marshal' and name=='rightBoot':view['parts'][name]['flipX']=True
  m['views'][d]=view
 if (out/'equipment.png').exists():
  eq=Image.open(out/'equipment.png');m['equipment']={'file':'equipment.png','size':list(eq.size),'views':{}}
  eqparts=sorted(components(eq),key=lambda p:p['pixels'],reverse=True)[:len(conf['props'])*6]
  eqparts.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2)
  eqrows=[sorted(eqparts[j*6:j*6+6],key=lambda p:p['rect'][0]) for j in range(len(conf['props']))]
  for i,d in enumerate(DIRS):m['equipment']['views'][d]={name:{'sourceRect':eqrows[j][i]['rect'],'pivot':pivot,'hand':hand,'displaySize':size} for j,(name,hand,size,pivot) in enumerate(conf['props'])}
 m['status']='art-ready' if 'equipment' in m else 'awaiting-equipment'
 (out/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
 if (out/'vfx.png').exists():
  fx=Image.open(out/'vfx.png');v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':5,'alpha':list(fx.getchannel('A').getextrema()),'clips':{},'bindings':conf['bindings'],'statusEvents':conf.get('statusEvents',{}),'notes':['Effects are presentation only and do not change mechanics.','Status events are tied to actual tether damage and actual Blood Pact mana gain.','Respect existing fog/visibility and reduced-motion rules.']}
  exact=effect_rects(fx)
  for row,name in enumerate(conf['clips']):
   rects=[]
   for col in range(6):
    x0=round(col*fx.width/6);x1=round((col+1)*fx.width/6);y0=round(row*fx.height/4);y1=round((row+1)*fx.height/4);rects.append([x0,y0,x1-x0,y1-y0])
   v['clips'][name]={'row':row,'frames':6,'fps':12 if name not in ['arrival','reveal'] else 8,'loop':name=='projectile','anchor':[.5,.5] if name not in ['arrival','reveal','chargeDust'] else [.5,.8],'sourceRects':exact[row],'durationMs':500 if name not in ['arrival','reveal'] else 750}
  (out/'vfx.json').write_text(json.dumps(v,indent=2),encoding='utf-8')
 print(key, '72 body parts',im.size,'equipment',bool(m.get('equipment')),'VFX',(out/'vfx.png').exists())
for key in sys.argv[1:] or CONFIG:
 if (ROOT/'public/art/rigs/vamp'/key/'body.png').exists():build(key)
