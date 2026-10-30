from pathlib import Path
import runpy,json
r=Path('public/art/rigs/vamp');a=runpy.run_path('design/animation/vamp/warlock/analyze-batch.py')
p=r/'countess/manifest.json';m=json.loads(p.read_text());im,cs=a['components'](r/'countess/body-nw.png');print('NW',cs[:3]);top=sorted(sorted(cs[:9],key=lambda c:c['rect'][1])[:3],key=lambda c:c['rect'][0]);
for i,n in enumerate(['head','torso']):
 rect=top[i]['rect'].copy();rr=rect.copy()
 if n=='head':rr[3]=round(rr[3]*.5)
 m['views']['nw']['parts'][n]={'file':'body-nw.png','sourceRect':rect,'renderRect':rr,'pivot':[.5,.9] if n=='head' else [.5,.08]}
p.write_text(json.dumps(m,indent=2))
p=r/'warlock/bat/manifest.json';m=json.loads(p.read_text());im,cs=a['components'](r/'warlock/bat/rear-heads.png');cs=sorted(cs[:2],key=lambda c:c['rect'][0]);
for d,c in zip(['nw','ne'],cs):m['views'][d]['parts']['head']={'file':'rear-heads.png','sourceRect':c['rect'],'pivot':[.5,.7]}
p.write_text(json.dumps(m,indent=2))
p=r/'bloodhunter/manifest.json';m=json.loads(p.read_text());m['mounted']=True;p.write_text(json.dumps(m,indent=2))
from pathlib import Path
import json
r=Path('public/art/rigs/vamp')
p=r/'assassin/manifest.json';m=json.loads(p.read_text())
for v in m['views'].values():
 r0=v['parts']['leftLeg']['sourceRect'];v['parts']['leftLeg']['renderRect']=[r0[0],r0[1],round(r0[2]*.55),r0[3]]
p.write_text(json.dumps(m,indent=2))
p=r/'assassin/vfx.json';m=json.loads(p.read_text());m['bindings']['drain']={'clip':'impact','durationMs':400};p.write_text(json.dumps(m,indent=2))
p=r/'warlock/vfx.json';m=json.loads(p.read_text());
for rect in m['clips']['transform']['sourceRects']:rect[0]+=24;rect[2]-=24
p.write_text(json.dumps(m,indent=2))
