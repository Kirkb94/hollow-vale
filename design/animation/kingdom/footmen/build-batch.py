"""Read source alpha and write rig metadata. Source PNG artwork is never modified."""
import json,sys
from pathlib import Path
from collections import deque
from PIL import Image
ROOT=Path(__file__).resolve().parents[4]
DIRS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
CONFIG={
 'footmen':{'attack':'thrust','props':[('spear','right',[16,155],[.5,.66]),('shield','left',[38,60],[.5,.48])],'clips':['thrust','impact','armorContact','arrival'],'bindings':{'attack':{'cast':'thrust','impact':'impact','releaseMs':190,'travelMs':0},'spawn':'arrival'}},
 'bowmen':{'attack':'shoot','props':[('bow','left',[34,105],[.5,.5]),('arrow','right',[7,85],[.5,.65]),('quiver','back',[20,62],[.5,.18])],'clips':['projectile','release','impact','arrival'],'bindings':{'attack':{'cast':'release','projectile':'projectile','impact':'impact','releaseMs':110,'travelMs':320},'spawn':'arrival'}},
 'raiders':{'attack':'attack','props':[('sword','right',[18,66],[.5,.85]),('dagger','left',[13,43],[.5,.85])],'clips':['slash','impact','chargeDust','arrival'],'bindings':{'attack':{'cast':'slash','impact':'impact','releaseMs':250,'travelMs':0},'spawn':'arrival'}},
 'lookout':{'attack':'shoot','props':[('spyglass','left',[18,45],[.5,.65]),('flareBaton','right',[12,52],[.5,.8])],'clips':['projectile','impact','flare','reveal'],'bindings':{'attack':{'projectile':'projectile','impact':'impact','releaseMs':180,'travelMs':320},'abilities':{'flare':{'cast':'flare','impact':'reveal'}}}},
 'marshal':{'attack':'attack','props':[('sword','right',[20,102],[.5,.85]),('baton','left',[14,48],[.5,.76])],'clips':['slash','impact','chargeDust','momentum'],'bindings':{'attack':{'cast':'slash','impact':'impact','releaseMs':260,'travelMs':0}}}
}
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
 yb=[0]+[boundary(ys,round(i*h/4),round(h/12)) for i in range(1,4)]+[h]
 result=[]
 for r in range(4):
  xs=[sum(px[x,y]>64 for y in range(yb[r],yb[r+1])) for x in range(w)]
  xb=[0]+[boundary(xs,round(i*w/6),round(w/30)) for i in range(1,6)]+[w]
  result.append([[xb[c],yb[r],xb[c+1]-xb[c],yb[r+1]-yb[r]] for c in range(6)])
 return result
def build(key):
 conf=CONFIG[key];out=ROOT/'public/art/rigs/kingdom'/key;doc=ROOT/'design/animation/kingdom'/key
 im=Image.open(out/'body.png');parts=components(im);panels={d:[] for d in DIRS}
 for v in parts:
  x,y,w,h=v['rect'];col=min(2,int((x+w/2)/im.width*3));row=min(1,int((y+h/2)/im.height*2));panels[DIRS[row*3+col]].append(v)
 kit=json.loads((doc/'kit.json').read_text(encoding='utf-8'))
 m={'version':1,'unit':key,'faction':'kingdom','style':'Arcane Vanguard','attack':conf['attack'],'group':kit.get('group',1),'directions':DIRS,'atlasGrid':[9,8],'partOrder':PARTS,'views':{},'notes':['Atlas has six direction panels, each3x4parts. Use explicit rectangles.','One rig is one member; actual squad group count is '+str(kit.get('group',1))+'.','Original PNG sources unchanged. Alpha connected components locate pieces.','Torso/leg render crops remove generated duplicate tunic hem/boot under separate layers.','Minor hand/cloth shading differences across generated views remain.'],'animationHints':{'idle':{'loopMs':1800},'walk':{'loopMs':680,'limbSwingDegrees':14},'attack':{'durationMs':800,'weaponHand':'right'},'hurt':{'durationMs':450},'death':{'durationMs':1100},'spawn':{'durationMs':600}}}
 for d in DIRS:
  pp=panels[d]
  count=11 if key=='marshal' else 12
  if len(pp)<count:raise ValueError((key,d,'missing parts',len(pp)))
  pp=sorted(pp,key=lambda p:p['pixels'],reverse=True)[:count]
  pp.sort(key=lambda p:p['rect'][1]+p['rect'][3]/2)
  pp=[p for i in range(0,12,3) for p in sorted(pp[i:i+3],key=lambda p:p['rect'][0])]
  if key=='bowmen' and d in ['sw','ne']:
   pp=[p for i in range(0,12,3) for p in reversed(pp[i:i+3])]
  if key=='marshal':
   if d=='ne':pp=[p for i in range(0,11,3) for p in reversed(pp[i:i+3])]
   pp.append(pp[-1])
  view={'file':'body.png','size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'parts':{}}
  for name,p in zip(PARTS,pp):
   r=p['rect'];rr=r.copy()
   if name=='torso':rr[3]=round(rr[3]*.82)
   if name=='torso' and key in ['bowmen','lookout','raiders']:
    inset=round(rr[2]*.16);rr[0]+=inset;rr[2]-=inset*2
   if key=='bowmen' and d in ['sw','ne'] and name=='pelvis':rr[2]=round(rr[2]*.65)
   if name in ['leftLeg','rightLeg']:rr[3]=round(rr[3]*.68)
   if key in ['bowmen','lookout'] and name in ['leftUpperArm','rightUpperArm']:rr[3]=round(rr[3]*.57)
   if key=='marshal' and name in ['leftUpperArm','rightUpperArm']:rr[3]=round(rr[3]*.52)
   view['parts'][name]={'sourceRect':r,'renderRect':rr,'pivot':[.5,.9] if name=='head' else [.5,.08],'alphaPixels':p['pixels']}
   if key=='marshal' and name=='rightBoot':view['parts'][name]['flipX']=True
  m['views'][d]=view
 if (out/'equipment.png').exists():
  eq=Image.open(out/'equipment.png');m['equipment']={'file':'equipment.png','size':list(eq.size),'views':{}}
  for i,d in enumerate(DIRS):m['equipment']['views'][d]={name:{'sourceRect':rect_in_cell(eq,i,j,6,len(conf['props'])),'pivot':pivot,'hand':hand,'displaySize':size} for j,(name,hand,size,pivot) in enumerate(conf['props'])}
 m['status']='art-ready' if 'equipment' in m else 'awaiting-equipment'
 (out/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
 if (out/'vfx.png').exists():
  fx=Image.open(out/'vfx.png');v={'version':1,'unit':key,'file':'vfx.png','size':list(fx.size),'columns':6,'rows':4,'alpha':list(fx.getchannel('A').getextrema()),'clips':{},'bindings':conf['bindings'],'notes':['Effects are presentation only and do not change mechanics.','Armor, charge-dust and Momentum assets are provided without inventing unconfirmed proc hooks.','Respect existing fog/visibility and reduced-motion rules.']}
  exact=effect_rects(fx)
  for row,name in enumerate(conf['clips']):
   rects=[]
   for col in range(6):
    x0=round(col*fx.width/6);x1=round((col+1)*fx.width/6);y0=round(row*fx.height/4);y1=round((row+1)*fx.height/4);rects.append([x0,y0,x1-x0,y1-y0])
   v['clips'][name]={'row':row,'frames':6,'fps':12 if name not in ['arrival','reveal'] else 8,'loop':name=='projectile','anchor':[.5,.5] if name not in ['arrival','reveal','chargeDust'] else [.5,.8],'sourceRects':exact[row],'durationMs':500 if name not in ['arrival','reveal'] else 750}
  (out/'vfx.json').write_text(json.dumps(v,indent=2),encoding='utf-8')
 print(key, '72 body parts',im.size,'equipment',bool(m.get('equipment')),'VFX',(out/'vfx.png').exists())
for key in sys.argv[1:] or CONFIG:
 if (ROOT/'public/art/rigs/kingdom'/key/'body.png').exists():build(key)
