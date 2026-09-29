import { describe, it, expect } from 'vitest';
import { POSTERS, MOBILE_MEDIA, objectPosition, posterSrc } from '../../../src/hero/poster';
import { RIGS } from '../../../src/hero/scene';

describe('poster ↔ camera alignment (no jump on the WebGL cross-fade)', () => {
  it('object-position puts the cover crop anchor on the principal point', () => {
    // desktop VP: 30% from the left, 41% from the top (under the headline's first line)
    expect(objectPosition('desktop')).toEqual([30, 41]);
    expect(objectPosition('mobile')[0]).toBe(50);
  });
  it('the runtime rigs use exactly the poster principal point and aspect', () => {
    for (const l of ['desktop', 'mobile'] as const) {
      expect(RIGS[l].vp).toEqual(POSTERS[l].vp);
      expect(RIGS[l].posterAspect).toBeCloseTo(POSTERS[l].width / POSTERS[l].height, 6);
    }
  });
  it('mobile poster is portrait at the site hero aspect; desktop is 2880×1600', () => {
    expect([POSTERS.desktop.width, POSTERS.desktop.height]).toEqual([2880, 1600]);
    expect(POSTERS.mobile.height).toBeGreaterThan(POSTERS.mobile.width);
  });
  it('one media query decides the layout for both <picture> and the runtime', () => {
    expect(MOBILE_MEDIA).toMatch(/max-width:\s*767px/);
    expect(MOBILE_MEDIA).toMatch(/aspect-ratio/);
  });
  it('builds public URLs', () => {
    expect(posterSrc('mobile', 'avif')).toBe('/hero/hero-mobile.avif');
  });
});
