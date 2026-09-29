import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { hexToRgb, relativeLuminance, contrastRatio, checkPairs, runCli } from '../scripts/contrast-check.mjs';

const load = (p) => JSON.parse(readFileSync(new URL(p, import.meta.url), 'utf8'));

describe('colour math', () => {
  it('parses 3/6/8-digit hex', () => {
    expect(hexToRgb('#fff')).toEqual([255, 255, 255]);
    expect(hexToRgb('#07080B')).toEqual([7, 8, 11]);
    expect(hexToRgb('#3CFFB4ff')).toEqual([60, 255, 180]);
    expect(() => hexToRgb('red')).toThrow();
  });
  it('black on white is 21:1', () => {
    expect(relativeLuminance('#000')).toBe(0);
    expect(contrastRatio('#000000', '#ffffff')).toBeCloseTo(21, 5);
    expect(contrastRatio('#ffffff', '#000000')).toBeCloseTo(21, 5);
  });
});

describe('checkPairs', () => {
  it('passes every pair declared in the real tokens.source.json', () => {
    const res = checkPairs(load('../src/styles/tokens.source.json'));
    expect(res.length).toBeGreaterThan(5);
    expect(res.filter((r) => !r.pass)).toEqual([]);
  });
  it('RED fixture: a low-contrast pair fails', () => {
    const res = checkPairs(load('./fixtures/tokens.failing.json'));
    const bad = res.filter((r) => !r.pass);
    expect(bad.length).toBe(1);
    expect(bad[0].fg).toBe('text.faint');
    expect(bad[0].ratio).toBeLessThan(4.5);
  });
  it('large text uses the 3:1 threshold', () => {
    const t = { color: { a: '#777777', b: '#000000' }, pairs: [{ fg: 'a', bg: 'b', size: 'large' }] };
    const [r] = checkPairs(t);
    expect(r.min).toBe(3);
    expect(r.pass).toBe(true);
  });
  it('throws on an unknown token reference', () => {
    expect(() => checkPairs({ color: {}, pairs: [{ fg: 'nope', bg: 'x' }] })).toThrow(/unknown colour token/);
  });
});

describe('runCli', () => {
  it('returns 0 on real tokens and 1 on the RED fixture', () => {
    const log = () => {};
    expect(runCli(['src/styles/tokens.source.json'], log)).toBe(0);
    expect(runCli(['tests/fixtures/tokens.failing.json'], log)).toBe(1);
  });
});
