/**
 * wisevision.tech 3D hero: framework-agnostic entry.
 *
 *   const { destroy } = mountHero(el, { scrollProgress: () => lenisProgress });
 *
 * `el` must already contain the poster (<img>/<picture>, the LCP element) plus the HTML headline/CTA.
 * The capability gate resolves asynchronously (GPU probe in a worker); if it fails, nothing is loaded and the
 * poster stays.
 * Otherwise the three.js runtime is fetched as a separate chunk and a canvas fades in over the poster
 * only after its first frame has rendered, so the swap never flashes.
 */
import { shouldRunWebGLAsync, type CapabilityResult } from './capability';

export type { BeatState } from './beats';
export { beatState, BEATS } from './beats';
export { shouldRunWebGL, shouldRunWebGLAsync } from './capability';

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
  let inner: { destroy(): void; invalidate(): void } | null = null;
  let dead = false;
  const handle = {
    destroy() {
      dead = true;
      inner?.destroy();
      inner = null;
    },
    invalidate() {
      inner?.invalidate();
    },
    // 'poster' until the gate passes; the poster is what is on screen until then anyway
    mode: 'poster' as HeroHandle['mode'],
  };
  container.dataset.hero = 'probing';
  // the GPU probe runs in a worker where possible (see shouldRunWebGLAsync): no main-thread long task
  shouldRunWebGLAsync(undefined, { reducedMotion: opts.reducedMotion })
    .then((cap) => {
      if (dead) return;
      if (!cap.ok) {
        container.dataset.hero = `poster:${cap.reason}`;
        opts.onFallback?.(cap);
        return;
      }
      handle.mode = 'webgl';
      container.dataset.hero = 'loading';
      return import('./runtime').then((m) => {
        if (dead) return;
        return m.startHero(container, opts, () => dead).then((h) => {
          if (dead) h.destroy();
          else inner = h;
        });
      });
    })
    .catch(() => {
      // gate threw, chunk failed to load or WebGL init threw: keep the poster, never surface an error
      container.dataset.hero = 'poster:runtime-error';
      opts.onFallback?.({ ok: false, reason: 'no-webgl2' });
    });
  return handle;
}
