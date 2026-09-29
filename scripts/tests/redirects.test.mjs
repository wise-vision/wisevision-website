// Tests for public/_redirects (Cloudflare Pages syntax). node:test, zero deps.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const FILE = path.join(repo, 'public', '_redirects');

// The six new routes plus anything under /docs/.
const NEW_ROUTES = new Set(['/', '/ros2-mcp/', '/wiseos/', '/defence/', '/contact/', '/privacy/']);
const isNewRoute = (t) => NEW_ROUTES.has(t) || /^\/docs\/([a-z0-9-]+\/)*$/.test(t);

function parse(text) {
  const rules = [];
  text.split('\n').forEach((raw, i) => {
    const line = raw.trim();
    if (!line || line.startsWith('#')) return;
    const parts = line.split(/\s+/);
    rules.push({ line: i + 1, from: parts[0], to: parts[1], status: parts[2], extra: parts.slice(3) });
  });
  return rules;
}

const rules = parse(readFileSync(FILE, 'utf8'));

test('_redirects has rules', () => {
  assert.ok(rules.length >= 19, `only ${rules.length} rules`);
});

test('every rule is `from to 301` with no extra fields', () => {
  for (const r of rules) {
    assert.equal(r.status, '301', `line ${r.line}: ${r.from} status ${r.status}`);
    assert.deepEqual(r.extra, [], `line ${r.line}: extra fields`);
    assert.ok(r.from.startsWith('/'), `line ${r.line}: source must be a path`);
  }
});

test('no duplicate sources', () => {
  const seen = new Map();
  for (const r of rules) {
    assert.ok(!seen.has(r.from), `duplicate source ${r.from} (lines ${seen.get(r.from)} and ${r.line})`);
    seen.set(r.from, r.line);
  }
});

test('every target is one of the new routes', () => {
  for (const r of rules) assert.ok(isNewRoute(r.to), `line ${r.line}: ${r.from} -> ${r.to} is not a new route`);
});

test('no chains: no target is itself a redirect source', () => {
  const sources = new Set(rules.map((r) => r.from));
  for (const r of rules) {
    assert.ok(!sources.has(r.to), `chain: ${r.from} -> ${r.to} which is itself redirected`);
    // A splat source like /case-studies/* also matches /case-studies/x targets.
    for (const s of sources) {
      if (s.endsWith('/*')) assert.ok(!r.to.startsWith(s.slice(0, -1)), `chain via splat ${s}: ${r.from} -> ${r.to}`);
    }
  }
});

test('no self-redirects and no redirect away from a live new route', () => {
  for (const r of rules) {
    assert.notEqual(r.from, r.to, `self redirect at line ${r.line}`);
    assert.ok(!NEW_ROUTES.has(r.from), `line ${r.line}: redirects a live route ${r.from}`);
  }
});

test('never a mass redirect to /', () => {
  for (const r of rules) assert.ok(!(r.from === '/*' || r.from === '*'), `mass redirect at line ${r.line}`);
  const toRoot = rules.filter((r) => r.to === '/').length;
  assert.ok(toRoot / rules.length < 0.5, `${toRoot}/${rules.length} rules go to / (mass-redirect smell)`);
});

test('every old Docusaurus route (19 + case-study children) is covered', () => {
  const old = [
    '/about', '/ai-automations', '/case-studies', '/case-studies/agri-field', '/case-studies/automotive-twin',
    '/case-studies/pv-farm', '/case-studies/smart-city', '/case-studies/warehouse-amr', '/demo', '/digital-twins',
    '/mcp-ros2', '/products', '/solutions', '/technology', '/thank-you', '/use-cases',
  ];
  const sources = new Set(rules.map((r) => r.from));
  for (const p of old) {
    const covered = sources.has(p) || sources.has(p + '/') ||
      [...sources].some((s) => s.endsWith('/*') && (p + '/').startsWith(s.slice(0, -1)));
    assert.ok(covered, `old route ${p} has no redirect`);
  }
});
