/* Local turns wait at their next action boundary; network matches keep running. */
(() => {
  let opened = false, match = null, waiting = [], back = null, panel;
  const q = s => document.querySelector(s);
  const active = () => q('#game') && !q('#game').hidden && typeof S !== 'undefined' && S;
  const local = () => opened && !NET && S === match;
  window.hvPause = {
    defer(fn) {
      if (!local()) return false;
      waiting.push(fn);
      return true;
    },
    open() {
      if (opened || !active()) return;
      back = document.activeElement;
      opened = true; match = S;
      panel.hidden = false;
      q('#hv-pause-note').textContent = NET
        ? 'Online match continues while this menu is open.'
        : 'Battle paused. Resume when you are ready.';
      q('#hv-pause-leave').textContent = NET ? 'Leave match' : 'Return to main menu';
      q('#hv-pause-confirm').hidden = true;
      q('#game').inert = true;
      document.body.classList.add('hv-paused');
      q('#hv-pause-resume').focus();
    },
    close(discard = false) {
      if (!opened) return;
      const pending = waiting; waiting = [];
      const sameMatch = S === match;
      opened = false; panel.hidden = true;
      q('#dspx').click();
      q('#game').inert = false;
      document.body.classList.remove('hv-paused');
      if (back && back.isConnected) back.focus();
      if (!discard && sameMatch && active()) pending.forEach(fn => fn());
    }
  };
  // Registered before the game's hotkeys so menu input never triggers battle actions.
  window.addEventListener('keydown', e => {
    if (!opened) {
      if (e.key !== 'Escape' || !active() || e.target.closest('input,textarea,select')) return;
      if (['#dspo', '#hvh', '#pass'].some(s => q(s) && !q(s).hidden)) return;
      e.preventDefault(); e.stopImmediatePropagation(); hvPause.open(); return;
    }
    e.stopImmediatePropagation();
    if (e.key === 'Escape') {
      e.preventDefault();
      if (!q('#dspo').hidden) q('#dspx').click();
      else if (!q('#hv-pause-confirm').hidden) q('#hv-pause-confirm').hidden = true;
      else hvPause.close();
    } else if (e.key === 'Tab') {
      const root = q('#dspo').hidden ? panel : q('#dspo');
      const items = [...root.querySelectorAll('button,input,select,[tabindex="0"]')].filter(el => !el.disabled && el.getClientRects().length);
      const i = items.indexOf(document.activeElement);
      e.preventDefault(); items[(i + (e.shiftKey ? -1 : 1) + items.length) % items.length]?.focus();
    }
  }, true);
  document.addEventListener('DOMContentLoaded', () => {
    const style = document.createElement('style');
    style.textContent = `
      #hv-pause[hidden],#hv-pause-confirm[hidden]{display:none}
      #hv-pause{position:fixed;inset:0;z-index:20000;display:grid;place-items:center;padding:18px;background:#090c10d9;backdrop-filter:blur(5px)}
      #hv-pause .pause-card{box-sizing:border-box;width:min(100%,420px);max-height:90dvh;overflow:auto;padding:28px;border:2px solid #89704b;border-radius:16px;background:linear-gradient(145deg,#303b32,#171e20);box-shadow:0 20px 80px #000b;color:#f1e7cc;text-align:center;font-family:Almendra,Georgia,serif}
      #hv-pause h2{font-size:32px;margin:0 0 8px;color:#f4d28c}
      #hv-pause p{font-size:16px;line-height:1.5;color:#c7c5b5}
      #hv-pause button{display:block;width:100%;min-height:46px;margin-top:12px;font:inherit;font-size:18px;border:1px solid #88724c;border-radius:7px;background:#354638;color:#f1e7cc;cursor:pointer;padding:10px}
      #hv-pause button:hover{background:#4b6048}
      #hv-pause button:focus-visible,#dspo :focus-visible{outline:3px solid #f4d28c;outline-offset:3px}
      #hv-pause-confirm{border-top:1px solid #89704b;margin-top:18px}
      body.hv-paused #dspo{z-index:20001}
      #dspo .dp{max-height:85dvh;overflow-y:auto}
      #hv-pause-button{white-space:nowrap}
    `;
    document.head.appendChild(style);
    panel = document.createElement('div'); panel.id = 'hv-pause'; panel.hidden = true;
    panel.setAttribute('role','dialog'); panel.setAttribute('aria-modal','true'); panel.setAttribute('aria-labelledby','hv-pause-title');
    panel.innerHTML = `<section class="pause-card"><h2 id="hv-pause-title">Battle menu</h2><p id="hv-pause-note"></p><button id="hv-pause-resume">Resume battle</button><button id="hv-pause-settings">Settings</button><button id="hv-pause-leave">Return to main menu</button><div id="hv-pause-confirm" hidden><p>Leave this battle? You cannot resume a local battle after leaving.</p><button id="hv-pause-exit">Leave battle</button><button id="hv-pause-stay">Stay here</button></div><p>Esc · open / close menu</p></section>`;
    document.body.appendChild(panel);
    const b = document.createElement('button'); b.id = 'hv-pause-button'; b.type = 'button'; b.textContent = '☰ Menu'; b.title = 'Pause and settings (Esc)'; b.onclick = hvPause.open;
    q('#game .bar').appendChild(b);
    q('#hv-pause-resume').onclick = () => hvPause.close();
    q('#hv-pause-settings').onclick = () => q('#dspb').click();
    q('#hv-pause-leave').onclick = () => {q('#hv-pause-confirm').hidden = false; q('#hv-pause-stay').focus();};
    q('#hv-pause-stay').onclick = () => {q('#hv-pause-confirm').hidden = true; q('#hv-pause-leave').focus();};
    q('#hv-pause-exit').onclick = () => {hvPause.close(true); q('#restart').click();};
    new MutationObserver(() => {if (opened && !active()) hvPause.close(true);}).observe(q('#game'), {attributes:true,attributeFilter:['hidden']});
  });
})();
