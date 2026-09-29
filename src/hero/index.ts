/**
 * wisevision.tech 3D hero: framework-agnostic entry.
 *
 *   const { destroy } = mountHero(el, { scrollProgress: () => lenisProgress });
 *
 * `el` must already contain the poster (<img>/<picture>, the LCP element) plus the HTML headline/CTA.
 * If the capability gate fails, nothing is loaded and the poster stays (no-op handle).
 * Otherwise the three.js runtime is fetched as a separate chunk and a canvas fades in over the poster
 * only after its first frame has rendered, so the swap never flashes.
 */
import { shouldRunWebGL, type CapabilityResult } from './capability';

export type { BeatState } from './beats';
export { beatState, BEATS } from './beats';
export { shouldRunWebGL } from './capability';
export { POSTERS, MOBILE_MEDIA, objectPosition, posterSrc, type HeroLayout } from './poster';

export interface HeroOptions {
  /** 0..1 scroll progress through the hero's pinned range (Lenis on the site). */
  scrollProgress?: () => number;
  /** Force the poster (e.g. site-level reduced-motion toggle). */
  reducedMotion?: boolean;
  /** 'auto' picks the mobile composition when MOBILE_MEDIA matches (same query as the poster <picture>). */
  layout?: 'auto' | 'desktop' | 'mobile';
  /** A/B: one legible `base_link` mono label on the lidar triad. */
  label?: 'none' | 'base_link';
  /** Pointer parallax (desktop, fine pointer only). Default true. */
  parallax?: boolean;
  /** Override the DPR cap (poster rendering only; default 1.5 desktop / 1.25 mobile). */
  maxDpr?: number;
  /** Called once the first WebGL frame is on screen. */
  onReady?: (info: { layout: 'desktop' | 'mobile'; points: number }) => void;
  /** Called when the gate keeps the poster. */
  onFallback?: (r: CapabilityResult) => void;
}

export interface HeroHandle {
  destroy(): void;
  /** Request a redraw (e.g. after an external scroll source changed). */
  invalidate(): void;
  readonly mode: 'webgl' | 'poster';
}

export function mountHero(container: HTMLElement, opts: HeroOptions = {}): HeroHandle {
  const cap = shouldRunWebGL(undefined, { reducedMotion: opts.reducedMotion });
  if (!cap.ok) {
    container.dataset.hero = `poster:${cap.reason}`;
    opts.onFallback?.(cap);
    return { destroy() {}, invalidate() {}, mode: 'poster' };
  }
  let inner: { destroy(): void; invalidate(): void } | null = null;
  let dead = false;
  container.dataset.hero = 'loading';
  import('./runtime')
    .then((m) => {
      if (dead) return;
      return m.startHero(container, opts, () => dead).then((h) => {
        if (dead) h.destroy();
        else inner = h;
      });
    })
    .catch(() => {
      // chunk failed to load or WebGL init threw: keep the poster, never surface an error
      container.dataset.hero = 'poster:runtime-error';
      opts.onFallback?.({ ok: false, reason: 'no-webgl2' });
    });
  return {
    destroy() {
      dead = true;
      inner?.destroy();
      inner = null;
    },
    invalidate() {
      inner?.invalidate();
    },
    mode: 'webgl',
  };
}
