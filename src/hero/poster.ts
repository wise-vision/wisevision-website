/**
 * Poster contract shared by the site (<picture> in Hero.astro), the runtime camera rigs and the poster renderer.
 * Pure data, no three.js: Hero.astro imports this at build time without pulling the WebGL chunk.
 *
 * Alignment rule: the poster is shown with `object-fit: cover` + `object-position: objectPosition(layout)`, and
 * applyRig() narrows the FOV the same way cover crops, anchored on the same principal point, so the first
 * WebGL frame lands exactly on the poster pixels and the cross-fade never jumps.
 */
export type HeroLayout = 'desktop' | 'mobile';

export interface PosterSpec {
  name: string;
  /** rendered pixel size (CSS size × 2) */
  width: number;
  height: number;
  /** principal point (grid vanishing point) in NDC */
  vp: [number, number];
}

export const POSTERS: Record<HeroLayout, PosterSpec> = {
  // VP at x=30%, y=41% from the top: under the headline's first line in the left column
  desktop: { name: 'hero-desktop', width: 2880, height: 1600, vp: [-0.4, 0.18] },
  // 390×780 CSS: the site hero on a 390×844 phone (viewport minus the 64 px header)
  mobile: { name: 'hero-mobile', width: 780, height: 1560, vp: [0, -0.27] },
};

/** Single source of truth for "which composition": used by <picture media> and by the runtime (matchMedia). */
export const MOBILE_MEDIA = '(max-width: 767px), (max-aspect-ratio: 4/5)';

export function objectPosition(layout: HeroLayout): [number, number] {
  const [x, y] = POSTERS[layout].vp;
  return [Math.round(((1 + x) / 2) * 1e4) / 100, Math.round(((1 - y) / 2) * 1e4) / 100];
}

export function posterSrc(layout: HeroLayout, ext: 'avif' | 'webp' | 'png', base = '/hero/'): string {
  return `${base}${POSTERS[layout].name}.${ext}`;
}
