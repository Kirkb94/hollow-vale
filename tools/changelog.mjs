#!/usr/bin/env node
// tools/changelog.mjs: writes the player-facing "What's new" notes the game reads from public/changelog.json.
// Run at push time with the commits of that push (everything since the previous push). Node 18+, no dependencies.
//
//   node tools/changelog.mjs --commits commits.json [--notes notes.json|notes.md] [--out public/changelog.json]
//   cat commits.json | node tools/changelog.mjs --notes notes.md
//
// commits: a JSON array (or {commits:[...]}, or {items:[...]}) of {hash, date, subject, body}. A "message" field with the
//   full commit message also works. Newest first is assumed when dates are missing. Co-Authored-By / Claude-Session
//   trailers are stripped. The newest hash becomes the version id.
// notes (optional, hand-written): JSON {title, date, groups:[{name, items:[...]}]} or {"New":[...], "Fixes":[...]},
//   or text: "# Title" on the first line, "## Group" headings and "- item" lines. Without notes, commits are grouped by
//   simple rules (fix/bug -> Fixes, balance/nerf/buff/dmg/hp -> Balance, art/anim/visual/tiles -> Visuals, else New).
// Options: --title "..."  --date YYYY-MM-DD  --id <hash>  --keep 10  --dry-run (print, do not write)  --help
// The new version is put first; an existing entry with the same id is replaced; the last --keep versions are kept.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ORDER = ['New', 'Balance', 'Fixes', 'Visuals'];
const RULES = [
  ['Fixes', /\b(fix(e[sd])?|bug(s|fix)?|crash(es)?|broken|typo|regression|glitch)\b/i],
  ['Balance', /\b(balance[ds]?|rebalance|nerf(s|ed)?|buff(s|ed)?|dmg|damage|hp|health|cooldowns?|cost|tuning|tuned?|ult charge|stronger|weaker|slower|faster)\b|\d\s*(->|→)\s*\d|[+-]\d+(%|\b)/i],
  ['Visuals', /\b(art|arts|artwork|anim(ation)?s?|animated|visuals?|vfx|tiles?|sprites?|portraits?|textures?|icons?|effects?|painted|look)\b/i]
];
const SKIP = /^(update from renegade dev console|merge (branch|pull request|remote-tracking)|update changelog|changelog\b|what'?s new notes?)\b/i;
const TRAILER = /^\s*(co-authored-by|claude-session|signed-off-by)\s*:/i;

function args(argv) {
  const o = { keep: 10 };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i], next = () => { if (i + 1 >= argv.length) die('missing value for ' + a); return argv[++i]; };
    if (a === '--commits' || a === '-c') o.commits = next();
    else if (a === '--notes' || a === '-n') o.notes = next();
    else if (a === '--out' || a === '-o') o.out = next();
    else if (a === '--title') o.title = next();
    else if (a === '--date') o.date = next();
    else if (a === '--id') o.id = next();
    else if (a === '--keep') o.keep = Math.max(1, parseInt(next(), 10) || 10);
    else if (a === '--dry-run') o.dry = true;
    else if (a === '--help' || a === '-h') o.help = true;
    else if (a === '-') o.commits = '-';
    else if (!o.commits) o.commits = a;
    else die('unknown argument ' + a);
  }
  return o;
}
function die(m) { process.stderr.write('changelog: ' + m + '\n'); process.exit(1); }
function readInput(p) {
  if (!p || p === '-') {
    if (process.stdin.isTTY) die('give commits with --commits <file> or on stdin (see --help)');
    return fs.readFileSync(0, 'utf8');
  }
  return fs.readFileSync(p, 'utf8');
}
function parseJSON(t, what) { try { return JSON.parse(t.replace(/^﻿/, '')); } catch (e) { die(what + ' is not valid JSON: ' + e.message); } }

function cleanMessage(c) {
  const full = String(c.message || [c.subject || '', c.body || ''].join('\n')).replace(/\r\n?/g, '\n');
  const lines = full.split('\n').filter(l => !TRAILER.test(l));
  while (lines.length && !lines[0].trim()) lines.shift();
  const subject = (lines.shift() || '').trim();
  const body = lines.join('\n').trim();
  return { subject, body };
}
function normCommits(raw) {
  const arr = Array.isArray(raw) ? raw : raw && (raw.commits || raw.items || raw.versions);
  if (!Array.isArray(arr) || !arr.length) die('no commits in input (expected a JSON array of {hash, date, subject, body})');
  const out = arr.map((c, i) => {
    if (typeof c === 'string') c = { subject: c };
    if (!c || typeof c !== 'object') die('commit ' + i + ' is not an object');
    const { subject, body } = cleanMessage(c);
    const hash = String(c.hash || c.sha || c.id || '').trim();
    const d = String(c.date || c.authorDate || c.committed || '').trim();
    return { hash, date: d, subject, body, i };
  }).filter(c => c.subject);
  if (!out.length) die('every commit had an empty subject');
  if (out.every(c => !isNaN(Date.parse(c.date)))) out.sort((a, b) => Date.parse(b.date) - Date.parse(a.date) || a.i - b.i);
  return out;
}
function isoDay(s) {
  if (/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0, 10);   // the commit's own local day
  const t = Date.parse(s); if (isNaN(t)) return null;
  const d = new Date(t); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
}
function groupOf(subject) { for (const [g, re] of RULES) if (re.test(subject)) return g; return 'New'; }
function friendly(subject) {
  let s = subject.replace(/^(feat|fix|chore|refactor|perf|style|docs|test|build|ci)(\([^)]*\))?!?:\s*/i, '');
  s = s.replace(/\s+/g, ' ').trim().replace(/[.;,]+$/, '');
  if (s.length > 140) { const cut = s.slice(0, 140); s = cut.slice(0, Math.max(cut.lastIndexOf(';'), cut.lastIndexOf(','), cut.lastIndexOf(' '), 80)).replace(/[;,\s]+$/, '') + '…'; }
  return s.charAt(0).toUpperCase() + s.slice(1);
}
function autoGroups(commits) {
  const m = new Map();
  for (const c of commits) {
    if (SKIP.test(c.subject)) continue;
    const g = groupOf(c.subject), item = friendly(c.subject);
    if (!m.has(g)) m.set(g, []);
    if (!m.get(g).includes(item)) m.get(g).push(item);
  }
  return sortGroups([...m].map(([name, items]) => ({ name, items })));
}
function sortGroups(gs) {
  const rank = n => { const i = ORDER.indexOf(n); return i < 0 ? ORDER.length : i; };
  return gs.map((g, i) => ({ g, i })).sort((a, b) => rank(a.g.name) - rank(b.g.name) || a.i - b.i).map(x => x.g);
}
function parseNotes(text, file) {
  const t = text.replace(/^﻿/, '').replace(/\r\n?/g, '\n');
  const out = { groups: [] };
  if (/^\s*[{[]/.test(t)) {
    const j = parseJSON(t, file || 'notes');
    const src = Array.isArray(j) ? { groups: j } : j;
    if (src.title) out.title = String(src.title);
    if (src.date) out.date = String(src.date);
    if (Array.isArray(src.groups)) out.groups = src.groups.map(g => ({ name: String(g && g.name || '').trim(), items: (g && Array.isArray(g.items) ? g.items : []).map(x => String(x).trim()).filter(Boolean) }));
    else for (const [k, v] of Object.entries(src)) if (Array.isArray(v) && !['commits', 'groups'].includes(k)) out.groups.push({ name: k, items: v.map(x => String(x).trim()).filter(Boolean) });
  } else {
    let cur = null;
    for (const raw of t.split('\n')) {
      const l = raw.trim(); if (!l) continue;
      let m;
      if ((m = /^#\s+(.+)$/.exec(l)) && !out.title && !out.groups.length) out.title = m[1].trim();
      else if ((m = /^##+\s*(.+?):?$/.exec(l)) || (m = /^([A-Z][\w &'-]{1,30}):$/.exec(l))) { cur = { name: m[1].trim(), items: [] }; out.groups.push(cur); }
      else if ((m = /^[-*•]\s+(.+)$/.exec(l))) { if (!cur) { cur = { name: 'New', items: [] }; out.groups.push(cur); } cur.items.push(m[1].trim()); }
      else if (cur && cur.items.length) cur.items[cur.items.length - 1] += ' ' + l;
    }
  }
  out.groups = out.groups.filter(g => g.name && g.items.length);
  if (!out.groups.length) die('notes have no groups with items');
  return out;
}
function autoTitle(groups) {
  const n = groups.map(g => g.name);
  if (n.length === 1) return n[0] === 'Fixes' ? 'Fixes' : n[0] === 'New' ? 'New update' : n[0] + ' update';
  return n.slice(0, -1).join(', ') + ' and ' + n[n.length - 1];
}

const o = args(process.argv.slice(2));
if (o.help) { process.stdout.write(fs.readFileSync(fileURLToPath(import.meta.url), 'utf8').split('\n').filter(l => l.startsWith('//')).map(l => l.replace(/^\/\/ ?/, '')).join('\n') + '\n'); process.exit(0); }
const commits = normCommits(parseJSON(readInput(o.commits), 'commits'));
const notes = o.notes ? parseNotes(fs.readFileSync(o.notes, 'utf8'), o.notes) : null;
const groups = notes ? notes.groups : autoGroups(commits);
if (!groups.length) groups.push({ name: 'New', items: commits.map(c => friendly(c.subject)) });
const id = String(o.id || commits[0].hash || '').trim();
if (!/^[0-9a-f]{4,40}$/i.test(id)) die('need the newest commit hash as the version id (give hash in the commits, or --id)');
const date = o.date || (notes && notes.date) || isoDay(commits[0].date) || isoDay(new Date().toISOString());
if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) die('bad --date ' + date + ' (use YYYY-MM-DD)');
const version = {
  id: id.slice(0, 12),
  date,
  title: String(o.title || (notes && notes.title) || autoTitle(groups)).trim(),
  groups: groups.map(g => ({ name: g.name, items: g.items })),
  commits: commits.map(c => c.subject)
};

const here = path.dirname(fileURLToPath(import.meta.url));
const out = path.resolve(o.out || path.join(here, '..', 'public', 'changelog.json'));
let data = { versions: [] };
if (fs.existsSync(out)) {
  try { const j = JSON.parse(fs.readFileSync(out, 'utf8').replace(/^﻿/, '')); if (j && Array.isArray(j.versions)) data = j; }
  catch (e) { process.stderr.write('changelog: ' + out + ' was not valid JSON, starting a new one\n'); }
}
const short = s => String(s || '').slice(0, 7).toLowerCase();
data.versions = [version, ...data.versions.filter(v => v && short(v.id) !== short(version.id))].slice(0, o.keep);
const json = JSON.stringify(data, null, 2) + '\n';
if (o.dry) process.stdout.write(json);
else {
  fs.mkdirSync(path.dirname(out), { recursive: true });
  fs.writeFileSync(out, json);
  process.stdout.write(`changelog: ${version.id} (${version.date}) "${version.title}": ${groups.reduce((n, g) => n + g.items.length, 0)} notes in ${groups.length} groups, ${version.commits.length} commits -> ${out} (${data.versions.length} versions kept)\n`);
}
