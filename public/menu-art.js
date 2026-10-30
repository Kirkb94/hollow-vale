/* Reuse battlefield artwork in every menu, including dynamically built screens. */
(() => {
  const tiles=new Map(),portraits=new Map(),jobs=new WeakMap();
  const visible=new WeakSet(),watched=new WeakSet();
  const observer=new IntersectionObserver(entries=>{for(const e of entries){if(e.isIntersecting){visible.add(e.target);update(e.target);}else visible.delete(e.target);}},{rootMargin:'80px'});
  const atlas=new Image();
  const ready=new Promise(resolve=>{atlas.onload=()=>{
    ['grass','forest','hill','swamp','shrine','keep','mine','sand','shallow','deep'].forEach((type,i)=>{
      const c=document.createElement('canvas');c.width=atlas.width/5;c.height=atlas.height/2;
      c.getContext('2d').drawImage(atlas,i%5*c.width,Math.floor(i/5)*c.height,c.width,c.height,0,0,c.width,c.height);
      tiles.set(type,c.toDataURL());
    });resolve();
  };atlas.onerror=resolve;});atlas.src='art/terrain-arcane.png';
  async function update(img){
    if(img.closest('#board,#hvbg,.hv-rig-portrait'))return;
    const src=img.getAttribute('src')||img.dataset.src||'';
    const tile=/art\/tiles\/([a-z]+)_\d/.exec(src),unit=/art\/[pt]\/([a-z0-9]+)(?:_(?:sc|fg))?\.(?:svg|webp|png)/.exec(src);
    if(!tile&&!unit)return;
    if(unit){if(!watched.has(img)){watched.add(img);observer.observe(img);}if(!visible.has(img))return;}
    if(jobs.get(img)===src)return;jobs.set(img,src);
    await Promise.all([ready,HVRig.ready]);
    let replacement;
    if(tile)replacement=tiles.get(tile[1]);
    else if(HVRig.registry[unit[1]]){
      const key=unit[1],single=!img.closest('#draft'),cache=key+':'+single;
      if(!portraits.has(cache))portraits.set(cache,(async()=>{
        if(!await HVRig.ensure(key))return null;
        const c=document.createElement('canvas');c.width=320;c.height=240;
        HVRig.draw(c,key,1,'idle',0,single);return c.toDataURL();
      })());
      replacement=await portraits.get(cache);
    }
    if(!replacement||jobs.get(img)!==src)return;
    img.dataset.currentArt=tile?'terrain':'unit';
    if(img.hasAttribute('data-src'))img.dataset.src=replacement;
    img.src=replacement;
  }
  function scan(node){
    if(node.matches?.('img'))update(node);
    node.querySelectorAll?.('img').forEach(update);
  }
  new MutationObserver(records=>{for(const r of records){
    if(r.type==='attributes')update(r.target);
    else for(const n of r.addedNodes)if(n.nodeType===1)scan(n);
  }}).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-src']});
  const style=document.createElement('style');style.textContent=`
    img[data-current-art="unit"]{object-fit:contain!important}
    .hvf:has(img[data-current-art]){background:radial-gradient(ellipse at 50% 75%,#526957,#192830 75%)}
    .hvf img[data-current-art]{inset:0!important;width:100%!important;height:100%!important;transform:none!important}
    .hvf .hvsc[data-current-art]{display:none}
  `;document.head.append(style);scan(document);
})();
