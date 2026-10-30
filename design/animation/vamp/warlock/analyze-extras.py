from pathlib import Path
import runpy,json
m=runpy.run_path('design/animation/vamp/warlock/analyze-batch.py');root=Path('public/art/rigs/vamp');dirs=m['DIRECTIONS']
b=root/'warlock/bat';im,cs=m['components'](b/'body.png');cs=m['order'](cs[:24],6,4);mft={'version':1,'unit':'warlock_bat','faction':'vamp','skeleton':'bat','partOrder':['body','head','leftWing','rightWing'],'views':{}}
for i,d in enumerate(dirs):
 parts={}
 for j,n in enumerate(mft['partOrder']):parts[n]={'sourceRect':cs[i*4+j]['rect'],'pivot':[.9,.3] if n=='leftWing' else [.1,.3] if n=='rightWing' else [.5,.5]}
 mft['views'][d]={'file':'body.png','parts':parts}
(b/'manifest.json').write_text(json.dumps(mft,indent=2));p=root/'warlock/manifest.json';a=json.loads(p.read_text());a['variants']={'bat':{'folder':'bat','manifest':'manifest.json'}};p.write_text(json.dumps(a,indent=2))
# Manually checked explicit source cuts for horse, including head/torso joints in connected regions.
rects=[[[6,104,204,130],[200,48,165,180],[362,96,68,164],[435,91,117,148],[29,255,79,201],[172,256,78,200],[283,248,117,209],[433,249,109,207]],[[576,120,170,120],[740,34,136,206],[859,94,73,171],[933,95,95,144],[604,249,61,208],[702,254,79,198],[801,247,78,195],[922,247,88,210]],[[1055,99,158,155],[1207,32,140,215],[1341,94,59,171],[1404,103,110,138],[1089,253,91,204],[1228,255,53,203],[1311,261,68,196],[1418,257,102,200]],[[80,629,210,111],[8,578,110,145],[370,579,68,170],[440,590,112,146],[20,754,79,205],[154,755,80,203],[280,747,93,212],[418,752,120,206]],[[571,610,170,128],[710,522,116,173],[832,575,70,203],[905,571,119,152],[600,753,76,215],[720,754,93,211],[871,747,94,217],[1039,749,103,219]],[[1049,600,205,138],[1195,520,90,150],[1292,580,75,180],[1376,587,141,142],[1200,750,68,210],[1305,762,71,203],[1425,753,97,211],[1039,749,103,219]]]
p=root/'bloodhunter/manifest.json';a=json.loads(p.read_text());a['bodyScale']=.72;a['bodyOffset']=[0,-30];a['extras']={'file':'horse.png','views':{}}
for i,d in enumerate(dirs):
 sign=1 if d in ['e','se','ne'] else -1;side=d in ['e','w'];width=110 if side else 85
 ex={}
 for j,n in enumerate(['leftForeleg','rightForeleg','leftHindleg','rightHindleg']):ex[n]={'sourceRect':rects[i][4+j],'anchor':[80+sign*((28 if j<2 else -30)+(4 if j%2 else -4)),150],'displaySize':[19,49],'pivot':[.5,.08],'layer':'behind','motion':'leg','phase':j%2}
 ex['horseBody']={'sourceRect':rects[i][0],'anchor':[80,140],'displaySize':[width,54],'pivot':[.5,.5]}
 ex['horseHead']={'sourceRect':rects[i][1],'anchor':[80+sign*(44 if side else 29),126],'displaySize':[43,67],'pivot':[.5,.65]}
 ex['horseTail']={'sourceRect':rects[i][2],'anchor':[80-sign*width*.42,139],'displaySize':[20,56],'pivot':[.5,.1]}
 ex['saddle']={'sourceRect':rects[i][3],'anchor':[80,132],'displaySize':[48,44],'pivot':[.5,.5]}
 a['extras']['views'][d]=ex
p.write_text(json.dumps(a,indent=2))
