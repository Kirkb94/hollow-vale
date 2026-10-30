"""Read original alpha and derive cutout rectangles; never edit image pixels."""
from pathlib import Path
from collections import deque
from PIL import Image
import json,sys
ROOT=Path(__file__).resolve().parents[4]
DIRECTIONS=['e','se','sw','w','nw','ne']
PARTS=['head','torso','cape','pelvis','leftUpperArm','rightUpperArm','leftForearm','rightForearm','leftLeg','rightLeg','leftBoot','rightBoot']
def components(path):
 im=Image.open(path).convert('RGBA');w,h=im.size;a=im.getchannel('A').tobytes();seen=bytearray(w*h);out=[]
 for st,v in enumerate(a):
  if v<=64 or seen[st]:continue
  seen[st]=1;q=deque([st]);num=0;l=r=st%w;t=b=st//w
  while q:
   p=q.popleft();x=p%w;y=p//w;num+=1;l=min(l,x);r=max(r,x);t=min(t,y);b=max(b,y)
   for n in ((p-1 if x else -1),(p+1 if x+1<w else -1),p-w,p+w):
    if n<0 or n>=w*h or seen[n] or a[n]<=64:continue
    seen[n]=1;q.append(n)
  if num>80:out.append({'rect':[l,t,r-l+1,b-t+1],'pixels':num})
 return im,sorted(out,key=lambda c:c['pixels'],reverse=True)
def order(cs,rows,cols=3):
 cs=sorted(cs,key=lambda c:c['rect'][1]+c['rect'][3]/2);out=[]
 for row in range(rows):out+=sorted(cs[row*cols:(row+1)*cols],key=lambda c:c['rect'][0]+c['rect'][2]/2)
 return out
if __name__=='__main__':
 for key in sys.argv[1:]:
  folder=ROOT/'public/art/rigs/iron'/key
  im,cs=components(folder/'body.png');w,h=im.size
  cs=[c for c in cs if c['rect'][2]<w/3 and c['rect'][3]<h/2]
  panels=[[] for _ in range(6)]
  for c in cs:
   x,y,cw,ch=c['rect'];pi=min(2,int((x+cw/2)/(w/3)))+3*min(1,int((y+ch/2)/(h/2)));panels[pi].append(c)
  print(key,im.size,'parts',len(cs),'panels',[len(p) for p in panels])
  (ROOT/'design/animation/iron'/key/'components.json').write_text(json.dumps({'size':[w,h],'panels':panels},indent=2))
