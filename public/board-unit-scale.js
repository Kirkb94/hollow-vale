/* Desktop zoom resizes the board rather than transforming it. Scale the
   em-sized figures with that layout size; phone CSS zoom then applies once. */
(() => {
  const board=document.getElementById('board'),wrap=document.getElementById('bw');
  if(!board||!wrap)return;
  const style=document.createElement('style');
  style.textContent=`
    html body #board .cell>.u,
    html body #board .cell>.fzf,
    html body #board .cell :is(.hvz-cgb,.spcage.hvz){font-size:var(--hv-unit-font,34px)}
    html body #board .cell>.u>.sp{font-size:var(--hv-sprite-font,38px)!important}
    #bw .hv-rig-fire{width:calc(var(--hv-unit-font,34px) * 2.65);height:calc(var(--hv-unit-font,34px) * 2.65)}
  `;
  document.head.appendChild(style);
  function sync(){
    if(typeof BASE==='undefined'||BASE<=0||board.clientWidth<=0)return;
    wrap.style.setProperty('--hv-unit-font',(34*board.clientWidth/BASE).toFixed(4)+'px');
    wrap.style.setProperty('--hv-sprite-font',(38*board.clientWidth/BASE).toFixed(4)+'px');
  }
  new ResizeObserver(sync).observe(board);
  if(typeof render==='function'){const original=render;render=function(){const result=original.apply(this,arguments);sync();return result;};}
  sync();
})();
