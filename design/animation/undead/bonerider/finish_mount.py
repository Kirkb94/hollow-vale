from pathlib import Path
import runpy,json,sys
ROOT=Path(__file__).resolve().parents[4]
sys.argv=['finish']
H=runpy.run_path(str(ROOT/'design/animation/undead/wraith/build_batch.py'))
p=ROOT/'public/art/rigs/undead/bonerider';m=json.loads((p/'manifest.json').read_text());m.update(mounted=True,bodyScale=.72,bodyOffset=[0,-15],extras={'views':{}})
im,groups=H['panels'](p/'mount.png');_,sup=H['regular'](p/'mount-supplement.png',12,2)
for i,d in enumerate(H['DIRS']):
 cs=groups[i];ox=i%3*im.width/3;oy=i//3*im.height/2;w=im.width/3;h=im.height/2
 legs=sorted([c for c in cs if c['sourceRect'][1]>oy+h*.36],key=lambda c:c['sourceRect'][0]);sign=1 if d in ['e','se','ne'] else -1;wide=d in ['e','w'];front=80+sign*(31 if wide else 22);rear=80-sign*(31 if wide else 22);ex={}
 for j,n in enumerate(['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg']):
  ex[n]={'file':'mount.png','sourceRect':legs[j]['sourceRect'],'pivot':[.5,.08],'anchor':[(front if j<2 else rear)+(3 if j%2 else -3),135+(3 if j%2 else -1)],'displaySize':[17,46],'layer':'behind','motion':'leg','phase':j%2}
 tail=H['near'](cs,ox+w*.72,oy+h*.28);saddle=H['near'](cs,ox+w*.9,oy+h*.3)
 ex['tail']={'file':'mount.png','sourceRect':tail['sourceRect'],'pivot':[.5,.1],'anchor':[rear-sign*10,115],'displaySize':[20,49],'layer':'behind','motion':'mount'}
 ex['mountBody']={'file':'mount-supplement.png','sourceRect':sup[i*2]['sourceRect'],'pivot':[.5,.5],'anchor':[80,127],'displaySize':[96 if wide else 79,45],'layer':'behind','motion':'mount'}
 ex['mountHead']={'file':'mount-supplement.png','sourceRect':sup[i*2+1]['sourceRect'],'pivot':[.12 if sign==1 else .88,.92],'anchor':[front,125],'displaySize':[46 if wide else 39,67],'layer':'behind','motion':'mount','flipX':d=='nw'}
 ex['saddle']={'file':'mount.png','sourceRect':saddle['sourceRect'],'pivot':[.5,.5],'anchor':[80,112],'displaySize':[43,28],'layer':'behind'}
 m['extras']['views'][d]=ex
m['notes'].append('Independent skeletal mount body/head/tail/saddle and four whole leg pieces; knees remain within whole-leg illustration.')
(p/'manifest.json').write_text(json.dumps(m,indent=2))
