#!/usr/bin/env node
// claims-lint: every capability sentence on wisevision.tech must be backed by a
// row in CLAIMS.md, and banned words never ship.
//
// Scans content/copy/**/*.md and, when present, dist/**/*.html (tags stripped).
// Exit 0 = clean. Exit 1 = findings, printed one per line as `FILE:LINE RULE detail`.
//
// Rules
//   banned-term       a term from config.bannedTerms (MIT, RBAC, ex-employee names, ...)
//   banned-count      a star / clone / pull / download count ("89 stars")
//   unanchored-claim  a sentence with a capability verb but no {#c:<id>} anchor
//   unknown-claim-id  an anchor whose id has no row in CLAIMS.md
//   claim-evidence    a CLAIMS.md row with an empty evidence cell
//   claim-status      a CLAIMS.md row whose status is not in config.statuses
//   claim-duplicate   the same id twice in CLAIMS.md
//   frontmatter       copy file missing title / og_title, or description > 155 chars
//
// Anchor convention
//   Markdown copy:  put `{#c:<id>}` right after the sentence it backs (after the period).
//   Built HTML:     the page builder replaces each marker with `<span data-claim="<id>"></span>`
//                   at the same position (or `<!--c:<id>-->`). Any element carrying
//                   data-claim="<id>" anchors the sentence it closes.
//
// Usage: node scripts/claims-lint.mjs [--root <dir>] [--no-dist]
// Zero dependencies (Node >= 20).

import { readFileSync, readdirSync, existsSync, statSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
export const CONFIG = JSON.parse(readFileSync(path.join(HERE, 'claims-lint.config.json'), 'utf8'));

const MARKER = /\{#c:([a-z0-9][a-z0-9-]*)\}/g;
const escapeRe = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const BANNED = CONFIG.bannedTerms.map((t) => ({ id: t.id, re: new RegExp(t.pattern, 'g' + t.flags) }));
const COUNT = new RegExp(CONFIG.countPattern, 'gi');
const VERB = new RegExp('\\b(' + CONFIG.capabilityVerbs.map(escapeRe).join('|') + ')\\b', 'i');

const finding = (file, line, rule, detail) => ({ file, line, rule, detail });
const clip = (s, n = 90) => {
  const t = s.replace(/\s+/g, ' ').trim();
  return t.length > n ? t.slice(0, n - 1) + '…' : t;
};

// ---------------------------------------------------------------- CLAIMS.md
export function parseClaims(text, file = CONFIG.claimsFile) {
  const claims = new Map();
  const findings = [];
  let header = null;
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line.startsWith('|')) { header = line === '' ? header : null; return; }
    const cells = line.replace(/^\|/, '').replace(/\|$/, '').split('|').map((c) => c.trim());
    if (cells.every((c) => /^:?-{2,}:?$/.test(c))) return; // separator row
    if (!header) {
      header = cells.map((c) => c.toLowerCase());
      return;
    }
    if (header[0] !== 'id') return; // some other table in the file
    const row = Object.fromEntries(header.map((h, k) => [h, cells[k] ?? '']));
    const id = row.id.replace(/`/g, '');
    if (!id) return;
    const n = i + 1;
    if (claims.has(id)) findings.push(finding(file, n, 'claim-duplicate', `id "${id}" already defined on line ${claims.get(id).line}`));
    if (!row.evidence) findings.push(finding(file, n, 'claim-evidence', `id "${id}" has an empty evidence cell`));
    const status = (row.status || '').replace(/`/g, '');
    if (!CONFIG.statuses.includes(status)) findings.push(finding(file, n, 'claim-status', `id "${id}" has status "${status}"; allowed: ${CONFIG.statuses.join(', ')}`));
    claims.set(id, { line: n, evidence: row.evidence, status, claim: row.claim, page: row.page });
  });
  return { claims, findings };
}

// ---------------------------------------------------------------- sentences
// Split one line of prose into sentences, attach anchors that follow each sentence.
function sentencesWithAnchors(line) {
  const anchors = [];
  let clean = '';
  let last = 0;
  for (const m of line.matchAll(MARKER)) {
    clean += line.slice(last, m.index);
    anchors.push({ id: m[1], pos: clean.length });
    last = m.index + m[0].length;
  }
  clean += line.slice(last);
  const sents = [];
  const endRe = /[.!?]+(?=\s|$)/g;
  let start = 0;
  let m;
  while ((m = endRe.exec(clean))) {
    sents.push({ start, end: m.index + m[0].length });
    start = m.index + m[0].length;
  }
  if (clean.slice(start).trim()) sents.push({ start, end: clean.length });
  for (const s of sents) { s.text = clean.slice(s.start, s.end); s.ids = []; }
  for (const a of anchors) {
    // An anchor belongs to the last sentence that ends at or before it.
    // A marker in the middle of a sentence belongs to that sentence.
    let owner = null;
    for (const s of sents) if (s.end <= a.pos) owner = s;
    if (!owner) owner = sents.find((s) => s.start <= a.pos && a.pos <= s.end) || sents[0] || null;
    if (owner) owner.ids.push(a.id);
  }
  return { sents, anchors };
}

// Strip things that are not prose claims: inline code, link URLs, image syntax, HTML tags.
function proseOnly(s) {
  return s
    .replace(/`[^`]*`/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\]\([^)]*\)/g, ']')
    .replace(/<[^>]+>/g, ' ');
}

// ---------------------------------------------------------------- core lint
export function lintText(text, file, { claims, capability = true } = {}) {
  const out = [];
  const lines = text.split('\n');
  let inFence = false;
  let inFront = lines[0]?.trim() === '---';
  lines.forEach((line, i) => {
    const n = i + 1;
    if (inFront) {
      if (i > 0 && line.trim() === '---') inFront = false;
      // frontmatter is still copy (title/description): banned terms apply.
    }
    if (!inFront && /^\s*(```|~~~)/.test(line)) { inFence = !inFence; }
    for (const b of BANNED) {
      b.re.lastIndex = 0;
      const m = b.re.exec(line);
      if (m) out.push(finding(file, n, 'banned-term', `"${m[0]}" (${b.id}) in: ${clip(line)}`));
    }
    COUNT.lastIndex = 0;
    const c = COUNT.exec(line);
    if (c) out.push(finding(file, n, 'banned-count', `"${c[0]}" — no star/clone/pull/download counts (L17)`));
    if (inFront || inFence || /^\s*(```|~~~)/.test(line)) return;
    const { sents, anchors } = sentencesWithAnchors(line);
    for (const a of anchors) {
      if (!claims.has(a.id)) out.push(finding(file, n, 'unknown-claim-id', `{#c:${a.id}} has no row in ${CONFIG.claimsFile}`));
    }
    if (!capability) return;
    for (const s of sents) {
      const v = VERB.exec(proseOnly(s.text));
      if (v && s.ids.length === 0) out.push(finding(file, n, 'unanchored-claim', `"${v[1]}" needs a {#c:<id>} anchor: ${clip(s.text)}`));
    }
  });
  return out;
}

export function lintFrontmatter(text, file) {
  const out = [];
  const m = text.match(/^---\n([\s\S]*?)\n---/);
  if (!m) return [finding(file, 1, 'frontmatter', 'missing frontmatter (title, description, og_title)')];
  const fm = {};
  m[1].split('\n').forEach((l) => {
    const kv = l.match(/^([a-z_]+):\s*(.*)$/);
    if (kv) fm[kv[1]] = kv[2].replace(/^["']|["']$/g, '');
  });
  for (const k of ['title', 'description', 'og_title']) if (!fm[k]) out.push(finding(file, 1, 'frontmatter', `missing ${k}`));
  if (fm.description && fm.description.length > 155) out.push(finding(file, 1, 'frontmatter', `description is ${fm.description.length} chars (max 155)`));
  return out;
}

// ---------------------------------------------------------------- HTML → text
export function htmlToText(html) {
  const entities = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', '#39': "'", mdash: '—', ndash: '–', rarr: '→', hellip: '…' };
  return html
    .replace(/<(script|style|noscript|svg|template)\b[\s\S]*?<\/\1>/gi, ' ')
    .replace(/<!--\s*c:([a-z0-9-]+)\s*-->/gi, ' {#c:$1}')
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<(\w+)\b[^>]*\bdata-claim="([a-z0-9-]+)"[^>]*>([\s\S]*?)<\/\1>/gi, '$3 {#c:$2}')
    .replace(/<(\w+)\b[^>]*\bdata-claim="([a-z0-9-]+)"[^>]*\/?>/gi, ' {#c:$2}')
    .replace(/<\/?(p|div|li|ul|ol|h[1-6]|br|section|article|header|footer|main|nav|tr|td|th|table|title|blockquote|pre|figure|figcaption|dt|dd|details|summary|button|a|label|option)\b[^>]*>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (m, e) => entities[e] ?? (e.startsWith('#') ? String.fromCodePoint(Number(e.slice(1))) : m))
    .split('\n').map((l) => l.replace(/[ \t]+/g, ' ').trim()).join('\n');
}

// ---------------------------------------------------------------- driver
function walk(dir, ext) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const e of readdirSync(dir)) {
    const p = path.join(dir, e);
    if (statSync(p).isDirectory()) out.push(...walk(p, ext));
    else if (p.endsWith(ext)) out.push(p);
  }
  return out.sort();
}

export function run(root, { dist = true } = {}) {
  const rel = (p) => path.relative(root, p).split(path.sep).join('/');
  const findings = [];
  const claimsPath = path.join(root, CONFIG.claimsFile);
  let claims = new Map();
  if (existsSync(claimsPath)) {
    const parsed = parseClaims(readFileSync(claimsPath, 'utf8'), CONFIG.claimsFile);
    claims = parsed.claims;
    findings.push(...parsed.findings);
  } else {
    findings.push(finding(CONFIG.claimsFile, 1, 'claim-evidence', 'CLAIMS.md not found'));
  }
  const copy = walk(path.join(root, CONFIG.copyDir), '.md');
  for (const f of copy) {
    const text = readFileSync(f, 'utf8');
    findings.push(...lintFrontmatter(text, rel(f)));
    findings.push(...lintText(text, rel(f), { claims }));
  }
  let html = [];
  if (dist) {
    const distRoot = path.join(root, CONFIG.distDir);
    html = walk(distRoot, '.html');
    for (const f of html) {
      const r = path.relative(distRoot, f).split(path.sep).join('/');
      const capability = !CONFIG.capabilityExemptDist.some((p) => r.startsWith(p));
      findings.push(...lintText(htmlToText(readFileSync(f, 'utf8')), rel(f), { claims, capability }));
    }
  }
  return { findings, scanned: copy.length + html.length };
}

const isMain = process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;
if (isMain) {
  const args = process.argv.slice(2);
  const ri = args.indexOf('--root');
  const root = path.resolve(ri >= 0 ? args[ri + 1] : path.join(HERE, '..'));
  const { findings, scanned } = run(root, { dist: !args.includes('--no-dist') });
  findings.sort((a, b) => a.file.localeCompare(b.file) || a.line - b.line);
  for (const f of findings) console.log(`${f.file}:${f.line} ${f.rule} ${f.detail}`);
  console.error(`claims-lint — ${findings.length} finding(s) in ${scanned} file(s)`);
  process.exit(findings.length ? 1 : 0);
}
