// 03 rival town AI: scripted build order, staffing, training, defense, timed attacks.
const AI_ORDER = ['lumber', 'farm', 'house', 'lumber', 'farm', 'woodyard', 'sawmill', 'mine', 'house', 'hunter', 'dock', 'farm', 'granary', 'house', 'barracks',
  'mill', 'farm', 'house', 'mine:ore', 'smelter', 'bakery', 'cartshed', 'house', 'storehouse', 'market', 'farm', 'mine:gold', 'brewery', 'house', 'smith',
  'barracks', 'stable', 'workshop', 'shrine', 'tower', 'house', 'farm', 'woodyard', 'house', 'tower', 'house', 'farm', 'sawmill', 'house', 'lumber', 'house', 'tower'];
function aiInit(F) {
  F.ai = { step: 0, fails: 0, thinkT: 2 + F.i, nextAttack: [540, 420, 330][W.diff] + rand() * 60, wave: 0, army: [], gather: null, mix: ['spear', 'sword', 'archer'] };
}
function aiTick(F) {
  const A = F.ai;
  if ((A.thinkT -= DT) > 0) return;
  A.thinkT = 1.5;
  const hall = W.blds.find(b => b.fac === F.i && b.type === 'hall' && !b.dead);
  if (!hall) return;
  const mine = W.blds.filter(b => b.fac === F.i && !b.dead);
  const sites = mine.filter(b => !b.done).length;
  const villagers = W.units.filter(u => u.fac === F.i && u.type === 'villager' && !u.dead).length;
  const soldiers = W.units.filter(u => u.fac === F.i && isSoldier(u) && !u.dead && !isNaval(u) && !u.aboard);

  // 1) emergencies first: food, then housing
  const farms = mine.filter(b => b.type === 'farm').length, farmBuilding = mine.some(b => b.type === 'farm' && !b.done);
  const edible = F.res.food + F.res.bread + F.res.meat;
  const fm = BIOME[bioAt(hall.x, hall.y)].farm;
  const foodLow = F.hungry || farms < Math.ceil((F.pop + 4) / (4.5 * fm)) || (edible < F.pop * 1.5 && farms * 4 < F.pop + 8);
  const housesBuilding = mine.some(b => b.type === 'house' && !b.done);
  const yards = mine.filter(b => b.type === 'woodyard').length, homes = mine.filter(b => b.type === 'house').length + 1;
  const coldSoon = W.cal.season >= 2 && F.res.firewood < homes * 12;
  // urgent wishes first; each one falls through if it can't be afforded or placed
  const wants = [];
  if (coldSoon && yards < 1 + Math.floor(homes / 8) && !mine.some(b => b.type === 'woodyard' && !b.done)) wants.push('woodyard');
  if (foodLow && !farmBuilding && mine.some(b => b.type === 'lumber')) wants.push('farm');      // never spend the seed wood before a mill exists
  if (F.res.food >= F.cap.food - 20 && !mine.some(b => b.type === 'granary' && !b.done)) wants.push('granary');
  if (F.pop >= F.popCap - 2 && !housesBuilding && F.popCap < 150) wants.push('house');
  const P = PERSONAS[F.persona] || PERSONAS.builder;
  if (W.t > 300 && !mine.some(b => b.type === 'mine')) wants.push('mine');
  if (W.t > 540 && F.res.wood < 70 && mine.filter(b => b.type === 'lumber').length < 5 && !mine.some(b => b.type === 'lumber' && !b.done)) wants.unshift('lumber');   // forests thinning out
  if (ageOf(F) >= 1 && W.t > 480 && mine.filter(b => b.type === 'tower').length < P.towers && F.res.stone > 180 && !mine.some(b => b.type === 'tower' && !b.done)) wants.push('tower');
  // ages: save up when the next build-order step is locked behind one
  const nextT = A.step < AI_ORDER.length ? AI_ORDER[A.step].split(':')[0] : null;
  A.saving = (nextT && !ageOk(F, nextT)) || A.step >= AI_ORDER.length ? aiAge(F, hall) : false;
  if (((nextT && !ageOk(F, nextT)) || A.step >= AI_ORDER.length) && AGES[ageOf(F) + 1]) {   // a building the next age needs went missing: rebuild it
    const miss = AGES[ageOf(F) + 1].needs.find(t => !mine.some(b => b.type === t));
    if (miss && ageOk(F, miss)) wants.push(miss);
  }
  let built = false;
  for (const t of wants) if (canAfford(F, BDEF[t].cost) && aiBuild(F, hall, t)) { built = true; break; }
  if (!built && sites < 2 && A.step < AI_ORDER.length) {
    const [type, opt] = AI_ORDER[A.step].split(':');
    if (!ageOk(F, type)) { /* waiting on the next age */ }
    else if (BDEF[type].req && !hasDone(F.i, BDEF[type].req)) { if (!mine.some(b => b.type === BDEF[type].req)) A.step++; }
    else if (canAfford(F, BDEF[type].cost)) { const b = aiBuild(F, hall, type); if (b && opt) b.ore = opt; if (b || ++A.fails > 4) { A.step++; A.fails = 0; } }
  } else if (!built && A.step >= AI_ORDER.length && sites < 2) {
    // late game: turn surplus into production and defenses instead of letting it rot in storage
    const nB = mine.filter(b => b.type === 'barracks').length;
    const lackB = ['shrine', 'stable', 'workshop'].find(t => !mine.some(b => b.type === t) && ageOk(F, t) && HV_KEYS.some(k => UDEF[k].fac === F.hvfac && UDEF[k].bld === t) && canAfford(F, BDEF[t].cost));
    if (lackB) aiBuild(F, hall, lackB);
    else if (F.res.wood > 350 && nB < 4 && canAfford(F, BDEF.barracks.cost)) aiBuild(F, hall, 'barracks');
    else if (F.res.stone > 400 && mine.filter(b => b.type === 'tower').length < 4 && canAfford(F, BDEF.tower.cost)) aiBuild(F, hall, 'tower');
    else if (F.res.wood > 250 && farms * 5 < F.pop + 10) aiBuild(F, hall, 'farm');
    else if (F.res.wood > 300 && F.res.food > 200 && !mine.some(b => b.type === 'mill')) aiBuild(F, hall, 'mill');
  }
  // balance stone/gold between camps
  const camps = mine.filter(b => b.type === 'mine' && b.done).sort((a, b) => a.id - b.id);
  const needIron = mine.some(b => b.type === 'smelter');
  const ac = A.saving && AGES[ageOf(F) + 1] ? AGES[ageOf(F) + 1].cost : null;
  const lack = ac ? [needIron && (ac.iron || 0) > F.res.iron && F.res.ore < 40 ? 'ore' : null, (ac.gold || 0) > F.res.gold ? 'gold' : null].filter(Boolean) : [];
  const plan = lack.length && camps.length ? [...lack, 'stone', 'gold', 'ore'].filter((v, i, a) => a.indexOf(v) === i) : camps.length === 1 ? [F.res.stone < 120 ? 'stone' : needIron && F.res.ore < 60 ? 'ore' : F.res.gold < F.res.stone ? 'gold' : 'stone']
    : camps.length === 2 ? ['stone', needIron && F.res.ore < F.res.gold + 40 ? 'ore' : 'gold'] : ['stone', 'gold', 'ore'];
  camps.forEach((c, k) => { const o = plan[k] || 'stone'; if (c.ore !== o) { c.ore = o; for (const u of workersOf(c)) u.tn = -1; } });
  F.growth = villagers < 38;

  // 3) train an army once the economy is rolling
  const reserve = A.step < AI_ORDER.length ? 80 : 0;
  for (const b of mine) {
    if (!b.done || !BDEF[b.type].trains || b.type === 'market' || b.type === 'workshop' || b.type === 'dock' || b.queue.length >= 2) continue;
    if (villagers < 12 && W.t < 600) continue;
    if (F.hungry && soldiers.length > villagers * 0.6) continue;           // don't starve the town for more troops
    const opts = (trainsFor(b) || []).filter(t => UDEF[t] && unitAgeOk(F, t) && !(UDEF[t].elite && elitesAlive(F.i, t)));
    if (!opts.length) continue;
    const pick = aiPickUnit(F, opts);
    const cost = UDEF[pick].cost;
    const ac = A.saving && AGES[ageOf(F) + 1] ? AGES[ageOf(F) + 1].cost : null;
    if (ac && Object.entries(cost).some(([r, n]) => ac[r] && F.res[r] < n + ac[r]) && soldiers.length >= 4) continue;
    // never train into the next meal: keep a food reserve of one meal per person
    if (Object.entries(cost).every(([r, n]) => F.res[r] >= n + (r === 'wood' || r === 'stone' ? reserve : r === 'food' ? (W.t > 840 ? F.pop * 0.5 : F.pop) + (W.cal.season >= 2 ? F.pop : 0) : 0))) queueUnit(b, pick);
  }
  // a town with a market buys its way out of hunger
  const mk = mine.find(b => b.type === 'market' && b.done);
  if (mk && edible < F.pop * 1.2 && F.res.gold >= marketPrice(F, 'food', true) + 20) marketTrade(F, 'food', true);
  if (mk && A.saving && AGES[ageOf(F) + 1]) for (const [r, n] of Object.entries(AGES[ageOf(F) + 1].cost)) if (r !== 'gold' && F.res[r] < n && F.res.gold >= marketPrice(F, r, true) + (AGES[ageOf(F) + 1].cost.gold || 0)) { marketTrade(F, r, true); break; }
  for (const b of mine) if (b.type === 'market' && b.done && !b.queue.length && W.units.filter(u => u.fac === F.i && u.type === 'caravan').length < P.caravans && F.res.food > F.pop + 60) queueUnit(b, 'caravan');
  // a Lord to lead the army, and siege engines once the town can afford them
  aiNavy(F, mine);
  const shop = mine.find(b => b.type === 'workshop' && b.done);
  if (shop && !shop.queue.length) {
    const have = t => soldiers.filter(u => u.type === t).length;
    const want = have('ram') < 1 ? 'ram' : have('catapult') < 1 + (W.diff > 1 ? 1 : 0) ? 'catapult' : have('siegetower') < 1 && rand() < 0.3 ? 'siegetower' : null;
    if (want && canAfford(F, UDEF[want].cost)) queueUnit(shop, want);
    else if (rand() < 0.5) { const sh = trainsFor(shop).filter(t => UDEF[t].hv && unitAgeOk(F, t)); if (sh.length) { const p = aiPickUnit(F, sh); if (canAfford(F, UDEF[p].cost) && F.res.food > F.pop + 60) queueUnit(shop, p); } }
  }
  // 4) research when rich
  for (const b of mine) {
    if (!b.done || b.queue.length) continue;
    for (const up of researchAt(b.type)) if (!F.ups.has(up) && F.res.food > 300 && canAfford(F, UPGRADES[up].cost)) { queueUpgrade(b, up); break; }
  }
  // 5) defend: if something of ours was hit recently, send everyone not already marching
  if (F.attackedAt && W.t - F.attackedAt.t < 6) {
    const home = soldiers.filter(u => !u.order || u.order.type !== 'amove' || dist(u.x, u.y, hall.x, hall.y) < 20);
    const idle = home.filter(u => !u.target);
    if (idle.length) orderGroup(idle, 'amove', F.attackedAt.x, F.attackedAt.y);
  } else for (const O of W.F) {                              // help an ally whose town is under attack nearby
    if (O.i === F.i || !O.alive || !ally(F.i, O.i) || !O.attackedAt || W.t - O.attackedAt.t > 6 || dist(O.attackedAt.x, O.attackedAt.y, hall.x, hall.y) > 45) continue;
    const idle = soldiers.filter(u => !u.target && !u.order && !u.lastAmove).slice(0, Math.ceil(soldiers.length * 0.6));
    if (idle.length >= 2) { orderGroup(idle, 'amove', O.attackedAt.x, O.attackedAt.y); if (O.i === 0 && (!F.helpT || W.t - F.helpT > 60)) { F.helpT = W.t; alert(0, `Your ally ${FAC[F.i].name} sends troops to help!`, undefined, undefined, 'good'); } }
    break;
  }
  // 6) attack waves: size each wave against the target's actual defenses
  if (W.t > A.nextAttack && !A.passive) {
    const targetF = aiPickTarget(F, hall);
    const th0 = targetF && W.blds.find(b => b.fac === targetF.i && b.type === 'hall' && !b.dead);
    if (targetF && th0 && compAt(th0.x, th0.y) !== compAt(hall.x, hall.y)) {
      const r = aiFerry(F, hall, soldiers, targetF);
      if (r === 'landed' || r === 'nodock' || r === 'nobody') A.nextAttack = W.t + ((W.t > 840 ? 120 : [260, 200, 160][W.diff]) + rand() * 60) * P.attack * (r === 'landed' ? 0.6 : 0.3);
    } else if (targetF) {
      const defense = W.units.filter(u => u.fac === targetF.i && isSoldier(u) && !u.dead).length + W.blds.filter(b => b.fac === targetF.i && b.type === 'tower' && !b.dead).length * 2;
      const need = clamp(Math.round((4 + defense * 1.3) / P.army), 4, W.t > 840 ? 12 : Math.min(16, 5 + A.wave * 2 + W.diff));
      const send = soldiers.filter(u => !u.target).slice(0, Math.max(need, soldiers.length - (W.t > 840 ? 2 : 3)));
      if (send.length >= need) {
        const th = W.blds.find(b => b.fac === targetF.i && b.type === 'hall' && !b.dead);
        orderGroup(send, 'amove', th.x + th.w / 2, th.y + th.h / 2);
        send.forEach(u => { u.lastAmove = { t: W.t, fac: targetF.i }; });
        if (targetF.i === 0) alert(0, `${FAC[F.i].name} is marching on your town!`, send[0].x, send[0].y, 'bad');
        A.wave++; A.nextAttack = W.t + ((W.t > 840 ? 120 : [260, 200, 160][W.diff]) + rand() * 60) * P.attack;
      } else A.nextAttack = W.t + 20;
    } else A.nextAttack = W.t + 30;
  }
  // armies that finished marching keep pushing toward the target hall
  for (const u of soldiers) if (!u.order && !u.target && u.lastAmove && W.t - u.lastAmove.t < 420 && foe(F.i, u.lastAmove.fac)) {
    const th = W.blds.find(b => b.fac === u.lastAmove.fac && b.type === 'hall' && !b.dead);
    if (th && dist(u.x, u.y, th.x, th.y) > 4) orderGroup([u], 'amove', th.x + th.w / 2, th.y + th.h / 2);
  }
}
function aiPickTarget(F, hall) {
  const alive = W.F.filter(o => o.alive && !o.bandit && o.i !== F.i && foe(F.i, o.i));
  if (!alive.length) return null;
  // prefer the player a bit, otherwise the closest rival
  // closest rival, discounted heavily when its army is small (finish off the weak)
  const scored = alive.map(o => {
    const h = W.blds.find(b => b.fac === o.i && b.type === 'hall' && !b.dead);
    const army = W.units.filter(u => u.fac === o.i && isSoldier(u) && !u.dead).length + W.blds.filter(b => b.fac === o.i && b.type === 'tower' && !b.dead).length * 2;
    return { o, d: h ? dist(h.x, h.y, hall.x, hall.y) * (o.i === 0 ? 0.8 : 1) + army * 3 + rand() * 20 : 1e9 };
  });
  scored.sort((a, b) => a.d - b.d);
  return scored[0].d < 1e9 ? scored[0].o : null;
}
function aiBuild(F, hall, type) {
  if (!ageOk(F, type)) return null;
  let score = null;
  const nearNodes = kinds => (x, y) => {
    let best = 1e9;
    for (const n of nodes) if (n.amt > 0 && kinds.includes(n.kind) && Math.abs(n.x - x) < 14 && Math.abs(n.y - y) < 14) best = Math.min(best, dist(n.x, n.y, x + 1.5, y + 1.5));
    return best * 2.2;
  };
  if (type === 'lumber') score = nearNodes(['tree']);
  if (type === 'mine') score = nearNodes(['stone', 'gold', 'iron']);
  const r = type === 'dock' ? [4, 20] : type === 'lumber' || type === 'mine' || type === 'hunter' || type === 'market' ? [4, 18] : type === 'tower' ? [5, 11] : type === 'farm' ? [3, 18] : [3, 14];
  const reach = reachFrom(F.i, hall);
  const spot = findSpot(F.i, type, hall, r[0], r[1], score, reach) || findSpot(F.i, type, hall, r[1], r[1] + 10, score, reach);   // crowded? look further out
  if (!spot) return null;
  pay(F, BDEF[type].cost);
  return placeBuilding(F.i, type, spot[0], spot[1]);
}

// pick from the faction roster: stronger hires more often, cheap fodder when poor
function aiPickUnit(F, opts) {
  const ok = opts.filter(t => canAfford(F, UDEF[t].cost)), pool = ok.length ? ok : opts;
  let tot = 0; const w = pool.map(t => { const x = UDEF[t].elite ? 6 : 1 + UDEF[t].hire * 0.6; tot += x; return x; });
  let r = rand() * tot; for (let i = 0; i < pool.length; i++) if ((r -= w[i]) <= 0) return pool[i];
  return pool[0];
}
