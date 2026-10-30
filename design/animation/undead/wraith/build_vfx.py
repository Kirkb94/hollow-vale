from PIL import Image
from pathlib import Path
import json
ROOT=Path(__file__).resolve().parents[4]
for u in ['wraith','skeletons','ghoul','graveknight','bonerider']:
 p=ROOT/'public/art/rigs/undead'/u
 if not (p/'vfx.png').exists():continue
 im=Image.open(p/'vfx.png');w,h=im.size
 names=['spectralSlash','spectralImpact','drift','revive'] if u=='wraith' else ['scytheSlash','boneImpact','hoofDust','revive'] if u=='bonerider' else ['spearThrust' if u=='skeletons' else 'clawSlash' if u=='ghoul' else 'heavySlash','impact','spawn','revive']
 clips={}
 for row,n in enumerate(names):
  clips[n]={'row':row,'frames':4,'fps':8,'durationMs':500,'loop':False,'anchor':[.5,.65 if row>1 else .5],'attachment':'ground' if row>1 else 'weapon' if row==0 else 'target','lifecycle':'one-shot; remove at completion','sourceRects':[[round(c*w/4),round(row*h/4),round((c+1)*w/4)-round(c*w/4),round((row+1)*h/4)-round(row*h/4)] for c in range(4)]}
 b={'attack':{'cast':names[0],'impact':names[1],'releaseMs':260,'travelMs':0},'spawn':names[3] if u in ['wraith','bonerider'] else names[2],'revive':names[3]}
 if u in ['wraith','bonerider']:b['movement']=names[2]
 m={'file':'vfx.png','size':[w,h],'columns':4,'rows':4,'clips':clips,'bindings':b,'notes':['Actual attack, spawn and Undying presentation; no added gameplay abilities.','Four illustrated frames per animation; pause/fog handled by shared runtime.']}
 (p/'vfx.json').write_text(json.dumps(m,indent=2))
