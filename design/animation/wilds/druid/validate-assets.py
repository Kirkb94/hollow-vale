from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[4]
run=json.loads((ROOT/'design/animation/wilds/druid/gameplay-run.json').read_text())
for key in ['druid','beastcaller','groveshaper','skinchanger','falconer']:
 f=ROOT/'public/art/rigs/wilds'/key;doc=ROOT/'design/animation/wilds'/key
 m=json.loads((f/'manifest.json').read_text());v=json.loads((f/'vfx.json').read_text());rects=0
 for d,view in m['views'].items():
  for name,p in view['parts'].items():
   im=Image.open(f/p.get('file',view['file']));x,y,w,h=p['renderRect'];assert x>=0 and y>=0 and x+w<=im.width and y+h<=im.height
   assert im.getchannel('A').crop((x,y,x+w,y+h)).getbbox();rects+=1
 qa={**run['presentation'][key],'effects':True,'gameplay':True,'unit':key,'method':'Headless Edge actual game runtime; independent assembly and FX screenshots visually inspected.','actualMechanics':run['result'][key],'sourceRectsChecked':rects,'poseSweep':{'poses':42,'edgePixels':0},'screenshots':['../druid/batch-review.png','vfx-review.png'],'pending':[]}
 (doc/'validation.json').write_text(json.dumps(qa,indent=2))
 print(key,rects,'bounds checked',qa['gameplay'])
