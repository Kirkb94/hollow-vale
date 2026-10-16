'use strict';
/* Hollow Vale - game server.  No dependencies: just Node.js 18+.
   Serves the game and relays moves between players over server-sent events.
   Works on a home network (LAN) and on a cloud host such as Render.
   Every game lives in its own room with a 4-letter code. */
const http = require('http'), fs = require('fs'), path = require('path'), os = require('os');
const PORT = +process.env.PORT || 3000;
const PUB = path.join(__dirname, 'public');
const ALL_SIDES = ['p', 'e', 'g', 'k'];
const MAX_ROOMS = 300, MAX_CLIENTS = 12, ROOM_IDLE_MS = 2 * 60 * 60 * 1000;
const MIME = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.ico': 'image/x-icon', '.json': 'application/json', '.webmanifest': 'application/manifest+json', '.mp3': 'audio/mpeg', '.m4a': 'audio/mp4', '.ogg': 'audio/ogg' };
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ';

const rooms = new Map(); // code -> room
const cleanName = n => String(n || '').replace(/[<>&"'`\\]/g, '').replace(/\s+/g, ' ').trim().slice(0, 16);
const cleanCode = c => String(c || '').toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4);
const blankSeats = () => ({ p: { kind: 'open' }, e: { kind: 'open' }, g: { kind: 'open' }, k: { kind: 'open' } });
const sidesOf = r => ALL_SIDES.slice(0, r.n || 3);

function makeRoom() {
  if (rooms.size >= MAX_ROOMS) return null;
  let code; do { code = Array.from({ length: 4 }, () => CODE_CHARS[Math.random() * CODE_CHARS.length | 0]).join(''); } while (rooms.has(code));
  const r = { code, n: 3, phase: 'lobby', seats: blankSeats(), game: null, clients: new Map(), order: 0, touched: Date.now() };
  rooms.set(code, r); return r;
}
const hostCid = r => { let best = null; for (const [cid, c] of r.clients) if (c.connected && (!best || c.order < r.clients.get(best).order)) best = cid; return best; };
const lobbyView = r => ({
  code: r.code, n: r.n, rnd: !!r.rnd, opts: r.opts || {}, phase: r.phase, host: hostCid(r),
  seats: Object.fromEntries(ALL_SIDES.map(s => {
    const x = r.seats[s], c = x.cid && r.clients.get(x.cid);
    return [s, { kind: x.kind, cid: x.cid || null, name: x.name || '', ready: !!x.ready, ban: x.ban || null, connected: x.kind === 'human' ? !!(c && c.connected) : true }];
  }))
});
function send(c, obj) { try { c.res.write('data: ' + JSON.stringify(obj) + '\n\n'); } catch (e) { /* closed */ } }
function broadcast(r, obj, except) { for (const [cid, c] of r.clients) if (c.connected && cid !== except) send(c, obj); }
const pushLobby = r => broadcast(r, { type: 'lobby', lobby: lobbyView(r) });
const seatOf = (r, cid) => sidesOf(r).find(s => r.seats[s].kind === 'human' && r.seats[s].cid === cid) || null;
const humans = r => sidesOf(r).filter(s => r.seats[s].kind === 'human');
const cfgSeat = r => Object.fromEntries(sidesOf(r).map(s => [s, r.seats[s].kind === 'human' ? 'h' : 'a']));
const cleanPicks = a => (Array.isArray(a) ? a : []).map(x => String(x).replace(/[^a-z]/g, '').slice(0, 20)).filter(Boolean).slice(0, 10);

function handle(r, cid, m) {
  const c = r.clients.get(cid); if (!c || !m || typeof m.type !== 'string') return;
  if (typeof m.seq === 'number') { if (m.seq <= (c.lastSeq || 0)) return; c.lastSeq = m.seq; }
  r.touched = Date.now();
  const isHost = cid === hostCid(r), mine = seatOf(r, cid);
  switch (m.type) {
    case 'ping': break;
    case 'opts': {
      if (!isHost || r.phase !== 'lobby' || !m.opts || typeof m.opts !== 'object') break;
      const o = {}; Object.keys(m.opts).slice(0, 30).forEach(k => { if (/^[a-z]{1,16}$/.test(k)) o[k] = !!m.opts[k]; });
      r.opts = o; pushLobby(r); break;
    }
    case 'random': {
      if (!isHost || r.phase !== 'lobby') break;
      r.rnd = !!m.on; pushLobby(r); break;
    }
    case 'startRandom': {
      if (!isHost || r.phase !== 'lobby' || !r.rnd || !humans(r).length || !m.picks) break;
      const picks = {}, names = {};
      sidesOf(r).forEach(s => { if (r.seats[s].kind === 'open') r.seats[s] = { kind: 'ai' }; const x = r.seats[s]; picks[s] = cleanPicks(m.picks[s]); names[s] = x.kind === 'human' && x.name ? x.name : null; });
      r.game = { cfg: { n: r.n, picks, seat: cfgSeat(r), names, opts: r.opts || {}, seed: Math.random() * 2147483647 | 0, gid: Math.random().toString(36).slice(2, 10) }, log: [] };
      r.phase = 'play';
      broadcast(r, { type: 'start', cfg: r.game.cfg }); pushLobby(r); break;
    }
    case 'mode': {
      const n = +m.n; if (!isHost || r.phase !== 'lobby' || ![2, 3, 4].includes(n)) break;
      r.n = n; ALL_SIDES.slice(n).forEach(s => { r.seats[s] = { kind: 'open' }; });
      pushLobby(r); break;
    }
    case 'name': {
      c.name = cleanName(m.name);
      if (mine) r.seats[mine].name = c.name;
      pushLobby(r); break;
    }
    case 'claim': {
      if (!sidesOf(r).includes(m.seat)) break;
      const t = r.seats[m.seat];
      if (r.phase !== 'lobby' || t.kind === 'human') break;
      if (mine) r.seats[mine] = { kind: 'open' };
      r.seats[m.seat] = { kind: 'human', cid, name: c.name || '', ready: false };
      pushLobby(r); break;
    }
    case 'leave': {
      if (mine && r.phase === 'lobby') { r.seats[mine] = { kind: 'open' }; pushLobby(r); }
      break;
    }
    case 'setai': {
      if (!isHost || !sidesOf(r).includes(m.seat)) break;
      const t = r.seats[m.seat];
      if (m.on) {
        if (t.kind === 'human') { const hc = r.clients.get(t.cid); if (hc && hc.connected) break; } // only replace a disconnected human
        r.seats[m.seat] = { kind: 'ai' };
        if (r.game) r.game.cfg.seat[m.seat] = 'a';
      } else if (t.kind === 'ai' && r.phase === 'lobby') r.seats[m.seat] = { kind: 'open' };
      pushLobby(r); break;
    }
    case 'draft': {
      if (!isHost || r.phase !== 'lobby' || !humans(r).length) break;
      sidesOf(r).forEach(s => { if (r.seats[s].kind === 'open') r.seats[s] = { kind: 'ai' }; r.seats[s].ready = false; delete r.seats[s].picks; delete r.seats[s].ban; });
      r.phase = 'draft'; pushLobby(r); break;
    }
    case 'ready': {
      if (r.phase !== 'draft' || !mine) break;
      r.seats[mine].picks = cleanPicks(m.picks); r.seats[mine].ready = true; pushLobby(r); break;
    }
    case 'ban': {
      if (r.phase !== 'draft' || !mine || r.seats[mine].ban) break;
      const k = String(m.k || '').replace(/[^a-z]/g, '').slice(0, 20); if (!k) break;
      r.seats[mine].ban = k; pushLobby(r); break;
    }
    case 'takeover': {
      if (mine || !sidesOf(r).includes(m.seat) || r.phase === 'lobby') break;
      const tk = r.seats[m.seat]; if (tk.kind !== 'human') break;
      const hc = tk.cid && r.clients.get(tk.cid); if (hc && hc.connected) break;
      tk.cid = cid; if (c.name) tk.name = c.name;
      pushLobby(r); send(c, { type: 'state', lobby: lobbyView(r), game: r.game }); break;
    }
    case 'unready': {
      if (r.phase === 'draft' && mine) { r.seats[mine].ready = false; pushLobby(r); }
      break;
    }
    case 'start': {
      if (!isHost || r.phase !== 'draft') break;
      if (!humans(r).every(s => r.seats[s].ready)) break;
      const picks = {}, names = {};
      sidesOf(r).forEach(s => { const x = r.seats[s]; picks[s] = x.kind === 'human' ? x.picks : cleanPicks(m.ai && m.ai[s]); names[s] = x.kind === 'human' && x.name ? x.name : null; });
      r.game = { cfg: { n: r.n, picks, seat: cfgSeat(r), names, opts: r.opts || {}, seed: Math.random() * 2147483647 | 0, gid: Math.random().toString(36).slice(2, 10) }, log: [] };
      r.phase = 'play';
      broadcast(r, { type: 'start', cfg: r.game.cfg }); pushLobby(r); break;
    }
    case 'rematch': {
      if (!isHost || r.phase !== 'play' || !r.game) break;
      r.game.log = []; r.game.cfg.seat = cfgSeat(r); r.game.cfg.seed = Math.random() * 2147483647 | 0; r.game.cfg.gid = Math.random().toString(36).slice(2, 10); r.game.cfg.opts = r.opts || {};
      if (r.rnd && m.picks) sidesOf(r).forEach(s => { r.game.cfg.picks[s] = cleanPicks(m.picks[s]); });
      broadcast(r, { type: 'start', cfg: r.game.cfg }); break;
    }
    case 'reset': {
      if (!isHost) break;
      const keep = r.seats; r.seats = blankSeats(); r.phase = 'lobby'; r.game = null;
      ALL_SIDES.forEach(s => { if (keep[s].kind === 'human') r.seats[s] = { kind: 'human', cid: keep[s].cid, name: keep[s].name, ready: false }; else if (keep[s].kind === 'ai') r.seats[s] = { kind: 'ai' }; });
      pushLobby(r); break;
    }
    case 'act': {
      const a = m.a;
      if (r.phase !== 'play' || !r.game || !a || typeof a !== 'object' || !sidesOf(r).includes(a.s) || !['spawn', 'move', 'act', 'end', 'ult', 'buy', 'card', 'ally', 'accept', 'decline', 'betray'].includes(a.t)) break;
      if (r.game.log.length > 5000) break;
      const t = r.seats[a.s];
      const ok = (t.kind === 'human' && t.cid === cid) || (t.kind === 'ai' && isHost);
      if (!ok) break;
      const clean = { t: a.t, s: a.s }; ['i', 'x', 'y', 'fx', 'fy'].forEach(k => { if (Number.isInteger(a[k]) && a[k] >= 0 && a[k] < 40) clean[k] = a[k]; });
      if (typeof a.item === 'string' && /^[a-z]{1,12}$/.test(a.item)) clean.item = a.item;
      if (typeof a.o === 'string' && /^[a-z]$/.test(a.o)) clean.o = a.o;
      if (typeof a.p === 'string' && /^[0-5]{1,8}$/.test(a.p)) clean.p = a.p;
      r.game.log.push(clean);
      broadcast(r, { type: 'act', a: clean, n: r.game.log.length }, cid); break;
    }
  }
}

function lanIPs() {
  const out = [];
  for (const list of Object.values(os.networkInterfaces())) for (const i of list || []) if (i.family === 'IPv4' && !i.internal) out.push(i.address);
  return out;
}
const json = (res, code, obj) => { res.writeHead(code, { 'Content-Type': 'application/json', 'Cache-Control': 'no-cache' }); res.end(JSON.stringify(obj)); };

const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const room = () => rooms.get(cleanCode(u.searchParams.get('room')));
  if (u.pathname === '/api/ping') { res.writeHead(200, { 'Content-Type': 'text/plain' }); return res.end('hv-lan'); }
  if (u.pathname === '/api/info') return json(res, 200, { port: PORT, ips: lanIPs() });
  if (u.pathname === '/api/create' && req.method === 'POST') { const r = makeRoom(); return r ? json(res, 200, { room: r.code }) : json(res, 503, { error: 'Server is full, try again later.' }); }
  if (u.pathname === '/api/state') { const r = room(); if (r && u.searchParams.has('lite')) { r.touched = Date.now(); return json(res, 200, { phase: r.phase, n: r.game ? r.game.log.length : 0, gid: r.game ? r.game.cfg.gid : null }); } return r ? json(res, 200, { lobby: lobbyView(r), game: r.game }) : json(res, 404, { error: 'no room' }); }
  if (u.pathname === '/events') {
    const r = room(), cid = (u.searchParams.get('cid') || '').replace(/[^\w-]/g, '').slice(0, 40);
    res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache, no-transform', 'Connection': 'keep-alive', 'X-Accel-Buffering': 'no' });
    if (!r || !cid) { res.write('retry: 600000\n\ndata: {"type":"noroom"}\n\n'); return res.end(); }
    let c = r.clients.get(cid);
    if (!c) {
      if (r.clients.size >= MAX_CLIENTS) { res.write('retry: 600000\n\ndata: {"type":"full"}\n\n'); return res.end(); }
      c = { name: '', order: ++r.order }; r.clients.set(cid, c);
    }
    res.write('retry: 1500\n\n');
    if (c.res) { try { c.res.end(); } catch (e) { } }
    c.res = res; c.connected = true; r.touched = Date.now();
    const nm = cleanName(u.searchParams.get('name')); if (nm) c.name = nm;
    const s = seatOf(r, cid); if (s && c.name) r.seats[s].name = c.name;
    send(c, { type: 'state', lobby: lobbyView(r), game: r.game });
    pushLobby(r);
    const ka = setInterval(() => { try { res.write('data: {"type":"ka"}\n\n'); } catch (e) { } }, 15000);
    req.on('close', () => { clearInterval(ka); if (c.res === res) { c.connected = false; pushLobby(r); } });
    return;
  }
  if (u.pathname === '/send' && req.method === 'POST') {
    let body = ''; req.on('data', d => { body += d; if (body.length > 100000) req.destroy(); });
    req.on('end', () => { const r = room(); try { if (r) handle(r, (u.searchParams.get('cid') || ''), JSON.parse(body)); } catch (e) { } res.writeHead(r ? 204 : 404); res.end(); });
    return;
  }
  let p = u.pathname === '/' ? '/index.html' : decodeURIComponent(u.pathname);
  const f = path.normalize(path.join(PUB, p));
  if (!f.startsWith(PUB)) { res.writeHead(403); return res.end(); }
  fs.readFile(f, (err, data) => {
    if (err) { res.writeHead(404); return res.end('Not found'); }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(f)] || 'application/octet-stream', 'Cache-Control': 'no-cache' }); res.end(data);
  });
});

// forget rooms nobody has used for a while
setInterval(() => {
  const now = Date.now();
  for (const [code, r] of rooms) if (![...r.clients.values()].some(c => c.connected) && now - r.touched > ROOM_IDLE_MS) rooms.delete(code);
}, 10 * 60 * 1000).unref();

server.listen(PORT, '0.0.0.0', () => {
  const ips = lanIPs();
  console.log('\n  HOLLOW VALE server is running\n');
  if (process.env.RENDER) { console.log('  Running on Render. Open your .onrender.com address to play.\n'); return; }
  console.log('  On this computer open:   http://localhost:' + PORT);
  if (ips.length) { console.log('\n  Friends on the same wifi open:'); ips.forEach(ip => console.log('      http://' + ip + ':' + PORT)); }
  else console.log('\n  (No network address found. Are you connected to wifi?)');
  console.log('\n  Keep this window open while you play. Press Ctrl+C to stop.\n');
});
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? 'Port ' + PORT + ' is already in use. Close the other copy, or run with PORT=3001.' : e.message); process.exit(1); });
