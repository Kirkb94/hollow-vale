// 029 the wider world: terrain effects, points of interest (ruins, shrines, bandit camps), docks and boats.
const POI_ID = 1.5e9;
const isNaval = u => !!(u && UDEF[u.type] && UDEF[u.type].naval);
const terAt = (x, y) => map.ter[ix(clamp(Math.floor(x), 0, MW - 1), clamp(Math.floor(y), 0, MH - 1))];
const onHill = u => !isNaval(u) && terAt(u.x, u.y) === 4;
// land units slow down on hills and in fords
const terrainSpeed = u => isNaval(u) ? 1 : ({ 4: 0.72, 5: 0.6 })[terAt(u.x, u.y)] || 1;
const BIOME = [{ name: 'Temperate', farm: 1, fire: 1 }, { name: 'Northern Highlands', farm: 0.88, fire: 1.25 }, { name: 'Dry Plains', farm: 1.1, fire: 0.75 }];
const bioAt = (x, y) => map.bio[ix(clamp(Math.floor(x), 0, MW - 1), clamp(Math.floor(y), 0, MH - 1))];
const landWalk = (x, y) => { const n = NAV; NAV = 0; const r = walkable(x, y); NAV = n; return r; };
const waterAt = (x, y) => inMap(x, y) && (map.ter[ix(x, y)] === 1 || map.ter[ix(x, y)] === 5);

// ── docks must touch the water ─────────────────────────────────────────────
function coastOk(type, x, y) {
  const d = BDEF[type]; let w = 0;
  for (let xx = x - 1; xx <= x + d.w; xx++) for (let yy = y - 1; yy <= y + d.h; yy++) {
    if (xx >= x && xx < x + d.w && yy >= y && yy < y + d.h) continue;
    if (inMap(xx, yy) && map.ter[ix(xx, yy)] === 1) w++;
  }
  return w >= 2;
}

// ── points of interest ─────────────────────────────────────────────────────
function poiSpot(w, h, minFromTowns, R) {
  for (let k = 0; k < 400; k++) {
    const x = 3 + Math.floor(R() * (MW - 6 - w)), y = 3 + Math.floor(R() * (MH - 6 - h));
    if (map.starts.some(s => dist(x, y, s.x + 2, s.y + 2) < minFromTowns)) continue;
    if (W.pois.some(p => dist(x, y, p.x, p.y) < 10) || W.posts.some(p => dist(x, y, p.x, p.y) < 8)) continue;
    let ok = true;
    for (let yy = y - 1; yy <= y + h && ok; yy++) for (let xx = x - 1; xx <= x + w && ok; xx++) { const k2 = ix(xx, yy); if (!inMap(xx, yy) || [1, 4, 5].includes(map.ter[k2]) || map.bld[k2] >= 0) ok = false; }
    if (!ok) continue;
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) { const n = map.node[ix(xx, yy)]; if (n >= 0) { nodes[n].amt = 0; map.node[ix(xx, yy)] = -1; } }
    return [x, y];
  }
  return null;
}
function placePOIs(seed, nCamps) {
  const R = mulberry32(seed + 404);
  W.pois = [];
  for (let i = 0; i < 4; i++) { const s = poiSpot(2, 2, 20, R); if (s) W.pois.push({ id: POI_ID + W.pois.length, kind: 'ruins', x: s[0], y: s[1], w: 2, h: 2, looted: false }); }
  for (let i = 0; i < 2; i++) {
    const s = poiSpot(2, 2, 24, R); if (!s) continue;
    const p = { id: POI_ID + W.pois.length, kind: 'shrine', x: s[0], y: s[1], w: 2, h: 2, owner: -1, prog: 0, capFac: -1 };
    W.pois.push(p); for (let yy = p.y; yy < p.y + 2; yy++) for (let xx = p.x; xx < p.x + 2; xx++) map.bld[ix(xx, yy)] = p.id;
  }
  for (let i = 0; i < nCamps; i++) {
    const s = poiSpot(3, 3, map.type === 'islands' ? 19 : 26, R); if (!s) continue;
    const c = placeBuilding(BANDIT, 'camp', s[0], s[1], true);
    c.spawnT = 20; W.pois.push({ id: POI_ID + W.pois.length, kind: 'camp', x: s[0], y: s[1], w: 3, h: 3, bld: c.id });
    for (let k = 0; k < 2 + W.diff; k++) { const u = spawnNear(c, 'bandit'); u.guard = [u.x, u.y]; u.camp = c.id; }
  }
}
const RUIN_LOOT = [
  { text: 'an old treasury: +150 gold', give: { gold: 150 } },
  { text: 'a buried armoury: +25 iron and +40 planks', give: { iron: 25, planks: 40 } },
  { text: 'cut stone from a fallen keep: +150 stone', give: { stone: 150 } },
  { text: 'a holy relic: your people are happier (+4 happiness)', relic: true },
  { text: 'an old map of the region', map: true }
];
function poiTick() {
  if (!W.pois || (W.poiT = (W.poiT || 0) - DT) > 0) return;
  W.poiT = 0.5;
  for (const p of W.pois) {
    if (p.kind === 'ruins' && !p.looted) {
      const u = W.units.find(v => !v.dead && !v.aboard && v.fac !== BANDIT && !isNaval(v) && v.x > p.x - 1.2 && v.x < p.x + p.w + 1.2 && v.y > p.y - 1.2 && v.y < p.y + p.h + 1.2);
      if (!u) continue;
      p.looted = true;
      const F = W.F[u.fac], L = RUIN_LOOT[Math.floor(rand() * RUIN_LOOT.length)];
      if (L.give) for (const [r, n] of Object.entries(L.give)) F.res[r] = Math.min(F.res[r] + n, Math.max(F.cap[r], F.res[r]));
      if (L.relic) F.relics = (F.relics || 0) + 1;
      if (L.map && u.fac === 0) { const t = [ri(10, MW - 10), ri(10, MH - 10)]; for (let yy = -16; yy <= 16; yy++) for (let xx = -16; xx <= 16; xx++) if (inMap(t[0] + xx, t[1] + yy) && xx * xx + yy * yy < 256) FOG.explored[ix(t[0] + xx, t[1] + yy)] = 1; }
      if (u.fac === 0) alert(0, `Your ${UDEF[u.type].name.toLowerCase()} searched the ruins and found ${L.text}.`, p.x + 1, p.y + 1, 'good');
      burstFx(p.x + 1, p.y + 1, '#f3cf6a', 14);
    }
    if (p.kind === 'shrine') {
      const near = new Set();
      for (const v of W.units) if (!v.dead && !v.aboard && v.fac !== BANDIT && !isNaval(v) && Math.abs(v.x - p.x - 1) < 3.5 && Math.abs(v.y - p.y - 1) < 3.5) near.add(v.fac);
      if (near.size === 1) {
        const f = [...near][0];
        if (f !== p.owner) {
          if (p.capFac !== f) { p.capFac = f; p.prog = 0; }
          p.prog += 0.5;
          if (p.prog >= 12) {
            const was = p.owner; p.owner = f; p.prog = 0;
            if (f === 0) alert(0, 'Your people now tend the shrine: +6 happiness while you hold it.', p.x + 1, p.y + 1, 'good');
            else if (was === 0) alert(0, `${FAC[f].name} has taken your shrine!`, p.x + 1, p.y + 1, 'bad');
            burstFx(p.x + 1, p.y, FAC[f].lite, 18);
          }
        }
      } else if (p.prog > 0) p.prog = Math.max(0, p.prog - 0.25);
    }
  }
}
const shrinesOf = i => (W.pois || []).filter(p => p.kind === 'shrine' && p.owner === i).length;

// ── bandits ────────────────────────────────────────────────────────────────
function banditTick(F) {
  if ((F.thinkT = (F.thinkT || 0) - DT) > 0) return;
  F.thinkT = 2;
  for (const c of W.blds) {
    if (c.dead || c.type !== 'camp') continue;
    const band = W.units.filter(u => !u.dead && u.camp === c.id);
    const max = 3 + W.diff + Math.min(3, Math.floor(W.t / 400));
    if ((c.spawnT -= 2) <= 0 && band.length < max) { c.spawnT = 40 - W.diff * 6; const u = spawnNear(c, 'bandit'); u.camp = c.id; u.guard = [u.x, u.y]; }
    // raid: hit the nearest outlying building of a town now and then
    c.raidT = (c.raidT === undefined ? 300 + rand() * 120 : c.raidT) - 2;
    if (c.raidT <= 0 && band.length >= 3) {
      c.raidT = 170 + rand() * 90;
      let best = null, bd = 34;
      for (const b of W.blds) { if (b.dead || b.fac === BANDIT || BDEF[b.type].wall || b.type === 'hall' || compAt(b.x, b.y) !== compAt(c.x, c.y)) continue; const d = dist(b.x, b.y, c.x, c.y); if (d < bd) { bd = d; best = b; } }
      if (best) {
        const raiders = band.filter(u => !u.target).slice(0, 3 + W.diff);
        orderGroup(raiders, 'amove', best.x + best.w / 2, best.y + best.h / 2, null, 'spread');
        raiders.forEach(u => { u.raidUntil = W.t + 70; });
        if (best.fac === 0) alert(0, 'Bandits are raiding your outskirts!', best.x, best.y, 'bad');
      }
    }
    for (const u of band) if (u.raidUntil && W.t > u.raidUntil && !u.target) { u.raidUntil = 0; orderGroup([u], 'move', c.x + 1.5, c.y + c.h + 1); }
  }
}
function onCampDestroyed(b, killerFac) {
  if (killerFac < 0 || !W.F[killerFac]) return;
  const F = W.F[killerFac]; F.res.gold = Math.min(F.res.gold + 200, Math.max(F.cap.gold, F.res.gold)); F.res.iron = Math.min(F.res.iron + 10, Math.max(F.cap.iron, F.res.iron));
  for (const u of W.units) if (u.camp === b.id && !u.dead) { u.camp = null; u.dying = 0.1; }
  if (killerFac === 0) alert(0, 'The bandit camp is burned! Their hoard is yours: +200 gold, +10 iron.', b.x + 1, b.y + 1, 'good');
}

// ── boats ──────────────────────────────────────────────────────────────────
// water tile beside a dock, for launching and landing catch
const dockGoal = b => (x, y) => waterAt(x, y) && x >= b.x - 1 && x <= b.x + b.w && y >= b.y - 1 && y <= b.y + b.h && map.bld[ix(x, y)] < 0;
function nearestDock(u) {
  let best = null, bd = 1e9;
  for (const b of W.blds) if (!b.dead && b.done && b.fac === u.fac && b.type === 'dock') { const d = dist(u.x, u.y, b.x + 1.5, b.y + 1); if (d < bd) { bd = d; best = b; } }
  return best;
}
function updateFishBoat(u) {
  u.moving = false; u.act = null;
  const F = W.F[u.fac], dock = nearestDock(u);
  if (!dock) { u.status = 'No dock'; return; }
  if (u.order && u.order.type === 'move') { if (goTo(u, 'm' + u.order.x + ',' + u.order.y, (x, y) => waterAt(x, y) && Math.hypot(x + 0.5 - u.order.x, y + 0.5 - u.order.y) < 1.6, u.order.x, u.order.y) || u.stuck > 6) { u.order = null; u.stuck = 0; } return; }
  if (u.catch >= 15 || (u.catch > 0 && u.tn < 0)) {
    if (goTo(u, 'dock' + dock.id, dockGoal(dock), dock.x + 1.5, dock.y + 1)) {
      const room = Math.max(0, F.cap.food - F.res.food), k = Math.min(room, u.catch);
      F.res.food += k; F.stats.gathered += k; u.catch -= k; u.path = null;
      u.status = u.catch > 0 ? 'Food storage full' : null;
      if (u.catch > 0) u.catch = 0;
    }
    if (u.stuck > 6) { u.stuck = 0; u.path = null; }
    return;
  }
  if (u.tn < 0 || !nodes[u.tn] || nodes[u.tn].amt <= 0) {
    u.tn = -1; let bd = 26;
    for (let i = 0; i < nodes.length; i++) { const n = nodes[i]; if (n.kind !== 'fish' || n.amt <= 0) continue; const d = dist(n.x, n.y, dock.x + 1, dock.y + 1); if (d < bd && compWaterOk(n, dock)) { bd = d; u.tn = i; } }
    if (u.tn < 0) { u.status = 'No fish near the dock'; return; }
  }
  const n = nodes[u.tn]; u.status = null;
  if (goTo(u, 'fish' + u.tn, nearTile(n.x, n.y), n.x + 0.5, n.y + 0.5)) {
    u.act = 'fish'; u.dir = n.x + 0.5 > u.x ? 1 : -1;
    u.workT = (u.workT || 0) + DT * F.mult * (F.hungry ? 0.8 : 1);
    if (u.workT >= 1.1) { u.workT = 0; n.amt--; u.catch = (u.catch || 0) + 1; if (n.amt <= 0) { removeNode(u.tn); u.tn = -1; } }
  }
  if (u.stuck > 6) { u.stuck = 0; if (n) n.bad = W.t + 30; u.tn = -1; }
}
const compWaterOk = () => true;
// passengers ride along; land units board by walking up to the boat
function boatSpace(t) { return UDEF[t.type].cap - (t.load || []).length; }
function tryBoard(u) {
  const t = byId(u.boardId);
  if (!t || t.dead || t.type !== 'transport' || t.fac !== u.fac) { u.boardId = null; if (u.order && u.order.type === 'board') u.order = null; return false; }
  if (dist(u.x, u.y, t.x, t.y) <= 2.3) {
    if (boatSpace(t) <= 0) { u.boardId = null; u.order = null; if (u.fac === 0) flash('That transport is full.'); return true; }
    t.load = t.load || []; t.load.push(u.id); u.aboard = t.id; u.boardId = null; u.order = null; u.target = null; u.path = null;
    if (u.type === 'villager') unassign(u);
    return true;
  }
  goTo(u, 'bd' + t.id + ':' + Math.floor(t.x) + ',' + Math.floor(t.y), (x, y) => landWalk(x, y) && Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y) <= 2.1, t.x, t.y);
  if (u.stuck > 8) { u.stuck = 0; u.boardId = null; u.order = null; if (u.fac === 0) flash('Those units can\'t reach the transport. Bring it closer to the shore.'); }
  return true;
}
function landingGoal(tx, ty, r = 3.2) { return (x, y) => waterAt(x, y) && map.bld[ix(x, y)] < 0 && Math.hypot(x + 0.5 - tx, y + 0.5 - ty) <= r && [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].some(([dx, dy]) => landWalk(x + dx, y + dy)); }
function unloadAll(t, then) {
  const out = [];
  for (const id of t.load || []) {
    const p = byId(id); if (!p) continue;
    let spot = null;
    for (let r = 1; r < 5 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r; dx++) { const x = Math.floor(t.x) + dx, y = Math.floor(t.y) + dy; if (landWalk(x, y) && !out.some(o => Math.floor(o.x) === x && Math.floor(o.y) === y && out.length < 6)) { spot = [x, y]; break; } }
    if (!spot) continue;
    p.aboard = null; p.x = spot[0] + 0.5; p.y = spot[1] + 0.5; p.path = null; p.goalKey = null; p.order = null; p.guard = [p.x, p.y]; p.stuck = 0;
    out.push(p);
  }
  t.load = (t.load || []).filter(id => { const p = byId(id); return p && p.aboard === t.id; });
  if (then && out.length) { const army = out.filter(isSoldier); if (army.length) { orderGroup(army, 'amove', then[0], then[1]); army.forEach(u => { u.lastAmove = { t: W.t, fac: then[2] }; }); } }
  return out.length;
}
function updateTransport(u) {
  u.moving = false;
  for (const id of u.load || []) { const p = byId(id); if (p) { p.x = u.x; p.y = u.y; } }
  const o = u.order; if (!o) return;
  if (o.type === 'move') { if (goTo(u, 'm' + o.x + ',' + o.y + ':' + o.n, (x, y) => waterAt(x, y) && Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) < 1.8, o.x, o.y) || u.stuck > 6) { u.order = null; u.stuck = 0; } return; }
  if (o.type === 'unload') {
    if (goTo(u, 'ul' + o.x + ',' + o.y + ':' + o.n, landingGoal(o.x, o.y, o.r || 3.2), o.x, o.y)) {
      const n = unloadAll(u, o.then); u.order = null; u.path = null;
      if (u.fac === 0) alert(0, n ? `Transport unloaded ${n} passenger${n > 1 ? 's' : ''}.` : 'Nowhere to land here.');
    } else if (u.stuck > 6) { u.stuck = 0; o.r = (o.r || 3.2) + 3; if (o.r > 14) { u.order = null; if (u.fac === 0) flash('The transport can\'t find a landing near there.'); } }
  }
}
function sinkBoat(u, killerFac) {
  for (const id of u.load || []) { const p = byId(id); if (p) { p.aboard = null; killUnit(p, killerFac); } }
  u.load = [];
  for (let i = 0; i < 10; i++) W.fx.push({ kind: 'p', x: u.x, y: u.y - 0.2, vx: rr(-1.5, 1.5), vy: rr(-2.5, -0.5), t: rr(0.5, 1), col: '#7a5028' });
}

// ── AI at sea ──────────────────────────────────────────────────────────────
// ferry an army across the water to a rival on another island
function aiFerry(F, hall, soldiers, targetF) {
  const A = F.ai, dock = W.blds.find(b => b.fac === F.i && b.type === 'dock' && b.done && !b.dead);
  const boats = W.units.filter(u => u.fac === F.i && u.type === 'transport' && !u.dead);
  if (!dock) return 'nodock';
  if (!boats.length) { if (!dock.queue.some(q => q.unit === 'transport') && canAfford(F, UDEF.transport.cost)) queueUnit(dock, 'transport'); return 'noboat'; }
  const th = W.blds.find(b => b.fac === targetF.i && b.type === 'hall' && !b.dead); if (!th) return 'none';
  const fz = A.ferry;
  if (!fz) {
    const land = soldiers.filter(u => !isNaval(u) && !u.target && !u.aboard && compAt(u.x, u.y) === compAt(hall.x, hall.y));
    const need = Math.min(8, Math.max(4, Math.round(land.length * 0.7)));
    if (land.length < need) return 'wait';
    const boat = boats.find(b => !(b.load || []).length && !b.order) || boats[0];
    const send = land.slice(0, Math.min(UDEF.transport.cap, land.length));
    // park the boat at the dock, then everyone walks aboard
    PF_FAC = F.i; NAV = 1; const p = findPath(boat.x, boat.y, dockGoal(dock), dock.x + 1, dock.y + 1, 4000); NAV = 0; PF_FAC = -1;
    if (p && p.length) { boat.order = { type: 'move', x: p[p.length - 1][0] + 0.5, y: p[p.length - 1][1] + 0.5, n: W.t }; }
    A.ferry = { boat: boat.id, ids: send.map(u => u.id), t: W.t, target: targetF.i, state: 'board' };
    return 'started';
  }
  const boat = byId(fz.boat);
  if (!boat) { A.ferry = null; return 'lost'; }
  if (fz.state === 'board') {
    if (boat.order) return 'parking';
    const left = fz.ids.map(byId).filter(u => u && !u.dead && !u.aboard);
    for (const u of left) if (!u.boardId) { u.boardId = boat.id; u.order = { type: 'board', n: W.t }; }
    if (!left.length || W.t - fz.t > 60) {
      for (const u of left) { u.boardId = null; u.order = null; }
      if (!(boat.load || []).length) { A.ferry = null; return 'nobody'; }
      boat.order = { type: 'unload', x: th.x + th.w / 2, y: th.y + th.h / 2, n: W.t, r: 8, then: [th.x + th.w / 2, th.y + th.h / 2, targetF.i] };
      fz.state = 'sail'; fz.t = W.t;
      if (targetF.i === 0) alert(0, `${FAC[F.i].name}'s war boats are putting to sea!`, boat.x, boat.y, 'bad');
    }
    return 'boarding';
  }
  if (fz.state === 'sail') {
    if (!boat.order || W.t - fz.t > 180) {
      if ((boat.load || []).length) unloadAll(boat, [th.x + th.w / 2, th.y + th.h / 2, targetF.i]);
      boat.order = { type: 'move', x: dock.x + 1, y: dock.y + 1, n: W.t }; A.ferry = null; A.wave++;
      return 'landed';
    }
    return 'sailing';
  }
  return 'idle';
}
// fishing fleets and a warship or two to guard home waters
function aiNavy(F, mine) {
  const dock = mine.find(b => b.type === 'dock' && b.done);
  if (!dock || dock.queue.length) return;
  const have = t => W.units.filter(u => u.fac === F.i && u.type === t && !u.dead).length;
  if (have('fishboat') < 3 && canAfford(F, UDEF.fishboat.cost) && F.res.wood > 160) queueUnit(dock, 'fishboat');
  else if (map.type === 'islands' && unitAgeOk(F, 'warship') && have('warship') < 2 && canAfford(F, UDEF.warship.cost) && F.res.gold > 120) queueUnit(dock, 'warship');
}
