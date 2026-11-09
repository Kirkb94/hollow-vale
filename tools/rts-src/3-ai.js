// ── AI rivals ──────────────────────────────────────────────────────────────
const AI_ORDER = ['farm', 'cottage', 'barracks', 'farm', 'well', 'cottage', 'watch', 'barracks', 'cottage', 'tower', 'farm', 'shrine', 'cottage', 'well', 'tower', 'cottage', 'barracks', 'cottage'];
function aiFindSpot(P, type, near, rMin, rMax) {
  const d = BDEF[type], [cx, cy] = near;
  for (let r = rMin; r <= rMax; r++) {
    const cand = [];
    for (let y = Math.floor(cy) - r; y <= cy + r; y++) for (let x = Math.floor(cx) - r; x <= cx + r; x++) {
      if (Math.max(Math.abs(x - Math.floor(cx)), Math.abs(y - Math.floor(cy))) !== r) continue;
      if (!canPlace(type, x, y)) continue;
      // leave a one-tile lane around every building so workers never get boxed in
      let ok = true; for (let yy = y - 1; yy <= y + d.h && ok; yy++) for (let xx = x - 1; xx <= x + d.w && ok; xx++) if (inMap(xx, yy) && map.bld[ix(xx, yy)] >= 0) ok = false;
      if (ok) cand.push([x, y]);
    }
    if (cand.length) return cand[Math.floor(rand() * cand.length)];
  }
  return null;
}
function aiBuild(P, type, keep) {
  const c = BDEF[type].cost; if (!canAfford(P, c)) return false;
  const k = keep || W.blds.find(b => b.side === P.i && b.type === 'keep' && !b.dead); if (!k) return false;
  const spot = type === 'watch' || type === 'tower' ? aiFindSpot(P, type, [k.x + k.w / 2 + Math.sign(MW / 2 - k.x) * 4, k.y + k.h / 2 + Math.sign(MH / 2 - k.y) * 4], 1, 8) : aiFindSpot(P, type, bCenter(k), 3, 12);
  if (!spot) return false;
  pay(P, c); const b = placeBuilding(P.i, type, spot[0], spot[1], false);
  const ws = W.units.filter(u => u.side === P.i && !u.dead && !u.dying && u.k === 'worker' && !u.build).sort((a, b2) => dist(a.x, a.y, spot[0], spot[1]) - dist(b2.x, b2.y, spot[0], spot[1])).slice(0, type === 'keep' ? 3 : 2);
  orderBuild(ws, b); return true;
}
function aiTick(P) {
  const A = P.ai; if ((A.thinkT -= DT) > 0) return; A.thinkT = 1;
  const mine = W.blds.filter(b => b.side === P.i && !b.dead), keep = mine.find(b => b.type === 'keep');
  if (!keep) return;
  const ws = W.units.filter(u => u.side === P.i && !u.dead && !u.dying && u.k === 'worker');
  const army = W.units.filter(u => u.side === P.i && !u.dead && !u.dying && u.k !== 'worker');
  // workers: keep training up to a target, idle ones go mining
  const wantW = 12 + mine.filter(b => b.type === 'keep').length * 4 + W.diff * 2;
  if (workerCount(P.i) < wantW && keep.queue.length < 2) startTraining(keep, 'worker');
  for (const u of ws) if (!u.gather && !u.build && !u.order) { const m = nearestMine(u.x, u.y, 80); if (m) orderGather(u, m); }
  // finish half-built sites
  for (const b of mine) if (!b.done) {
    b.lastProg = b.lastProg || [b.prog, W.t];
    if (b.prog > b.lastProg[0]) b.lastProg = [b.prog, W.t];
    else if (W.t - b.lastProg[1] > 50) { refund(P, BDEF[b.type].cost); destroyBuilding(b, -1); continue; }   // builders can't reach it: give up
    if (!ws.some(u => u.build === b.id)) { const w = ws.find(u => !u.build); if (w) orderBuild([w], b); }
  }
  // supply first, then the build order
  const sites = mine.filter(b => !b.done).length, cap = armyCap(P.i), used = armySize(P.i);
  // expand once every keep's own mine is running low
  A.expand = !mine.filter(b => b.type === 'keep').some(k => { const m = nearestMine(k.x + 2, k.y + 1, 14); return m && m.gold > 1800; });
  if (sites < 2) {
    if (used >= cap - 3 && cap < ARMY_CAP && !mine.some(b => b.type === 'cottage' && !b.done)) aiBuild(P, 'cottage', keep);
    else if (A.step < AI_ORDER.length) { const t = AI_ORDER[A.step]; if (BDEF[t].req && !mine.some(b => b.type === BDEF[t].req && b.done)) A.step++; else if (aiBuild(P, t, keep)) A.step++; }
    else if (P.gold > 500 && mine.filter(b => b.type === 'barracks').length < 3) aiBuild(P, 'barracks', keep);
    else if (P.gold > 400 && mine.filter(b => b.type === 'tower').length < 4) aiBuild(P, 'tower', keep);
    // expand to a new mine when the home mine runs low
    if (A.expand && P.gold >= BDEF.keep.cost.gold && mine.filter(b => b.type === 'keep').length < 4) {
      const tgt = W.blds.filter(b => b.type === 'mine' && !b.dead && !W.blds.some(k => k.type === 'keep' && !k.dead && distToRect(k.x, k.y, b) < 10)).sort((a, b) => distToRect(keep.x, keep.y, a) - distToRect(keep.x, keep.y, b))[0];
      if (tgt) { const s = aiFindSpot(P, 'keep', bCenter(tgt), 4, 8); if (s) { pay(P, BDEF.keep.cost); const nk = placeBuilding(P.i, 'keep', s[0], s[1], false); orderBuild(ws.slice(0, 3), nk); } }
    }
  }
  // heroes: barracks fill from the roster; the shrine summons Elites when rich
  const roster = rosterOf(P.fac), elites = rosterOf(P.fac, true);
  for (const b of mine) {
    if (!b.done || b.queue.length >= 2) continue;
    if (b.type === 'barracks') {
      const save = A.expand ? BDEF.keep.cost.gold : A.step < AI_ORDER.length ? BDEF[AI_ORDER[A.step]].cost.gold * 0.7 : 0;
      const opts = roster.filter(k => canAfford(P, trainCost(k)) && armySize(P.i) + H[k].slots <= cap && (P.gold - trainCost(k).gold >= save || army.length < 5));
      if (opts.length) startTraining(b, opts[Math.floor(rand() * opts.length)]);
    }
    if (b.type === 'shrine' && P.gold > 420 && P.mana >= 150) { const e = elites.filter(k => !W.units.some(u => u.side === P.i && u.k === k && !u.dead)); if (e.length) startTraining(b, e[Math.floor(rand() * e.length)]); }
  }
  // defend
  if (P.attackedAt && W.t - P.attackedAt.t < 5) {
    const near = army.filter(u => !u.target && dist(u.x, u.y, keep.x, keep.y) < 25);
    if (near.length) orderMove(near, P.attackedAt.x, P.attackedAt.y, true);
  }
  // attack waves
  if (!A.nextAttack) A.nextAttack = [600, 450, 330][W.diff];
  const power = army.reduce((a, u) => a + (H[u.k].slots / (H[u.k].group || 1)), 0);
  if (W.t > A.nextAttack && power >= 10 + A.wave * 3) {
    const foes = W.P.filter(o => o.alive && o.i !== P.i);
    const tk = W.blds.filter(b => b.type === 'keep' && !b.dead && foes.some(f => f.i === b.side)).sort((a, b) => distToRect(keep.x, keep.y, a) - distToRect(keep.x, keep.y, b))[0];
    if (tk) {
      const send = army.filter(u => !u.target).slice(0, Math.max(6, Math.floor(army.length * 0.85)));
      orderMove(send, tk.x + tk.w / 2, tk.y + tk.h / 2, true); send.forEach(u => { u.raid = tk.id; });
      A.wave++; A.nextAttack = W.t + [210, 160, 120][W.diff] + rand() * 60;
      if (tk.side === 0) alertP(0, `${SIDES[P.i].name} (${FAC[P.fac].n}) is marching on your Keep!`, 'bad', keep.x, keep.y);
    }
  }
  // raiders that lost their order keep pushing on the target keep
  for (const u of army) if (u.raid && !u.order && !u.target) { const tk = byId(u.raid); if (tk && !tk.dead) orderMove([u], tk.x + tk.w / 2, tk.y + tk.h / 2, true); else u.raid = null; }
}
