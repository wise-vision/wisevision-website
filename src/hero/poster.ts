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
  /**
   * Text boxes of the HTML headline, lede and CTAs over this poster, in poster CSS px (width/2 × height/2), padded 8 px.
   * Measured on the built site AND the hero-lab preview by hero-lab/scripts/copy-zone.mjs; the composition gate keeps
   * every unit and its always-on TF triad out of them. Re-measure when Hero.astro's copy or type scale changes.
   */
  copyZone: [number, number, number, number][];
}

export const POSTERS: Record<HeroLayout, PosterSpec> = {
  // VP at x=30%, y=41% from the top: under the headline's first line in the left column
  desktop: { name: 'hero-desktop', width: 2880, height: 1600, vp: [-0.4, 0.18],
    copyZone: [
      [119, 151, 397, 89],
      [119, 207, 346, 89],
      [119, 293, 335, 36],
      [119, 317, 96, 36],
      [119, 366, 155, 59],
      [125, 217, 172, 32],
      [125, 240, 529, 114],
      [125, 315, 481, 114],
      [125, 429, 316, 39],
      [125, 459, 186, 39],
      [125, 517, 178, 67],
      [270, 366, 192, 59],
      [302, 517, 177, 67],
    ],
  },
  // 390×780 CSS: the site hero on a 390×844 phone (viewport minus the 64 px header)
  mobile: { name: 'hero-mobile', width: 780, height: 1560, vp: [0, -0.27],
    copyZone: [
      [12, 41, 179, 33],
      [12, 71, 285, 67],
      [12, 110, 257, 67],
      [12, 174, 347, 36],
      [12, 201, 98, 36],
      [12, 250, 185, 67],
      [27, 72, 264, 63],
      [27, 108, 229, 63],
      [27, 167, 260, 34],
      [27, 190, 154, 34],
      [27, 231, 160, 60],
    ],
  },
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
