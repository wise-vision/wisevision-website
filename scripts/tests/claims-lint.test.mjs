// Tests for scripts/claims-lint.mjs (node:test, zero deps).
// Run: node --test scripts/tests/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const repo = path.resolve(here, '..', '..');
const lintBin = path.join(repo, 'scripts', 'claims-lint.mjs');
const fx = (name) => path.join(here, 'fixtures', 'claims', name);

function run(root) {
  const r = spawnSync(process.execPath, [lintBin, '--root', root], { encoding: 'utf8' });
  return { code: r.status, out: (r.stdout || '') + (r.stderr || '') };
}

// Every finding line must be `FILE:LINE RULE detail`.
const FINDING = /^(\S+):(\d+) ([a-z0-9-]+) (.+)$/;
function findings(out) {
  return out.split('\n').filter((l) => FINDING.test(l)).map((l) => {
    const [, file, line, rule, detail] = l.match(FINDING);
    return { file, line: Number(line), rule, detail };
  });
}

test('green fixture passes (exit 0, no findings)', () => {
  const { code, out } = run(fx('green'));
  assert.equal(code, 0, out);
  assert.equal(findings(out).length, 0, out);
});

const redCases = [
  ['mit', 'banned-term', /MIT/],
  ['rbac', 'banned-term', /RBAC/],
  ['enterprise-grade', 'banned-term', /enterprise-grade/i],
  ['soc2', 'banned-term', /SOC ?2/],
  ['certified', 'banned-term', /certified/i],
  ['military-grade', 'banned-term', /military-grade/i],
  ['person-name', 'banned-term', /Dobrza/],
  ['office-email', 'banned-term', /office@/],
  ['star-count', 'banned-count', /stars/],
  ['unanchored-capability', 'unanchored-claim', /works with/],
  ['unknown-anchor', 'unknown-claim-id', /does-not-exist/],
  ['empty-evidence', 'claim-evidence', /empty-ev/],
  ['bad-status', 'claim-status', /maybe/],
];

for (const [name, rule, detail] of redCases) {
  test(`RED: ${name} fails with rule ${rule}`, () => {
    const { code, out } = run(fx(name));
    assert.equal(code, 1, `expected exit 1\n${out}`);
    const hit = findings(out).find((f) => f.rule === rule);
    assert.ok(hit, `no ${rule} finding in:\n${out}`);
    assert.match(hit.detail, detail);
    assert.ok(hit.line >= 1);
  });
}

test('RED: a page containing "MIT" fails at the right FILE:LINE', () => {
  const { code, out } = run(fx('mit'));
  assert.equal(code, 1);
  const hit = findings(out).find((f) => f.rule === 'banned-term');
  assert.equal(hit.file, 'content/copy/page.md');
  assert.equal(hit.line, 7);
});

test('RED: built dist HTML containing MIT fails (tags stripped)', () => {
  const { code, out } = run(fx('dist-mit'));
  assert.equal(code, 1, out);
  const hit = findings(out).find((f) => f.rule === 'banned-term' && f.file === 'dist/index.html');
  assert.ok(hit, out);
});

test('RED: built dist HTML with an unanchored capability sentence fails', () => {
  const { code, out } = run(fx('dist-unanchored'));
  assert.equal(code, 1, out);
  const hit = findings(out).find((f) => f.rule === 'unanchored-claim');
  assert.equal(hit.file, 'dist/wiseos/index.html');
});

test('dist HTML anchors (data-claim attr / <!--c:id--> comment) pass; <script> is ignored', () => {
  const { code, out } = run(fx('dist-green'));
  assert.equal(code, 0, out);
});

test('MIT rule is case-sensitive and word-bounded ("submit", "Mitigate" pass)', async () => {
  const { lintText } = await import(lintBin);
  const ids = (t) => lintText(t, 'x.md', { claims: new Map() }).map((f) => f.rule);
  assert.deepEqual(ids('Submit the form. Mitigate risk. Admit it.'), []);
  assert.deepEqual(ids('Licensed MIT.'), ['banned-term']);
});

test('star/clone/pull counts are caught in several shapes', async () => {
  const { lintText } = await import(lintBin);
  for (const s of ['89 stars.', '13,231 pulls.', '1.2k downloads.', '271 clones in 14 days.']) {
    const rules = lintText(s, 'x.md', { claims: new Map() }).map((f) => f.rule);
    assert.ok(rules.includes('banned-count'), `${s} -> ${rules}`);
  }
});

test('capability sentence anchored by a marker placed after its period passes', async () => {
  const { lintText } = await import(lintBin);
  const claims = new Map([['a', { evidence: 'f:1', status: 'shipped' }]]);
  assert.deepEqual(lintText('It streams camera frames. {#c:a} Next one.', 'x.md', { claims }), []);
  const f = lintText('It streams camera frames. {#c:a} It also records logs.', 'x.md', { claims });
  assert.equal(f.length, 1);
  assert.equal(f[0].rule, 'unanchored-claim');
  assert.match(f[0].detail, /records/);
});

test('fenced code blocks are exempt from the capability rule but not from banned terms', async () => {
  const { lintText } = await import(lintBin);
  const claims = new Map();
  assert.deepEqual(lintText('```bash\n# runs the server\ndocker run -i --rm mcp/ros2\n```\n', 'x.md', { claims }), []);
  const f = lintText('```\nLicense: MIT\n```\n', 'x.md', { claims });
  assert.equal(f[0].rule, 'banned-term');
});

test('frontmatter: description over 155 chars and missing og_title fail', () => {
  // uses lintFrontmatter directly
  return import(lintBin).then(({ lintFrontmatter }) => {
    const long = 'x'.repeat(156);
    const f = lintFrontmatter(`---\ntitle: T\ndescription: ${long}\n---\nbody\n`, 'p.md');
    const rules = f.map((x) => x.detail);
    assert.ok(rules.some((d) => /description/.test(d)));
    assert.ok(rules.some((d) => /og_title/.test(d)));
  });
});

test('the real repo copy passes the lint (gate)', () => {
  const { code, out } = run(repo);
  assert.equal(code, 0, out);
});
