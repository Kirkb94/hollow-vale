// 026 production chains: craft workers (fetch input → process → haul output) and hunters.
function skillKeyOf(b) { const j = BDEF[b.type].job; return j === 'wood' ? 'wood' : j === 'mine' ? b.ore : j === 'farm' ? 'farm' : j === 'hunt' ? 'hunt' : b.type; }

function craftWork(u, b, F) {
  const R = BDEF[b.type].recipe, key = b.type;
  if (u.carry && u.carry.n > 0 && (u.carry.res !== R.out || u.st === 'deliver')) return deliver(u, F);
  if (u.carry && u.carry.n >= 10) { u.st = 'deliver'; return deliver(u, F); }
  if (!u.input || u.input.key !== key || u.input.n <= 0) {
    u.input = null;
    // wheat users never eat into the town's next meal
    const avail = r => F.res[r] - (r === 'food' ? F.pop : 0);
    const short = R.ins.find(([r, n]) => avail(r) < n);
    if (short) {
      u.status = `Waiting for ${RES_NAME[short[0]].toLowerCase()}`;
      if (u.carry && u.carry.n > 0) { u.st = 'deliver'; return deliver(u, F); }
      goTo(u, 'wait' + b.id, nearRect(b.x, b.y, b.w, b.h), b.x + b.w / 2, b.y + b.h / 2);
      return;
    }
    if (F.cap[R.out] - F.res[R.out] <= 0) { u.status = `${RES_NAME[R.out]} storage full`; return; }
    const src = dropFor(u.fac, R.ins[0][0], u.x, u.y);
    if (!src) { u.status = `No storage holds ${RES_NAME[R.ins[0][0]].toLowerCase()}`; return; }
    if (goTo(u, 'src' + src.id, nearRect(src.x, src.y, src.w, src.h), src.x + src.w / 2, src.y + src.h / 2)) {
      const cycles = Math.min(5, ...R.ins.map(([r, n]) => Math.floor(avail(r) / n))); if (cycles <= 0) return;
      for (const [r, n] of R.ins) F.res[r] -= cycles * n;
      u.input = { key, n: cycles, ins: R.ins }; u.status = null; u.path = null;
    }
    if (u.stuck > 6) { u.stuck = 0; u.path = null; }
    return;
  }
  if (goTo(u, 'b' + b.id, nearRect(b.x, b.y, b.w, b.h), b.x + b.w / 2, b.y + b.h / 2)) {
    u.act = 'craft'; addXp(u, key, DT); u.dir = (b.x + b.w / 2) > u.x ? 1 : -1; b.busyT = W.t;
    u.workT += DT * F.mult * (F.hungry ? 0.5 : 1) * workMult(u, key);
    if (u.workT >= R.time / docCraft(F)) {
      u.workT = 0; u.input.n--;
      u.carry = { res: R.out, n: (u.carry && u.carry.res === R.out ? u.carry.n : 0) + R.n };
      if (u.input.n <= 0) { u.input = null; u.st = 'deliver'; }
    }
  }
  if (u.stuck > 6) { u.stuck = 0; u.path = null; }
}

// ── carts: carters empty the output piles of farms and workshops into storage ─
const bufTotal = b => Object.values(b.buf || {}).reduce((a, n) => a + n, 0);
function haulWork(u, b, F) {
  u.cart = true;
  if (u.carry && u.carry.n > 0) { u.st = 'deliver'; return deliver(u, F); }
  let src = u.src ? byId(u.src) : null;
  if (!src || bufTotal(src) <= 0) {
    src = null; let best = -1e9;
    for (const x of W.blds) {
      if (x.fac !== u.fac || x.dead || !x.done) continue;
      const t = bufTotal(x); if (t < 6) continue;
      const claimed = W.units.some(o => o !== u && o.src === x.id && !o.dead);
      const sc = t - dist(x.x, x.y, u.x, u.y) * 0.6 - (claimed ? 25 : 0);
      if (sc > best) { best = sc; src = x; }
    }
    u.src = src ? src.id : null;
    if (!src) { u.status = 'Waiting for goods to haul'; goTo(u, 'shed' + b.id, nearRect(b.x, b.y, b.w, b.h), b.x + b.w / 2, b.y + b.h / 2); return; }
  }
  u.status = null;
  if (goTo(u, 'pile' + src.id, nearRect(src.x, src.y, src.w, src.h), src.x + src.w / 2, src.y + src.h / 2)) {
    const [r, n] = Object.entries(src.buf).sort((a, c) => c[1] - a[1])[0];
    const k = Math.min(30, n); src.buf[r] -= k; if (src.buf[r] <= 0) delete src.buf[r];
    u.carry = { res: r, n: k }; u.st = 'deliver'; u.src = null; u.path = null; addXp(u, 'haul', 3);
  }
  if (u.stuck > 6) { u.stuck = 0; u.src = null; u.path = null; }
}

// ── trading posts, caravans and the market ─────────────────────────────────
const TRADE_VALUE = { food: 1, wood: 1, stone: 1.4, gold: 1, firewood: 0.7, planks: 2, ore: 1.5, iron: 4, flour: 1.5, bread: 1.6, meat: 1.8, ale: 3 };
const POST_ID = 1e9;
function placeTradingPosts() {
  W.posts = [];
  // on the islands map every town island has its own post on its outer shore
  const spots = map.type === 'islands' ? map.starts.map(s => [clamp(s.x + 2 + (s.x < MW / 2 ? -10 : 8), 3, MW - 6), clamp(s.y + 2 + (s.y < MH / 2 ? -10 : 8), 3, MH - 6)])
    : [[MW / 2 - 1, 2], [MW / 2 - 1, MH - 5], [2, MH / 2 - 1], [MW - 5, MH / 2 - 1]];
  spots.forEach(([x, y], i) => {
    for (let yy = y - 1; yy <= y + 4; yy++) for (let xx = x - 1; xx <= x + 4; xx++) {
      if (!inMap(xx, yy)) continue; const k = ix(xx, yy);
      if (map.ter[k] === 1 || map.ter[k] === 4 || map.ter[k] === 5) map.ter[k] = 2;
      if (map.node[k] >= 0) { nodes[map.node[k]].amt = 0; map.node[k] = -1; }
    }
    for (let yy = y; yy < y + 3; yy++) for (let xx = x; xx < x + 3; xx++) map.bld[ix(xx, yy)] = POST_ID + i;
    W.posts.push({ id: POST_ID + i, x, y, w: 3, h: 3 });
  });
}
function nearestPost(b) { let best = null, bd = 1e9; for (const p of W.posts) { const d = dist(p.x, p.y, b.x, b.y) + (compAt(p.x + 1, p.y + 1) === compAt(b.x, b.y) ? 0 : 1e6); if (d < bd) { bd = d; best = p; } } return best; }
function updateCaravan(u) {
  u.moving = false; u.cart = true;
  const F = W.F[u.fac];
  let home = u.market ? byId(u.market) : null;
  if (!home || !home.done) { home = W.blds.find(b => b.fac === u.fac && b.type === 'market' && b.done); u.market = home ? home.id : null; }
  if (!home) { u.status = 'No market'; return; }
  const post = nearestPost(home); if (!post) return;
  if (u.leg !== 'back') {
    if (goTo(u, 'post' + post.id, nearRect(post.x, post.y, post.w, post.h), post.x + 1.5, post.y + 1.5)) {
      const fee = Math.round(Math.max(map.type === 'islands' ? 40 : 0, dist(home.x, home.y, post.x, post.y)) * 0.5);
      const sale = u.cargo ? Math.floor(u.cargo.n * TRADE_VALUE[u.cargo.res] * 0.8) : 0;
      const g = Math.min(Math.round((fee + sale) * docTrade(F)), Math.max(0, F.cap.gold - F.res.gold));
      F.res.gold += g; F.stats.trade = (F.stats.trade || 0) + g;
      if (u.fac === 0) W.fx.push({ kind: 'txt', x: u.x, y: u.y - 1, t: 2, text: `+${g} gold` + (u.cargo ? ` (sold ${u.cargo.n} ${RES_NAME[u.cargo.res].toLowerCase()})` : '') });
      u.cargo = null; u.leg = 'back'; u.path = null;
    }
  } else if (goTo(u, 'mk' + home.id, nearRect(home.x, home.y, home.w, home.h), home.x + home.w / 2, home.y + home.h / 2)) {
    // load the town's biggest surplus for the next trip
    let best = null, br = 0.7;
    const keep = r => (r === 'firewood' && W.cal.season >= 2) || (r === 'food' && F.res.food < F.pop * 3) || r === 'iron';   // never sell what the town needs
    for (const r of ALLRES) { if (r === 'gold' || keep(r) || !F.cap[r] || F.res[r] < 20) continue; const ratio = F.res[r] / F.cap[r]; if (ratio > br) { br = ratio; best = r; } }
    if (best) { F.res[best] -= 20; u.cargo = { res: best, n: 20 }; }
    u.leg = 'out'; u.path = null;
  }
  if (u.stuck > 8) { u.stuck = 0; u.path = null; }
}
function marketPrice(F, r, buy) {
  const pf = F.pf[r] || 1, v = TRADE_VALUE[r] * 20;
  const gk = hasDoc(F, 'guilds');
  return buy ? Math.ceil(v * 1.3 * pf * (gk ? 0.85 : 1)) : Math.floor(v * 0.75 * pf * (gk ? 1.15 : 1));
}
function marketTrade(F, r, buy) {
  const price = marketPrice(F, r, buy);
  if (buy) {
    if (F.res.gold < price) return 'Not enough gold.';
    if (F.res[r] + 20 > F.cap[r]) return `No room to store ${RES_NAME[r].toLowerCase()}.`;
    F.res.gold -= price; F.res[r] += 20; F.pf[r] = Math.min(2.5, (F.pf[r] || 1) + 0.07);
  } else {
    if (F.res[r] < 20) return `You need 20 ${RES_NAME[r].toLowerCase()} to sell.`;
    if (F.res.gold + price > F.cap.gold) return 'Gold storage is full.';
    F.res[r] -= 20; F.res.gold += price; F.pf[r] = Math.max(0.4, (F.pf[r] || 1) - 0.07);
  }
  return null;
}

// ── roads ──────────────────────────────────────────────────────────────────
function roadOk(x, y) { if (!inMap(x, y)) return false; const k = ix(x, y); return map.ter[k] !== 1 && map.node[k] < 0 && map.bld[k] < 0 && !map.road[k] && !W.blds.some(f => f.type === 'farm' && !f.dead && x >= f.x && x < f.x + f.w && y >= f.y && y < f.y + f.h); }
function layRoad(F, tiles) {
  let n = 0;
  for (const [x, y] of tiles) { if (F.res.stone < 1) break; if (!roadOk(x, y)) continue; map.road[ix(x, y)] = 1; F.res.stone -= 1; n++; }
  if (n) roadsDirty = true;
  return n;
}
function removeRoad(tiles) { let n = 0; for (const [x, y] of tiles) if (inMap(x, y) && map.road[ix(x, y)]) { map.road[ix(x, y)] = 0; n++; } if (n) roadsDirty = true; return n; }
let roadsDirty = true;
// an L-shaped run of tiles between two points (horizontal first)
function roadLine(x0, y0, x1, y1) {
  const out = [], sx = Math.sign(x1 - x0), sy = Math.sign(y1 - y0);
  for (let x = x0; ; x += sx || 1) { out.push([x, y0]); if (x === x1) break; }
  if (sy) for (let y = y0 + sy; ; y += sy) { out.push([x1, y]); if (y === y1) break; }
  return out;
}

function huntWork(u, b, F) {
  if (u.carry && u.carry.n > 0 && (u.carry.res !== 'meat' || u.st === 'deliver' || u.carry.n >= 10)) { u.st = 'deliver'; return deliver(u, F); }
  const cx0 = b.x + b.w / 2, cy0 = b.y + b.h / 2;
  // butcher a carcass first
  let n = u.tn >= 0 ? nodes[u.tn] : null;
  if (!n || n.amt <= 0 || n.kind !== 'carcass') { u.tn = nearestNode('carcass', u.x, u.y, cx0, cy0, 44); n = u.tn >= 0 ? nodes[u.tn] : null; }
  if (n) {
    u.prey = null;
    if (goTo(u, 'n' + u.tn, nearTile(n.x, n.y), n.x, n.y)) {
      u.act = 'butcher'; u.dir = n.x + 0.5 > u.x ? 1 : -1; addXp(u, 'hunt', DT);
      u.workT += DT * F.mult * workMult(u, 'hunt');
      if (u.workT >= WORK_RATE.meat) { u.workT = 0; n.amt--; u.carry = { res: 'meat', n: (u.carry ? u.carry.n : 0) + 1 }; if (n.amt <= 0) { removeNode(u.tn); u.tn = -1; } }
    }
    if (u.stuck > 4) { u.stuck = 0; n.bad = W.t + 20; u.tn = -1; }
    return;
  }
  // stalk the nearest deer within range of the lodge
  let d = u.prey ? W.deer.find(x => x.id === u.prey && !x.dead) : null;
  if (!d) { let bd = 1e9; for (const x of W.deer) { if (x.dead || dist(x.x, x.y, cx0, cy0) > 42) continue; const dd = dist(x.x, x.y, u.x, u.y); if (dd < bd) { bd = dd; d = x; } } u.prey = d ? d.id : null; }
  if (!d) { u.status = 'No deer nearby'; if (u.carry && u.carry.n > 0) { u.st = 'deliver'; deliver(u, F); } return; }
  u.status = null;
  if (dist(u.x, u.y, d.x, d.y) <= 4.5) {
    u.path = null; u.act = 'shoot'; u.dir = d.x > u.x ? 1 : -1;
    u.workT += DT * workMult(u, 'hunt');
    if (u.workT >= 1.5) {
      u.workT = 0; addXp(u, 'hunt', 1.5);
      const hit = rand() < 0.7 + skillLv(u, 'hunt') * 0.05;
      W.projs.push({ vis: true, x: u.x, y: u.y - 0.3, tx: d.x + (hit ? 0 : rr(-1, 1)), ty: d.y + (hit ? 0 : rr(-1, 1)), spd: 12, deer: hit ? d.id : null });
    }
  } else goTo(u, 'deer' + d.id + ':' + Math.floor(d.x) + ',' + Math.floor(d.y), (x, y) => walkable(x, y) && Math.hypot(x + 0.5 - d.x, y + 0.5 - d.y) <= 4, Math.floor(d.x), Math.floor(d.y));
  if (u.stuck > 5) { u.stuck = 0; u.prey = null; }
}
function killDeer(d) {
  if (!d || d.dead) return;
  d.dead = true;
  const tx = Math.floor(d.x), ty = Math.floor(d.y);
  if (addNode('carcass', tx, ty, 18)) nodes[nodes.length - 1].rot = W.t + 150;
  burstFx(d.x, d.y, '#8a2a22', 5);
}
