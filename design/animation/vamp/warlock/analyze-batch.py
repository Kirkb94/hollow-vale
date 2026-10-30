"""Analyze unmodified generated atlases and write explicit source-rect rig manifests."""
from pathlib import Path
from collections import deque
from PIL import Image
import json,sys
ROOT=Path(__file__).resolve().parents[4]
DIRECTIONS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
INFO={
 'warlock':{'attack':'cast','gear':[('orb','right',[28,32],[.5,.8])],'clips':['bolt','drain','cast','transform']},
 'assassin':{'attack':'thrust','gear':[('leftDagger','left',[13,42],[.5,.83]),('rightDagger','right',[13,42],[.5,.83])],'clips':['thrust','impact','deathSmoke','spawn']},
 'thrall':{'attack':'attack','gear':[('leftChain','left',[19,30],[.5,.1]),('rightChain','right',[19,30],[.5,.1])],'clips':['fistTrail','impact','drain','spawn']},
 'countess':{'attack':'cast','gear':[('staff','right',[20,85],[.5,.7])],'clips':['bolt','drain','cast','spawn']},
 'bloodhunter':{'attack':'thrust','gear':[('lance','right',[24,92],[.5,.75])],'clips':['thrust','impact','drain','spawn']}
}

def components(path):
 im=Image.open(path).convert('RGBA');w,h=im.size;a=im.getchannel('A').tobytes();seen=bytearray(w*h);out=[]
 for st,v in enumerate(a):
  if v<=64 or seen[st]:continue
  seen[st]=1;q=deque([st]);num=0;left=right=st%w;top=bottom=st//w
  while q:
   p=q.popleft();x=p%w;y=p//w;num+=1;left=min(left,x);right=max(right,x);top=min(top,y);bottom=max(bottom,y)
   for n in ((p-1 if x else -1),(p+1 if x+1<w else -1),p-w,p+w):
    if n<0 or n>=w*h or seen[n] or a[n]<=64:continue
    seen[n]=1;q.append(n)
  if num>50:out.append({'rect':[left,top,right-left+1,bottom-top+1],'pixels':num})
 return im,sorted(out,key=lambda o:o['pixels'],reverse=True)
def order(cs,rows,cols=3):
 cs=sorted(cs,key=lambda a:a['rect'][1]+a['rect'][3]*.5);out=[]
 for row in range(rows):out+=sorted(cs[row*cols:row*cols+cols],key=lambda a:a['rect'][0]+a['rect'][2]*.5)
 return out
for key in sys.argv[1:]:
 cfg=INFO[key];folder=ROOT/'public/art/rigs/vamp'/key
 im,cs=components(folder/'body.png');w,h=im.size
 cs=[c for c in cs if c['rect'][2]<w/3 and c['rect'][3]<h/3]
 if key=='thrall':
  for x,y in [(1100,4),(1091,518)]:
   c=next(c for c in cs if c['rect'][:2]==[x,y]);r=c['rect'];cs.append({'rect':[x,y,r[2],48],'pixels':3000});c['rect']=[x,y+48,r[2],r[3]-48]
  c=next(c for c in cs if c['rect'][:2]==[862,772]);c['rect']=[862,772,109,122];cs.append({'rect':[862,900,109,94],'pixels':6000})
 assert len(cs)>=(66 if key=='countess' else 72),(key,'not enough disconnected body parts',len(cs))
 ncols=3
 cs=cs[:66 if key=='countess' else ncols*24];panels=[[] for _ in range(ncols*2)]
 for c in cs:
  x,y,cw,ch=c['rect'];panel=min(ncols-1,int((x+cw/2)/(w/ncols)))+ncols*min(1,int((y+ch/2)/(h/2)));panels[panel].append(c)
 assert all(len(p)==(11 if key=='countess' else 12) for p in panels),(key,[len(p) for p in panels])
 m={'version':1,'unit':key,'faction':'vamp','style':'Arcane Vanguard','attack':cfg['attack'],'directions':DIRECTIONS,'partOrder':PARTS,'views':{},'equipment':{},'notes':['Body source uses six 3x4 cutout panels in a3x2 arrangement. Use explicit source rectangles, never regular-cell slicing.','All six views are independently drawn; weapons remain in anatomical hands.']}
 for d,panel in zip(DIRECTIONS,panels):
  parts={}
  if key=='countess':
   top=sorted(sorted(panel,key=lambda c:c['rect'][1])[:3],key=lambda c:c['rect'][0]);rest=[c for c in panel if c not in top]
   skirt=min(rest,key=lambda c:c['rect'][1]);rest.remove(skirt)
   arms=sorted(sorted(rest,key=lambda c:c['rect'][1])[:2],key=lambda c:c['rect'][0]);rest=[c for c in rest if c not in arms]
   extra=min(rest,key=lambda c:c['rect'][1]);rest.remove(extra)
   legs=sorted(sorted(rest,key=lambda c:c['rect'][1])[:2],key=lambda c:c['rect'][0]);boots=sorted([c for c in rest if c not in legs],key=lambda c:c['rect'][0])
   ups=[];lows=[]
   for c in arms:
    x,y,cw,ch=c['rect'];split=round(ch*.55);ups.append({'rect':[x,y,cw,split],'pixels':c['pixels']//2});lows.append({'rect':[x,y+split,cw,ch-split],'pixels':c['pixels']//2})
   ordered=top+[skirt]+ups+lows+legs+boots
  else:ordered=order(panel,4)
  for name,c in zip(PARTS,ordered):
   r=c['rect'];parts[name]={'sourceRect':r,'renderRect':r.copy(),'pivot':[.5,.08],'alphaPixels':c['pixels']}
  parts['head']['pivot']=[.5,.9]
  if key=='thrall' and d in ['e','se','w','nw']:
   r=parts['torso']['renderRect'];r[1]+=45;r[3]-=45
  if key=='thrall' and d in ['sw','ne']:
   x,y=(1100,4) if d=='sw' else (1091,518)
   parts['head']={'sourceRect':[x+30,y,85,52],'renderRect':[x+30,y,85,52],'pivot':[.5,.9]}
   parts['torso']={'sourceRect':[x,y+48,144,108],'renderRect':[x,y+48,144,108],'pivot':[.5,.08]}
  if key=='countess':parts['head']['renderRect'][3]=round(parts['head']['renderRect'][3]*.55)
  m['views'][d]={'file':'body.png','size':[w,h],'parts':parts}
 gi,gc=components(folder/'equipment.png');count=6*len(cfg['gear']);assert len(gc)>=count,(key,'equipment',len(gc))
 gc=order(gc[:count],3,4) if count==12 else order(gc[:count],2,3)
 eq={'file':'equipment.png','size':list(gi.size),'views':{}}
 for di,d in enumerate(DIRECTIONS):
  eq['views'][d]={}
  for j,(name,hand,size,pivot) in enumerate(cfg['gear']):eq['views'][d][name]={'sourceRect':gc[di*len(cfg['gear'])+j]['rect'],'pivot':pivot,'hand':hand,'displaySize':size}
 m['equipment']=eq
 (folder/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
 fi=Image.open(folder/'vfx.png');fw,fh=fi.size;v={'file':'vfx.png','size':[fw,fh],'columns':8,'rows':4,'clips':{},'bindings':{}}
 times=[400,700,550,700]
 for row,name in enumerate(cfg['clips']):
  v['clips'][name]={'row':row,'frames':8,'durationMs':times[row],'loop':name=='verdictMarker','anchor':[.5,.85] if name in ['spawn','heal','verdictMarker','rallyArrival'] else [.5,.5],'sourceRects':[[round(i*fw/8),round(row*fh/4),round((i+1)*fw/8)-round(i*fw/8),round((row+1)*fh/4)-round(row*fh/4)] for i in range(8)]}
  # Choose the alpha valley between hand-painted frames instead of slicing neighboring silhouettes.
  alpha=fi.getchannel('A');yp=round(row*fh/4);yb=round((row+1)*fh/4)
  sums=[sum(alpha.crop((x,yp,x+1,yb)).getdata()) for x in range(fw)]
  cuts=[0]+[min(range(round(i*fw/8)-55,round(i*fw/8)+56),key=lambda x:sums[x]) for i in range(1,8)]+[fw]
  rects=[]
  for i in range(8):
   ys=[sum(alpha.crop((cuts[i],y,cuts[i+1],y+1)).get_flattened_data()) for y in range(fh)]
   top=0 if row==0 else min(range(max(0,yp-30),min(fh,yp+31)),key=lambda y:ys[y])
   bottom=fh if row==3 else min(range(max(0,yb-30),min(fh,yb+31)),key=lambda y:ys[y])
   rects.append([cuts[i],top,cuts[i+1]-cuts[i],bottom-top])
  v['clips'][name]['sourceRects']=rects
 v['bindings']={'attack':{'cast':cfg['clips'][0],'releaseMs':250},'spawn':'transform' if key=='warlock' else 'spawn'}
 if key in ['warlock','countess']:
  v['bindings']['attack']={'cast':'cast','projectile':'bolt','releaseMs':250,'travelMs':300}
 else:v['bindings']['attack']['impact']='impact'
 if key!='assassin':v['bindings']['drain']={'clip':'drain','durationMs':400}
 if key=='warlock':v['bindings']['transform']={'cast':'transform'}
 if key=='assassin':v['bindings']['death']={'impact':'deathSmoke'}
 (folder/'vfx.json').write_text(json.dumps(v,indent=2),encoding='utf-8')
 print(key,'72body parts',count,'equipment props,32FXframes',im.size,gi.size,fi.size)
