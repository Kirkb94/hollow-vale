// 027 military depth: combat math, stances, formations, morale & routing, the Lord, siege, walls, town bell.
const STANCES = { aggressive: { name: 'Aggressive', leash: 18, tip: 'Chase enemies a long way.' }, defensive: { name: 'Defensive', leash: 6, tip: 'Fight nearby, then return to post.' }, hold: { name: 'Hold Ground', leash: 0, tip: 'Never leave position; morale losses halved.' } };
const FORMATIONS = { line: 'Line', wedge: 'Wedge', spread: 'Spread' };
const isWall = b => b && b.kind === 'bld' && BDEF[b.type].wall;
const isSiege = u => !!UDEF[u.type].siege;
const moraleUnit = u => UDEF[u.type].mil && !isSiege(u) && u.type !== 'hero' && !UDEF[u.type].elite && !UDEF[u.type].naval;

// ── combat math ────────────────────────────────────────────────────────────
function heroLevel(u) { if (UDEF[u.type].elite) return 2 + (u.star || 0); const xp = u.xp || 0; let l = 1; for (const t of [120, 320, 600, 1000]) if (xp >= t) l++; return l; }
function attackOf(u, t) {
  const d = UDEF[u.type], F = W.F[u.fac];
  let a = d.atk;
  const archy = d.ranged && !d.siege && !d.naval;
  if (d.mil && !d.siege && !archy && F.ups.has('forging')) a += 2;
  if (archy && F.ups.has('fletching')) a += 2;
  if (u.type === 'hero') a += (heroLevel(u) - 1) * 2;
  if ((u.type === 'hero' || d.mounted || d.elite) && hasDoc(F, 'chivalry')) a += 2;
  if (d.siege && hasDoc(F, 'siegecraft')) a *= 1.35;
  if (u.auraT > W.t) a += u.auraAtk;
  let arm;
  if (t.kind === 'bld') {
    arm = BDEF[t.type].wall ? 4 : 2;
    if (d.ranged && u.type !== 'catapult') a *= 0.35;
    if (u.type === 'villager') a *= 0.5;
    if (!d.siege && BDEF[t.type].wall) a *= 0.6;               // swords make slow work of walls
  } else {
    const td = UDEF[t.type];
    if (d.bonus && d.bonus[t.type]) a += d.bonus[t.type];
    arm = (d.ranged && td.parm !== undefined ? td.parm : td.arm) + (td.mil && !td.siege && W.F[t.fac].ups.has('mail') ? 2 : 0) + (t.auraT > W.t ? t.auraArm : 0);
    if (u.type === 'catapult') a *= 0.5;
  }
  a += hvAtkBonus(u, t);
  return Math.max(1, Math.round(a - arm));
}
const rangeOf = u => UDEF[u.type].range + (UDEF[u.type].ranged && !UDEF[u.type].siege && !UDEF[u.type].naval && W.F[u.fac].ups.has('fletching') ? 1 : 0) + (UDEF[u.type].ranged && onHill(u) ? 1 : 0);
function hurt(t, dmg, srcFac, src) {
  if (t.dead) return;
  if (t.kind === 'unit') { if (t.shieldT > W.t) dmg *= 0.7; if (t.rout > 0) dmg *= 1.25; dmg = hvBeforeHit(t, dmg, src); }
  t.hp -= dmg; hvAfterHit(t, dmg, src); t.hitT = 0.15; diploHit(srcFac, t.fac, dmg);
  if (src && src.type === 'hero') { src.xp = (src.xp || 0) + dmg * 0.5 + (t.hp <= 0 ? 25 : 0); heroCheckLevel(src); }
  if (t.kind === 'unit') {
    t.combatT = W.t;
    if (moraleUnit(t)) t.morale = Math.max(0, (t.morale ?? 100) - dmg / t.maxHp * 40 * (t.stance === 'hold' ? 0.5 : 1) * docMorale(W.F[t.fac]));
    if (t.type === 'villager' && t.fleeT <= 0) t.scanT = 0;
    if (isSoldier(t) && !isSiege(t) && !t.target && !t.rout && src && !src.dead && src.kind === 'unit' && !(t.order && t.order.type === 'move') && (t.stance !== 'hold' || surfDist(t, src) <= rangeOf(t) + 0.5)) t.target = src.id;
    if (t.fac === 0 && (!W.lastHitAlert || W.t - W.lastHitAlert > 12)) { W.lastHitAlert = W.t; alert(0, 'Your people are under attack!', t.x, t.y, 'bad'); }
    if (t.hp <= 0 && !hvUndying(t)) { hvKillXP(src, t); killUnit(t, srcFac); }
  } else {
    if (t.fac === 0 && !BDEF[t.type].wall && (!t.alertT || W.t - t.alertT > 12)) { t.alertT = W.t; alert(0, `Your ${BDEF[t.type].name} is under attack!`, t.x + t.w / 2, t.y + t.h / 2, 'bad'); }
    if (t.fac === 0 && BDEF[t.type].wall && (!W.wallAlert || W.t - W.wallAlert > 15)) { W.wallAlert = W.t; alert(0, 'Your walls are under attack!', t.x, t.y, 'bad'); }
    W.F[t.fac].attackedAt = { x: t.x + t.w / 2, y: t.y + t.h / 2, t: W.t };
    if (t.hp <= 0) destroyBuilding(t, srcFac);
  }
}
function strike(u, t) {
  const dmg = attackOf(u, t);
  if (u.type === 'catapult') {
    const [tx, ty] = entCenter(t), dd = dist(u.x, u.y, tx, ty);
    W.projs.push({ rock: true, x: u.x, y: u.y - 0.5, sx: u.x, sy: u.y - 0.5, tx: tx + rr(-0.6, 0.6), ty: ty + rr(-0.6, 0.6), t: 0, dur: dd / 6 + 0.4, fac: u.fac, src: u.id });
    u.swing = 0.6; return;
  }
  if (UDEF[u.type].ranged) W.projs.push({ x: u.x, y: u.y - 0.3, tid: t.id, dmg, fac: u.fac, src: u.id, spd: 10 });
  else { hurt(t, dmg, u.fac, u); u.swing = 0.25; }
}
function updateRock(p) {
  p.t += DT; const k = Math.min(1, p.t / p.dur);
  p.x = lerp(p.sx, p.tx, k); p.y = lerp(p.sy, p.ty, k) - Math.sin(k * Math.PI) * (1.2 + p.dur);
  if (k < 1) return;
  p.dead = true;
  const src = byId(p.src) || null, mul = hasDoc(W.F[p.fac], 'siegecraft') ? 1.35 : 1;
  for (const e of W.units) if (!e.dead && foe(e.fac, p.fac) && !e.inside && !e.aboard && dist(e.x, e.y, p.tx, p.ty) < 1.3) hurt(e, Math.max(2, Math.round(21 * mul - UDEF[e.type].arm)), p.fac, src);
  for (const b of W.blds) if (!b.dead && foe(b.fac, p.fac) && Math.hypot(clamp(p.tx, b.x, b.x + b.w) - p.tx, clamp(p.ty, b.y, b.y + b.h) - p.ty) < 0.8) hurt(b, Math.round(42 * mul), p.fac, src);
  burstFx(p.tx, p.ty, '#8c847a', 14); if (W.fac0see && FOG.vis[ix(clamp(Math.floor(p.tx), 0, MW - 1), clamp(Math.floor(p.ty), 0, MH - 1))]) W.shake = 3;
}
function enemyNear(u, r) {
  const d = UDEF[u.type];
  if (d.noAttack) return null;
  let best = null, bd = 1e9;
  const reachBoats = d.ranged || d.naval;
  if (!d.bldOnly) for (const e of W.units) {
    if (e.dead || !foe(e.fac, u.fac) || e.dying || e.inside || e.aboard) continue;
    if (!reachBoats && isNaval(e)) continue;
    if (d.naval && !d.ranged) continue;
    const dx = e.x - u.x, dy = e.y - u.y; if (Math.abs(dx) > r || Math.abs(dy) > r) continue;
    const dd = Math.hypot(dx, dy) - (isSoldier(e) ? 1.5 : 0) + (u.type === 'catapult' ? 4 : 0); if (dd < bd && dd <= r) { bd = dd; best = e; }
  }
  if (best && u.type !== 'catapult') return best;
  for (const b of W.blds) {
    if (b.dead || !foe(b.fac, u.fac) || b.dying) continue;
    if (Math.abs(b.x - u.x) > r + 4 || Math.abs(b.y - u.y) > r + 4) continue;
    const dd = surfDist(u, b) + (BDEF[b.type].wall && !d.siege ? 4 : 2); if (dd < bd && dd <= r + 2) { bd = dd; best = b; }
  }
  return best;
}
function chaseGoal(u, t) {
  const R = Math.max(0.9, rangeOf(u) - 0.4);
  if (t.kind === 'bld') return UDEF[u.type].ranged ? (x, y) => walkable(x, y) && Math.hypot(x + 0.5 - clamp(x + 0.5, t.x, t.x + t.w), y + 0.5 - clamp(y + 0.5, t.y, t.y + t.h)) <= R : nearRect(t.x, t.y, t.w, t.h);
  return (x, y) => walkable(x, y) && Math.hypot(x + 0.5 - t.x, y + 0.5 - t.y) <= Math.max(1.1, R);
}
// stuck against a wall while marching on the enemy? hit whatever enemy structure is in the way
function breakObstacle(u) {
  let best = null, bd = 3.2;
  for (const b of W.blds) { if (b.dead || !foe(b.fac, u.fac) || Math.abs(b.x - u.x) > 5 || Math.abs(b.y - u.y) > 5) continue; const d = surfDist(u, b); if (d < bd) { bd = d; best = b; } }
  if (best) { u.target = best.id; u.stuck = 0; u.path = null; return true; }
  return false;
}

// ── soldiers ───────────────────────────────────────────────────────────────
function updateSoldier(u) {
  if (hvUnitTick(u)) { u.cd -= DT; return; }
  u.moving = false; u.cd -= DT; if (u.swing) u.swing = Math.max(0, u.swing - DT);
  const d = UDEF[u.type];
  if (u.stance === undefined) u.stance = 'aggressive';
  if (u.morale === undefined) u.morale = 100;
  // rout: run for home, ignore orders, then rally
  if (u.rout > 0) {
    u.rout -= DT; u.target = null; u.order = null; u.act = null;
    const hall = W.blds.find(b => b.fac === u.fac && b.type === 'hall' && !b.dead);
    if (hall) goTo(u, 'rout', nearRect(hall.x, hall.y, hall.w, hall.h, 3), hall.x + 2, hall.y + 2);
    if (u.rout <= 0) { u.morale = 45; u.guard = [u.x, u.y]; u.path = null; u.goalKey = null; }
    return;
  }
  if (moraleUnit(u) && u.morale < 15) {
    u.rout = 7; u.path = null; u.goalKey = null; u.target = null; u.order = null;
    if (u.fac === 0 && (!W.routAlert || W.t - W.routAlert > 10)) { W.routAlert = W.t; alert(0, 'Your soldiers are breaking and running!', u.x, u.y, 'warn'); }
    return;
  }
  if (u.boardId && tryBoard(u)) return;
  if (u.type === 'siegetower') return updateSiegeTower(u);
  const o = u.order;
  let t = u.target ? byId(u.target) : null;
  if (t && (t.dead || t.dying || t.inside)) { t = null; u.target = null; if (o && o.type === 'attack') { u.order = null; u.guard = [u.x, u.y]; } }
  if (o && o.type === 'move') {
    if (goTo(u, 'm' + o.x + ',' + o.y + ':' + o.n, (x, y) => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) <= 0.8 + (o.spread || 0) || (u.stuck > 3 && walkable(x, y) && Math.hypot(x - o.x, y - o.y) < 4), o.x, o.y)) { u.order = null; u.guard = [u.x, u.y]; u.stuck = 0; }
    if (u.stuck > 8) { u.order = null; u.guard = [u.x, u.y]; u.stuck = 0; }
    return;
  }
  if (!t && (u.scanT -= DT) <= 0) {
    u.scanT = 0.4;
    const e = enemyNear(u, d.sight + (u.stance === 'aggressive' ? 0 : -1));
    if (e && !(u.stance === 'hold' && surfDist(u, e) > rangeOf(u) + 0.5)) { u.target = e.id; t = e; if (!u.guard) u.guard = [u.x, u.y]; }
  }
  if (t) {
    const dd = surfDist(u, t), R = rangeOf(u) + (t.kind === 'bld' ? 0.6 : 0.35);
    if (d.minRange && dd < d.minRange && t.kind === 'unit') { u.target = null; return; }   // too close for a catapult
    if (dd <= R) {
      u.path = null; u.dir = entCenter(t)[0] > u.x ? 1 : -1; u.act = 'fight'; u.combatT = W.t;
      if (u.cd <= 0) { strike(u, t); u.cd = d.cd * hvCdMul(u); }
    } else {
      const forced = o && (o.type === 'attack' || o.type === 'amove');
      const leash = STANCES[u.stance].leash;
      if (!forced && (u.stance === 'hold' || (u.guard && dist(u.x, u.y, u.guard[0], u.guard[1]) > leash))) { u.target = null; return; }
      const key = 't' + t.id + ':' + (t.kind === 'unit' ? Math.floor(t.x) + ',' + Math.floor(t.y) : '');
      goTo(u, key, chaseGoal(u, t), entCenter(t)[0], entCenter(t)[1]);
      if (u.stuck >= 3 && forced && breakObstacle(u)) return;
      if (u.stuck > 6) { u.stuck = 0; u.target = null; }
    }
    return;
  }
  if (o && o.type === 'amove') {
    if (goTo(u, 'a' + o.x + ',' + o.y + ':' + o.n, (x, y) => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) <= 2.5 || (u.stuck > 3 && walkable(x, y) && Math.hypot(x - o.x, y - o.y) < 6), o.x, o.y)) { u.order = null; u.guard = [u.x, u.y]; }
    if (u.stuck >= 3 && breakObstacle(u)) return;
    if (u.stuck > 8) { u.order = null; u.guard = [u.x, u.y]; u.stuck = 0; }
    return;
  }
  if (u.stance !== 'hold' && u.guard && dist(u.x, u.y, u.guard[0], u.guard[1]) > 1.5) goTo(u, 'g' + u.guard.join(','), (x, y) => Math.hypot(x + 0.5 - u.guard[0], y + 0.5 - u.guard[1]) < 1.6, u.guard[0], u.guard[1]);
  if (u.stuck > 6) { u.guard = [u.x, u.y]; u.stuck = 0; }
  // AI lords use their abilities in a fight
  if (u.type === 'hero' && W.F[u.fac].ai && u.combatT > W.t - 2) heroAutoCast(u);
}
function updateSiegeTower(u) {
  if (u.deployed) { const w = byId(u.deployed); if (w && !w.dead) return; u.deployed = null; }
  // look for an enemy wall tile right beside us and lean against it
  for (const b of W.blds) {
    if (b.dead || !foe(b.fac, u.fac) || !BDEF[b.type].wall || Math.abs(b.x - u.x) > 2 || Math.abs(b.y - u.y) > 2) continue;
    if (surfDist(u, b) <= 1.1 && b.done) {
      u.deployed = b.id; map.breach[ix(b.x, b.y)] = u.fac + 1; u.path = null; u.order = null;
      if (u.fac === 0) alert(0, 'Siege tower in place: your troops can climb the wall here.', b.x, b.y, 'good');
      if (b.fac === 0) alert(0, 'An enemy siege tower has breached your wall!', b.x, b.y, 'bad');
      return;
    }
  }
  const o = u.order;
  if (o && (o.type === 'move' || o.type === 'amove')) {
    if (goTo(u, 'st' + o.x + ',' + o.y + ':' + o.n, (x, y) => Math.hypot(x + 0.5 - o.x, y + 0.5 - o.y) <= 1.5, o.x, o.y)) u.order = null;
    if (u.stuck > 8) { u.order = null; u.stuck = 0; }
  }
}

// ── formations ─────────────────────────────────────────────────────────────
function formationSlots(n, form) {
  const out = [];
  if (form === 'wedge') { for (let k = 0; out.length < n; k++) for (let j = 0; j <= k && out.length < n; j++) out.push([(j - k / 2) * 1.0, k * 0.9]); }
  else { const sp = form === 'spread' ? 1.9 : 0.95, wdt = form === 'spread' ? Math.ceil(Math.sqrt(n)) : Math.max(3, Math.ceil(Math.sqrt(n * 2.5))), cols = Math.min(wdt, n);
    for (let i = 0; i < n; i++) { const row = Math.floor(i / wdt), inRow = Math.min(wdt, n - row * wdt); out.push([((i % wdt) - (inRow - 1) / 2) * sp, row * sp]); } }
  return out;
}
function orderGroup(us, type, x, y, targetId, form) {
  const n = W.t;
  us.forEach(u => { u.path = null; u.goalKey = null; u.stuck = 0; });
  if (type === 'attack') { us.forEach(u => { u.order = { type: 'attack', id: targetId, n }; u.target = targetId; u.march = 0; }); return; }
  form = form || 'line';
  const cx = us.reduce((a, u) => a + u.x, 0) / us.length, cy = us.reduce((a, u) => a + u.y, 0) / us.length;
  const ang = Math.atan2(y - cy, x - cx), fx = Math.cos(ang), fy = Math.sin(ang), sx = -fy, sy = fx;
  // melee and the Lord up front, archers and engines behind
  const rank = u => u.type === 'hero' || UDEF[u.type].elite ? 1 : UDEF[u.type].ranged ? 3 : isSiege(u) ? 4 : 0;
  const sorted = us.slice().sort((a, b) => rank(a) - rank(b));
  const slots = formationSlots(sorted.length, form);
  const march = us.length > 1 ? Math.min(...us.map(u => UDEF[u.type].speed)) : 0;
  sorted.forEach((u, i) => {
    const [side, back] = slots[i];
    u.order = { type, x: clamp(x + sx * side - fx * back, 1, MW - 2), y: clamp(y + sy * side - fy * back, 1, MH - 2), n, spread: form === 'spread' ? 0.6 : 0 };
    u.target = null; u.guard = null; u.march = march;
  });
}

// ── morale, auras and the Lord ─────────────────────────────────────────────
function militaryTick(F) {
  if ((F.milT = (F.milT || 0) - DT) > 0) return;
  F.milT = 0.5;
  const hero = W.units.find(u => u.fac === F.i && (u.type === 'hero' || UDEF[u.type].elite) && !u.dead);
  const lvl = hero ? heroLevel(hero) : 0, rad = 6 + lvl;
  for (const u of W.units) {
    if (u.dead || u.fac !== F.i || !moraleUnit(u)) continue;
    if (u.morale === undefined) u.morale = 100;
    const nearHero = hero && dist(u.x, u.y, hero.x, hero.y) <= rad;
    if (nearHero) { u.auraT = W.t + 0.6; u.auraAtk = 1 + Math.floor(lvl / 2); u.auraArm = lvl >= 3 ? 2 : 1; }
    const fighting = u.combatT > W.t - 3;
    if (fighting) {
      let foes = 0, friends = 0;
      for (const o of W.units) { if (o.dead || o.inside || o.aboard || !UDEF[o.type].mil || Math.abs(o.x - u.x) > 6 || Math.abs(o.y - u.y) > 6) continue; if (ally(o.fac, u.fac)) friends++; else if (foe(o.fac, u.fac)) foes++; }
      if (foes > friends * 1.5) u.morale -= (u.stance === 'hold' ? 1.5 : 3);
    } else u.morale += 2;
    if (nearHero) u.morale += 2.5;
    u.morale = clamp(u.morale, 0, 100);
  }
  // town bell for AI towns
  if (F.ai) aiBell(F);
}
function onUnitDeath(u, killerFac) {
  if (u.deployed) { const w = byId(u.deployed); if (w) map.breach[ix(w.x, w.y)] = 0; }
  if (!UDEF[u.type].mil) return;
  const heroDied = u.type === 'hero' || !!UDEF[u.type].elite;
  for (const o of W.units) {
    if (o.dead || !moraleUnit(o)) continue;
    const dd = dist(o.x, o.y, u.x, u.y), k = o.stance === 'hold' ? 0.5 : 1;
    const km = k * docMorale(W.F[o.fac]);
    if (o.fac === u.fac) { if (dd < 6) o.morale -= 10 * km; if (heroDied) o.morale -= (dd < 12 ? 40 : 15) * km; }
    else if (o.fac === killerFac && dd < 6) o.morale = Math.min(100, o.morale + 6);
  }
  if (heroDied) {
    W.F[u.fac].heroDeadT = W.t;
    if (u.fac === 0) alert(0, `${u.name || UDEF[u.type].name} has fallen! Your troops are shaken.`, u.x, u.y, 'bad');
    else if (killerFac === 0) alert(0, `You slew ${FAC[u.fac].name}'s ${u.name || UDEF[u.type].name}! Their army wavers.`, u.x, u.y, 'good');
  }
}
function heroCheckLevel(h) {
  const l = heroLevel(h);
  if (l > (h.lvl || 1)) { h.lvl = l; h.maxHp += 40; h.hp = Math.min(h.maxHp, h.hp + 60); if (h.fac === 0) alert(0, `${h.name} reached level ${l}! Aura grows stronger.`, h.x, h.y, 'good'); burstFx(h.x, h.y - 0.5, '#f3cf6a', 14); }
}
function heroCanTrain(F) { return !W.units.some(u => u.fac === F.i && u.type === 'hero' && !u.dead) && !W.blds.some(b => b.fac === F.i && b.queue.some(q => q.unit === 'hero')) && (!F.heroDeadT || W.t - F.heroDeadT > 90); }
function nameHero(u) { u.name = `${rand() < 0.5 ? 'Lord' : 'Lady'} ${FIRST[ri(0, FIRST.length - 1)]} ${SUR[ri(0, SUR.length - 1)]}`; u.lvl = 1; u.xp = 0; u.cdRally = 0; u.cdShield = 0; }
function heroAbility(h, ab) {
  const lvl = heroLevel(h), rad = 6 + lvl;
  const allies = W.units.filter(o => !o.dead && o.fac === h.fac && UDEF[o.type].mil && dist(o.x, o.y, h.x, h.y) <= rad);
  if (ab === 'rally') {
    if (W.t < h.cdRally) return false;
    h.cdRally = W.t + 60;
    for (const o of allies) { if (o.morale !== undefined) o.morale = Math.min(100, o.morale + 35); o.rout = 0; o.boostT = W.t + 10; }
    W.fx.push({ kind: 'ring', x: h.x, y: h.y, r: rad, t: 1, col: '243,207,106' });
  } else {
    if (W.t < h.cdShield) return false;
    h.cdShield = W.t + 75;
    for (const o of allies) o.shieldT = W.t + 8;
    W.fx.push({ kind: 'ring', x: h.x, y: h.y, r: rad, t: 1, col: '134,170,245' });
  }
  return true;
}
function heroAutoCast(h) {
  const allies = W.units.filter(o => !o.dead && o.fac === h.fac && moraleUnit(o) && dist(o.x, o.y, h.x, h.y) < 8);
  if (allies.length >= 3 && allies.some(o => o.morale < 45)) heroAbility(h, 'rally');
  else if (allies.length >= 4) heroAbility(h, 'shield');
}

// ── garrison & the town bell ───────────────────────────────────────────────
const garrisonOf = b => W.units.filter(u => u.inside === b.id && !u.dead && u.stage !== 'child').length;
function pickShelter(u, home) {
  let best = null, bd = 26;
  for (const b of W.blds) {
    if (b.fac !== u.fac || b.dead || !b.done || !BDEF[b.type].shelter) continue;
    const used = W.units.filter(o => (o.inside === b.id || o.shelter === b.id) && !o.dead && o !== u).length;
    if (used >= BDEF[b.type].shelter) continue;
    const d = dist(u.x, u.y, b.x + b.w / 2, b.y + b.h / 2); if (d < bd) { bd = d; best = b; }
  }
  return best || home;
}
function ringBell(F, on) {
  if (F.bell === on) return;
  F.bell = on; F.bellT = W.t;
  for (const u of W.units) if (u.fac === F.i) { u.shelter = null; if (!on && u.inside) { const b = byId(u.inside); if (b && b.type !== 'house' && !(W.cal.night && u.home === b.id)) { u.inside = null; const t = doorTile(b); if (t) { u.x = t[0] + 0.5; u.y = t[1] + 0.5; } } } }
  if (F.i === 0) alert(0, on ? 'The town bell rings! Villagers are taking shelter.' : 'All clear: villagers return to work.', undefined, undefined, on ? 'warn' : 'good');
}
function aiBell(F) {
  const hall = W.blds.find(b => b.fac === F.i && b.type === 'hall' && !b.dead); if (!hall) return;
  let foes = 0, mine = 0;
  for (const o of W.units) { if (o.dead || !UDEF[o.type].mil || dist(o.x, o.y, hall.x + 2, hall.y + 2) > 15) continue; if (o.fac === F.i) mine++; else if (foe(o.fac, F.i)) foes++; }
  if (!F.bell && foes >= 3 && foes > mine * 1.2) ringBell(F, true);
  else if (F.bell && foes === 0 && W.t - F.bellT > 20) ringBell(F, false);
}
function buildingShoot(b, F, d) {
  b.atkCd -= DT;
  if (b.atkCd > 0) return;
  const fl = b.type === 'tower' && F.ups.has('fletching');
  const R = d.attack.range + (fl ? 1 : 0), cx0 = b.x + b.w / 2, cy0 = b.y + b.h / 2;
  const foes = [];
  for (const e of W.units) { if (e.dead || !foe(e.fac, b.fac) || e.dying || e.inside || e.aboard) continue; const dd = dist(e.x, e.y, cx0, cy0); if (dd < R) foes.push([dd, e]); }
  if (!foes.length) { b.atkCd = 0.3; return; }
  foes.sort((a, c) => a[0] - c[0]);
  const g = garrisonOf(b), arrows = Math.min(6, 1 + (b.type === 'tower' ? g : Math.floor(g / 3)));
  for (let k = 0; k < arrows; k++) {
    const e = foes[k % foes.length][1], td = UDEF[e.type];
    W.projs.push({ x: cx0 + rr(-0.4, 0.4), y: cy0 - (b.type === 'tower' ? 1.6 : 1), tid: e.id, dmg: Math.max(1, d.attack.dmg + (fl ? 2 : 0) - (td.parm !== undefined ? td.parm : td.arm)), fac: b.fac, src: -1, spd: 11 });
  }
  b.atkCd = d.attack.cd;
}

// ── wall lines ─────────────────────────────────────────────────────────────
function placeWallLine(F, type, tiles) {
  let n = 0;
  for (const [x, y] of tiles) { if (!canAfford(F, BDEF[type].cost)) break; if (!canPlace(F.i, type, x, y)) continue; pay(F, BDEF[type].cost); placeBuilding(F.i, type, x, y); n++; }
  return n;
}
