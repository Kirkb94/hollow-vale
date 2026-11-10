// 02 simulation: factions, buildings, villager jobs, economy, soldiers, combat.
const W = { t: 0, units: [], blds: [], projs: [], fx: [], F: [], nextId: 1, byId: new Map(), over: null, alerts: [], diff: 1, speed: 1 };

function newFaction(i, ai) {
  return { i, ai, pf: {}, carters: 0, res: { food: 220, wood: 200, stone: 100, gold: 50, firewood: 40, planks: 0, ore: 0, iron: 0, flour: 0, bread: 0, meat: 0, ale: 0 }, cap: Object.fromEntries(ALLRES.map(r => [r, 0])), pop: 0, happy: 60, grief: 0, popCap: 0, alive: true,
    ups: new Set(), growT: 0, growth: true, hungry: false, eatT: 0, assignT: rand(), stealT: 0, stats: { trained: 0, lost: 0, kills: 0, gathered: 0 }, mult: 1, full: {} };
}
const byId = id => W.byId.get(id);
const isSoldier = u => u.kind === 'unit' && !!UDEF[u.type].mil;
const alert = (fac, text, x, y, kind = 'info') => { if (fac !== 0) return; W.alerts.push({ text, t: 8, kind }); if (W.alerts.length > 6) W.alerts.shift(); if (x !== undefined) W.pings.push({ x, y, t: 3 }); };
W.pings = [];
const canAfford = (F, cost) => Object.entries(cost).every(([r, n]) => F.res[r] >= n);
const pay = (F, cost) => { for (const [r, n] of Object.entries(cost)) F.res[r] -= n; };
const refund = (F, cost, k = 1) => { for (const [r, n] of Object.entries(cost)) F.res[r] = Math.min(F.res[r] + Math.floor(n * k), Math.max(F.cap[r], F.res[r])); };
const hasDone = (fac, type) => W.blds.some(b => !b.dead && b.fac === fac && b.type === type && b.done);

// ── buildings ──────────────────────────────────────────────────────────────
function canPlace(fac, type, x, y) {
  const d = BDEF[type];
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) {
    if (!inMap(xx, yy) || xx < 1 || yy < 1 || xx > MW - 2 || yy > MH - 2) return false;
    const k = ix(xx, yy);
    const tk = map.ter[k];
    if (tk === 1 || tk === 5 || (tk === 4 && type === 'farm') || map.node[k] >= 0 || map.bld[k] >= 0) return false;
    if (fac === 0 && !FOG.explored[k]) return false;
  }
  if (d.coastal && !coastOk(type, x, y)) return false;
  // farm fields are walkable, so check them separately (no stacking buildings on wheat)
  for (const f of W.blds) if (!f.dead && f.type === 'farm' && x < f.x + f.w && x + d.w > f.x && y < f.y + f.h && y + d.h > f.y) return false;
  return true;
}
function placeBuilding(fac, type, x, y, done = false) {
  const d = BDEF[type];
  const mhp = Math.round(d.hp * ((d.wall || type === 'tower') && hasDoc(W.F[fac], 'siegecraft') ? 1.4 : 1));
  const b = { kind: 'bld', id: W.nextId++, type, fac, x, y, w: d.w, h: d.h, hp: done ? mhp : mhp * 0.1, maxHp: mhp, done, progress: done ? 1 : 0,
    slots: d.slots || 0, queue: [], ore: 'stone', atkCd: 0, rally: null, born: W.t, dead: false };
  b.buf = {};
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) if (inMap(xx, yy)) map.road[ix(xx, yy)] = 0;
  W.blds.push(b); W.byId.set(b.id, b);
  if (!d.walk) for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) map.bld[ix(xx, yy)] = b.id;
  // shove anyone standing in the footprint
  if (!d.walk) for (const u of W.units) if (!u.dead && u.x >= x && u.x < x + d.w && u.y >= y && u.y < y + d.h) { const t = nearestWalkable(u.x, u.y); u.x = t[0] + 0.5; u.y = t[1] + 0.5; u.path = null; }
  if (done) recomputeCaps(W.F[fac]);
  return b;
}
function nearestWalkable(x, y) {
  const x0 = Math.floor(x), y0 = Math.floor(y);
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (walkable(x0 + dx, y0 + dy)) return [x0 + dx, y0 + dy];
  }
  return [x0, y0];
}
function completeBuilding(b) {
  b.done = true; b.progress = 1; b.hp = Math.max(b.hp, b.maxHp * 0.999); b.hp = b.maxHp;
  const F = W.F[b.fac]; recomputeCaps(F);
  alert(b.fac, `${BDEF[b.type].name} finished.`);
  burstFx(b.x + b.w / 2, b.y + b.h / 2, '#e8d9a8', 16);
}
function recomputeCaps(F) {
  const cap = Object.fromEntries(ALLRES.map(r => [r, 0])); let pop = 0;
  for (const b of W.blds) if (!b.dead && b.done && b.fac === F.i) {
    const d = BDEF[b.type];
    if (d.store) for (const [r, n] of Object.entries(d.store)) cap[r] += n;
    if (d.pop) pop += d.pop;
  }
  F.cap = cap; F.popCap = Math.min(150, pop);
  for (const r of ALLRES) if (F.res[r] > cap[r]) F.res[r] = cap[r];
}
function destroyBuilding(b, killerFac, quiet) {
  if (b.dead) return;
  b.dead = true; W.byId.delete(b.id);
  if (!BDEF[b.type].walk) for (let yy = b.y; yy < b.y + b.h; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (map.bld[ix(xx, yy)] === b.id) { map.bld[ix(xx, yy)] = -1; map.breach[ix(xx, yy)] = 0; }
  for (const u of W.units) { if (u.job && u.job.b === b.id) unassign(u); if (u.home === b.id) u.home = null; if (u.inside === b.id) { u.inside = null; const t = nearestWalkable(b.x + b.w / 2, b.y + b.h); u.x = t[0] + 0.5; u.y = t[1] + 0.5; } }
  W.fx.push({ kind: 'rubble', x: b.x, y: b.y, w: b.w, h: b.h, t: 40 });
  burstFx(b.x + b.w / 2, b.y + b.h / 2, '#6b5d52', 30);
  const F = W.F[b.fac]; recomputeCaps(F);
  if (b.fac === 0 && !quiet) alert(0, `Your ${BDEF[b.type].name} was destroyed!`, b.x + b.w / 2, b.y + b.h / 2, 'bad');
  if (b.type === 'hall' && b.done) defeatFaction(b.fac, killerFac);
  if (b.type === 'camp') onCampDestroyed(b, killerFac);
}
function defeatFaction(fi, by) {
  const F = W.F[fi]; if (!F.alive) return;
  F.alive = false;
  for (const u of W.units) if (u.fac === fi && !u.dead) { u.dying = 1 + rand() * 6; }
  for (const b of W.blds) if (b.fac === fi && !b.dead) b.dying = 1 + rand() * 8;
  W.alerts.push({ text: fi === 0 ? 'Your Town Hall has fallen.' : `${FAC[fi].name} has been defeated${by === 0 ? ' by your army' : by !== undefined && by >= 0 ? ' by ' + FAC[by].name : ''}!`, t: 12, kind: fi === 0 ? 'bad' : 'good' });
}

// ── units ──────────────────────────────────────────────────────────────────
function spawnUnit(fac, type, x, y, age, surname) {
  const d = UDEF[type];
  const u = { kind: 'unit', id: W.nextId++, type, fac, x, y, hp: d.hp, maxHp: d.hp, path: null, pathI: 0, goalKey: null, jx: rr(-0.22, 0.22), jy: rr(-0.18, 0.18),
    job: null, st: 'seek', tn: -1, carry: null, workT: 0, waitT: 0, fleeT: 0, order: null, target: null, cd: 0, dir: 1, anim: rand() * 6, scanT: rand() * 0.5, guard: null, stuck: 0, act: null, dead: false, born: W.t };
  if (type === 'villager') lifeInit(u, age !== undefined ? age : ri(18, 40), surname);
  if (d.mil) { u.morale = 100; const m = W.F[fac] ? docHpMul(W.F[fac], type) : 1; if (m > 1) { u.docHp = true; u.hp = u.maxHp = Math.round(d.hp * m); } }
  if (type === 'hero') nameHero(u);
  W.units.push(u); W.byId.set(u.id, u);
  return u;
}
function spawnNear(b, type) {
  // a free tile along the building's lower edge, else anywhere nearby
  const cand = [];
  for (let x = b.x - 1; x <= b.x + b.w; x++) cand.push([x, b.y + b.h]);
  for (let y = b.y; y < b.y + b.h; y++) cand.push([b.x - 1, y], [b.x + b.w, y]);
  if (UDEF[type].naval) { NAV = 1; for (let y = b.y - 1; y <= b.y + b.h; y++) cand.push([b.x - 1, y], [b.x + b.w, y]); for (let x = b.x; x < b.x + b.w; x++) cand.push([x, b.y - 1]); }
  const ok = cand.filter(([x, y]) => walkable(x, y));
  const [tx, ty] = ok.length ? ok[ri(0, ok.length - 1)] : nearestWalkable(b.x + b.w / 2, b.y + b.h);
  NAV = 0;
  return spawnUnit(b.fac, type, tx + 0.5, ty + 0.5);
}
function unassign(u) { u.cart = false; u.src = null; if (u.input) { for (const [r, n] of u.input.ins) W.F[u.fac].res[r] += n * u.input.n; u.input = null; } u.job = null; u.st = 'seek'; u.tn = -1; u.path = null; u.act = null; }
function killUnit(u, killerFac, natural) {
  if (u.dead) return;
  u.dead = true; W.byId.delete(u.id);
  if (natural) return;                                  // old age / moved away: no corpse
  onUnitDeath(u, killerFac);
  if (isNaval(u)) { sinkBoat(u, killerFac); W.F[u.fac].stats.lost++; return; }
  W.F[u.fac].stats.lost++; if (killerFac >= 0 && W.F[killerFac]) W.F[killerFac].stats.kills++;
  if (u.type === 'villager') W.F[u.fac].grief = (W.F[u.fac].grief || 0) + 0.6;
  W.fx.push({ kind: 'corpse', x: u.x, y: u.y, t: 14, col: FAC[u.fac].col, type: u.type, dir: u.dir, child: u.stage === 'child' });
  burstFx(u.x, u.y, '#8a2a22', 6);
}

// ── movement ───────────────────────────────────────────────────────────────
function moveStep(u, spd) {
  if (!u.path || u.pathI >= u.path.length) return true;
  const [tx, ty] = u.path[u.pathI];
  const last = u.pathI === u.path.length - 1;
  const gx = tx + 0.5 + (last ? u.jx : 0), gy = ty + 0.5 + (last ? u.jy : 0);
  const onRoad = map.road[ix(clamp(Math.floor(u.x), 0, MW - 1), clamp(Math.floor(u.y), 0, MH - 1))];
  const dx = gx - u.x, dy = gy - u.y, d = Math.hypot(dx, dy), s = spd * DT * (onRoad ? (u.cart ? 1.7 : 1.5) : terrainSpeed(u));
  if (Math.abs(dx) > 0.02) u.dir = dx > 0 ? 1 : -1;
  if (d <= s) { u.x = gx; u.y = gy; u.pathI++; } else { u.x += dx / d * s; u.y += dy / d * s; }
  u.anim += s * 3.2; u.moving = true;
  return u.pathI >= u.path.length;
}
function speedOf(u) { const F = W.F[u.fac]; return (u.order && u.march ? Math.min(UDEF[u.type].speed, u.march) : UDEF[u.type].speed) * (u.boostT > W.t ? 1.2 : 1) * (F.hungry ? 0.75 : 1) * (u.cart ? 1.25 * (F.ups.has('wheels') ? 1.25 : 1) : 1); }
// walk toward a goal; returns true once the unit stands on a goal tile
function goTo(u, key, goal, hx, hy) {
  if (isNaval(u)) { NAV = 1; try { return goToInner(u, key, goal, hx, hy); } finally { NAV = 0; } }
  return goToInner(u, key, goal, hx, hy);
}
function goToInner(u, key, goal, hx, hy) {
  const tx = Math.floor(u.x), ty = Math.floor(u.y);
  if (UDEF[u.type].fly && hx !== undefined) {         // fliers go straight over walls and water
    if (goal(tx, ty) && u.goalKey === key) return true;
    u.goalKey = key; u.path = null;
    const dx = hx - u.x, dy = hy - u.y, d = Math.hypot(dx, dy), s = speedOf(u) * DT;
    if (d < 0.25) { u.stuck++; return goal(tx, ty); }
    if (Math.abs(dx) > 0.02) u.dir = dx > 0 ? 1 : -1;
    const k = Math.min(1, s / d); u.x = clamp(u.x + dx * k, 0.5, MW - 0.5); u.y = clamp(u.y + dy * k, 0.5, MH - 0.5); u.anim += s * 3.2; u.moving = true;
    return goal(Math.floor(u.x), Math.floor(u.y));
  }
  if (goal(tx, ty) && (!u.path || u.pathI >= u.path.length || u.goalKey !== key)) { u.path = null; return true; }
  if (u.goalKey !== key || !u.path) {
    if (pathBudget <= 0) return false;
    pathBudget--;
    PF_FAC = u.fac; const p = findPath(u.x, u.y, goal, hx, hy); PF_FAC = -1;
    u.goalKey = key; u.path = p || []; u.pathI = 0;
    if (!p || (p.partial && p.length === 0)) { u.stuck++; u.path = null; return false; }
  }
  if (moveStep(u, speedOf(u))) {
    if (goal(Math.floor(u.x), Math.floor(u.y))) return true;
    u.path = null; u.stuck++;
  }
  return false;
}

// distance from a unit to an entity's surface (tiles)
function surfDist(u, t) {
  if (t.kind === 'bld') { const nx = clamp(u.x, t.x, t.x + t.w), ny = clamp(u.y, t.y, t.y + t.h); return Math.hypot(u.x - nx, u.y - ny); }
  return Math.hypot(u.x - t.x, u.y - t.y);
}
function entCenter(t) { return t.kind === 'bld' ? [t.x + t.w / 2, t.y + t.h / 2] : [t.x, t.y]; }

// ── villagers ──────────────────────────────────────────────────────────────
const WORK_RATE = { wood: 0.85, stone: 1.15, gold: 1.45, ore: 1.35, food: 1.25, meat: 0.7 };     // seconds per unit
function dropFor(fac, res, x, y) {
  let best = null, bd = 1e9;
  const c = compAt(x, y);
  for (const b of W.blds) if (!b.dead && b.done && b.fac === fac && BDEF[b.type].drop && BDEF[b.type].drop.includes(res)) {
    const d = dist(x, y, b.x + b.w / 2, b.y + b.h / 2) + (compAt(b.x, b.y) === c ? 0 : 500); if (d < bd) { bd = d; best = b; }
  }
  return best;
}
function nearestNode(kind, x, y, cx, cy, maxR) {
  let best = -1, bd = 1e9;
  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i]; if (n.amt <= 0 || n.kind !== kind || (n.bad && n.bad > W.t)) continue;
    if (dist(n.x, n.y, cx, cy) > maxR) continue;
    const d = dist(n.x + 0.5, n.y + 0.5, x, y) + (n.claim > 2 ? 3 : 0);
    if (d < bd) { bd = d; best = i; }
  }
  return best;
}
function removeNode(i) { const n = nodes[i]; if (!n) return; n.amt = 0; if (map.node[ix(n.x, n.y)] === i) map.node[ix(n.x, n.y)] = -1; if (n.kind !== 'carcass') W.fx.push({ kind: 'stump', x: n.x, y: n.y, t: 1e9, nk: n.kind }); }

function updateVillager(u) {
  const F = W.F[u.fac];
  u.moving = false; u.act = null;
  if (u.boardId && tryBoard(u)) return;
  if ((u.inside || W.F[u.fac].bell) && lifeRoutine(u)) return;
  // panic when enemy soldiers come close
  if ((u.scanT -= DT) <= 0) {
    u.scanT = 0.5;
    const threat = W.units.find(e => !e.dead && foe(e.fac, u.fac) && isSoldier(e) && !e.inside && !e.aboard && !isNaval(e) && Math.abs(e.x - u.x) < 4 && Math.abs(e.y - u.y) < 4);
    if (threat && u.fleeT <= 0) {
      const hall = W.blds.find(b => !b.dead && b.fac === u.fac && b.type === 'hall');
      u.fleeT = 4; u.path = null; u.goalKey = null;
      if (hall) u.flee = [hall.x, hall.y, hall.w, hall.h]; else u.flee = null;
    }
  }
  if (u.fleeT > 0) {
    u.fleeT -= DT;
    if (u.flee) goTo(u, 'flee', nearRect(...u.flee), u.flee[0] + u.flee[2] / 2, u.flee[1] + u.flee[3] / 2);
    if (u.fleeT <= 0) { u.path = null; u.goalKey = null; }
    return;
  }
  if (lifeRoutine(u)) return;
  const j = u.job;
  if (!j) {                                                    // idle: drift near the hall
    if (u.carry && u.carry.n > 0) return deliver(u, F);
    if (!u.path || u.pathI >= u.path.length) {
      if (rand() < 0.01) { const h = W.blds.find(b => !b.dead && b.fac === u.fac && b.type === 'hall'); if (h) { const tx = h.x + ri(-3, h.w + 2), ty = h.y + h.h + ri(0, 3); if (walkable(tx, ty)) { pathBudget--; u.path = findPath(u.x, u.y, atTile(tx, ty), tx, ty, 600); u.pathI = 0; u.goalKey = 'idle'; } } }
    } else moveStep(u, speedOf(u) * 0.6);
    return;
  }
  const b = byId(j.b);
  if (!b) { unassign(u); return; }
  if (j.kind === 'build') {
    if (b.done) { unassign(u); return; }
    if (goTo(u, 'b' + b.id, nearRect(b.x, b.y, b.w, b.h), b.x + b.w / 2, b.y + b.h / 2)) {
      u.act = 'build'; u.dir = (b.x + b.w / 2) > u.x ? 1 : -1;
      const add = DT / BDEF[b.type].build * F.mult * (F.hungry ? 0.5 : 1) * workMult(u, 'build'); addXp(u, 'build', DT);
      b.progress += add; b.hp = Math.min(b.maxHp, b.hp + b.maxHp * add * 0.9);
      if (b.progress >= 1) completeBuilding(b);
    }
    if (u.stuck > 6) {
      u.stuck = 0; unassign(u); b.unreach = (b.unreach || 0) + 1;
      if (b.unreach > 8 && b.progress < 0.05) {
        if (F.ai) { refund(F, BDEF[b.type].cost, 1); destroyBuilding(b, -1, true); }
        else if (!b.unreachAlert) { b.unreachAlert = true; alert(0, `Builders can't reach your ${BDEF[b.type].name} site. Cancel it or clear a path.`, b.x + b.w / 2, b.y + b.h / 2, 'warn'); }
      }
    }
    return;
  }
  // gatherers
  const kind = BDEF[b.type].job;
  if (kind === 'craft') return craftWork(u, b, F);
  if (kind === 'hunt') return huntWork(u, b, F);
  if (kind === 'haul') return haulWork(u, b, F);
  const res = kind === 'wood' ? 'wood' : kind === 'mine' ? b.ore : 'food';
  if (u.carry && u.carry.res !== res && u.carry.n > 0) return deliver(u, F);
  if (u.st === 'deliver') return deliver(u, F);
  if (u.carry && u.carry.n >= 10) { u.st = 'deliver'; return deliver(u, F); }
  const skey = res === 'food' ? 'farm' : res;
  const rateMul = F.mult * docGather(F, res) * (res === 'food' ? BIOME[bioAt(b.x, b.y)].farm : 1) * (F.hungry ? 0.5 : 1) * (res === 'wood' && F.ups.has('axes') ? 1.3 : 1) * (res === 'food' ? (F.ups.has('ploughs') ? 1.3 : 1) * FARM_SEASON[W.cal.season] : 1) * workMult(u, skey);
  if (kind === 'farm') {
    if (!u.farmTile || u.farmB !== b.id) { u.farmB = b.id; u.farmTile = [b.x + ri(0, b.w - 1), b.y + ri(1, b.h - 1)]; }
    const [fx, fy] = u.farmTile;
    if (goTo(u, 'f' + fx + ',' + fy, atTile(fx, fy), fx, fy)) {
      u.act = 'farm'; addXp(u, 'farm', DT);
      u.workT += DT * rateMul;
      if (u.workT >= WORK_RATE.food) { u.workT = 0; u.carry = { res: 'food', n: (u.carry ? u.carry.n : 0) + 1 }; if (rand() < 0.15) u.farmTile = null; }
    }
    if (u.stuck > 5) { u.stuck = 0; u.farmTile = null; }
    return;
  }
  // wood / stone / gold: walk to a node near the workplace and hack at it
  const nk = res === 'wood' ? 'tree' : res === 'ore' ? 'iron' : res;
  let n = u.tn >= 0 ? nodes[u.tn] : null;
  if (!n || n.amt <= 0 || n.kind !== nk) {
    u.tn = nearestNode(nk, u.x, u.y, b.x + b.w / 2, b.y + b.h / 2, 16);
    if (u.tn < 0) u.tn = nearestNode(nk, u.x, u.y, b.x + b.w / 2, b.y + b.h / 2, 40);
    if (u.tn < 0) { u.status = `No ${nk === 'tree' ? 'trees' : nk === 'iron' ? 'iron ore' : nk} nearby`; if (u.carry && u.carry.n) u.st = 'deliver'; return; }
    n = nodes[u.tn]; n.claim = (n.claim || 0) + 1; u.status = null;
  }
  if (goTo(u, 'n' + u.tn, nearTile(n.x, n.y), n.x, n.y)) {
    u.act = res === 'wood' ? 'chop' : 'mine'; u.dir = n.x + 0.5 > u.x ? 1 : -1; addXp(u, skey, DT);
    u.workT += DT * rateMul;
    if (u.workT >= WORK_RATE[res]) {
      u.workT = 0; n.amt--; u.carry = { res, n: (u.carry ? u.carry.n : 0) + 1 };
      if (rand() < 0.3) burstFx(n.x + 0.5, n.y + 0.3, res === 'wood' ? '#a07a4a' : res === 'gold' ? '#f3cf6a' : '#9a9590', 2);
      if (n.amt <= 0) { removeNode(u.tn); u.tn = -1; }
    }
  }
  if (u.stuck > 4) { u.stuck = 0; if (n) n.bad = W.t + 30; u.tn = -1; u.path = null; }
}
function deliver(u, F) {
  u.st = 'deliver';
  if (!u.carry || u.carry.n <= 0) { u.carry = null; u.st = 'seek'; return; }
  if (u.waitT > 0) { u.waitT -= DT; return; }
  // with carters on duty, farm and workshop output is piled at the workplace for a cart to collect
  const wb = u.job && u.job.kind === 'work' ? byId(u.job.b) : null;
  if (wb && F.carters > 0 && (BDEF[wb.type].job === 'farm' || BDEF[wb.type].job === 'craft') && u.carry.res === (BDEF[wb.type].recipe ? BDEF[wb.type].recipe.out : 'food') && bufTotal(wb) < 40) {
    if (goTo(u, 'pile' + wb.id, nearRect(wb.x, wb.y, wb.w, wb.h), wb.x + wb.w / 2, wb.y + wb.h / 2)) {
      wb.buf[u.carry.res] = (wb.buf[u.carry.res] || 0) + u.carry.n; u.carry = null; u.st = 'seek'; u.status = null; u.path = null;
    }
    return;
  }
  const d = dropFor(u.fac, u.carry.res, u.x, u.y);
  if (!d) { u.status = 'Nowhere to store ' + u.carry.res; return; }
  if (goTo(u, 'd' + d.id, nearRect(d.x, d.y, d.w, d.h), d.x + d.w / 2, d.y + d.h / 2)) {
    const r = u.carry.res, room = Math.max(0, F.cap[r] - F.res[r]), k = Math.min(room, u.carry.n);
    F.res[r] += k; u.carry.n -= k; F.stats.gathered += k;
    if (u.carry.n > 0) {
      u.waitT = 2; u.status = `${r[0].toUpperCase() + r.slice(1)} storage full`;
      if (!F.full[r] || W.t - F.full[r] > 25) { F.full[r] = W.t; alert(u.fac, `${r[0].toUpperCase() + r.slice(1)} storage is full. Build ${r === 'food' ? 'a Granary' : r === 'wood' ? 'a Lumber Mill or Storehouse' : 'a Mining Camp or Storehouse'}.`, d.x + d.w / 2, d.y + d.h / 2, 'warn'); }
    } else { u.carry = null; u.st = 'seek'; u.status = null; u.path = null; }
  }
  if (u.stuck > 6) { u.stuck = 0; u.path = null; }
}

// faction-level job board: builders first, then workplace slots
function assignJobs(F) {
  const mine = W.units.filter(u => !u.dead && u.fac === F.i && u.type === 'villager' && !u.dying && u.stage !== 'child' && !u.sick);
  const winter = W.cal.season === 3;
  for (const u of W.units) if (u.job && u.fac === F.i && (u.stage === 'child' || u.sick)) unassign(u);
  const free = mine.filter(u => !u.job && u.fleeT <= 0 && !u.aboard && !u.boardId);
  const count = new Map();
  for (const u of mine) if (u.job) count.set(u.job.b, (count.get(u.job.b) || 0) + 1);
  const take = (b, kind) => {
    if (!free.length) return false;
    let bi = 0, bd = 1e9;
    const key = kind === 'build' ? 'build' : skillKeyOf(b);
    const bc = compAt(b.x, b.y); bi = -1;
    free.forEach((u, i) => { if (compAt(u.x, u.y) !== bc) return; const d = dist(u.x, u.y, b.x + b.w / 2, b.y + b.h / 2) - skillLv(u, key) * 7; if (d < bd) { bd = d; bi = i; } });
    if (bi < 0) return false;
    const u = free.splice(bi, 1)[0]; u.job = { kind, b: b.id }; u.st = 'seek'; u.path = null; u.goalKey = null; u.tn = -1;
    count.set(b.id, (count.get(b.id) || 0) + 1);
    return true;
  };
  const sites = W.blds.filter(b => !b.dead && b.fac === F.i && !b.done && !b.dying).sort((a, b) => a.born - b.born);
  for (const s of sites) while ((count.get(s.id) || 0) < 3 && take(s, 'build'));
  // nobody free but a site is stalled: borrow a worker
  const stalled = sites.find(s => !count.get(s.id));
  if (stalled && !free.length) {
    const w = mine.filter(u => u.job && u.job.kind === 'work' && !(u.carry && u.carry.n > 0)).sort((a, b) => dist(a.x, a.y, stalled.x, stalled.y) - dist(b.x, b.y, stalled.x, stalled.y))[0];
    if (w) { w.job = { kind: 'build', b: stalled.id }; w.st = 'seek'; w.path = null; w.goalKey = null; }
  }
  F.carters = mine.filter(u => u.job && u.job.kind === 'work' && (byId(u.job.b) || {}).type === 'cartshed').length;
  const work = W.blds.filter(b => !b.dead && b.fac === F.i && b.done && b.slots > 0 && !(winter && b.type === 'farm'));
  if (winter) for (const u of mine) if (u.job && u.job.kind === 'work') { const b = byId(u.job.b); if (b && b.type === 'farm') unassign(u); }
  // trim over-staffed workplaces
  for (const b of work) { let c = count.get(b.id) || 0; if (c > b.slots) for (const u of mine) if (c > b.slots && u.job && u.job.b === b.id && u.job.kind === 'work') { unassign(u); c--; } count.set(b.id, Math.min(c, b.slots)); }
  // fill emptiest first (food first when hungry)
  work.sort((a, b) => ((count.get(a.id) || 0) / a.slots - (count.get(b.id) || 0) / b.slots) || ((F.hungry ? (b.type === 'farm') - (a.type === 'farm') : 0)));
  let progress = true;
  while (free.length && progress) {
    progress = false;
    for (const b of work) if ((count.get(b.id) || 0) < b.slots && take(b, 'work')) progress = true;
  }
}
function workersOf(b) { return W.units.filter(u => !u.dead && u.job && u.job.b === b.id); }

// ── soldiers ───────────────────────────────────────────────────────────────
// ── buildings that act: training, research, arrows, growth ─────────────────
function updateBuilding(b) {
  const F = W.F[b.fac], d = BDEF[b.type];
  if (b.dying) { b.dying -= DT; if (b.dying <= 0) destroyBuilding(b, -1); return; }
  if (!b.done) return;
  if (d.attack) buildingShoot(b, F, d);
  const q = b.queue[0];
  if (q) {
    if (q.unit) {
      if (F.pop + (UDEF[q.unit].group || 1) > F.popCap) { q.blocked = true; if (b.fac === 0 && (!F.popAlert || W.t - F.popAlert > 20)) { F.popAlert = W.t; alert(0, 'Not enough housing. Build Houses.', undefined, undefined, 'warn'); } }
      else {
        q.blocked = false; q.t -= DT * F.mult * docTrain(F, q.unit);
        if (q.t <= 0) {
          b.queue.shift(); const u = spawnNear(b, q.unit); F.stats.trained++; F.pop++; const us = spawnSquadExtras(b, u);
          if (b.rally) orderGroup(us, 'move', b.rally[0], b.rally[1]); else us.forEach(v => v.guard = [v.x, v.y]);
          if (b.fac === 0) alert(0, `${UDEF[q.unit].name} ready.`);
        }
      }
    } else if (q.age) {
      q.t -= DT * F.mult;
      if (q.t <= 0) { b.queue.shift(); reachAge(F, q.age); }
    } else if (q.up) {
      q.t -= DT * F.mult;
      if (q.t <= 0) { b.queue.shift(); F.ups.add(q.up); alert(b.fac, `${UPGRADES[q.up].name} researched.`); }
    }
  }

}
function queueUnit(b, type) {
  const F = W.F[b.fac], d = UDEF[type];
  if (b.queue.length >= 6 || !canAfford(F, d.cost) || !unitAgeOk(F, type)) return false;
  if (d.elite && elitesAlive(b.fac, type)) return false;
  pay(F, d.cost); b.queue.push({ unit: type, t: d.time, total: d.time }); return true;
}
function queueUpgrade(b, up) {
  const F = W.F[b.fac], d = UPGRADES[up];
  if (ageOf(F) < (UP_AGE[up] || 0) || F.ups.has(up) || W.blds.some(x => !x.dead && x.fac === b.fac && x.queue.some(q => q.up === up)) || !canAfford(F, d.cost)) return false;
  pay(F, d.cost); b.queue.push({ up, t: d.time, total: d.time }); return true;
}
function cancelQueue(b, i) {
  const q = b.queue[i]; if (!q) return;
  refund(W.F[b.fac], q.unit ? UDEF[q.unit].cost : q.age ? AGES[q.age].cost : UPGRADES[q.up].cost);
  b.queue.splice(i, 1);
}
function researchAt(type) { return Object.entries(UPGRADES).filter(([, u]) => (u.at || 'smith') === type).map(([k]) => k); }

// ── projectiles + effects ──────────────────────────────────────────────────
function updateProjs() {
  for (const p of W.projs) {
    if (p.rock) { updateRock(p); continue; }
    if (p.vis) {                                       // hunters' arrows: fly to a spot, maybe drop a deer
      const dx = p.tx - p.x, dy = p.ty - p.y, d = Math.hypot(dx, dy), s = p.spd * DT; p.ang = Math.atan2(dy, dx);
      if (d <= s) { p.dead = true; if (p.deer) killDeer(W.deer.find(x => x.id === p.deer)); } else { p.x += dx / d * s; p.y += dy / d * s; }
      continue;
    }
    const t = byId(p.tid);
    if (!t) { p.dead = true; continue; }
    const [tx, ty] = entCenter(t), dx = tx - p.x, dy = ty - 0.3 - p.y, d = Math.hypot(dx, dy), s = p.spd * DT;
    p.ang = Math.atan2(dy, dx);
    if (d <= s + 0.2) { p.dead = true; hurt(t, p.dmg, p.fac, p.src >= 0 ? byId(p.src) : null); }
    else { p.x += dx / d * s; p.y += dy / d * s; }
  }
  W.projs = W.projs.filter(p => !p.dead);
}
function burstFx(x, y, col, n) { for (let i = 0; i < n; i++) W.fx.push({ kind: 'p', x, y, vx: rr(-1.6, 1.6), vy: rr(-2.4, 0.2), t: rr(0.4, 0.9), col }); }
function updateFx() {
  for (const f of W.fx) {
    f.t -= DT;
    if (f.kind === 'p') { f.x += f.vx * DT; f.y += f.vy * DT; f.vy += 5 * DT; }
  }
  W.fx = W.fx.filter(f => f.t > 0);
  for (const a of W.alerts) a.t -= DT / W.speed;
  for (const p of W.pings) p.t -= DT;
  W.pings = W.pings.filter(p => p.t > 0);
}

// ── the whole tick ─────────────────────────────────────────────────────────
function tick() {
  W.t += DT;
  W.cal = calendar(W.t);
  pathBudget = 24;
  realmTick(); poiTick();
  for (const F of W.F) {
    if (!F.alive) continue;
    F.pop = W.units.filter(u => !u.dead && u.fac === F.i && !u.dying).length;
    if (F.bandit) { banditTick(F); continue; }
    if ((F.assignT -= DT) <= 0) { F.assignT = 1; assignJobs(F); }
    lifeTick(F);
    militaryTick(F);
    if (F.ai) aiTick(F);
  }
  for (const b of W.blds) if (!b.dead) updateBuilding(b);
  for (const u of W.units) {
    if (u.dead) continue;
    if (u.hitT) u.hitT = Math.max(0, u.hitT - DT);
    if (u.dying) { u.dying -= DT; if (u.dying <= 0) killUnit(u, -1); continue; }
    if (!walkable(Math.floor(u.x), Math.floor(u.y)) && !BDEF.farm.walk) {}
    if (u.aboard) { const t = byId(u.aboard); if (!t) { u.aboard = null; killUnit(u, -1); } continue; }
    if (u.type === 'villager') updateVillager(u); else if (u.type === 'caravan') updateCaravan(u); else if (u.type === 'fishboat') updateFishBoat(u); else if (u.type === 'transport') updateTransport(u); else updateSoldier(u);
  }
  W.units = W.units.filter(u => !u.dead);
  W.blds = W.blds.filter(b => !b.dead);
  updateDeer(); updateProjs(); updateFx();
  if (W.mode === 'campaign') missionTick(); else if (W.mode === 'survival') survivalTick();
  if (Math.floor(W.t) !== Math.floor(W.t - DT)) for (const F of W.F) for (const r in (F.pf || {})) F.pf[r] += (1 - F.pf[r]) * 0.01;
  // victory / defeat
  if (!W.over) {
    if (!W.F[0].alive) W.over = 'lose';
    else if (W.mode === 'skirmish' && W.F.slice(1).every(F => !F.alive || F.bandit || ally(0, F.i))) { W.over = 'win'; W.overWhy = W.F.slice(1).some(F => F.alive) ? 'alliance' : 'conquest'; }
  }
}

// ── match setup ────────────────────────────────────────────────────────────
function startMatch(nRivals, diff, seed, opts = {}) {
  Object.assign(W, { t: 0, units: [], blds: [], projs: [], fx: [], F: [], nextId: 1, byId: new Map(), over: null, alerts: [], pings: [], diff, speed: 1, lastHitAlert: 0, deer: [], deerT: 0, cal: calendar(0), posts: [] });
  generateMap(seed, nRivals + 1, opts.map || 'continental', opts.climate || 'mixed');
  W.mode = opts.mode || 'skirmish'; W.pois = [];
  FOG.reset();
  for (let i = 0; i <= nRivals; i++) {
    const F = newFaction(i, i > 0); W.F.push(F);
    if (i > 0) { F.mult = [0.75, 1, 1.3][diff]; aiInit(F); }
    const s = map.starts[i];
    const hall = placeBuilding(i, 'hall', s.x, s.y, true);
    const hx = s.x + (s.x < MW / 2 ? 5 : -3), hy = s.y + (s.y < MH / 2 ? 0 : 2);
    if (canPlace(-1, 'house', hx, hy)) placeBuilding(i, 'house', hx, hy, true);
    else { const sp = findSpot(i, 'house', hall, 3, 9); if (sp) placeBuilding(i, 'house', sp[0], sp[1], true); }
    recomputeCaps(F);
    const fam = [SUR[ri(0, SUR.length - 1)], SUR[ri(0, SUR.length - 1)], SUR[ri(0, SUR.length - 1)]];
    for (let k = 0; k < 6; k++) { const u = spawnNear(hall, 'villager'); lifeInit(u, ri(18, 38), fam[k >> 1]); }
  }
  // empty seats keep faction indexes stable; the bandits always sit at index 4
  for (let i = nRivals + 1; i < BANDIT; i++) { const F = newFaction(i, false); F.alive = false; F.absent = true; W.F.push(F); }
  { const B = newFaction(BANDIT, false); B.bandit = true; W.F.push(B); }
  initRealm(W.F.length, seed, nRivals);
  placeTradingPosts(); computeComps();
  if (!opts.noBandits) placePOIs(seed, opts.camps || (map.type === 'islands' ? 2 : 1 + diff)); else placePOIs(seed, 0);
  for (let k = 0; k < 11; k++) { const s = herdSpot(); if (s) spawnHerd(s[0], s[1], ri(3, 5)); }
  FOG.update();
}
// spiral search for a free spot near a building (AI + starting layout)
// flood fill of tiles a faction can walk to from its Town Hall (so the AI never builds where builders can't reach)
const REACH = new Uint8Array(MW * MH);
function reachFrom(fac, b) {
  REACH.fill(0); PF_FAC = fac;
  const q = [];
  for (let x = b.x - 1; x <= b.x + b.w; x++) for (let y = b.y - 1; y <= b.y + b.h; y++) if (walkable(x, y)) { REACH[ix(x, y)] = 1; q.push(ix(x, y)); }
  for (let h = 0; h < q.length; h++) { const x = q[h] % MW, y = (q[h] / MW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (inMap(nx, ny) && !REACH[ix(nx, ny)] && walkable(nx, ny)) { REACH[ix(nx, ny)] = 1; q.push(ix(nx, ny)); } } }
  PF_FAC = -1; return REACH;
}
function findSpot(fac, type, near, rMin, rMax, score, reach) {
  const d = BDEF[type], cx0 = near.x + near.w / 2, cy0 = near.y + near.h / 2;
  let best = null, bs = 1e9;
  for (let y = Math.floor(cy0 - rMax); y <= cy0 + rMax; y++) for (let x = Math.floor(cx0 - rMax); x <= cx0 + rMax; x++) {
    const dd = dist(x + d.w / 2, y + d.h / 2, cx0, cy0); if (dd < rMin || dd > rMax) continue;
    if (!canPlace(-1, type, x, y)) continue;
    // keep a walkable ring so towns don't wall themselves in
    let ring = true;
    for (let xx = x - 1; xx <= x + d.w && ring; xx++) for (const yy of [y - 1, y + d.h]) if (inMap(xx, yy) && map.bld[ix(xx, yy)] >= 0) ring = false;
    for (let yy = y; yy < y + d.h && ring; yy++) for (const xx of [x - 1, x + d.w]) if (inMap(xx, yy) && map.bld[ix(xx, yy)] >= 0) ring = false;
    if (!ring) continue;
    if (reach) { let ok = false; for (let xx = x - 1; xx <= x + d.w && !ok; xx++) for (const yy of [y - 1, y + d.h]) if (inMap(xx, yy) && reach[ix(xx, yy)]) ok = true; for (let yy = y; yy < y + d.h && !ok; yy++) for (const xx of [x - 1, x + d.w]) if (inMap(xx, yy) && reach[ix(xx, yy)]) ok = true; if (!ok) continue; }
    const s = (score ? score(x, y) : 0) + dd * 0.35 + rand() * 0.6;
    if (s < bs) { bs = s; best = [x, y]; }
  }
  return best;
}
