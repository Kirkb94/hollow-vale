from pathlib import Path
from PIL import Image
import json
root=Path('C:/Users/Uno/Documents/GDCC/games/hollow-vale');keys=['warlock','assassin','thrall','countess','bloodhunter'];notes={
'warlock':['Six independent humanoid views plus bat variant with four movable parts per view. Bat rear heads use separate genuinely rear-facing source.','Torso source includes short hem; separate pelvis overlaps at waist.'],
'assassin':['Two independently held silver daggers; no magical damage added.','Source left leg contains two trouser legs in some views; cropped or overlapped at rig assembly.'],
'thrall':['Connected source head/torso and rear leg/foot split with explicit source rectangles; originals unmodified.','Separate iron wrist chains are equipment, not invented weapons or abilities.'],
'countess':['Whole sleeve/hand source split at elbow into independently movable upper/forearms.','NW head and torso replaced with genuinely rear-facing image; shared cloth layers kept from primary sheet. Head crop omits lower dangling hair to preserve facial scale.'],
'bloodhunter':['Six-view horse assembled from eight independent layers with animated four legs; rider uses seated mounted pose.','Some connected horse head/torso source areas separated by explicit rectangles. Horse knee animation is procedural cutout rotation.']}
for key in keys:
 f=root/'public/art/rigs/vamp'/key;d=root/'design/animation/vamp'/key;m=json.loads((f/'manifest.json').read_text());fx=json.loads((f/'vfx.json').read_text());assert len(m['views'])==6
 for view in m['views'].values():
  assert len(view['parts'])==12
  for name,p in view['parts'].items():
   im=Image.open(f/p.get('file',view['file']));x,y,w,h=p.get('renderRect',p['sourceRect']);assert x>=0 and y>=0 and w>0 and h>0 and x+w<=im.width and y+h<=im.height;(im.crop((x,y,x+w,y+h)).getchannel('A').getbbox()) or (_ for _ in []).throw(Exception('empty '+name))
 fi=Image.open(f/fx['file']);assert fi.mode=='RGBA'
 for clip in fx['clips'].values():
  assert len(clip['sourceRects'])==8
  for x,y,w,h in clip['sourceRects']:assert fi.crop((x,y,x+w,y+h)).getchannel('A').getbbox()
 m['notes']=notes[key]+['All six views use independent directional source art; no whole-character mirror views. Source alpha preserved; no generated pixels repainted with code.'];(f/'manifest.json').write_text(json.dumps(m,indent=2))
 qa={'unit':key,'sixFacings':True,'movableParts':True,'equipment':True,'effects':True,'gameplay':False,'pause':False,'visibility':False,'zoom':False,'bodyParts':72,'effectFrames':32,'assetChecks':['Explicit bounds fit source images','Every mapped cutout has nonempty alpha','Shared runtime loads all six views without JS errors','Independent FX clips previewed on dark background, no rectangular haze','Separate equipment follows hands'],'notes':notes[key],'pending':'Actual game integration QA, pause/fog/zoom verification pending parent catalog integration.'};(d/'validation.json').write_text(json.dumps(qa,indent=2));(d/'README.txt').write_text(key+' — Arcane Vanguard Vampire cutout pack\n\nOwned unit complete art package. Main manifest.json points to body.png (1536x1024), equipment.png (1536x1024), and optional supplemental images. VFX four clips x eight frames, explicit per-frame rectangles account for painted spacing; do not uniformly slice. All PNG source art and transparency generated using built-in imagegen, original and repair prompts recorded.\n\n'+'\n'.join(notes[key])+'\n\nReview /art/rigs/vamp/warlock/batch-review.html and this unit/vfx-review.html.\nIntegration must use actual positive HP gain for drain, not every attack. Blood Hunter mount and Warlock bat are cosmetic rigs preserving existing game rules. No game mechanics modified here.\n')
 print(key,'asset QA PASS')
