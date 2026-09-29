#!/usr/bin/env node
// WCAG 2.x contrast gate over the `pairs` declared in tokens.source.json.
// Usage: node scripts/contrast-check.mjs [path/to/tokens.json]   (exit 1 on any failing pair)
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

export const AA_NORMAL = 4.5;
export const AA_LARGE = 3;

export function hexToRgb(hex) {
  const m = /^#([0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(String(hex).trim());
  if (!m) throw new Error(`not a hex colour: ${hex}`);
  let h = m[1];
  if (h.length === 3) h = [...h].map((c) => c + c).join('');
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
}

export function relativeLuminance(hex) {
  const [r, g, b] = hexToRgb(hex).map((v) => {
    const c = v / 255;
    return c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

export function contrastRatio(a, b) {
  const [l1, l2] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

function resolveColour(colors, ref) {
  let node = colors;
  for (const part of ref.split('.')) node = node?.[part];
  if (node && typeof node === 'object') node = node.DEFAULT;
  if (typeof node !== 'string') throw new Error(`unknown colour token: ${ref}`);
  return node;
}

export function checkPairs(tokens) {
  const colors = tokens.color ?? {};
  return (tokens.pairs ?? []).map(({ fg, bg, size = 'normal' }) => {
    const fgHex = resolveColour(colors, fg);
    const bgHex = resolveColour(colors, bg);
    const ratio = contrastRatio(fgHex, bgHex);
    const min = size === 'large' ? AA_LARGE : AA_NORMAL;
    return { fg, bg, fgHex, bgHex, size, ratio, min, pass: ratio >= min };
  });
}

export function runCli(argv = [], log = console.log) {
  const file = resolve(argv[0] ?? 'src/styles/tokens.source.json');
  const results = checkPairs(JSON.parse(readFileSync(file, 'utf8')));
  for (const r of results) {
    log(`${r.pass ? 'PASS' : 'FAIL'}  ${r.ratio.toFixed(2).padStart(5)}:1 (min ${r.min})  ${r.fg} ${r.fgHex} on ${r.bg} ${r.bgHex}${r.size === 'large' ? ' [large]' : ''}`);
  }
  const failed = results.filter((r) => !r.pass).length;
  log(`${results.length - failed}/${results.length} pairs pass WCAG AA`);
  return failed ? 1 : 0;
}

/* c8 ignore next 3 */
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  process.exit(runCli(process.argv.slice(2)));
}
