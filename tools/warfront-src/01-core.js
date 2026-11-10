// 01 core: constants, RNG, definitions, map generation, pathfinding.
const TS = 32, MW = 96, MH = 96, DT = 0.05;              // tile px, map tiles, sim step (s)
const RES = ['food', 'wood', 'stone', 'gold'];
const GOODS = ['firewood', 'planks', 'ore', 'iron', 'flour', 'bread', 'meat', 'ale'];
const ALLRES = RES.concat(GOODS);
const RES_NAME = { food: 'Wheat', wood: 'Wood', stone: 'Stone', gold: 'Gold', firewood: 'Firewood', planks: 'Planks', ore: 'Iron ore', iron: 'Iron', flour: 'Flour', bread: 'Bread', meat: 'Meat', ale: 'Ale' };
// calendar: a day is 75 s (the last 27% is night), two days per season, four seasons per year
const DAY_LEN = 75, NIGHT_AT = 0.73, SEASON_DAYS = 2, SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const FARM_SEASON = [0.7, 1.0, 1.35, 0];
function calendar(t) {
  const day = Math.floor(t / DAY_LEN), tod = (t % DAY_LEN) / DAY_LEN, si = Math.floor(day / SEASON_DAYS) % 4;
  return { day, tod, season: si, name: SEASONS[si], night: tod >= NIGHT_AT, year: Math.floor(day / (SEASON_DAYS * 4)) + 1, dayIn: day % SEASON_DAYS + 1,
    seasonFrac: ((t / DAY_LEN) % SEASON_DAYS) / SEASON_DAYS };
}
const FIRST = ['Ada', 'Bram', 'Cora', 'Dunstan', 'Edda', 'Finn', 'Greta', 'Hob', 'Ivo', 'Joan', 'Kit', 'Lora', 'Milo', 'Nell', 'Osric', 'Pip', 'Quinn', 'Rosa', 'Seth', 'Tilda', 'Ulf', 'Vera', 'Wat', 'Yara', 'Agnes', 'Bertil', 'Cuth', 'Elsa', 'Godric', 'Hild', 'Isolde', 'Jory', 'Maud', 'Odo', 'Rowan', 'Sybil', 'Tam', 'Wynn', 'Alys', 'Gil'];
const SUR = ['Miller', 'Thatcher', 'Cooper', 'Fletcher', 'Ashby', 'Brook', 'Carter', 'Dale', 'Fenwick', 'Hale', 'Marsh', 'Oakes', 'Penny', 'Reeve', 'Shaw', 'Tanner', 'Underwood', 'Wren', 'Holt', 'Barrow', 'Crane', 'Fallow', 'Hart', 'Lark'];
const SKILL_NAME = { wood: 'Woodcutting', stone: 'Quarrying', gold: 'Gold mining', farm: 'Farming', build: 'Building', mill: 'Milling', bakery: 'Baking', brewery: 'Brewing', woodyard: 'Firewood', hunt: 'Hunting', ore: 'Iron mining', sawmill: 'Sawing', smelter: 'Smelting', haul: 'Carting' };
const SKILL_LV = [0, 25, 70, 140, 240, 380];             // seconds of work per level
const FAC = [
  { name: 'Your Town', col: '#3f73d8', lite: '#86aaf5', dark: '#22407e' },
  { name: 'Redmoor', col: '#c2392f', lite: '#ef7d6c', dark: '#6e1d18' },
  { name: 'Greenhollow', col: '#3d9a3c', lite: '#82d16f', dark: '#1f5520' },
  { name: 'Goldmere', col: '#cf9a22', lite: '#f3cf6a', dark: '#7a5810' },
  { name: 'Bandits', col: '#4f4a44', lite: '#9a948c', dark: '#26221e' }
];
const BANDIT = 4;

function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
let rand = Math.random;
const rr = (a, b) => a + rand() * (b - a), ri = (a, b) => Math.floor(rr(a, b + 1));
const clamp = (v, a, b) => v < a ? a : v > b ? b : v, lerp = (a, b, t) => a + (b - a) * t;
const dist = (ax, ay, bx, by) => Math.hypot(ax - bx, ay - by);

// ── definitions ────────────────────────────────────────────────────────────
// costs in food/wood/stone/gold, build = seconds for one builder, store = storage capacity added
const BDEF = {
  hall:     { name: 'Town Hall', w: 4, h: 4, hp: 1600, shelter: 15, cost: {}, build: 120, pop: 5, store: { food: 300, wood: 300, stone: 300, gold: 300, firewood: 150, planks: 60, ore: 60, iron: 30, flour: 60, bread: 100, meat: 100, ale: 60 }, drop: ALLRES, sight: 9, attack: { dmg: 5, range: 7, cd: 1.6 }, noBuild: true,
    desc: 'The heart of your town. Stores a bit of everything, beds 5, and draws settlers when people are happy. Lose it and you lose.' },
  house:    { name: 'House', key: 'h', w: 2, h: 2, hp: 300, cost: { wood: 50 }, build: 14, pop: 5, sight: 4, desc: 'Home for a family of up to 5. Couples here have children when they\'re happy. Burns firewood in winter.' },
  lumber:   { name: 'Lumber Mill', key: 'l', w: 3, h: 3, hp: 450, cost: { wood: 60 }, build: 20, slots: 4, job: 'wood', drop: ['wood'], store: { wood: 300 }, sight: 5, desc: 'Woodcutters fell nearby trees. Stores wood. Build it beside a forest.' },
  mine:     { name: 'Mining Camp', key: 'm', w: 3, h: 3, hp: 450, cost: { wood: 80 }, build: 22, slots: 4, job: 'mine', drop: ['stone', 'gold', 'ore'], store: { stone: 250, gold: 250, ore: 200 }, sight: 5, desc: 'Miners quarry stone, gold or iron ore (toggle). Build it beside the right rock.' },
  farm:     { name: 'Farm', key: 'f', w: 4, h: 4, hp: 200, cost: { wood: 60 }, build: 14, slots: 2, job: 'farm', walk: true, sight: 4, desc: 'Two farmers grow wheat forever. Food goes to the nearest granary or hall.' },
  granary:  { name: 'Granary', key: 'g', w: 3, h: 3, hp: 450, cost: { wood: 100, stone: 20 }, build: 24, drop: ['food', 'flour', 'bread', 'meat', 'ale'], store: { food: 400, flour: 200, bread: 200, meat: 200, ale: 150 }, sight: 4, desc: 'Food storage: wheat, flour, bread, meat and ale. Stockpile here before winter.' },
  storehouse: { name: 'Storehouse', key: 'o', w: 3, h: 2, hp: 400, cost: { wood: 120 }, build: 22, drop: ['wood', 'stone', 'gold', 'firewood', 'planks', 'ore', 'iron'], store: { wood: 200, stone: 200, gold: 200, firewood: 300, planks: 200, ore: 200, iron: 100 }, sight: 4, desc: 'Holds wood, stone, gold, firewood, planks, ore and iron.' },
  woodyard: { name: 'Firewood Yard', key: 'z', w: 3, h: 2, hp: 350, cost: { wood: 50 }, build: 14, slots: 2, job: 'craft', recipe: { ins: [['wood', 1]], out: 'firewood', n: 2, time: 1.3 }, sight: 4, desc: 'Splits wood into firewood (1 → 2). Every home burns firewood all winter.' },
  hunter:   { name: "Hunter's Lodge", key: 'u', w: 2, h: 2, hp: 300, cost: { wood: 60 }, build: 14, slots: 3, job: 'hunt', drop: ['meat'], sight: 6, desc: 'Hunters track deer herds and bring back meat. Works in winter too.' },
  mill:     { name: 'Windmill', key: 'i', w: 3, h: 3, hp: 400, cost: { wood: 100, stone: 30 }, build: 24, slots: 2, job: 'craft', recipe: { ins: [['food', 1]], out: 'flour', n: 1, time: 1.1 }, sight: 6, desc: 'Grinds wheat into flour. Always leaves a meal of wheat per person in storage.' },
  bakery:   { name: 'Bakery', key: 'e', w: 3, h: 2, hp: 400, cost: { wood: 80, stone: 40 }, build: 22, slots: 2, job: 'craft', recipe: { ins: [['flour', 1]], out: 'bread', n: 2, time: 1.6 }, sight: 4, desc: 'Bakes each sack of flour into 2 loaves. Bread in the diet makes people happier.' },
  brewery:  { name: 'Brewery', key: 'r', w: 3, h: 3, hp: 450, cost: { wood: 80, planks: 10, gold: 30 }, build: 26, slots: 2, job: 'craft', recipe: { ins: [['food', 2]], out: 'ale', n: 1, time: 1.8 }, sight: 4, desc: 'Brews ale from wheat (2 → 1). A mug with dinner lifts spirits.' },
  sawmill:  { name: 'Sawmill', key: 'v', w: 3, h: 2, hp: 400, cost: { wood: 80, stone: 20 }, build: 20, slots: 2, job: 'craft', recipe: { ins: [['wood', 1]], out: 'planks', n: 1, time: 1.0 }, sight: 4, desc: 'Saws logs into planks. Planks build barracks, markets and wagons, and arm spearmen and archers.' },
  smelter:  { name: 'Smelter', key: 'x', w: 3, h: 3, hp: 500, cost: { wood: 60, stone: 80 }, build: 26, slots: 2, job: 'craft', recipe: { ins: [['ore', 2], ['firewood', 1]], out: 'iron', n: 1, time: 2.0 }, sight: 4, desc: 'Smelts 2 iron ore with 1 firewood into an iron bar. Iron arms swordsmen and knights.' },
  cartshed: { name: 'Cart Shed', key: 'j', w: 3, h: 3, hp: 400, cost: { wood: 60, planks: 30 }, build: 24, slots: 2, job: 'haul', sight: 5, desc: 'Carters haul the output piles from farms and workshops to storage, 30 at a time. Fast on roads.' },
  market:   { name: 'Market', key: 'y', w: 4, h: 3, hp: 600, cost: { wood: 100, planks: 40, stone: 40 }, build: 34, trains: ['caravan'], sight: 6, desc: 'Buy and sell goods for gold, and send caravans to the Trading Posts at the edge of the map.' },
  palisade: { name: 'Palisade', key: '', w: 1, h: 1, hp: 260, cost: { wood: 3 }, build: 4, wall: true, line: true, sight: 2, desc: 'Drag to raise a wooden stockade (3 wood per tile). Blocks enemies; add Gates so your own people can pass.' },
  wall:     { name: 'Stone Wall', key: '', w: 1, h: 1, hp: 1000, cost: { stone: 6 }, build: 8, wall: true, line: true, sight: 3, desc: 'Drag to raise stone walls (6 stone per tile). Very tough; rams and catapults are the answer.' },
  gate:     { name: 'Gate', key: '', w: 1, h: 1, hp: 700, cost: { wood: 15, stone: 15 }, build: 10, wall: true, gate: true, sight: 3, desc: 'Opens for your people, stays shut to enemies. Click a wall tile to turn it into a gate.' },
  workshop: { name: 'Siege Workshop', key: '', w: 4, h: 3, hp: 700, cost: { wood: 80, planks: 60, iron: 10 }, build: 40, trains: ['ram', 'catapult', 'siegetower'], req: 'barracks', sight: 6, desc: 'Builds rams, catapults and siege towers, plus your faction\'s siege heroes.' },
  dock:     { name: 'Dock', key: '', w: 3, h: 2, hp: 500, cost: { wood: 100 }, build: 26, coastal: true, trains: ['fishboat', 'transport', 'warship'], drop: ['food'], store: { food: 150 }, sight: 6, desc: 'Build on the shore. Launches fishing boats, transports that ferry troops and settlers across water, and warships.' },
  camp:     { name: 'Bandit Camp', key: '', w: 3, h: 3, hp: 650, cost: {}, build: 1, noBuild: true, sight: 7, desc: 'Outlaws raid nearby farms and caravans from here. Burn it down for their hoard of gold.' },
  road:     { name: 'Road', key: 'q', w: 1, h: 1, hp: 1, cost: { stone: 1 }, build: 0, road: true, desc: 'Drag to lay cobblestones (1 stone per tile). Everyone moves 50% faster on roads. Shift-drag removes road.' },
  barracks: { name: 'Barracks', key: 'b', w: 4, h: 3, hp: 800, cost: { wood: 100, planks: 20, stone: 50 }, build: 40, trains: 'hv', sight: 6, desc: 'Trains your faction\'s infantry, ranged troops, casters and squads.' },
  stable:   { name: 'Stable', key: 'k', w: 4, h: 3, hp: 650, cost: { wood: 100, planks: 30, gold: 60 }, build: 40, trains: 'hv', req: 'barracks', sight: 6, desc: 'Trains your faction\'s cavalry and charging heroes.' },
  smith:    { name: 'Blacksmith', key: 'n', w: 3, h: 3, hp: 550, cost: { wood: 80, planks: 20, stone: 60 }, build: 34, req: 'barracks', sight: 5, desc: 'Researches weapon and armor upgrades for your soldiers.' },
  tower:    { name: 'Watchtower', key: 't', w: 2, h: 2, hp: 650, shelter: 5, cost: { planks: 15, stone: 120 }, build: 34, attack: { dmg: 7, range: 7.5, cd: 1.3 }, sight: 9, desc: 'Shoots arrows at enemies in range.' }
};
const BUILD_TABS = [
  { name: 'Town', items: ['house', 'road', 'granary', 'storehouse', 'cartshed', 'market'] },
  { name: 'Gather', items: ['farm', 'lumber', 'mine', 'hunter', 'dock'] },
  { name: 'Craft', items: ['woodyard', 'sawmill', 'smelter', 'mill', 'bakery', 'brewery'] },
  { name: 'Military', items: ['barracks', 'stable', 'smith', 'workshop', 'shrine', 'palisade', 'wall', 'gate', 'tower'] }
];
const BUILD_ORDER_UI = BUILD_TABS.flatMap(t => t.items);
const UDEF = {
  villager: { name: 'Villager', hp: 30, atk: 3, arm: 0, range: 1, cd: 1.3, speed: 1.75, sight: 5 },
  caravan: { name: 'Caravan', hp: 140, atk: 0, arm: 1, range: 0, cd: 9, speed: 1.6, sight: 4, cost: { food: 40, planks: 20 }, time: 15, desc: 'Loops between your Market and the nearest Trading Post, earning gold each trip and selling your surplus.' },
  sword:  { name: 'Swordsman', mil: true, hp: 95, atk: 9, arm: 2, range: 1, cd: 1.0, speed: 1.5, sight: 6, cost: { food: 50, gold: 15, iron: 2 }, time: 14, desc: 'Sturdy all-round infantry.' },
  spear:  { name: 'Spearman', mil: true, hp: 75, atk: 6, arm: 1, range: 1.2, cd: 1.1, speed: 1.6, sight: 6, bonus: { knight: 14, hero: 10 }, cost: { food: 40, planks: 2 }, time: 11, desc: 'Cheap. Deals +14 damage to knights.' },
  archer: { name: 'Archer', mil: true, hp: 50, atk: 6, arm: 0, range: 6, cd: 1.6, speed: 1.6, sight: 7, ranged: true, cost: { wood: 25, planks: 3, gold: 25 }, time: 13, desc: 'Ranged. Weak against buildings.' },
  ram:     { name: 'Battering Ram', mil: true, siege: true, bldOnly: true, hp: 380, atk: 55, arm: 1, parm: 8, range: 1.1, cd: 2.2, speed: 1.0, sight: 5, cost: { planks: 60, iron: 5 }, time: 24, desc: 'Smashes walls, gates and buildings. Arrows barely scratch it; swords make short work of it.' },
  catapult: { name: 'Catapult', mil: true, siege: true, ranged: true, hp: 120, atk: 42, arm: 0, parm: 4, range: 9, minRange: 2.5, cd: 4.5, speed: 0.9, sight: 9, cost: { planks: 50, iron: 10, gold: 40 }, time: 30, desc: 'Hurls boulders that crush buildings and splash nearby troops. Helpless up close.' },
  siegetower: { name: 'Siege Tower', mil: true, siege: true, noAttack: true, hp: 450, atk: 0, arm: 2, parm: 6, range: 0, cd: 9, speed: 0.9, sight: 6, cost: { planks: 80 }, time: 26, desc: 'Roll it against an enemy wall: while it stands, your troops climb over that section.' },
  hero:    { name: 'Lord', mil: true, mounted: true, hero: true, hp: 320, atk: 15, arm: 4, range: 1.1, cd: 1.0, speed: 2.3, sight: 8, cost: { food: 150, gold: 100 }, time: 30, desc: 'Your commander. Boosts nearby troops and steadies their morale. Levels up in battle.' },
  fishboat:  { name: 'Fishing Boat', naval: true, noAttack: true, hp: 80, atk: 0, arm: 1, range: 0, cd: 9, speed: 2.1, sight: 6, cost: { wood: 60 }, time: 15, desc: 'Nets fish from shoals near the shore and brings it back to the Dock as food. Works in winter.' },
  transport: { name: 'Transport', naval: true, noAttack: true, cap: 10, hp: 240, atk: 0, arm: 2, range: 0, cd: 9, speed: 2.4, sight: 6, cost: { wood: 100, planks: 20 }, time: 20, desc: 'Carries up to 10 soldiers or villagers. Select units and right-click the boat to board; select the boat and right-click a shore to sail there and unload.' },
  warship:   { name: 'Warship', mil: true, naval: true, ranged: true, hp: 220, atk: 10, arm: 2, parm: 3, range: 6.5, cd: 1.7, speed: 2.2, sight: 8, cost: { wood: 120, planks: 30, gold: 40 }, time: 26, desc: 'A galley full of archers. Sinks boats and harries the shore.' },
  bandit:    { name: 'Bandit', mil: true, hp: 70, atk: 8, arm: 1, range: 1, cd: 1.1, speed: 1.75, sight: 7, desc: 'Outlaw. Raids anyone.' },
  knight: { name: 'Knight', mil: true, mounted: true, hp: 165, atk: 12, arm: 3, range: 1.1, cd: 1.1, speed: 2.6, sight: 7, cost: { food: 70, gold: 50, iron: 3 }, time: 20, desc: 'Fast heavy cavalry.' }
};
const UPGRADES = {
  forging:   { name: 'Forging', desc: '+2 attack for all melee soldiers', cost: { food: 80, iron: 15 }, time: 30 },
  fletching: { name: 'Fletching', desc: '+2 attack and +1 range for ranged soldiers (and towers)', cost: { planks: 40, gold: 50 }, time: 30 },
  mail:      { name: 'Chain Mail', desc: '+2 armor for all soldiers', cost: { food: 100, iron: 25 }, time: 35 },
  axes:      { name: 'Double-Bit Axe', desc: 'Woodcutters chop 30% faster', cost: { food: 80, iron: 5 }, time: 25, at: 'lumber' },
  wheels:    { name: 'Iron-Rimmed Wheels', desc: 'Carts and caravans move 25% faster', cost: { planks: 30, iron: 10 }, time: 25, at: 'cartshed' },
  ploughs:   { name: 'Heavy Plough', desc: 'Farmers harvest 30% faster', cost: { wood: 120 }, time: 25, at: 'granary' }
};

// ── map ────────────────────────────────────────────────────────────────────
const map = {
  seed: 0,
  ter: new Uint8Array(MW * MH),        // 0 grass, 1 water, 2 sand, 3 dirt, 4 hill, 5 ford (shallow, walkable)
  bio: new Uint8Array(MW * MH),        // 0 temperate, 1 northern highlands, 2 southern dry plains
  comp: new Int16Array(MW * MH),       // landmass id (-1 water)
  type: 'continental',
  node: new Int32Array(MW * MH).fill(-1),   // resource node index or -1
  bld: new Int32Array(MW * MH).fill(-1),    // building id occupying (blocking) tile
  road: new Uint8Array(MW * MH),            // 1 = cobblestone road
  breach: new Uint8Array(MW * MH),          // fac+1 whose siege tower has breached this wall tile
  starts: []
};
const nodes = [];                       // {kind: 'tree'|'stone'|'gold', x, y, amt, v}
const ix = (x, y) => y * MW + x;
const inMap = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH;
let PF_FAC = -1;                                         // faction currently pathing (gates/breaches open for it)
let NAV = 0;                                             // 1 while a boat is pathing: water is the walkable surface
const walkable = (x, y) => {
  if (!inMap(x, y)) return false;
  const k = ix(x, y);
  if (NAV) return (map.ter[k] === 1 || map.ter[k] === 5) && map.bld[k] < 0;
  if (map.ter[k] === 1 || map.node[k] >= 0) return false;
  const b = map.bld[k]; if (b < 0) return true;
  if (PF_FAC < 0 || b >= 1e9) return false;
  if (map.breach[k] === PF_FAC + 1) return true;
  const o = W.byId.get(b); return !!(o && o.type === 'gate' && o.done && o.fac === PF_FAC);
};

function valueNoise(seed, scale) {
  const R = mulberry32(seed), g = [], G = Math.ceil(MW / scale) + 2;
  for (let i = 0; i < G * G; i++) g.push(R());
  const s = t => t * t * (3 - 2 * t);
  return (x, y) => {
    const fx = x / scale, fy = y / scale, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = s(fx - x0), ty = s(fy - y0);
    const v = (a, b) => g[(b % G) * G + (a % G)];
    return lerp(lerp(v(x0, y0), v(x0 + 1, y0), tx), lerp(v(x0, y0 + 1), v(x0 + 1, y0 + 1), tx), ty);
  };
}
function addNode(kind, x, y, amt) {
  if (!inMap(x, y) || map.node[ix(x, y)] >= 0) return false;
  const t = map.ter[ix(x, y)];
  if (kind === 'fish' ? t !== 1 : (t === 1 || t === 5)) return false;
  map.node[ix(x, y)] = nodes.length;
  const bio = map.bio[ix(x, y)];
  const v = kind === 'tree' ? (bio === 1 ? (rand() < 0.75 ? 3 : ri(0, 2)) : bio === 2 ? (rand() < 0.6 ? 2 : ri(0, 1)) : ri(0, 3)) : ri(0, 3);
  nodes.push({ kind, x, y, amt, v });
  return true;
}
const compAt = (x, y) => map.comp[ix(clamp(Math.floor(x), 0, MW - 1), clamp(Math.floor(y), 0, MH - 1))];
function computeComps() {
  map.comp.fill(-1); let id = 0;
  for (let s = 0; s < MW * MH; s++) {
    if (map.comp[s] >= 0 || map.ter[s] === 1) continue;
    const q = [s]; map.comp[s] = id;
    for (let h = 0; h < q.length; h++) { const x = q[h] % MW, y = (q[h] / MW) | 0; for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const nx = x + dx, ny = y + dy; if (!inMap(nx, ny)) continue; const k = ix(nx, ny); if (map.comp[k] < 0 && map.ter[k] !== 1) { map.comp[k] = id; q.push(k); } } }
    id++;
  }
}
function generateMap(seed, nFac, mtype = 'continental', climate = 'mixed') {
  map.seed = seed; rand = mulberry32(seed); map.type = mtype;
  map.ter.fill(0); map.bio.fill(0); map.node.fill(-1); map.bld.fill(-1); map.road.fill(0); map.breach.fill(0); nodes.length = 0;
  const water = valueNoise(seed + 1, 14), forest = valueNoise(seed + 2, 9), forest2 = valueNoise(seed + 3, 4), dirt = valueNoise(seed + 4, 6);
  const hillN = valueNoise(seed + 5, 7), bioN = valueNoise(seed + 6, 16), coast = valueNoise(seed + 7, 5);
  const m = 15;
  const corners = [[m, MH - m], [MW - m, m], [m, m], [MW - m, MH - m]];
  map.starts = corners.slice(0, nFac).map(([x, y]) => ({ x: x - 2, y: y - 2 }));   // hall top-left
  const nearStart = (x, y, r) => map.starts.some(s => dist(x, y, s.x + 2, s.y + 2) < r);
  // islands: every corner town gets its own isle, plus a rich central isle and four little ones
  const isles = [...corners.map(([x, y]) => [x, y, 18]), [MW / 2, MH / 2, 12], [MW / 2, 14, 7], [MW / 2, MH - 14, 7], [14, MH / 2, 7], [MW - 14, MH / 2, 7]];
  for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) {
    const k = ix(x, y);
    // biome by latitude, wobbled by noise
    const lat = y / MH + (bioN(x, y) - 0.5) * 0.28;
    map.bio[k] = climate === 'temperate' ? 0 : lat < 0.3 ? 1 : lat > 0.7 ? 2 : 0;
    if (mtype === 'islands') {
      let best = 9; for (const [cx, cy, r] of isles) best = Math.min(best, dist(x, y, cx, cy) / r);
      const v = best + (coast(x, y) - 0.5) * 0.45;
      if (v > 1 || x < 2 || y < 2 || x > MW - 3 || y > MH - 3) { map.ter[k] = 1; continue; }
      if (v > 0.86) { map.ter[k] = 2; continue; }
    } else {
      const w = water(x, y);
      if (w > 0.72 && !nearStart(x, y, 13)) { map.ter[k] = 1; continue; }
      if (w > 0.67 && !nearStart(x, y, 11)) { map.ter[k] = 2; continue; }
    }
    if (hillN(x, y) > (map.bio[k] === 1 ? 0.66 : 0.74) && !nearStart(x, y, 10)) map.ter[k] = 4;
    else if (dirt(x, y) > 0.78) map.ter[k] = 3;
  }
  if (mtype === 'rivers') {
    // two meandering rivers split the map into four quarters; fords every so often
    const carve = (x, y, ford) => { for (let dy = 0; dy < 2; dy++) for (let dx = 0; dx < 2; dx++) if (inMap(x + dx, y + dy)) map.ter[ix(x + dx, y + dy)] = ford ? 5 : 1; };
    const ph = seed % 100;
    for (let x = 0; x < MW; x++) { const y = Math.round(MH / 2 + Math.sin(x * 0.11 + ph) * 5 + (water(x, 3) - 0.5) * 6); carve(x, y, x % 17 === 8); }
    for (let y = 0; y < MH; y++) { const x = Math.round(MW / 2 + Math.sin(y * 0.1 + ph * 0.7) * 5 + (water(3, y) - 0.5) * 6); carve(x, y, y % 17 === 4); }
    for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) if (map.ter[ix(x, y)] === 0 && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => map.ter[ix(x + dx, y + dy)] === 1) && rand() < 0.5) map.ter[ix(x, y)] = 2;
  }
  // forests: noise blobs, kept off the town centres (the dry south is sparser)
  for (let y = 1; y < MH - 1; y++) for (let x = 1; x < MW - 1; x++) {
    const t = map.ter[ix(x, y)]; if (t !== 0 && t !== 4) continue;
    const f = forest(x, y) * 0.75 + forest2(x, y) * 0.25, dry = map.bio[ix(x, y)] === 2;
    if (f > (dry ? 0.63 : 0.6) && !nearStart(x, y, 8) && rand() < 0.85) addNode('tree', x, y, 100);
    else if (rand() < (dry ? 0.005 : 0.012) && !nearStart(x, y, 6)) addNode('tree', x, y, 100);
  }
  const blob = (kind, cx, cy, n, amt) => {
    let placed = 0;
    for (let k = 0; k < n * 6 && placed < n; k++) { const x = cx + ri(-2, 2), y = cy + ri(-2, 2); if (map.node[ix(x, y)] < 0 && map.ter[ix(x, y)] !== 1 && addNode(kind, x, y, amt)) placed++; }
  };
  // every town gets a fair kit: a forest edge, a stone outcrop and a gold vein at fixed-ish offsets
  for (const s of map.starts) {
    const cx = s.x + 2, cy = s.y + 2, dx = cx < MW / 2 ? 1 : -1, dy = cy < MH / 2 ? 1 : -1;
    for (let y = cy - 3; y <= cy + 3 + 2; y++) for (let x = cx - 4; x <= cx + 4; x++) {    // clear the centre
      if (!inMap(x, y)) continue; const n = map.node[ix(x, y)]; if (n >= 0) { nodes[n].amt = 0; map.node[ix(x, y)] = -1; } map.ter[ix(x, y)] = [1, 4, 5].includes(map.ter[ix(x, y)]) ? 0 : map.ter[ix(x, y)];
    }
    const dry = map.bio[ix(cx, cy)] === 2 ? 1.5 : 1;
    for (let k = 0; k < 26 * dry; k++) addNode('tree', cx + dx * ri(7, 11) + ri(-3, 3), cy - dy * ri(3, 8), 100);
    for (let k = 0; k < 18 * dry; k++) addNode('tree', cx - dx * ri(4, 9), cy + dy * ri(7, 10) + ri(-1, 1), 100);
    blob('stone', cx + dx * 8, cy + dy * 6, 7, 250);
    blob('gold', cx - dx * 7, cy - dy * 7, 5, 300);
    blob('iron', cx + dx * 2, cy - dy * 10, 6, 260);
  }
  // contested riches in the middle
  blob('gold', MW / 2 - 3, MH / 2, 7, 400); blob('gold', MW / 2 + 3, MH / 2 + 1, 6, 400);
  if (mtype === 'islands') { blob('iron', MW / 2, MH / 2 - 5, 6, 300); blob('stone', MW / 2, MH / 2 + 5, 6, 300); }
  else { blob('stone', MW / 2, MH / 2 - 9, 7, 300); blob('stone', MW / 2, MH / 2 + 10, 7, 300); }
  for (let k = 0; k < 12; k++) { const x = ri(14, MW - 14), y = ri(14, MH - 14), b = map.bio[ix(x, y)]; blob(b === 1 ? ['stone', 'iron', 'iron'][ri(0, 2)] : b === 2 ? ['gold', 'gold', 'stone'][ri(0, 2)] : ['stone', 'gold', 'iron'][ri(0, 2)], x, y, 4, 250); }
  // fish shoals in water near any shore
  for (let y = 2; y < MH - 2; y++) for (let x = 2; x < MW - 2; x++) {
    if (map.ter[ix(x, y)] !== 1 || rand() > 0.05) continue;
    let shore = false; for (let dy = -3; dy <= 3 && !shore; dy++) for (let dx = -3; dx <= 3; dx++) if (inMap(x + dx, y + dy) && map.ter[ix(x + dx, y + dy)] !== 1) { shore = true; break; }
    if (shore) addNode('fish', x, y, 150);
  }
  computeComps();
  rand = Math.random;
}

// ── A* on the tile grid (8-way, no corner cutting) ─────────────────────────
const AS = { g: new Float32Array(MW * MH), f: new Float32Array(MW * MH), from: new Int32Array(MW * MH), stamp: new Uint32Array(MW * MH), closed: new Uint32Array(MW * MH), cur: 1 };
let pathBudget = 0;                                        // limits expensive searches per tick
// goal(x, y) → true when reached; hx/hy = heuristic target. Returns array of [x, y] tile steps or null.
function findPath(sx, sy, goal, hx, hy, maxExp = 5000) {
  sx = clamp(Math.floor(sx), 0, MW - 1); sy = clamp(Math.floor(sy), 0, MH - 1);
  if (goal(sx, sy)) return [];
  const S = AS; S.cur++; const cur = S.cur;
  const heap = [];
  const push = i => { heap.push(i); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (S.f[heap[p]] <= S.f[i]) break; heap[k] = heap[p]; k = p; } heap[k] = i; };
  const pop = () => { const top = heap[0], last = heap.pop(); if (heap.length) { let k = 0; for (;;) { let c = 2 * k + 1; if (c >= heap.length) break; if (c + 1 < heap.length && S.f[heap[c + 1]] < S.f[heap[c]]) c++; if (S.f[heap[c]] >= S.f[last]) break; heap[k] = heap[c]; k = c; } heap[k] = last; } return top; };
  const h = (x, y) => { const dx = Math.abs(x - hx), dy = Math.abs(y - hy); return (Math.max(dx, dy) + 0.414 * Math.min(dx, dy)) * 0.8; };
  const s0 = ix(sx, sy);
  S.stamp[s0] = cur; S.g[s0] = 0; S.f[s0] = h(sx, sy); S.from[s0] = -1; push(s0);
  let exp = 0, best = s0, bestH = h(sx, sy);
  while (heap.length) {
    const i = pop(); if (S.closed[i] === cur) continue; S.closed[i] = cur;
    const x = i % MW, y = (i / MW) | 0;
    if (goal(x, y)) return build(i);
    const hh = S.f[i] - S.g[i]; if (hh < bestH) { bestH = hh; best = i; }
    if (++exp > maxExp) break;
    for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
      if (!dx && !dy) continue;
      const nx = x + dx, ny = y + dy;
      if (!walkable(nx, ny) && !goal(nx, ny)) continue;
      if (dx && dy && (!walkable(x + dx, y) || !walkable(x, y + dy))) continue;
      const j = ix(nx, ny), tj = map.ter[j], g = S.g[i] + (dx && dy ? 1.414 : 1) * (map.road[j] ? 0.62 : NAV ? 1 : tj === 4 ? 1.4 : tj === 5 ? 1.5 : 1);
      if (S.stamp[j] === cur && g >= S.g[j]) continue;
      S.stamp[j] = cur; S.g[j] = g; S.f[j] = g + h(nx, ny); S.from[j] = i; push(j);
    }
  }
  return exp > 0 ? Object.assign(build(best), { partial: true }) : null;
  function build(i) { const out = []; while (i >= 0 && i !== s0) { out.push([i % MW, (i / MW) | 0]); i = S.from[i]; } return out.reverse(); }
}
// goal helpers
const nearRect = (x0, y0, w, h, pad = 1) => (x, y) => x >= x0 - pad && x < x0 + w + pad && y >= y0 - pad && y < y0 + h + pad && walkable(x, y);
const nearTile = (tx, ty) => (x, y) => Math.abs(x - tx) <= 1 && Math.abs(y - ty) <= 1 && !(x === tx && y === ty) && walkable(x, y);
const atTile = (tx, ty) => (x, y) => x === tx && y === ty;
