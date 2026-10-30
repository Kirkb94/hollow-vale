from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[4]
for u in ['wolves','direwolf','cavebear','stormroc','mammoth','boarrider']:
 p=ROOT/'public/art/rigs/wilds'/u;im=Image.open(p/'vfx.png');w,h=im.size
 names=['attack','impact','spawn','regrowth']+(['packHowl'] if u=='direwolf' else ['gale'] if u=='stormroc' else []);clips={}
 for row,n in enumerate(names):clips[n]={'row':row,'frames':4,'fps':8,'durationMs':500,'loop':False,'anchor':[.5,.65 if row>1 else .5],'attachment':'ground' if row>1 else 'target','lifecycle':'one-shot; remove at completion','sourceRects':[[round(c*w/4),round(row*h/len(names)),round((c+1)*w/4)-round(c*w/4),round((row+1)*h/len(names))-round(row*h/len(names))] for c in range(4)]}
 m={'file':'vfx.png','size':[w,h],'columns':4,'rows':len(names),'clips':clips,'bindings':{'attack':{'cast':'attack','impact':'impact','releaseMs':260,'travelMs':0},'spawn':'spawn'},'statusEvents':{'regrowth:heal':{'impact':'regrowth'}},'notes':['Presentation follows actual gameplay events; no balance changes.']}
 if u=='cavebear':m['statusEvents']['bear:heal']={'impact':'regrowth'}
 if u=='stormroc':m['statusEvents']['gale:push']={'impact':'gale'}
 if u=='direwolf':m['bindings']['aura']={'clip':'packHowl','radiusHexes':2}
 (p/'vfx.json').write_text(json.dumps(m,indent=2))
