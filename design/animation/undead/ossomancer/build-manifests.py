from pathlib import Path
from PIL import Image
import json,sys,runpy
mod=runpy.run_path(str(Path(__file__).with_name('analyze-batch.py')))
components,order=mod['components'],mod['order']
ROOT=mod['ROOT'];DIRECTIONS=mod['DIRECTIONS'];PARTS=mod['PARTS']
INFO={
'ossomancer':('cast','wand',[18,58],[.5,.75],['boneBolt','shrapnel','cast','spawn']),
'bonewitch':('cast','staff',[23,85],[.5,.72],['hexBolt','ossify','cast','spawn']),
'gravedigger':('attack','shovel',[27,78],[.5,.25],['shovelTrail','impact','grave','spawn']),
'lich':('cast','staff',[20,88],[.5,.72],['soulStorm','raiseDead','cast','spawn']),
'banshee':('cast','scepter',[17,46],[.5,.75],['wail','echo','cast','spawn'])}
for key in sys.argv[1:]:
 f=ROOT/'public/art/rigs/undead'/key;doc=ROOT/'design/animation/undead'/key
 data=json.loads((doc/'components.json').read_text());panels=data['panels'];w,h=data['size']
 m={'version':1,'unit':key,'faction':'undead','style':'Arcane Vanguard','attack':INFO[key][0],'directions':DIRECTIONS,'partOrder':PARTS,'views':{}}
 for di,(d,p) in enumerate(zip(DIRECTIONS,panels)):
  if key=='lich' and d=='nw':
   c=next(c for c in p if c['rect'][0]==877 and c['rect'][1]==520);p.remove(c)
   p.extend([{'rect':[877,520,154,165],'pixels':12000},{'rect':[886,687,90,96],'pixels':6000}])
  if key=='gravedigger':
   ox=di%3*512;oy=di//3*512
   def band(a,b):return sorted([c for c in p if a<=c['rect'][1]-oy<b],key=lambda c:c['rect'][0])
   head=band(0,30);top=band(50,100);pelvis=band(180,210 if di>=3 else 225);ups=band(210 if di>=3 else 225,290)[:2];middle=band(290,325);rl=band(325,380);boots=band(380,500)
   arranged=head+top+pelvis+ups+middle[:2]+middle[2:]+rl+boots
   assert len(arranged)==12,(key,d,len(arranged))
  else:arranged=order(p,4)
  assert len(arranged)==12,(key,d,len(arranged))
  parts={}
  for n,c in zip(PARTS,arranged):
   r=c['rect'];parts[n]={'sourceRect':r.copy(),'renderRect':r.copy(),'pivot':[.5,.9] if n=='head' else [.5,.08]}
  if key=='lich':
   r=parts['torso']['renderRect'];cut=30 if d in ['e','se','sw'] else 32;r[1]+=cut;r[3]-=cut
  m['views'][d]={'file':'body.png','size':[w,h],'parts':parts}
 gi,gc=components(f/'equipment.png');gc=order(gc[:6],2,3);assert len(gc)==6
 m['equipment']={'file':'equipment.png','size':list(gi.size),'views':{d:{INFO[key][1]:{'sourceRect':gc[i]['rect'],'hand':'right','displaySize':INFO[key][2],'pivot':INFO[key][3]}} for i,d in enumerate(DIRECTIONS)}}
 m['notes']=['Six independent directional source views. Explicit source rectangles preserve originals and animate separate pieces.']
 if key=='banshee':m['notes'].append('Leg and boot slots contain floating robe tails, preserving spectral identity.')
 (f/'manifest.json').write_text(json.dumps(m,indent=2))
 fi=Image.open(f/'vfx.png');fw,fh=fi.size;alpha=fi.getchannel('A')
 v={'file':'vfx.png','size':[fw,fh],'columns':8,'rows':4,'clips':{},'bindings':{}}
 for row,name in enumerate(INFO[key][4]):
  yp=round(row*fh/4);yb=round((row+1)*fh/4);sums=[sum(alpha.crop((x,yp,x+1,yb)).getdata()) for x in range(fw)]
  cuts=[0]+[min(range(max(0,round(i*fw/8)-45),min(fw,round(i*fw/8)+46)),key=lambda x:sums[x]) for i in range(1,8)]+[fw]
  rects=[]
  for i in range(8):
   ys=[sum(alpha.crop((cuts[i],y,cuts[i+1],y+1)).getdata()) for y in range(fh)]
   top=0 if row==0 else min(range(max(0,yp-25),min(fh,yp+26)),key=lambda y:ys[y])
   bottom=fh if row==3 else min(range(max(0,yb-25),min(fh,yb+26)),key=lambda y:ys[y])
   rects.append([cuts[i],top,cuts[i+1]-cuts[i],bottom-top])
  v['clips'][name]={'row':row,'frames':8,'durationMs':[450,700,550,700][row],'loop':False,'anchor':[.5,.8] if name in ['grave','spawn','raiseDead'] else [.5,.5],'sourceRects':rects}
 v['bindings']={'spawn':'spawn'}
 if key in ['ossomancer','bonewitch']:
  v['bindings']['attack']={'cast':'cast','projectile':INFO[key][4][0],'releaseMs':250,'travelMs':300}
  v['bindings']['abilities']={('shrapnel' if key=='ossomancer' else 'ossify'):{'cast':'cast','impact':INFO[key][4][1]}}
 elif key=='gravedigger':
  v['bindings']['attack']={'cast':'shovelTrail','impact':'impact','releaseMs':250}
  v['bindings']['abilities']={'grave':{'impact':'grave'}}
 elif key=='lich':
  v['bindings']['attack']={'cast':'cast','impact':'soulStorm','releaseMs':250}
  v['bindings']['abilities']={'raise':{'cast':'cast','impact':'raiseDead'}}
 else:v['bindings']['attack']={'cast':'wail','impact':'echo','releaseMs':250}
 (f/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'manifest ready')
