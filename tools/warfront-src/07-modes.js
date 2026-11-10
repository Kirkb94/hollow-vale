// 07 game modes: campaign missions, survival waves, save/load, and the menus that start them.

// ── shared match start ─────────────────────────────────────────────────────
function beginMatch(nRivals, diff, seed, opts, after) {
  startMatch(nRivals, diff, seed, opts);
  assignHVFactions(setup.fac);
  if (after) after();
  bakeTerrain(); bakeMini(); buildBuildingSprites(5); roadsDirty = true; buildMenu();
  const h = W.blds.find(b => b.fac === 0 && b.type === 'hall'); cam.z = 1; centerOn(h.x + 2, h.y + 3);
  UI.sel.clear(); UI.groups = {}; UI.started = true; UI.paused = false; UI.infoHtml = ''; UI.endShown = false; UI.watching = false; UI.diploHtml = '';
  $('diplo').hidden = true; showMenu(null); $('hud').hidden = false;
  FOG.update(); last = performance.now(); W.saveT = W.t;
}
$('btnStart').onclick = () => {
  $('btnStart').textContent = 'Founding the realm…';
  setTimeout(() => {
    beginMatch(setup.rivals, setup.diff, (Math.random() * 2 ** 31) | 0, { map: MAP_TYPES[setup.map], climate: CLIMATES[setup.climate], mode: 'skirmish' });
    W.alerts.push({ text: `You lead the ${HVFAC[W.F[0].hvfac].n}. Build a Farm and a Lumber Mill, then a Barracks to raise your heroes.`, t: 12, kind: 'info' });
    $('btnStart').textContent = 'Found Your Town';
  }, 30);
};

// ── campaign ───────────────────────────────────────────────────────────────
const store = { get(k, d) { try { const v = localStorage.getItem(k); return v === null ? d : JSON.parse(v); } catch (e) { return d; } }, set(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } }, del(k) { try { localStorage.removeItem(k); } catch (e) {} } };
const hallOf = i => W.blds.find(b => b.fac === i && b.type === 'hall' && !b.dead);
const countB = (t, done = true) => W.blds.filter(b => b.fac === 0 && b.type === t && !b.dead && (!done || b.done)).length;
const soldiersOf = i => W.units.filter(u => u.fac === i && isSoldier(u) && !u.dead && !isNaval(u)).length;
// ring a hall with stone walls, two gates and four towers (mission 5)
function fortify(i, r) {
  const h = hallOf(i), cx = h.x + 2, cy = h.y + 2;
  for (let y = cy - r; y <= cy + r; y++) for (let x = cx - r; x <= cx + r; x++) {
    if (Math.max(Math.abs(x - cx), Math.abs(y - cy)) !== r) continue;
    const gateHere = (y === cy + r && Math.abs(x - cx) <= 0) || (x === cx - r && Math.abs(y - cy) <= 0) || (x === cx + r && y === cy) || (y === cy - r && x === cx);
    const t = gateHere ? 'gate' : 'wall';
    if (!inMap(x, y) || map.bld[ix(x, y)] >= 0 || [1, 5].includes(map.ter[ix(x, y)])) continue;
    const n = map.node[ix(x, y)]; if (n >= 0) { nodes[n].amt = 0; map.node[ix(x, y)] = -1; }
    placeBuilding(i, t, x, y, true);
  }
  for (const [dx, dy] of [[-r + 2, -r + 2], [r - 3, -r + 2], [-r + 2, r - 3], [r - 3, r - 3]]) { const x = cx + dx, y = cy + dy; if (canPlace(-1, 'tower', x, y)) placeBuilding(i, 'tower', x, y, true); }
}
function giveArmy(i, list, near) {
  const h = near || hallOf(i);
  for (const [t, n] of list) for (let k = 0; k < n; k++) { const u = spawnNear(h, t); u.guard = [u.x, u.y]; }
}
const MISSIONS = [
  { id: 0, name: 'A New Hearth', map: 'continental', climate: 'temperate', rivals: 1, diff: 0, seed: 1101, noBandits: true,
    story: 'Your family and five others have crossed the hills with little more than axes and seed grain. The valley is green, but winters here are long. Build a village that can feed and warm itself before the snow comes, and see your people safely to the next spring.',
    setup() { setRel(0, 1, 'peace', true); const R = W.F[1]; R.persona = 'builder'; R.ruler = 'Steward Bertil'; R.att[0] = 40; R.noWar = true; R.lockRel = true; R.ai.passive = true; },
    goals: [
      ['Build 3 Farms', () => countB('farm') >= 3],
      ['Build a Granary and a Firewood Yard', () => countB('granary') >= 1 && countB('woodyard') >= 1],
      ['Grow your town to 30 people', () => W.F[0].pop >= 30],
      ['Store 120 firewood', () => W.F[0].res.firewood >= 120],
      ['See 25+ people safely to the spring of Year 2', () => W.cal.year >= 2 && W.F[0].pop >= 25]
    ], tip: 'Lumber Mill and Farms first. Winter starts at 7:30: farms freeze and every home burns firewood.' },
  { id: 1, name: 'The Bandit Road', map: 'rivers', climate: 'mixed', rivals: 1, diff: 1, seed: 2202, camps: 3,
    story: 'The merchants of Redmoor are your friends, but the river road between your towns is plagued by outlaws. Three bandit camps hide in the woods. Raise soldiers and burn every one of them before the caravans stop coming.',
    setup() { setRel(0, 1, 'ally', true); const R = W.F[1]; R.persona = 'merchant'; R.ruler = 'Magistrate Osric'; R.att[0] = 80; R.noWar = true; R.lockRel = true; R.ai.passive = true;
      W.F[0].res.wood += 150; W.F[0].res.planks = 40; for (const c of W.blds) if (c.type === 'camp') c.raidT = 220 + rand() * 60; },
    goals: [
      ['Build a Barracks', () => countB('barracks') >= 1],
      ['Train 8 soldiers', () => soldiersOf(0) >= 8 || W.mission.flag.trained8],
      ['Burn down all 3 bandit camps', () => !W.blds.some(b => b.type === 'camp' && !b.dead)]
    ], tip: 'Spearmen and swordsmen make short work of outlaws. Cross the river at the fords (light shallow water).' },
  { id: 2, name: 'The Age of Iron', map: 'continental', climate: 'mixed', rivals: 2, diff: 1, seed: 3303, timeLimit: 2400,
    story: 'Two shrines stand in the borderlands, and whoever holds them holds the hearts of the people. The Warlord of Redmoor wants them too. Advance your town to the Castle Age and hold both shrines at once before 40 minutes pass.',
    setup() { const R = W.F[1], G = W.F[2]; R.persona = 'warlord'; R.ruler = 'Warlord Ulf'; R.ai.mix = PERSONAS.warlord.mix.slice(); G.persona = 'builder'; G.ruler = 'Steward Hild'; },
    goals: [
      ['Reach the Town Age', () => ageOf(W.F[0]) >= 1],
      ['Reach the Castle Age', () => ageOf(W.F[0]) >= 2],
      ['Hold both shrines at the same time', () => shrinesOf(0) >= 2]
    ], tip: 'Stand your units next to a shrine for 12 seconds with no rivals nearby to claim it. Guard them with towers.' },
  { id: 3, name: 'Across the Water', map: 'islands', climate: 'mixed', rivals: 2, diff: 1, seed: 4404,
    story: 'Redmoor\'s raiders have been crossing the strait to burn your fishing huts. Goldmere, the merchant isle, stands with you. Build a fleet, carry your army across the sea and put an end to Redmoor.',
    setup() { const R = W.F[1], G = W.F[2]; R.persona = 'warlord'; R.ruler = 'Warlord Odo'; R.ai.mix = PERSONAS.warlord.mix.slice(); G.persona = 'merchant'; G.ruler = 'Magistrate Wynn';
      setRel(0, 2, 'ally', true); G.att[0] = 80; G.lockRel = true; W.F[0].res.wood += 200; },
    goals: [
      ['Build a Dock', () => countB('dock') >= 1],
      ['Build a Transport', () => W.units.some(u => u.fac === 0 && u.type === 'transport')],
      ['Land 6 soldiers on Redmoor\'s island', () => { const h = hallOf(1); return W.mission.flag.landed || (h && W.units.filter(u => u.fac === 0 && isSoldier(u) && !u.aboard && !isNaval(u) && compAt(u.x, u.y) === compAt(h.x, h.y)).length >= 6 && (W.mission.flag.landed = true)); }],
      ['Destroy Redmoor\'s Town Hall', () => !W.F[1].alive]
    ], tip: 'Build a Dock on your shore (Gather tab). Select soldiers and right-click your Transport to board, then right-click Redmoor\'s shore.' },
  { id: 4, name: 'The Siege of Redmoor', map: 'continental', climate: 'temperate', rivals: 2, diff: 1, seed: 5505,
    story: 'The Warlord has retreated behind stone walls and dares you to come. Your ally Greenhollow will march with you. You start in the Town Age with a full treasury. Build siege engines, break the walls and burn Redmoor\'s hall.',
    setup() {
      const P = W.F[0], R = W.F[1], G = W.F[2];
      P.age = 1; P.docs = []; Object.assign(P.res, { food: 280, wood: 300, stone: 300, gold: 300, planks: 60, iron: 30 });
      const h = hallOf(0); for (const t of ['granary', 'sawmill', 'storehouse', 'barracks', 'lumber', 'farm', 'farm', 'house', 'house', 'house']) { const s = findSpot(0, t, h, 4, 14, null, reachFrom(0, h)); if (s) placeBuilding(0, t, s[0], s[1], true); }
      recomputeCaps(P); Object.assign(P.res, { food: 800, wood: 800, stone: 400, gold: 500, planks: 200, iron: 60 });
      for (let k = 0; k < 10; k++) { const u = spawnNear(h, 'villager'); lifeInit(u, ri(18, 38)); }
      giveArmy(0, [['sword', 4], ['spear', 4], ['archer', 4]]);
      R.persona = 'warlord'; R.ruler = 'Warlord Godric'; R.age = 2; R.docs = ['forest', 'militia', 'chivalry']; R.ai.step = 22; R.ai.nextAttack = 1080;
      Object.assign(R.res, { food: 600, wood: 600, stone: 500, gold: 300, planks: 100, iron: 40 });
      fortify(1, 10); const rh = hallOf(1);
      for (const t of ['barracks', 'farm', 'farm', 'farm', 'house', 'house', 'house', 'house', 'granary', 'lumber', 'lumber', 'mine', 'sawmill', 'woodyard', 'smelter']) { R.res.wood += 200; R.res.stone += 100; R.res.planks += 40; const b = aiBuild(R, rh, t); if (b) { b.done = true; b.progress = 1; b.hp = b.maxHp; } }
      recomputeCaps(R); Object.assign(R.res, { food: 600, wood: 600, stone: 500, gold: 300, planks: 100, iron: 40 }); for (let k = 0; k < 8; k++) { const u = spawnNear(rh, 'villager'); lifeInit(u, ri(18, 38)); }
      giveArmy(1, [['sword', 6], ['spear', 4], ['archer', 6], ['hero', 1]]);
      G.persona = 'builder'; G.ruler = 'Steward Alys'; setRel(0, 2, 'ally', true); G.att[0] = 85; G.lockRel = true; G.age = 1;
    },
    goals: [
      ['Build a Siege Workshop (Castle Age)', () => countB('workshop') >= 1],
      ['Breach Redmoor\'s walls', () => W.mission.flag.breached || (W.mission.flag.breached = W.mission.walls0 > 0 && (W.blds.filter(b => b.fac === 1 && BDEF[b.type].wall).length < W.mission.walls0 || map.breach.some(v => v === 1)))],
      ['Destroy Redmoor\'s Town Hall', () => !W.F[1].alive]
    ], tip: 'Advance to the Castle Age first. Rams and catapults crack stone; a siege tower lets troops climb over.' }
];
function startMission(i) {
  const M = MISSIONS[i];
  beginMatch(M.rivals, M.diff, M.seed, { map: M.map, climate: M.climate, mode: 'campaign', noBandits: M.noBandits, camps: M.camps }, () => {
    W.mission = { id: i, done: M.goals.map(() => false), flag: {}, walls0: 0 };
    M.setup();
    W.mission.walls0 = W.blds.filter(b => b.fac === 1 && BDEF[b.type].wall).length;
  });
  W.alerts.push({ text: `${M.name}: ${M.tip}`, t: 14, kind: 'info' });
}
function missionTick() {
  if (!W.mission || W.over || (W.missionT = (W.missionT || 0) - DT) > 0) return;
  W.missionT = 1;
  const M = MISSIONS[W.mission.id];
  if (W.mission.id === 1 && soldiersOf(0) >= 8) W.mission.flag.trained8 = true;
  M.goals.forEach(([text, fn], k) => { if (!W.mission.done[k] && fn()) { W.mission.done[k] = true; alert(0, `Objective complete: ${text}`, undefined, undefined, 'good'); } });
  if (W.mission.done.every(Boolean)) { W.over = 'win'; W.overWhy = 'mission'; store.set('warfront.campaign', Math.max(store.get('warfront.campaign', 0), W.mission.id + 1)); }
  else if (M.timeLimit && W.t > M.timeLimit) { W.over = 'lose'; W.overWhy = 'time'; }
}

// ── survival ───────────────────────────────────────────────────────────────
function startSurvival() {
  beginMatch(0, setup.diff, (Math.random() * 2 ** 31) | 0, { map: MAP_TYPES[Math.min(setup.map, 1)], climate: CLIMATES[setup.climate], mode: 'survival', noBandits: true }, () => {
    W.surv = { wave: 0, next: 300, warned: false, best: store.get('warfront.survival.best', 0) };
  });
  W.alerts.push({ text: 'Raiders will come in waves, each bigger than the last. The first arrives at 5:00. Hold out as long as you can!', t: 12, kind: 'warn' });
}
function waveMix(k) {
  const n = Math.round((1.5 + k * 1.9 + k * k * 0.15) * [0.75, 1, 1.3][W.diff]), out = [];
  for (let i = 0; i < Math.min(46, n); i++) {
    const r = (i * 7 + k * 3) % 10;
    out.push(k < 2 ? 'bandit' : k < 4 ? ['bandit', 'spear', 'archer', 'bandit'][r % 4] : k < 7 ? ['sword', 'spear', 'archer', 'bandit', 'knight'][r % 5] : ['sword', 'spear', 'archer', 'knight', 'sword'][r % 5]);
  }
  if (k >= 5) out.push('ram'); if (k >= 7) out.push('catapult', 'ram'); if (k >= 9) out.push('catapult', 'siegetower');
  if (k >= 4 && k % 3 === 1) out.push('hero');
  return out;
}
function survivalTick() {
  const S = W.surv; if (!S || W.over) return;
  if ((W.survT = (W.survT || 0) - DT) > 0) return;
  W.survT = 1;
  const h = hallOf(0); if (!h) return;
  if (!S.warned && S.next - W.t < 20) { S.warned = true; alert(0, `Wave ${S.wave + 1} approaches! Ring the bell and man the walls.`, undefined, undefined, 'bad'); }
  if (W.t >= S.next) {
    S.wave++; S.warned = false; S.next = W.t + Math.max(75, 160 - S.wave * 7);
    // gather at a random map edge on the same landmass, far from your hall
    const c = compAt(h.x, h.y); let spot = null;
    for (let k = 0; k < 200 && !spot; k++) {
      const e = ri(0, 3), x = e === 0 ? 2 : e === 1 ? MW - 3 : ri(2, MW - 3), y = e === 2 ? 2 : e === 3 ? MH - 3 : ri(2, MH - 3);
      if (walkable(x, y) && compAt(x, y) === c && dist(x, y, h.x, h.y) > 40) spot = [x, y];
    }
    if (!spot) spot = nearestWalkable(MW - 6, 6);
    const band = [];
    for (const t of waveMix(S.wave)) { const [x, y] = nearestWalkable(spot[0] + rr(-2, 2), spot[1] + rr(-2, 2)); const u = spawnUnit(BANDIT, t, x + 0.5, y + 0.5); u.raider = true; band.push(u); }
    W.F[BANDIT].pop = W.units.filter(u => u.fac === BANDIT).length;
    orderGroup(band, 'amove', h.x + 2, h.y + 2, null, 'wedge');
    alert(0, `Wave ${S.wave}: ${band.length} raiders are marching on your town!`, spot[0], spot[1], 'bad');
    if (S.wave - 1 > S.best) { S.best = S.wave - 1; store.set('warfront.survival.best', S.best); }
  }
  // idle raiders keep pushing toward your nearest building
  for (const u of W.units) if (u.raider && !u.dead && !u.order && !u.target) {
    let best = null, bd = 1e9; for (const b of W.blds) if (b.fac === 0 && !b.dead) { const d = dist(u.x, u.y, b.x, b.y); if (d < bd) { bd = d; best = b; } }
    if (best) orderGroup([u], 'amove', best.x + best.w / 2, best.y + best.h / 2);
  }
}

// ── save / load ────────────────────────────────────────────────────────────
const SLOTS = ['1', '2', '3', 'auto'];
const b64 = { enc(ta) { const u8 = new Uint8Array(ta.buffer, ta.byteOffset, ta.byteLength); let s = ''; for (let i = 0; i < u8.length; i += 0x8000) s += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000)); return btoa(s); },
  dec(str, Type) { const s = atob(str), u8 = new Uint8Array(s.length); for (let i = 0; i < s.length; i++) u8[i] = s.charCodeAt(i); return new Type(u8.buffer); } };
function serialize() {
  const skip = new Set(['byId', 'projs', 'fx', 'alerts', 'pings', 'cal']);
  const Wc = {}; for (const k of Object.keys(W)) if (!skip.has(k)) Wc[k] = W[k];
  Wc.fx = W.fx.filter(f => f.kind === 'stump');
  return JSON.stringify({ v: 1, W: Wc, nodes, map: { seed: map.seed, starts: map.starts, type: map.type, ter: b64.enc(map.ter), bio: b64.enc(map.bio), comp: b64.enc(map.comp), node: b64.enc(map.node), bld: b64.enc(map.bld), road: b64.enc(map.road), breach: b64.enc(map.breach) },
    explored: b64.enc(FOG.explored), cam: { x: cam.x, y: cam.y, z: cam.z }, groups: UI.groups },
    (k, v) => v instanceof Set ? { __set: [...v] } : v);
}
function saveGame(slot) {
  if (!UI.started || W.over) return 'Nothing to save.';
  const F = W.F[0], label = { mode: W.mode, mission: W.mission ? MISSIONS[W.mission.id].name : null, t: Math.floor(W.t), pop: F.pop, map: map.type, wave: W.surv ? W.surv.wave : 0, when: new Date().toLocaleString() };
  let data; try { data = serialize(); } catch (e) { return 'Could not save: ' + e.message; }
  if (!store.set('warfront.save.' + slot, data) || !store.set('warfront.meta.' + slot, label)) return 'Your browser refused the save (storage may be full or blocked).';
  W.saveT = W.t; return null;
}
function loadGame(slot) {
  const raw = store.get('warfront.save.' + slot, null); if (!raw) return 'That slot is empty.';
  let s; try { s = JSON.parse(raw, (k, v) => v && v.__set ? new Set(v.__set) : v); } catch (e) { return 'That save is damaged.'; }
  Object.assign(W, { projs: [], fx: [], alerts: [], pings: [], byId: new Map() }, s.W);
  W.fx = s.W.fx || [];
  W.cal = calendar(W.t);
  for (const u of W.units) W.byId.set(u.id, u);
  for (const b of W.blds) W.byId.set(b.id, b);
  map.seed = s.map.seed; map.starts = s.map.starts; map.type = s.map.type;
  for (const k of ['ter', 'bio', 'road', 'breach']) map[k].set(b64.dec(s.map[k], Uint8Array));
  map.comp.set(b64.dec(s.map.comp, Int16Array)); map.node.set(b64.dec(s.map.node, Int32Array)); map.bld.set(b64.dec(s.map.bld, Int32Array));
  nodes.length = 0; for (const n of s.nodes) nodes.push(n);
  rand = Math.random;
  FOG.reset(); FOG.explored.set(b64.dec(s.explored, Uint8Array));
  for (const F of W.F) recomputeCaps(F);
  hvLabel();
  bakeTerrain(); bakeMini(); buildBuildingSprites(5); roadsDirty = true; buildMenu();
  cam.x = s.cam.x; cam.y = s.cam.y; cam.z = s.cam.z;
  UI.sel.clear(); UI.groups = s.groups || {}; UI.started = true; UI.paused = false; UI.infoHtml = ''; UI.endShown = false; UI.watching = false; UI.diploHtml = ''; UI.placing = null;
  $('diplo').hidden = true; showMenu(null); $('hud').hidden = false;
  FOG.update(); last = performance.now(); W.saveT = W.t;
  W.alerts.push({ text: 'Game loaded.', t: 4, kind: 'good' });
  return null;
}
setInterval(() => { if (UI.started && !W.over && !UI.paused && W.t - (W.saveT || 0) >= 120) saveGame('auto'); }, 5000);

// ── menus ──────────────────────────────────────────────────────────────────
function showTitleTab(tab) {
  UI.titleTab = tab;
  for (const b of document.querySelectorAll('#modeTabs button')) b.classList.toggle('on', b.dataset.tab === tab);
  for (const el of document.querySelectorAll('#title .pane')) el.hidden = el.dataset.pane !== tab;
  $('optRivals').hidden = tab !== 'skirmish'; $('optMap').hidden = tab === 'campaign'; $('optClimate').hidden = tab === 'campaign'; $('optDiff').hidden = tab === 'campaign';
  $('btnStart').hidden = tab !== 'skirmish'; $('btnSurvival').hidden = tab !== 'survival';
  if (tab === 'campaign') {
    const got = store.get('warfront.campaign', 0);
    $('missionList').innerHTML = MISSIONS.map((M, i) => `<button class="mission ${i <= got ? '' : 'locked'}" data-m="${i}"><b>${i + 1}. ${M.name}</b><span>${i < got ? '✓ Complete' : i === got ? 'Ready' : '🔒 Locked'}</span></button>`).join('');
  }
  if (tab === 'survival') $('survBest').textContent = store.get('warfront.survival.best', 0);
  refreshContinue();
}
function refreshContinue() { const any = SLOTS.some(s => store.get('warfront.meta.' + s, null)); $('btnContinue').hidden = !any; }
$('modeTabs').onclick = e => { const b = e.target.closest('button'); if (b) showTitleTab(b.dataset.tab); };
$('missionList').onclick = e => {
  const b = e.target.closest('.mission'); if (!b || b.classList.contains('locked')) return;
  const M = MISSIONS[+b.dataset.m]; UI.briefing = +b.dataset.m;
  $('briefTitle').textContent = `${+b.dataset.m + 1}. ${M.name}`; $('briefStory').textContent = M.story;
  $('briefGoals').innerHTML = M.goals.map(([t]) => `<li>${t}</li>`).join('') + (M.timeLimit ? `<li class="warn">Time limit: ${M.timeLimit / 60} minutes</li>` : '');
  $('briefTip').textContent = M.tip; showMenu('brief');
};
$('btnBriefGo').onclick = () => { $('btnBriefGo').textContent = 'Marching out…'; setTimeout(() => { startMission(UI.briefing); $('btnBriefGo').textContent = 'Begin'; }, 30); };
$('btnBriefBack').onclick = () => { showMenu('title'); showTitleTab('campaign'); };
$('btnSurvival').onclick = () => { $('btnSurvival').textContent = 'Building the stockade…'; setTimeout(() => { startSurvival(); $('btnSurvival').textContent = 'Hold the Line'; }, 30); };
function openSaves(mode) {
  UI.saveMode = mode; $('savesTitle').textContent = mode === 'save' ? 'Save Game' : 'Load Game';
  $('slotList').innerHTML = SLOTS.filter(s => mode === 'load' || s !== 'auto').map(s => {
    const m = store.get('warfront.meta.' + s, null);
    const desc = m ? `${m.mode === 'campaign' ? m.mission : m.mode === 'survival' ? `Survival · wave ${m.wave}` : 'Skirmish'} · ${m.map} · ${Math.floor(m.t / 60)}:${String(m.t % 60).padStart(2, '0')} · ${m.pop} people<br><i>${m.when}</i>` : '<i>Empty</i>';
    return `<button class="slot ${m || mode === 'save' ? '' : 'locked'}" data-s="${s}"><b>${s === 'auto' ? 'Autosave' : 'Slot ' + s}</b><span>${desc}</span></button>`;
  }).join('');
  showMenu('saves');
}
$('slotList').onclick = e => {
  const b = e.target.closest('.slot'); if (!b || b.classList.contains('locked')) return;
  if (UI.saveMode === 'save') { const err = saveGame(b.dataset.s); if (err) { $('savesNote').textContent = err; return; } $('savesNote').textContent = 'Saved.'; openSaves('save'); }
  else { const err = loadGame(b.dataset.s); if (err) $('savesNote').textContent = err; }
};
$('btnSavesBack').onclick = () => { $('savesNote').textContent = ''; if (UI.started && !W.over) showMenu('pause'); else { showMenu('title'); showTitleTab(UI.titleTab || 'skirmish'); } };
$('btnSave').onclick = () => openSaves('save');
$('btnLoad').onclick = () => openSaves('load');
$('btnContinue').onclick = () => openSaves('load');
// end screen per mode
const _showEnd = showEnd;
showEnd = function () {
  _showEnd();
  $('btnEndNext').hidden = true; $('btnEndRetry').hidden = true;
  if (W.mode === 'campaign' && W.mission) {
    const M = MISSIONS[W.mission.id], won = W.over === 'win';
    $('endTitle').textContent = won ? 'Mission Complete' : 'Mission Failed';
    $('endSub').textContent = won ? (W.mission.id === MISSIONS.length - 1 ? 'Redmoor has fallen. The Hearthlands are united under your banner. The campaign is complete!' : `${M.name} is won. A new chapter awaits.`) : W.overWhy === 'time' ? 'Time ran out before every objective was met.' : 'Your Town Hall has fallen.';
    $('btnEndNext').hidden = !won || W.mission.id >= MISSIONS.length - 1; $('btnEndRetry').hidden = won;
    $('btnEndTitle').textContent = 'Campaign Menu';
  } else if (W.mode === 'survival') {
    const n = Math.max(0, W.surv.wave - 1); if (n > W.surv.best) { W.surv.best = n; store.set('warfront.survival.best', n); }
    $('endTitle').textContent = 'The Town Has Fallen';
    $('endSub').textContent = `You held out against ${n} wave${n === 1 ? '' : 's'} of raiders. Best: ${W.surv.best}.`;
    $('btnEndRetry').hidden = false; $('btnEndTitle').textContent = 'Main Menu';
  } else $('btnEndTitle').textContent = 'New Match';
};
$('btnEndNext').onclick = () => { const n = W.mission.id + 1; showMenu('title'); showTitleTab('campaign'); $('missionList').querySelector(`[data-m="${n}"]`).dispatchEvent(new MouseEvent('click', { bubbles: true })); };
$('btnEndRetry').onclick = () => { if (W.mode === 'survival') startSurvival(); else startMission(W.mission.id); };
$('btnEndTitle').onclick = () => { UI.started = false; $('hud').hidden = true; showMenu('title'); showTitleTab(W.mode === 'campaign' ? 'campaign' : W.mode === 'survival' ? 'survival' : 'skirmish'); };
// mission / survival objectives in the goals panel
const _refreshGoals = refreshGoals;
refreshGoals = function () {
  if (W.mode === 'campaign' && W.mission && !UI.hideGoals) {
    const M = MISSIONS[W.mission.id], next = W.mission.done.findIndex(d => !d);
    $('goals').hidden = false;
    $('goals').innerHTML = `<h4>${M.name}</h4>` + M.goals.map(([t], i) => `<div class="${W.mission.done[i] ? 'done' : i === next ? 'next' : ''}">${W.mission.done[i] ? '✓' : i === next ? '›' : '·'} ${t}</div>`).join('') +
      (M.timeLimit ? `<div class="hint">Time left: ${Math.max(0, Math.floor((M.timeLimit - W.t) / 60))}:${String(Math.max(0, Math.floor((M.timeLimit - W.t) % 60))).padStart(2, '0')}</div>` : '');
    return;
  }
  if (W.mode === 'survival' && W.surv && !UI.hideGoals) {
    const S = W.surv, left = Math.max(0, Math.ceil(S.next - W.t)), alive = W.units.filter(u => u.raider && !u.dead).length;
    $('goals').hidden = false;
    $('goals').innerHTML = `<h4>Survival</h4><div class="next">Wave ${S.wave + 1} in ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}</div><div>Waves survived: <b>${Math.max(0, S.wave - (alive ? 1 : 0))}</b> · Best: ${S.best}</div>${alive ? `<div class="hint">${alive} raiders still in your lands</div>` : ''}`;
    return;
  }
  _refreshGoals();
};
showTitleTab('skirmish');

// ── Warfront: faction picker, unlocked once Hollow Vale's data has loaded ──
function buildFactionPicker() {
  const el = $('optFaction'); if (!el) return;
  el.innerHTML = '<span>Faction</span>' + ['random', ...Object.keys(HVFAC)].map(f => `<button data-f="${f}" class="${setup.fac === f ? 'on' : ''}" style="${f !== 'random' ? `border-color:${HVFAC[f].c}` : ''}">${f === 'random' ? 'Random' : HVFAC[f].n}</button>`).join('');
  el.onclick = e => { const b = e.target.closest('button'); if (!b) return; setup.fac = b.dataset.f; for (const x of el.querySelectorAll('button')) x.classList.toggle('on', x === b); $('facNote').innerHTML = setup.fac === 'random' ? 'A random faction. Rivals draw from the rest.' : hvFactionHtml(setup.fac); };
  $('btnStart').disabled = false; $('btnStart').textContent = 'Found Your Town';
}
if (HV_READY) buildFactionPicker(); else addEventListener('hv-ready', buildFactionPicker);
