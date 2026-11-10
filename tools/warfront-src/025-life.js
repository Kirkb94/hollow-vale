// 025 villager lives: names, ages, skills, homes, meals, warmth, sickness, happiness, births, settlers, deer.
const AGE_SECS = 30, CHILD_AGE_SECS = 15;        // seconds per year of life (children grow up faster)
const ADULT_AGE = 14, ELDER_AGE = 55;

function lifeInit(u, age, surname) {
  u.first = FIRST[ri(0, FIRST.length - 1)];
  u.surname = surname || SUR[ri(0, SUR.length - 1)];
  u.age = age; u.ageT = rand() * (age < ADULT_AGE ? CHILD_AGE_SECS : AGE_SECS);
  u.stage = age < ADULT_AGE ? 'child' : age >= ELDER_AGE ? 'elder' : 'adult';
  u.skill = {}; u.happy = 62; u.meals = ['food']; u.fed = true; u.ale = false;
  u.home = null; u.inside = null; u.sick = 0; u.coldT = 0; u.dieT = 0; u.unhappyT = 0; u.mood = {};
}
const fullName = u => `${u.first} ${u.surname}`;
const skillLv = (u, k) => { const xp = (u.skill && u.skill[k]) || 0; let l = 0; while (l < 5 && xp >= SKILL_LV[l + 1]) l++; return l; };
function moodMult(u) { const h = u.happy; return h < 30 ? 0.7 : h < 45 ? 0.85 : h < 70 ? 1 : h < 85 ? 1.1 : 1.2; }
function workMult(u, key) { return (1 + 0.1 * skillLv(u, key)) * moodMult(u) * (u.stage === 'elder' ? 0.75 : 1); }
function addXp(u, key, dt) { u.skill[key] = (u.skill[key] || 0) + dt; const before = u.lvSeen && u.lvSeen[key] || 0, now = skillLv(u, key); if (now > before) { u.lvSeen = u.lvSeen || {}; u.lvSeen[key] = now; if (u.fac === 0 && now >= 3) alert(0, `${fullName(u)} is now a ${['', '', '', 'skilled', 'expert', 'master'][now]} at ${SKILL_NAME[key].toLowerCase()}.`); } }
const isHome = b => b && (b.type === 'house' || b.type === 'hall') && b.done && !b.dead;
const residents = b => W.units.filter(u => !u.dead && u.home === b.id);

// ── per-tick routine hooks used by updateVillager ──────────────────────────
// returns true when the villager is busy with life (sleeping, sick, child) and should skip work
function lifeRoutine(u) {
  const C = W.cal;
  const home = u.home ? byId(u.home) : null;
  if (home && !isHome(home)) { u.home = null; if (u.inside === home.id) u.inside = null; }
  // the town bell: everyone indoors, adults into the Town Hall and towers to man the windows
  if (W.F[u.fac].bell) {
    if (u.inside) return true;
    let s = u.shelter ? byId(u.shelter) : null;
    if (!s || s.dead || !s.done) { s = u.stage === 'child' ? home : pickShelter(u, home); u.shelter = s ? s.id : null; }
    if (!s) return false;
    u.act = null; u.fleeT = 0;
    if (goTo(u, 'shelter' + s.id, nearRect(s.x, s.y, s.w, s.h), s.x + s.w / 2, s.y + s.h / 2)) { u.inside = s.id; u.path = null; }
    if (u.stuck > 6) { u.stuck = 0; u.inside = s.id; }
    return true;
  }
  const wantHome = (C.night || u.sick > 0 || (u.stage === 'child' && C.tod > 0.65)) && home;
  if (u.inside) {
    if (!wantHome) { u.inside = null; const t = doorTile(home || byId(u.inside)); if (t) { u.x = t[0] + 0.5; u.y = t[1] + 0.5; } u.path = null; u.goalKey = null; }
    else return true;
  }
  if (wantHome) {
    // finish the trip first: drop off whatever they're carrying before heading home for the night
    if (u.carry && u.carry.n > 0 && !(u.sick > 0) && u.stage !== 'child') {
      u.nightDrop = (u.nightDrop || 0) + DT;
      if (u.nightDrop < 12) { u.act = null; deliver(u, W.F[u.fac]); return true; }
      u.carry = null; u.path = null; u.goalKey = null;            // storage full or unreachable: leave it and go home
    }
    u.nightDrop = 0;
    u.act = null;
    if (goTo(u, 'home' + home.id, nearRect(home.x, home.y, home.w, home.h), home.x + home.w / 2, home.y + home.h / 2)) { u.inside = home.id; u.path = null; }
    if (u.stuck > 6) { u.stuck = 0; u.inside = home.id; }
    return true;
  }
  if (u.stage === 'child') { childPlay(u, home); return true; }
  return false;
}
function doorTile(b) { if (!b) return null; for (let x = b.x; x < b.x + b.w; x++) if (walkable(x, b.y + b.h)) return [x, b.y + b.h]; return nearestWalkable(b.x + b.w / 2, b.y + b.h); }
function childPlay(u, home) {
  // children run about near home (or the hall) in little hops
  if (!u.path || u.pathI >= u.path.length) {
    if (rand() < 0.02) {
      const c = home || W.blds.find(b => b.fac === u.fac && b.type === 'hall');
      if (!c) return;
      const tx = c.x + ri(-3, c.w + 2), ty = c.y + ri(-2, c.h + 3);
      if (walkable(tx, ty) && pathBudget > 0) { pathBudget--; u.path = findPath(u.x, u.y, atTile(tx, ty), tx, ty, 400) || []; u.pathI = 0; u.goalKey = 'play'; }
    }
  } else moveStep(u, speedOf(u) * 0.8);
}

// ── deer ───────────────────────────────────────────────────────────────────
function spawnHerd(cx, cy, n) {
  for (let i = 0; i < n; i++) {
    const [tx, ty] = nearestWalkable(cx + rr(-2, 2), cy + rr(-2, 2));
    W.deer.push({ id: W.nextId++, x: tx + 0.5, y: ty + 0.5, hx: cx, hy: cy, tx: tx + 0.5, ty: ty + 0.5, wait: rr(0, 4), dir: 1, anim: 0, buck: rand() < 0.3, dead: false });
  }
}
function herdSpot() {
  for (let k = 0; k < 60; k++) {
    const x = ri(6, MW - 7), y = ri(6, MH - 7);
    if (!walkable(x, y) || W.blds.some(b => dist(b.x, b.y, x, y) < 11)) continue;
    let trees = 0; for (let dy = -4; dy <= 4; dy++) for (let dx = -4; dx <= 4; dx++) { const n = inMap(x + dx, y + dy) ? map.node[ix(x + dx, y + dy)] : -1; if (n >= 0 && nodes[n].kind === 'tree') trees++; }
    if (trees >= 6) return [x, y];
  }
  return null;
}
function updateDeer() {
  for (const d of W.deer) {
    if (d.dead) continue;
    d.moving = false;
    // flee from anyone close
    let threat = null;
    for (const u of W.units) if (!u.inside && Math.abs(u.x - d.x) < 3 && Math.abs(u.y - d.y) < 3) { threat = u; break; }
    if (threat && !d.flee) { const a = Math.atan2(d.y - threat.y, d.x - threat.x); d.tx = clamp(d.x + Math.cos(a) * 5, 1, MW - 2); d.ty = clamp(d.y + Math.sin(a) * 5, 1, MH - 2); d.flee = 1.5; }
    if (d.flee) d.flee = Math.max(0, d.flee - DT);
    const dx = d.tx - d.x, dy = d.ty - d.y, dd = Math.hypot(dx, dy);
    if (dd < 0.1) {
      if ((d.wait -= DT) <= 0) { d.wait = rr(2, 7); d.tx = clamp(d.hx + rr(-5, 5), 1, MW - 2); d.ty = clamp(d.hy + rr(-5, 5), 1, MH - 2); }
    } else {
      const sp = (d.flee ? 3.2 : 0.9) * DT, nx = d.x + dx / dd * Math.min(sp, dd), ny = d.y + dy / dd * Math.min(sp, dd);
      if (walkable(Math.floor(nx), Math.floor(ny))) { d.x = nx; d.y = ny; d.moving = true; d.anim += sp * 3; d.dir = dx > 0 ? 1 : -1; }
      else { d.tx = d.x; d.ty = d.y; d.wait = 0.5; }
    }
  }
  W.deer = W.deer.filter(d => !d.dead);
  if ((W.deerT -= DT) <= 0) {
    W.deerT = 30;
    if (W.cal.season !== 3 && W.deer.length < 34) { const s = herdSpot(); if (s) spawnHerd(s[0], s[1], ri(2, 4)); }
    for (const n of nodes) if (n.kind === 'carcass' && n.amt > 0 && W.t > n.rot) removeNode(nodes.indexOf(n));
  }
}

// ── faction-wide life tick ─────────────────────────────────────────────────
function lifeTick(F) {
  const C = W.cal;
  const people = W.units.filter(u => !u.dead && u.fac === F.i && !u.dying);
  const vill = people.filter(u => u.type === 'villager');
  // housing: give the homeless a bed
  if ((F.homeT = (F.homeT || 0) - DT) <= 0) {
    F.homeT = 2;
    const homes = W.blds.filter(b => b.fac === F.i && isHome(b));
    const used = new Map(); for (const u of vill) if (u.home) used.set(u.home, (used.get(u.home) || 0) + 1);
    for (const u of vill) {
      if (u.home) continue;
      let best = null, bd = 1e9;
      for (const h of homes) { if ((used.get(h.id) || 0) >= BDEF[h.type].pop) continue; const d = dist(h.x, h.y, u.x, u.y) + (h.type === 'hall' ? 6 : 0); if (d < bd) { bd = d; best = h; } }
      if (best) { u.home = best.id; used.set(best.id, (used.get(best.id) || 0) + 1); if (!best.family && best.type === 'house') best.family = u.surname; }
    }
  }
  // aging
  for (const u of vill) {
    if ((u.ageT += DT) < (u.stage === 'child' ? CHILD_AGE_SECS : AGE_SECS)) continue;
    u.ageT = 0; u.age++;
    if (u.stage === 'child' && u.age >= ADULT_AGE) { u.stage = 'adult'; if (F.i === 0) alert(0, `${fullName(u)} has come of age and is ready to work.`); }
    else if (u.stage === 'adult' && u.age >= ELDER_AGE) u.stage = 'elder';
    else if (u.age >= 65 && rand() < 0.08) { if (F.i === 0) alert(0, `Old ${fullName(u)} passed away at ${u.age}.`); F.grief = (F.grief || 0) + 1; killUnit(u, -1, true); }
  }
  // meals every 40 s: variety matters (wheat, bread, meat), ale on the side
  if ((F.eatT += DT) >= 40) {
    F.eatT = 0;
    let unfed = 0;
    for (const u of people) {
      const need = u.stage === 'child' ? 0.5 : 1;
      const opts = ['bread', 'meat', 'food'].filter(t => F.res[t] >= need);
      if (!opts.length) { u.fed = false; unfed++; continue; }
      const recent = u.meals || [];
      opts.sort((a, b) => (recent.lastIndexOf(a) - recent.lastIndexOf(b)) || (F.res[b] - F.res[a]));
      const t = opts[0]; F.res[t] -= need;
      if (u.type === 'villager') { u.meals = recent.concat(t).slice(-3); u.fed = true; if (u.stage !== 'child' && F.res.ale >= 0.5) { F.res.ale -= 0.5; u.ale = true; } else u.ale = false; }
    }
    const was = F.hungry; F.hungry = people.length > 0 && unfed / people.length > 0.25;
    if (F.hungry && !was) alert(F.i, 'Your people are starving! Work slows to half. Build farms or hunt.', undefined, undefined, 'bad');
    for (const r of ALLRES) if (F.res[r] < 0) F.res[r] = 0;
  }
  // warmth every 10 s: in winter every occupied home burns firewood
  if ((F.warmT = (F.warmT || 0) - DT) <= 0) {
    F.warmT = 10;
    const winter = C.season === 3;
    for (const b of W.blds) if (b.fac === F.i && isHome(b)) {
      if (!winter) { b.warm = true; continue; }
      const n = vill.filter(u => u.home === b.id).length;
      if (!n) { b.warm = false; continue; }
      const burn = (b.type === 'hall' ? 1.5 : 1) * BIOME[bioAt(b.x, b.y)].fire;
      if (F.res.firewood >= burn) { F.res.firewood -= burn; b.warm = true; } else b.warm = false;
    }
    let froze = 0, newlySick = 0;
    for (const u of vill) {
      const home = u.home ? byId(u.home) : null;
      u.warm = !winter || (home && home.warm);
      if (!u.warm) { u.coldT += 10; if (u.coldT >= 40 && !u.sick && rand() < (u.stage === 'adult' ? 0.15 : 0.3)) { u.sick = 60; newlySick++; } }
      else u.coldT = Math.max(0, u.coldT - 10);
      if (u.sick) {
        if (u.warm && u.fed) { u.sick = Math.max(0, u.sick - 10); u.dieT = 0; }
        else if ((u.dieT += 10) >= 90) { froze++; F.grief = (F.grief || 0) + 1; killUnit(u, -1); }
      }
    }
    if (F.i === 0 && newlySick) alert(0, `${newlySick} villager${newlySick > 1 ? 's have' : ' has'} fallen ill from the cold. Make firewood!`, undefined, undefined, 'warn');
    if (F.i === 0 && froze) alert(0, `${froze} villager${froze > 1 ? 's' : ''} froze to death.`, undefined, undefined, 'bad');
    if (winter && F.res.firewood <= 0 && F.i === 0 && (!F.fwAlert || W.t - F.fwAlert > 30)) { F.fwAlert = W.t; alert(0, 'Out of firewood! Homes are going cold. Build a Firewood Yard.', undefined, undefined, 'bad'); }
  }
  // happiness every 2 s
  if ((F.moodT = (F.moodT || 0) - DT) <= 0) {
    F.moodT = 2;
    F.grief = Math.max(0, (F.grief || 0) - 2 / 60);
    const raided = F.attackedAt && W.t - F.attackedAt.t < 60;
    let sum = 0, n = 0;
    for (const u of vill) {
      const m = {};
      const v = new Set(u.meals).size;
      if (!u.fed) m.hungry = -30; else if (v >= 2) m.variety = v === 2 ? 10 : 20;
      if (u.ale) m.ale = 8;
      m.home = u.home ? 5 : -15;
      if (C.season === 3) m.warm = u.warm ? 5 : -25;
      if (raided) m.raids = -10;
      if (F.grief > 0.3) m.grief = -Math.min(15, Math.round(F.grief * 3));
      if (u.sick) m.sick = -10;
      const sh = shrinesOf(F.i); if (sh) m.shrine = Math.min(12, sh * 6);
      if (F.relics) m.relic = Math.min(12, F.relics * 4);
      if (F.i !== 0) m.home += 3;                                    // AI towns are a touch more stoic
      const target = clamp(50 + Object.values(m).reduce((a, b) => a + b, 0), 0, 100);
      u.happy += (target - u.happy) * 0.15; u.mood = m;
      if (u.stage !== 'child') { sum += u.happy; n++; }
      // deeply unhappy adults pack up and leave
      if (u.stage !== 'child' && u.happy < 25) { u.unhappyT += 2; if (u.unhappyT > 60) { if (F.i === 0) alert(0, `${fullName(u)} has had enough and left town.`, u.x, u.y, 'warn'); F.stats.left = (F.stats.left || 0) + 1; u.left = true; killUnit(u, -1, true); } }
      else u.unhappyT = Math.max(0, u.unhappyT - 2);
    }
    F.happy = n ? sum / n : 50;
  }
  // births: happy couples with room have children (not in winter)
  if ((F.birthT = (F.birthT || rand() * 30) - DT) <= 0) {
    F.birthT = 30;
    if (C.season !== 3 && F.growth) for (const h of W.blds) {
      if (h.fac !== F.i || h.type !== 'house' || !h.done) continue;
      const res = vill.filter(u => u.home === h.id);
      const adults = res.filter(u => u.stage === 'adult' && !u.sick);
      const avg = res.reduce((a, u) => a + u.happy, 0) / Math.max(1, res.length);
      const food = F.res.food + F.res.bread + F.res.meat;
      if (adults.length >= 2 && res.length < BDEF.house.pop && F.pop < F.popCap && avg >= 55 && food >= people.length && rand() < 0.3 + (avg - 55) / 100) {
        const [tx, ty] = doorTile(h); const c = spawnUnit(F.i, 'villager', tx + 0.5, ty + 0.5, 0, h.family || adults[0].surname);
        c.home = h.id; F.pop++;
        if (F.i === 0) alert(0, `A baby is born to the ${c.surname} family!`);
      }
    }
  }
  // settlers: a happy town draws newcomers to the Town Hall
  if ((F.settleT = (F.settleT || 0) - DT) <= 0) {
    F.settleT = 15;
    const hall = W.blds.find(b => b.fac === F.i && b.type === 'hall' && b.done);
    const free = F.popCap - F.pop;
    if (hall && F.growth && free >= 1 && C.season !== 3 && !F.hungry && rand() < clamp(((F.happy || 50) - 40) / 30, 0, 0.9)) {
      const k = Math.min(free, rand() < 0.4 ? 2 : 1), sur = SUR[ri(0, SUR.length - 1)], names = [];
      for (let i = 0; i < k; i++) { const u = spawnNear(hall, 'villager'); lifeInit(u, ri(16, 34), sur); u.happy = 60; names.push(u.first); F.pop++; }
      if (F.i === 0) alert(0, `Settlers arrive: ${names.join(' and ')} ${sur}.`);
    }
  }
}
