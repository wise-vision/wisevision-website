// node --test scripts/tests/  — link audit over a built dist/.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { audit, extractRefs, resolveRef } from '../link-audit.mjs';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const FIX = path.join(HERE, 'fixtures', 'links');
const SCRIPT = path.join(HERE, '..', 'link-audit.mjs');

test('extractRefs finds href/src/srcset/poster/action and skips data: and javascript:', () => {
  const refs = extractRefs('<a href="/a/">x</a><img src="/i.png" srcset="/i.png 1x, /j.png 2x"><video poster="/p.jpg"></video><form action="/api/lead"></form><img src="data:image/png;base64,xx"><a href="javascript:void 0">j</a>');
  assert.deepEqual(refs.map((r) => r.url), ['/a/', '/i.png', '/i.png', '/j.png', '/p.jpg', '/api/lead']);
});

test('resolveRef classifies external / skip / internal paths (relative to the page)', () => {
  assert.equal(resolveRef('https://x.org/', '/').kind, 'external');
  assert.equal(resolveRef('mailto:a@b.c', '/').kind, 'skip');
  assert.equal(resolveRef('#main', '/').kind, 'skip');
  assert.deepEqual(resolveRef('../b/?q=1#x', '/a/c/'), { kind: 'internal', path: '/a/b/' });
  assert.deepEqual(resolveRef('//cdn.example.com/x.js', '/').kind, 'external');
});

test('green fixture: 0 broken, externals listed, runtime paths (/api/, /media/) allowed', () => {
  const r = audit(path.join(FIX, 'good', 'dist'));
  assert.deepEqual(r.broken, []);
  assert.ok(r.external.includes('https://github.com/wise-vision/ros2_mcp'));
  assert.ok(r.checked > 5);
});

test('RED: a missing page, a missing image and a redirect to a missing route all fail (exit 1, FILE ref)', () => {
  const r = audit(path.join(FIX, 'bad', 'dist'));
  const got = r.broken.map((b) => `${b.from} ${b.url}`).sort();
  assert.deepEqual(got, ['_redirects /gone/', 'index.html /img/nope.png', 'index.html /missing/']);
  const cli = spawnSync(process.execPath, [SCRIPT, path.join(FIX, 'bad', 'dist')], { encoding: 'utf8' });
  assert.equal(cli.status, 1);
  assert.match(cli.stdout, /index\.html broken \/missing\//);
});

test('CLI exits 0 on the green fixture', () => {
  const cli = spawnSync(process.execPath, [SCRIPT, path.join(FIX, 'good', 'dist')], { encoding: 'utf8' });
  assert.equal(cli.status, 0, cli.stdout + cli.stderr);
});
