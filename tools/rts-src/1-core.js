'use strict';
// ── Hollow Vale: Warfront — core data, map, pathfinding ───────────────────
const TS = 48, MW = 72, MH = 72, DT = 0.05;
const $ = id => document.getElementById(id);
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
const ix = (x, y) => y * MW + x;
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = Math.random;
const rr = (a, b) => a + rand() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));
function valueNoise(seed, scale) {
  const R = mulberry32(seed), g = [], gw = Math.ceil(MW / scale) + 2, gh = Math.ceil(MH / scale) + 2;
  for (let i = 0; i < gw * gh; i++) g.push(R());
  const sm = t => t * t * (3 - 2 * t);
  return (x, y) => { const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = sm(fx - x0), ty = sm(fy - y0), v = (a, b) => g[b * gw + a];
    return (v(x0, y0) * (1 - tx) + v(x0 + 1, y0) * tx) * (1 - ty) + (v(x0, y0 + 1) * (1 - tx) + v(x0 + 1, y0 + 1) * tx) * ty; };
}

// players: Hollow Vale side colours
const SIDES = [
  { name: 'You', col: '#e2b84a', lite: '#f6d98a', tower: 'tower_y' },
  { name: 'Violet Host', col: '#9a5fd6', lite: '#c8a2f0', tower: 'tower_p' },
  { name: 'Azure Host', col: '#3f7fd6', lite: '#9ec2f2', tower: 'tower_b' },
  { name: 'Crimson Host', col: '#d6453f', lite: '#f29d98', tower: 'tower_b', hue: 'hue-rotate(150deg) saturate(1.3)' }
];
// worker look per faction (borrowed from a humble hero of that faction)
const WORKER = { kingdom: 'herald', vamp: 'thrall', undead: 'gravedigger', infernal: 'imps', wilds: 'groveshaper', iron: 'prospector', arcane: 'phasewright' };
const WORKER_NAME = { kingdom: 'Peasant', vamp: 'Thrall', undead: 'Gravedigger', infernal: 'Imp', wilds: 'Gatherer', iron: 'Prospector', arcane: 'Apprentice' };

// buildings (footprints in tiles). spr = crop in the objects atlas
const BDEF = {
  keep:     { n: 'Keep', spr: 'hall', w: 4, h: 3, hp: 2200, cost: { gold: 450 }, build: 70, sight: 9, drop: true, trains: ['worker'], atk: 14, range: 6.5, cd: 1.6, key: 'k', d: 'Your seat of power. Trains Workers and takes in gold. Lose every Keep and you lose the war.' },
  farm:     { n: 'Farm', spr: 'farm', w: 3, h: 2, hp: 420, cost: { gold: 100 }, build: 20, sight: 4, income: 0.5, key: 'f', d: 'Fields that add +1 gold every 2 seconds.' },
  cottage:  { n: 'Cottage', spr: 'cottage', w: 2, h: 2, hp: 400, cost: { gold: 110 }, build: 22, sight: 4, cap: 4, key: 'c', d: '+4 army slots.' },
  barracks: { n: 'Barracks', spr: 'barracks', w: 3, h: 3, hp: 1000, cost: { gold: 180 }, build: 34, sight: 6, trains: 'roster', key: 'b', d: 'Trains your faction\'s heroes and squads.' },
  well:     { n: 'Mana Well', spr: 'well', w: 2, h: 2, hp: 450, cost: { gold: 140 }, build: 26, sight: 4, mana: 0.5, key: 'm', d: '+1 mana every 2 seconds. Casters, healers and Elites need mana.' },
  watch:    { n: 'Watchtower', spr: 'watch', w: 2, h: 2, hp: 550, cost: { gold: 120 }, build: 24, sight: 11, atk: 9, range: 7, cd: 1.6, key: 'w', d: 'Sees far and shoots arrows at enemies in range.' },
  tower:    { n: 'Tower', spr: 'tower', w: 2, h: 2, hp: 1300, cost: { gold: 260 }, build: 40, sight: 9, atk: 22, range: 7.5, cd: 1.8, key: 't', d: 'A stone tower, as in Hollow Vale. Strikes hard at anything that comes near.' },
  shrine:   { n: 'Hero Shrine', spr: 'shrine', w: 3, h: 3, hp: 1200, cost: { gold: 320 }, build: 45, sight: 6, cap: 6, trains: 'elite', req: 'barracks', key: 'e', d: '+6 army slots. Summons your faction\'s Elites (one of each at a time).' },
  mine:     { n: 'Gold Mine', spr: 'mine', w: 3, h: 3, hp: 1, neutral: true, d: 'Workers mine gold here.' }
};
const BUILD_LIST = ['keep', 'farm', 'cottage', 'barracks', 'well', 'watch', 'tower', 'shrine'];
const OBJ_BOX = { tower_b: [71, 19, 189, 275], tower_p: [383, 19, 188, 275], tower_y: [696, 18, 189, 276], watch: [1005, 21, 198, 273], farm: [23, 377, 275, 211], barracks: [329, 346, 294, 250], well: [676, 381, 228, 224], cottage: [960, 339, 283, 251], hall: [21, 623, 286, 286], grave: [358, 686, 232, 198], wall: [650, 699, 267, 179], mine: [952, 645, 293, 260], shrine: [40, 955, 246, 257], chest: [349, 1010, 248, 189] };
const ICON = (c, r) => `background-position:${c * 20}% ${r * 20}%`;   // ui icon atlas, 6x6

// game data (filled from rts-data.json)
let H = {}, FAC = {}, CLASSDESC = {}, ARMY_BASE = 20;
const ARMY_CAP = 70;
function rosterOf(f, elite) { return Object.keys(H).filter(k => H[k].fac === f && !H[k].hidden && !!H[k].elite === !!elite).sort((a, b) => H[a].hire - H[b].hire || H[a].n.localeCompare(H[b].n)); }
const needsMana = h => !!(h.acost || h.heal || h.sp || h.summon || h.elite);
function trainCost(k) {
  if (k === 'worker') return { gold: 50 };
  const h = H[k];
  const c = { gold: h.hire * 25 };
  if (needsMana(h)) c.mana = h.elite ? 150 : h.hire * 8;
  if (h.fac === 'arcane' && c.mana) c.mana = Math.round(c.mana * 0.6);   // Arcane Flow
  return c;
}
const trainTime = k => k === 'worker' ? 12 : H[k].elite ? 45 : 8 + H[k].slots * 5;

// ── real-time unit stats from Hollow Vale's numbers ───────────────────────
const HPX = 20, DMX = 6.5;            // 1 HV hit point = 20 HP; 1 HV damage point = 6.5 per strike
function statsOf(k, side) {
  if (k === 'worker') return { hp: 110, dmg: 5, armor: 0, range: 1.1, minRange: 0, speed: 2.4, sight: 6, cd: 1.3, fly: false, slots: 0, worker: true };
  const h = H[k], ranged = h.rng[1] >= 2;
  return {
    hp: Math.round(h.hp * HPX * (h.elite ? 1.15 : 1)), dmg: h.dmg * DMX, armor: (h.armor || 0) * DMX,
    range: ranged ? 1.5 + h.rng[1] * 1.45 : (h.elite ? 1.5 : 1.15), minRange: h.rng[0] >= 2 ? (h.rng[0] - 1) * 1.3 : 0,
    speed: (h.fly ? 1.5 : 1.15) + Math.min(h.mv, 5) * 0.45, sight: 6.5 + (h.fly ? 1.5 : 0) + (h.sight ? (h.sight - 3) * 1.5 : 0) + (ranged ? 1 : 0),
    cd: h.elite ? 1.7 : ranged ? 1.6 : 1.35, fly: !!h.fly, slots: h.slots,
    splash: !!h.aoe, stun: !!h.stun, drain: h.drain || 0, heal: h.heal || 0, siege: h.siege || 0, charge: !!h.charge, pierce: !!h.pierce, summon: h.summon || null
  };
}

// ── map ─────────────────────────────────────────────────────────────────────
// ter: 0 grass, 1 forest (blocks), 2 rocks (blocks), 3 swamp (slow), 4 water (blocks walkers), 5 sand
const map = { ter: new Uint8Array(MW * MH), bld: new Int32Array(MW * MH).fill(-1), var: new Uint8Array(MW * MH), starts: [] };
function generateMap(seed, n) {
  rand = mulberry32(seed);
  map.ter.fill(0); map.bld.fill(-1);
  const a = valueNoise(seed + 1, 9), b = valueNoise(seed + 2, 5), w = valueNoise(seed + 3, 13), s = valueNoise(seed + 4, 7);
  const m = 9, corners = [[m, MH - m], [MW - m, m], [m, m], [MW - m, MH - m]];
  map.starts = corners.slice(0, n);
  const near = (x, y, r) => map.starts.some(([sx, sy]) => dist(x, y, sx, sy) < r);
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const k = ix(x, y); map.var[k] = Math.floor(rand() * 4);
    if (near(x, y, 11)) continue;
    // mirror-ish fairness: noise sampled symmetrically around the centre
    const sx = Math.min(x, MW - 1 - x), sy = Math.min(y, MH - 1 - y);
    const wv = w(sx, sy), fv = a(sx, sy) * 0.7 + b(x, y) * 0.3;
    if (wv > 0.73 && dist(x, y, MW / 2, MH / 2) > 7) map.ter[k] = 4;
    else if (wv > 0.69) map.ter[k] = 5;
    else if (fv > 0.64) map.ter[k] = 1;
    else if (s(sx, sy) > 0.8) map.ter[k] = 3;
    else if (rand() < 0.012) map.ter[k] = 2;
  }
  // forest edges around each start so towns feel tucked in, but keep lanes open toward the centre
  for (const [sx, sy] of map.starts) for (let k = 0; k < 40; k++) {
    const ang = rand() * Math.PI * 2, r = 12 + rand() * 3, x = Math.round(sx + Math.cos(ang) * r), y = Math.round(sy + Math.sin(ang) * r);
    const toC = Math.atan2(MH / 2 - sy, MW / 2 - sx); if (Math.abs(((ang - toC + Math.PI * 3) % (Math.PI * 2)) - Math.PI) < 0.8) continue;
    for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (inMap(x + dx, y + dy)) map.ter[ix(x + dx, y + dy)] = 1;
  }
}
const blocked = (x, y) => !inMap(x, y) || map.ter[ix(x, y)] === 1 || map.ter[ix(x, y)] === 2 || map.ter[ix(x, y)] === 4 || map.bld[ix(x, y)] >= 0;
const walkable = (x, y) => !blocked(x, y);
const flyable = (x, y) => inMap(x, y);
function canPlace(type, x, y) {
  const d = BDEF[type];
  for (let yy = y; yy < y + d.h; yy++) for (let xx = x; xx < x + d.w; xx++) { if (!inMap(xx, yy)) return false; const t = map.ter[ix(xx, yy)]; if (t === 1 || t === 2 || t === 4 || map.bld[ix(xx, yy)] >= 0) return false; }
  // keep a ring free so units can walk around
  for (let yy = y - 1; yy <= y + d.h; yy++) for (let xx = x - 1; xx <= x + d.w; xx++) { if (!inMap(xx, yy)) continue; const o = map.bld[ix(xx, yy)]; if (o >= 0) { const b = W.byId.get(o); if (b && b.type === 'mine' && type !== 'keep') return false; } }
  // no building right on top of a mine approach
  return true;
}
function nearestFree(x, y, fly) {
  const ok = fly ? flyable : walkable;
  for (let r = 0; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
    if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
    if (ok(Math.floor(x) + dx, Math.floor(y) + dy)) return [Math.floor(x) + dx, Math.floor(y) + dy];
  }
  return [Math.floor(x), Math.floor(y)];
}

// ── A* on the tile grid (8 directions, no corner cutting) ──────────────────
const AS = { g: new Float32Array(MW * MH), from: new Int32Array(MW * MH), seen: new Uint32Array(MW * MH), shut: new Uint32Array(MW * MH), stamp: 0 };
let pathBudget = 0;
function findPath(sx, sy, goal, hx, hy, maxN = 3500) {
  sx = Math.floor(sx); sy = Math.floor(sy);
  if (goal(sx, sy)) return [];
  const st = ++AS.stamp, heap = [], push = (f, k) => { heap.push([f, k]); let i = heap.length - 1; while (i > 0) { const p = (i - 1) >> 1; if (heap[p][0] <= heap[i][0]) break; [heap[p], heap[i]] = [heap[i], heap[p]]; i = p; } };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { heap[0] = last; let i = 0; for (;;) { const l = i * 2 + 1, r = l + 1; let m = i; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (r < heap.length && heap[r][0] < heap[m][0]) m = r; if (m === i) break; [heap[m], heap[i]] = [heap[i], heap[m]]; i = m; } } return top; };
  const s = ix(sx, sy); AS.g[s] = 0; AS.seen[s] = st; AS.from[s] = -1; push(0, s);
  let best = s, bestH = 1e9, n = 0;
  while (heap.length && n++ < maxN) {
    const [, k] = pop(); if (AS.shut[k] === st) continue; AS.shut[k] = st;
    const x = k % MW, y = (k / MW) | 0;
    if (goal(x, y)) { best = k; bestH = 0; break; }
    const hh = Math.hypot(x - hx, y - hy); if (hh < bestH) { bestH = hh; best = k; }
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue; const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny) && !goal(nx, ny)) continue;
      if (dx && dy && (!walkable(x + dx, y) || !walkable(x, y + dy))) continue;
      const j = ix(nx, ny), g = AS.g[k] + (dx && dy ? 1.414 : 1) * (map.ter[j] === 3 ? 1.8 : 1);
      if (AS.seen[j] === st && g >= AS.g[j]) continue;
      AS.seen[j] = st; AS.g[j] = g; AS.from[j] = k; push(g + Math.hypot(nx - hx, ny - hy), j);
    }
  }
  const out = []; let k = best; while (k !== s && k >= 0) { out.push([k % MW + 0.5, ((k / MW) | 0) + 0.5]); k = AS.from[k]; }
  out.reverse(); out.partial = bestH > 0; return out;
}
