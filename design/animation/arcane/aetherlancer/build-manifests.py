from pathlib import Path
from PIL import Image
import json,sys,runpy
mod=runpy.run_path(str(Path(__file__).with_name('analyze-batch.py')))
components,order=mod['components'],mod['order'];ROOT=mod['ROOT'];DIRECTIONS=mod['DIRECTIONS'];PARTS=mod['PARTS']
INFO={
'aetherlancer':('thrust','lance',[24,100],[.5,.7],['aetherBolt','lance','cast','spawn']),
'phasewright':('cast','wand',[23,57],[.5,.77],['phaseBolt','swap','cast','spawn']),
'hourglass':('cast','staff',[25,72],[.5,.77],['sandBolt','rewind','cast','spawn']),
'hexweaver':('cast','wand',[22,52],[.5,.77],['hexBolt','silence','cast','spawn']),
'oracle':('cast','staff',[28,77],[.5,.75],['starBolt','flare','cast','spawn'])}
for key in sys.argv[1:]:
 f=ROOT/'public/art/rigs/arcane'/key;doc=ROOT/'design/animation/arcane'/key
 data=json.loads((doc/'components.json').read_text());panels=data['panels'];w,h=data['size']
 m={'version':1,'unit':key,'faction':'arcane','style':'Arcane Vanguard','attack':INFO[key][0],'directions':DIRECTIONS,'partOrder':PARTS,'views':{}}
 for di,(d,p) in enumerate(zip(DIRECTIONS,panels)):
  arranged=order(p,4);assert len(arranged)==12,(key,d,len(arranged))
  parts={}
  for n,c in zip(PARTS,arranged):
   r=c['rect'];parts[n]={'sourceRect':r.copy(),'renderRect':r.copy(),'pivot':[.5,.9] if n=='head' else [.5,.08]}
  m['views'][d]={'file':'body.png','size':[w,h],'parts':parts}
 gi,gc=components(f/'equipment.png');gc=order(gc[:6],2,3)
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
 if key=='aetherlancer':v['bindings']['abilities']={'lance':{'cast':'cast','projectile':'lance','impact':'lance'}}
 if key=='phasewright':v['bindings']['abilities']={'swap':{'cast':'cast','impact':'swap'}}
 if key=='hourglass':v['bindings']['abilities']={'rewind':{'cast':'cast','impact':'rewind'}}
 if key=='hexweaver':v['bindings']['abilities']={'sil':{'cast':'cast','impact':'silence'}}
 if key=='oracle':v['bindings']['abilities']={'flare':{'cast':'cast','impact':'flare'}}
 (f/'vfx.json').write_text(json.dumps(v,indent=2));print(key,'manifest ready')
