// ── world state ────────────────────────────────────────────────────────────
const W = { t: 0, units: [], blds: [], projs: [], fx: [], alerts: [], byId: new Map(), nextId: 1, P: [], over: null, speed: 1, diff: 1, chestT: 90, sqN: 0 };
const byId = id => W.byId.get(id);
function newPlayer(i, fac, ai) {
  return { i, fac, ai: ai ? { thinkT: 2 + i, step: 0, wave: 0, nextAttack: 0, mineT: 0 } : null, gold: 500, mana: 0, alive: true,
    stats: { kills: 0, lost: 0, gold: 0, trained: 0 }, attackedAt: null, incT: 0, manaT: 0 };
}
const sideOf = i => W.P[i];
// army slots in use. A squad holds only whole slots for its living members, rounded down.
function armySize(i, withQueue = true) {
  const gp = {}; let a = 0;
  for (const u of W.units) {
    if (u.side !== i || u.dead || u.k === 'worker' || u.summoned) continue;
    const g = H[u.k].group || 1;
    if (g <= 1) { a += H[u.k].slots; continue; }
    const key = u.sqd || ('k' + u.k); (gp[key] = gp[key] || { k: u.k, m: 0 }).m++;
  }
  for (const key in gp) { const { k, m } = gp[key], g = H[k].group; a += Math.floor(H[k].slots * Math.min(m, g) / g + 1e-9); }
  if (withQueue) for (const b of W.blds) if (b.side === i && !b.dead) for (const q of b.queue) if (q.k !== 'worker') a += H[q.k].slots;
  return a;
}
function armyCap(i) { let c = ARMY_BASE; for (const b of W.blds) if (b.side === i && b.done && !b.dead && BDEF[b.type].cap) c += BDEF[b.type].cap; return Math.min(ARMY_CAP, c); }
const workerCount = i => W.units.filter(u => u.side === i && !u.dead && u.k === 'worker').length + W.blds.filter(b => b.side === i && !b.dead).reduce((a, b) => a + b.queue.filter(q => q.k === 'worker').length, 0);
const MAX_WORKERS = 30;
const canAfford = (P, c) => (c.gold || 0) <= P.gold && (c.mana || 0) <= P.mana;
const pay = (P, c) => { P.gold -= c.gold || 0; P.mana -= c.mana || 0; };
const refund = (P, c) => { P.gold += c.gold || 0; P.mana += c.mana || 0; };
function alertP(i, text, kind, x, y) { if (i !== 0) return; if (W.alerts.some(a => a.text === text && a.t > 2)) return; W.alerts.push({ text, kind: kind || 'info', t: 5, x, y }); }

// ── buildings ──────────────────────────────────────────────────────────────
function placeBuilding(side, type, x, y, done) {
  const d = BDEF[type];
  const b = { kind: 'b', id: W.nextId++, type, side, x, y, w: d.w, h: d.h, hp: done ? d.hp : 1, maxHp: d.hp, done: !!done, prog: done ? 1 : 0, queue: [], rally: null, cd: 0 };
  W.blds.push(b); W.byId.set(b.id, b);
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) map.bld[ix(xx, yy)] = b.id;
  return b;
}
function destroyBuilding(b, killer) {
  if (b.dead) return; b.dead = true; b.hp = 0;
  for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (map.bld[ix(xx, yy)] === b.id) map.bld[ix(xx, yy)] = -1;
  if (b.side >= 0) for (const q of b.queue) refund(W.P[b.side], trainCost(q.k));
  b.queue = [];
  for (let k = 0; k < 26; k++) W.fx.push({ kind: 'p', x: b.x + rand() * b.w, y: b.y + rand() * b.h, vx: rr(-1.5, 1.5), vy: rr(-3, -0.5), t: rr(0.6, 1.3), col: rand() < 0.5 ? '#8c8a84' : '#5b4630' });
  W.fx.push({ kind: 'ruin', x: b.x, y: b.y, w: b.w, h: b.h, t: 40 });
  if (b.side >= 0) {
    if (killer >= 0 && W.P[killer]) W.P[killer].gold += Math.round(BDEF[b.type].cost.gold * 0.25);
    if (b.side === 0) alertP(0, `Your ${BDEF[b.type].n} was destroyed!`, 'bad');
    if (b.type === 'keep' && !W.blds.some(o => o.side === b.side && o.type === 'keep' && !o.dead)) defeat(b.side, killer);
  }
  if (b.type === 'mine') alertP(0, 'A gold mine has run dry.', 'info');
}
function defeat(i, killer) {
  const P = W.P[i]; if (!P.alive) return; P.alive = false;
  for (const u of W.units) if (u.side === i && !u.dead) { u.hp = 0; killUnit(u, killer, true); }
  for (const b of W.blds) if (b.side === i && !b.dead) destroyBuilding(b, -1);
  alertP(0, i === 0 ? 'Your last Keep has fallen.' : `${SIDES[i].name} (${FAC[P.fac].n}) has been destroyed!`, i === 0 ? 'bad' : 'good');
}
const bCenter = b => [b.x + b.w / 2, b.y + b.h / 2];
const distToRect = (x, y, b) => Math.hypot(clamp(x, b.x, b.x + b.w) - x, clamp(y, b.y, b.y + b.h) - y);
function startTraining(b, k) {
  const P = W.P[b.side], c = trainCost(k);
  if (!b.done || b.queue.length >= 5) return 'Queue is full.';
  if (k === 'worker') { if (workerCount(b.side) >= MAX_WORKERS) return `You already have ${MAX_WORKERS} workers.`; }
  else {
    if (armySize(b.side) + H[k].slots > armyCap(b.side)) return 'Not enough army slots. Build Cottages or a Hero Shrine.';
    if (H[k].elite && (W.units.some(u => u.side === b.side && !u.dead && u.k === k) || W.blds.some(o => o.side === b.side && o.queue.some(q => q.k === k)))) return `You already have ${H[k].n}.`;
  }
  if (!canAfford(P, c)) return c.mana && P.mana < c.mana ? 'Not enough mana. Build a Mana Well.' : 'Not enough gold.';
  pay(P, c); b.queue.push({ k, t: trainTime(k), total: trainTime(k) });
  return null;
}
function cancelTraining(b, i) { const q = b.queue[i]; if (!q) return; b.queue.splice(i, 1); refund(W.P[b.side], trainCost(q.k)); }
function spawnAround(b, k) {
  const n = k === 'worker' ? 1 : H[k].group || 1, out = [], fly = k !== 'worker' && H[k].fly;
  const sid = n > 1 ? 's' + b.side + '.' + (++W.sqN) : null;
  const cand = [];
  for (let r = 1; r < 6 && cand.length < n * 3; r++) for (let yy = b.y - r; yy < b.y + b.h + r; yy++) for (let xx = b.x - r; xx < b.x + b.w + r; xx++) {
    if (Math.max(b.x - 1 - xx + 1 - r + 1, 0) && 0) continue;
    const onRing = xx === b.x - r || xx === b.x + b.w + r - 1 || yy === b.y - r || yy === b.y + b.h + r - 1;
    if (onRing && (fly ? flyable(xx, yy) : walkable(xx, yy))) cand.push([xx, yy]);
  }
  const tgt = b.rally || [b.x + b.w / 2, b.y + b.h + 2];
  cand.sort((p, q) => dist(p[0], p[1], tgt[0], tgt[1]) - dist(q[0], q[1], tgt[0], tgt[1]));
  for (let i = 0; i < n; i++) {
    const [x, y] = cand[i] || nearestFree(b.x + b.w / 2, b.y + b.h + 1, fly);
    const u = spawnUnit(b.side, k, x + 0.5, y + 0.5); if (sid) u.sqd = sid; out.push(u);
  }
  if (b.rally) for (const u of out) { if (u.k === 'worker' && b.rally.mine) orderGather(u, byId(b.rally.mine)); else orderMove([u], b.rally[0], b.rally[1], true); }
  return out;
}
function updateBuilding(b) {
  const P = b.side >= 0 ? W.P[b.side] : null, d = BDEF[b.type];
  if (!b.done || !P) return;
  if (d.income) { P.incT = (P.incT || 0); }
  const q = b.queue[0];
  if (q) {
    if (q.k !== 'worker' || workerCount(b.side) <= MAX_WORKERS) { q.t -= DT * (W.P[b.side].ai ? [0.8, 1, 1.2][W.diff] : 1); }
    if (q.t <= 0) { b.queue.shift(); spawnAround(b, q.k); P.stats.trained++; if (b.side === 0) alertP(0, `${q.k === 'worker' ? WORKER_NAME[P.fac] : H[q.k].n} ready.`, 'good'); }
  }
  if (d.atk) {
    b.cd -= DT; if (b.cd > 0) return;
    const [cx, cy] = bCenter(b); let best = null, bd = d.range + 1;
    for (const u of W.units) { if (u.dead || u.side === b.side || u.dying) continue; const dd = dist(u.x, u.y, cx, cy) - Math.max(b.w, b.h) / 2; if (dd < bd && dd <= d.range) { bd = dd; best = u; } }
    if (best) { b.cd = d.cd; W.projs.push({ x: cx, y: cy - 1.2, tx: best.x, ty: best.y - 0.4, target: best.id, side: b.side, dmg: d.atk, speed: 14, kind: 'arrow', src: b.id }); }
  }
}
function economyTick(P) {
  let inc = 0, mana = 0;
  for (const b of W.blds) if (b.side === P.i && b.done && !b.dead) { inc += BDEF[b.type].income || 0; mana += BDEF[b.type].mana || 0; }
  P.gold += inc * DT; P.mana = Math.min(999, P.mana + mana * DT); P.stats.gold += inc * DT;
}

// ── units ──────────────────────────────────────────────────────────────────
function spawnUnit(side, k, x, y) {
  const s = statsOf(k, side), u = { kind: 'u', id: W.nextId++, k, side, x, y, hp: s.hp, maxHp: s.hp, s, cd: 0, path: null, goalKey: '', order: null, target: null, carry: 0, xp: 0, star: 0, dir: 1, anim: 'spawn', animT: 0, stuck: 0, burnT: 0, stunT: 0, moved: 0, guard: [x, y] };
  W.units.push(u); W.byId.set(u.id, u);
  return u;
}
function killUnit(u, killer, silent) {
  if (u.dead || u.dying) return;
  const P = W.P[u.side];
  // Undead: Undying, rise once
  if (!silent && P.fac === 'undead' && u.k !== 'worker' && !u.risen && !u.summoned) { u.risen = true; u.hp = 1; u.dying = 0; u.riseT = 1.2; u.anim = 'hurt'; u.animT = 0; u.hp = Math.round(u.maxHp * 0.25); W.fx.push({ kind: 'txt', x: u.x, y: u.y - 1.4, text: 'Undying!', col: '#9be38c', t: 1.2 }); return; }
  u.dying = 1.1; u.anim = 'death'; u.animT = 0; u.order = null; u.target = null; u.path = null;
  P.stats.lost++;
  if (killer >= 0 && W.P[killer]) W.P[killer].stats.kills++;
}
function giveXP(u, n) {
  if (!u || u.dead || u.k === 'worker') return;
  u.xp += n; const st = u.xp >= 5 ? 2 : u.xp >= 2 ? 1 : 0;
  if (st > u.star) { const add = (st - u.star) * 2 * HPX; u.maxHp += add; u.hp += add; u.star = st; W.fx.push({ kind: 'txt', x: u.x, y: u.y - 1.5, text: '★'.repeat(st), col: '#f3d27a', t: 1.4 }); }
}
const unitDmg = u => (u.s.dmg + u.star * DMX) * (0.6 + 0.4 * u.hp / u.maxHp);   // wounded heroes hit softer, as in Hollow Vale
const radiusOf = u => u.k !== 'worker' && H[u.k].elite ? 0.65 : 0.38;
function hurt(t, dmg, srcSide, src, isUnitHit) {
  if (t.dead || t.dying) return 0;
  if (t.kind === 'u') {
    let d = dmg;
    // Kingdom: Formation, 1 less damage next to another Kingdom unit
    if (W.P[t.side].fac === 'kingdom' && W.units.some(o => o !== t && !o.dead && !o.dying && o.side === t.side && Math.abs(o.x - t.x) < 1.5 && Math.abs(o.y - t.y) < 1.5)) d -= DMX;
    d = Math.max(DMX * 0.6, d - t.s.armor);
    if (t.mist) d *= 0.6;
    t.hp -= d; t.hitT = 0.15;
    if (t.anim === 'idle' || t.anim === 'walk') { t.anim = 'hurt'; t.animT = 0; }
    if (srcSide >= 0 && W.P[t.side]) { W.P[t.side].attackedAt = { x: t.x, y: t.y, t: W.t }; if (t.side === 0 && (!W.lastHit || W.t - W.lastHit > 12)) { W.lastHit = W.t; alertP(0, 'Your units are under attack!', 'bad', t.x, t.y); } }
    if (!t.target && !t.order && src && src.kind === 'u' && t.k !== 'worker') t.target = src.id;
    if (t.hp <= 0) { killUnit(t, srcSide); if (src && src.kind === 'u' && t.dying) giveXP(src, t.k === 'worker' ? 0.5 : (H[t.k].group ? 1 / 3 : H[t.k].elite ? 2 : 1)); }
    return d;
  }
  // buildings
  let d = dmg; t.hp -= d; t.hitT = 0.15;
  if (srcSide >= 0 && t.side >= 0) { W.P[t.side].attackedAt = { x: t.x + t.w / 2, y: t.y + t.h / 2, t: W.t }; if (t.side === 0 && (!W.lastBHit || W.t - W.lastBHit > 12)) { W.lastBHit = W.t; alertP(0, `Your ${BDEF[t.type].n} is under attack!`, 'bad', t.x, t.y); } }
  if (t.hp <= 0) destroyBuilding(t, srcSide);
  return d;
}
// a hit from a unit: all keywords and faction powers apply here
function strike(u, t) {
  const P = W.P[u.side], h = u.k === 'worker' ? null : H[u.k];
  let d = unitDmg(u);
  if (u.chargeReady && u.s.charge) { d *= 1.5; u.chargeReady = false; W.fx.push({ kind: 'txt', x: t.x || u.x, y: (t.y || u.y) - 1.2, text: 'Charge!', col: '#ffd27a', t: 0.9 }); }
  if (t.kind === 'b') { d += u.s.siege * DMX + (P.fac === 'iron' ? DMX : 0); if (u.k === 'worker') d *= 0.5; }
  const dealt = hurt(t, d, u.side, u, true);
  if (t.kind === 'u' && dealt > 0) {
    // Vampires: Bloodthirst
    if (P.fac === 'vamp') u.hp = Math.min(u.maxHp, u.hp + Math.min(dealt, 2 * DMX));
    if (u.s.drain) u.hp = Math.min(u.maxHp, u.hp + Math.min(dealt, u.s.drain * DMX));
    // Infernal: Burn
    if (P.fac === 'infernal' && W.P[t.side].fac !== 'infernal') { t.burnT = 3; t.burnBy = u.side; }
    if (u.s.stun && (!u.stunCd || W.t > u.stunCd)) { t.stunT = 1.6; u.stunCd = W.t + 6; W.fx.push({ kind: 'txt', x: t.x, y: t.y - 1.3, text: 'Stunned', col: '#ffe066', t: 1 }); }
  }
  if (u.s.splash || u.s.pierce) {
    const [cx, cy] = t.kind === 'b' ? bCenter(t) : [t.x, t.y];
    for (const o of W.units) if (o !== t && !o.dead && !o.dying && o.side !== u.side && dist(o.x, o.y, cx, cy) < 1.4) hurt(o, d * 0.5, u.side, u);
    W.fx.push({ kind: 'ring', x: cx, y: cy, t: 0.4, col: '#ffb060' });
  }
}
function healPulse(u) {
  if (!u.s.heal || (u.healCd || 0) > W.t) return false;
  let best = null, bd = 1e9;
  for (const o of W.units) { if (o.dead || o.dying || o.side !== u.side || o.hp >= o.maxHp || o === u) continue; const d = dist(o.x, o.y, u.x, u.y); if (d < Math.max(4, u.s.range + 1) && o.hp / o.maxHp < bd) { bd = o.hp / o.maxHp; best = o; } }
  if (!best || bd > 0.9) return false;
  best.hp = Math.min(best.maxHp, best.hp + u.s.heal * HPX * 0.6); u.healCd = W.t + 3; u.anim = 'cast'; u.animT = 0;
  W.fx.push({ kind: 'heal', x: best.x, y: best.y, t: 0.8 }); return true;
}

// ── orders and movement ───────────────────────────────────────────────────
function goTo(u, key, goal, hx, hy) {
  if (u.s.fly) {      // fliers glide straight over anything
    if (goal(Math.floor(u.x), Math.floor(u.y))) return true;
    moveToward(u, hx, hy); return false;
  }
  if (u.goalKey !== key || !u.path) {
    if (pathBudget <= 0) return false;
    pathBudget--; u.goalKey = key; u.path = findPath(u.x, u.y, goal, hx, hy); u.pi = 0;
  }
  if (goal(Math.floor(u.x), Math.floor(u.y)) && (!u.path.length || u.pi >= u.path.length)) return true;
  if (u.pi >= u.path.length) { if (goal(Math.floor(u.x), Math.floor(u.y))) return true; u.stuck++; u.path = null; return false; }
  const [px, py] = u.path[u.pi];
  if (moveToward(u, px, py)) u.pi++;
  return false;
}
function moveToward(u, x, y) {
  const dx = x - u.x, dy = y - u.y, d = Math.hypot(dx, dy);
  const slow = !u.s.fly && map.ter[ix(clamp(Math.floor(u.x), 0, MW - 1), clamp(Math.floor(u.y), 0, MH - 1))] === 3 ? 0.55 : 1;
  const s = u.s.speed * slow * DT;
  if (Math.abs(dx) > 0.05) u.dir = dx > 0 ? 1 : -1;
  u.moving = true; u.moved += s;
  if (d <= s) { u.x = x; u.y = y; return true; }
  u.x += dx / d * s; u.y += dy / d * s; return false;
}
function orderMove(us, x, y, attackMove) {
  const n = us.length, cols = Math.ceil(Math.sqrt(n)), sp = 0.95;
  us.sort((a, b) => (a.s.range > 2 ? 1 : 0) - (b.s.range > 2 ? 1 : 0));
  us.forEach((u, i) => {
    const r = Math.floor(i / cols), c = i % cols;
    const tx = x + (c - (cols - 1) / 2) * sp, ty = y + (r - (Math.ceil(n / cols) - 1) / 2) * sp;
    u.order = { type: attackMove ? 'amove' : 'move', x: tx, y: ty }; u.target = null; u.path = null; u.goalKey = ''; u.stuck = 0; u.hold = false; u.gather = null; u.build = null;
    u.chargeReady = true;
  });
}
function orderAttack(us, t) { for (const u of us) { u.order = { type: 'attack', id: t.id }; u.target = t.id; u.path = null; u.goalKey = ''; u.stuck = 0; u.hold = false; u.gather = null; u.build = null; u.chargeReady = true; } }
function orderGather(u, mine) { if (!mine || u.k !== 'worker') return; u.order = null; u.target = null; u.gather = { mine: mine.id }; u.build = null; u.path = null; u.goalKey = ''; }
function orderBuild(us, b) { for (const u of us) { if (u.k !== 'worker') continue; u.order = null; u.target = null; u.gather = null; u.build = b.id; u.path = null; u.goalKey = ''; } }
const nearRect = (b, r = 1.2) => (x, y) => walkable(x, y) && distToRect(x + 0.5, y + 0.5, b) <= r;
function nearestDrop(u) {
  let best = null, bd = 1e9;
  for (const b of W.blds) if (!b.dead && b.done && b.side === u.side && BDEF[b.type].drop) { const d = distToRect(u.x, u.y, b); if (d < bd) { bd = d; best = b; } }
  return best;
}
function nearestMine(x, y, maxD = 40) {
  let best = null, bd = maxD;
  for (const b of W.blds) if (!b.dead && b.type === 'mine') { const d = distToRect(x, y, b); if (d < bd) { bd = d; best = b; } }
  return best;
}
function updateWorker(u) {
  const P = W.P[u.side];
  if (u.build) {
    const b = byId(u.build);
    if (!b || b.dead || b.done) { u.build = null; const m = nearestMine(u.x, u.y, 25); if (m && u.autoMine !== false) orderGather(u, m); return; }
    if (goTo(u, 'b' + b.id, nearRect(b), b.x + b.w / 2, b.y + b.h / 2)) {
      u.anim = 'attack'; u.dir = b.x + b.w / 2 > u.x ? 1 : -1;
      const d = BDEF[b.type]; b.prog += DT / d.build; b.hp = Math.min(b.maxHp, b.hp + d.hp * DT / d.build);
      if (b.prog >= 1) { b.done = true; b.hp = Math.max(b.hp, b.maxHp * 0.95); b.prog = 1; if (b.side === 0) alertP(0, `${d.n} finished.`, 'good'); }
    } else if (u.stuck > 8) { u.stuck = 0; u.path = null; }
    return;
  }
  if (u.gather) {
    const m = byId(u.gather.mine);
    if (u.carry >= 10 || (u.carry > 0 && (!m || m.dead))) {
      const drop = nearestDrop(u); if (!drop) { u.gather = null; return; }
      if (goTo(u, 'd' + drop.id, nearRect(drop), drop.x + drop.w / 2, drop.y + drop.h / 2)) { P.gold += u.carry; P.stats.gold += u.carry; u.carry = 0; u.path = null; if (!m || m.dead) { const nm = nearestMine(u.x, u.y, 80); if (nm) u.gather.mine = nm.id; else u.gather = null; } }
      return;
    }
    if (!m || m.dead) { const nm = nearestMine(u.x, u.y, 80); if (nm) u.gather.mine = nm.id; else u.gather = null; return; }
    if (goTo(u, 'm' + m.id, nearRect(m), m.x + m.w / 2, m.y + m.h / 2)) {
      u.anim = 'attack'; u.dir = m.x + m.w / 2 > u.x ? 1 : -1;
      u.mineT = (u.mineT || 0) + DT * (P.ai ? [0.75, 1, 1.25][W.diff] : 1);
      if (u.mineT >= 2.2) { u.mineT = 0; const n = Math.min(10, m.gold); m.gold -= n; u.carry = n; u.path = null; if (m.gold <= 0) destroyBuilding(m, -1); }
    } else if (u.stuck > 8) { u.stuck = 0; u.path = null; }
    return;
  }
  updateFighter(u);
}
function enemyNear(u, r) {
  let best = null, bd = r;
  for (const e of W.units) {
    if (e.dead || e.dying || e.side === u.side) continue;
    const d = dist(e.x, e.y, u.x, u.y) - (e.k === 'worker' ? 0.6 : 0);   // soldiers first
    if (d < bd && (!u.s.minRange || d >= u.s.minRange - 0.3 || d < 0.9)) { bd = d; best = e; }
  }
  if (best) return best;
  for (const b of W.blds) { if (b.dead || b.side === u.side || b.side < 0) continue; const d = distToRect(u.x, u.y, b); if (d < bd - 1) { bd = d + 1; best = b; } }
  return best;
}
function inRange(u, t) {
  const d = t.kind === 'b' ? distToRect(u.x, u.y, t) : dist(u.x, u.y, t.x, t.y) - radiusOf(t);
  return d <= u.s.range && (!u.s.minRange || t.kind === 'b' || d >= u.s.minRange - 0.2);
}
function chase(u, t) {
  const R = u.s.range - 0.15;
  if (t.kind === 'b') return goTo(u, 'cb' + t.id, (x, y) => (walkable(x, y) || u.s.fly) && distToRect(x + 0.5, y + 0.5, t) <= R, t.x + t.w / 2, t.y + t.h / 2);
  const key = 'cu' + t.id + ':' + Math.floor(t.x) + ',' + Math.floor(t.y);
  if (dist(u.x, u.y, t.x, t.y) < 2.5 && !u.s.fly) { moveToward(u, t.x, t.y); return false; }
  return goTo(u, key, (x, y) => (walkable(x, y) || u.s.fly) && Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y) <= Math.max(1, R), t.x, t.y);
}
function updateFighter(u) {
  const o = u.order;
  if (u.s.heal && healPulse(u)) return;
  let t = u.target ? byId(u.target) : null;
  if (t && (t.dead || t.dying || (t.kind === 'u' && t.side === u.side))) { t = null; u.target = null; if (o && o.type === 'attack') u.order = null; }
  if (!t && (!o || o.type === 'amove') && u.k !== 'worker') {
    const e = enemyNear(u, u.hold ? u.s.range + 0.3 : u.s.sight);
    if (e) { u.target = e.id; t = e; }
  }
  if (t) {
    if (u.hold && !inRange(u, t)) { u.target = null; return; }
    // leash: idle units don't chase forever
    if (!o && dist(u.x, u.y, u.guard[0], u.guard[1]) > 14 && u.k !== 'worker') { u.target = null; u.order = { type: 'move', x: u.guard[0], y: u.guard[1] }; return; }
    if (inRange(u, t)) {
      u.path = null; u.goalKey = '';
      const [tx] = t.kind === 'b' ? bCenter(t) : [t.x]; u.dir = tx > u.x ? 1 : -1;
      if (u.cd <= 0) {
        u.cd = u.s.cd * (W.P[u.side].fac === 'arcane' && u.k !== 'worker' && needsMana(H[u.k]) ? 0.85 : 1);
        u.anim = u.k === 'worker' ? 'attack' : (u.attackClip || 'attack'); u.animT = 0;
        if (u.s.range > 2) {
          const [ax, ay] = t.kind === 'b' ? bCenter(t) : [t.x, t.y];
          W.projs.push({ x: u.x, y: u.y - 0.6, tx: ax, ty: ay - 0.4, target: t.id, side: u.side, src: u.id, speed: 12, kind: needsMana(H[u.k]) ? 'bolt' : u.s.splash ? 'rock' : 'arrow', col: FAC[W.P[u.side].fac] ? FAC[W.P[u.side].fac].c : '#fff' });
        } else u.pendingHit = { id: t.id, t: 0.25 };
      }
      return;
    }
    chase(u, t);
    if (u.stuck > 10) { u.stuck = 0; u.target = null; u.path = null; }
    return;
  }
  if (o && (o.type === 'move' || o.type === 'amove')) {
    if (goTo(u, 'o' + o.x.toFixed(1) + ',' + o.y.toFixed(1), (x, y) => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < 0.9 || (u.stuck > 3 && Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < 2.5), o.x, o.y)
        || (u.path && u.path.partial && u.pi >= u.path.length) || u.stuck > 6) {
      u.order = null; u.guard = [u.x, u.y]; u.stuck = 0; u.path = null;
    }
  }
}
function updateUnit(u) {
  u.moving = false;
  if (u.dying) { u.dying -= DT; u.animT += DT; if (u.dying <= 0) { u.dead = true; W.byId.delete(u.id); } return; }
  if (u.riseT > 0) { u.riseT -= DT; return; }
  u.cd -= DT; u.animT += DT; if (u.hitT) u.hitT -= DT;
  if (u.burnT > 0) { const bt = u.burnT; u.burnT -= DT; if (Math.floor(bt) !== Math.floor(u.burnT)) { hurt(u, DMX * 0.5, u.burnBy, null); W.fx.push({ kind: 'txt', x: u.x, y: u.y - 1.2, text: '🔥', col: '#f80', t: 0.6 }); } }
  // Wilds: Regrowth
  if (W.P[u.side].fac === 'wilds' && u.k !== 'worker' && u.hp < u.maxHp && (u.regT = (u.regT || 0) + DT) > 4) { u.regT = 0; u.hp = Math.min(u.maxHp, u.hp + 2 * DMX); }
  if (u.stunT > 0) { u.stunT -= DT; return; }
  if (u.pendingHit) { u.pendingHit.t -= DT; if (u.pendingHit.t <= 0) { const t = byId(u.pendingHit.id); u.pendingHit = null; if (t && !t.dead && !t.dying && inRange(u, t)) strike(u, t); } }
  if (u.k === 'worker') updateWorker(u); else updateFighter(u);
  if (!u.moving && u.anim === 'walk') { u.anim = 'idle'; u.animT = 0; }
  if (u.moving && (u.anim === 'idle' || (u.anim !== 'walk' && u.animT > 0.8))) { u.anim = 'walk'; }
  if (!u.moving && u.anim !== 'idle' && u.animT > 1) { u.anim = 'idle'; u.animT = 0; }
  if (!u.moving) u.chargeReady = u.chargeReady || u.moved > 3;
  if (u.moving && u.moved > 3) u.chargeReady = true;
}
// gentle pushing apart so armies don't stack on one tile
function separate() {
  const grid = new Map();
  for (const u of W.units) { if (u.dead || u.dying) continue; const k = (u.x | 0) + (u.y | 0) * 1000; (grid.get(k) || grid.set(k, []).get(k)).push(u); }
  for (const u of W.units) {
    if (u.dead || u.dying || (u.k === 'worker' && u.anim === 'attack')) continue;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      const l = grid.get(((u.x | 0) + dx) + ((u.y | 0) + dy) * 1000); if (!l) continue;
      for (const o of l) {
        if (o === u || o.id < u.id || !!o.s.fly !== !!u.s.fly) continue;
        const rx = u.x - o.x, ry = u.y - o.y, d = Math.hypot(rx, ry), m = radiusOf(u) + radiusOf(o) - 0.12;
        if (d >= m || d < 1e-4) continue;
        const push = (m - d) * 0.25, nx = rx / d, ny = ry / d;
        const mv = (w, sx, sy) => { const x2 = w.x + sx, y2 = w.y + sy; if (w.s.fly || walkable(Math.floor(x2), Math.floor(y2))) { w.x = x2; w.y = y2; } };
        mv(u, nx * push, ny * push); mv(o, -nx * push, -ny * push);
      }
    }
  }
}
function updateProjs() {
  for (const p of W.projs) {
    const t = byId(p.target); if (t && !t.dead) { const [ax, ay] = t.kind === 'b' ? bCenter(t) : [t.x, t.y - 0.4]; p.tx = ax; p.ty = ay; }
    const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), s = p.speed * DT;
    if (d <= s) {
      p.done = true;
      if (t && !t.dead && !t.dying) { const src = byId(p.src); if (src && src.kind === 'u') strike(src, t); else hurt(t, p.dmg, p.side, null); }
    } else { p.x += dx / d * s; p.y += dy / d * s; }
  }
  W.projs = W.projs.filter(p => !p.done);
}
function updateFx() {
  for (const f of W.fx) { f.t -= DT; if (f.kind === 'p') { f.x += f.vx * DT; f.y += f.vy * DT; f.vy += 6 * DT; } if (f.kind === 'txt') f.y -= 0.6 * DT; }
  W.fx = W.fx.filter(f => f.t > 0);
  for (const a of W.alerts) a.t -= DT; W.alerts = W.alerts.filter(a => a.t > 0).slice(-5);
}
// treasure chests drop in the middle of the Vale, as in Hollow Vale
function chestTick() {
  if ((W.chestT -= DT) <= 0) {
    W.chestT = 100; if (W.chests.length < 2) { const [x, y] = nearestFree(MW / 2 + rr(-6, 6), MH / 2 + rr(-6, 6)); W.chests.push({ x: x + 0.5, y: y + 0.5 }); alertP(0, 'A treasure chest appeared in the middle of the Vale.', 'info'); }
  }
  for (const c of W.chests) {
    const u = W.units.find(v => !v.dead && !v.dying && dist(v.x, v.y, c.x, c.y) < 0.9);
    if (u) { c.taken = true; W.P[u.side].gold += 150; W.fx.push({ kind: 'txt', x: c.x, y: c.y - 1, text: '+150 gold', col: '#f3d27a', t: 1.5 }); if (u.side === 0) alertP(0, 'Treasure! +150 gold.', 'good'); }
  }
  W.chests = W.chests.filter(c => !c.taken);
}

// ── fog of war (player 0) ─────────────────────────────────────────────────
const FOG = { vis: new Uint8Array(MW * MH), seen: new Uint8Array(MW * MH), t: 0,
  stamp(x, y, r) { const r2 = r * r; for (let dy = -Math.ceil(r); dy <= r; dy++) for (let dx = -Math.ceil(r); dx <= r; dx++) { if (dx * dx + dy * dy > r2) continue; const X = Math.floor(x) + dx, Y = Math.floor(y) + dy; if (inMap(X, Y)) { this.vis[ix(X, Y)] = 1; this.seen[ix(X, Y)] = 1; } } },
  update() { this.vis.fill(0); if (W.reveal) { this.vis.fill(1); this.seen.fill(1); return; } for (const u of W.units) if (u.side === 0 && !u.dead) this.stamp(u.x, u.y, u.s.sight); for (const b of W.blds) if (b.side === 0 && !b.dead) this.stamp(b.x + b.w / 2, b.y + b.h / 2, BDEF[b.type].sight + Math.max(b.w, b.h) / 2); },
  see(x, y) { return this.vis[ix(clamp(Math.floor(x), 0, MW - 1), clamp(Math.floor(y), 0, MH - 1))] === 1; } };

// ── match setup and the tick ──────────────────────────────────────────────
function startMatch(myFac, nRivals, diff, seed) {
  Object.assign(W, { t: 0, units: [], blds: [], projs: [], fx: [], alerts: [], byId: new Map(), nextId: 1, P: [], over: null, diff, chestT: 90, chests: [], sqN: 0, reveal: false });
  generateMap(seed, nRivals + 1);
  const facs = Object.keys(FAC), pool = facs.filter(f => f !== myFac).sort(() => rand() - 0.5);
  W.P.push(newPlayer(0, myFac, false));
  for (let i = 1; i <= nRivals; i++) W.P.push(newPlayer(i, pool[(i - 1) % pool.length], true));
  for (const P of W.P) {
    const [sx, sy] = map.starts[P.i];
    const keep = placeBuilding(P.i, 'keep', sx - 2, sy - 1, true);
    // home mine toward the map centre, a little to the side
    const ang = Math.atan2(MH / 2 - sy, MW / 2 - sx) + (P.i % 2 ? 0.6 : -0.6);
    let mx = Math.round(sx + Math.cos(ang) * 7) - 1, my = Math.round(sy + Math.sin(ang) * 7) - 1;
    for (let yy = my - 1; yy < my + 4; yy++) for (let xx = mx - 1; xx < mx + 4; xx++) if (inMap(xx, yy)) map.ter[ix(xx, yy)] = 0;
    const m = placeBuilding(-1, 'mine', mx, my, true); m.gold = 5000;
    for (let k = 0; k < 5; k++) { const [x, y] = nearestFree(sx + (k - 2) * 0.9, sy + 3); const u = spawnUnit(P.i, 'worker', x + 0.5, y + 0.5); orderGather(u, m); }
    const hero = rosterOf(P.fac).find(k => !H[k].group && H[k].rng[1] < 2 && H[k].slots === 2) || rosterOf(P.fac)[0];
    const [hx, hy] = nearestFree(sx + 3, sy - 2); spawnUnit(P.i, hero, hx + 0.5, hy + 0.5);
  }
  // contested mines: a rich one in the middle and one between each pair of neighbours
  const extra = [[MW / 2 - 1, MH / 2 - 1, 8000], [MW / 2 - 1, 8, 4000], [MW / 2 - 1, MH - 11, 4000], [8, MH / 2 - 1, 4000], [MW - 11, MH / 2 - 1, 4000]];
  for (const [x, y, g] of extra) { const X = Math.round(x), Y = Math.round(y); for (let yy = Y - 1; yy < Y + 4; yy++) for (let xx = X - 1; xx < X + 4; xx++) if (inMap(xx, yy)) map.ter[ix(xx, yy)] = 0; const m = placeBuilding(-1, 'mine', X, Y, true); m.gold = g; }
  FOG.seen.fill(0); FOG.update();
}
function tick() {
  if (W.over) return;
  W.t += DT; pathBudget = 30;
  for (const P of W.P) if (P.alive) { economyTick(P); if (P.ai) aiTick(P); }
  for (const b of W.blds) if (!b.dead) updateBuilding(b);
  for (const u of W.units) if (!u.dead) updateUnit(u);
  separate(); updateProjs(); updateFx(); chestTick();
  W.units = W.units.filter(u => !u.dead); W.blds = W.blds.filter(b => !b.dead || false);
  if ((FOG.t -= DT) <= 0) { FOG.t = 0.25; FOG.update(); }
  if (!W.P[0].alive) W.over = 'lose';
  else if (W.P.slice(1).every(P => !P.alive)) W.over = 'win';
}
