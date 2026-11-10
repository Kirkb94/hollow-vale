// 06 input, DOM UI (resource bar, build menu, selection panel, minimap), menus, main loop.
const UI = { sel: new Set(), placing: null, ghost: null, box: null, marks: [], groups: {}, started: false, paused: false, reveal: false, infoHtml: '', mouse: { x: 0, y: 0, in: false }, keys: {}, drag: null };
const $ = id => document.getElementById(id);
const RES_ICON = {};
function makeResIcons() {
  const draw = (fn) => { const c = mk(16, 16), g = c.getContext('2d'); fn(g); return c.toDataURL(); };
  RES_ICON.food = draw(g => { for (const x of [4, 7, 10]) { px(g, x, 6, 2, 9, INK); px(g, x, 7, 1, 8, '#b8962a'); } for (const [x, y] of [[3, 1], [6, 0], [9, 1]]) { px(g, x, y, 4, 7, INK); px(g, x + 1, y + 1, 2, 5, '#e8c547'); px(g, x + 1, y + 1, 1, 2, '#fff2b8'); } px(g, 3, 10, 10, 2, '#7a5028'); });
  RES_ICON.wood = draw(g => { px(g, 1, 6, 14, 7, INK); px(g, 2, 7, 12, 5, '#a0703f'); px(g, 2, 7, 12, 1, '#c08a50'); g.fillStyle = INK; g.beginPath(); g.arc(13, 9.5, 3.5, 0, 7); g.fill(); g.fillStyle = '#d2a46a'; g.beginPath(); g.arc(13, 9.5, 2.5, 0, 7); g.fill(); });
  RES_ICON.stone = draw(g => { g.fillStyle = INK; g.beginPath(); g.ellipse(8, 9, 7, 5.5, 0, 0, 7); g.fill(); g.fillStyle = '#a39d92'; g.beginPath(); g.ellipse(8, 9, 6, 4.5, 0, 0, 7); g.fill(); px(g, 5, 6, 4, 2, '#cbc5ba'); });
  RES_ICON.gold = draw(g => { g.fillStyle = INK; g.beginPath(); g.arc(8, 8, 6.5, 0, 7); g.fill(); g.fillStyle = '#f3cf6a'; g.beginPath(); g.arc(8, 8, 5.5, 0, 7); g.fill(); px(g, 7, 5, 2, 6, '#c9962a'); px(g, 5, 4, 2, 2, '#fff2b8'); });
  RES_ICON.firewood = draw(g => { for (const [x, y] of [[2, 9], [7, 9], [4.5, 5]]) { px(g, x, y, 7, 5, INK); px(g, x + 1, y + 1, 5, 3, '#c98a4a'); px(g, x + 2, y + 2, 2, 1, '#e8b47a'); } });
  RES_ICON.planks = draw(g => { for (let k = 0; k < 3; k++) { px(g, 1, 3 + k * 4, 14, 4, INK); px(g, 2, 4 + k * 4, 12, 2, '#d8b07a'); px(g, 2, 4 + k * 4, 12, 1, '#ecc893'); } });
  RES_ICON.ore = draw(g => { g.fillStyle = INK; g.beginPath(); g.ellipse(8, 9, 7, 5.5, 0, 0, 7); g.fill(); g.fillStyle = '#7a6a62'; g.beginPath(); g.ellipse(8, 9, 6, 4.5, 0, 0, 7); g.fill(); for (const [x, y] of [[5, 7], [9, 9], [7, 11], [11, 7]]) px(g, x, y, 2, 2, '#c9714a'); });
  RES_ICON.iron = draw(g => { g.fillStyle = INK; g.beginPath(); g.moveTo(1, 12); g.lineTo(4, 5); g.lineTo(15, 5); g.lineTo(12, 12); g.fill(); g.fillStyle = '#8a929b'; g.beginPath(); g.moveTo(3, 11); g.lineTo(5, 6); g.lineTo(13, 6); g.lineTo(11, 11); g.fill(); px(g, 5, 7, 7, 1, '#c7ccd3'); });
  RES_ICON.flour = draw(g => { g.fillStyle = INK; g.beginPath(); g.ellipse(8, 9, 6, 6.5, 0, 0, 7); g.fill(); g.fillStyle = '#f1ebe0'; g.beginPath(); g.ellipse(8, 9, 5, 5.5, 0, 0, 7); g.fill(); px(g, 6, 1, 4, 3, '#b8a98a'); px(g, 6, 8, 4, 3, '#d8cbb0'); });
  RES_ICON.bread = draw(g => { g.fillStyle = INK; g.beginPath(); g.ellipse(8, 9, 7.5, 5, 0, 0, 7); g.fill(); g.fillStyle = '#d9a35a'; g.beginPath(); g.ellipse(8, 9, 6.5, 4, 0, 0, 7); g.fill(); for (const x of [4, 7, 10]) px(g, x, 7, 2, 3, '#f3cf8a'); });
  RES_ICON.meat = draw(g => { g.fillStyle = INK; g.beginPath(); g.ellipse(7, 8, 6, 5.5, 0.4, 0, 7); g.fill(); g.fillStyle = '#b8463a'; g.beginPath(); g.ellipse(7, 8, 5, 4.5, 0.4, 0, 7); g.fill(); px(g, 11, 11, 4, 3, INK); px(g, 12, 12, 3, 1, '#f1ebe0'); px(g, 4, 6, 3, 2, '#e07a6a'); });
  RES_ICON.ale = draw(g => { px(g, 3, 3, 9, 12, INK); px(g, 4, 6, 7, 8, '#c98a2a'); px(g, 4, 4, 7, 3, '#fff6dd'); px(g, 12, 6, 3, 6, INK); px(g, 12, 7, 2, 4, '#c98a2a'); });
  RES_ICON.happy = draw(g => { g.fillStyle = INK; g.beginPath(); g.arc(8, 8, 7, 0, 7); g.fill(); g.fillStyle = '#f3cf6a'; g.beginPath(); g.arc(8, 8, 6, 0, 7); g.fill(); px(g, 5, 5, 2, 2, INK); px(g, 9, 5, 2, 2, INK); px(g, 4, 9, 2, 1, INK); px(g, 10, 9, 2, 1, INK); px(g, 5, 10, 6, 2, INK); });
  RES_ICON.pop = draw(g => { px(g, 5, 1, 6, 6, INK); px(g, 6, 2, 4, 4, '#e9b98f'); px(g, 3, 7, 10, 8, INK); px(g, 4, 8, 8, 6, '#86aaf5'); });
}
const costHtml = cost => Object.entries(cost).map(([r, n]) => `<span class="c ${W.F[0] && W.F[0].res[r] < n ? 'lack' : ''}"><img src="${RES_ICON[r]}">${n}</span>`).join('');

// ── top bar + build menu ───────────────────────────────────────────────────
const ICONS = {};
function roadIcon() { const c = mk(48, 48), g = c.getContext('2d'); g.drawImage(ROAD_TEX[0], 0, 8, 48, 32); px(g, 0, 8, 48, 2, 'rgba(60,48,36,0.6)'); px(g, 0, 38, 48, 2, 'rgba(60,48,36,0.6)'); return c.toDataURL(); }
function buildMenu() {
  UI.tab = UI.tab || 0;
  for (const t of BUILD_ORDER_UI) if (!ICONS[t]) ICONS[t] = BDEF[t].road ? roadIcon() : buildingIcon(t);
  const tab = BUILD_TABS[UI.tab];
  $('build').innerHTML = `<div class="tabs">${BUILD_TABS.map((t, i) => `<button class="tab ${i === UI.tab ? 'on' : ''}" data-tab="${i}">${t.name}</button>`).join('')}</div>
    <div class="bgrid${tab.items.length > 6 ? " wide" : ""}">${tab.items.map(t => `<button class="bbtn" data-b="${t}" data-tip="${t}"><img src="${ICONS[t]}"><span class="nm">${BDEF[t].name}</span><span class="k">${BDEF[t].key.toUpperCase()}</span></button>`).join('')}</div>`;
  $('build').onmousedown = e => {
    if (e.button !== 0) return;
    const tb = e.target.closest('.tab'); if (tb) { UI.tab = +tb.dataset.tab; buildMenu(); refreshBars(); return; }
    const btn = e.target.closest('.bbtn'); if (btn) startPlacing(btn.dataset.b);
  };
}
function showTabFor(type) { const i = BUILD_TABS.findIndex(t => t.items.includes(type)); if (i >= 0 && i !== UI.tab) { UI.tab = i; buildMenu(); } }
function refreshBars() {
  const F = W.F[0]; if (!F) return;
  $('res').innerHTML = RES.map(r => `<div class="r ${F.res[r] >= F.cap[r] ? 'full' : ''}" data-tip="res:${r}"><img src="${RES_ICON[r]}"><b>${Math.floor(F.res[r])}</b><i>/${F.cap[r]}</i></div>`).join('') +
    `<div class="r ${F.pop >= F.popCap ? 'full' : ''}" data-tip="res:pop"><img src="${RES_ICON.pop}"><b>${F.pop}</b><i>/${F.popCap}</i></div>` +
    `<div class="r mood" data-tip="res:happy"><img src="${RES_ICON.happy}"><b>${Math.round(F.happy || 50)}%</b></div>` +
    `<div class="r age" data-tip="res:age">🏰 <b>${AGES[ageOf(F)].name}</b>${W.blds.some(b => b.fac === 0 && b.queue.some(q => q.age)) ? ' <i>advancing…</i>' : ''}</div>` +
    (F.bell ? '<div class="r starving" data-tip="res:bell">🔔 Bell rung</div>' : '') + (F.hungry ? '<div class="r starving">Starving!</div>' : '') + (W.cal.season === 3 && F.res.firewood < 5 ? '<div class="r starving">No firewood!</div>' : '');
  $('goods').innerHTML = GOODS.map(r => `<div class="g ${F.res[r] >= F.cap[r] && F.cap[r] > 0 ? 'full' : ''}" data-tip="res:${r}"><img src="${RES_ICON[r]}"><b>${Math.floor(F.res[r])}</b><i>/${F.cap[r]}</i></div>`).join('');
  const C = W.cal, icon = ['🌱', '☀️', '🍂', '❄️'][C.season];
  $('season').innerHTML = `<span class="sic">${icon}</span><span><b>${C.name}</b> · Day ${C.dayIn}${C.night ? ' · Night' : ''}</span><span class="sbar"><i style="width:${Math.round(((C.dayIn - 1 + C.tod) / SEASON_DAYS) * 100)}%"></i></span>`;
  $('season').dataset.tip = 'season';
  const m = Math.floor(W.t / 60), s = Math.floor(W.t % 60);
  $('clock').textContent = `${m}:${String(s).padStart(2, '0')}`;
  $('rivals').innerHTML = W.F.slice(1).filter(o => !o.absent && !o.bandit).map(o => `<span class="dot ${o.alive ? '' : 'dead'} rel-${W.rel ? W.rel[0][o.i] : 'war'}" style="background:${FAC[o.i].col}" data-tip="rival:${o.i}"></span>`).join('');
  $('btnDiplo').classList.toggle('ping', !!(W.offers && W.offers.length));
  if (!$('diplo').hidden) refreshDiplo();
  for (const btn of document.querySelectorAll('.bbtn')) {
    const t = btn.dataset.b, d = BDEF[t], reqOk = (!d.req || hasDone(0, d.req)) && ageOk(F, t);
    btn.classList.toggle('na', !canAfford(F, d.cost) || !reqOk);
    btn.classList.toggle('locked', !ageOk(F, t));
    btn.classList.toggle('on', UI.placing === t);
  }
  for (const b of document.querySelectorAll('#speed button')) b.classList.toggle('on', +b.dataset.s === W.speed && !UI.paused);
  // alerts
  $('alerts').innerHTML = W.alerts.filter(a => a.t > 0).map(a => `<div class="al ${a.kind}" style="opacity:${Math.min(1, a.t / 2)}">${a.text}</div>`).join('');
  refreshGoals();
}
function refreshGoals() {
  if (UI.hideGoals) { $('goals').hidden = true; return; }
  const has = t => W.blds.some(b => b.fac === 0 && b.type === t);
  const g = [
    ['Build a Lumber Mill by the forest (L)', has('lumber')], ['Build a Farm (F)', has('farm')], ['Build more Houses (H)', W.blds.filter(b => b.fac === 0 && b.type === 'house').length >= 3],
    [`Build a Firewood Yard before winter (Z)`, has('woodyard')], ['Add variety: Hunter\'s Lodge (U) or Windmill + Bakery (I, E)', has('hunter') || has('bakery')],
    ['Build a Granary to stockpile food (G)', has('granary')], ['Advance to the Town Age at your Town Hall', ageOf(W.F[0]) >= 1], ['Build a Barracks and train soldiers (B)', W.units.some(u => u.fac === 0 && isSoldier(u))], ['Defeat or ally with every rival (Diplomacy)', W.over === 'win']
  ];
  const next = g.findIndex(x => !x[1]);
  $('goals').hidden = false;
  $('goals').innerHTML = '<h4>Goals</h4>' + g.map(([t, d], i) => `<div class="${d ? 'done' : i === next ? 'next' : ''}">${d ? '✓' : i === next ? '›' : '·'} ${t}</div>`).filter((_, i) => i <= next + 1 || next < 0).join('') +
    (W.t < 450 ? `<div class="hint">Winter arrives at 7:30: farms stop and homes burn firewood. Rivals usually raid after ${Math.round([540, 420, 330][W.diff] / 60)}+ minutes.</div>` : '');
}

// ── selection panel ────────────────────────────────────────────────────────
function refreshInfo() {
  const sel = [...UI.sel].map(byId).filter(Boolean);
  UI.sel = new Set(sel.map(e => e.id));
  let h = '';
  if (!sel.length) {
    h = `<div class="hint2">Left-click to select. Drag to box-select soldiers. Right-click to command.<br>Villagers choose their own jobs at your buildings.<br><span class="dim">Build with the buttons on the left or hotkeys. C centres on your Town Hall, Space selects your army, Tab switches build tabs.</span></div>`;
  } else if (sel.length === 1 && sel[0].kind === 'bld') h = bldInfo(sel[0]);
  else if (sel.length === 1) h = unitInfo(sel[0]);
  else {
    const counts = {}; for (const u of sel) if (u.kind === 'unit') { const k = u.stage === 'child' ? 'child' : u.type; counts[k] = (counts[k] || 0) + 1; }
    UDEF.child = UDEF.child || { name: 'Child' };
    h = `<h3>${sel.length} selected</h3><div class="grp">` + Object.entries(counts).map(([t, n]) => `<span class="pill">${n} × ${UDEF[t].name}</span>`).join('') + `</div>` + armyControls(sel.filter(u => u.kind === 'unit' && u.fac === 0 && isSoldier(u))) + `<div class="dim">Right-click ground: attack-move in formation. Shift + right-click: move only. Ctrl+1-9 saves a group.</div>`;
  }
  if (h !== UI.infoHtml) { $('info').innerHTML = h; UI.infoHtml = h; }
}
function bar(f, col = '#6fd36a') { return `<div class="bar"><div style="width:${Math.round(clamp(f, 0, 1) * 100)}%;background:${col}"></div></div>`; }
function bldInfo(b) {
  const d = BDEF[b.type], own = b.fac === 0, F = W.F[b.fac];
  let h = `<h3><span class="sw" style="background:${FAC[b.fac].col}"></span>${d.name}${own ? '' : ` <span class="dim">(${FAC[b.fac].name})</span>`}</h3>`;
  h += `<div class="row">HP ${Math.ceil(b.hp)}/${b.maxHp}</div>${bar(b.hp / b.maxHp, own ? '#6fd36a' : FAC[b.fac].lite)}`;
  if (!own) return h + `<div class="dim">${d.desc}</div>`;
  if (!b.done) {
    const n = workersOf(b).length;
    return h + `<div class="row">Under construction: ${Math.floor(b.progress * 100)}% · ${n} builder${n === 1 ? '' : 's'}</div>${bar(b.progress, '#e8c547')}<div class="dim">${n ? '' : 'Waiting for a free villager…'}</div><div class="acts"><button data-act="cancel">Cancel (refund 75%)</button></div>`;
  }
  if (b.type !== 'hall') h += `<div class="dim">${d.desc}</div>`;
  if (d.slots) {
    const ws = workersOf(b), n = ws.length;
    h += `<div class="row">Workers <b>${n}/${b.slots}</b> <button class="sm" data-act="slots-">−</button><button class="sm" data-act="slots+">+</button> <span class="dim">(max ${d.slots})</span></div>`;
    const st = ws.map(u => u.status).find(Boolean); if (st) h += `<div class="warn">${st}</div>`;
  }
  if (b.type === 'mine') h += `<div class="row">Quarry: <button class="tog ${b.ore === 'stone' ? 'on' : ''}" data-act="ore-stone"><img src="${RES_ICON.stone}"> Stone</button><button class="tog ${b.ore === 'gold' ? 'on' : ''}" data-act="ore-gold"><img src="${RES_ICON.gold}"> Gold</button><button class="tog ${b.ore === 'ore' ? 'on' : ''}" data-act="ore-ore"><img src="${RES_ICON.ore}"> Iron</button></div>`;
  if (d.store && b.type !== 'hall') h += `<div class="row dim">Storage: ${Object.entries(d.store).map(([r, n]) => `+${n} <img class="ri" src="${RES_ICON[r]}">`).join(' ')}</div>`;
  if (b.type === 'hall') h += hallInfo(b, F);
  if (isHome(b)) h += homeInfo(b);
  if (d.recipe) { const R = d.recipe; h += `<div class="row">Recipe: ${R.ins.map(([r, n]) => `${n} <img class="ri" src="${RES_ICON[r]}"> ${RES_NAME[r]}`).join(' + ')} → ${R.n} <img class="ri" src="${RES_ICON[R.out]}"> ${RES_NAME[R.out]} <span class="dim">(in stock: ${R.ins.map(([r]) => Math.floor(F.res[r])).join(' / ')} → ${Math.floor(F.res[R.out])})</span></div>`; }
  const pile = bufTotal(b); if (pile > 0) h += `<div class="row dim">Waiting for a cart: ${Object.entries(b.buf).map(([r, n]) => `${n} <img class="ri" src="${RES_ICON[r]}">`).join(' ')}</div>`;
  if (b.type === 'cartshed') { const piles = W.blds.filter(x => x.fac === 0 && bufTotal(x) > 0); h += `<div class="row">Goods waiting in piles: <b>${piles.reduce((a, x) => a + bufTotal(x), 0)}</b> at ${piles.length} building${piles.length === 1 ? '' : 's'}</div><div class="dim">While carters are on duty, farmers and workshop crews pile output at their own building instead of walking it to storage.</div>`; }
  if (b.type === 'market') h += marketInfo(F);
  if (b.type === 'tower') h += `<div class="row dim">Garrison: ${garrisonOf(b)}/${BDEF.tower.shelter} (each adult adds an arrow while the bell rings)</div>`;
  if (b.type === 'hunter') h += `<div class="row dim">Deer within range: ${W.deer.filter(x => dist(x.x, x.y, b.x + 1, b.y + 1) < 42).length}. Build lodges near forests where herds roam.</div>`;
  if (b.type === 'farm' && W.cal.season === 3) h += `<div class="warn">Fields are frozen: farmers find other work until spring.</div>`;
  if (d.trains) {
    const tl = trainsFor(b) || [];
    if (!tl.length) h += `<div class="dim">${FAC[0].fname || 'Your faction'} has no units trained here.</div>`;
    h += `<div class="acts">` + tl.map(t => `<button class="tr ${unitAgeOk(F, t) && !(UDEF[t].elite && elitesAlive(0, t)) ? '' : 'done'}" data-act="train-${t}" data-tip="unit:${t}">${UDEF[t].hv && hvPortrait(t) ? `<img class="port" src="${hvPortrait(t)}">` : ''}<b>${UDEF[t].name}${UDEF[t].group > 1 ? ' ×' + UDEF[t].group : ''}</b>${unitAgeOk(F, t) ? costHtml(UDEF[t].cost) : `<span class="dim">${AGES[UNIT_AGE[t]].name}</span>`}</button>`).join('') + `</div>`;
    h += `<div class="dim">Right-click the ground to set a rally point.</div>`;
  }
  const ups = researchAt(b.type);
  if (ups.length) h += `<div class="acts">` + ups.map(k => { const u = UPGRADES[k], done = F.ups.has(k), busy = W.blds.some(x => x.fac === 0 && x.queue.some(q => q.up === k)); return `<button class="tr ${done ? 'done' : ''}" data-act="${done || busy ? '' : 'up-' + k}" data-tip="up:${k}"><b>${done ? '✓ ' : ''}${u.name}</b>${done ? '<span class="dim">Done</span>' : busy ? '<span class="dim">Researching…</span>' : costHtml(u.cost)}</button>`; }).join('') + `</div>`;
  if (b.queue.length) h += `<div class="queue">` + b.queue.map((q, i) => `<div class="q" data-act="q-${i}" title="Click to cancel"><span>${q.unit ? UDEF[q.unit].name : q.age ? '→ ' + AGES[q.age].name : UPGRADES[q.up].name}</span>${i === 0 ? bar(1 - q.t / q.total, q.blocked ? '#e2553f' : '#e8c547') : ''}${i === 0 && q.blocked ? '<i class="warn">needs housing</i>' : ''}</div>`).join('') + `</div>`;
  if (b.type !== 'hall') h += `<div class="acts"><button class="del" data-act="demolish">Demolish (Del)</button></div>`;
  return h;
}
function unitInfo(u) {
  const d = UDEF[u.type], own = u.fac === 0;
  let h = `<h3><span class="sw" style="background:${FAC[u.fac].col}"></span>${d.name}${own ? '' : ` <span class="dim">(${FAC[u.fac].name})</span>`}</h3><div class="row">HP ${Math.ceil(u.hp)}/${u.maxHp}</div>${bar(u.hp / u.maxHp, own ? '#6fd36a' : FAC[u.fac].lite)}`;
  if (u.type === 'villager') return villagerInfo(u, own);
  if (u.type === 'transport') { const ps = (u.load || []).map(byId).filter(Boolean), c = {}; for (const p of ps) { const k = p.type === 'villager' ? 'Villager' : UDEF[p.type].name; c[k] = (c[k] || 0) + 1; }
    return h + `<div class="row">Passengers <b>${ps.length}/${UDEF.transport.cap}</b> ${Object.entries(c).map(([k, n]) => `<span class="pill">${n} × ${k}</span>`).join('')}</div>` + (own ? `<div class="acts"><button data-act="unload" ${ps.length ? '' : 'class="na"'}>Unload at the nearest shore</button></div><div class="dim">Select soldiers or villagers and right-click this boat to board. With the boat selected, right-click a shore to sail there and land everyone.</div>` : ''); }
  if (u.type === 'fishboat') return h + `<div class="row">${u.status ? `<span class="warn">${u.status}</span>` : (u.catch >= 15 ? 'Bringing the catch home' : 'Fishing')} · Catch ${u.catch || 0}/15</div><div class="dim">${d.desc}</div>`;
  if (u.type === 'caravan') { const post = u.market && byId(u.market) ? nearestPost(byId(u.market)) : null; return h + `<div class="row">${u.leg === 'back' ? 'Returning to market' : 'Heading to the Trading Post'}${post ? ` · ${Math.round(dist(u.x, u.y, post.x, post.y))} tiles from the post` : ''}</div><div class="row">${u.cargo ? `Cargo: ${u.cargo.n} <img class="ri" src="${RES_ICON[u.cargo.res]}"> ${RES_NAME[u.cargo.res]}` : 'No cargo (sells your surplus when stocks run over 70%)'}</div><div class="dim">${d.desc}</div>`; }
  if (u.type === 'hero') { const l = heroLevel(u), nxt = [120, 320, 600, 1000][l - 1]; h = h.replace(UDEF.hero.name, u.name || UDEF.hero.name);
    h += `<div class="row">Level <b>${l}</b>${nxt ? ` · XP ${Math.floor(u.xp || 0)}/${nxt}` : ' (max)'} · Aura ${6 + l} tiles: +${1 + Math.floor(l / 2)} attack, +${l >= 3 ? 2 : 1} armor</div>${nxt ? bar((u.xp || 0) / nxt, '#f3cf6a') : ''}`; }
  if (u.fac === 0 && isSoldier(u)) h += armyControls([u]);
  {
    const F = W.F[u.fac];
    const archy = d.ranged && !d.siege && !d.naval;
    h += `<div class="row">Attack ${+(d.atk + (!archy && d.mil && !d.siege && F.ups.has('forging') ? 2 : 0) + (archy && F.ups.has('fletching') ? 2 : 0) + (u.star || 0) * 1.6).toFixed(1)} · Armor ${d.arm + (F.ups.has('mail') ? 2 : 0)} · Range ${+rangeOf(u).toFixed(1)}</div>`;
    if (d.hv) h += `<div class="row">${d.role ? `<span class="pill">${d.role}</span>` : ''}${d.elite ? '<span class="pill pos">Elite</span>' : ''}${u.sqd ? `<span class="pill">Squad</span>` : ''}${u.star ? `<span class="pill pos">${'★'.repeat(u.star)}</span>` : ''}${u.risen ? '<span class="pill neg">Risen</span>' : ''}${(d.kw || []).map(k => `<span class="pill" title="${k[1]}">${k[0]}</span>`).join('')}</div>`;
    h += `<div class="dim">${d.desc}</div>`;
  }
  return h;
}
const MOOD_NAME = { hungry: 'Hungry', variety: 'Varied meals', ale: 'Ale with dinner', home: 'Has a home', warm: 'Warm home', raids: 'Recent raids', grief: 'Mourning the dead', sick: 'Sick' };
function moodList(m) { return Object.entries(m || {}).filter(([, v]) => v).sort((a, b) => a[1] - b[1]).map(([k, v]) => `<span class="pill ${v < 0 ? 'neg' : 'pos'}">${k === 'home' && v < 0 ? 'Homeless' : k === 'warm' && v < 0 ? 'Freezing' : MOOD_NAME[k]} ${v > 0 ? '+' : ''}${v}</span>`).join(''); }
function villagerInfo(u, own) {
  const stage = u.stage === 'child' ? 'Child' : u.stage === 'elder' ? 'Elder' : 'Villager';
  let h = `<h3><span class="sw" style="background:${FAC[u.fac].col}"></span>${fullName(u)} <span class="dim">· ${stage}, age ${u.age}${own ? '' : ' · ' + FAC[u.fac].name}</span></h3>`;
  h += `<div class="row">HP ${Math.ceil(u.hp)}/${u.maxHp} · Happiness <b>${Math.round(u.happy)}%</b></div>${bar(u.happy / 100, u.happy >= 60 ? '#6fd36a' : u.happy >= 35 ? '#e8c547' : '#e2553f')}`;
  if (!own) return h;
  const b = u.job && byId(u.job.b), home = u.home && byId(u.home);
  const jobName = { lumber: 'Woodcutter', mine: b && b.ore === 'gold' ? 'Gold miner' : 'Stone miner', farm: 'Farmer', woodyard: 'Wood splitter', hunter: 'Hunter', mill: 'Miller', bakery: 'Baker', brewery: 'Brewer' };
  const doing = u.inside ? (W.cal.night ? 'Asleep at home' : u.sick ? 'Resting at home, sick' : 'At home') : u.fleeT > 0 ? 'Fleeing!' : u.stage === 'child' ? 'Playing (comes of age at 14)' : u.sick ? 'Sick, heading home' : !b ? 'Idle, looking for work' : u.job.kind === 'build' ? `Building a ${BDEF[b.type].name}` : jobName[b.type];
  h += `<div class="row">${doing}${home ? ` · lives in ${home.type === 'hall' ? 'the Town Hall' : `the ${home.family || u.surname} house`}` : ' · <b class="warn">homeless</b>'}</div>`;
  if (u.carry && u.carry.n) h += `<div class="row">Carrying ${u.carry.n} <img class="ri" src="${RES_ICON[u.carry.res]}"> ${RES_NAME[u.carry.res]}</div>`;
  if (u.status) h += `<div class="warn">${u.status}</div>`;
  h += `<div class="row">${moodList(u.mood)}</div>`;
  h += `<div class="row dim">Last meals: ${(u.meals || []).map(m => `<img class="ri" src="${RES_ICON[m]}" title="${RES_NAME[m]}">`).join('') || 'none'}${u.ale ? ` + <img class="ri" src="${RES_ICON.ale}">` : ''}</div>`;
  const sk = Object.keys(u.skill || {}).map(k => [k, skillLv(u, k)]).filter(([, l]) => l > 0).sort((a, b) => b[1] - a[1]);
  if (sk.length) h += `<div class="row">Skills: ${sk.slice(0, 4).map(([k, l]) => `<span class="pill">${SKILL_NAME[k]} <span class="stars">${'★'.repeat(l)}</span></span>`).join('')}</div>`;
  return h;
}
function homeInfo(b) {
  const rs = residents(b), cap = BDEF[b.type].pop;
  let h = `<div class="row"><b>${b.type === 'hall' ? 'Hall lodgers' : (b.family ? `The ${b.family} family` : 'An empty home')}</b> · ${rs.length}/${cap} beds${W.cal.season === 3 ? (b.warm ? ' · <span class="ok">hearth lit</span>' : ' · <b class="warn">cold, no firewood</b>') : ''}</div>`;
  if (rs.length) h += `<div class="row">${rs.map(u => `<span class="pill" data-sel="${u.id}">${u.first} · ${u.stage === 'child' ? 'child ' : ''}${u.age}${u.sick ? ' 🤒' : ''}</span>`).join('')}</div>`;
  if (b.type === 'house') { const ad = rs.filter(u => u.stage === 'adult').length; h += `<div class="dim">${ad >= 2 && rs.length < cap ? 'A couple lives here: if they\'re happy (55%+), a child may be born.' : rs.length >= cap ? 'House is full.' : 'Needs two adults to raise a family.'}</div>`; }
  return h;
}
function ageHtml(b, F) {
  const n = ageOf(F) + 1, A = AGES[n], busy = b.queue.some(q => q.age);
  let h = `<div class="row"><b>${AGES[n - 1].name}</b>`;
  if (A) { const why = ageBlock(F); h += busy ? ` · advancing to the ${A.name}…` : ` <button class="tr" data-act="age" data-tip="res:age"><b>Advance to the ${A.name}</b>${why ? `<span class="warn">${why}</span>` : costHtml(A.cost) + ` · ${A.time}s`}</button>`; }
  h += `</div>`;
  for (let t = 0; t <= ageOf(F); t++) {
    const pick = (F.docs || []).find(k => DOC_BY_KEY[k].tier === t);
    h += `<div class="row doc">${AGES[t].name} doctrine: ` + (pick ? `<b>✓ ${DOC_BY_KEY[pick].name}</b> <span class="dim">${DOC_BY_KEY[pick].desc}</span>` : DOCTRINES[t].map(d => `<button class="tog" data-act="doc-${d.k}" data-tip="doc:${d.k}">${d.name}</button>`).join(' or ')) + `</div>`;
  }
  return h;
}
function hallInfo(b, F) {
  const top = {}; for (const u of W.units) if (u.fac === 0 && u.type === 'villager' && u.stage !== 'child') for (const [k, v] of Object.entries(u.mood || {})) top[k] = (top[k] || 0) + v;
  const n = W.units.filter(u => u.fac === 0 && u.type === 'villager' && u.stage !== 'child').length || 1;
  const avg = Object.fromEntries(Object.entries(top).map(([k, v]) => [k, Math.round(v / n)]));
  const kids = W.units.filter(u => u.fac === 0 && u.stage === 'child').length, elders = W.units.filter(u => u.fac === 0 && u.stage === 'elder').length;
  return ageHtml(b, F) + `<div class="acts"><button class="tog ${F.bell ? 'on' : ''}" data-act="bell" title="Villagers shelter in the Town Hall and towers, which then shoot extra arrows">${F.bell ? '🔔 Sound the all-clear' : '🔔 Ring the town bell'}</button>
</div>
    <div class="row dim">Sheltering here: ${garrisonOf(b)}/${BDEF.hall.shelter} (+1 arrow per 3 adults)</div>
    <div class="row">Town happiness <b>${Math.round(F.happy)}%</b> · ${F.pop}/${F.popCap} people · ${kids} children · ${elders} elders</div>${bar(F.happy / 100, F.happy >= 60 ? '#6fd36a' : F.happy >= 35 ? '#e8c547' : '#e2553f')}
    <div class="row">${moodList(avg)}</div>
    <div class="dim">Settlers arrive when happiness is above 40% and there are free beds (not in winter). Below 25%, people pack up and leave.</div>
    <div class="acts"><button class="tog ${F.growth ? 'on' : ''}" data-act="growth">${F.growth ? 'Welcoming settlers & births' : 'Growth paused'}</button></div>`;
}
const TRADE_RES = ['food', 'wood', 'stone', 'planks', 'ore', 'iron', 'firewood', 'flour', 'bread', 'meat', 'ale'];
function marketInfo(F) {
  const cv = W.units.filter(u => u.fac === 0 && u.type === 'caravan').length;
  return `<div class="row">Caravans: <b>${cv}</b> · trade income so far <b>${F.stats.trade || 0}</b> <img class="ri" src="${RES_ICON.gold}"></div>
    <div class="mkt">${TRADE_RES.map(r => `<div class="mrow"><span><img class="ri" src="${RES_ICON[r]}"> ${RES_NAME[r]} <i>${Math.floor(F.res[r])}</i></span>
      <button class="sm" data-act="sell-${r}" title="Sell 20">Sell 20 → ${marketPrice(F, r, false)}<img class="ri" src="${RES_ICON.gold}"></button>
      <button class="sm" data-act="buy-${r}" title="Buy 20">Buy 20 ← ${marketPrice(F, r, true)}<img class="ri" src="${RES_ICON.gold}"></button></div>`).join('')}</div>
    <div class="dim">Prices drop as you sell and rise as you buy, then drift back.</div>`;
}
function armyControls(army) {
  if (!army.length) return '';
  UI.formation = UI.formation || 'line';
  const fighters = army.filter(moraleUnit), avg = fighters.length ? Math.round(fighters.reduce((a, u) => a + u.morale, 0) / fighters.length) : null;
  const st = army.every(u => u.stance === army[0].stance) ? army[0].stance : null;
  const hero = army.find(u => u.type === 'hero');
  return (avg !== null ? `<div class="row">Morale <b>${avg}%</b> ${fighters.some(u => u.rout > 0) ? '<span class="warn">some are routing!</span>' : ''}</div>${bar(avg / 100, avg < 30 ? '#ff8a6a' : '#86aaf5')}` : '') +
    `<div class="row">Stance: ${Object.entries(STANCES).map(([k, v]) => `<button class="tog ${st === k ? 'on' : ''}" data-act="stance-${k}" title="${v.tip || ''}">${v.name}</button>`).join('')} &nbsp; Formation: ${Object.entries(FORMATIONS).map(([k, v]) => `<button class="tog ${UI.formation === k ? 'on' : ''}" data-act="form-${k}">${v.name || v}</button>`).join('')}</div>` +
    (hero ? heroButtons(hero) : '');
}
function heroButtons(h) {
  const cdr = Math.max(0, Math.ceil((h.cdRally || 0) - W.t)), cds = Math.max(0, Math.ceil((h.cdShield || 0) - W.t));
  return `<div class="acts"><button class="tr" data-act="ab-rally" title="+35 morale, stops routing, faster for 10 s"><b>Rally</b><span class="dim">${cdr ? cdr + 's' : 'Ready'}</span></button><button class="tr" data-act="ab-shield" title="Allies in the aura take 30% less damage for 8 s"><b>Shield Wall</b><span class="dim">${cds ? cds + 's' : 'Ready'}</span></button></div>`;
}
function infoAction(act) {
  const selU = [...UI.sel].map(byId).filter(e => e && e.kind === 'unit' && e.fac === 0);
  if (act === 'unload') { for (const u of selU) if (u.type === 'transport' && (u.load || []).length) { u.order = { type: 'unload', x: u.x, y: u.y, n: W.t, r: 5 }; u.path = null; u.goalKey = null; } UI.infoHtml = ''; refreshInfo(); return; }
  if (act && act.startsWith('stance-')) { for (const u of selU) if (isSoldier(u)) { u.stance = act.slice(7); u.guard = [u.x, u.y]; } UI.infoHtml = ''; refreshInfo(); return; }
  if (act && act.startsWith('form-')) { UI.formation = act.slice(5); UI.infoHtml = ''; refreshInfo(); return; }
  if (act && act.startsWith('ab-')) { const h = selU.find(u => u.type === 'hero'); if (h && !heroAbility(h, act.slice(3))) flash('That ability is still recharging.'); UI.infoHtml = ''; refreshInfo(); return; }
  const b = [...UI.sel].map(byId).find(e => e && e.kind === 'bld' && e.fac === 0); if (!b || !act) return;
  const F = W.F[0];
  if (act === 'slots+') b.slots = Math.min(BDEF[b.type].slots, b.slots + 1);
  else if (act === 'slots-') b.slots = Math.max(0, b.slots - 1);
  else if (act.startsWith('ore-')) { b.ore = act.slice(4); for (const u of workersOf(b)) { u.tn = -1; } }
  else if (act === 'growth') F.growth = !F.growth;
  else if (act === 'bell') ringBell(F, !F.bell);
  else if (act.startsWith('sell-') || act.startsWith('buy-')) { const buy = act.startsWith('buy-'), err = marketTrade(F, act.slice(buy ? 4 : 5), buy); if (err) flash(err); }
  else if (act.startsWith('train-')) { const ut = act.slice(6); if (!unitAgeOk(F, ut)) flash(`${UDEF[ut].name}s require the ${AGES[UNIT_AGE[ut]].name}.`); else if (UDEF[ut].elite && elitesAlive(0, ut)) flash(`You can only field one ${UDEF[ut].name} at a time.`); else if (!queueUnit(b, ut)) flash(b.queue.length >= 6 ? 'Queue is full.' : 'Not enough resources.'); }
  else if (act.startsWith('up-')) { const up = act.slice(3); if (ageOf(F) < (UP_AGE[up] || 0)) flash(`${UPGRADES[up].name} requires the ${AGES[UP_AGE[up]].name}.`); else if (!queueUpgrade(b, up)) flash('Not enough resources.'); }
  else if (act === 'age') { const why = queueAge(b); if (why) flash(why); }
  else if (act.startsWith('doc-')) { const why = pickDoctrine(F, act.slice(4)); if (why) flash(why); }
  else if (act.startsWith('q-')) cancelQueue(b, +act.slice(2));
  else if (act === 'cancel') { refund(F, BDEF[b.type].cost, 0.75); destroyBuilding(b, -1); UI.sel.clear(); }
  else if (act === 'demolish') demolish(b);
  UI.infoHtml = ''; refreshInfo(); refreshBars();
}
function demolish(b) {
  if (!b || b.fac !== 0 || b.type === 'hall') return;
  if (UI.confirmDel !== b.id) { UI.confirmDel = b.id; flash('Press Delete / click Demolish again to confirm.'); setTimeout(() => { UI.confirmDel = null; }, 2500); return; }
  refund(W.F[0], BDEF[b.type].cost, b.done ? 0.3 : 0.75); destroyBuilding(b, -1); UI.sel.clear();
}
function flash(text) { W.alerts.push({ text, t: 3, kind: 'warn' }); }

// ── tooltip ────────────────────────────────────────────────────────────────
function tipFor(key) {
  if (BDEF[key]) { const d = BDEF[key], reqOk = !d.req || hasDone(0, d.req), ag = AGE_OF[key] || 0; return `<b>${d.name}</b> <span class="k">${d.key.toUpperCase()}</span><div>${costHtml(d.cost)}</div><div class="dim">${d.desc}</div>${ageOk(W.F[0], key) ? '' : `<div class="warn">Requires the ${AGES[ag].name}</div>`}${reqOk ? '' : `<div class="warn">Requires a ${BDEF[d.req].name}</div>`}`; }
  const [k, v] = key.split(':');
  if (k === 'unit') { const d = UDEF[v]; return `<b>${d.name}${d.group > 1 ? ' (squad of ' + d.group + ')' : ''}</b>${d.hv ? `<div class="dim">${d.role || ''}${d.elite ? ' · Elite, one at a time' : ''}${(d.kw || []).length ? ' · ' + d.kw.map(k => k[0]).join(', ') : ''}</div>` : ''}${unitAgeOk(W.F[0], v) ? '' : `<div class="warn">Requires the ${AGES[UNIT_AGE[v]].name}</div>`}<div>${costHtml(d.cost)} · ${d.time}s</div><div class="dim">HP ${d.hp} · Attack ${d.atk} · Armor ${d.arm}${d.ranged ? ' · Range ' + d.range : ''}</div><div class="dim">${d.desc}</div>`; }
  if (k === 'up') { const u = UPGRADES[v]; return `<b>${u.name}</b>${ageOf(W.F[0]) >= (UP_AGE[v] || 0) ? '' : `<div class="warn">Requires the ${AGES[UP_AGE[v]].name}</div>`}<div>${costHtml(u.cost)} · ${u.time}s</div><div class="dim">${u.desc}</div>`; }
  if (key === 'season') { const C = W.cal; return `<b>${C.name}, Year ${C.year}</b><div class="dim">${['Fields sprout slowly (70%). Settlers and births resume.', 'Full harvests. The best time to grow.', 'Bumper harvests (135%). Stockpile food and firewood!', 'Fields freeze, no settlers or births. Homes burn firewood; cold villagers fall ill.'][C.season]}</div><div class="dim">Each season lasts 2 days; nights send villagers home to sleep.</div>`; }
  if (k === 'res' && v === 'bell') return '<b>Town bell</b><div class="dim">Villagers are sheltering. Select the Town Hall to sound the all-clear.</div>';
  if (k === 'res' && v === 'happy') return '<b>Happiness</b><div class="dim">Varied meals (wheat, bread, meat), ale, a warm home and safety make people happy. Happy villagers work up to 20% faster, have children and attract settlers. Miserable ones slow down and eventually leave.</div>';
  if (k === 'res' && GOODS.includes(v)) return `<b>${RES_NAME[v]}</b><div class="dim">${{ planks: 'Sawn at a Sawmill. Builds military and advanced buildings, wagons and spearmen\'s and archers\' gear.', ore: 'Mined at a Mining Camp set to Iron, beside rust-red rock.', iron: 'Smelted from 2 ore + 1 firewood. Arms swordsmen and knights and pays for Blacksmith upgrades.', firewood: 'Split at a Firewood Yard. Each occupied home burns 1 every 10 s in winter.', flour: 'Ground from wheat at a Windmill. Baked into bread.', bread: 'Baked at a Bakery. Adds variety to meals.', meat: 'From hunters. Adds variety to meals, even in winter.', ale: 'Brewed from wheat. Half a mug with dinner lifts spirits.' }[v]}</div>`;
  if (k === 'res' && v === 'food') return '<b>Wheat</b><div class="dim">Grown on farms (none in winter). Eaten as porridge, milled into flour, brewed into ale. Granaries add storage.</div>';
  if (k === 'res') return v === 'pop' ? '<b>Population</b><div class="dim">Houses and the Town Hall give room. Everyone eats 1 food every 40 s.</div>' : `<b>${v[0].toUpperCase() + v.slice(1)}</b><div class="dim">Current / storage capacity. ${{ food: 'Granaries add food storage.', wood: 'Lumber Mills and Storehouses add wood storage.', stone: 'Mining Camps and Storehouses add storage.', gold: 'Mining Camps and Storehouses add storage.' }[v]}</div>`;
  if (k === 'rival') { const F = W.F[+v], P = PERSONAS[F.persona]; return `<b style="color:${FAC[v].lite}">${FAC[v].name}</b>${P ? ` · ${F.ruler} (${P.name})` : ''}<div class="dim">${F.alive ? `${REL_NAME[W.rel[0][v]]} · ${AGES[ageOf(F)].name}` : 'Defeated'}</div><div class="dim">Click for Diplomacy</div>`; }
  if (k === 'res' && v === 'age') { const n = ageOf(W.F[0]) + 1; return `<b>${AGES[n - 1].name}</b><div class="dim">${AGES[n] ? `Next: ${AGES[n].name}. Advance at the Town Hall. ${AGES[n].desc}` : 'Your town has reached the final age.'}</div>`; }
  if (k === 'doc') { const d = DOC_BY_KEY[v]; return `<b>${d.name}</b><div class="dim">${d.desc}</div><div class="dim">Choosing it locks out the other doctrine of this age for good.</div>`; }
  return '';
}
document.addEventListener('mousemove', e => {
  const el = e.target.closest && e.target.closest('[data-tip]'), tip = $('tip');
  if (el) { tip.innerHTML = tipFor(el.dataset.tip); tip.hidden = !tip.innerHTML; const r = tip.getBoundingClientRect(); tip.style.left = Math.min(innerWidth - r.width - 8, e.clientX + 14) + 'px'; tip.style.top = Math.max(8, e.clientY - r.height - 14) + 'px'; }
  else tip.hidden = true;
});

// ── world input ────────────────────────────────────────────────────────────
const screenToTile = (sx, sy) => [(sx / cam.z + cam.x) / TS, (sy / cam.z + cam.y) / TS];
function startPlacing(type) {
  const d = BDEF[type];
  showTabFor(type);
  if (!ageOk(W.F[0], type)) { flash(`${d.name} requires the ${AGES[AGE_OF[type]].name}. Advance at your Town Hall.`); return; }
  if (d.req && !hasDone(0, d.req)) { flash(`Requires a ${BDEF[d.req].name}.`); return; }
  if (!canAfford(W.F[0], d.cost)) { flash(`Not enough resources for a ${d.name}.`); return; }
  UI.placing = type; UI.sel.clear();
}
function updateGhost() {
  if (!UI.placing) { UI.ghost = null; return; }
  const [tx, ty] = screenToTile(UI.mouse.x, UI.mouse.y), d = BDEF[UI.placing];
  if (d.road || d.line) { UI.ghost = { x: Math.floor(tx), y: Math.floor(ty), ok: d.road || canPlace(0, UI.placing, Math.floor(tx), Math.floor(ty)) }; if (UI.roadDrag) { UI.roadDrag.x1 = Math.floor(tx); UI.roadDrag.y1 = Math.floor(ty); } return; }
  const x = Math.round(tx - d.w / 2), y = Math.round(ty - d.h / 2);
  UI.ghost = { x, y, ok: canPlace(0, UI.placing, x, y) && canAfford(W.F[0], d.cost) };
}
function entityAt(tx, ty) {
  let best = null, bd = 0.8;
  for (const u of W.units) { if (!FOG.seenUnit(u) || u.inside || u.aboard) continue; const d = Math.hypot(u.x - tx, u.y - 0.35 - ty) * (isNaval(u) ? 0.6 : 1); if (d < bd) { bd = d; best = u; } }
  if (best) return best;
  for (const b of W.blds) if ((b.fac === 0 || b.seen) && tx >= b.x && tx < b.x + b.w && ty >= b.y - TOP[b.type] / TS * 0.6 && ty < b.y + b.h) return b;
  return null;
}
cvs.addEventListener('contextmenu', e => e.preventDefault());
cvs.addEventListener('mousedown', e => {
  if (!UI.started || UI.paused) return;
  const [tx, ty] = screenToTile(e.clientX, e.clientY);
  if (e.button === 1) { UI.drag = { x: e.clientX, y: e.clientY, cx: cam.x, cy: cam.y }; e.preventDefault(); return; }
  if (e.button === 0) {
    if (UI.placing === 'road' || (UI.placing && BDEF[UI.placing].line)) { const x = Math.floor(tx), y = Math.floor(ty); UI.roadDrag = { x0: x, y0: y, x1: x, y1: y, remove: e.shiftKey && UI.placing === 'road' }; return; }
    if (UI.placing === 'gate') {
      const x = Math.floor(tx), y = Math.floor(ty), id = inMap(x, y) ? map.bld[ix(x, y)] : -1, w = id >= 0 && id < 1e9 ? byId(id) : null;
      if (w && w.fac === 0 && (w.type === 'palisade' || w.type === 'wall') && canAfford(W.F[0], BDEF.gate.cost)) { destroyBuilding(w, -1, true); W.fx = W.fx.filter(f => !(f.kind === 'rubble' && Math.abs(f.x - x - 0.5) < 1 && Math.abs(f.y - y - 0.5) < 1)); pay(W.F[0], BDEF.gate.cost); placeBuilding(0, 'gate', x, y); W.F[0].assignT = 0; if (!e.shiftKey) UI.placing = null; return; }
    }
    if (UI.placing) {
      updateGhost();
      if (UI.ghost && UI.ghost.ok) {
        pay(W.F[0], BDEF[UI.placing].cost); const b = placeBuilding(0, UI.placing, UI.ghost.x, UI.ghost.y);
        W.F[0].assignT = 0;
        if (!e.shiftKey || !canAfford(W.F[0], BDEF[UI.placing].cost)) { UI.placing = null; UI.sel = new Set([b.id]); }
      } else if (UI.ghost) flash(canAfford(W.F[0], BDEF[UI.placing].cost) ? "Can't build there." : 'Not enough resources.');
      return;
    }
    UI.box = { x0: e.clientX, y0: e.clientY, x1: e.clientX, y1: e.clientY, shift: e.shiftKey };
  }
  if (e.button === 2) {
    if (UI.placing) { UI.placing = null; UI.roadDrag = null; return; }
    const sel = [...UI.sel].map(byId).filter(x => x && x.fac === 0);
    const t = entityAt(tx, ty), mx = Math.floor(tx), my = Math.floor(ty);
    // land units clicked onto one of your transports climb aboard
    if (t && t.kind === 'unit' && t.fac === 0 && t.type === 'transport') {
      const riders = sel.filter(u => u.kind === 'unit' && !isNaval(u) && (isSoldier(u) || u.type === 'villager') && !u.aboard);
      if (riders.length) { riders.forEach(u => { u.boardId = t.id; u.order = { type: 'board', n: W.t }; u.target = null; u.path = null; u.goalKey = null; u.stuck = 0; }); UI.marks.push({ x: t.x, y: t.y, t: 0.6 }); return; }
    }
    const boats = sel.filter(u => u.kind === 'unit' && isNaval(u) && !UDEF[u.type].mil);
    for (const b of boats) {
      if (b.type === 'transport' && !waterAt(mx, my)) b.order = { type: 'unload', x: tx, y: ty, n: W.t };
      else b.order = { type: 'move', x: tx, y: ty, n: W.t };
      b.path = null; b.goalKey = null; b.stuck = 0;
    }
    const army = sel.filter(isSoldier), fleet = army.filter(isNaval), troops = army.filter(u => !isNaval(u));
    if (army.length) {
      if (t && t.fac !== 0 && foe(0, t.fac)) { orderGroup(army, 'attack', 0, 0, t.id); UI.marks.push({ x: tx, y: ty, t: 0.6, atk: true }); }
      else {
        if (troops.length) orderGroup(troops, e.shiftKey ? 'move' : 'amove', tx, ty, null, UI.formation);
        if (fleet.length) orderGroup(fleet, e.shiftKey ? 'move' : 'amove', tx, ty, null, 'spread');
        UI.marks.push({ x: tx, y: ty, t: 0.6 });
      }
      return;
    }
    if (boats.length) { UI.marks.push({ x: tx, y: ty, t: 0.6 }); return; }
    const b = sel.find(x => x.kind === 'bld' && BDEF[x.type].trains);
    if (b) { b.rally = [tx, ty]; UI.marks.push({ x: tx, y: ty, t: 0.6 }); }
  }
});
addEventListener('mousemove', e => {
  UI.mouse.x = e.clientX; UI.mouse.y = e.clientY; UI.mouse.in = e.target === cvs;
  if (UI.drag) { cam.x = UI.drag.cx - (e.clientX - UI.drag.x) / cam.z; cam.y = UI.drag.cy - (e.clientY - UI.drag.y) / cam.z; }
  if (UI.box) { UI.box.x1 = e.clientX; UI.box.y1 = e.clientY; }
});
addEventListener('mouseup', e => {
  if (e.button === 1) UI.drag = null;
  if (e.button === 0 && UI.roadDrag && UI.placing && BDEF[UI.placing].line) {
    const r = UI.roadDrag, tiles = roadLine(r.x0, r.y0, r.x1, r.y1); UI.roadDrag = null;
    const want = tiles.filter(([x, y]) => canPlace(0, UI.placing, x, y)).length, n = placeWallLine(W.F[0], UI.placing, tiles);
    if (n) W.F[0].assignT = 0;
    if (n < want) flash(n ? `Placed ${n} of ${want}: ran out of materials.` : `Not enough materials for a ${BDEF[UI.placing].name}.`);
    return;
  }
  if (e.button === 0 && UI.roadDrag) {
    const r = UI.roadDrag, tiles = roadLine(r.x0, r.y0, r.x1, r.y1); UI.roadDrag = null;
    if (r.remove) { const n = removeRoad(tiles); if (n) flash(`Removed ${n} road tile${n > 1 ? 's' : ''}.`); }
    else { const want = tiles.filter(([x, y]) => roadOk(x, y)).length, n = layRoad(W.F[0], tiles); if (n < want) flash(n ? `Laid ${n} tiles; ran out of stone.` : 'Not enough stone (1 per tile).'); }
    return;
  }
  if (e.button !== 0 || !UI.box) return;
  const b = UI.box; UI.box = null;
  const [ax, ay] = screenToTile(Math.min(b.x0, b.x1), Math.min(b.y0, b.y1)), [bx, by] = screenToTile(Math.max(b.x0, b.x1), Math.max(b.y0, b.y1));
  if (!b.shift) UI.sel.clear();
  if (Math.abs(b.x1 - b.x0) + Math.abs(b.y1 - b.y0) < 6) {
    const t = entityAt(ax, ay);
    if (t) {
      // double-click a soldier: select all of that type on screen
      if (t.kind === 'unit' && t.fac === 0 && UI.lastClick && UI.lastClick.id === t.id && performance.now() - UI.lastClick.at < 350) selectOnScreen(u => u.type === t.type);
      else if (b.shift && UI.sel.has(t.id)) UI.sel.delete(t.id); else UI.sel.add(t.id);
      UI.lastClick = { id: t.id, at: performance.now() };
    }
  } else {
    const inBox = W.units.filter(u => u.fac === 0 && !u.inside && !u.aboard && u.x >= ax && u.x <= bx && u.y >= ay && u.y <= by + 0.6);
    const soldiers = inBox.filter(isSoldier);
    for (const u of (soldiers.length ? soldiers : inBox)) UI.sel.add(u.id);
  }
  UI.infoHtml = ''; refreshInfo();
});
function selectOnScreen(pred) {
  const [ax, ay] = screenToTile(0, 0), [bx, by] = screenToTile(VW, VH);
  for (const u of W.units) if (u.fac === 0 && u.x >= ax && u.x <= bx && u.y >= ay && u.y <= by && pred(u)) UI.sel.add(u.id);
}
cvs.addEventListener('wheel', e => {
  e.preventDefault(); if (!UI.started) return;
  const [tx, ty] = screenToTile(e.clientX, e.clientY);
  cam.z = clamp(cam.z * (e.deltaY < 0 ? 1.12 : 1 / 1.12), 0.5, 2.2);
  cam.x = tx * TS - e.clientX / cam.z; cam.y = ty * TS - e.clientY / cam.z;
}, { passive: false });
addEventListener('keydown', e => {
  if (!UI.started) return;
  const k = e.key.toLowerCase();
  UI.keys[k] = true;
  if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' ', 'tab'].includes(k)) e.preventDefault();
  if (k === 'escape') { if (UI.placing) { UI.placing = null; UI.roadDrag = null; } else if (UI.sel.size) UI.sel.clear(); else togglePause(); return; }
  if (UI.paused) return;
  if (k === 'p') { togglePause(); return; }
  if (/^[1-9]$/.test(k)) {
    if (e.ctrlKey) { e.preventDefault(); UI.groups[k] = [...UI.sel]; flash(`Group ${k} saved.`); }
    else if (UI.groups[k]) { const now = performance.now(); UI.sel = new Set(UI.groups[k].filter(id => byId(id))); if (UI.lastGroup === k && now - UI.lastGroupAt < 350) centerOnSel(); UI.lastGroup = k; UI.lastGroupAt = now; }
    UI.infoHtml = ''; return;
  }
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  const bt = Object.keys(BDEF).find(t => BDEF[t].key === k);
  if (bt) { startPlacing(bt); return; }
  if (k === 'c') { const h = W.blds.find(b => b.fac === 0 && b.type === 'hall'); if (h) centerOn(h.x + h.w / 2, h.y + h.h / 2); }
  if (k === ' ') { UI.sel = new Set(W.units.filter(u => u.fac === 0 && isSoldier(u) && !u.aboard).map(u => u.id)); UI.infoHtml = ''; }
  if (k === 'tab') { UI.tab = ((UI.tab || 0) + (e.shiftKey ? BUILD_TABS.length - 1 : 1)) % BUILD_TABS.length; buildMenu(); }
  if (k === 'delete' || k === 'backspace') demolish([...UI.sel].map(byId).find(x => x && x.kind === 'bld'));
});
addEventListener('keyup', e => { UI.keys[e.key.toLowerCase()] = false; });
addEventListener('blur', () => { UI.keys = {}; UI.box = null; UI.drag = null; });
function centerOn(tx, ty) { cam.x = tx * TS - VW / cam.z / 2; cam.y = ty * TS - VH / cam.z / 2; }
function centerOnSel() { const s = [...UI.sel].map(byId).filter(Boolean); if (!s.length) return; centerOn(s.reduce((a, e) => a + entCenter(e)[0], 0) / s.length, s.reduce((a, e) => a + entCenter(e)[1], 0) / s.length); }
function panCamera(dt) {
  const k = UI.keys, sp = 700 * dt / cam.z;
  if (k.a || k.arrowleft) cam.x -= sp; if (k.d || k.arrowright) cam.x += sp;
  if (k.w || k.arrowup) cam.y -= sp; if (k.s || k.arrowdown) cam.y += sp;
  if (UI.mouse.in && document.hasFocus()) {
    const m = UI.mouse, e = 6;
    if (m.x < e) cam.x -= sp; if (m.x > VW - e) cam.x += sp; if (m.y < e) cam.y -= sp; if (m.y > VH - e) cam.y += sp;
  }
}

// ── minimap ────────────────────────────────────────────────────────────────
const mini = $('mini'), mg = mini.getContext('2d');
let miniBase = null;
function bakeMini() {
  miniBase = mk(MW, MH); const g = miniBase.getContext('2d'), img = g.createImageData(MW, MH);
  const col = ['#6a9440', '#3d6fa8', '#d1bc7d', '#8f7148', '#8aa860', '#6fa3c9'].map(hexRGB), grass = ['#6a9440', '#5a8a55', '#a2a052'].map(hexRGB);
  for (let i = 0; i < MW * MH; i++) { const t = map.ter[i]; let c = t === 0 ? grass[map.bio[i]] : col[t]; if (t === 4) c = grass[map.bio[i]].map(v => Math.min(255, v + 28)); img.data.set([c[0], c[1], c[2], 255], i * 4); }
  g.putImageData(img, 0, 0);
}
function drawMini() {
  const S = mini.width / MW;
  mg.imageSmoothingEnabled = false;
  mg.drawImage(miniBase, 0, 0, mini.width, mini.height);
  for (const n of nodes) if (n.amt > 0 && FOG.explored[ix(n.x, n.y)]) { mg.fillStyle = n.kind === 'tree' ? '#2d5a24' : n.kind === 'fish' ? '#a9d8f5' : n.kind === 'gold' ? '#f3cf6a' : '#b8b2a8'; mg.fillRect(n.x * S, n.y * S, S, S); }
  mg.fillStyle = '#b3a68e'; for (let i = 0; i < MW * MH; i++) if (map.road[i] && FOG.explored[i]) mg.fillRect((i % MW) * S, Math.floor(i / MW) * S, S, S);
  for (const p of W.pois || []) if (p.kind !== 'camp' && FOG.explored[ix(p.x, p.y)]) { mg.fillStyle = INK; mg.fillRect(p.x * S - 1, p.y * S - 1, p.w * S + 2, p.h * S + 2); mg.fillStyle = p.kind === 'ruins' ? (p.looted ? '#8c847a' : '#e8d9a8') : p.owner >= 0 ? FAC[p.owner].col : '#f6ead0'; mg.fillRect(p.x * S, p.y * S, p.w * S, p.h * S); }
  for (const p of W.posts) if (FOG.explored[ix(p.x + 1, p.y + 1)]) { mg.fillStyle = INK; mg.fillRect(p.x * S - 1, p.y * S - 1, p.w * S + 2, p.h * S + 2); mg.fillStyle = '#a77ad0'; mg.fillRect(p.x * S, p.y * S, p.w * S, p.h * S); }
  for (const b of W.blds) if (b.fac === 0 || b.seen) { mg.fillStyle = INK; mg.fillRect(b.x * S - 1, b.y * S - 1, b.w * S + 2, b.h * S + 2); mg.fillStyle = FAC[b.fac].col; mg.fillRect(b.x * S, b.y * S, b.w * S, b.h * S); }
  for (const d of W.deer) if (FOG.vis[ix(Math.floor(d.x), Math.floor(d.y))]) { mg.fillStyle = '#c9a27a'; mg.fillRect(d.x * mini.width / MW - 1, d.y * mini.width / MW - 1, 2, 2); }
  for (const u of W.units) if (FOG.seenUnit(u) && !u.inside) { mg.fillStyle = FAC[u.fac].lite; mg.fillRect(u.x * S - 1, u.y * S - 1, 2.5, 2.5); }
  mg.drawImage(FOG.cvs, 0, 0, mini.width, mini.height);
  for (const p of W.pings) { mg.strokeStyle = `rgba(255,80,60,${p.t / 3})`; mg.lineWidth = 2; mg.beginPath(); mg.arc(p.x * S, p.y * S, 4 + (3 - p.t) * 5, 0, 7); mg.stroke(); }
  mg.strokeStyle = '#fff'; mg.lineWidth = 1; mg.strokeRect(cam.x / TS * S + 0.5, cam.y / TS * S + 0.5, VW / cam.z / TS * S, VH / cam.z / TS * S);
}
function miniPos(e) { const r = mini.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * MW, (e.clientY - r.top) / r.height * MH]; }
mini.addEventListener('contextmenu', e => e.preventDefault());
mini.addEventListener('mousedown', e => {
  const [tx, ty] = miniPos(e);
  if (e.button === 0) { centerOn(tx, ty); UI.miniDrag = true; }
  if (e.button === 2) { const army = [...UI.sel].map(byId).filter(u => u && u.fac === 0 && isSoldier(u)); if (army.length) { orderGroup(army, e.shiftKey ? 'move' : 'amove', tx, ty, null, UI.formation); UI.marks.push({ x: tx, y: ty, t: 0.6 }); } }
});
addEventListener('mousemove', e => { if (UI.miniDrag) { const [tx, ty] = miniPos(e); centerOn(tx, ty); } });
addEventListener('mouseup', () => { UI.miniDrag = false; });
$('info').addEventListener('mousedown', e => { const ps = e.target.closest('[data-sel]'); if (ps) { UI.sel = new Set([+ps.dataset.sel]); UI.infoHtml = ''; return; } const el = e.target.closest('[data-act]'); if (el && e.button === 0) { e.preventDefault(); infoAction(el.dataset.act); } });

// ── menus ──────────────────────────────────────────────────────────────────
function showMenu(id) { for (const m of document.querySelectorAll('.menu')) m.hidden = m.id !== id; $('overlay').hidden = !id; }
function togglePause() { if (!UI.started || W.over) return; UI.paused = !UI.paused; showMenu(UI.paused ? 'pause' : null); }
const setup = { rivals: 3, diff: 1, map: 0, climate: 0, fac: 'random' };
const MAP_TYPES = ['continental', 'rivers', 'islands'], CLIMATES = ['mixed', 'temperate'];
function bindChoice(id, key) {
  for (const b of $(id).querySelectorAll('button')) b.onclick = () => { setup[key] = +b.dataset.v; for (const x of $(id).querySelectorAll('button')) x.classList.toggle('on', x === b); };
}
bindChoice('optRivals', 'rivals'); bindChoice('optDiff', 'diff'); bindChoice('optMap', 'map'); bindChoice('optClimate', 'climate');
$('btnStart').onclick = () => {
  $('btnStart').textContent = 'Founding the realm…';
  setTimeout(() => {
    startMatch(setup.rivals, setup.diff, (Math.random() * 2 ** 31) | 0, { map: MAP_TYPES[setup.map], climate: CLIMATES[setup.climate] });
    bakeTerrain(); bakeMini(); buildBuildingSprites(5); buildMenu();
    const h = W.blds.find(b => b.fac === 0 && b.type === 'hall'); cam.z = 1; centerOn(h.x + 2, h.y + 3);
    UI.sel.clear(); UI.started = true; UI.paused = false; UI.infoHtml = ''; showMenu(null);
    $('hud').hidden = false; $('btnStart').textContent = 'Found Your Town';
    W.alerts.push({ text: 'Your people await. Build a Farm and a Lumber Mill to get the town working.', t: 10, kind: 'info' });
    last = performance.now();
  }, 30);
};
$('btnHelp').onclick = () => showMenu('help');
$('btnHelpBack').onclick = () => showMenu(UI.started ? 'pause' : 'title');
$('btnResume').onclick = togglePause;
$('btnPauseHelp').onclick = () => showMenu('help');
$('btnQuit').onclick = () => { UI.started = false; UI.paused = false; $('hud').hidden = true; showMenu('title'); };
$('btnGoals').onclick = () => { UI.hideGoals = !UI.hideGoals; $('btnGoals').textContent = UI.hideGoals ? 'Show goals' : 'Hide goals'; };
$('btnEndTitle').onclick = () => { UI.started = false; $('hud').hidden = true; showMenu('title'); };
$('btnEndWatch').onclick = () => { showMenu(null); UI.watching = true; };
for (const b of document.querySelectorAll('#speed button')) b.onclick = () => { W.speed = +b.dataset.s; if (UI.paused) togglePause(); };
$('btnMenu').onclick = togglePause;
function showEnd() {
  const F = W.F[0], m = Math.floor(W.t / 60);
  $('endTitle').textContent = W.over === 'win' ? 'Victory' : 'Defeat';
  $('endSub').textContent = W.over === 'win' ? (W.overWhy === 'alliance' ? 'Every rival still standing is now your ally. The realm is at peace under your banner.' : 'Every rival Town Hall lies in ruins. The realm is yours.') : 'Your Town Hall has fallen. The banners of your rivals fly over the ashes.';
  $('endStats').innerHTML = `Time <b>${m} min</b> · Soldiers trained <b>${F.stats.trained}</b> · Enemies slain <b>${F.stats.kills}</b> · People lost <b>${F.stats.lost}</b> · Resources gathered <b>${F.stats.gathered}</b>`;
  showMenu('end');
}

// ── diplomacy panel ────────────────────────────────────────────────────────
function refreshDiplo() {
  const P0 = W.F[0];
  let h = `<h4>Diplomacy <button class="sm" data-dact="close">×</button></h4>`;
  W.offers.forEach((o, k) => { h += `<div class="offer"><b style="color:${FAC[o.from].dark}">${FAC[o.from].name}</b> offers ${o.kind === 'ally' ? 'an alliance' : 'peace'} <span class="dim">(${Math.max(0, Math.ceil(60 - (W.t - o.t)))}s)</span> <button data-dact="yes-${k}">Accept</button><button data-dact="no-${k}">Decline</button></div>`; });
  for (const F of W.F.slice(1).filter(o => !o.absent && !o.bandit)) {
    const P = PERSONAS[F.persona], rel = W.rel[0][F.i], a = Math.round(attOf(F, 0));
    h += `<div class="rv ${F.alive ? '' : 'gone'}"><div><span class="sw" style="background:${FAC[F.i].col}"></span><b>${FAC[F.i].name}</b> <span class="dim">${F.ruler} · ${P.name}</span></div>`;
    if (!F.alive) { h += `<div class="dim">Defeated</div></div>`; continue; }
    h += `<div class="row"><span class="st ${rel}">${REL_NAME[rel]}</span> · ${AGES[ageOf(F)].name} · Army ${armyOf(F.i)} · Goodwill <b style="color:${a >= 0 ? '#3d7a2a' : '#a3271e'}">${a > 0 ? '+' : ''}${a}</b></div>${bar((a + 100) / 200, a >= 50 ? '#6fd36a' : a >= 0 ? '#e8c547' : '#e2553f')}`;
    h += `<div class="dim">${P.tip}</div><div class="acts">`;
    if (rel === 'war') h += `<button data-dact="peace-${F.i}" title="Accepted at goodwill 10+ (Warlords want 30+), after 4:00">Offer peace</button>`;
    if (rel === 'peace') h += `<button data-dact="ally-${F.i}" title="Needs goodwill 50+">Propose alliance</button><button class="del" data-dact="war-${F.i}">Declare war</button>`;
    if (rel === 'ally') h += `<button data-dact="leave-${F.i}">End alliance</button><button class="del" data-dact="war-${F.i}" title="Betrayal angers everyone">Betray</button>`;
    h += `<button data-dact="gold-${F.i}" ${P0.res.gold < 100 ? 'class="na"' : ''}>Tribute 100 gold</button><button data-dact="food-${F.i}" ${P0.res.food < 200 ? 'class="na"' : ''}>Tribute 200 wheat</button></div></div>`;
  }
  h += `<div class="dim">Goodwill rises with tribute, time at peace and a shared enemy, and falls when you hurt them. Win by conquest, or when every rival left standing is your ally.</div>`;
  if (h !== UI.diploHtml) { $('diplo').innerHTML = h; UI.diploHtml = h; }
}
function toggleDiplo(show) { $('diplo').hidden = show === undefined ? !$('diplo').hidden : !show; UI.diploHtml = ''; if (!$('diplo').hidden) refreshDiplo(); }
$('btnDiplo').onclick = () => toggleDiplo();
$('rivals').addEventListener('mousedown', e => { if (e.target.closest('.dot')) toggleDiplo(true); });
$('diplo').addEventListener('mousedown', e => {
  const el = e.target.closest('[data-dact]'); if (!el || e.button !== 0) return; e.preventDefault();
  const [act, n] = el.dataset.dact.split('-');
  if (act === 'close') return toggleDiplo(false);
  if (act === 'yes' || act === 'no') answerOffer(+n, act === 'yes');
  else { const msg = playerDiplo(+n, act); if (msg) flash(msg); }
  UI.diploHtml = ''; refreshDiplo(); refreshBars();
});

// ── main loop ──────────────────────────────────────────────────────────────
let last = performance.now(), acc = 0, slowT = 0, fogT = 0;
function frame(now) {
  requestAnimationFrame(frame);
  const dt = Math.min(0.1, (now - last) / 1000); last = now;
  if (!UI.started) { drawTitle(now); return; }
  panCamera(dt);
  if (!UI.paused && (!W.over || UI.watching)) {
    acc += dt * W.speed; let n = 0;
    while (acc >= DT && n < 12) { tick(); acc -= DT; n++; }
    if (n === 12) acc = 0;
    if (W.over && !UI.endShown) { UI.endShown = true; setTimeout(showEnd, 1200); }
  }
  for (const m of UI.marks) m.t -= dt; UI.marks = UI.marks.filter(m => m.t > 0);
  if ((fogT -= dt) <= 0) { fogT = 0.2; FOG.update(); }
  updateGhost();
  render();
  if ((slowT -= dt) <= 0) { slowT = 0.2; refreshBars(); refreshInfo(); drawMini(); }
}
// title backdrop: drifting clouds over rolling fields
function drawTitle(now) {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  const g = ctx.createLinearGradient(0, 0, 0, VH); g.addColorStop(0, '#2b3a5c'); g.addColorStop(0.55, '#c98d5a'); g.addColorStop(0.56, '#4f6e32'); g.addColorStop(1, '#2d4220');
  ctx.fillStyle = g; ctx.fillRect(0, 0, VW, VH);
  ctx.fillStyle = 'rgba(255,240,220,0.18)';
  for (let i = 0; i < 7; i++) { const x = ((now / (60 + i * 10) + i * 300) % (VW + 400)) - 200, y = 60 + i * 38; ctx.beginPath(); ctx.ellipse(x, y, 120, 18, 0, 0, 7); ctx.fill(); }
  ctx.fillStyle = '#2a3a1c';
  for (let x = 0; x < VW; x += 6) { const h = Math.sin(x / 140) * 18 + Math.sin(x / 47) * 6; ctx.fillRect(x, VH * 0.56 - 10 - h, 6, 14 + h); }
  if (BSPR.house) for (let i = 0; i < 6; i++) { const s = BSPR[['house', 'granary', 'house', 'lumber', 'tower', 'house'][i]][i % 4]; ctx.drawImage(s, VW * (0.08 + i * 0.16), VH * 0.56 + 10 - s.height * 0.6, s.width * 0.6, s.height * 0.6); }
}

resize(); buildNodeSprites(); buildRoadTex(); buildBuildingSprites(4); makeResIcons();
showMenu('title'); requestAnimationFrame(frame);
window.__h = { W, UI, map, nodes, FOG, cam, tick, startMatch, centerOn, orderGroup, placeBuilding, canPlace };
