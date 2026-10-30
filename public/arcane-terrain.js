/* Non-destructive visual replacement; terrain rules and seeded geometry are unchanged. */
(() => {
  const types=['grass','forest','hill','swamp','shrine','keep','mine','sand','shallow','deep'];
  const atlas=new Image();atlas.onload=()=>{
    const style=document.createElement('style');
    style.textContent=types.map((type,i)=>Array.from({length:4},(_,v)=>`html.hv-arcane #bw #hvbg i.tt-${type}_${v}{background-image:url(art/terrain-arcane.png)!important;background-size:500% 200%!important;background-position:${i%5*25}% ${Math.floor(i/5)*100}%!important;clip-path:polygon(50% 0,100% 25%,100% 75%,50% 100%,0 75%,0 25%)}`).join('\n')).join('\n')+`
      html.hv-arcane #bw #hvbg>i.t{transform:scale(1.04)!important}
      html.hv-arcane #board .cell>.fzb,html.hv-arcane #board .cell>.fzf,html.hv-arcane #board .cell>.hvz-shr{display:none!important}
      html.hv-arcane #board .cell>.minei img,html.hv-arcane #board .cell>.minei .hvz-m{display:none!important}
      html.hv-arcane #board .cell>.minei{width:9px!important;height:9px!important;left:50%!important;bottom:4%!important;top:auto!important;border:2px solid var(--mc,#d6b45c);border-radius:50%;background:#282a21;transform:none!important}
    `;
    document.head.appendChild(style);document.documentElement.classList.add('hv-arcane');window.HVArcaneTerrain={ready:true,types};
  };atlas.onerror=()=>console.warn('Arcane terrain unavailable; original terrain retained.');atlas.src='art/terrain-arcane.png';
})();
