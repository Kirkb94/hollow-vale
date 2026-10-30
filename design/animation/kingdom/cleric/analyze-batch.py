"""Analyze unmodified generated atlases and write explicit source-rect rig manifests."""
from pathlib import Path
from collections import deque
from PIL import Image
import json,sys
ROOT=Path(__file__).resolve().parents[4]
DIRECTIONS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
INFO={
 'cleric':{'attack':'cast','gear':[('staff','right',[20,88],[.5,.67])],'clips':['holyBolt','heal','cast','spawn']},
 'paladin':{'attack':'attack','gear':[('hammer','right',[32,64],[.5,.8])],'clips':['hammerTrail','impact','heal','spawn']},
 'sunspeaker':{'attack':'cast','gear':[('scepter','right',[25,72],[.5,.75])],'clips':['solarOrb','verdictMarker','verdictStrike','spawn']},
 'aegis':{'attack':'attack','gear':[('mace','right',[23,58],[.5,.81]),('shield','left',[40,50],[.5,.5])],'clips':['maceTrail','aegis','shieldImpact','spawn']},
 'herald':{'attack':'attack','gear':[('sword','right',[18,58],[.5,.85]),('trumpet','left',[38,30],[.2,.5])],'clips':['slash','rally','rallyArrival','spawn']}
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
 cfg=INFO[key];folder=ROOT/'public/art/rigs/kingdom'/key
 im,cs=components(folder/'body.png');w,h=im.size
 cs=[c for c in cs if c['rect'][2]<w/3 and c['rect'][3]<h/3]
 if key=='aegis':
  merged=next(c for c in cs if c['rect'][0]<140 and c['rect'][1]>900 and c['rect'][3]>200)
  cs.remove(merged);cs.extend([{'rect':[33,956,96,119],'pixels':7000},{'rect':[33,1080,96,131],'pixels':7000}]);cs.sort(key=lambda c:c['pixels'],reverse=True)
 assert len(cs)>=72,(key,'not enough disconnected body parts',len(cs))
 ncols=4 if key=='herald' else 3
 cs=cs[:ncols*24];panels=[[] for _ in range(ncols*2)]
 for c in cs:
  x,y,cw,ch=c['rect'];panel=min(ncols-1,int((x+cw/2)/(w/ncols)))+ncols*min(1,int((y+ch/2)/(h/2)));panels[panel].append(c)
 assert all(len(p)==12 for p in panels),(key,[len(p) for p in panels])
 m={'version':1,'unit':key,'faction':'kingdom','style':'Arcane Vanguard','attack':cfg['attack'],'directions':DIRECTIONS,'partOrder':PARTS,'views':{},'equipment':{},'notes':['Body source uses six 3x4 cutout panels in a3x2 arrangement. Use explicit source rectangles, never regular-cell slicing.','All six views are independently drawn; weapons remain in anatomical hands.']}
 if key=='herald':panels=[panels[i] for i in [0,1,2,4,5,7]]
 for d,panel in zip(DIRECTIONS,panels):
  parts={}
  for name,c in zip(PARTS,order(panel,4)):
   r=c['rect'];parts[name]={'sourceRect':r,'renderRect':r.copy(),'pivot':[.5,.08],'alphaPixels':c['pixels']}
  parts['head']['pivot']=[.5,.9]
  for name in ['leftLeg','rightLeg']:
   parts[name]['renderRect'][3]=round(parts[name]['renderRect'][3]*.76)
  if key in ['paladin','aegis']:
   for name in ['leftUpperArm','rightUpperArm']:parts[name]['renderRect'][3]=round(parts[name]['renderRect'][3]*.6)
  if key=='aegis' and d in ['w','nw','ne']:
   parts['leftForearm']=dict(parts['rightForearm'],flipX=True)
  m['views'][d]={'file':'body.png','size':[w,h],'parts':parts}
 if key=='cleric':
  # The generated NE cape slot contains a duplicate head. Reuse only the symmetric back-cloak layer.
  m['views']['ne']['parts']['cape']=dict(m['views']['nw']['parts']['cape'],flipX=True)
  m['notes'].append('NE cape uses the mirrored NW cloak layer; head/torso/limbs remain genuinely separately authored NE parts.')
 gi,gc=components(folder/'equipment.png');count=6*len(cfg['gear']);assert len(gc)>=count,(key,'equipment',len(gc))
 gc=order(gc[:16],4,4)[:12] if key=='herald' else order(gc[:count],3,4) if key=='aegis' else order(gc[:count],count//3)
 eq={'file':'equipment.png','size':list(gi.size),'views':{}}
 for di,d in enumerate(DIRECTIONS):
  eq['views'][d]={}
  for j,(name,hand,size,pivot) in enumerate(cfg['gear']):eq['views'][d][name]={'sourceRect':gc[di*len(cfg['gear'])+j]['rect'],'pivot':pivot,'hand':hand,'displaySize':size}
 if key=='herald':
  eq['views']['w']['sword']['displaySize']=[58,18];eq['views']['w']['sword']['pivot']=[.85,.5]
  for d in ['sw','w']:eq['views'][d]['trumpet']['pivot']=[.8,.5]
  m['notes'].append('Source contains eight body panels; six true directional panels selected, unused extra panels retained in original. W sword is horizontally oriented in its source.')
 if key=='aegis':m['notes'].append('Rear left forearm reuses mirrored right forearm only; generator supplied duplicate legs in those slots. W connected leg pair has explicit split rectangles.')
 m['equipment']=eq
 (folder/'manifest.json').write_text(json.dumps(m,indent=2),encoding='utf-8')
 fi=Image.open(folder/'vfx.png');fw,fh=fi.size;v={'file':'vfx.png','size':[fw,fh],'columns':8,'rows':4,'clips':{},'bindings':{}}
 times=[400,700,550,700]
 for row,name in enumerate(cfg['clips']):
  v['clips'][name]={'row':row,'frames':8,'durationMs':times[row],'loop':name=='verdictMarker','anchor':[.5,.85] if name in ['spawn','heal','verdictMarker','rallyArrival'] else [.5,.5],'sourceRects':[[round(i*fw/8),round(row*fh/4),round((i+1)*fw/8)-round(i*fw/8),round((row+1)*fh/4)-round(row*fh/4)] for i in range(8)]}
  # Choose the alpha valley between hand-painted frames instead of slicing neighboring silhouettes.
  alpha=fi.getchannel('A');yp=round(row*fh/4);yb=round((row+1)*fh/4)
  sums=[sum(alpha.crop((x,yp,x+1,yb)).getdata()) for x in range(fw)]
  cuts=[0]+[min(range(round(i*fw/8)-35,round(i*fw/8)+36),key=lambda x:sums[x]) for i in range(1,8)]+[fw]
  v['clips'][name]['sourceRects']=[[cuts[i],yp,cuts[i+1]-cuts[i],yb-yp] for i in range(8)]
 v['bindings']={'attack':{'cast':cfg['clips'][0],'releaseMs':250,'travelMs':0},'spawn':'spawn'}
 if key=='cleric':v['bindings']['attack']={'cast':'cast','projectile':'holyBolt','releaseMs':250,'travelMs':300}
 if key=='paladin':v['bindings']['attack']['impact']='impact'
 if key in ['cleric','paladin']:v['bindings']['heal']={'impact':'heal'}
 if key=='sunspeaker':
  v['bindings']['attack']={'projectile':'solarOrb','releaseMs':250,'travelMs':300}
  v['bindings']['abilities']={'verdict':{'impact':'verdictMarker'}}
  v['delayedEvents']={'verdict:resolve':{'impact':'verdictStrike','note':'Trigger only when the existing delayed zone resolves, not immediately on cast.'}}
 if key=='aegis':
  v['bindings']['abilities']={'aegis':{'impact':'aegis'}}
  v['statusEvents']={'shield:absorb':{'impact':'shieldImpact','note':'Only confirmed damage absorbed by an existing Aegis shield.'}}
 if key=='herald':v['bindings']['abilities']={'rally':{'cast':'rally','impact':'rallyArrival'}}
 (folder/'vfx.json').write_text(json.dumps(v,indent=2),encoding='utf-8')
 print(key,'72body parts',count,'equipment props,32FXframes',im.size,gi.size,fi.size)
