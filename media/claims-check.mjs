#!/usr/bin/env node
// media/claims-check.mjs — zero-dependency claims gate for the HyperFrames explainers.
//
// Scans the VISIBLE text of every media/compositions/**/*.html (script/style bodies stripped) for
//   1. banned words / claims (licence, compliance puffery, vanity counts, people, personal emails)
//   2. fabricated commands: every line that looks like a shell command ("$ …", "docker …", "uvx …",
//      "pip …", "npx …", "uv …", "curl …", "git clone …") must exist VERBATIM in the real ros2_mcp
//      sources (README.md, installation/README.md, Dockerfile).
//
// Allowed commands come from $ROS2_MCP_DIR (default /home/adam/repos/ros2_mcp) when present, else from the
// committed snapshot media/allowed-commands.json. Refresh the snapshot with:  node media/claims-check.mjs --refresh
// Exit code 0 = clean, 1 = violations. Tests: node --test media/test/
import { readFileSync, readdirSync, statSync, existsSync, writeFileSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const MEDIA = dirname(fileURLToPath(import.meta.url));
const SNAPSHOT = join(MEDIA, 'allowed-commands.json');
const SOURCE_FILES = ['README.md', 'installation/README.md', 'Dockerfile'];

export const BANNED = [
  { rule: 'licence-mit', re: /\bMIT\b/g, why: 'ROS2 MCP is MPL-2.0, never MIT' },
  { rule: 'rbac', re: /\bRBAC\b/gi, why: 'no RBAC exists' },
  { rule: 'enterprise-grade', re: /\benterprise[- ]grade\b/gi, why: 'unbacked puffery' },
  { rule: 'certified', re: /\bcertifi(ed|cation)\b/gi, why: 'no certification exists' },
  { rule: 'military-grade', re: /\bmilitary[- ]grade\b/gi, why: 'banned claim' },
  { rule: 'soc2', re: /\bSOC ?2\b/g, why: 'no SOC 2 report' },
  { rule: 'vanity-count', re: /\b\d[\d,.]*\s*[kKmM]?\+?\s*(github\s+)?(stars?|clones?|pulls?|downloads?|forks?)\b/g, why: 'no star/clone/pull counts' },
  { rule: 'vanity-count', re: /\bstars? on github\b/gi, why: 'no star counts' },
  { rule: 'person-name', re: /\b(Micha[łl]|Dobrza[ńn]ski|Pawe[łl]|Macuda)\b/gi, why: 'no people on the site' },
  { rule: 'weapons-claim', re: /\b(weapon(s|ized)? integration|lethal|kill chain|targeting pipeline)\b/gi, why: 'no weapons-integration claims' },
];
const EMAIL = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
const ALLOWED_EMAIL = 'hello@wisevision.tech';
const COMMAND_START = /^(\$\s+|docker\s|uvx\s|uv\s|pip3?\s|npx\s|npm\s|curl\s|wget\s|git\s+clone\s|brew\s|apt(-get)?\s|sudo\s)/;

const norm = (s) => s.replace(/\s+/g, ' ').replace(/(\s*\\|\s*;|\s*&&)+$/, '').trim();

/** Visible text lines: drop script/style/comments, split at every tag, decode basic entities. */
export function visibleLines(html) {
  const stripped = html
    .replace(/<script\b[\s\S]*?<\/script>/gi, '\n')
    .replace(/<style\b[\s\S]*?<\/style>/gi, '\n')
    .replace(/<!--[\s\S]*?-->/g, '\n');
  // Block-level tags end a line; inline tags (span, b, em, i, a, code, …) are dropped so that a styled
  // "$ " prompt span stays joined to its command text.
  const BLOCK = /<\/?(div|p|pre|li|ul|ol|section|article|header|footer|h[1-6]|br|tr|td|th|table|svg|video|img|main|body|html|head)\b[^>]*>/gi;
  return stripped
    .replace(BLOCK, '\n')
    .replace(/<[^>]+>/g, '')
    .split('\n')
    .map((s) => s.replace(/&nbsp;/g, ' ').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'").replace(/&amp;/g, '&'))
    .map((s) => s.replace(/\s+/g, ' ').trim())
    .filter(Boolean);
}

function readSources(dir) {
  const out = [];
  for (const f of SOURCE_FILES) {
    const p = join(dir, f);
    if (!existsSync(p)) continue;
    for (const line of readFileSync(p, 'utf8').split('\n')) {
      const n = norm(line.replace(/^\s*\$\s+/, ''));
      if (n) out.push(n);
    }
  }
  return [...new Set(out)].sort();
}

export function loadAllowedCommands() {
  const dir = process.env.ROS2_MCP_DIR || '/home/adam/repos/ros2_mcp';
  if (existsSync(join(dir, 'README.md'))) return new Set(readSources(dir));
  if (existsSync(SNAPSHOT)) return new Set(JSON.parse(readFileSync(SNAPSHOT, 'utf8')).lines);
  throw new Error(`no ros2_mcp sources at ${dir} and no snapshot at ${SNAPSHOT}`);
}

export function checkText(html, allowed) {
  const violations = [];
  for (const line of visibleLines(html)) {
    for (const b of BANNED) {
      for (const m of line.matchAll(b.re)) violations.push({ rule: b.rule, match: m[0], line, why: b.why });
    }
    for (const m of line.matchAll(EMAIL)) {
      if (m[0].toLowerCase() !== ALLOWED_EMAIL) {
        violations.push({ rule: 'personal-email', match: m[0], line, why: `only ${ALLOWED_EMAIL} is allowed` });
      }
    }
    if (COMMAND_START.test(line)) {
      const cmd = norm(line.replace(/^\$\s+/, ''));
      if (!allowed.has(cmd)) {
        violations.push({ rule: 'fabricated-command', match: cmd, line, why: 'not verbatim in ros2_mcp README/installation/Dockerfile' });
      }
    }
  }
  return violations;
}

// ---- video guard -------------------------------------------------------------------------------------
// A <video> clip that is missing, is an LFS pointer, or ends before its data-duration renders as the black
// .footage background (the wave-1 "black REAL FOOTAGE panel"). Fail the gate instead of shipping that.
export const MIN_VIDEO_BYTES = 10 * 1024;

/** Duration in seconds from the ISO-BMFF moov/mvhd box (zero-dep; enough for ffmpeg/faststart MP4s). */
export function mp4Duration(file) {
  const buf = readFileSync(file);
  const find = (start, end, type) => {
    for (let o = start; o + 8 <= end;) {
      let size = buf.readUInt32BE(o);
      const t = buf.toString('latin1', o + 4, o + 8);
      let hdr = 8;
      if (size === 1) { size = Number(buf.readBigUInt64BE(o + 8)); hdr = 16; } else if (size === 0) size = end - o;
      if (size < hdr) return null;
      if (t === type) return { o, size, hdr };
      o += size;
    }
    return null;
  };
  const moov = find(0, buf.length, 'moov');
  if (!moov) return null;
  const mvhd = find(moov.o + moov.hdr, moov.o + moov.size, 'mvhd');
  if (!mvhd) return null;
  const b = mvhd.o + mvhd.hdr;
  const v1 = buf[b] === 1;
  const timescale = buf.readUInt32BE(b + (v1 ? 20 : 12));
  const duration = v1 ? Number(buf.readBigUInt64BE(b + 24)) : buf.readUInt32BE(b + 16);
  return timescale ? duration / timescale : null;
}

/** Check every <video src> in a composition relative to its project dir. */
export function checkVideos(html, dir) {
  const violations = [];
  for (const m of html.matchAll(/<video\b[^>]*>/gi)) {
    const tag = m[0];
    const src = (tag.match(/\bsrc="([^"]+)"/) || [])[1];
    if (!src) continue;
    const want = parseFloat((tag.match(/\bdata-duration="([\d.]+)"/) || [])[1] || '0');
    const start = parseFloat((tag.match(/\bdata-start="([\d.]+)"/) || [])[1] || '0');
    const sceneEnd = (tag.match(/\bdata-wv-scene-end="([\d.]+)"/) || [])[1];
    // The scene's on-screen window (end of its exit crossfade) is declared on the tag: the clip must cover it.
    if (sceneEnd == null) violations.push({ rule: 'video-scene-end-missing', match: src, line: tag, why: 'declare data-wv-scene-end (when the scene leaves the screen)' });
    else if (start + want + 0.01 < parseFloat(sceneEnd)) violations.push({ rule: 'video-ends-before-scene', match: `${src} ends ${start + want}s < scene end ${sceneEnd}s`, line: tag, why: 'the panel goes black for the rest of the scene' });
    const p = join(dir, src);
    if (!existsSync(p)) { violations.push({ rule: 'video-missing', match: src, line: tag, why: 'run media/proof/make-proof.sh' }); continue; }
    const bytes = statSync(p).size;
    if (bytes <= MIN_VIDEO_BYTES) { violations.push({ rule: 'video-too-small', match: `${src} (${bytes} B)`, line: tag, why: 'LFS pointer or empty clip renders black' }); continue; }
    const got = mp4Duration(p);
    if (got == null) violations.push({ rule: 'video-unreadable', match: src, line: tag, why: 'no moov/mvhd box' });
    else if (want && got + 0.02 < want) violations.push({ rule: 'video-too-short', match: `${src} ${got.toFixed(2)}s < data-duration ${want}s`, line: tag, why: 'the panel goes black when the clip ends' });
  }
  return violations;
}

function walk(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((n) => {
    const p = join(dir, n);
    if (statSync(p).isDirectory()) return n === 'node_modules' || n === 'renders' ? [] : walk(p);
    return p.endsWith('.html') ? [p] : [];
  });
}

export function scanCompositions(root = join(MEDIA, 'compositions')) {
  const allowed = loadAllowedCommands();
  const files = walk(root);
  const violations = files.flatMap((f) => {
    const html = readFileSync(f, 'utf8');
    // Proof clips are gitignored build inputs, so a fresh checkout has none: set WV_CHECK_VIDEOS=0 to run
    // only the text rules there. render-all.sh always runs the full check (videos must exist to render).
    const vids = (process.env.WV_CHECK_VIDEOS !== '0') ? checkVideos(html, dirname(f)) : [];
    return [...checkText(html, allowed), ...vids].map((v) => ({ file: relative(MEDIA, f), ...v }));
  });
  return { files, violations };
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  if (process.argv.includes('--refresh')) {
    const dir = process.env.ROS2_MCP_DIR || '/home/adam/repos/ros2_mcp';
    const lines = readSources(dir);
    writeFileSync(SNAPSHOT, JSON.stringify({ source: 'wise-vision/ros2_mcp', files: SOURCE_FILES, lines }, null, 2) + '\n');
    console.log(`snapshot: ${lines.length} lines from ${dir}`);
    process.exit(0);
  }
  const { files, violations } = scanCompositions();
  for (const v of violations) console.log(`✗ ${v.file}  [${v.rule}]  "${v.match}"  — ${v.why}`);
  console.log(`claims-check: ${files.length} composition file(s), ${violations.length} violation(s)`);
  process.exit(violations.length ? 1 : 0);
}
