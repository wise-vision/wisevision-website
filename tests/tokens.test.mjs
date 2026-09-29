import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { flatten, toCss, toJson, buildTokens } from '../scripts/build-tokens.mjs';

const src = JSON.parse(readFileSync(new URL('../src/styles/tokens.source.json', import.meta.url), 'utf8'));

describe('build-tokens', () => {
  it('flattens nested groups into kebab custom-property names', () => {
    expect(flatten({ color: { bg: { base: '#000' } }, space: { 4: '1rem' } })).toEqual({
      'color-bg-base': '#000',
      'space-4': '1rem',
    });
  });
  it('skips meta keys ($description, pairs)', () => {
    expect(flatten({ $description: 'x', pairs: [1], color: { a: '#fff' } })).toEqual({ 'color-a': '#fff' });
  });
  it('emits the locked palette into CSS', () => {
    const css = toCss(src);
    expect(css).toContain(':root {');
    expect(css).toContain('--color-bg-base: #07080B;');
    expect(css).toContain('--color-accent: #3CFFB4;');
    expect(css).toContain('--color-text: #F2F5F7;');
    expect(css).toContain('--motion-ease-reveal: cubic-bezier(.16,1,.3,1);');
    expect(css).toMatch(/prefers-reduced-motion/);
  });
  it('CSS and JSON carry identical values (single source of truth)', () => {
    const css = toCss(src);
    const json = JSON.parse(toJson(src));
    for (const [k, v] of Object.entries(json.flat)) expect(css).toContain(`--${k}: ${v};`);
  });
  it('buildTokens returns both artifacts', () => {
    const out = buildTokens(src);
    expect(Object.keys(out)).toEqual(['css', 'json']);
  });
});
