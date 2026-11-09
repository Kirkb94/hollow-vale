"""Read alpha islands and describe complete-pose source regions (no image edits)."""
from pathlib import Path
from PIL import Image
import numpy as np

def regions(im):
 a=np.asarray(im.getchannel('A'))>48
 parent=[];runs=[];previous=[]
 def find(x):
  while parent[x]!=x:parent[x]=parent[parent[x]];x=parent[x]
  return x
 for y,row in enumerate(a):
  d=np.diff(np.pad(row.astype(np.int8),(1,1)));starts=np.flatnonzero(d==1);ends=np.flatnonzero(d==-1);current=[];j=0
  for lo,hi in zip(starts,ends):
   lo,hi=int(lo),int(hi);idx=len(parent);parent.append(idx);runs.append((y,lo,hi));current.append(idx)
   while j<len(previous) and runs[previous[j]][2]<lo:j+=1
   k=j
   while k<len(previous) and runs[previous[k]][1]<=hi:
    old=find(previous[k]);new=find(idx)
    if old!=new:parent[new]=old
    k+=1
  previous=current
 groups={}
 for i,run in enumerate(runs):groups.setdefault(find(i),[]).append(run)
 components=[]
 for r in groups.values():
  area=sum(hi-lo for y,lo,hi in r)
  if area<6:continue
  box=(min(lo for y,lo,hi in r),r[0][0],max(hi for y,lo,hi in r),r[-1][0]+1)
  components.append({'runs':r,'area':area,'box':box,'cx':sum((lo+hi)/2*(hi-lo) for y,lo,hi in r)/area,'cy':sum(y*(hi-lo) for y,lo,hi in r)/area})
 return components

def describe(im, columns=4, rows=6, effect_bias=None):
 w,h=im.width/columns,im.height/rows;components=regions(im);anchors={}
 for c in components:
  slot=(min(rows-1,int(c['cy']/h)),min(columns-1,int(c['cx']/w)))
  if slot not in anchors or c['area']>anchors[slot]['area']:anchors[slot]=c
 if len(anchors)!=columns*rows:raise ValueError(f'Could not locate {columns*rows} whole poses')
 grouped={slot:[] for slot in anchors}
 for c in components:
  if any(c is main for main in anchors.values()):slot=next(k for k,v in anchors.items() if c is v)
  else:
   x0,y0,x1,y1=c['box']
   def distance(item):
    key,v=item;vx0,vy0,vx1,vy1=v['box'];dx=max(vx0-x1,x0-vx1,0);dy=max(vy0-y1,y0-vy1,0)
    return dx*dx+dy*dy+.02*((c['cx']-v['cx'])**2+(c['cy']-v['cy'])**2)
   slot=min(anchors.items(),key=distance)[0]
   effect_row=min(rows-1,int(c['cy']/h))
   if effect_bias and effect_row in effect_bias:
    slot=(effect_row,max(0,min(columns-1,int((c['cx']-effect_bias[effect_row])/w))))
  grouped[slot].extend(c['runs'])
 result=[]
 for row in range(rows):
  line=[]
  for col in range(columns):
   r=grouped[(row,col)];x0=max(0,min(lo for y,lo,hi in r)-2);x1=min(im.width,max(hi for y,lo,hi in r)+2);y0=max(0,min(y for y,lo,hi in r)-2);y1=min(im.height,max(y for y,lo,hi in r)+3)
   bands={}
   for y,lo,hi in r:
    band=y//4
    if band not in bands:bands[band]=[lo,hi]
    else:bands[band]=[min(bands[band][0],lo),max(bands[band][1],hi)]
   mask=[[max(0,lo-2)-x0,max(0,b*4-2)-y0,min(im.width,hi+2)-max(0,lo-2),min(im.height,b*4+6)-max(0,b*4-2)] for b,(lo,hi) in bands.items()]
   line.append({'rect':[x0,y0,x1-x0,y1-y0],'mask':mask,'left':round(56+(x0-col*w)*208/w,3),'top':round(198-(y1-y0)*208/h,3),'width':round((x1-x0)*208/w,3),'height':round((y1-y0)*208/h,3)})
  result.append(line)
 # Use one scale for every pose so tall swings fit without changing character size.
 all_regions=[v for line in result for v in line]
 max_h=max(v['rect'][3] for v in all_regions)
 reach=max(max(abs(v['rect'][0]-(col+.5)*w),abs(v['rect'][0]+v['rect'][2]-(col+.5)*w)) for line in result for col,v in enumerate(line))
 scale=min(208/w,184/max_h,150/max(1,reach))
 for row,line in enumerate(result):
  for col,v in enumerate(line):
   x,y,rw,rh=v['rect'];v.update(left=round(160+(x-(col+.5)*w)*scale,3),top=round(198-rh*scale,3),width=round(rw*scale,3),height=round(rh*scale,3))
 return result
