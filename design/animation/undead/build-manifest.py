"""Read PNG alpha only; preserve generated image sources unchanged."""
import importlib.util,json
from pathlib import Path
from PIL import Image
HERE=Path(__file__).resolve().parent
ROOT=HERE.parents[2]
spec=importlib.util.spec_from_file_location('inspect_components',HERE/'inspect-components.py')
mod=importlib.util.module_from_spec(spec);spec.loader.exec_module(mod)
OUT=ROOT/'public/art/rigs/undead'
dirs=['e','se','sw','w','nw','ne']
names=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
pivots={k:[.5,.08] for k in names};pivots['head']=[.5,.9]
manifest={'version':1,'unit':'necromancer','faction':'undead','style':'Arcane Vanguard','status':'art-ready-requires-shared-runtime-integration','directions':dirs,'atlasGrid':[3,4],'partOrder':names,'views':{},'notes':['Use sourceRect/renderRect, not uniform cells: generated padding differs by row.','Pivots are normalized within renderRect.','Left/right are anatomical. Back views are independently generated, not mirrored.','Concept consistency: small buckle/bone decoration variation between views remains.','Staff is independently movable; attach to right forearm endpoint.']}
for d in dirs:
 p=OUT/f'necromancer-{d}.png';im=Image.open(p);parts=mod.components(p)
 assert len(parts)==12,(d,len(parts))
 # Sort by horizontal band and then x. Source generation has four well-separated rows.
 parts.sort(key=lambda v:v['rect'][1]+v['rect'][3]/2)
 parts=[p for i in range(0,12,3) for p in sorted(parts[i:i+3],key=lambda v:v['rect'][0])]
 view={'file':p.name,'size':list(im.size),'alpha':list(im.getchannel('A').getextrema()),'parts':{}}
 for name,obj in zip(names,parts):
  r=obj['rect'];render=r.copy()
  if name=='torso': render[3]=round(r[3]*.66) # separate skirt replaces duplicated lower robe.
  view['parts'][name]={'sourceRect':r,'renderRect':render,'pivot':pivots[name],'alphaPixels':obj['pixels']}
 manifest['views'][d]=view
p=OUT/'necromancer-staff.png';im=Image.open(p);parts=mod.components(p)
assert len(parts)==6,len(parts)
parts.sort(key=lambda v:v['rect'][1]+v['rect'][3]/2)
parts=[p for i in range(0,6,3) for p in sorted(parts[i:i+3],key=lambda v:v['rect'][0])]
manifest['equipment']={'staff':{'file':'necromancer-staff.png','size':list(im.size),'attachTo':'rightForearm','grip':[.5,.61],'views':{d:{'sourceRect':v['rect'],'pivot':[.5,.61]} for d,v in zip(dirs,parts)}}}
(OUT/'necromancer.rig.json').write_text(json.dumps(manifest,indent=2),encoding='utf-8')
roster=json.loads((HERE/'roster.json').read_text(encoding='utf-8'))
for u in roster:
 if u['id']=='necromancer':u['rigStatus']='art-ready-requires-shared-runtime-integration';u['manifest']='public/art/rigs/undead/necromancer.rig.json'
(HERE/'roster.json').write_text(json.dumps(roster,indent=2),encoding='utf-8')
print('Validated 72 movable body parts + 6 staff views, all alpha bounds nonempty.')
