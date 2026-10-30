from pathlib import Path
import json,runpy,sys
ROOT=Path(__file__).resolve().parents[4]
sys.argv=[sys.argv[0]]
helpers=runpy.run_path(str(ROOT/'design/animation/kingdom/lancer/build_manifests.py'))
components=helpers['components'];ordered=helpers['ordered'];dirs=helpers['DIRS']
for u in ['lancer','outrider','kinglion','seraph','warlord','templar']:
 p=ROOT/'public/art/rigs/kingdom'/u/'manifest.json';m=json.loads(p.read_text());m['attack']='thrust' if u=='lancer' else 'cast' if u=='seraph' else 'attack'
 if u in ['lancer','seraph']:
  for v in m['equipment']['views'].values():v['spear' if u=='lancer' else 'staff']['displaySize'][1]=117
 if u=='outrider':m['mounted']=True
 p.write_text(json.dumps(m,indent=2))
p=ROOT/'public/art/rigs/kingdom/seraph';m=json.loads((p/'manifest.json').read_text());im,cs=components(p/'wings.png');cs=ordered(cs)
pivots=[[.96,.48],[.08,.4],[.94,.36],[.10,.1],[.96,.38],[.1,.12],[.96,.48],[.08,.3],[.96,.3],[.8,.16],[.96,.3],[.08,.14]]
m['extras']={'views':{}}
for i,d in enumerate(dirs):
 ex={}
 for j,n in enumerate(['leftWing','rightWing']):
  c=cs[i*2+j];ex[n]={'file':'wings.png','sourceRect':c['sourceRect'],'pivot':pivots[i*2+j],'anchor':[72 if j==0 else 88,64],'displaySize':[75 if j==0 else 62,95],'layer':'behind','motion':'wing','phase':j}
 halo=m['equipment']['views'][d].pop('halo');ex['halo']={'file':'equipment.png','sourceRect':halo['sourceRect'],'pivot':[.5,.5],'anchor':[80,14],'displaySize':[39,12],'layer':'front'}
 m['extras']['views'][d]=ex
m['notes'].append('Wings are cosmetic articulated pieces; Seraph retains existing ground movement rules.');(p/'manifest.json').write_text(json.dumps(m,indent=2))
p=ROOT/'public/art/rigs/kingdom/outrider';m=json.loads((p/'manifest.json').read_text());m['bodyScale']=.72;m['bodyOffset']=[0,-15];m['extras']={'views':{}}
for i,d in enumerate(dirs):
 im,cs=components(p/('mount-'+d+'.png'));cs=ordered(cs,8,4);sign=1 if d in ['e','se','ne'] else -1;wide=d in ['e','w'];front=80+sign*(31 if wide else 22);rear=80-sign*(31 if wide else 22);ex={}
 for j,n in enumerate(['frontLeftLeg','frontRightLeg','hindLeftLeg','hindRightLeg']):
  ex[n]={'file':'mount-'+d+'.png','sourceRect':cs[j+4]['sourceRect'],'pivot':[.5,.08],'anchor':[(front if j<2 else rear)+(3 if j%2 else -3),135+(3 if j%2 else -1)],'displaySize':[17,46],'layer':'behind','motion':'leg','phase':j%2}
 ex['tail']={'file':'mount-'+d+'.png','sourceRect':cs[2]['sourceRect'],'pivot':[.5,.1],'anchor':[rear-sign*10,115],'displaySize':[27,49],'layer':'behind','motion':'mount'}
 ex['mountBody']={'file':'mount-'+d+'.png','sourceRect':cs[0]['sourceRect'],'pivot':[.5,.5],'anchor':[80,127],'displaySize':[96 if wide else 79,45],'layer':'behind','motion':'mount'}
 ex['mountHead']={'file':'mount-'+d+'.png','sourceRect':cs[1]['sourceRect'],'pivot':[.5,.92],'anchor':[front,131],'displaySize':[46 if wide else 39,67],'layer':'behind','motion':'mount'}
 ex['saddle']={'file':'mount-'+d+'.png','sourceRect':cs[3]['sourceRect'],'pivot':[.5,.5],'anchor':[80,112],'displaySize':[43,28],'layer':'behind'}
 m['extras']['views'][d]=ex
m['notes'].append('Horse has independent body/head/tail/saddle and four whole-leg pieces; knee joints remain within each leg illustration. Rider is scaled and seated above mount.');(p/'manifest.json').write_text(json.dumps(m,indent=2));print('extras saved: Seraph 18; Outrider 48')
