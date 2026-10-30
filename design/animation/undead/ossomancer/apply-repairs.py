from pathlib import Path
import json,runpy
mod=runpy.run_path(str(Path(__file__).with_name('analyze-batch.py')));ROOT=mod['ROOT'];components=mod['components'];order=mod['order'];dirs=mod['DIRECTIONS']
f=ROOT/'public/art/rigs/undead/ossomancer'
im,cs=components(f/'head-torso.png');cs=order(cs[:12],2,6)
m=json.loads((f/'manifest.json').read_text())
for i,d in enumerate(dirs):
 for name,idx in [('head',i),('torso',i+6)]:
  r=cs[idx]['rect'];m['views'][d]['parts'][name]={'file':'head-torso.png','sourceRect':r,'renderRect':r.copy(),'pivot':[.5,.9] if name=='head' else [.5,.08]}
(f/'manifest.json').write_text(json.dumps(m,indent=2))
f=ROOT/'public/art/rigs/undead/banshee';m=json.loads((f/'manifest.json').read_text());m['locomotion']='hover'
for d in dirs:
 for name in ['torso','cape']:
  r=m['views'][d]['parts'][name]['renderRect'];r[1]+=17;r[3]-=17
m['views']['sw']['parts']['head']={'file':'body-original.png','sourceRect':[558,13,197,161],'renderRect':[558,13,197,161],'pivot':[.5,.9]}
(f/'manifest.json').write_text(json.dumps(m,indent=2))
for key in ['ossomancer','bonewitch','gravedigger','lich','banshee']:
 f=ROOT/'public/art/rigs/undead'/key;v=json.loads((f/'vfx.json').read_text());v['bindings']['revive']='spawn';(f/'vfx.json').write_text(json.dumps(v,indent=2))
