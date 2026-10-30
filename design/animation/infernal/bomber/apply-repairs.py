from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[4]
for key in ['bomber','infernowitch','cinderwarden','hellbinder','pactbroker']:
 f=ROOT/'public/art/rigs/infernal'/key;m=json.loads((f/'manifest.json').read_text());v=json.loads((f/'vfx.json').read_text())
 if key=='bomber':
  for view in m['views'].values():
   r=view['parts']['head']['renderRect'];r[3]=round(r[3]*.7)
 if key=='cinderwarden':
  for d in ['nw','ne']:
   p=m['views'][d]['parts'];old=json.loads(json.dumps(p))
   p['leftForearm']=old['rightForearm'];p['rightForearm']=old['leftLeg'];p['leftLeg']=old['leftForearm'];p['rightLeg']=json.loads(json.dumps(p['leftLeg']))
  r=m['views']['ne']['parts']['cape']['renderRect'];r[1]+=45;r[3]-=45
 if key=='infernowitch':
  v['statusEvents']={'burn:tick':{'impact':'burn'}}
 if key=='hellbinder':v['statusEvents']={'burn:tick':{'impact':'burn'}}
 (f/'manifest.json').write_text(json.dumps(m,indent=2));(f/'vfx.json').write_text(json.dumps(v,indent=2))
