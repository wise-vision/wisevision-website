// Same contract as scripts/tests/link-audit.test.mjs (node:test), run under vitest for coverage.
import { describe, it, expect } from 'vitest';
import { audit, extractRefs, resolveRef, RUNTIME_PREFIXES } from '../scripts/link-audit.mjs';

const FIX = 'scripts/tests/fixtures/links';

describe('link-audit', () => {
  it('extracts href/src/srcset/poster/action, ignores inline scripts and comments', () => {
    const refs = extractRefs(`<script>var a='<a href="/x/">'</script><!-- <a href="/y/"> --><a href='/z/?a=1&amp;b=2'>z</a><img srcset="/a.png 1x, /b.png 2x">`);
    expect(refs.map((r) => r.url)).toEqual(['/z/?a=1&b=2', '/a.png', '/b.png']);
  });
  it('classifies urls', () => {
    expect(resolveRef('tel:+48', '/').kind).toBe('skip');
    expect(resolveRef('https://wisevision.tech/ros2-mcp/', '/')).toMatchObject({ kind: 'self', path: '/ros2-mcp/' });
    expect(resolveRef('https://github.com/x', '/').kind).toBe('external');
    expect(resolveRef('b.png', '/a/')).toEqual({ kind: 'internal', path: '/a/b.png' });
  });
  it('green fixture has no broken links; runtime prefixes are allowed', () => {
    expect(audit(`${FIX}/good/dist`).broken).toEqual([]);
    expect(RUNTIME_PREFIXES).toContain('/api/');
  });
  it('RED fixture reports the missing page, image and redirect target', () => {
    expect(audit(`${FIX}/bad/dist`).broken.map((b) => b.url).sort()).toEqual(['/gone/', '/img/nope.png', '/missing/']);
  });
});
