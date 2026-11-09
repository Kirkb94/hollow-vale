// ── art: sprite sheets from Hollow Vale ────────────────────────────────────
const IMG = {}, SHEET = {};
let CATALOG = null;
function loadImg(src) { if (!IMG[src]) { IMG[src] = new Image(); IMG[src].decoding = 'async'; IMG[src].src = src; } return IMG[src]; }
const OBJ = () => loadImg('art/objects-pocket-chibi.png'), TER = () => loadImg('art/terrain-pocket-chibi.png');
function sheetOf(k) {
  const key = k === 'worker' ? null : k;
  if (!key || !CATALOG || !CATALOG.units[key]) return null;
  if (!SHEET[key]) { const c = CATALOG.units[key]; SHEET[key] = { img: loadImg('art/frames/' + c.file), c }; }
  return SHEET[key];
}
const unitLook = u => u.k === 'worker' ? WORKER[W.P[u.side].fac] : u.k;
const CLIP_FALLBACK = { attack: ['attack', 'cast', 'shoot', 'thrust'], walk: ['walk', 'idle'], hurt: ['hurt', 'idle'], death: ['death', 'hurt'], spawn: ['spawn', 'idle'], idle: ['idle'], cast: ['cast', 'attack'] };
function frameFor(sh, anim, t) {
  const clips = sh.c.clips || {}, order = anim === 'attack' && sh.c.attack ? [sh.c.attack, ...CLIP_FALLBACK.attack] : CLIP_FALLBACK[anim] || ['idle'];
  let clip = null; for (const n of order) if (clips[n]) { clip = clips[n]; break; }
  if (!clip) clip = { row: 0, frames: [0], duration: 1000, loop: true };
  const n = clip.frames.length, dur = clip.duration / 1000;
  const f = clip.loop || anim === 'walk' || anim === 'idle' ? Math.floor((t % dur) / dur * n) : Math.min(n - 1, Math.floor(t / dur * n));
  return [clip.frames[f], clip.row];
}
// portrait: first idle frame cropped into a little canvas (for buttons)
const PORT = {};
function portrait(k) {
  const look = k;
  if (PORT[look]) return PORT[look];
  const sh = sheetOf(look); if (!sh || !sh.img.complete || !sh.img.naturalWidth) return null;
  const cols = sh.c.columns, fw = sh.img.naturalWidth / cols, fh = sh.img.naturalHeight / 6;
  const c = document.createElement('canvas'); c.width = 96; c.height = 96; const g = c.getContext('2d'); g.imageSmoothingEnabled = false;
  const s = Math.min(96 / fw, 96 / fh) * 1.35; g.drawImage(sh.img, 0, 0, fw, fh, 48 - fw * s / 2, 92 - fh * s, fw * s, fh * s);
  PORT[look] = c.toDataURL(); return PORT[look];
}
function objSprite(name) { const b = OBJ_BOX[name]; return b; }

// ── camera and canvas ─────────────────────────────────────────────────────
const cv = $('view'), ctx = cv.getContext('2d');
const cam = { x: 0, y: 0, z: 1 };
function resize() { cv.width = innerWidth * devicePixelRatio; cv.height = innerHeight * devicePixelRatio; cv.style.width = innerWidth + 'px'; cv.style.height = innerHeight + 'px'; }
addEventListener('resize', resize); resize();
const viewW = () => innerWidth / cam.z, viewH = () => innerHeight / cam.z;
function centerOn(tx, ty) { cam.x = tx * TS - viewW() / 2; cam.y = ty * TS - viewH() / 2; clampCam(); }
function clampCam() { cam.x = clamp(cam.x, -100, MW * TS - viewW() + 100); cam.y = clamp(cam.y, -60, MH * TS - viewH() + 220); }
const toTile = (sx, sy) => [(sx / cam.z + cam.x) / TS, (sy / cam.z + cam.y) / TS];

// ── terrain bake from the Hollow Vale terrain atlas ────────────────────────
let TERRAIN = null;
const TCELL = { grass: [0, 0], forest: [1, 0], rocks: [2, 0], swamp: [3, 0], sand: [3, 1], shallow: [0, 2], deep: [1, 2] };
function bakeTerrain() {
  const T = TER(), c = document.createElement('canvas'); c.width = MW * TS; c.height = MH * TS; const g = c.getContext('2d');
  g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
  const cell = 362, tile = (name, x, y, v) => { const [cx, cy] = TCELL[name], q = v % 4, sx = cx * cell + (q % 2) * cell / 2, sy = cy * cell + (q >> 1) * cell / 2; g.drawImage(T, sx, sy, cell / 2, cell / 2, x * TS, y * TS, TS, TS); };
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = map.ter[ix(x, y)], v = map.var[ix(x, y)];
    tile(t === 4 ? (([[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => inMap(x + dx, y + dy) && map.ter[ix(x + dx, y + dy)] !== 4)) ? 'shallow' : 'deep') : t === 5 ? 'sand' : t === 3 ? 'swamp' : 'grass', x, y, v);
  }
  // trees and rocks as whole tiles on top (drawn larger so canopies overlap)
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const t = map.ter[ix(x, y)];
    if (t !== 1 && t !== 2) continue;
    const [cx, cy] = TCELL[t === 1 ? 'forest' : 'rocks'], v = map.var[ix(x, y)];
    const sx = cx * cell + (v % 2) * cell / 2, sy = cy * cell + (v >> 1) * cell / 2;
    g.drawImage(T, sx, sy, cell / 2, cell / 2, x * TS - 6, y * TS - 10, TS + 12, TS + 12);
  }
  TERRAIN = c;
}

// ── render ─────────────────────────────────────────────────────────────────
function drawBuildingSprite(b, X, Y, w, alpha) {
  const d = BDEF[b.type], name = d.spr === 'tower' ? SIDES[b.side >= 0 ? b.side : 0].tower : d.spr, box = OBJ_BOX[name];
  const img = OBJ(); if (!img.complete) return;
  const W2 = w, H2 = W2 * box[3] / box[2];
  ctx.save(); ctx.globalAlpha = alpha;
  if (d.spr === 'tower' && b.side >= 0 && SIDES[b.side].hue) ctx.filter = SIDES[b.side].hue;
  ctx.drawImage(img, box[0], box[1], box[2], box[3], X - W2 / 2, Y - H2, W2, H2);
  ctx.restore();
}
function render() {
  const z = cam.z * devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0d0f14'; ctx.fillRect(0, 0, cv.width, cv.height);
  ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
  ctx.imageSmoothingEnabled = cam.z < 1;
  if (TERRAIN) ctx.drawImage(TERRAIN, 0, 0);
  const x0 = Math.floor(cam.x / TS) - 2, y0 = Math.floor(cam.y / TS) - 2, x1 = x0 + Math.ceil(viewW() / TS) + 4, y1 = y0 + Math.ceil(viewH() / TS) + 5;
  const onScreen = (x, y, w = 1, h = 1) => x + w >= x0 && x <= x1 && y + h >= y0 && y <= y1;
  // ruins
  for (const f of W.fx) if (f.kind === 'ruin' && onScreen(f.x, f.y, f.w, f.h)) { ctx.fillStyle = 'rgba(40,30,20,0.45)'; ctx.fillRect(f.x * TS, f.y * TS, f.w * TS, f.h * TS); }
  // selection + rally markers under everything
  const list = [];
  for (const b of W.blds) if (!b.dead && onScreen(b.x, b.y - 2, b.w, b.h + 2) && (b.side === 0 || b.side < 0 || FOG.seen[ix(b.x, b.y)])) list.push({ y: (b.y + b.h) * TS, b });
  for (const u of W.units) if (!u.dead && onScreen(u.x - 1, u.y - 2, 2, 3) && (u.side === 0 || FOG.see(u.x, u.y))) list.push({ y: u.y * TS + (u.s.fly ? 40 : 0), u });
  for (const c of W.chests) if (FOG.seen[ix(Math.floor(c.x), Math.floor(c.y))]) list.push({ y: c.y * TS, c });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.b) {
      const b = it.b, X = (b.x + b.w / 2) * TS, Y = (b.y + b.h) * TS + 4, sel = UI.sel.has(b.id);
      if (sel) { ctx.strokeStyle = b.side === 0 ? '#9ef08a' : b.side < 0 ? '#f3d27a' : '#ff6b5a'; ctx.lineWidth = 2; ctx.strokeRect(b.x * TS, b.y * TS, b.w * TS, b.h * TS); }
      if (b.side >= 0) { ctx.fillStyle = SIDES[b.side].col + '55'; ctx.beginPath(); ctx.ellipse(X, Y - 6, b.w * TS * 0.48, b.h * TS * 0.28, 0, 0, 7); ctx.fill(); }
      const wpx = b.w * TS * (b.type === 'tower' || b.type === 'watch' ? 1.05 : 1.12) * (b.type === 'keep' ? 1.05 : 1);
      drawBuildingSprite(b, X, Y, wpx, b.done ? 1 : 0.45 + 0.4 * b.prog);
      if (!b.done) { ctx.strokeStyle = '#d7c294'; ctx.setLineDash([4, 4]); ctx.strokeRect(b.x * TS + 2, b.y * TS + 2, b.w * TS - 4, b.h * TS - 4); ctx.setLineDash([]); }
      if (b.hitT > 0) { b.hitT -= 1 / 60; }
      if (b.side >= 0 && (b.hp < b.maxHp || sel || !b.done)) hpBar(X, b.y * TS - 6, b.w * TS * 0.7, b.done ? b.hp / b.maxHp : b.prog, b.side === 0 ? '#74d06a' : SIDES[b.side].col);
      if (b.type === 'mine' && (sel || UI.hoverId === b.id)) { label(X, b.y * TS - 10, `${Math.floor(b.gold)} gold`); }
      if (b.side >= 0 && b.queue.length && b.side === 0) { const q = b.queue[0]; hpBar(X, Y + 6, b.w * TS * 0.6, 1 - q.t / q.total, '#e2b84a'); }
      continue;
    }
    if (it.c) { const box = OBJ_BOX.chest, X = it.c.x * TS, Y = it.c.y * TS + 6, w = 34; if (OBJ().complete) ctx.drawImage(OBJ(), box[0], box[1], box[2], box[3], X - w / 2, Y - w * box[3] / box[2], w, w * box[3] / box[2]); continue; }
    drawUnit(it.u);
  }
  // projectiles
  for (const p of W.projs) {
    const X = p.x * TS, Y = p.y * TS;
    if (p.kind === 'arrow') { const a = Math.atan2(p.ty - p.y, p.tx - p.x); ctx.strokeStyle = '#2a1d16'; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(X - Math.cos(a) * 9, Y - Math.sin(a) * 9); ctx.lineTo(X + Math.cos(a) * 5, Y + Math.sin(a) * 5); ctx.stroke(); ctx.strokeStyle = '#e8dcc0'; ctx.lineWidth = 1; ctx.stroke(); }
    else if (p.kind === 'rock') { ctx.fillStyle = '#2a1d16'; ctx.beginPath(); ctx.arc(X, Y, 5, 0, 7); ctx.fill(); ctx.fillStyle = '#9c968d'; ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = p.col || '#c9a6ff'; ctx.globalAlpha = 0.45; ctx.beginPath(); ctx.arc(X, Y, 8, 0, 7); ctx.fill(); ctx.globalAlpha = 1; ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(X, Y, 3.5, 0, 7); ctx.fill(); }
  }
  // effects
  for (const f of W.fx) {
    const X = f.x * TS, Y = f.y * TS;
    if (f.kind === 'p') { ctx.globalAlpha = Math.min(1, f.t * 2); ctx.fillStyle = f.col; ctx.fillRect(X - 2, Y - 2, 4, 4); ctx.globalAlpha = 1; }
    else if (f.kind === 'txt') { ctx.globalAlpha = Math.min(1, f.t * 2); label(X, Y * 1, f.text, f.col); ctx.globalAlpha = 1; }
    else if (f.kind === 'ring') { ctx.strokeStyle = f.col; ctx.globalAlpha = f.t * 2; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(X, Y, (0.5 - f.t) * 90 + 10, (0.5 - f.t) * 45 + 5, 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
    else if (f.kind === 'heal') { ctx.fillStyle = '#9ef08a'; ctx.globalAlpha = f.t; for (let k = 0; k < 4; k++) ctx.fillRect(X - 10 + k * 7, Y - 30 - (0.8 - f.t) * 40 - k * 5, 3, 8), ctx.fillRect(X - 12 + k * 7, Y - 27 - (0.8 - f.t) * 40 - k * 5, 7, 2); ctx.globalAlpha = 1; }
  }
  // fog
  ctx.imageSmoothingEnabled = true;
  if (!W.reveal) {
    for (let y = Math.max(0, y0); y < Math.min(MH, y1); y++) for (let x = Math.max(0, x0); x < Math.min(MW, x1); x++) {
      const k = ix(x, y); if (FOG.vis[k]) continue;
      ctx.fillStyle = FOG.seen[k] ? 'rgba(8,10,16,0.5)' : '#0b0d12'; ctx.fillRect(x * TS - 0.5, y * TS - 0.5, TS + 1, TS + 1);
    }
  }
  // placement ghost
  if (UI.placing && UI.ghost) {
    const d = BDEF[UI.placing], g = UI.ghost, ok = canPlace(UI.placing, g.x, g.y) && FOG.seen[ix(clamp(g.x, 0, MW - 1), clamp(g.y, 0, MH - 1))];
    ctx.fillStyle = ok ? 'rgba(120,230,120,0.22)' : 'rgba(240,80,70,0.3)'; ctx.fillRect(g.x * TS, g.y * TS, d.w * TS, d.h * TS);
    drawBuildingSprite({ type: UI.placing, side: 0 }, (g.x + d.w / 2) * TS, (g.y + d.h) * TS + 4, d.w * TS * 1.1, 0.55);
  }
  // drag box
  if (UI.drag && UI.drag.box) { const d = UI.drag; ctx.setTransform(devicePixelRatio, 0, 0, devicePixelRatio, 0, 0); ctx.strokeStyle = '#9ef08a'; ctx.lineWidth = 1.5; ctx.strokeRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)); ctx.fillStyle = 'rgba(158,240,138,0.08)'; ctx.fillRect(Math.min(d.x0, d.x1), Math.min(d.y0, d.y1), Math.abs(d.x1 - d.x0), Math.abs(d.y1 - d.y0)); }
  // order markers
  ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
  for (const m of UI.marks) { ctx.strokeStyle = m.atk ? '#ff6b5a' : '#9ef08a'; ctx.globalAlpha = m.t / 0.6; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x * TS, m.y * TS, 16 * (1.4 - m.t), 8 * (1.4 - m.t), 0, 0, 7); ctx.stroke(); ctx.globalAlpha = 1; }
}
function hpBar(X, Y, w, f, col) { ctx.fillStyle = '#000b'; ctx.fillRect(X - w / 2 - 1, Y - 1, w + 2, 6); ctx.fillStyle = f > 0.5 ? col : f > 0.25 ? '#e8c547' : '#e5574a'; ctx.fillRect(X - w / 2, Y, w * clamp(f, 0, 1), 4); }
function label(X, Y, text, col) { ctx.font = 'bold 13px Trebuchet MS, sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = '#000'; ctx.fillText(text, X + 1, Y + 1); ctx.fillStyle = col || '#f6ead0'; ctx.fillText(text, X, Y); ctx.textAlign = 'left'; }
function drawUnit(u) {
  const X = u.x * TS, Y = u.y * TS, sel = UI.sel.has(u.id), elite = u.k !== 'worker' && H[u.k].elite, squad = u.k !== 'worker' && H[u.k].group;
  const hgt = elite ? 104 : squad ? 52 : u.k === 'worker' ? 50 : 66, lift = u.s.fly ? 22 + Math.sin(W.t * 3 + u.id) * 4 : 0;
  // shadow + side ring
  ctx.fillStyle = 'rgba(0,0,0,0.3)'; ctx.beginPath(); ctx.ellipse(X, Y + 2, hgt * 0.26, hgt * 0.1, 0, 0, 7); ctx.fill();
  ctx.strokeStyle = sel ? '#9ef08a' : SIDES[u.side].col; ctx.lineWidth = sel ? 2.5 : 2; ctx.beginPath(); ctx.ellipse(X, Y + 2, hgt * 0.26, hgt * 0.1, 0, 0, 7); ctx.stroke();
  const sh = sheetOf(unitLook(u));
  ctx.save();
  if (u.dying) ctx.globalAlpha = clamp(u.dying / 0.5, 0, 1);
  if (sh && sh.img.complete && sh.img.naturalWidth) {
    const cols = sh.c.columns, fw = sh.img.naturalWidth / cols, fh = sh.img.naturalHeight / 6;
    const [fx, fy] = frameFor(sh, u.anim, u.animT), s = hgt / fh * 1.15, dw = fw * s, dh = fh * s;
    ctx.translate(X, Y - lift + 4);
    if (u.dir < 0) ctx.scale(-1, 1);
    ctx.imageSmoothingEnabled = false;
    if (u.hitT > 0) ctx.filter = 'brightness(2.2)';
    else if (u.stunT > 0) ctx.filter = 'grayscale(0.7)';
    ctx.drawImage(sh.img, fx * fw, fy * fh, fw, fh, -dw / 2, -dh * 0.86, dw, dh);
  } else {
    ctx.fillStyle = SIDES[u.side].col; ctx.beginPath(); ctx.arc(X, Y - 14 - lift, 10, 0, 7); ctx.fill();
    label(X, Y - 9 - lift, u.k === 'worker' ? '⛏' : H[u.k].e);
  }
  ctx.restore();
  if (u.burnT > 0) { ctx.fillStyle = 'rgba(255,140,40,0.7)'; ctx.beginPath(); ctx.arc(X + 8, Y - hgt * 0.6 - lift, 4 + Math.sin(W.t * 20) * 1.5, 0, 7); ctx.fill(); }
  if (u.carry > 0) { ctx.fillStyle = '#f3d27a'; ctx.beginPath(); ctx.arc(X - 10, Y - 8, 4, 0, 7); ctx.fill(); }
  if (!u.dying && (sel || u.hp < u.maxHp)) hpBar(X, Y - hgt * 0.9 - lift, elite ? 50 : 30, u.hp / u.maxHp, u.side === 0 ? '#74d06a' : SIDES[u.side].col);
  if (u.star && !u.dying) label(X, Y - hgt * 0.9 - lift - 4, '★'.repeat(u.star), '#f3d27a');
}

// ── minimap ────────────────────────────────────────────────────────────────
const mm = $('mm'), mg = mm.getContext('2d'); let MINI = null;
function bakeMini() {
  MINI = document.createElement('canvas'); MINI.width = MW; MINI.height = MH; const g = MINI.getContext('2d'), img = g.createImageData(MW, MH);
  const col = [[92, 150, 60], [36, 84, 40], [130, 128, 120], [74, 110, 70], [52, 96, 160], [210, 184, 120]];
  for (let i = 0; i < MW * MH; i++) img.data.set([...col[map.ter[i]], 255], i * 4);
  g.putImageData(img, 0, 0);
}
function drawMini() {
  const S = 180 / MW; mg.imageSmoothingEnabled = false; mg.drawImage(MINI, 0, 0, 180, 180);
  for (const b of W.blds) { if (b.dead) continue; if (b.side > 0 && !FOG.seen[ix(b.x, b.y)]) continue; mg.fillStyle = b.side < 0 ? '#f3d27a' : SIDES[b.side].col; mg.fillRect(b.x * S, b.y * S, b.w * S, b.h * S); }
  for (const u of W.units) { if (u.dead || (u.side !== 0 && !FOG.see(u.x, u.y))) continue; mg.fillStyle = SIDES[u.side].lite; mg.fillRect(u.x * S - 1, u.y * S - 1, 3, 3); }
  // fog
  mg.fillStyle = 'rgba(8,10,16,0.75)';
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) if (!FOG.seen[ix(x, y)] && !W.reveal) mg.fillRect(x * S, y * S, S + 0.5, S + 0.5);
  mg.strokeStyle = '#fff'; mg.lineWidth = 1; mg.strokeRect(cam.x / TS * S, cam.y / TS * S, viewW() / TS * S, viewH() / TS * S);
  for (const a of W.alerts) if (a.x !== undefined && a.kind === 'bad') { mg.strokeStyle = '#ff5a4a'; mg.beginPath(); mg.arc(a.x * S, a.y * S, 6 + (a.t % 1) * 6, 0, 7); mg.stroke(); }
}
