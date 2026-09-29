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
  const violations = files.flatMap((f) =>
    checkText(readFileSync(f, 'utf8'), allowed).map((v) => ({ file: relative(MEDIA, f), ...v })));
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
