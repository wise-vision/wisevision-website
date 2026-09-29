// node --test media/test/  — zero-dep tests for media/claims-check.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkText, visibleLines, loadAllowedCommands, scanCompositions } from '../claims-check.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const fx = (n) => readFileSync(join(here, 'fixtures', n), 'utf8');
const allowed = loadAllowedCommands();

test('RED fixture: every banned class is caught', () => {
  const v = checkText(fx('bad.html'), allowed);
  const rules = new Set(v.map((x) => x.rule));
  for (const r of ['licence-mit', 'rbac', 'enterprise-grade', 'certified', 'military-grade',
    'vanity-count', 'person-name', 'personal-email', 'fabricated-command']) {
    assert.ok(rules.has(r), `expected rule ${r} to fire; got ${[...rules].join(',')}`);
  }
});

test('RED fixture: fabricated commands are reported verbatim', () => {
  const cmds = checkText(fx('bad.html'), allowed).filter((x) => x.rule === 'fabricated-command').map((x) => x.match);
  assert.ok(cmds.includes('pip install ros2-mcp'));
  assert.ok(cmds.includes('docker run -it wisevision/ros2_mcp:latest'));
  assert.ok(cmds.includes('uvx ros2-mcp --serve'));
});

test('GREEN fixture: real README commands, MPL-2.0 and hello@ pass', () => {
  assert.deepEqual(checkText(fx('good.html'), allowed), []);
});

test('script and style bodies are not treated as visible copy', () => {
  const html = '<style>.x{content:"MIT"}</style><script>const s="$ pip install x";</script><p>ok</p>';
  assert.deepEqual(checkText(html, allowed), []);
});

test('visibleLines splits at block tags but keeps an inline prompt span joined to its command', () => {
  assert.deepEqual(visibleLines('<div><div><span class="p">$ </span>docker build -t wisevision/ros2_mcp .</div><div>h<b>i</b></div></div>'),
    ['$ docker build -t wisevision/ros2_mcp .', 'hi']);
});

test('a fabricated command hidden behind a styled prompt span is still caught', () => {
  const v = checkText('<div class="term"><div><span class="p">$ </span>ros2mcp --install-everything</div></div>', allowed);
  assert.equal(v.length, 1);
  assert.equal(v[0].rule, 'fabricated-command');
});

test('allowed command list is non-empty and contains the real docker build line', () => {
  assert.ok(allowed.has('docker build -t wisevision/ros2_mcp .'));
});

test('every shipped composition is clean', () => {
  const { files, violations } = scanCompositions();
  assert.ok(files.length >= 4, `expected >=4 composition files, got ${files.length}`);
  assert.deepEqual(violations, []);
});
