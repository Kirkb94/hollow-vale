// 028 the realm: ages, doctrines (a forked tech tree), rival personalities and diplomacy.

// ── ages ───────────────────────────────────────────────────────────────────
const AGES = [
  { name: 'Village Age', short: 'I' },
  { name: 'Town Age', short: 'II', cost: { food: 250, wood: 150, gold: 75 }, time: 40, needs: ['granary', 'sawmill'],
    desc: 'Unlocks the Smelter, Brewery, Market, Blacksmith, Watchtower, Stone Wall, Cart upgrades and naming a Lord. Pick a second doctrine.' },
  { name: 'Castle Age', short: 'III', cost: { food: 350, gold: 200, planks: 60, iron: 10 }, time: 60, needs: ['barracks', 'smelter'],
    desc: 'Unlocks the Stable (knights), the Siege Workshop and Chain Mail. Pick a third doctrine.' }
];
const AGE_OF = { smelter: 1, brewery: 1, market: 1, smith: 1, tower: 1, wall: 1, stable: 2, workshop: 2 };
AGE_OF.dock = 0;
const UNIT_AGE = { hero: 1, knight: 2, ram: 2, catapult: 2, siegetower: 2, warship: 1 };
const UP_AGE = { wheels: 1, mail: 2 };
const ageOf = F => F.age || 0;
const ageOk = (F, type) => ageOf(F) >= (AGE_OF[type] || 0);
const unitAgeOk = (F, type) => ageOf(F) >= (UNIT_AGE[type] || 0);
function ageBlock(F) {
  const n = ageOf(F) + 1, A = AGES[n];
  if (!A) return 'Already in the final age.';
  const missing = A.needs.filter(t => !hasDone(F.i, t));
  if (missing.length) return `Needs a finished ${missing.map(t => BDEF[t].name).join(' and ')}.`;
  return null;
}
function queueAge(hall) {
  const F = W.F[hall.fac], n = ageOf(F) + 1, A = AGES[n];
  if (!A || hall.queue.some(q => q.age)) return 'Already advancing.';
  const why = ageBlock(F); if (why) return why;
  if (!canAfford(F, A.cost)) return 'Not enough resources.';
  pay(F, A.cost); hall.queue.unshift({ age: n, t: A.time, total: A.time });
  return null;
}
function reachAge(F, n) {
  F.age = n;
  alert(F.i, `Your town enters the ${AGES[n].name}! Choose a new doctrine at the Town Hall.`, undefined, undefined, 'good');
  if (F.i !== 0) alert(0, `${FAC[F.i].name} has entered the ${AGES[n].name}.`);
  const hall = W.blds.find(b => b.fac === F.i && b.type === 'hall' && !b.dead); if (hall) burstFx(hall.x + 2, hall.y + 1, '#f3cf6a', 30);
  if (F.ai) aiPickDoctrine(F);
}

// ── doctrines: one of two at each age, forever ─────────────────────────────
const DOCTRINES = [
  [{ k: 'fields', name: 'Three-Field System', desc: 'Farmers harvest 25% faster.' },
   { k: 'forest', name: 'Forest Charter', desc: 'Woodcutters work 25% faster, quarrymen 15% faster.' }],
  [{ k: 'guilds', name: 'Merchant Guilds', desc: 'Workshops craft 25% faster, caravans earn 30% more and market prices improve by 15%.' },
   { k: 'militia', name: 'Town Militia', desc: 'Barracks train 35% faster; swordsmen, spearmen and archers get +10% health.' }],
  [{ k: 'chivalry', name: 'Chivalry', desc: 'Knights and your Lord get +25% health and +2 attack; your troops lose 30% less morale.' },
   { k: 'siegecraft', name: 'Siegecraft', desc: 'Siege engines deal 35% more damage and build 35% faster; walls and towers get +40% health.' }]
];
const DOC_BY_KEY = Object.fromEntries(DOCTRINES.flat().map((d, i) => [d.k, Object.assign(d, { tier: Math.floor(i / 2) })]));
const hasDoc = (F, k) => !!(F && F.docs && F.docs.includes(k));
function pickDoctrine(F, k) {
  const d = DOC_BY_KEY[k]; if (!d) return 'Unknown doctrine.';
  F.docs = F.docs || [];
  if (d.tier > ageOf(F)) return `Reach the ${AGES[d.tier].name} first.`;
  if (F.docs.some(x => DOC_BY_KEY[x].tier === d.tier)) return 'You already chose a doctrine for this age.';
  F.docs.push(k);
  if (k === 'siegecraft') for (const b of W.blds) if (b.fac === F.i && !b.dead && (BDEF[b.type].wall || b.type === 'tower')) { b.maxHp = Math.round(b.maxHp * 1.4); b.hp = Math.round(b.hp * 1.4); }
  if (k === 'militia' || k === 'chivalry') for (const u of W.units) if (u.fac === F.i && !u.dead) { const m = docHpMul(F, u.type); if (m > 1 && !u.docHp) { u.docHp = true; u.maxHp = Math.round(u.maxHp * m); u.hp = Math.round(u.hp * m); } }
  alert(F.i, `Doctrine adopted: ${d.name}.`, undefined, undefined, 'good');
  return null;
}
// effect helpers used across the sim
const docGather = (F, res) => (res === 'food' && hasDoc(F, 'fields') ? 1.25 : 1) * (res === 'wood' && hasDoc(F, 'forest') ? 1.25 : 1) * (res === 'stone' && hasDoc(F, 'forest') ? 1.15 : 1);
const docCraft = F => hasDoc(F, 'guilds') ? 1.25 : 1;
const docTrade = F => hasDoc(F, 'guilds') ? 1.3 : 1;
const isFoot = type => UDEF[type] && UDEF[type].hv && UDEF[type].bld === 'barracks';
const isHorse = type => UDEF[type] && (UDEF[type].mounted || UDEF[type].elite || type === 'hero');
const docTrain = (F, type) => (hasDoc(F, 'militia') && isFoot(type) ? 1.35 : 1) * (hasDoc(F, 'siegecraft') && UDEF[type] && UDEF[type].siege ? 1.35 : 1);
const docHpMul = (F, type) => (hasDoc(F, 'militia') && isFoot(type) ? 1.1 : 1) * (hasDoc(F, 'chivalry') && isHorse(type) ? 1.25 : 1);
const docMorale = F => hasDoc(F, 'chivalry') ? 0.7 : 1;

// ── rival personalities ────────────────────────────────────────────────────
const PERSONAS = {
  builder:  { name: 'Builder', title: 'Steward', base: 10, attack: 1.45, army: 0.85, docs: ['fields', 'guilds', 'siegecraft'], caravans: 2, towers: 4, tribute: 1,
    tip: 'Grows a big economy and fortifies with towers. Slow to attack, willing to keep the peace.' },
  warlord:  { name: 'Warlord', title: 'Warlord', base: -30, attack: 0.75, army: 1.25, docs: ['forest', 'militia', 'chivalry'], caravans: 1, towers: 1, tribute: 0.6,
    tip: 'Raids early and often with big armies. Hard to make peace with; tribute only buys a little goodwill.' },
  merchant: { name: 'Merchant', title: 'Magistrate', base: 25, attack: 1.2, army: 0.95, docs: ['fields', 'guilds', 'chivalry'], caravans: 4, towers: 2, tribute: 1.5,
    tip: 'Trades heavily and prefers gold to war. Tribute goes a long way with them.' }
};
function assignPersonas(nRivals, seedR) {
  const keys = Object.keys(PERSONAS), order = keys.slice().sort(() => seedR() - 0.5);
  for (let i = 1; i <= nRivals; i++) {
    const F = W.F[i]; F.persona = order[(i - 1) % keys.length];
    F.ruler = `${PERSONAS[F.persona].title} ${FIRST[Math.floor(seedR() * FIRST.length)]}`;
    if (F.ai) { const P = PERSONAS[F.persona]; F.ai.nextAttack *= P.attack;  }
  }
}

// ── diplomacy ──────────────────────────────────────────────────────────────
const REL_NAME = { war: 'At war', peace: 'At peace', ally: 'Allied' };
const foe = (a, b) => a !== b && (!W.rel || !W.rel[a] || W.rel[a][b] === 'war');
const ally = (a, b) => a === b || !!(W.rel && W.rel[a] && W.rel[a][b] === 'ally');
function initRealm(nFac, seed, nRivals = nFac - 1) {
  const R = mulberry32(seed + 77);
  W.rel = Array.from({ length: nFac }, () => Array(nFac).fill('war'));
  W.offers = []; W.diploT = 0;
  for (const F of W.F) { F.age = 0; F.docs = []; F.att = Array(nFac).fill(0); }
  assignPersonas(nRivals, R);
  for (const F of W.F) if (F.persona) for (let j = 0; j < nFac; j++) if (j !== F.i) F.att[j] = PERSONAS[F.persona].base + (j === 0 ? 0 : -15) + (R() * 20 - 10);
}
function setRel(a, b, s, quiet) {
  if (!W.rel || a === b || W.rel[a][b] === s) return;
  const was = W.rel[a][b];
  W.rel[a][b] = W.rel[b][a] = s;
  W.offers = W.offers.filter(o => !((o.from === a && o.to === b) || (o.from === b && o.to === a)));
  if (s !== 'war') {
    // stand down: drop targets and marches against the new friend
    for (const u of W.units) {
      if (u.dead || (u.fac !== a && u.fac !== b)) continue;
      const other = u.fac === a ? b : a, t = u.target ? byId(u.target) : null;
      if (t && t.fac === other) u.target = null;
      if (u.order && u.order.type === 'attack') { const o = byId(u.order.id); if (o && o.fac === other) { u.order = null; u.guard = [u.x, u.y]; } }
      if (u.lastAmove && u.lastAmove.fac === other) {
        u.lastAmove = null;
        const home = W.blds.find(x => x.fac === u.fac && x.type === 'hall' && !x.dead);
        if (W.F[u.fac].ai && home) orderGroup([u], 'move', home.x + 2, home.y + home.h + 2);
      }
    }
  }
  if (quiet) return;
  const nm = i => i === 0 ? 'You' : FAC[i].name;
  const txt = s === 'war' ? (was === 'ally' ? `${nm(a)} broke the alliance with ${nm(b) === 'You' ? 'you' : nm(b)} and declared war!` : `${nm(a)} declared war on ${nm(b) === 'You' ? 'you' : nm(b)}!`)
    : s === 'peace' ? (was === 'ally' ? `The alliance between ${nm(a)} and ${nm(b) === 'You' ? 'you' : nm(b)} has ended (now at peace).` : `${nm(a)} and ${nm(b) === 'You' ? 'you' : nm(b)} signed a peace treaty.`)
    : `${nm(a)} and ${nm(b) === 'You' ? 'you' : nm(b)} are now allies!`;
  alert(0, txt.replace(/^You and you/, 'You'), undefined, undefined, s === 'war' ? 'bad' : 'good');
}
const attOf = (F, j) => F.att ? F.att[j] || 0 : 0;
function bumpAtt(F, j, d) { if (!F || !F.att || F.i === j) return; F.att[j] = clamp(F.att[j] + d, -100, 100); }
// called from hurt(): being hit sours relations (rate-limited per pair)
function diploHit(srcFac, tFac, dmg) {
  if (srcFac < 0 || srcFac === tFac) return;
  const F = W.F[tFac]; if (!F || !F.att) return;
  F.att[srcFac] = Math.max(-100, F.att[srcFac] - Math.min(1.5, dmg * 0.02));
}
function armyOf(i) { return W.units.filter(u => u.fac === i && !u.dead && isSoldier(u)).length; }
// would AI faction F accept a proposal from j?
function wouldAccept(F, j, kind) {
  const P = PERSONAS[F.persona] || PERSONAS.builder, a = attOf(F, j);
  if (kind === 'peace') {
    if (F.persona === 'warlord' && armyOf(F.i) > armyOf(j) * 1.8 + 3) return false;
    return a >= (F.persona === 'warlord' ? 30 : 10);
  }
  if (kind === 'ally') return W.rel[F.i][j] === 'peace' && a >= 50;
  return false;
}
// player actions; return a message to show
function playerDiplo(i, act) {
  const F = W.F[i], P0 = W.F[0], rel = W.rel[0][i];
  if (!F || !F.alive) return 'They are gone.';
  if (act === 'gold' || act === 'food') {
    const n = act === 'gold' ? 100 : 200; if (P0.res[act] < n) return `You need ${n} ${act}.`;
    P0.res[act] -= n; F.res[act] = Math.min(F.res[act] + n, Math.max(F.cap[act], F.res[act]));
    bumpAtt(F, 0, (act === 'gold' ? 12 : 8) * (PERSONAS[F.persona] || PERSONAS.builder).tribute);
    return `${FAC[i].name} gladly accepts your tribute.`;
  }
  if ((act === 'peace' || act === 'ally') && W.t < 240) return `${FAC[i].name} won't treat with an upstart town yet. Try again after 4:00.`;
  if (act === 'peace') { if (rel !== 'war') return 'You are not at war.'; if (wouldAccept(F, 0, 'peace')) { setRel(0, i, 'peace'); return null; } bumpAtt(F, 0, -3); return `${FAC[i].name} refuses. Win their goodwill first (tribute, time, or a common enemy).`; }
  if (act === 'ally') { if (rel !== 'peace') return 'You must be at peace first.'; if (wouldAccept(F, 0, 'ally')) { setRel(0, i, 'ally'); return null; } return `${FAC[i].name} isn't ready for an alliance (goodwill 50+ needed).`; }
  if (act === 'war') {
    if (rel === 'war') return 'Already at war.';
    bumpAtt(F, 0, rel === 'ally' ? -60 : -40);
    for (const o of W.F) if (o.i > 0 && o.i !== i) bumpAtt(o, 0, rel === 'ally' ? -15 : -8);     // others mark the betrayal
    setRel(0, i, 'war'); return null;
  }
  if (act === 'leave') { if (rel !== 'ally') return 'Not allied.'; bumpAtt(F, 0, -20); setRel(0, i, 'peace'); return null; }
  return null;
}
function answerOffer(k, yes) {
  const o = W.offers[k]; if (!o) return;
  W.offers.splice(k, 1);
  const F = W.F[o.from];
  if (yes) setRel(0, o.from, o.kind === 'ally' ? 'ally' : 'peace');
  else { bumpAtt(F, 0, -6); alert(0, `You turned down ${FAC[o.from].name}'s offer.`); }
}
function propose(F, j, kind) {
  if (j === 0) {
    if (W.offers.some(o => o.from === F.i && o.kind === kind) || W.t - (F.offerT || -1e9) < 180) return;
    F.offerT = W.t;
    W.offers.push({ from: F.i, to: 0, kind, t: W.t });
    alert(0, `${FAC[F.i].name} offers ${kind === 'ally' ? 'an alliance' : 'peace'}. Open Diplomacy to answer.`, undefined, undefined, 'good');
  } else if (W.F[j].ai && wouldAccept(W.F[j], F.i, kind)) setRel(F.i, j, kind === 'ally' ? 'ally' : 'peace');
}
// every few seconds: attitudes drift, AIs make and break treaties
function realmTick() {
  if (!W.rel || (W.diploT -= DT) > 0) return;
  W.diploT = 5;
  W.offers = W.offers.filter(o => W.t - o.t < 60 && W.F[o.from].alive && W.rel[0][o.from] !== (o.kind === 'ally' ? 'ally' : 'peace'));
  const alive = W.F.filter(F => F.alive && !F.bandit);
  for (const F of alive) {
    if (!F.ai) continue;
    const P = PERSONAS[F.persona] || PERSONAS.builder;
    if (ageOf(F) >= 0 && F.docs.length <= ageOf(F)) aiPickDoctrine(F);
    for (const O of alive) {
      if (O.i === F.i) continue;
      const rel = W.rel[F.i][O.i];
      let d = (P.base - F.att[O.i]) * 0.02;
      if (rel === 'peace') d += 0.5; if (rel === 'ally') d += 0.8;
      if (alive.some(X => X.i !== F.i && X.i !== O.i && W.rel[F.i][X.i] === 'war' && W.rel[O.i][X.i] === 'war')) d += 0.35;   // a common enemy
      if (rel === 'war' && armyOf(O.i) > armyOf(F.i) * 2 + 4) d += 0.6;              // outmatched: wants out
      bumpAtt(F, O.i, d);
      const a = F.att[O.i];
      if (W.t < 150) continue;                                                          // no treaties in the first minutes
      if (rel === 'war' && a >= 25 && W.t > 300 && rand() < 0.2) propose(F, O.i, 'peace');
      else if (rel === 'peace' && a <= -35 && rand() < 0.3 && !F.noWar && !(O.i === 0 && F.lockRel)) setRel(F.i, O.i, 'war');
      else if (rel === 'peace' && a >= 60 && rand() < 0.15) propose(F, O.i, 'ally');
      else if (rel === 'ally' && a <= 10 && !(O.i === 0 && F.lockRel)) setRel(F.i, O.i, 'peace');
    }
    // nobody left to fight? warlords pick a quarrel with the weakest neighbour
    if (F.persona === 'warlord' && !F.noWar && W.t > 600 && !alive.some(O => O.i !== F.i && W.rel[F.i][O.i] === 'war')) {
      const prey = alive.filter(O => O.i !== F.i && W.rel[F.i][O.i] === 'peace').sort((x, y) => armyOf(x.i) - armyOf(y.i))[0];
      if (prey && rand() < 0.15) setRel(F.i, prey.i, 'war');
    }
  }
}

// ── AI hooks for ages and doctrines ────────────────────────────────────────
function aiPickDoctrine(F) {
  const P = PERSONAS[F.persona] || PERSONAS.builder;
  for (let t = 0; t <= ageOf(F); t++) if (!F.docs.some(x => DOC_BY_KEY[x].tier === t)) pickDoctrine(F, P.docs[t]);
}
// try to advance; returns true when the AI should save up for it
function aiAge(F, hall) {
  const n = ageOf(F) + 1, A = AGES[n];
  if (!A || hall.queue.some(q => q.age)) return false;
  if (ageBlock(F)) return false;
  if (W.t < [0, 240, 660][n] * (F.persona === 'builder' ? 0.9 : 1)) return false;
  if (canAfford(F, A.cost)) { queueAge(hall); return false; }
  return true;
}
