from pathlib import Path
from PIL import Image
import json
ROOT=Path(__file__).resolve().parents[4]
for u in ['hellhound','phoenix','dragon','imps']:
 p=ROOT/'public/art/rigs/infernal'/u;im=Image.open(p/'vfx.png');w,h=im.size
 names=['fireFeather','impact','burn','rebirth'] if u=='phoenix' else ['fireBreath' if u=='dragon' else 'fieryBite' if u=='hellhound' else 'clawSlash','impact','spawn','burn'];clips={}
 for row,n in enumerate(names):clips[n]={'row':row,'frames':4,'fps':8,'durationMs':500,'loop':False,'anchor':[.5,.65 if row>1 else .5],'attachment':'ground' if row>1 else 'target' if row==1 else 'mouth' if u in ['dragon','hellhound'] else 'attack','lifecycle':'one-shot; remove at completion','sourceRects':[[round(c*w/4),round(row*h/4),round((c+1)*w/4)-round(c*w/4),round((row+1)*h/4)-round(row*h/4)] for c in range(4)]}
 attack={'projectile' if u in ['dragon','phoenix'] else 'cast':names[0],'impact':'impact','releaseMs':260,'travelMs':300 if u in ['dragon','phoenix'] else 0}
 m={'file':'vfx.png','size':[w,h],'columns':4,'rows':4,'clips':clips,'bindings':{'attack':attack,'spawn':'rebirth' if u=='phoenix' else 'spawn'},'statusEvents':{'burn:tick':{'impact':'burn'}},'notes':['Burn only triggers on actual sourced burn damage.','Phoenix spawn binding also represents actual Rebirth; retains half-HP mechanic.'] if u=='phoenix' else ['Presentation only; actual attack and burn events, no added abilities.']}
 (p/'vfx.json').write_text(json.dumps(m,indent=2))
