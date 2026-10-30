from PIL import Image
from collections import deque
from pathlib import Path
import json

def components(path):
 im=Image.open(path); w,h=im.size;a=bytearray(im.getchannel('A').point(lambda x:255 if x>32 else 0).tobytes()); out=[]
 for i in range(w*h):
  if not a[i]:continue
  a[i]=0;q=deque([i]);n=0;x0=w;y0=h;x1=y1=0
  while q:
   p=q.popleft();y,x=divmod(p,w);n+=1;x0=min(x0,x);x1=max(x1,x);y0=min(y0,y);y1=max(y1,y)
   for z in ([p-1] if x else [])+([p+1] if x+1<w else [])+([p-w] if y else [])+([p+w] if y+1<h else []):
    if a[z]:a[z]=0;q.append(z)
  if n>3000:out.append({'pixels':n,'rect':[x0,y0,x1-x0+1,y1-y0+1]})
 return out
if __name__ == '__main__':
 for p in Path('public/art/rigs/undead').glob('necromancer-*.png'):
  print(p.name,components(p))
