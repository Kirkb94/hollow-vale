from pathlib import Path
from PIL import Image
import json,sys,runpy
mod=runpy.run_path(str(Path(__file__).with_name('analyze-batch.py')))
components,order=mod['components'],mod['order'];ROOT=mod['ROOT'];DIRECTIONS=mod['DIRECTIONS'];PARTS=mod['PARTS']
INFO={
'bomber':('shoot','bomb',[22,25],[.5,.85],['bomb','explosion','cast','spawn']),
'infernowitch':('cast','wand',[16,55],[.5,.8],['hellfire','burn','cast','spawn']),
'cinderwarden':('cast','staff',[24,84],[.5,.72],['firebolt','flamewall','cast','spawn']),
'hellbinder':('thrust','chain',[27,55],[.5,.05],['chainStrike','hook','burn','spawn']),
'pactbroker':('cast','contract',[23,34],[.5,.65],['pactbolt','bargain','cast','spawn'])}
for key in sys.argv[1:]:
 f=ROOT/'public/art/rigs/infernal'/key;doc=ROOT/'design/animation/infernal'/key
 data=json.loads((doc/'components.json').read_text());panels=data['panels'];w,h=data['size']
 m={'version':1,'unit':key,'faction':'infernal','style':'Arcane Vanguard','attack':INFO[key][0],'directions':DIRECTIONS,'partOrder':PARTS,'views':{}}
 for di,(d,p) in enumerate(zip(DIRECTIONS,panels)):
  if key=='pactbroker':
   ox=di%3*512;oy=di//3*512
   p=[c for c in p if not (250<c['rect'][0]-ox<350 and 230<c['rect'][1]-oy<340)]
  arranged=order(p,4);assert len(arranged)==12,(key,d,len(arranged))
  parts={}
  for n,c in zip(PARTS,arranged):
   r=c['rect'];parts[n]={'sourceRect':r.copy(),'renderRect':r.copy(),'pivot':[.5,.9] if n=='head' else [.5,.08]}
  m['views'][d]={'file':'body.png','size':[w,h],'parts':parts}
 gi,gc=components(f/'equipment.png');gc=order(gc[:6],2,3);assert len(gc)==6
 m['equipment']={'file':'equipment.png','size':list(gi.size),'views':{d:{INFO[key][1]:{'sourceRect':gc[i]['rect'],'hand':'right','displaySize':INFO[key][2],'pivot':INFO[key][3]}} for i,d in enumerate(DIRECTIONS)}}
 m['notes']=['Six independently drawn views with separately animated anatomical pieces and equipment.']
 (f/'manifest.json').write_text(json.dumps(m,indent=2))
 fi=Image.open(f/'vfx.png');fw,fh=fi.size;alpha=fi.getchannel('A');v={'file':'vfx.png','size':[fw,fh],'columns':8,'rows':4,'clips':{},'bindings':{}}
 for row,name in enumerate(INFO[key][4]):
  yp=round(row*fh/4);yb=round((row+1)*fh/4);sums=[sum(alpha.crop((x,yp,x+1,yb)).getdata()) for x in range(fw)]
  cuts=[0]+[min(range(max(0,round(i*fw/8)-45),min(fw,round(i*fw/8)+46)),key=lambda x:sums[x]) for i in range(1,8)]+[fw];rects=[]
  for i in range(8):
   ys=[sum(alpha.crop((cuts[i],y,cuts[i+1],y+1)).getdata()) for y in range(fh)]
   top=0 if row==0 else min(range(max(0,yp-25),min(fh,yp+26)),key=lambda y:ys[y])
   bottom=fh if row==3 else min(range(max(0,yb-25),min(fh,yb+26)),key=lambda y:ys[y])
   rects.append([cuts[i],top,cuts[i+1]-cuts[i],bottom-top])
  v['clips'][name]={'row':row,'frames':8,'durationMs':[450,700,550,700][row],'loop':False,'anchor':[.5,.8] if name in ['flamewall','spawn','cast'] else [.5,.5],'sourceRects':rects}
 v['bindings']={'spawn':'spawn','attack':{'cast':'cast','projectile':INFO[key][4][0],'releaseMs':250,'travelMs':300}}
 if key=='bomber':v['bindings']['attack']['impact']='explosion'
 if key=='infernowitch':v['bindings']['attack']['impact']='burn'
 if key=='cinderwarden':v['bindings']['abilities']={'flamewall':{'cast':'cast','impact':'flamewall'}}
 if key=='hellbinder':
  v['bindings']['attack']={'cast':'chainStrike','impact':'burn','releaseMs':250}
  v['bindings']['abilities']={'hook':{'projectile':'hook','impact':'burn','releaseMs':50,'travelMs':300}}
 if key=='pactbroker':v['bindings']['abilities']={'bargain':{'cast':'cast','impact':'bargain'}}
 (f/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'manifest ready')
