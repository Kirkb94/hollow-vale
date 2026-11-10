// 05 fog of war + world rendering.
const cvs = document.getElementById('c'), ctx = cvs.getContext('2d');
let VW = 0, VH = 0;
const cam = { x: 0, y: 0, z: 1 };
function resize() { cvs.width = innerWidth; cvs.height = innerHeight; VW = cvs.width; VH = cvs.height; }
addEventListener('resize', resize);

const FOG = {
  vis: new Uint8Array(MW * MH), explored: new Uint8Array(MW * MH), cvs: null, img: null, t: 0,
  reset() { this.vis.fill(0); this.explored.fill(0); if (!this.cvs) { this.cvs = mk(MW, MH); this.img = this.cvs.getContext('2d').createImageData(MW, MH); } },
  stamp(x, y, r) {
    const r2 = r * r, x0 = Math.max(0, Math.floor(x - r)), x1 = Math.min(MW - 1, Math.ceil(x + r)), y0 = Math.max(0, Math.floor(y - r)), y1 = Math.min(MH - 1, Math.ceil(y + r));
    for (let yy = y0; yy <= y1; yy++) for (let xx = x0; xx <= x1; xx++) { const dx = xx + 0.5 - x, dy = yy + 0.5 - y; if (dx * dx + dy * dy <= r2) { const k = ix(xx, yy); this.vis[k] = 1; this.explored[k] = 1; } }
  },
  update() {
    this.vis.fill(0);
    if (UI.reveal || W.over) this.vis.fill(1);
    for (const u of W.units) if (ally(0, u.fac) && !u.dead) this.stamp(u.x, u.y, UDEF[u.type].sight);
    for (const b of W.blds) if (ally(0, b.fac) && !b.dead) this.stamp(b.x + b.w / 2, b.y + b.h / 2, (b.done ? BDEF[b.type].sight : 3) + Math.max(b.w, b.h) / 2);
    for (const b of W.blds) if (b.fac !== 0 && !b.seen) for (let yy = b.y; yy < b.y + b.h && !b.seen; yy++) for (let xx = b.x; xx < b.x + b.w; xx++) if (this.vis[ix(xx, yy)]) { b.seen = true; break; }
    const d = this.img.data;
    for (let i = 0; i < MW * MH; i++) { d[i * 4] = 12; d[i * 4 + 1] = 10; d[i * 4 + 2] = 14; d[i * 4 + 3] = this.vis[i] ? 0 : this.explored[i] ? 125 : 255; }
    this.cvs.getContext('2d').putImageData(this.img, 0, 0);
  },
  seenUnit(u) { return u.fac === 0 || this.vis[ix(clamp(Math.floor(u.x), 0, MW - 1), clamp(Math.floor(u.y), 0, MH - 1))]; }
};

function render() {
  const z = cam.z;
  cam.x = clamp(cam.x, -200 / z, MW * TS - VW / z + 200 / z); cam.y = clamp(cam.y, -200 / z, MH * TS - VH / z + 240 / z);
  ctx.setTransform(1, 0, 0, 1, 0, 0); ctx.fillStyle = '#0c0a0e'; ctx.fillRect(0, 0, VW, VH);
  ctx.setTransform(z, 0, 0, z, -cam.x * z, -cam.y * z);
  ctx.imageSmoothingEnabled = false;
  const vx0 = Math.max(0, cam.x), vy0 = Math.max(0, cam.y), vx1 = Math.min(MW * TS, cam.x + VW / z), vy1 = Math.min(MH * TS, cam.y + VH / z);
  if (vx1 > vx0 && vy1 > vy0) ctx.drawImage(TERRAIN, vx0, vy0, vx1 - vx0, vy1 - vy0, vx0, vy0, vx1 - vx0, vy1 - vy0);
  // seasons: snow settles through late autumn and melts in early spring; autumn warms the grass
  const C = W.cal || calendar(0), snow = seasonSnow(C);
  if (snow > 0) { ctx.fillStyle = `rgba(240,244,250,${0.62 * snow})`; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); }
  if (C.season === 2) { ctx.fillStyle = 'rgba(200,130,40,0.10)'; ctx.fillRect(vx0, vy0, vx1 - vx0, vy1 - vy0); }
  const tx0 = Math.max(0, Math.floor(cam.x / TS) - 2), ty0 = Math.max(0, Math.floor(cam.y / TS) - 1), tx1 = Math.min(MW - 1, Math.ceil((cam.x + VW / z) / TS) + 2), ty1 = Math.min(MH - 1, Math.ceil((cam.y + VH / z) / TS) + 3);
  const onScreen = (x, y, w = 1, h = 1) => x + w >= tx0 && x <= tx1 && y + h >= ty0 && y <= ty1;

  // roads
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    if (!map.road[ix(x, y)]) continue;
    const X = x * TS, Y = y * TS;
    ctx.drawImage(ROAD_TEX[(x * 3 + y * 5) % ROAD_TEX.length], X, Y);
    const r = (dx, dy) => inMap(x + dx, y + dy) && map.road[ix(x + dx, y + dy)];
    ctx.fillStyle = 'rgba(60,48,36,0.55)';
    if (!r(0, -1)) ctx.fillRect(X, Y, TS, 2); if (!r(0, 1)) ctx.fillRect(X, Y + TS - 2, TS, 2);
    if (!r(-1, 0)) ctx.fillRect(X, Y, 2, TS); if (!r(1, 0)) ctx.fillRect(X + TS - 2, Y, 2, TS);
    if (snow > 0) { ctx.fillStyle = `rgba(240,244,250,${0.35 * snow})`; ctx.fillRect(X, Y, TS, TS); }
  }
  // road tool preview
  if (UI.placing && BDEF[UI.placing].line && UI.roadDrag) {
    for (const [x, y] of roadLine(UI.roadDrag.x0, UI.roadDrag.y0, UI.roadDrag.x1, UI.roadDrag.y1)) { const ok = canPlace(0, UI.placing, x, y); ctx.fillStyle = ok ? 'rgba(150,240,140,0.45)' : 'rgba(240,80,70,0.3)'; ctx.fillRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4); }
  }
  if (UI.placing === 'road') {
    const tiles = UI.roadDrag ? roadLine(UI.roadDrag.x0, UI.roadDrag.y0, UI.roadDrag.x1, UI.roadDrag.y1) : UI.ghost ? [[UI.ghost.x, UI.ghost.y]] : [];
    const rem = UI.roadDrag ? UI.roadDrag.remove : UI.keys.shift;
    for (const [x, y] of tiles) { const ok = rem ? inMap(x, y) && map.road[ix(x, y)] : roadOk(x, y); ctx.fillStyle = rem ? 'rgba(240,80,70,0.4)' : ok ? 'rgba(150,240,140,0.4)' : 'rgba(240,80,70,0.25)'; ctx.fillRect(x * TS + 2, y * TS + 2, TS - 4, TS - 4); }
  }
  // ground decals
  for (const f of W.fx) {
    if (f.kind === 'stump' && onScreen(f.x, f.y)) { const X = f.x * TS, Y = f.y * TS; if (f.nk === 'tree') { px(ctx, X + 12, Y + 18, 9, 7, INK); px(ctx, X + 13, Y + 19, 7, 5, '#8a6440'); px(ctx, X + 15, Y + 20, 3, 2, '#b08250'); } else { px(ctx, X + 8, Y + 18, 16, 6, 'rgba(60,55,50,0.45)'); } }
    else if (f.kind === 'rubble' && onScreen(f.x, f.y, f.w, f.h)) { ctx.globalAlpha = Math.min(1, f.t / 10); for (let i = 0; i < f.w * f.h * 3; i++) { const R = mulberry32(i + f.x * 7); px(ctx, f.x * TS + R() * (f.w * TS - 8), f.y * TS + R() * (f.h * TS - 6), 6 + R() * 6, 4 + R() * 4, R() < 0.5 ? '#6b5d52' : '#4a3a2e'); } ctx.globalAlpha = 1; }
    else if (f.kind === 'corpse' && onScreen(f.x - 1, f.y - 1, 2, 2)) {
      const X = Math.round(f.x * TS), Y = Math.round(f.y * TS), d = f.dir || 1;
      ctx.globalAlpha = Math.min(1, f.t / 5);
      ctx.fillStyle = 'rgba(120,20,16,0.55)'; ctx.beginPath(); ctx.ellipse(X + d * 2, Y + 1, 9, 3.5, 0, 0, 7); ctx.fill();
      if (f.type === 'knight') { px(ctx, X - 11, Y - 7, 22, 8, INK); px(ctx, X - 10, Y - 6, 20, 6, '#6a4226'); }
      px(ctx, X - 8, Y - 4, 15, 5, INK); px(ctx, X - 7 * d - (d < 0 ? 6 : 0), Y - 3, 9, 3, f.col); px(ctx, X + d * 4 - 2, Y - 4, 5, 4, '#c98f62');
      ctx.globalAlpha = 1;
    }
  }
  // farm fields
  for (const b of W.blds) {
    if (b.type !== 'farm' || !onScreen(b.x, b.y, b.w, b.h) || (b.fac !== 0 && !b.seen)) continue;
    const X = b.x * TS, Y = b.y * TS, w = b.w * TS, h = b.h * TS;
    px(ctx, X, Y, w, h, '#5a3f22'); px(ctx, X + 2, Y + 2, w - 4, h - 4, '#7a5734');
    const grow = !b.done || C.season === 3 ? 0 : clamp((C.season + C.seasonFrac) / 3 + (b.id % 5) * 0.02, 0.05, 1);
    const crop = grow < 0.33 ? '#6fa046' : grow < 0.66 ? '#9fb447' : '#e0be4a';
    if (C.season === 3) { for (let r = Y + 22; r < Y + h - 4; r += 8) px(ctx, X + 4, r + 2, w - 8, 3, 'rgba(244,247,251,0.9)'); continue; }
    for (let r = Y + 22; r < Y + h - 4; r += 8) {
      px(ctx, X + 4, r + 4, w - 8, 2, '#5f4426');
      if (b.done) for (let k = X + 6; k < X + w - 6; k += 5) { const hgt = 2 + Math.floor(grow * 6) + ((k + r) % 3 === 0 ? 1 : 0); px(ctx, k, r + 4 - hgt, 2, hgt, crop); if (grow > 0.7 && (k + r) % 2) px(ctx, k, r + 4 - hgt - 1, 2, 2, '#f3d77a'); }
    }
  }
  // build ghost footprint
  if (UI.placing && !BDEF[UI.placing].road) {
    const g = UI.ghost; if (g) {
      for (let yy = g.y; yy < g.y + BDEF[UI.placing].h; yy++) for (let xx = g.x; xx < g.x + BDEF[UI.placing].w; xx++) { ctx.fillStyle = g.ok ? 'rgba(120,230,120,0.28)' : 'rgba(240,80,70,0.35)'; ctx.fillRect(xx * TS, yy * TS, TS, TS); }
    }
  }
  // the Lord's aura
  for (const u of W.units) if ((u.type === 'hero' || UDEF[u.type].elite) && !u.dead && FOG.seenUnit(u) && onScreen(u.x - 9, u.y - 9, 18, 18)) {
    const r = (6 + heroLevel(u)) * TS; ctx.strokeStyle = `rgba(243,207,106,${UI.sel.has(u.id) ? 0.55 : 0.22})`; ctx.lineWidth = 2; ctx.setLineDash([6, 6]);
    ctx.beginPath(); ctx.ellipse(u.x * TS, u.y * TS, r, r * 0.55, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
  }
  // selection rings
  for (const id of UI.sel) {
    const e = byId(id); if (!e) continue;
    if (e.kind === 'unit') { if (e.aboard) continue; ctx.strokeStyle = e.fac === 0 ? '#9ef08a' : '#ff6b5a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.ellipse(e.x * TS, e.y * TS + 1, isNaval(e) ? 26 : UDEF[e.type].elite ? 17 : UDEF[e.type].mounted || e.type === 'knight' ? 13 : 8, isNaval(e) ? 7 : 4, 0, 0, 7); ctx.stroke(); }
    else { ctx.strokeStyle = e.fac === 0 ? '#9ef08a' : '#ff6b5a'; ctx.lineWidth = 2; ctx.setLineDash([6, 4]); ctx.strokeRect(e.x * TS - 2, e.y * TS - 2, e.w * TS + 4, e.h * TS + 4); ctx.setLineDash([]); }
  }

  // depth-sorted sprites
  const list = [];
  for (let y = ty0; y <= ty1; y++) for (let x = tx0; x <= tx1; x++) {
    const ni = map.node[ix(x, y)]; if (ni < 0) continue;
    const n = nodes[ni]; list.push({ y: (y + 1) * TS - 2, n });
  }
  for (const b of W.blds) if (onScreen(b.x - 1, b.y - 3, b.w + 2, b.h + 4) && (b.fac === 0 || b.seen)) list.push({ y: (b.y + b.h) * TS, b });
  for (const p of W.posts || []) if (onScreen(p.x - 1, p.y - 2, p.w + 2, p.h + 3) && FOG.explored[ix(p.x + 1, p.y + 1)]) list.push({ y: (p.y + p.h) * TS, post: p });
  for (const p of W.pois || []) if (p.kind !== 'camp' && onScreen(p.x - 1, p.y - 2, p.w + 2, p.h + 3) && FOG.explored[ix(p.x, p.y)]) list.push({ y: (p.y + p.h) * TS, poi: p });
  for (const u of W.units) if (!u.inside && !u.aboard && onScreen(u.x - 1, u.y - 1, 2, 2) && FOG.seenUnit(u)) list.push({ y: u.y * TS, u });
  for (const d of W.deer || []) if (onScreen(d.x - 1, d.y - 1, 2, 2) && FOG.vis[ix(Math.floor(d.x), Math.floor(d.y))]) list.push({ y: d.y * TS, d });
  list.sort((a, b) => a.y - b.y);
  for (const it of list) {
    if (it.n) {
      const n = it.n, set = n.kind === 'tree' ? NODE_SPR.treeS[C.season] : NODE_SPR[n.kind], sp = set[n.v % set.length];
      if (n.kind === 'tree') ctx.drawImage(sp, n.x * TS + 16 - 22, (n.y + 1) * TS - 56);
      else if (n.kind === 'carcass') ctx.drawImage(sp, n.x * TS - 2, n.y * TS + 6);
      else ctx.drawImage(sp, n.x * TS - 2, n.y * TS + 2);
    } else if (it.b) drawBuilding(it.b);
    else if (it.post) { const p = it.post; ctx.drawImage(POST_SPR, p.x * TS - 4, (p.y + p.h) * TS - POST_SPR.height); ctx.textAlign = 'center'; ctx.font = 'bold 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = INK; ctx.fillText('Trading Post', (p.x + 1.5) * TS + 1, (p.y + p.h) * TS + 13); ctx.fillStyle = '#f6ead0'; ctx.fillText('Trading Post', (p.x + 1.5) * TS, (p.y + p.h) * TS + 12); ctx.textAlign = 'left'; }
    else if (it.d) drawDeer(ctx, it.d, Math.round(it.d.x * TS), Math.round(it.d.y * TS));
    else if (it.poi) {
      const p = it.poi, X = p.x * TS, Y = (p.y + p.h) * TS - 60;
      if (p.kind === 'ruins') drawRuins(ctx, p, X, Y); else drawShrine(ctx, p, X, Y);
      if (p.kind === 'shrine' && p.prog > 0 && p.capFac >= 0) { ctx.strokeStyle = FAC[p.capFac].lite; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(X + 32, Y + 28, 22, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * p.prog / 12); ctx.stroke(); }
      const label = p.kind === 'ruins' ? (p.looted ? 'Ruins (searched)' : 'Ancient Ruins') : p.owner >= 0 ? `Shrine · ${FAC[p.owner].name}` : 'Shrine (unclaimed)';
      ctx.textAlign = 'center'; ctx.font = 'bold 12px "Alegreya Sans", sans-serif'; ctx.fillStyle = INK; ctx.fillText(label, X + 33, (p.y + p.h) * TS + 13); ctx.fillStyle = '#f6ead0'; ctx.fillText(label, X + 32, (p.y + p.h) * TS + 12); ctx.textAlign = 'left';
    }
    else {
      const u = it.u, X = Math.round(u.x * TS), Y = Math.round(u.y * TS);
      if (u.dying) ctx.globalAlpha = 0.5;
      if (isSiege(u)) { drawSiegeUnit(u, X, Y); ctx.globalAlpha = 1; continue; }
      if (isNaval(u)) { drawBoat(ctx, u, X, Y); ctx.globalAlpha = 1; continue; }
      if (u.shieldT > W.t) { ctx.fillStyle = 'rgba(134,170,245,0.35)'; ctx.beginPath(); ctx.ellipse(X, Y - 10, 11, 15, 0, 0, 7); ctx.fill(); }
      if (u.type === 'caravan') { drawWagon(ctx, X, Y, u.dir, FAC[u.fac].col, true); if (u.cargo) { px(ctx, X - 6, Y - 22, 12, 6, INK); px(ctx, X - 5, Y - 21, 10, 4, '#c9962a'); } ctx.globalAlpha = 1; continue; }
      if (u.cart && u.type === 'villager') { const cx0 = X - u.dir * 13; px(ctx, cx0 - 7, Y - 10, 14, 7, INK); px(ctx, cx0 - 6, Y - 9, 12, 5, '#8a5f3a'); if (u.carry && u.carry.n) px(ctx, cx0 - 5, Y - 13, 10, 4, { food: '#e3c25a', bread: '#d9a35a', flour: '#f1ebe0', planks: '#d8b07a', iron: '#8a929b', firewood: '#c98a4a', ale: '#8a5a30', meat: '#b8463a' }[u.carry.res] || '#a39d92'); px(ctx, cx0 - 1, Y - 4, 3, 3, INK); ctx.strokeStyle = INK; ctx.beginPath(); ctx.moveTo(cx0 + u.dir * 6, Y - 7); ctx.lineTo(X - u.dir * 3, Y - 9); ctx.stroke(); }
      if (isHV(u)) drawHVUnit(ctx, u, X, Y); else if (u.stage === 'child') { ctx.save(); ctx.translate(X, Y); ctx.scale(0.7, 0.7); drawPerson(ctx, u, 0, 0); ctx.restore(); } else drawPerson(ctx, u, X, Y);
      ctx.globalAlpha = 1;
      if (u.type === 'villager' && u.fac === 0 && (u.sick || u.happy < 30)) moodIcon(X, Y - (u.stage === 'child' ? 22 : 30), u.sick ? 'sick' : 'sad');
      if (u.rout > 0) { px(ctx, X + 6, Y - 34, 2, 16, INK); px(ctx, X + 8, Y - 34, 9, 6, INK); px(ctx, X + 9, Y - 33, 7, 4, '#f4efe6'); }
    }
  }
  // projectiles + particles
  for (const p of W.projs) if (p.rock) { const gy = lerp(p.sy, p.ty, Math.min(1, p.t / p.dur)); ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.beginPath(); ctx.ellipse(p.x * TS, gy * TS, 5, 2, 0, 0, 7); ctx.fill(); ctx.fillStyle = INK; ctx.beginPath(); ctx.arc(p.x * TS, p.y * TS, 5.5, 0, 7); ctx.fill(); ctx.fillStyle = '#8c847a'; ctx.beginPath(); ctx.arc(p.x * TS, p.y * TS, 4, 0, 7); ctx.fill(); }
  for (const f of W.fx) if (f.kind === 'ring') { const k = 1 - f.t; ctx.strokeStyle = `rgba(${f.col},${f.t})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.ellipse(f.x * TS, f.y * TS, f.r * TS * (0.3 + k * 0.7), f.r * TS * 0.55 * (0.3 + k * 0.7), 0, 0, 7); ctx.stroke(); }
  for (const p of W.projs) { if (p.rock) continue; if (!FOG.vis[ix(clamp(Math.floor(p.x), 0, MW - 1), clamp(Math.floor(p.y), 0, MH - 1))]) continue; ctx.save(); ctx.translate(p.x * TS, p.y * TS); ctx.rotate(p.ang || 0); px(ctx, -7, -1, 12, 2, '#5a3d22'); px(ctx, 4, -1, 3, 2, '#e1e6ea'); px(ctx, -8, -2, 2, 4, '#eee'); ctx.restore(); }
  for (const f of W.fx) if (f.kind === 'txt') { ctx.globalAlpha = Math.min(1, f.t); ctx.font = 'bold 13px "Alegreya Sans", sans-serif'; ctx.textAlign = 'center'; ctx.fillStyle = INK; ctx.fillText(f.text, f.x * TS + 1, (f.y - (2 - f.t) * 0.6) * TS + 1); ctx.fillStyle = '#f3cf6a'; ctx.fillText(f.text, f.x * TS, (f.y - (2 - f.t) * 0.6) * TS); ctx.textAlign = 'left'; ctx.globalAlpha = 1; }
  for (const f of W.fx) if (f.kind === 'p') { ctx.globalAlpha = Math.min(1, f.t * 2); px(ctx, f.x * TS, f.y * TS, 3, 3, f.col); ctx.globalAlpha = 1; }
  // health bars
  for (const b of W.blds) if ((b.hp < b.maxHp && b.done || UI.sel.has(b.id)) && (b.fac === 0 || FOG.vis[ix(b.x, b.y)]) && onScreen(b.x, b.y, b.w, b.h)) hpBar(b.x * TS + 4, (b.y) * TS - TOP[b.type] + 2, b.w * TS - 8, b.hp / b.maxHp, b.fac);
  for (const u of W.units) if (!u.inside && !u.aboard && (u.hp < u.maxHp || UI.sel.has(u.id)) && FOG.seenUnit(u) && onScreen(u.x - 1, u.y - 1, 2, 2)) {
    const hy = u.y * TS - (u.type === 'siegetower' ? 72 : isSiege(u) ? 38 : UDEF[u.type].mounted ? 40 : 30);
    hpBar(u.x * TS - 9, hy, 18, u.hp / u.maxHp, u.fac);
    if (u.morale !== undefined && moraleUnit(u) && (u.morale < 99 || UI.sel.has(u.id))) { px(ctx, u.x * TS - 10, hy + 4, 20, 3, INK); px(ctx, u.x * TS - 9, hy + 5, 18 * u.morale / 100, 1, u.morale < 30 ? '#ff8a6a' : '#86aaf5'); }
  }
  // rally flags
  for (const id of UI.sel) { const b = byId(id); if (b && b.kind === 'bld' && b.rally && b.fac === 0) { const X = b.rally[0] * TS, Y = b.rally[1] * TS; px(ctx, X, Y - 20, 2, 20, INK); px(ctx, X + 2, Y - 20, 10, 7, FAC[0].col); ctx.strokeStyle = 'rgba(255,255,255,0.35)'; ctx.setLineDash([4, 4]); ctx.beginPath(); ctx.moveTo((b.x + b.w / 2) * TS, (b.y + b.h) * TS); ctx.lineTo(X, Y); ctx.stroke(); ctx.setLineDash([]); } }
  // night: darken, then light the windows of occupied homes
  const nightA = nightLevel(C);
  if (nightA > 0) {
    ctx.fillStyle = `rgba(14,18,52,${0.5 * nightA})`; ctx.fillRect(vx0 - 2, vy0 - 2, vx1 - vx0 + 4, vy1 - vy0 + 4);
    ctx.globalCompositeOperation = 'lighter';
    for (const b of W.blds) {
      if (!b.done || (b.fac !== 0 && !b.seen) || !onScreen(b.x - 1, b.y - 2, b.w + 2, b.h + 3)) continue;
      const lit = b.type === 'house' || b.type === 'hall' ? W.units.some(u => u.inside === b.id) : ['bakery', 'smith', 'barracks', 'tower', 'brewery'].includes(b.type);
      if (!lit) continue;
      const gx = (b.x + b.w / 2) * TS, gy = (b.y + b.h) * TS - 18, r = 26 + b.w * 6;
      const gr = ctx.createRadialGradient(gx, gy, 2, gx, gy, r); gr.addColorStop(0, `rgba(255,190,90,${0.38 * nightA})`); gr.addColorStop(1, 'rgba(255,190,90,0)');
      ctx.fillStyle = gr; ctx.fillRect(gx - r, gy - r, r * 2, r * 2);
    }
    ctx.globalCompositeOperation = 'source-over';
  }
  // fog
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(FOG.cvs, 0, 0, MW * TS, MH * TS);
  ctx.imageSmoothingEnabled = false;
  // building ghost sprite on top of the fog so it's readable
  if (UI.placing && UI.ghost && !BDEF[UI.placing].road) { ctx.globalAlpha = 0.6; const s = BSPR[UI.placing][0]; ctx.drawImage(s, UI.ghost.x * TS - 4, (UI.ghost.y + BDEF[UI.placing].h) * TS - s.height); ctx.globalAlpha = 1; }
  // command markers + pings
  for (const m of UI.marks) { const k = m.t / 0.6; ctx.strokeStyle = m.atk ? `rgba(255,90,70,${k})` : `rgba(160,240,140,${k})`; ctx.lineWidth = 2; ctx.beginPath(); ctx.ellipse(m.x * TS, m.y * TS, 12 * (1.4 - k * 0.4), 6 * (1.4 - k * 0.4), 0, 0, 7); ctx.stroke(); }
  for (const p of W.pings) { ctx.strokeStyle = `rgba(255,80,60,${p.t / 3})`; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(p.x * TS, p.y * TS, 30 + (3 - p.t) * 30, 0, 7); ctx.stroke(); }

  ctx.setTransform(1, 0, 0, 1, 0, 0);
  if (UI.box) { const b = UI.box; ctx.strokeStyle = '#b8f5a8'; ctx.lineWidth = 1; ctx.fillStyle = 'rgba(160,240,140,0.1)'; const x = Math.min(b.x0, b.x1), y = Math.min(b.y0, b.y1), w = Math.abs(b.x1 - b.x0), h = Math.abs(b.y1 - b.y0); ctx.fillRect(x, y, w, h); ctx.strokeRect(x + 0.5, y + 0.5, w, h); }
}
function hpBar(x, y, w, f, fac) {
  px(ctx, x - 1, y - 1, w + 2, 5, INK);
  px(ctx, x, y, w, 3, '#3a2a22');
  px(ctx, x, y, Math.max(0, w * f), 3, fac === 0 ? (f > 0.5 ? '#6fd36a' : f > 0.25 ? '#e8c547' : '#e2553f') : FAC[fac].lite);
}
function drawBuilding(b) {
  if (BDEF[b.type].wall) return drawWallTile(b);
  const s = BSPR[b.type][b.fac], X = b.x * TS - 4, Ybot = (b.y + b.h) * TS;
  if (b.done) {
    if (b.dying) ctx.globalAlpha = 0.6;
    ctx.drawImage(s, X, Ybot - s.height);
    ctx.globalAlpha = 1;
    if (b.hp < b.maxHp * 0.5 && Math.random() < 0.15) burstFx(b.x + b.w * Math.random(), b.y + b.h * 0.3, b.hp < b.maxHp * 0.25 ? '#f08a2c' : '#6b6560', 1);
    if (b.type === 'mill') drawSails(b, X, Ybot - s.height);
    if ((b.type === 'house' && b.warm && (W.cal.season === 3 || nightLevel(W.cal) > 0.5) && W.units.some(u => u.inside === b.id) && Math.random() < 0.08) || (b.type === 'bakery' && W.t - (b.busyT || -9) < 2 && Math.random() < 0.12))
      W.fx.push({ kind: 'p', x: b.x + b.w - (b.type === 'bakery' ? 0.6 : 0.55), y: b.y - (b.type === 'bakery' ? 0.8 : 0.6), vx: rr(-0.2, 0.2), vy: -0.9, t: 1.4, col: 'rgba(150,145,140,0.55)' });
    if (b.type === 'smith' && Math.random() < 0.1) W.fx.push({ kind: 'p', x: b.x + b.w - 0.55, y: b.y - 1.1, vx: rr(-0.2, 0.2), vy: -1, t: 1.2, col: 'rgba(120,115,110,0.6)' });
    const pile = bufTotal(b);
    if (pile > 0) { const n = Math.min(6, Math.ceil(pile / 7)), r0 = Object.keys(b.buf)[0]; for (let k = 0; k < n; k++) { const cx0 = X + b.w * TS - 6 - (k % 3) * 9, cy0 = Ybot - 6 - Math.floor(k / 3) * 7; px(ctx, cx0 - 4, cy0 - 4, 9, 7, INK); px(ctx, cx0 - 3, cy0 - 3, 7, 5, r0 === 'food' ? '#e3c25a' : r0 === 'bread' ? '#d9a35a' : r0 === 'planks' ? '#d8b07a' : r0 === 'iron' ? '#8a929b' : '#b8854e'); } }
    if (b.type !== 'farm' && b.slots && b.fac === 0) {                       // worker pips
      const n = workersOf(b).length;
      for (let i = 0; i < b.slots; i++) { px(ctx, X + 6 + i * 8, Ybot - 8, 6, 6, INK); px(ctx, X + 7 + i * 8, Ybot - 7, 4, 4, i < n ? '#9ef08a' : '#4a3a2e'); }
    }
  } else {
    // construction: foundation, then the building rising inside scaffolding
    px(ctx, b.x * TS, b.y * TS, b.w * TS, b.h * TS, 'rgba(110,85,55,0.85)');
    const hgt = Math.max(2, Math.floor(s.height * b.progress));
    ctx.globalAlpha = 0.95; ctx.drawImage(s, 0, s.height - hgt, s.width, hgt, X, Ybot - hgt, s.width, hgt); ctx.globalAlpha = 1;
    ctx.strokeStyle = '#8a6440'; ctx.lineWidth = 2;
    const top = Ybot - Math.min(s.height, hgt + 10);
    for (let k = X + 6; k <= X + s.width - 6; k += 22) { ctx.beginPath(); ctx.moveTo(k, Ybot); ctx.lineTo(k, top); ctx.stroke(); }
    for (let yy = Ybot - 10; yy > top; yy -= 16) { ctx.beginPath(); ctx.moveTo(X + 6, yy); ctx.lineTo(X + s.width - 6, yy); ctx.stroke(); }
    hpBar(b.x * TS + 4, Ybot + 4, b.w * TS - 8, b.progress, 0);
  }
}

function seasonSnow(C) {
  if (C.season === 3) return 1;
  if (C.season === 2 && C.seasonFrac > 0.8) return (C.seasonFrac - 0.8) / 0.2 * 0.6;
  if (C.season === 0 && C.seasonFrac < 0.2 && C.year > 1) return 1 - C.seasonFrac / 0.2;
  return 0;
}
function nightLevel(C) {
  if (C.tod >= NIGHT_AT) return Math.min(1, (C.tod - NIGHT_AT) / 0.04);
  if (C.tod >= NIGHT_AT - 0.06) return (C.tod - (NIGHT_AT - 0.06)) / 0.06 * 0.35;
  if (C.tod < 0.04) return 1 - C.tod / 0.04;
  return 0;
}
function drawSails(b, X, Ytop) {
  const hx = X + 4 + b.w * TS / 2, hy = Ytop + 24, busy = W.t - (b.busyT || -9) < 3;
  b.sailA = (b.sailA || b.id) + (busy ? 0.06 : 0.008) * W.speed;
  ctx.save(); ctx.translate(hx, hy);
  for (let k = 0; k < 4; k++) {
    ctx.rotate(Math.PI / 2 + (k === 0 ? b.sailA : 0));
    px(ctx, -1.5, 0, 3, 34, INK); px(ctx, -0.5, 0, 1, 33, '#6b4a2b');
    px(ctx, 2, 8, 9, 24, INK); px(ctx, 3, 9, 7, 22, '#efe3c6'); for (let r = 12; r < 30; r += 5) px(ctx, 3, r, 7, 1, '#b8a98a');
  }
  ctx.restore();
  px(ctx, hx - 3, hy - 3, 6, 6, INK); px(ctx, hx - 2, hy - 2, 4, 4, '#8a6440');
}
function moodIcon(X, Y, kind) {
  px(ctx, X - 5, Y - 5, 10, 10, INK); px(ctx, X - 4, Y - 4, 8, 8, kind === 'sick' ? '#9fd18b' : '#ffd3c8');
  if (kind === 'sick') { px(ctx, X - 1, Y - 3, 2, 6, '#2f7a2a'); px(ctx, X - 3, Y - 1, 6, 2, '#2f7a2a'); }
  else { px(ctx, X - 2, Y - 2, 1, 1, INK); px(ctx, X + 1, Y - 2, 1, 1, INK); px(ctx, X - 2, Y + 2, 4, 1, INK); px(ctx, X - 3, Y + 3, 1, 1, INK); px(ctx, X + 2, Y + 3, 1, 1, INK); }
}

let ROAD_TEX = [];
function buildRoadTex() {
  ROAD_TEX = [0, 1, 2].map(v => { const c = mk(TS, TS), g = c.getContext('2d'), R = mulberry32(400 + v);
    px(g, 0, 0, TS, TS, '#9c8f7a');
    for (let y = 1; y < TS; y += 6) for (let x = ((y / 6) % 2) * 4; x < TS; x += 8) { const w = 6 + Math.floor(R() * 2), shade = ['#b3a68e', '#a89a82', '#c0b49c'][Math.floor(R() * 3)]; px(g, x, y, w, 4, shade); px(g, x, y + 4, w, 1, '#7d705c'); }
    return c; });
}

function drawWallTile(b) {
  const con = (dx, dy) => { if (!inMap(b.x + dx, b.y + dy)) return false; const id = map.bld[ix(b.x + dx, b.y + dy)]; const o = id >= 0 && id < 1e9 && W.byId.get(id); return !!(o && BDEF[o.type].wall && o.fac === b.fac); };
  const open = b.type === 'gate' && b.done && W.units.some(u => u.fac === b.fac && !u.inside && Math.abs(u.x - b.x - 0.5) < 1.6 && Math.abs(u.y - b.y - 0.5) < 1.6);
  if (!b.done) ctx.globalAlpha = 0.35 + 0.55 * b.progress;
  drawWallPiece(ctx, b.x * TS, b.y * TS, b.type, FAC[b.fac].col, { L: con(-1, 0), R: con(1, 0), U: con(0, -1) }, open);
  ctx.globalAlpha = 1;
  if (map.breach[ix(b.x, b.y)]) { ctx.strokeStyle = 'rgba(255,90,70,0.8)'; ctx.lineWidth = 2; ctx.strokeRect(b.x * TS + 2, b.y * TS - 20, TS - 4, TS + 16); }
}
function drawSiegeUnit(u, X, Y) {
  const col = FAC[u.fac].col;
  if (u.hitT > 0) ctx.filter = 'brightness(1.7)';
  if (u.type === 'ram') drawRam(ctx, X, Y, u.dir, col, u.swing > 0 ? Math.sin(W.t * 12) : 0);
  else if (u.type === 'catapult') drawCatapult(ctx, X, Y, u.dir, col, u.swing > 0.3);
  else drawSiegeTower(ctx, X, Y, u.dir, col, !!u.deployed);
  ctx.filter = 'none';
}
