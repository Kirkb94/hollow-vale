// 04 art: terrain bake, trees/rocks, faction-coloured building sprites, people drawn live.
const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
const hexRGB = h => [1, 3, 5].map(i => parseInt(h.slice(i, i + 2), 16));
const shadeC = (h, k) => `rgb(${hexRGB(h).map(v => clamp(Math.round(v * k), 0, 255)).join(',')})`;
const INK = '#2a1d16';

// ── terrain (baked once per map) ───────────────────────────────────────────
let TERRAIN = null;
function bakeTerrain() {
  const c = mk(MW * TS, MH * TS), g = c.getContext('2d'), R = mulberry32(map.seed + 9);
  // grass by biome: temperate, northern highlands (cool, mossy), dry plains (straw)
  const GRASS = [['#6a9440', [['#5f8a38', 4], ['#78a34a', 3], ['#577f33', 2], ['#86b055', 2]]], ['#5a8a55', [['#4f7d4a', 4], ['#689a60', 3], ['#46703f', 2], ['#7aa871', 2]]], ['#a2a052', [['#959248', 4], ['#b2ad60', 3], ['#8a8540', 2], ['#c0b86c', 2]]]];
  const base = [null, '#3d6fa8', '#d1bc7d', '#8f7148', null, '#6fa3c9'];
  const spots = [null, [['#4579b2', 4], ['#36659b', 3]], [['#c4ae70', 3], ['#dccb92', 2]], [['#81653f', 3], ['#9b7c52', 3]], null, [['#86b6d8', 3], ['#5f93bd', 3]]];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = map.ter[ix(x, y)], X = x * TS, Y = y * TS, bio = map.bio[ix(x, y)];
    const grass = t === 0 || t === 4;
    g.fillStyle = grass ? GRASS[bio][0] : base[t]; g.fillRect(X, Y, TS, TS);
    const sp = grass ? GRASS[bio][1] : spots[t];
    for (let i = 0; i < 14; i++) { const [col, s] = sp[Math.floor(R() * sp.length)]; g.fillStyle = col; g.fillRect(X + Math.floor(R() * (TS - s)), Y + Math.floor(R() * (TS - s)), s, s); }
    if (t === 0 && R() < 0.08) { g.fillStyle = bio === 2 ? '#d9c26a' : R() < 0.5 ? '#e8d86a' : '#e9e2d6'; g.fillRect(X + ri(4, 26), Y + ri(4, 26), 2, 2); }
    if (t === 0 && R() < 0.25) { g.fillStyle = bio === 2 ? '#7d7a36' : '#4f7a2c'; const gx = X + ri(3, 26), gy = Y + ri(5, 26); g.fillRect(gx, gy, 1, 3); g.fillRect(gx + 2, gy - 1, 1, 4); }
    if (t === 5) for (let i = 0; i < 3; i++) { const sx = X + ri(4, 24), sy = Y + ri(4, 24); g.fillStyle = '#2a1d16'; g.fillRect(sx - 1, sy - 1, 7, 5); g.fillStyle = '#a39d92'; g.fillRect(sx, sy, 5, 3); }
  }
  // hills: a raised plateau with a lit rim and a shaded cliff face on its south side
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    if (map.ter[ix(x, y)] !== 4) continue;
    const X = x * TS, Y = y * TS, hill = (dx, dy) => inMap(x + dx, y + dy) && map.ter[ix(x + dx, y + dy)] === 4;
    g.fillStyle = 'rgba(255,248,200,0.10)'; g.fillRect(X, Y, TS, TS);
    if (!hill(0, -1)) { g.fillStyle = 'rgba(255,250,215,0.35)'; g.fillRect(X, Y, TS, 2); }
    if (!hill(-1, 0)) { g.fillStyle = 'rgba(255,250,215,0.18)'; g.fillRect(X, Y, 2, TS); }
    if (!hill(1, 0)) { g.fillStyle = 'rgba(40,30,10,0.22)'; g.fillRect(X + TS - 2, Y, 2, TS); }
    if (!hill(0, 1)) { g.fillStyle = 'rgba(70,55,30,0.55)'; g.fillRect(X, Y + TS - 8, TS, 8); g.fillStyle = 'rgba(40,30,15,0.5)'; g.fillRect(X, Y + TS - 3, TS, 3); g.fillStyle = 'rgba(255,250,215,0.25)'; g.fillRect(X, Y + TS - 9, TS, 1); }
    if (R() < 0.3) { const rx = X + ri(6, 24), ry = Y + ri(6, 18); g.fillStyle = INK; g.beginPath(); g.ellipse(rx, ry, 4, 3, 0, 0, 7); g.fill(); g.fillStyle = '#a39d92'; g.beginPath(); g.ellipse(rx, ry - 0.5, 3, 2, 0, 0, 7); g.fill(); }
  }
  // shorelines: darker bank on land tiles touching water, foam on water edges
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = map.ter[ix(x, y)], X = x * TS, Y = y * TS;
    const wat = (dx, dy) => inMap(x + dx, y + dy) && map.ter[ix(x + dx, y + dy)] === 1;
    if (t === 1) {
      if (!wat(0, -1)) { g.fillStyle = '#a9d0e8'; g.fillRect(X, Y, TS, 3); g.fillStyle = '#5d8fc2'; g.fillRect(X, Y + 3, TS, 2); }
      if (!wat(-1, 0)) { g.fillStyle = '#7fb0d6'; g.fillRect(X, Y, 2, TS); }
      if (!wat(1, 0)) { g.fillStyle = '#7fb0d6'; g.fillRect(X + TS - 2, Y, 2, TS); }
      if (!wat(0, 1)) { g.fillStyle = '#2f5a8a'; g.fillRect(X, Y + TS - 4, TS, 4); }
    }
  }
  TERRAIN = c;
}

// ── trees, rocks ───────────────────────────────────────────────────────────
const NODE_SPR = { tree: [], stone: [], gold: [], iron: [], fish: [] };
function px(g, x, y, w, h, c) { g.fillStyle = c; g.fillRect(x, y, w, h); }
function makeTree(v, season) {
  const c = mk(44, 58), g = c.getContext('2d'), R = mulberry32(50 + v);
  px(g, 8, 50, 28, 6, 'rgba(0,0,0,0.22)');
  px(g, 19, 36, 6, 18, INK); px(g, 20, 36, 4, 17, '#6b4a2b'); px(g, 20, 36, 1, 17, '#86603a');
  if (v === 3) {                                                    // pine: evergreen, snow-capped in winter
    for (let k = 0; k < 4; k++) { const w = 30 - k * 6, y = 34 - k * 9; px(g, 22 - w / 2 - 1, y - 1, w + 2, 12, INK); px(g, 22 - w / 2, y, w, 10, k % 2 ? '#2f6b3a' : '#357a40'); px(g, 22 - w / 2, y, w / 2, 3, season === 3 ? '#f4f7fb' : '#4b9454'); if (season === 3) px(g, 22 - w / 2 + w / 2, y, w / 2 - 2, 2, '#dfe7f0'); }
    px(g, 20, 2, 4, 6, season === 3 ? '#f4f7fb' : '#357a40');
    return c;
  }
  if (season === 3) {                                               // bare winter branches with snow
    const br = [[22, 36, 12, 14], [22, 30, 30, 12], [22, 26, 22, 6], [22, 32, 8, 22], [22, 28, 36, 22]];
    g.lineCap = 'round';
    for (const [x0, y0, x1, y1] of br) { g.strokeStyle = INK; g.lineWidth = 4; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); }
    for (const [x0, y0, x1, y1] of br) { g.strokeStyle = '#6b4a2b'; g.lineWidth = 2; g.beginPath(); g.moveTo(x0, y0); g.lineTo(x1, y1); g.stroke(); px(g, x1 - 2, y1 - 2, 4, 2, '#f4f7fb'); }
    px(g, 19, 24, 6, 14, INK); px(g, 20, 24, 4, 13, '#6b4a2b'); px(g, 20, 24, 4, 2, '#f4f7fb');
    return c;
  }
  const blobs = [[22, 22, 15], [13, 28, 10], [31, 28, 10], [22, 13, 10]];
  for (const [x, y, r] of blobs) { g.fillStyle = INK; g.beginPath(); g.arc(x, y, r + 1.5, 0, 7); g.fill(); }
  const sets = season === 2 ? [['#c8651e', '#e89a3a', '#9a4416'], ['#b8401f', '#e0683a', '#7f2a14'], ['#d2a02a', '#f0c84a', '#9a7414']]
    : [['#3f7d32', '#5aa142', '#2f6227'], ['#4a8a34', '#6db24a', '#356b25'], ['#5b8a2c', '#86b048', '#3f6a1e']];
  const greens = sets[v];
  for (const [x, y, r] of blobs) { g.fillStyle = greens[0]; g.beginPath(); g.arc(x, y, r, 0, 7); g.fill(); }
  for (const [x, y, r] of blobs) { g.fillStyle = greens[1]; g.beginPath(); g.arc(x - r * 0.3, y - r * 0.35, r * 0.55, 0, 7); g.fill(); }
  for (let i = 0; i < 26; i++) px(g, 8 + Math.floor(R() * 28), 4 + Math.floor(R() * 32), 2, 2, R() < 0.5 ? greens[2] : greens[1]);
  if (season === 0) for (let i = 0; i < 9; i++) px(g, 9 + Math.floor(R() * 26), 6 + Math.floor(R() * 26), 2, 2, R() < 0.6 ? '#f6c6d6' : '#fff4f8');   // blossom
  if (v === 2 && season === 1) for (let i = 0; i < 5; i++) px(g, 10 + Math.floor(R() * 24), 10 + Math.floor(R() * 22), 2, 2, '#c8463a');
  return c;
}
function buildNodeSprites() {
  NODE_SPR.treeS = [0, 1, 2, 3].map(season => [0, 1, 2, 3].map(v => makeTree(v, season)));
  NODE_SPR.tree = NODE_SPR.treeS[1];
  { // a felled deer
    const c = mk(36, 24), g = c.getContext('2d');
    g.fillStyle = 'rgba(120,20,16,0.45)'; g.beginPath(); g.ellipse(18, 18, 14, 4, 0, 0, 7); g.fill();
    px(g, 5, 9, 22, 9, INK); px(g, 6, 10, 20, 7, '#8a5a34'); px(g, 6, 14, 20, 3, '#c9a27a'); px(g, 25, 7, 8, 7, INK); px(g, 26, 8, 6, 5, '#8a5a34');
    px(g, 30, 3, 2, 5, '#5a3d22'); px(g, 33, 2, 2, 4, '#5a3d22'); for (const x of [8, 12, 18, 22]) px(g, x, 17, 2, 5, INK);
    NODE_SPR.carcass = [c];
  }
  for (let v = 0; v < 3; v++) {                                   // fish shoals: ripples and darting backs
    const c = mk(36, 30), g = c.getContext('2d'), R = mulberry32(300 + v);
    g.strokeStyle = 'rgba(220,240,255,0.55)'; g.lineWidth = 1.5;
    for (const [x, y, r] of [[18, 16, 10], [18, 16, 5]]) { g.beginPath(); g.ellipse(x, y, r, r * 0.5, 0, 0, 7); g.stroke(); }
    for (let k = 0; k < 3; k++) { const x = 8 + R() * 18, y = 10 + R() * 10; px(g, x - 1, y - 1, 8, 4, '#24486e'); px(g, x, y, 6, 2, '#c9d9e6'); px(g, x + 6, y - 1, 2, 4, '#c9d9e6'); }
    NODE_SPR.fish.push(c);
  }
  for (const kind of ['stone', 'gold', 'iron']) for (let v = 0; v < 3; v++) {
    const c = mk(36, 30), g = c.getContext('2d'), R = mulberry32(80 + v + (kind === 'gold' ? 9 : kind === 'iron' ? 19 : 0));
    px(g, 3, 24, 30, 5, 'rgba(0,0,0,0.22)');
    const rocks = [[11, 18, 9, 8], [23, 17, 10, 9], [17, 11, 8, 7]];
    for (const [x, y, rx, ry] of rocks) { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, rx + 1.5, ry + 1.5, 0, 0, 7); g.fill(); }
    for (const [x, y, rx, ry] of rocks) { g.fillStyle = kind === 'gold' ? '#8b8277' : kind === 'iron' ? '#7a6a62' : '#9c968d'; g.beginPath(); g.ellipse(x, y, rx, ry, 0, 0, 7); g.fill(); g.fillStyle = '#c3bdb2'; g.beginPath(); g.ellipse(x - rx * 0.3, y - ry * 0.4, rx * 0.45, ry * 0.35, 0, 0, 7); g.fill(); }
    for (let i = 0; i < 10; i++) px(g, 5 + Math.floor(R() * 26), 6 + Math.floor(R() * 18), 2, 2, kind === 'gold' ? (R() < 0.5 ? '#f6d34a' : '#ffef9e') : kind === 'iron' ? (R() < 0.5 ? '#a8492e' : '#c9714a') : '#7d776f');
    NODE_SPR[kind].push(c);
  }
}

// ── buildings (one canvas per type × faction) ──────────────────────────────
const BSPR = {};
const TOP = { dock: 22, camp: 30, hall: 64, house: 30, lumber: 30, mine: 28, farm: 18, granary: 42, storehouse: 28, barracks: 36, stable: 30, smith: 38, tower: 86, woodyard: 22, hunter: 30, mill: 62, bakery: 36, brewery: 34, sawmill: 28, smelter: 46, cartshed: 30, market: 30, palisade: 26, wall: 30, gate: 34, workshop: 34, shrine: 56 };
function roof(g, x, y, w, h, col) {
  px(g, x - 2, y - 2, w + 4, h + 4, INK);
  px(g, x, y, w, h, shadeC(col, 0.92));
  for (let r = y + 3; r < y + h; r += 5) { px(g, x, r, w, 1, shadeC(col, 0.7)); for (let k = x + ((r / 5) % 2 ? 3 : 0); k < x + w; k += 7) px(g, k, r - 3, 1, 3, shadeC(col, 0.78)); }
  px(g, x, y, w, 3, shadeC(col, 1.18)); px(g, x, y + h - 3, w, 3, shadeC(col, 0.6));
}
function wall(g, x, y, w, h, col, timber) {
  px(g, x - 2, y, w + 4, h + 2, INK); px(g, x, y, w, h, col);
  px(g, x, y + h - 3, w, 3, shadeC(col, 0.7));
  if (timber) { for (let k = x; k <= x + w - 3; k += Math.max(10, Math.floor(w / 4))) px(g, k, y, 3, h, '#5a3d22'); px(g, x, y, w, 3, '#5a3d22'); }
}
function stoneWall(g, x, y, w, h) {
  px(g, x - 2, y, w + 4, h + 2, INK); px(g, x, y, w, h, '#a39d92');
  for (let r = 0; r < h; r += 6) for (let k = (r / 6) % 2 ? 0 : 5; k < w; k += 10) { px(g, x + k, y + r, 1, 6, '#7c766c'); }
  for (let r = 6; r < h; r += 6) px(g, x, y + r, w, 1, '#7c766c');
  px(g, x, y, w, 2, '#c4beb3');
}
function door(g, x, y, w = 8, h = 12) { px(g, x - 1, y - 1, w + 2, h + 1, INK); px(g, x, y, w, h, '#5a3a20'); px(g, x + w / 2, y, 1, h, '#3f2814'); px(g, x + w - 2, y + h / 2, 1, 2, '#d9b45a'); }
function win(g, x, y) { px(g, x - 1, y - 1, 8, 8, INK); px(g, x, y, 6, 6, '#f2d27a'); px(g, x + 2, y, 1, 6, '#5a3d22'); px(g, x, y + 2, 6, 1, '#5a3d22'); }
function flag(g, x, y, col) { px(g, x, y, 2, 22, INK); px(g, x + 2, y + 1, 11, 7, INK); px(g, x + 2, y + 2, 10, 5, col); px(g, x + 2, y + 2, 10, 1, shadeC(col, 1.3)); }
function logs(g, x, y, n) { for (let i = 0; i < n; i++) { const lx = x + (i % 3) * 7 + (Math.floor(i / 3) % 2) * 3, ly = y - Math.floor(i / 3) * 6; g.fillStyle = INK; g.beginPath(); g.arc(lx, ly, 4, 0, 7); g.fill(); g.fillStyle = '#b08250'; g.beginPath(); g.arc(lx, ly, 3, 0, 7); g.fill(); px(g, lx - 1, ly - 1, 2, 2, '#8a5f33'); } }
function crate(g, x, y) { px(g, x - 1, y - 1, 12, 12, INK); px(g, x, y, 10, 10, '#9a6a3a'); px(g, x, y, 10, 2, '#b8854e'); px(g, x + 4, y, 2, 10, '#7a5028'); }
function sack(g, x, y) { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, 6, 7, 0, 0, 7); g.fill(); g.fillStyle = '#d7c294'; g.beginPath(); g.ellipse(x, y, 5, 6, 0, 0, 7); g.fill(); px(g, x - 2, y - 7, 4, 2, '#a58c5c'); }

function drawBuildingSprite(type, fi) {
  const d = BDEF[type], W2 = d.w * TS, H2 = d.h * TS, top = TOP[type], c = mk(W2 + 8, H2 + top), g = c.getContext('2d');
  const F = FAC[fi], ox = 4, oy = top;                    // footprint origin inside the canvas
  px(g, ox + 4, oy + H2 - 8, W2 - 4, 8, 'rgba(0,0,0,0.25)');
  const plaster = '#d8c49a';
  switch (type) {
    case 'hall': {
      px(g, ox, oy + H2 * 0.25, W2, H2 * 0.75 - 2, '#8f7a5a');            // courtyard paving
      stoneWall(g, ox + 6, oy + 34, W2 - 12, H2 - 40);
      roof(g, ox + 2, oy - 26, W2 - 4, 62, F.col);
      // bell tower
      stoneWall(g, ox + W2 / 2 - 14, oy - 50, 28, 30); px(g, ox + W2 / 2 - 6, oy - 44, 12, 12, '#2a1d16'); px(g, ox + W2 / 2 - 4, oy - 40, 8, 8, '#d9b45a');
      g.fillStyle = INK; g.beginPath(); g.moveTo(ox + W2 / 2 - 18, oy - 48); g.lineTo(ox + W2 / 2, oy - 64); g.lineTo(ox + W2 / 2 + 18, oy - 48); g.fill();
      g.fillStyle = F.dark; g.beginPath(); g.moveTo(ox + W2 / 2 - 15, oy - 49); g.lineTo(ox + W2 / 2, oy - 61); g.lineTo(ox + W2 / 2 + 15, oy - 49); g.fill();
      door(g, ox + W2 / 2 - 8, oy + H2 - 26, 16, 20);
      for (const k of [18, 38, W2 - 44, W2 - 24]) win(g, ox + k, oy + H2 - 52);
      flag(g, ox + 8, oy - 20, F.col); flag(g, ox + W2 - 22, oy - 20, F.col);
      break;
    }
    case 'house': {
      wall(g, ox + 6, oy + 18, W2 - 12, H2 - 22, plaster, true);
      roof(g, ox + 2, oy - 18, W2 - 4, 40, F.col);
      px(g, ox + W2 - 18, oy - 26, 8, 14, INK); px(g, ox + W2 - 17, oy - 25, 6, 12, '#8c7f72');
      door(g, ox + 12, oy + H2 - 20); win(g, ox + W2 - 22, oy + H2 - 18);
      break;
    }
    case 'lumber': {
      wall(g, ox + 4, oy + 10, W2 * 0.55, H2 - 16, '#9a6a3a', true);
      roof(g, ox, oy - 18, W2 * 0.62, 34, F.col);
      // open saw shed
      px(g, ox + W2 * 0.6, oy + 4, 4, H2 - 8, INK); px(g, ox + W2 - 10, oy + 4, 4, H2 - 8, INK);
      roof(g, ox + W2 * 0.58, oy - 4, W2 * 0.42 - 4, 14, '#7a5028');
      px(g, ox + W2 * 0.64, oy + H2 * 0.55, W2 * 0.3, 6, INK); px(g, ox + W2 * 0.64 + 1, oy + H2 * 0.55 + 1, W2 * 0.3 - 2, 4, '#c9a06a');
      px(g, ox + W2 * 0.72, oy + H2 * 0.4, 2, 10, '#c7ccd3');
      logs(g, ox + 14, oy + H2 - 8, 8);
      door(g, ox + 20, oy + H2 - 26);
      break;
    }
    case 'mine': {
      wall(g, ox + 6, oy + 14, W2 * 0.5, H2 - 20, '#8a5f3a', true);
      roof(g, ox + 2, oy - 14, W2 * 0.58, 32, F.col);
      door(g, ox + 14, oy + H2 - 24);
      // cart + piles
      for (const [x, y, col] of [[W2 * 0.68, H2 - 26, '#9c968d'], [W2 * 0.84, H2 - 36, '#e8c547']]) { g.fillStyle = INK; g.beginPath(); g.ellipse(ox + x, oy + y, 13, 9, 0, 0, 7); g.fill(); g.fillStyle = col; g.beginPath(); g.ellipse(ox + x, oy + y, 11, 7, 0, 0, 7); g.fill(); }
      px(g, ox + W2 * 0.55, oy + H2 - 18, 24, 12, INK); px(g, ox + W2 * 0.55 + 1, oy + H2 - 17, 22, 9, '#6e4a2a'); px(g, ox + W2 * 0.55 + 3, oy + H2 - 20, 18, 4, '#9c968d');
      g.fillStyle = INK; for (const k of [4, 18]) { g.beginPath(); g.arc(ox + W2 * 0.55 + k, oy + H2 - 6, 3, 0, 7); g.fill(); }
      px(g, ox + W2 * 0.48, oy + 4, 2, 18, '#6e4a2a'); px(g, ox + W2 * 0.44, oy + 4, 12, 3, '#9aa3ab');
      break;
    }
    case 'farm': {                                                    // the field is drawn live; this is the little hut
      wall(g, ox + 2, oy - 4, 24, 18, plaster, true); roof(g, ox, oy - 18, 28, 16, F.col); door(g, ox + 8, oy + 4, 7, 10);
      px(g, ox + 34, oy - 6, 2, 20, INK); px(g, ox + 28, oy - 2, 14, 2, '#7a5028');            // scarecrow
      px(g, ox + 31, oy - 12, 8, 7, INK); px(g, ox + 32, oy - 11, 6, 5, '#d8b25a'); px(g, ox + 29, oy, 12, 8, F.col);
      break;
    }
    case 'granary': {
      const cxs = ox + W2 / 2;
      g.fillStyle = INK; g.beginPath(); g.ellipse(cxs, oy + H2 - 14, W2 * 0.36 + 2, 12, 0, 0, 7); g.fill();
      px(g, cxs - W2 * 0.36 - 2, oy + 6, W2 * 0.72 + 4, H2 - 20, INK);
      px(g, cxs - W2 * 0.36, oy + 6, W2 * 0.72, H2 - 20, '#c7a66c');
      for (let k = 0; k < 5; k++) px(g, cxs - W2 * 0.36 + 6 + k * W2 * 0.14, oy + 6, 2, H2 - 20, '#9a7c48');
      g.fillStyle = '#c7a66c'; g.beginPath(); g.ellipse(cxs, oy + H2 - 14, W2 * 0.36, 10, 0, 0, Math.PI); g.fill();
      g.fillStyle = INK; g.beginPath(); g.moveTo(cxs - W2 * 0.44, oy + 10); g.lineTo(cxs, oy - 40); g.lineTo(cxs + W2 * 0.44, oy + 10); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.moveTo(cxs - W2 * 0.41, oy + 8); g.lineTo(cxs, oy - 36); g.lineTo(cxs + W2 * 0.41, oy + 8); g.fill();
      g.fillStyle = shadeC(F.col, 1.2); g.beginPath(); g.moveTo(cxs - 4, oy - 30); g.lineTo(cxs, oy - 36); g.lineTo(cxs - W2 * 0.2, oy + 6); g.lineTo(cxs - W2 * 0.3, oy + 6); g.fill();
      door(g, cxs - 5, oy + H2 - 32, 10, 14);
      sack(g, ox + 10, oy + H2 - 10); sack(g, ox + W2 - 8, oy + H2 - 12); sack(g, ox + W2 - 18, oy + H2 - 6);
      break;
    }
    case 'storehouse': {
      wall(g, ox + 4, oy + 6, W2 - 8, H2 - 10, '#8a5f3a', true);
      roof(g, ox, oy - 22, W2, 34, F.col);
      px(g, ox + W2 / 2 - 12, oy + H2 - 26, 24, 22, INK); px(g, ox + W2 / 2 - 11, oy + H2 - 25, 22, 21, '#4a3018');
      crate(g, ox + 6, oy + H2 - 14); crate(g, ox + W2 - 18, oy + H2 - 14); crate(g, ox + W2 - 22, oy + H2 - 24);
      break;
    }
    case 'barracks': {
      stoneWall(g, ox + 4, oy + 12, W2 - 8, H2 - 16);
      roof(g, ox, oy - 24, W2, 40, F.col);
      for (let k = ox + 6; k < ox + W2 - 6; k += 12) px(g, k, oy + 8, 6, 6, '#a39d92');
      door(g, ox + W2 / 2 - 10, oy + H2 - 26, 20, 22);
      flag(g, ox + 10, oy - 34, F.col); flag(g, ox + W2 - 24, oy - 34, F.col);
      for (let k = 0; k < 4; k++) { px(g, ox + 14 + k * 5, oy + H2 - 34, 2, 28, '#7a5028'); px(g, ox + 13 + k * 5, oy + H2 - 38, 4, 5, '#c7ccd3'); }
      px(g, ox + 10, oy + H2 - 10, 26, 3, '#5a3d22');
      g.fillStyle = INK; g.beginPath(); g.arc(ox + W2 - 22, oy + H2 - 16, 8, 0, 7); g.fill(); g.fillStyle = F.col; g.beginPath(); g.arc(ox + W2 - 22, oy + H2 - 16, 6, 0, 7); g.fill(); px(g, ox + W2 - 23, oy + H2 - 22, 2, 12, '#d9b45a');
      break;
    }
    case 'stable': {
      wall(g, ox + 4, oy + 8, W2 - 8, H2 * 0.55, '#8a5f3a', true);
      roof(g, ox, oy - 22, W2, 34, F.col);
      for (let k = 0; k < 3; k++) { const x = ox + 14 + k * 34; px(g, x - 1, oy + 22, 20, 18, INK); px(g, x, oy + 23, 18, 16, '#3a2410'); px(g, x + 6, oy + 26, 8, 8, '#7a4a28'); px(g, x + 8, oy + 24, 3, 4, '#7a4a28'); }
      for (let k = ox + 2; k < ox + W2; k += 14) px(g, k, oy + H2 - 22, 3, 18, '#6e4a2a');
      px(g, ox + 2, oy + H2 - 18, W2 - 4, 3, '#8a5f3a'); px(g, ox + 2, oy + H2 - 10, W2 - 4, 3, '#8a5f3a');
      px(g, ox + W2 - 30, oy + H2 - 40, 18, 12, INK); px(g, ox + W2 - 29, oy + H2 - 39, 16, 10, '#e2c35a');
      break;
    }
    case 'shrine': {
      stoneWall(g, ox + 4, oy + H2 - 30, W2 - 8, 26);                                 // plinth
      px(g, ox + 10, oy + H2 - 34, W2 - 20, 5, '#b9b2a6');
      for (const k of [0, 1, 2, 3]) { const x = ox + 14 + k * (W2 - 36) / 3; px(g, x - 1, oy - 10, 10, H2 - 22, INK); px(g, x, oy - 9, 8, H2 - 24, '#cfc8bb'); px(g, x + 5, oy - 9, 2, H2 - 24, '#a9a295'); }
      px(g, ox + 6, oy - 20, W2 - 12, 12, INK); px(g, ox + 7, oy - 19, W2 - 14, 10, '#d8d1c3');
      g.fillStyle = INK; g.beginPath(); g.moveTo(ox + 2, oy - 18); g.lineTo(ox + W2 / 2, oy - 52); g.lineTo(ox + W2 - 2, oy - 18); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.moveTo(ox + 7, oy - 20); g.lineTo(ox + W2 / 2, oy - 47); g.lineTo(ox + W2 - 7, oy - 20); g.fill();
      g.fillStyle = 'rgba(255,240,180,0.35)'; g.beginPath(); g.ellipse(ox + W2 / 2, oy + H2 / 2 - 6, 18, 22, 0, 0, 7); g.fill();
      px(g, ox + W2 / 2 - 9, oy + H2 / 2 - 2, 18, 14, INK); px(g, ox + W2 / 2 - 8, oy + H2 / 2 - 1, 16, 12, '#8f877a');
      g.fillStyle = '#ffe28a'; g.beginPath(); g.moveTo(ox + W2 / 2, oy + H2 / 2 - 20); g.lineTo(ox + W2 / 2 + 5, oy + H2 / 2 - 6); g.lineTo(ox + W2 / 2 - 5, oy + H2 / 2 - 6); g.fill();
      break;
    }
    case 'smith': {
      stoneWall(g, ox + 6, oy + 12, W2 - 12, H2 - 18);
      roof(g, ox + 2, oy - 20, W2 - 4, 36, F.col);
      px(g, ox + W2 - 24, oy - 36, 14, 26, INK); px(g, ox + W2 - 23, oy - 35, 12, 24, '#8c847a');
      px(g, ox + 12, oy + H2 - 26, 22, 18, INK); px(g, ox + 13, oy + H2 - 25, 20, 16, '#3a2410'); px(g, ox + 16, oy + H2 - 18, 14, 8, '#f08a2c'); px(g, ox + 19, oy + H2 - 16, 8, 4, '#ffd36a');
      px(g, ox + W2 - 34, oy + H2 - 16, 18, 5, INK); px(g, ox + W2 - 33, oy + H2 - 15, 16, 3, '#6d757d'); px(g, ox + W2 - 28, oy + H2 - 12, 6, 8, '#4b5258');
      break;
    }
    case 'woodyard': {
      px(g, ox + 2, oy + 4, 4, H2 - 8, INK); px(g, ox + W2 - 8, oy + 4, 4, H2 - 8, INK);
      roof(g, ox, oy - 14, W2, 22, F.col);
      for (let r = 0; r < 3; r++) for (let k = 0; k < 7; k++) { const x = ox + 8 + k * 9 + (r % 2) * 4, y = oy + H2 - 14 - r * 8; px(g, x - 1, y - 1, 9, 8, INK); px(g, x, y, 7, 6, '#b8854e'); px(g, x + 2, y + 2, 3, 2, '#d8a76a'); }
      px(g, ox + W2 - 30, oy + H2 - 34, 14, 10, INK); px(g, ox + W2 - 29, oy + H2 - 33, 12, 8, '#8a6440'); px(g, ox + W2 - 24, oy + H2 - 44, 2, 12, '#6b4a2b'); px(g, ox + W2 - 27, oy + H2 - 45, 7, 3, '#c7ccd3');
      break;
    }
    case 'hunter': {
      wall(g, ox + 4, oy + 12, W2 - 8, H2 - 16, '#7a5028', false);
      for (let r = oy + 14; r < oy + H2 - 4; r += 6) px(g, ox + 4, r, W2 - 8, 1, '#5a3a1c');
      roof(g, ox, oy - 20, W2, 34, '#5d6b3a');
      px(g, ox + 4, oy - 22, W2 - 8, 3, F.col);
      door(g, ox + W2 / 2 - 4, oy + H2 - 20);
      px(g, ox + W2 / 2 - 7, oy + 14, 14, 2, '#d8c49a'); px(g, ox + W2 / 2 - 8, oy + 8, 2, 7, '#d8c49a'); px(g, ox + W2 / 2 + 6, oy + 8, 2, 7, '#d8c49a');   // antlers
      px(g, ox - 2, oy + 18, 2, 24, '#6b4a2b'); px(g, ox - 4, oy + 22, 8, 12, '#a8794a');                                                      // drying hide
      break;
    }
    case 'mill': {
      const cxs = ox + W2 / 2;
      g.fillStyle = INK; g.beginPath(); g.moveTo(cxs - 22, oy + H2 - 6); g.lineTo(cxs - 14, oy - 26); g.lineTo(cxs + 14, oy - 26); g.lineTo(cxs + 22, oy + H2 - 6); g.fill();
      g.fillStyle = '#d6cdb8'; g.beginPath(); g.moveTo(cxs - 20, oy + H2 - 8); g.lineTo(cxs - 12, oy - 24); g.lineTo(cxs + 12, oy - 24); g.lineTo(cxs + 20, oy + H2 - 8); g.fill();
      g.fillStyle = '#b9ae96'; g.beginPath(); g.moveTo(cxs + 4, oy - 24); g.lineTo(cxs + 12, oy - 24); g.lineTo(cxs + 20, oy + H2 - 8); g.lineTo(cxs + 8, oy + H2 - 8); g.fill();
      g.fillStyle = INK; g.beginPath(); g.moveTo(cxs - 18, oy - 22); g.lineTo(cxs, oy - 50); g.lineTo(cxs + 18, oy - 22); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.moveTo(cxs - 15, oy - 23); g.lineTo(cxs, oy - 46); g.lineTo(cxs + 15, oy - 23); g.fill();
      door(g, cxs - 5, oy + H2 - 26, 10, 18); win(g, cxs - 3, oy + 6);
      sack(g, ox + 10, oy + H2 - 8); sack(g, ox + W2 - 10, oy + H2 - 10);
      break;
    }
    case 'bakery': {
      const brick = '#b2593a';
      px(g, ox + 2, oy + 6, W2 - 4, H2 - 10, INK); px(g, ox + 4, oy + 8, W2 - 8, H2 - 14, brick);
      for (let r = 0; r < H2 - 14; r += 5) for (let k = (r / 5) % 2 ? 0 : 4; k < W2 - 8; k += 9) px(g, ox + 4 + k, oy + 8 + r, 1, 5, '#8a3f26');
      roof(g, ox, oy - 22, W2, 32, F.col);
      px(g, ox + W2 - 22, oy - 34, 12, 22, INK); px(g, ox + W2 - 21, oy - 33, 10, 20, '#8c4a30');
      px(g, ox + 12, oy + H2 - 26, 20, 16, INK); g.fillStyle = '#3a1d10'; g.beginPath(); g.arc(ox + 22, oy + H2 - 14, 8, Math.PI, 0); g.fill(); px(g, ox + 15, oy + H2 - 15, 14, 5, '#f08a2c'); px(g, ox + 18, oy + H2 - 14, 8, 2, '#ffd36a');
      px(g, ox + W2 - 40, oy + H2 - 14, 26, 4, '#6b4a2b'); for (const k of [0, 9, 18]) { g.fillStyle = INK; g.beginPath(); g.ellipse(ox + W2 - 36 + k, oy + H2 - 17, 5, 3.5, 0, 0, 7); g.fill(); g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(ox + W2 - 36 + k, oy + H2 - 17, 4, 2.5, 0, 0, 7); g.fill(); }
      break;
    }
    case 'brewery': {
      wall(g, ox + 4, oy + 10, W2 - 8, H2 - 16, plaster, true);
      roof(g, ox, oy - 20, W2, 36, F.col);
      door(g, ox + W2 / 2 - 8, oy + H2 - 24, 16, 18);
      const barrel = (x, y) => { g.fillStyle = INK; g.beginPath(); g.ellipse(x, y, 8, 9, 0, 0, 7); g.fill(); g.fillStyle = '#8a5a30'; g.beginPath(); g.ellipse(x, y, 7, 8, 0, 0, 7); g.fill(); px(g, x - 7, y - 4, 14, 2, '#4a3020'); px(g, x - 7, y + 3, 14, 2, '#4a3020'); };
      barrel(ox + 12, oy + H2 - 10); barrel(ox + 27, oy + H2 - 10); barrel(ox + 19, oy + H2 - 22); barrel(ox + W2 - 14, oy + H2 - 10);
      for (let k = 0; k < 4; k++) { px(g, ox + W2 - 30 + k * 5, oy + 12, 2, 22, '#4f7a2c'); px(g, ox + W2 - 31 + k * 5, oy + 14 + (k % 2) * 6, 4, 4, '#8fbf4a'); }
      break;
    }
    case 'sawmill': {
      px(g, ox + 2, oy + 4, 4, H2 - 8, INK); px(g, ox + W2 - 8, oy + 4, 4, H2 - 8, INK);
      roof(g, ox, oy - 18, W2, 26, F.col);
      px(g, ox + 10, oy + H2 - 26, W2 - 26, 8, INK); px(g, ox + 11, oy + H2 - 25, W2 - 28, 6, '#b08250');                    // log on the saw bench
      g.fillStyle = INK; g.beginPath(); g.arc(ox + W2 / 2, oy + H2 - 26, 9, 0, 7); g.fill(); g.fillStyle = '#c7ccd3'; g.beginPath(); g.arc(ox + W2 / 2, oy + H2 - 26, 7.5, 0, 7); g.fill();
      for (let k = 0; k < 8; k++) { const a = k * Math.PI / 4; px(g, ox + W2 / 2 + Math.cos(a) * 8 - 1, oy + H2 - 26 + Math.sin(a) * 8 - 1, 2, 2, '#8a929b'); }
      for (let r = 0; r < 3; r++) { px(g, ox + 6, oy + H2 - 8 - r * 4, 22, 4, INK); px(g, ox + 7, oy + H2 - 7 - r * 4, 20, 2, '#d8b07a'); }
      break;
    }
    case 'smelter': {
      stoneWall(g, ox + 6, oy + 8, W2 - 12, H2 - 14);
      roof(g, ox + 2, oy - 16, W2 * 0.6, 30, F.col);
      px(g, ox + W2 - 30, oy - 30, 20, H2 + 18, INK); px(g, ox + W2 - 29, oy - 29, 18, H2 + 16, '#8c7f72');                  // furnace stack
      for (let r = oy - 26; r < oy + H2 - 14; r += 6) px(g, ox + W2 - 29, r, 18, 1, '#6e6359');
      px(g, ox + W2 - 26, oy + H2 - 26, 12, 12, INK); px(g, ox + W2 - 25, oy + H2 - 25, 10, 10, '#f08a2c'); px(g, ox + W2 - 23, oy + H2 - 22, 6, 5, '#ffd36a');
      for (let k = 0; k < 3; k++) { px(g, ox + 10 + k * 9, oy + H2 - 12, 8, 5, INK); px(g, ox + 11 + k * 9, oy + H2 - 11, 6, 3, '#6d757d'); }
      break;
    }
    case 'cartshed': {
      wall(g, ox + 4, oy + 8, W2 - 8, H2 - 14, '#8a5f3a', true);
      roof(g, ox, oy - 20, W2, 32, F.col);
      px(g, ox + W2 / 2 - 16, oy + H2 - 30, 32, 26, INK); px(g, ox + W2 / 2 - 15, oy + H2 - 29, 30, 25, '#3a2410');
      drawWagon(g, ox + W2 / 2, oy + H2 - 8, 1, F.col, false);
      break;
    }
    case 'market': {
      const stall = (x, col) => { px(g, x, oy + 14, 3, H2 - 18, INK); px(g, x + 34, oy + 14, 3, H2 - 18, INK);
        for (let k = 0; k < 6; k++) { px(g, x - 2 + k * 7, oy + 4, 7, 12, k % 2 ? '#f4efe6' : col); } px(g, x - 3, oy + 3, 44, 2, INK); px(g, x - 3, oy + 15, 44, 2, INK);
        px(g, x + 2, oy + H2 - 20, 33, 6, INK); px(g, x + 3, oy + H2 - 19, 31, 4, '#8a5f3a'); };
      stall(ox + 6, F.col); stall(ox + W2 - 46, '#c9962a');
      crate(g, ox + 12, oy + H2 - 34); sack(g, ox + 30, oy + H2 - 26); for (let k = 0; k < 4; k++) px(g, ox + W2 - 40 + k * 7, oy + H2 - 26, 5, 5, ['#c8463a', '#e8c547', '#6fa046', '#d9a35a'][k]);
      flag(g, ox + W2 / 2 - 1, oy - 26, F.col);
      break;
    }
    case 'workshop': {
      px(g, ox + 2, oy + 2, 4, H2 - 6, INK); px(g, ox + W2 - 8, oy + 2, 4, H2 - 6, INK); px(g, ox + W2 / 2 - 2, oy + 2, 4, H2 - 6, INK);
      roof(g, ox, oy - 22, W2, 30, F.col);
      drawRam(g, ox + 34, oy + H2 - 8, 1, F.col, 0);
      drawCatapult(g, ox + W2 - 34, oy + H2 - 8, -1, F.col, 0);
      for (let k = 0; k < 3; k++) { px(g, ox + W2 / 2 - 10, oy + H2 - 12 - k * 4, 22, 4, INK); px(g, ox + W2 / 2 - 9, oy + H2 - 11 - k * 4, 20, 2, '#d8b07a'); }
      break;
    }
    case 'dock': {
      // a plank pier on stilts with a little boathouse
      for (let k = 0; k < 6; k++) { px(g, ox + 6 + k * 15, oy + H2 - 14, 4, 14, INK); px(g, ox + 7 + k * 15, oy + H2 - 13, 2, 12, '#5a3d22'); }
      px(g, ox, oy + 10, W2, H2 - 20, INK); px(g, ox + 1, oy + 11, W2 - 2, H2 - 22, '#b08250');
      for (let k = 0; k < W2; k += 8) px(g, ox + k, oy + 11, 1, H2 - 22, '#8a6440');
      wall(g, ox + 8, oy - 4, 30, 24, '#9a6a3a', true); roof(g, ox + 4, oy - 20, 38, 22, F.col);
      px(g, ox + W2 - 22, oy - 8, 3, 22, INK); px(g, ox + W2 - 21, oy - 7, 1, 20, '#6b4a2b');
      px(g, ox + W2 - 30, oy + 8, 18, 3, '#d7c294'); crate(g, ox + 48, oy + 10); sack(g, ox + 72, oy + 18);
      break;
    }
    case 'camp': {
      // ragged tents round a fire, a crude banner
      for (const [tx, ty, w] of [[10, 34, 34], [52, 24, 36], [30, 56, 30]]) {
        g.fillStyle = INK; g.beginPath(); g.moveTo(ox + tx - 2, oy + ty + 18); g.lineTo(ox + tx + w / 2, oy + ty - 14); g.lineTo(ox + tx + w + 2, oy + ty + 18); g.fill();
        g.fillStyle = '#7d6a52'; g.beginPath(); g.moveTo(ox + tx + 1, oy + ty + 16); g.lineTo(ox + tx + w / 2, oy + ty - 10); g.lineTo(ox + tx + w - 1, oy + ty + 16); g.fill();
        px(g, ox + tx + w / 2 - 3, oy + ty + 6, 6, 10, '#2a1d16');
      }
      px(g, ox + 44, oy + 58, 14, 6, INK); px(g, ox + 46, oy + 54, 10, 6, '#e8742a'); px(g, ox + 48, oy + 50, 6, 5, '#f3cf6a');
      flag(g, ox + W2 - 16, oy - 6, F.col); px(g, ox + W2 - 12, oy - 3, 5, 3, '#d9d2c4');
      break;
    }
    case 'palisade': case 'wall': case 'gate': {
      drawWallPiece(g, ox, oy, type, F.col, { L: true, R: true }, false);
      break;
    }
    case 'tower': {
      stoneWall(g, ox + 10, oy - 52, W2 - 20, H2 + 46);
      px(g, ox + W2 / 2 - 3, oy - 34, 6, 10, INK); px(g, ox + W2 / 2 - 3, oy - 6, 6, 10, INK);
      px(g, ox + 4, oy - 62, W2 - 8, 12, INK); px(g, ox + 6, oy - 60, W2 - 12, 8, '#7a5028');
      g.fillStyle = INK; g.beginPath(); g.moveTo(ox + 2, oy - 60); g.lineTo(ox + W2 / 2, oy - 86); g.lineTo(ox + W2 - 2, oy - 60); g.fill();
      g.fillStyle = F.col; g.beginPath(); g.moveTo(ox + 6, oy - 61); g.lineTo(ox + W2 / 2, oy - 82); g.lineTo(ox + W2 - 6, oy - 61); g.fill();
      door(g, ox + W2 / 2 - 5, oy + H2 - 18, 10, 14);
      break;
    }
  }
  return c;
}
function buildBuildingSprites(nFac) {
  POST_SPR = drawTradingPost();
  for (const type of Object.keys(BDEF)) { if (BDEF[type].road) continue; BSPR[type] = []; for (let i = 0; i < Math.max(4, nFac); i++) BSPR[type].push(drawBuildingSprite(type, i)); }
}
function buildingIcon(type) {
  const s = BSPR[type][0], c = mk(48, 48), g = c.getContext('2d'), k = Math.min(44 / s.width, 44 / s.height);
  if (type === 'farm') {                                         // field + hut, so the button reads as a farm
    px(g, 3, 14, 42, 32, INK); px(g, 4, 15, 40, 30, '#7a5734');
    for (let r = 19; r < 44; r += 6) { px(g, 6, r + 2, 36, 1, '#5f4426'); for (let x = 7; x < 42; x += 3) px(g, x, r - 1, 2, 3, x % 2 ? '#e0be4a' : '#c9a83a'); }
    g.drawImage(s, 4, 0, 30, 30 * s.height / s.width);
    return c.toDataURL();
  }
  g.imageSmoothingEnabled = true; g.drawImage(s, (48 - s.width * k) / 2, (48 - s.height * k) / 2, s.width * k, s.height * k);
  return c.toDataURL();
}

// ── people (drawn live; ~16 px tall at zoom 1) ─────────────────────────────
const SKIN = ['#e9b98f', '#c98f62', '#8f5b38', '#f1cba7'];
function drawPerson(g, u, X, Y, vis) {
  const F = FAC[u.fac], t = u.type, walk = u.moving ? Math.floor(u.anim) % 2 : 0;
  const dir = u.dir, skin = SKIN[u.id % 4];
  g.fillStyle = 'rgba(0,0,0,0.25)'; g.beginPath(); g.ellipse(X, Y + 1, t === 'knight' ? 11 : 6, 3, 0, 0, 7); g.fill();
  const flash = u.hitT > 0;
  if (t === 'knight' || t === 'hero') {
    // horse
    const hc = ['#7a4a28', '#4a3020', '#c9b49a'][u.id % 3];
    px(g, X - 11, Y - 14, 22, 9, INK); px(g, X - 10, Y - 13, 20, 7, flash ? '#fff' : hc);
    px(g, X + dir * 8 - 3, Y - 22, 6, 11, INK); px(g, X + dir * 8 - 2, Y - 21, 4, 9, hc); px(g, X + dir * 11 - 2, Y - 21, 4, 4, hc);
    for (const lx of [-9, -5, 4, 8]) px(g, X + lx, Y - 6 + ((walk && lx % 2) ? -1 : 0), 2, 6, INK);
    px(g, X - 10, Y - 13, 20, 3, F.col);                         // caparison
    if (t === 'hero') { px(g, X - 10, Y - 10, 20, 2, '#f3cf6a'); }
    Y -= 10;
  }
  // legs
  if (t !== 'knight') { px(g, X - 3, Y - 6, 2, 6 - (walk ? 1 : 0), '#4a3424'); px(g, X + 1, Y - 6, 2, 6 - (walk ? 0 : 1), '#4a3424'); }
  // body
  const body = t === 'villager' ? shadeC(F.col, 0.85) : t === 'archer' ? '#5b6b3a' : t === 'bandit' ? '#5e4b3a' : '#8e949b';
  px(g, X - 5, Y - 15, 10, 10, INK); px(g, X - 4, Y - 14, 8, 8, flash ? '#ffffff' : body);
  if (t === 'hero') { px(g, X - dir * 5 - 3, Y - 15, 4, 13, INK); px(g, X - dir * 5 - 2, Y - 14, 2, 12, F.col); }
  if (t !== 'villager') px(g, X - 4, Y - 11, 8, 3, F.col); else px(g, X - 4, Y - 8, 8, 2, '#6b4a2b');
  // head
  px(g, X - 4, Y - 21, 8, 7, INK); px(g, X - 3, Y - 20, 6, 5, skin);
  if (t === 'villager') px(g, X - 3, Y - 21, 6, 2, u.stage === 'elder' ? '#dcdcdc' : ['#3b2414', '#7a4a1e', '#c9a04a', '#222'][u.id % 4]);
  else if (t === 'archer') { px(g, X - 4, Y - 22, 8, 4, '#4a5a2a'); }
  else if (t === 'bandit') { px(g, X - 5, Y - 23, 10, 6, INK); px(g, X - 4, Y - 22, 8, 4, '#3d3630'); px(g, X - 3, Y - 17, 6, 2, '#3d3630'); }
  else if (t === 'hero') { px(g, X - 4, Y - 25, 8, 5, INK); px(g, X - 3, Y - 24, 6, 3, '#f3cf6a'); px(g, X - 3, Y - 26, 1, 2, '#f3cf6a'); px(g, X, Y - 26, 1, 2, '#f3cf6a'); px(g, X + 2, Y - 26, 1, 2, '#f3cf6a'); }
  else { px(g, X - 4, Y - 23, 8, 4, INK); px(g, X - 3, Y - 22, 6, 3, '#b5bcc4'); if (t === 'knight') px(g, X - 1, Y - 26, 2, 4, F.col); }
  px(g, X + dir * 1 - 1 + (dir > 0 ? 1 : 0), Y - 18, 1, 1, INK);
  // gear / action
  const sw = u.swing > 0 || ['chop', 'mine', 'build', 'farm', 'craft', 'butcher'].includes(u.act) ? Math.sin(W.t * 14 + u.id) : 0;
  const hx = X + dir * 5;
  if (t === 'villager') {
    if (u.act === 'shoot') { g.strokeStyle = '#6b4a2b'; g.lineWidth = 2; g.beginPath(); g.arc(X + dir * 3, Y - 12, 7, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.2 : Math.PI + 1.2); g.stroke(); }
    else if (['chop', 'mine', 'build', 'craft', 'butcher'].includes(u.act)) {
      const up = sw > 0; px(g, hx - 1, Y - (up ? 20 : 14), 2, 8, '#6b4a2b');
      px(g, hx + dir * (up ? 0 : 2) - 2, Y - (up ? 22 : 9), 5, 3, u.act === 'chop' || u.act === 'butcher' ? '#c7ccd3' : u.act === 'mine' ? '#9aa3ab' : '#6d757d');
    } else if (u.act === 'farm') { px(g, hx - 1, Y - 14 + (sw > 0 ? -2 : 1), 2, 10, '#6b4a2b'); px(g, hx + dir * 2 - 1, Y - 5 + (sw > 0 ? -2 : 1), 4, 2, '#9aa3ab'); }
    if (u.carry && u.carry.n > 0) {
      const col = { wood: '#a0703f', stone: '#a39d92', gold: '#f3cf6a', food: '#e3c25a', firewood: '#c98a4a', flour: '#f1ebe0', bread: '#d9a35a', meat: '#b8463a', ale: '#8a5a30' }[u.carry.res];
      px(g, X - dir * 5 - 3, Y - 18, 7, 8, INK); px(g, X - dir * 5 - 2, Y - 17, 5, 6, col);
    }
  } else if (t === 'sword') {
    const a = u.swing > 0 ? 1 : 0;
    px(g, X - dir * 7 - 2, Y - 15, 5, 9, INK); px(g, X - dir * 7 - 1, Y - 14, 3, 7, F.col);       // shield
    if (a) px(g, hx, Y - 12, dir * 10, 2, '#e1e6ea'); else px(g, hx, Y - 22, 2, 11, '#e1e6ea');
  } else if (t === 'spear') {
    const thrust = u.swing > 0 ? dir * 6 : 0;
    px(g, hx + thrust, Y - 28, 2, 24, '#7a5028'); px(g, hx + thrust - 1, Y - 31, 4, 4, '#e1e6ea');
  } else if (t === 'archer') {
    g.strokeStyle = '#6b4a2b'; g.lineWidth = 2; g.beginPath(); g.arc(X + dir * 3, Y - 12, 7, dir > 0 ? -1.2 : Math.PI - 1.2, dir > 0 ? 1.2 : Math.PI + 1.2); g.stroke();
    px(g, X - dir * 6 - 1, Y - 18, 3, 9, '#7a5028');
  } else if (t === 'bandit') {
    const up = u.swing > 0; px(g, hx - 1, Y - (up ? 22 : 15), 2, 10, '#6b4a2b'); px(g, hx + dir * 1 - 2, Y - (up ? 24 : 9), 5, 4, '#b5bcc4');
  } else if (t === 'knight' || t === 'hero') {
    const a = u.swing > 0 ? 1 : 0;
    if (a) px(g, hx, Y - 12, dir * 12, 2, '#e1e6ea'); else px(g, hx, Y - 24, 2, 13, '#e1e6ea');
  }
}

// ── deer (drawn live) ──────────────────────────────────────────────────────
function drawDeer(g, d, X, Y) {
  const step = d.moving ? Math.floor(d.anim) % 2 : 0, dir = d.dir;
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.beginPath(); g.ellipse(X, Y + 1, 9, 2.5, 0, 0, 7); g.fill();
  for (const lx of [-7, -4, 3, 6]) px(g, X + lx, Y - 7 + (step && lx % 2 ? -1 : 0), 2, 7, INK);
  px(g, X - 9, Y - 14, 18, 8, INK); px(g, X - 8, Y - 13, 16, 6, '#9a6638'); px(g, X - 8, Y - 9, 16, 2, '#c9a27a');
  px(g, X - dir * 9 - 1, Y - 14, 3, 3, '#f4efe6');
  px(g, X + dir * 7 - 2, Y - 20, 6, 8, INK); px(g, X + dir * 7 - 1, Y - 19, 4, 6, '#9a6638'); px(g, X + dir * 10 - 1, Y - 18, 3, 3, '#9a6638');
  if (d.buck) { px(g, X + dir * 6 - 1, Y - 25, 2, 6, '#5a3d22'); px(g, X + dir * 9 - 1, Y - 25, 2, 6, '#5a3d22'); px(g, X + dir * 4 - 1, Y - 25, 4, 1, '#5a3d22'); px(g, X + dir * 9, Y - 25, 4, 1, '#5a3d22'); }
}

// ── wagons, trading post, roads ────────────────────────────────────────────
function drawWagon(g, X, Y, dir, col, horse) {
  if (horse) { const hx = X + dir * 14; px(g, hx - 7, Y - 12, 14, 7, INK); px(g, hx - 6, Y - 11, 12, 5, '#7a4a28'); px(g, hx + dir * 6 - 2, Y - 17, 5, 8, INK); px(g, hx + dir * 6 - 1, Y - 16, 3, 6, '#7a4a28'); for (const lx of [-5, 4]) px(g, hx + lx, Y - 6, 2, 6, INK); }
  px(g, X - 11, Y - 12, 22, 8, INK); px(g, X - 10, Y - 11, 20, 6, '#8a5f3a');
  g.fillStyle = INK; g.beginPath(); g.ellipse(X, Y - 13, 11, 8, 0, Math.PI, 0); g.fill(); g.fillStyle = '#efe3c6'; g.beginPath(); g.ellipse(X, Y - 13, 10, 7, 0, Math.PI, 0); g.fill();
  px(g, X - 10, Y - 13, 20, 2, col);
  for (const wx of [-7, 7]) { g.fillStyle = INK; g.beginPath(); g.arc(X + wx, Y - 3, 4, 0, 7); g.fill(); g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(X + wx, Y - 3, 2.5, 0, 7); g.fill(); }
}
let POST_SPR = null;
function drawTradingPost() {
  const W2 = 3 * TS, H2 = 3 * TS, c = mk(W2 + 8, H2 + 40), g = c.getContext('2d'), ox = 4, oy = 40;
  px(g, ox, oy + 8, W2, H2 - 10, 'rgba(120,95,60,0.5)');
  const tent = (x, y, col) => { g.fillStyle = INK; g.beginPath(); g.moveTo(x - 20, y); g.lineTo(x, y - 30); g.lineTo(x + 20, y); g.fill(); g.fillStyle = col; g.beginPath(); g.moveTo(x - 17, y - 1); g.lineTo(x, y - 27); g.lineTo(x + 17, y - 1); g.fill(); g.fillStyle = '#3a2410'; g.beginPath(); g.moveTo(x - 5, y - 1); g.lineTo(x, y - 12); g.lineTo(x + 5, y - 1); g.fill(); };
  tent(ox + 26, oy + 34, '#d8c49a'); tent(ox + W2 - 24, oy + 30, '#b8463a'); tent(ox + W2 / 2, oy + H2 - 8, '#5d8aa8');
  crate(g, ox + 8, oy + H2 - 20); sack(g, ox + W2 - 14, oy + H2 - 12); flag(g, ox + W2 / 2 - 1, oy - 16, '#8a5fb0');
  return c;
}

// ── walls (autotiled live; also used for icons) ────────────────────────────
function drawWallPiece(g, X, Y, type, col, con, open) {
  const stone = type !== 'palisade', H = type === 'gate' ? 30 : stone ? 26 : 22;
  const base = Y + TS - 4, cx = X + TS / 2;
  const seg = (x0, x1, top) => {                                  // a run of wall seen from the front
    if (stone) {
      px(g, x0, top - 1, x1 - x0, base - top + 2, INK); px(g, x0 + 1, top, x1 - x0 - 2, base - top, '#a39d92');
      for (let r = top + 6; r < base; r += 6) px(g, x0 + 1, r, x1 - x0 - 2, 1, '#7c766c');
      for (let r = top, k = 0; r < base; r += 6, k++) for (let c = x0 + 1 + (k % 2) * 4; c < x1 - 1; c += 8) px(g, c, r, 1, 6, '#8c867c');
      for (let c = x0 + 1; c < x1 - 3; c += 7) { px(g, c, top - 5, 4, 5, INK); px(g, c + 1, top - 4, 2, 4, '#c4beb3'); }
      px(g, x0 + 1, top, x1 - x0 - 2, 2, '#c4beb3');
    } else {
      for (let c = x0; c < x1; c += 5) { const t = top + ((c / 5) % 2 ? 2 : 0); px(g, c, t, 5, base - t + 1, INK); px(g, c + 1, t + 1, 3, base - t - 1, (c / 5) % 2 ? '#8a5f3a' : '#9a6a3a'); px(g, c + 2, t - 2, 1, 3, INK); }
      px(g, x0, top + 8, x1 - x0, 2, '#5a3d22');
    }
  };
  const top = base - H;
  if (con.U) seg(cx - 6, cx + 6, top - TS / 2);
  if (con.L) seg(X, cx + 1, top); if (con.R) seg(cx - 1, X + TS, top);
  seg(cx - 7, cx + 7, top - (con.U ? TS / 2 - 4 : 0));
  if (type === 'gate') {
    px(g, cx - 9, top - 4, 18, H + 4, INK); px(g, cx - 8, top - 3, 16, H + 2, '#a39d92'); px(g, cx - 8, top - 3, 16, 3, col);
    if (open) { px(g, cx - 6, top + 6, 12, H - 7, '#2a1d16'); }
    else { px(g, cx - 6, top + 6, 12, H - 7, '#6b4a2b'); px(g, cx - 1, top + 6, 1, H - 7, INK); for (let r = top + 10; r < base; r += 6) px(g, cx - 6, r, 12, 1, '#4a3020'); }
  }
}
// ── siege engines and the Lord ─────────────────────────────────────────────
function drawRam(g, X, Y, dir, col, swing) {
  for (const wx of [-10, 0, 10]) { g.fillStyle = INK; g.beginPath(); g.arc(X + wx, Y - 3, 4, 0, 7); g.fill(); g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(X + wx, Y - 3, 2.5, 0, 7); g.fill(); }
  px(g, X - 15, Y - 22, 30, 16, INK); px(g, X - 14, Y - 21, 28, 14, '#7a5028');
  g.fillStyle = INK; g.beginPath(); g.moveTo(X - 17, Y - 21); g.lineTo(X, Y - 32); g.lineTo(X + 17, Y - 21); g.fill();
  g.fillStyle = col; g.beginPath(); g.moveTo(X - 14, Y - 22); g.lineTo(X, Y - 30); g.lineTo(X + 14, Y - 22); g.fill();
  const hx = X + dir * (16 + swing * 5);
  px(g, X - dir * 6 - 2, Y - 14, 2, 4, INK); px(g, Math.min(X, hx) - 1, Y - 15, Math.abs(hx - X) + 4, 6, INK); px(g, Math.min(X, hx), Y - 14, Math.abs(hx - X) + 2, 4, '#9a7448');
  px(g, hx - (dir > 0 ? 0 : 4), Y - 16, 5, 8, '#6d757d');
}
function drawCatapult(g, X, Y, dir, col, fire) {
  for (const wx of [-9, 9]) { g.fillStyle = INK; g.beginPath(); g.arc(X + wx, Y - 3, 4, 0, 7); g.fill(); g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(X + wx, Y - 3, 2.5, 0, 7); g.fill(); }
  px(g, X - 13, Y - 9, 26, 5, INK); px(g, X - 12, Y - 8, 24, 3, '#7a5028');
  px(g, X - 2, Y - 20, 5, 12, INK); px(g, X - 1, Y - 19, 3, 10, '#8a5f3a');
  const a = fire ? -1.2 : 0.55;                                    // throwing arm
  g.save(); g.translate(X, Y - 18); g.rotate(dir * a);
  px(g, -dir * 16 - 1, -2, 18, 4, INK); px(g, -dir * 16, -1, 16, 2, '#9a7448');
  g.fillStyle = INK; g.beginPath(); g.arc(-dir * 17, -2, 4, 0, 7); g.fill(); g.fillStyle = '#8c847a'; g.beginPath(); g.arc(-dir * 17, -2, 2.5, 0, 7); g.fill();
  g.restore(); px(g, X - 11, Y - 10, 22, 2, col);
}
function drawSiegeTower(g, X, Y, dir, col, deployed) {
  for (const wx of [-9, 9]) { g.fillStyle = INK; g.beginPath(); g.arc(X + wx, Y - 3, 4, 0, 7); g.fill(); g.fillStyle = '#6b4a2b'; g.beginPath(); g.arc(X + wx, Y - 3, 2.5, 0, 7); g.fill(); }
  px(g, X - 13, Y - 62, 26, 58, INK); px(g, X - 12, Y - 61, 24, 56, '#8a5f3a');
  for (let r = Y - 56; r < Y - 6; r += 8) px(g, X - 12, r, 24, 1, '#5a3d22');
  px(g, X - 12, Y - 61, 24, 5, col);
  for (let c = X - 12; c < X + 12; c += 6) px(g, c, Y - 66, 4, 5, INK);
  if (deployed) { px(g, X + dir * 12 - (dir < 0 ? 18 : 0), Y - 50, 18, 4, INK); px(g, X + dir * 12 - (dir < 0 ? 17 : -1), Y - 49, 16, 2, '#b08250'); }
  else { px(g, X + dir * 12 - (dir < 0 ? 4 : 0), Y - 58, 4, 22, INK); px(g, X + dir * 12 - (dir < 0 ? 3 : -1), Y - 57, 2, 20, '#b08250'); }
}

// ── boats, ruins, shrines ──────────────────────────────────────────────────
function drawBoat(g, u, X, Y) {
  const F = FAC[u.fac], dir = u.dir || 1, bob = Math.sin(W.t * 2 + u.id) * 1.2, t = u.type, flash = u.hitT > 0;
  const L = t === 'fishboat' ? 15 : t === 'transport' ? 22 : 26;
  Y += bob;
  g.fillStyle = 'rgba(220,240,255,0.35)'; g.beginPath(); g.ellipse(X, Y + 3, L + 4, 5, 0, 0, 7); g.fill();
  if (u.moving) { g.strokeStyle = 'rgba(240,250,255,0.6)'; g.lineWidth = 1.5; g.beginPath(); g.moveTo(X - dir * L, Y + 2); g.lineTo(X - dir * (L + 10), Y - 1); g.moveTo(X - dir * L, Y + 4); g.lineTo(X - dir * (L + 10), Y + 7); g.stroke(); }
  // hull
  g.fillStyle = INK; g.beginPath(); g.moveTo(X - L - 2, Y - 8); g.lineTo(X + L + 2, Y - 8); g.lineTo(X + dir * (L + 6), Y - 11); g.lineTo(X + L - 4 * dir, Y + 3); g.lineTo(X - L + 4 * dir, Y + 3); g.closePath(); g.fill();
  g.fillStyle = flash ? '#fff' : '#8a5a30'; g.fillRect(X - L, Y - 7, L * 2, 8); g.fillStyle = '#6b4220'; g.fillRect(X - L, Y - 2, L * 2, 2);
  g.fillStyle = F.col; g.fillRect(X - L, Y - 7, L * 2, 2);
  if (t === 'fishboat') {
    px(g, X - 1, Y - 24, 2, 17, INK);
    g.fillStyle = INK; g.beginPath(); g.moveTo(X + 1, Y - 23); g.lineTo(X + 12 * dir, Y - 12); g.lineTo(X + 1, Y - 10); g.fill(); g.fillStyle = '#efe4cc'; g.beginPath(); g.moveTo(X + 2 * dir, Y - 21); g.lineTo(X + 10 * dir, Y - 12); g.lineTo(X + 2 * dir, Y - 11); g.fill();
    if (u.act === 'fish') { g.strokeStyle = '#d7c294'; g.lineWidth = 1; g.beginPath(); g.moveTo(X - dir * 10, Y - 8); g.lineTo(X - dir * 18, Y + 4); g.stroke(); }
    if (u.catch) px(g, X - dir * 8 - 3, Y - 12, 6, 4, '#c9d9e6');
  } else {
    const mh = t === 'transport' ? 34 : 40;
    px(g, X - 1, Y - mh, 3, mh - 7, INK);
    px(g, X - 12, Y - mh + 3, 24, mh - 16, INK); px(g, X - 11, Y - mh + 4, 22, mh - 18, '#efe4cc');
    for (let k = 0; k < (t === 'warship' ? 3 : 1); k++) px(g, X - 11, Y - mh + 7 + k * 8, 22, 3, F.col);
    if (t === 'warship') for (let k = -1; k <= 1; k++) { px(g, X + k * 9 - 2, Y - 13, 5, 6, INK); px(g, X + k * 9 - 1, Y - 12, 3, 4, '#8e949b'); }
    if (t === 'transport' && (u.load || []).length) for (let k = 0; k < Math.min(5, u.load.length); k++) { px(g, X - 15 + k * 7, Y - 12, 5, 5, INK); px(g, X - 14 + k * 7, Y - 11, 3, 3, F.col); }
  }
}
function drawRuins(g, p, X, Y) {
  g.fillStyle = 'rgba(0,0,0,0.2)'; g.fillRect(X + 2, Y + 50, 60, 8);
  for (const [x, h] of [[6, 30], [24, 16], [44, 38]]) { px(g, X + x - 1, Y + 54 - h, 12, h + 2, INK); px(g, X + x, Y + 55 - h, 10, h, '#b8b2a6'); px(g, X + x, Y + 55 - h, 3, h, '#d6d0c4'); px(g, X + x - 2, Y + 53 - h, 14, 4, INK); px(g, X + x - 1, Y + 54 - h, 12, 2, '#cfc8bb'); }
  px(g, X + 14, Y + 50, 30, 6, INK); px(g, X + 15, Y + 51, 28, 4, '#9c968d');
  if (!p.looted) { const s = 0.5 + Math.sin(W.t * 4) * 0.5; g.fillStyle = `rgba(243,207,106,${0.35 + s * 0.4})`; g.beginPath(); g.arc(X + 32, Y + 44, 4 + s * 2, 0, 7); g.fill(); }
}
function drawShrine(g, p, X, Y) {
  g.fillStyle = 'rgba(0,0,0,0.22)'; g.fillRect(X + 4, Y + 54, 56, 8);
  px(g, X + 6, Y + 44, 52, 14, INK); px(g, X + 7, Y + 45, 50, 12, '#a39d92'); px(g, X + 7, Y + 45, 50, 3, '#c6c0b4');
  px(g, X + 20, Y + 10, 24, 36, INK); px(g, X + 21, Y + 11, 22, 34, '#d6d0c4'); px(g, X + 21, Y + 11, 6, 34, '#ece6da');
  g.fillStyle = INK; g.beginPath(); g.moveTo(X + 16, Y + 12); g.lineTo(X + 32, Y - 2); g.lineTo(X + 48, Y + 12); g.fill();
  g.fillStyle = p.owner >= 0 ? FAC[p.owner].col : '#8c847a'; g.beginPath(); g.moveTo(X + 19, Y + 11); g.lineTo(X + 32, Y + 1); g.lineTo(X + 45, Y + 11); g.fill();
  const s = 0.5 + Math.sin(W.t * 3 + p.x) * 0.5; g.fillStyle = `rgba(255,240,180,${0.5 + s * 0.4})`; g.fillRect(X + 29, Y + 22, 6, 10);
}
