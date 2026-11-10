// 015 Hollow Vale on the Hearthlands engine: factions, heroes and their abilities.
// Hero data comes from rts-data.json (exported from the main game); sprites from art/frames.
let HV = {}, HVFAC = {}, HVCAT = null, HV_READY = false;
const HV_KEYS = [];
const heroBld = h => h.elite ? 'shrine' : (h.charge || (h.role && h.role[0] === 'Cavalry')) ? 'stable' : (h.role && h.role[0] === 'Siege') ? 'workshop' : 'barracks';
function heroCost(h) {
  if (h.elite) return { food: 200, gold: 180, iron: 20 };
  const c = { food: 20 + h.hire * 7, gold: h.hire * 5 };
  if (h.armor) c.iron = 1 + h.armor * 2;
  if (h.rng[1] >= 2) c.wood = 10 + h.hire * 2;
  return c;
}
function registerHeroes(data) {
  HV = data.heroes; HVFAC = data.fac;
  for (const k of Object.keys(HV)) {
    const h = HV[k]; if (h.hidden || !h.fac) continue;
    const ranged = h.rng[1] >= 2, elite = !!h.elite;
    UDEF[k] = {
      name: h.n, hv: true, fac: h.fac, mil: true, elite, role: h.role && !h.elite ? h.role[0] : '', slots: h.slots, hire: h.hire, bld: heroBld(h),
      hp: Math.round(h.hp * 12 * (elite ? 1.25 : 1)), atk: +(h.dmg * 1.6).toFixed(1), arm: (h.armor || 0) * 2, parm: (h.armor || 0) * 2,
      range: ranged ? 1 + h.rng[1] * 1.7 : (elite ? 1.4 : 1.1), minRange: h.rng[0] >= 2 ? (h.rng[0] - 1) * 1.5 : 0,
      cd: elite ? 1.5 : ranged ? 1.6 : 1.1, speed: (h.fly ? 1.3 : 1.05) + Math.min(h.mv, 5) * 0.3, sight: 6 + (h.fly ? 1 : 0) + (ranged ? 1 : 0) + (h.sight ? h.sight - 3 : 0),
      ranged, fly: !!h.fly, mounted: !!(h.role && h.role[0] === 'Cavalry'), group: h.group || 1,
      splash: !!(h.aoe || h.pierce), stun: !!h.stun, drain: h.drain || 0, heal: h.heal || 0, hsiege: h.siege || 0, charge: !!h.charge,
      cost: heroCost(h), time: 10 + h.slots * 4 + (elite ? 20 : 0), desc: h.d, kw: h.kw || []
    };
    UNIT_AGE[k] = elite ? 2 : h.hire >= 6 ? 1 : 0;
    HV_KEYS.push(k);
  }
}
// what a building trains for its owner
function trainsFor(b) {
  const d = BDEF[b.type], F = W.F[b.fac];
  if (!['barracks', 'stable', 'workshop', 'shrine'].includes(b.type)) return d.trains || null;
  const fac = F && F.hvfac;
  const list = HV_KEYS.filter(k => UDEF[k].fac === fac && UDEF[k].bld === b.type).sort((a, c) => UDEF[a].hire - UDEF[c].hire || UDEF[a].name.localeCompare(UDEF[c].name));
  return b.type === 'workshop' ? list.concat(['ram', 'catapult', 'siegetower']) : list;
}
const isHV = u => !!(u && UDEF[u.type] && UDEF[u.type].hv);
const hvFacOf = i => W.F[i] && W.F[i].hvfac;
const elitesAlive = (i, k) => W.units.some(u => u.fac === i && u.type === k && !u.dead) || W.blds.some(b => b.fac === i && !b.dead && b.queue.some(q => q.unit === k));

// ── squads: one training, several bodies sharing a squad id ────────────────
function spawnSquadExtras(b, u) {
  const d = UDEF[u.type]; if (!d.hv || d.group <= 1) return [u];
  const sid = b.fac + '.' + (W.sqN = (W.sqN || 0) + 1), out = [u]; u.sqd = sid;
  for (let i = 1; i < d.group; i++) { const v = spawnNear(b, u.type); v.sqd = sid; out.push(v); W.F[b.fac].pop++; }
  return out;
}

// ── abilities: called from hurt() ──────────────────────────────────────────
const HV_SPLASH = 0.5;
function hvBeforeHit(t, dmg, src) {
  if (t.kind !== 'unit' || !isHV(t)) return dmg;
  // Kingdom: Formation, less damage next to another Kingdom unit
  if (hvFacOf(t.fac) === 'kingdom' && W.units.some(o => o !== t && !o.dead && o.fac === t.fac && isHV(o) && Math.abs(o.x - t.x) < 1.3 && Math.abs(o.y - t.y) < 1.3)) dmg = Math.max(1, dmg - 1.6);
  return dmg;
}
function hvAfterHit(t, dealt, src) {
  if (!src || src.kind !== 'unit' || !isHV(src) || src.dead || dealt <= 0) return;
  const d = UDEF[src.type], sf = hvFacOf(src.fac);
  if (t.kind === 'unit') {
    if (sf === 'vamp') src.hp = Math.min(src.maxHp, src.hp + Math.min(dealt, 3.2));                       // Bloodthirst
    if (d.drain) src.hp = Math.min(src.maxHp, src.hp + Math.min(dealt, d.drain * 3));                     // Drain
    if (sf === 'infernal' && hvFacOf(t.fac) !== 'infernal' && !t.dead) { t.burnT = 3; t.burnBy = src.fac; } // Burn
    if (d.stun && !t.dead && (!src.stunCd || W.t > src.stunCd)) { t.stunT = 1.5; src.stunCd = W.t + 6; W.fx.push({ kind: 'txt', x: t.x, y: t.y - 1, text: 'Stunned', col: '#ffe066', t: 1 }); }
  }
  if (d.splash && !src.splashing) {
    src.splashing = true;
    const [cx, cy] = entCenter(t);
    for (const o of W.units) if (o !== t && !o.dead && foe(o.fac, src.fac) && !o.inside && !o.aboard && dist(o.x, o.y, cx, cy) < 1.3) hurt(o, dealt * HV_SPLASH, src.fac, src);
    src.splashing = false;
    W.fx.push({ kind: 'ring', x: cx, y: cy, t: 0.5, r: 1.3, col: '255,170,80' });
  }
}
// Undead: Undying; returns true when the unit rises instead of dying
function hvUndying(t) {
  if (!isHV(t) || hvFacOf(t.fac) !== 'undead' || t.rez || t.summoned) return false;
  t.rez = 1; t.risen = 1; t.hp = Math.max(1, Math.round(t.maxHp * 0.2)); t.target = null;
  W.fx.push({ kind: 'txt', x: t.x, y: t.y - 1.2, text: 'Undying!', col: '#9be38c', t: 1.2 });
  burstFx(t.x, t.y, '#9be38c', 10);
  return true;
}
// kills earn XP: stars at 2 and 5, as in Hollow Vale
function hvKillXP(src, victim) {
  if (!src || !isHV(src) || src.dead) return;
  const vd = UDEF[victim.type];
  src.xp = (src.xp || 0) + (vd.elite ? 2 : vd.group > 1 ? 1 / 3 : vd.mil ? 1 : 0.5);
  const st = src.xp >= 5 ? 2 : src.xp >= 2 ? 1 : 0;
  if (st > (src.star || 0)) { const add = (st - (src.star || 0)) * 24; src.maxHp += add; src.hp += add; src.star = st; W.fx.push({ kind: 'txt', x: src.x, y: src.y - 1.4, text: '★'.repeat(st), col: '#f3d27a', t: 1.4 }); }
}
const hvAtkBonus = (u, t) => {
  const d = UDEF[u.type]; if (!d.hv) return 0;
  let a = (u.star || 0) * 1.6 + (u.risen ? 1.6 : 0);
  if (u.chargeReady && d.charge) { a += d.atk * 0.5; u.chargeReady = false; }
  if (t.kind === 'bld') a += d.hsiege * 4 + (hvFacOf(u.fac) === 'iron' ? 2 : 0);     // Siege, Iron Siegecraft
  return a;
};
const hvCdMul = u => isHV(u) && hvFacOf(u.fac) === 'arcane' ? 0.85 : 1;              // Arcane Flow
// per-unit upkeep: burn, stun, regrowth, healers
function hvUnitTick(u) {
  if (u.burnT > 0) { const b = u.burnT; u.burnT -= DT; if (Math.floor(b) !== Math.floor(u.burnT)) hurt(u, 2.5, u.burnBy, null); }
  if (!isHV(u)) return false;
  if (hvFacOf(u.fac) === 'wilds' && u.hp < u.maxHp) u.hp = Math.min(u.maxHp, u.hp + 0.6 * DT);  // Regrowth
  if (u.moving) { u.mvd = (u.mvd || 0) + DT; if (u.mvd > 1.5) u.chargeReady = true; } else u.mvd = 0;
  const d = UDEF[u.type];
  if (d.heal && (!u.healCd || W.t > u.healCd)) {
    let best = null, bf = 0.9;
    for (const o of W.units) { if (o.dead || o.fac !== u.fac || o === u || !UDEF[o.type].mil || o.hp >= o.maxHp || o.risen) continue; if (dist(o.x, o.y, u.x, u.y) > 5) continue; const f = o.hp / o.maxHp; if (f < bf) { bf = f; best = o; } }
    if (best) { best.hp = Math.min(best.maxHp, best.hp + d.heal * 12); u.healCd = W.t + 3; u.swing = 0.4; W.fx.push({ kind: 'txt', x: best.x, y: best.y - 1, text: '+' + d.heal * 12, col: '#9ef08a', t: 1 }); }
  }
  if (u.stunT > 0) { u.stunT -= DT; u.moving = false; return true; }
  return false;
}

// ── sprites from Hollow Vale's frame catalog ───────────────────────────────
const HVIMG = {};
function hvSheet(k) {
  if (!HVCAT || !HVCAT.units[k]) return null;
  if (!HVIMG[k]) { const im = new Image(); im.src = 'art/frames/' + HVCAT.units[k].file; HVIMG[k] = { img: im, c: HVCAT.units[k] }; }
  return HVIMG[k];
}
function hvFrame(sh, anim, t) {
  const clips = sh.c.clips || {}, order = anim === 'attack' ? [sh.c.attack, 'attack', 'cast', 'shoot', 'thrust'] : anim === 'walk' ? ['walk', 'idle'] : ['idle'];
  let clip = null; for (const n of order) if (n && clips[n]) { clip = clips[n]; break; }
  if (!clip) clip = { row: 0, frames: [0], duration: 1000 };
  const n = clip.frames.length, dur = clip.duration / 1000;
  const f = anim === 'attack' ? Math.min(n - 1, Math.floor(t / dur * n)) : Math.floor((t % dur) / dur * n);
  return [clip.frames[f], clip.row];
}
function drawHVUnit(g, u, X, Y) {
  const d = UDEF[u.type], sh = hvSheet(u.type), hgt = d.elite ? 64 : d.group > 1 ? 32 : 42, lift = d.fly ? 14 + Math.sin(W.t * 3 + u.id) * 3 : 0;
  g.fillStyle = 'rgba(0,0,0,0.28)'; g.beginPath(); g.ellipse(X, Y + 1, hgt * 0.28, hgt * 0.1, 0, 0, 7); g.fill();
  g.strokeStyle = FAC[u.fac].col; g.lineWidth = 2; g.beginPath(); g.ellipse(X, Y + 1, hgt * 0.28, hgt * 0.1, 0, 0, 7); g.stroke();
  if (!sh || !sh.img.complete || !sh.img.naturalWidth) { px(g, X - 5, Y - 18 - lift, 10, 16, INK); px(g, X - 4, Y - 17 - lift, 8, 14, FAC[u.fac].col); return; }
  const anim = u.swing > 0 ? 'attack' : u.moving ? 'walk' : 'idle';
  if (anim === 'attack' && u.animK !== 'attack') u.animT0 = W.t; u.animK = anim;
  const [fx, fy] = hvFrame(sh, anim, anim === 'attack' ? W.t - (u.animT0 || 0) : W.t + u.id * 0.37);
  const cols = sh.c.columns, fw = sh.img.naturalWidth / cols, fh = sh.img.naturalHeight / 6, s = hgt / fh * 1.15;
  g.save(); g.translate(X, Y + 3 - lift); if (u.dir < 0) g.scale(-1, 1);
  g.imageSmoothingEnabled = false;
  if (u.hitT > 0) g.filter = 'brightness(2.2)'; else if (u.stunT > 0) g.filter = 'grayscale(0.7)';
  g.drawImage(sh.img, fx * fw, fy * fh, fw, fh, -fw * s / 2, -fh * s * 0.86, fw * s, fh * s);
  g.restore();
  if (u.burnT > 0) { g.fillStyle = 'rgba(255,140,40,0.75)'; g.beginPath(); g.arc(X + 6, Y - hgt * 0.55 - lift, 3 + Math.sin(W.t * 20), 0, 7); g.fill(); }
  if (u.star) { g.font = 'bold 10px sans-serif'; g.textAlign = 'center'; g.fillStyle = '#f3d27a'; g.fillText('★'.repeat(u.star), X, Y - hgt * 0.95 - lift); g.textAlign = 'left'; }
}
// portrait for buttons
const HVPORT = {};
function hvPortrait(k) {
  if (HVPORT[k]) return HVPORT[k];
  const sh = hvSheet(k); if (!sh || !sh.img.complete || !sh.img.naturalWidth) return null;
  const fw = sh.img.naturalWidth / sh.c.columns, fh = sh.img.naturalHeight / 6, c = document.createElement('canvas'); c.width = c.height = 64;
  const g = c.getContext('2d'); g.imageSmoothingEnabled = false; const s = 64 / fh * 1.25; g.drawImage(sh.img, 0, 0, fw, fh, 32 - fw * s / 2, 62 - fh * s, fw * s, fh * s);
  return HVPORT[k] = c.toDataURL();
}
// Hero Shrine and its art from the Hollow Vale object atlas
BDEF.shrine = { name: 'Hero Shrine', key: '', w: 3, h: 3, hp: 1200, cost: { wood: 120, stone: 150, gold: 100 }, build: 45, trains: 'hv', req: 'barracks', sight: 6, desc: 'Summons your faction\'s Elites, one of each at a time.' };
AGE_OF.shrine = 2; AGE_OF.stable = 1;

// boot: load Hollow Vale's data before the menu unlocks
(async () => {
  try {
    const [data, cat] = await Promise.all([fetch('rts-data.json').then(r => r.json()), fetch('art/frames/catalog.json').then(r => r.json())]);
    registerHeroes(data); HVCAT = cat; HV_READY = true;
    window.dispatchEvent(new Event('hv-ready'));
  } catch (e) { const s = document.getElementById('btnStart'); if (s) s.textContent = 'Could not load Hollow Vale data: ' + e.message; }
})();

// ── factions: player picks one, rivals draw the rest ───────────────────────
const FAC_BASE = FAC.map(f => f.name);
function assignHVFactions(pick) {
  const all = Object.keys(HVFAC), mine = HVFAC[pick] ? pick : all[ri(0, all.length - 1)];
  const rest = all.filter(f => f !== mine).sort(() => rand() - 0.5);
  W.F.forEach((F, i) => { if (i === BANDIT || F.absent) return; F.hvfac = i === 0 ? mine : rest[(i - 1) % rest.length]; });
  hvLabel();
}
function hvLabel() {
  W.F.forEach((F, i) => { if (!FAC[i]) return; FAC[i].fname = F.hvfac ? HVFAC[F.hvfac].n : ''; FAC[i].name = (i === 0 ? 'You' : FAC_BASE[i]) + (F.hvfac ? ' · ' + HVFAC[F.hvfac].n : ''); });
}
function hvFactionHtml(f) { const d = HVFAC[f]; return d ? `<b>${d.n}</b> · <i>${d.p}</i>: ${d.pd}` : ''; }
