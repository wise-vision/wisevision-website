// node --test media/test/  — zero-dep tests for media/claims-check.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { checkText, visibleLines, loadAllowedCommands, scanCompositions, checkVideos, mp4Duration } from '../claims-check.mjs';

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

// ---- black-video guard: a <video> that is missing, tiny, or shorter than its clip renders as a black box ----

/** Minimal ISO-BMFF: ftyp + moov/mvhd(v0, timescale, duration) + padding, so tests need no ffmpeg. */
function fakeMp4(seconds, pad = 20000) {
  const ts = 1000;
  const mvhd = Buffer.alloc(8 + 100);
  mvhd.writeUInt32BE(mvhd.length, 0); mvhd.write('mvhd', 4);
  mvhd.writeUInt32BE(ts, 8 + 12); mvhd.writeUInt32BE(Math.round(seconds * ts), 8 + 16);
  const moov = Buffer.concat([Buffer.alloc(8), mvhd]);
  moov.writeUInt32BE(moov.length, 0); moov.write('moov', 4);
  const ftyp = Buffer.from('000000106674797069736f6d00000200', 'hex');
  const free = Buffer.alloc(pad); free.writeUInt32BE(pad, 0); free.write('free', 4);
  return Buffer.concat([ftyp, moov, free]);
}
const vid = (src, dur, end) => `<div><video class="vid" src="${src}" data-start="18" data-duration="${dur}"${end ? ` data-wv-scene-end="${end}"` : ''} muted></video></div>`;

test('mp4Duration reads the mvhd box', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'a.mp4'), fakeMp4(6.5));
  assert.equal(mp4Duration(join(d, 'a.mp4')), 6.5);
  rmSync(d, { recursive: true });
});

test('RED: a missing <video src> is a violation', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  const v = checkVideos(vid('proof/nope.mp4', 5, 23), d);
  assert.equal(v.length, 1); assert.equal(v[0].rule, 'video-missing');
  rmSync(d, { recursive: true });
});

test('RED: a <video src> under 10 KB (e.g. an LFS pointer) is a violation', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'p.mp4'), 'version https://git-lfs.github.com/spec/v1\noid sha256:abc\nsize 123\n');
  const v = checkVideos(vid('p.mp4', 5, 23), d);
  assert.equal(v[0].rule, 'video-too-small');
  rmSync(d, { recursive: true });
});

test('RED: a clip shorter than its data-duration is a violation (the black-panel bug)', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'c.mp4'), fakeMp4(5));
  const v = checkVideos(vid('c.mp4', 6.5, 24.45), d);
  assert.equal(v.length, 1); assert.equal(v[0].rule, 'video-too-short');
  rmSync(d, { recursive: true });
});

test('GREEN: an existing, big-enough, long-enough clip passes', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'c.mp4'), fakeMp4(6.5));
  assert.deepEqual(checkVideos(vid('c.mp4', 6.5, 24.45), d), []);
  rmSync(d, { recursive: true });
});

test('RED: a clip whose data-start+data-duration ends before its scene leaves the screen is a violation', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'c.mp4'), fakeMp4(5));
  const html = '<video src="c.mp4" data-start="18" data-duration="5" data-wv-scene-end="24.45"></video>';
  assert.equal(checkVideos(html, d)[0].rule, 'video-ends-before-scene');
  rmSync(d, { recursive: true });
});

test('RED: a proof <video> without data-wv-scene-end is a violation (the guard needs the scene window)', () => {
  const d = mkdtempSync(join(tmpdir(), 'wvv-'));
  writeFileSync(join(d, 'c.mp4'), fakeMp4(6.5));
  assert.equal(checkVideos(vid('c.mp4', 6.5), d)[0].rule, 'video-scene-end-missing');
  rmSync(d, { recursive: true });
});

test('RED: a mistyped contact e-mail (hello@wision.tech) is caught', () => {
  const v = checkText('<div class="cta">hello@wision.tech</div>', allowed);
  assert.equal(v[0].rule, 'personal-email');
});

test('allowed commands include installation/README.md (Claude Desktop docker run args), not only the root README', () => {
  assert.ok([...allowed].some((l) => l.includes('wisevision/ros2_mcp:') && l.includes('humble')), 'installation/README.md docker args missing');
});

test('every shipped composition is clean', () => {
  const { files, violations } = scanCompositions();
  assert.ok(files.length >= 4, `expected >=4 composition files, got ${files.length}`);
  assert.deepEqual(violations, []);
});
