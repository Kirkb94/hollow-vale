// ── UI ─────────────────────────────────────────────────────────────────────
const UI = { sel: new Set(), groups: {}, placing: null, ghost: null, drag: null, marks: [], keys: {}, mode: null, sub: null, paused: true, started: false, infoHtml: '', cmdHtml: '', hoverId: null };
const setup = { fac: 'kingdom', rivals: 1, diff: 1 };
const selected = () => [...UI.sel].map(byId).filter(e => e && !e.dead && !e.dying);
const mySel = () => selected().filter(e => e.side === 0);
function entityAt(tx, ty) {
  let best = null, bd = 0.75;
  for (const u of W.units) { if (u.dead || u.dying || (u.side !== 0 && !FOG.see(u.x, u.y))) continue; const r = (u.k !== 'worker' && H[u.k].elite) ? 1.1 : 0.75, d = Math.hypot(u.x - tx, (u.y - 0.5) - ty) / r * 0.75; if (d < bd) { bd = d; best = u; } }
  if (best) return best;
  const id = inMap(Math.floor(tx), Math.floor(ty)) ? map.bld[ix(Math.floor(tx), Math.floor(ty))] : -1;
  if (id >= 0) { const b = byId(id); if (b && (b.side <= 0 || FOG.seen[ix(b.x, b.y)])) return b; }
  return null;
}
function flash(text) { W.alerts.push({ text, kind: 'bad', t: 3.5 }); }
const costHtml = c => (c.gold ? `<span class="ic" style="${ICON(4, 0)}"></span>${c.gold} ` : '') + (c.mana ? `<span class="ic" style="${ICON(3, 0)}"></span>${c.mana}` : '');
const pct = (f, col) => `<div class="bar"><i style="width:${Math.round(clamp(f, 0, 1) * 100)}%;background:${col}"></i></div>`;

// ── input ──────────────────────────────────────────────────────────────────
cv.addEventListener('contextmenu', e => e.preventDefault());
cv.addEventListener('mousedown', e => {
  if (!UI.started) return;
  const [tx, ty] = toTile(e.clientX, e.clientY);
  if (e.button === 0) {
    if (UI.placing) {
      const d = BDEF[UI.placing], x = Math.floor(tx - d.w / 2 + 0.5), y = Math.floor(ty - d.h / 2 + 0.5);
      if (!canPlace(UI.placing, x, y) || !FOG.seen[ix(clamp(x, 0, MW - 1), clamp(y, 0, MH - 1))]) { flash('Can\'t build there.'); return; }
      if (!canAfford(W.P[0], d.cost)) { flash('Not enough gold.'); return; }
      pay(W.P[0], d.cost); const b = placeBuilding(0, UI.placing, x, y, false);
      const ws = mySel().filter(u => u.k === 'worker'); orderBuild(ws.length ? ws : [], b);
      if (!e.shiftKey) { UI.placing = null; UI.sub = null; }
      return;
    }
    if (UI.mode === 'amove') { const army = mySel().filter(u => u.kind === 'u'); if (army.length) { orderMove(army, tx, ty, true); UI.marks.push({ x: tx, y: ty, t: 0.6, atk: true }); } UI.mode = null; return; }
    UI.drag = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, box: false, shift: e.shiftKey };
  } else if (e.button === 2) {
    if (UI.placing || UI.mode) { UI.placing = null; UI.mode = null; return; }
    rightClick(tx, ty, e.shiftKey);
  }
});
addEventListener('mousemove', e => {
  if (!UI.started) return;
  UI.mx = e.clientX; UI.my = e.clientY;
  const [tx, ty] = toTile(e.clientX, e.clientY);
  if (UI.placing) { const d = BDEF[UI.placing]; UI.ghost = { x: Math.floor(tx - d.w / 2 + 0.5), y: Math.floor(ty - d.h / 2 + 0.5) }; }
  if (UI.drag) { UI.drag.x1 = e.clientX; UI.drag.y1 = e.clientY; if (Math.abs(UI.drag.x1 - UI.drag.x0) + Math.abs(UI.drag.y1 - UI.drag.y0) > 8) UI.drag.box = true; }
  const h = entityAt(tx, ty); UI.hoverId = h ? h.id : null;
  if (UI.mmDrag) miniJump(e);
});
addEventListener('mouseup', e => {
  if (UI.mmDrag) { UI.mmDrag = false; return; }
  if (!UI.drag || e.button !== 0) return;
  const d = UI.drag; UI.drag = null;
  if (!d.shift) UI.sel.clear();
  if (d.box) {
    const [ax, ay] = toTile(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1)), [bx, by] = toTile(Math.max(d.x0, d.x1), Math.max(d.y0, d.y1));
    const inBox = W.units.filter(u => u.side === 0 && !u.dead && !u.dying && u.x >= ax && u.x <= bx && u.y - 0.5 >= ay - 0.5 && u.y - 0.5 <= by + 0.3);
    const army = inBox.filter(u => u.k !== 'worker');
    for (const u of (army.length ? army : inBox)) UI.sel.add(u.id);
  } else {
    const [tx, ty] = toTile(d.x0, d.y0), t = entityAt(tx, ty);
    if (t) {
      if (t.kind === 'u' && t.side === 0 && (UI.lastClick && UI.lastClick.id === t.id && performance.now() - UI.lastClick.t < 350)) {   // double-click: all of that type on screen
        for (const u of W.units) if (u.side === 0 && u.k === t.k && !u.dead) { const sx = (u.x * TS - cam.x) * cam.z, sy = (u.y * TS - cam.y) * cam.z; if (sx > 0 && sy > 0 && sx < innerWidth && sy < innerHeight) UI.sel.add(u.id); }
      } else if (UI.sel.has(t.id) && d.shift) UI.sel.delete(t.id); else UI.sel.add(t.id);
      UI.lastClick = { id: t.id, t: performance.now() };
    }
  }
  UI.sub = null; refreshPanels(true);
});
function rightClick(tx, ty, shift) {
  const sel = mySel(), t = entityAt(tx, ty);
  const units = sel.filter(e => e.kind === 'u'), blds = sel.filter(e => e.kind === 'b');
  if (!units.length && blds.length) {        // rally point
    for (const b of blds) b.rally = t && t.type === 'mine' ? [tx, ty, 0] : [tx, ty];
    for (const b of blds) if (t && t.type === 'mine') b.rally.mine = t.id;
    UI.marks.push({ x: tx, y: ty, t: 0.6 }); return;
  }
  if (!units.length) return;
  const workers = units.filter(u => u.k === 'worker'), army = units.filter(u => u.k !== 'worker');
  if (t && t.kind === 'b' && t.type === 'mine') { workers.forEach(u => orderGather(u, t)); if (army.length) orderMove(army, tx, ty, false); UI.marks.push({ x: tx, y: ty, t: 0.6 }); return; }
  if (t && t.kind === 'b' && t.side === 0 && !t.done) { orderBuild(workers, t); if (army.length) orderMove(army, tx, ty, false); UI.marks.push({ x: tx, y: ty, t: 0.6 }); return; }
  if (t && t.side > 0) { orderAttack(units, t); UI.marks.push({ x: tx, y: ty, t: 0.6, atk: true }); return; }
  if (workers.length) orderMove(workers, tx, ty, false);
  if (army.length) orderMove(army, tx, ty, !shift);
  UI.marks.push({ x: tx, y: ty, t: 0.6 });
}
addEventListener('keydown', e => {
  if (!UI.started) return;
  const k = e.key.toLowerCase(); UI.keys[k] = true;
  if (k === 'p' || k === 'escape') { if (UI.placing || UI.mode || UI.sub) { UI.placing = null; UI.mode = null; UI.sub = null; refreshPanels(true); return; } togglePause(); return; }
  if (UI.paused) return;
  if (k === 'f1') { e.preventDefault(); showMenu('help'); UI.paused = true; return; }
  if (/^[1-9]$/.test(k)) {
    if (e.ctrlKey || e.metaKey) { e.preventDefault(); UI.groups[k] = [...UI.sel]; flash(`Group ${k} saved.`); }
    else if (UI.groups[k]) { UI.sel = new Set(UI.groups[k].filter(id => byId(id))); const f = selected()[0]; if (f && UI.lastGroup === k && performance.now() - UI.lastGroupT < 400) centerOn(f.x, f.y); UI.lastGroup = k; UI.lastGroupT = performance.now(); refreshPanels(true); }
    return;
  }
  if (k === ' ') { e.preventDefault(); UI.sel = new Set(W.units.filter(u => u.side === 0 && u.k !== 'worker' && !u.dead && !u.dying).map(u => u.id)); refreshPanels(true); return; }
  if (k === 'tab') { e.preventDefault(); const ks = W.blds.filter(b => b.side === 0 && b.type === 'keep' && !b.dead); if (ks.length) { UI.keepI = ((UI.keepI || 0) + 1) % ks.length; const b = ks[UI.keepI]; UI.sel = new Set([b.id]); centerOn(b.x + b.w / 2, b.y + b.h / 2); refreshPanels(true); } return; }
  if (k === '.') { const idle = W.units.filter(u => u.side === 0 && u.k === 'worker' && !u.dead && !u.gather && !u.build && !u.order); if (idle.length) { UI.idleI = ((UI.idleI || 0) + 1) % idle.length; const u = idle[UI.idleI]; UI.sel = new Set([u.id]); centerOn(u.x, u.y); refreshPanels(true); } else flash('No idle workers.'); return; }
  // command card hotkeys
  const btn = [...document.querySelectorAll('#cmd .cb')].find(b => b.dataset.key === k);
  if (btn) { e.preventDefault(); cmdAction(btn.dataset.act); }
});
addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
cv.addEventListener('wheel', e => {
  if (!UI.started) return; e.preventDefault();
  const [tx, ty] = toTile(e.clientX, e.clientY); cam.z = clamp(cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.45, 1.8);
  cam.x = tx * TS - e.clientX / cam.z; cam.y = ty * TS - e.clientY / cam.z; clampCam();
}, { passive: false });
function miniJump(e) { const r = mm.getBoundingClientRect(); centerOn((e.clientX - r.left) / r.width * MW, (e.clientY - r.top) / r.height * MH); }
mm.addEventListener('mousedown', e => { if (e.button === 2) { const r = mm.getBoundingClientRect(); rightClick((e.clientX - r.left) / r.width * MW, (e.clientY - r.top) / r.height * MH, false); return; } UI.mmDrag = true; miniJump(e); });
mm.addEventListener('contextmenu', e => e.preventDefault());

// ── command card ──────────────────────────────────────────────────────────
function cmdButtons() {
  const sel = mySel(), out = [];
  if (!sel.length) return out;
  const units = sel.filter(e => e.kind === 'u'), workers = units.filter(u => u.k === 'worker'), b = sel.find(e => e.kind === 'b');
  if (units.length) {
    if (UI.sub === 'build' && workers.length) {
      for (const t of BUILD_LIST) { const d = BDEF[t], reqOk = !d.req || W.blds.some(o => o.side === 0 && o.type === d.req && o.done && !o.dead); out.push({ act: 'place-' + t, key: d.key, label: d.n, pic: `obj:${d.spr === 'tower' ? SIDES[0].tower : d.spr}`, na: !canAfford(W.P[0], d.cost) || !reqOk, tip: `bld:${t}` }); }
      out.push({ act: 'back', key: 'escape', label: 'Back', back: true });
      return out;
    }
    out.push({ act: 'amove', key: 'a', label: 'Attack', icon: [1, 0], tip: 'cmd:amove' }, { act: 'stop', key: 's', label: 'Stop', icon: [2, 0], tip: 'cmd:stop' }, { act: 'hold', key: 'h', label: 'Hold', icon: [1, 3], tip: 'cmd:hold' });
    if (workers.length) out.push({ act: 'build', key: 'b', label: 'Build', icon: [2, 4], tip: 'cmd:build' }, { act: 'mine', key: 'g', label: 'Mine', icon: [0, 3], tip: 'cmd:mine' });
    return out;
  }
  if (b && b.done) {
    const d = BDEF[b.type];
    const list = d.trains === 'roster' ? rosterOf(W.P[0].fac) : d.trains === 'elite' ? rosterOf(W.P[0].fac, true) : d.trains || [];
    const keys = 'qwertyuiopasdfgzxcvbnm';
    list.forEach((k, i) => { const c = trainCost(k); out.push({ act: 'train-' + k, key: keys[i], label: k === 'worker' ? WORKER_NAME[W.P[0].fac] : H[k].n, pic: 'unit:' + (k === 'worker' ? WORKER[W.P[0].fac] : k), na: !canAfford(W.P[0], c) || (k !== 'worker' && armySize(0) + H[k].slots > armyCap(0)), tip: 'unit:' + k }); });
  }
  return out;
}
function cmdAction(act) {
  const sel = mySel(), units = sel.filter(e => e.kind === 'u'), b = sel.find(e => e.kind === 'b');
  if (act === 'back') { UI.sub = null; UI.placing = null; }
  else if (act === 'build') UI.sub = 'build';
  else if (act === 'amove') UI.mode = 'amove';
  else if (act === 'stop') { for (const u of units) { u.order = null; u.target = null; u.path = null; u.gather = null; u.build = null; u.hold = false; u.guard = [u.x, u.y]; } }
  else if (act === 'hold') { for (const u of units) { u.order = null; u.target = null; u.path = null; u.hold = true; u.guard = [u.x, u.y]; } }
  else if (act === 'mine') { for (const u of units) if (u.k === 'worker') { const m = nearestMine(u.x, u.y, 80); if (m) orderGather(u, m); } }
  else if (act.startsWith('place-')) { const t = act.slice(6), d = BDEF[t]; if (d.req && !W.blds.some(o => o.side === 0 && o.type === d.req && o.done && !o.dead)) flash(`Needs a ${BDEF[d.req].n} first.`); else if (!canAfford(W.P[0], d.cost)) flash('Not enough gold.'); else UI.placing = t; }
  else if (act.startsWith('train-') && b) { const why = startTraining(b, act.slice(6)); if (why) flash(why); }
  else if (act.startsWith('cancel-') && b) cancelTraining(b, +act.slice(7));
  else if (act.startsWith('pick-')) { UI.sel = new Set([+act.slice(5)]); }
  refreshPanels(true);
}
$('cmd').addEventListener('mousedown', e => { const el = e.target.closest('.cb'); if (el && e.button === 0) { e.preventDefault(); cmdAction(el.dataset.act); } });
$('info').addEventListener('mousedown', e => { const el = e.target.closest('[data-act]'); if (el && e.button === 0) { e.preventDefault(); cmdAction(el.dataset.act); } });

// ── panels ────────────────────────────────────────────────────────────────
function picStyle(p) {
  if (!p) return '';
  if (p.startsWith('obj:')) { const b = OBJ_BOX[p.slice(4)], sc = 46 / Math.max(b[2], b[3]); return `background-image:url(art/objects-pocket-chibi.png);background-size:${1261 * sc}px ${1247 * sc}px;background-position:${-b[0] * sc + (46 - b[2] * sc) / 2}px ${-b[1] * sc + (46 - b[3] * sc) / 2}px`; }
  if (p.startsWith('unit:')) { const url = portrait(p.slice(5)); return url ? `background-image:url(${url})` : ''; }
  return '';
}
function refreshCmd(force) {
  const btns = cmdButtons();
  const h = btns.map(b => `<button class="cb ${b.na ? 'na' : ''} ${b.back ? 'back' : ''}" data-act="${b.act}" data-key="${b.key}" data-tip="${b.tip || ''}">${b.key && b.key.length === 1 ? `<span class="k">${b.key.toUpperCase()}</span>` : ''}${b.icon ? `<span class="icn" style="${ICON(b.icon[0], b.icon[1])}"></span>` : b.pic ? `<span class="pic" style="${picStyle(b.pic)}"></span>` : ''}<span class="lb">${b.label}</span></button>`).join('');
  if (force || h !== UI.cmdHtml) { $('cmd').innerHTML = h; UI.cmdHtml = h; }
}
function unitStats(u) {
  const s = u.s, h = u.k === 'worker' ? null : H[u.k];
  return `<div class="stats"><span>❤ ${Math.ceil(u.hp)}/${u.maxHp}</span><span>⚔ ${Math.round(unitDmg(u))}${s.siege ? ` (+${s.siege * DMX} siege)` : ''}</span>${s.armor ? `<span>🛡 ${s.armor}</span>` : ''}<span>🎯 ${s.range > 2 ? s.range.toFixed(1) : 'melee'}</span><span>👣 ${s.speed.toFixed(1)}</span>${h ? `<span>Slots ${h.slots}${h.group ? ` (squad of ${h.group})` : ''}</span>` : ''}${u.star ? `<span>${'★'.repeat(u.star)} ${u.xp.toFixed(1)} XP</span>` : h ? `<span>${u.xp.toFixed(1)} XP</span>` : ''}</div>`;
}
function kwHtml(k) {
  const h = H[k], kws = (h.kw || []).slice(0, 3), F = FAC[h.fac];
  return `<div class="kw dim">${F ? `<b>${F.p}:</b> ${F.pd.replace(/turns?/g, 'few seconds').slice(0, 160)} ` : ''}${kws.map(([n, d]) => `<br><b>${n}:</b> ${d.slice(0, 150)}`).join('')}</div>`;
}
function refreshInfo(force) {
  const sel = selected();
  let h = '';
  if (!sel.length) h = `<div class="dim">Select units with a left-click or drag. Right-click to move, attack or mine. Select a Worker and press <b>B</b> to build.<br>Space selects your army, . (period) an idle worker, Tab cycles your Keeps. F1 for help.</div>`;
  else if (sel.length === 1) {
    const e = sel[0];
    if (e.kind === 'u') {
      const P = W.P[e.side], name = e.k === 'worker' ? WORKER_NAME[P.fac] : H[e.k].n;
      h = `<h3>${name} <span class="dim" style="font:13px inherit">${e.side === 0 ? '' : SIDES[e.side].name} · ${FAC[P.fac].n}${e.k !== 'worker' && H[e.k].role ? ' · ' + H[e.k].role[0] : ''}</span></h3>${pct(e.hp / e.maxHp, '#74d06a')}${unitStats(e)}`;
      if (e.k === 'worker') h += `<div class="dim">${e.build ? 'Building' : e.gather ? (e.carry ? `Carrying ${e.carry} gold` : 'Mining gold') : 'Idle'}. Workers mine gold, build and repair nothing else. They don't use army slots.</div>`;
      else h += `<div class="dim">${H[e.k].d}</div>${kwHtml(e.k)}`;
      if (e.stunT > 0) h += `<div style="color:var(--bad)">Stunned</div>`;
    } else {
      const d = BDEF[e.type];
      h = `<h3>${d.n}</h3>`;
      if (e.type === 'mine') h += `<div class="row">Gold left: <b>${Math.floor(e.gold)}</b></div><div class="dim">${d.d}</div>`;
      else {
        h += `${pct(e.done ? e.hp / e.maxHp : e.prog, e.done ? '#74d06a' : '#e2b84a')}<div class="row">${e.done ? `❤ ${Math.ceil(e.hp)}/${e.maxHp}` : `Under construction: ${Math.floor(e.prog * 100)}%`}</div><div class="dim">${d.d}</div>`;
        if (e.side === 0 && e.queue.length) h += `<div class="row" style="margin-top:6px">` + e.queue.map((q, i) => `<span class="q" data-act="cancel-${i}" title="Click to cancel"><span class="pic" style="${picStyle('unit:' + (q.k === 'worker' ? WORKER[W.P[0].fac] : q.k))}"></span>${i === 0 ? Math.ceil(q.t) + 's' : ''}</span>`).join('') + `</div>`;
        if (e.side === 0 && d.trains) h += `<div class="dim">Right-click the ground to set a rally point${d.trains[0] === 'worker' ? ' (or a Gold Mine to send new workers mining)' : ''}.</div>`;
      }
    }
  } else {
    const c = {}; for (const e of sel) { const n = e.kind === 'b' ? BDEF[e.type].n : e.k === 'worker' ? WORKER_NAME[W.P[e.side].fac] : H[e.k].n; c[n] = (c[n] || 0) + 1; }
    h = `<h3>${sel.length} selected</h3><div class="grid">` + sel.slice(0, 40).map(e => e.kind === 'u' ? `<span class="mini" data-act="pick-${e.id}" style="${picStyle('unit:' + unitLook(e))}"><i><b style="width:${Math.round(e.hp / e.maxHp * 100)}%"></b></i></span>` : '').join('') + `</div><div class="dim" style="margin-top:4px">${Object.entries(c).map(([n, k]) => `${k} × ${n}`).join(' · ')}</div>`;
  }
  if (force || h !== UI.infoHtml) { $('info').innerHTML = h; UI.infoHtml = h; }
}
function refreshTop() {
  const P = W.P[0], used = armySize(0), cap = armyCap(0);
  $('rGold').textContent = Math.floor(P.gold); $('rMana').textContent = Math.floor(P.mana);
  $('rArmy').textContent = `${used}/${cap}`; $('rArmyBox').classList.toggle('warn', used >= cap);
  $('rWork').textContent = W.units.filter(u => u.side === 0 && u.k === 'worker' && !u.dead).length;
  $('clock').textContent = `${Math.floor(W.t / 60)}:${String(Math.floor(W.t % 60)).padStart(2, '0')}`;
  $('rivals').innerHTML = W.P.slice(1).map(o => `<span title="${SIDES[o.i].name}: ${FAC[o.fac].n}${o.alive ? '' : ' (destroyed)'}" style="display:inline-block;width:14px;height:14px;border-radius:50%;background:${SIDES[o.i].col};opacity:${o.alive ? 1 : 0.25};border:2px solid #000"></span> <small>${FAC[o.fac].n}</small>`).join(' ');
  $('alerts').innerHTML = W.alerts.map(a => `<div class="${a.kind}">${a.text}</div>`).join('');
}
function refreshPanels(force) { refreshCmd(force); refreshInfo(force); refreshTop(); }
// tooltips
document.addEventListener('mouseover', e => {
  const el = e.target.closest('[data-tip]'), tip = $('tip');
  if (!el || !el.dataset.tip) { tip.hidden = true; return; }
  const [k, v] = el.dataset.tip.split(':'); let h = '';
  if (k === 'bld') { const d = BDEF[v]; h = `<b>${d.n}</b> <span class="dim">(${d.key.toUpperCase()})</span><div>${costHtml(d.cost)}</div><div class="dim">${d.d}</div>${d.req ? `<div class="dim">Needs a ${BDEF[d.req].n}.</div>` : ''}`; }
  else if (k === 'unit') { if (v === 'worker') h = `<b>${WORKER_NAME[W.P[0].fac]}</b><div>${costHtml(trainCost(v))} · ${trainTime(v)}s</div><div class="dim">Mines gold and builds. Doesn't use army slots.</div>`; else { const hh = H[v], s = statsOf(v); h = `<b>${hh.n}</b> <span class="dim">${hh.role ? hh.role[0] : ''} · ${hh.slots} slot${hh.slots > 1 ? 's' : ''}${hh.group ? ` · squad of ${hh.group}` : ''}</span><div>${costHtml(trainCost(v))} · ${trainTime(v)}s</div><div class="dim">❤ ${s.hp} · ⚔ ${s.dmg}${s.armor ? ` · 🛡 ${s.armor}` : ''} · 🎯 ${s.range > 2 ? s.range.toFixed(1) : 'melee'}${s.fly ? ' · flying' : ''}</div><div class="dim">${hh.d}</div>${(hh.kw || []).slice(0, 2).map(([n, d]) => `<div class="dim"><b>${n}</b>: ${d.slice(0, 130)}</div>`).join('')}`; } }
  else if (k === 'cmd') h = { amove: '<b>Attack-move (A)</b><div class="dim">Then click: march there and fight anything met on the way.</div>', stop: '<b>Stop (S)</b>', hold: '<b>Hold position (H)</b><div class="dim">Stay put and only fight what comes into range.</div>', build: '<b>Build (B)</b><div class="dim">Open the building list.</div>', mine: '<b>Mine (G)</b><div class="dim">Send selected workers to the nearest Gold Mine.</div>' }[v];
  else if (k === 'gold') h = '<b>Gold</b><div class="dim">Workers mine it; Farms add a trickle; burning enemy buildings pays a bounty.</div>';
  else if (k === 'mana') h = '<b>Mana</b><div class="dim">Mana Wells fill it. Casters, healers and Elites need mana to train.</div>';
  else if (k === 'army') h = `<b>Army slots</b><div class="dim">Heroes take 1-5 slots by price. A squad gives slots back as members fall. Cottages (+4) and the Hero Shrine (+6) raise the cap (max ${ARMY_CAP}).</div>`;
  else if (k === 'workers') h = `<b>Workers</b><div class="dim">Up to ${MAX_WORKERS}. Press . (period) to find an idle one.</div>`;
  if (!h) { tip.hidden = true; return; }
  tip.innerHTML = h; tip.hidden = false;
  const r = el.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - 350, r.left) + 'px'; tip.style.top = Math.max(8, r.top - tip.offsetHeight - 8) + 'px';
});

// ── menus ─────────────────────────────────────────────────────────────────
function showMenu(id) { for (const m of ['title', 'help', 'pause', 'end']) $(m).hidden = m !== id; $('shade').hidden = !id; }
function togglePause() { UI.paused = !UI.paused; showMenu(UI.paused ? 'pause' : null); }
function buildFacPicker() {
  $('optFac').innerHTML = '<span>Your faction</span>' + Object.keys(FAC).map(f => `<button data-v="${f}" class="${f === setup.fac ? 'on' : ''}"><i style="background:${FAC[f].c}"></i>${FAC[f].n}</button>`).join('');
  const info = () => { const F = FAC[setup.fac]; $('facInfo').innerHTML = `<b style="color:${F.c}">${F.p}:</b> ${F.pd.replace(/ at the start of (its|their) owner's (next 2 )?turns?/g, ' over time').replace(/turn/g, 'moment').slice(0, 220)}<br><span class="dim">${rosterOf(setup.fac).length} heroes, ${rosterOf(setup.fac, true).length} Elites</span>`; };
  $('optFac').onclick = e => { const b = e.target.closest('button'); if (!b) return; setup.fac = b.dataset.v; for (const x of $('optFac').querySelectorAll('button')) x.classList.toggle('on', x === b); info(); };
  info();
}
function bindChoice(id, key) { $(id).onclick = e => { const b = e.target.closest('button'); if (!b) return; setup[key] = +b.dataset.v; for (const x of $(id).querySelectorAll('button')) x.classList.toggle('on', x === b); }; }
bindChoice('optRivals', 'rivals'); bindChoice('optDiff', 'diff');
$('btnStart').onclick = () => beginMatch();
$('btnHelp').onclick = () => showMenu('help');
$('btnHelpBack').onclick = () => showMenu(UI.started ? 'pause' : 'title');
$('btnResume').onclick = () => togglePause();
$('btnPauseHelp').onclick = () => showMenu('help');
$('btnQuit').onclick = () => { UI.started = false; $('top').hidden = $('bottom').hidden = true; showMenu('title'); };
$('btnAgain').onclick = () => beginMatch();
$('btnEndMenu').onclick = () => { UI.started = false; $('top').hidden = $('bottom').hidden = true; showMenu('title'); };
$('btnMenu').onclick = () => togglePause();
for (const b of document.querySelectorAll('#top [data-speed]')) b.onclick = () => { W.speed = +b.dataset.speed; for (const x of document.querySelectorAll('#top [data-speed]')) x.classList.toggle('on', x === b); };
function beginMatch() {
  startMatch(setup.fac, setup.rivals, setup.diff, (Math.random() * 2 ** 31) | 0);
  rand = Math.random;
  // warm the sprite sheets for every faction in play
  for (const P of W.P) { for (const k of [...rosterOf(P.fac), ...rosterOf(P.fac, true), WORKER[P.fac]]) sheetOf(k); }
  bakeTerrain(); bakeMini();
  UI.sel.clear(); UI.groups = {}; UI.placing = null; UI.mode = null; UI.sub = null; UI.started = true; UI.paused = false; UI.endShown = false; W.speed = 1;
  for (const x of document.querySelectorAll('#top [data-speed]')) x.classList.toggle('on', x.dataset.speed === '1');
  const k = W.blds.find(b => b.side === 0 && b.type === 'keep'); cam.z = 1; centerOn(k.x + k.w / 2, k.y + k.h / 2 + 1);
  $('top').hidden = $('bottom').hidden = false; showMenu(null);
  W.alerts.push({ text: `You lead the ${FAC[setup.fac].n}. Your workers are already mining. Build Farms, Cottages and a Barracks.`, kind: 'good', t: 9 });
  refreshPanels(true);
}

// ── main loop ─────────────────────────────────────────────────────────────
let last = performance.now(), acc = 0, panelT = 0;
function frame(now) {
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (UI.started && !UI.paused) {
    acc += dt * W.speed; let n = 0;
    while (acc >= DT && n++ < 12) { tick(); acc -= DT; }
    const sp = 900 * dt / cam.z;
    if (UI.keys.arrowleft) cam.x -= sp; if (UI.keys.arrowright) cam.x += sp; if (UI.keys.arrowup) cam.y -= sp; if (UI.keys.arrowdown) cam.y += sp;
    if (UI.mx !== undefined && UI.my > 52 && UI.my < innerHeight - 210) { if (UI.mx < 6) cam.x -= sp; if (UI.mx > innerWidth - 6) cam.x += sp; }
    if (UI.my !== undefined && UI.mx > 400 && UI.mx < innerWidth - 220) { if (UI.my < 4) cam.y -= sp; }
    clampCam();
    for (const m of UI.marks) m.t -= dt; UI.marks = UI.marks.filter(m => m.t > 0);
    if ((panelT -= dt) <= 0) { panelT = 0.25; refreshPanels(); }
    if (W.over && !UI.endShown) {
      UI.endShown = true;
      setTimeout(() => {
        $('endTitle').textContent = W.over === 'win' ? 'Victory' : 'Defeat';
        $('endSub').textContent = W.over === 'win' ? `Every rival Keep is ash. The ${FAC[W.P[0].fac].n} rule the Vale.` : 'Your last Keep has fallen.';
        const S = W.P[0].stats; $('endStats').innerHTML = `Time ${Math.floor(W.t / 60)}:${String(Math.floor(W.t % 60)).padStart(2, '0')} · Gold earned ${Math.floor(S.gold)} · Units trained ${S.trained} · Kills ${S.kills} · Losses ${S.lost}`;
        showMenu('end');
      }, 1200);
    }
  }
  if (UI.started) { render(); drawMini(); }
  requestAnimationFrame(frame);
}
// ── boot: load Hollow Vale's data and sprite catalog ───────────────────────
(async function boot() {
  try {
    const [data, cat] = await Promise.all([fetch('rts-data.json').then(r => r.json()), fetch('art/frames/catalog.json').then(r => r.json())]);
    H = data.heroes; FAC = data.fac; CLASSDESC = data.classes || {}; ARMY_BASE = data.armyBase || 20; CATALOG = cat;
    OBJ(); TER(); loadImg('art/ui-icons-pocket-chibi.png');
    buildFacPicker();
    $('loading').hidden = true; showMenu('title');
    requestAnimationFrame(frame);
  } catch (e) { $('loading').textContent = 'Could not load Hollow Vale data: ' + e.message; }
})();
window.__rts = { W, UI, map, FOG, cam, centerOn, setup, beginMatch, tick };
