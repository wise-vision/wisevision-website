// Reveal helpers shared by the inline first-viewport script (Base.astro) and motion.ts.
// Rule (launch audit F1): nothing that is on screen at load may wait for the IntersectionObserver or a
// transition, or the heading becomes an LCP-gated element. Anything already in the viewport is shown at once.

export interface RectLike { top: number; bottom: number }
export interface RevealTarget {
  getBoundingClientRect(): RectLike;
  classList: { add(c: string): void; contains(c: string): boolean };
  style: { transition: string };
}

export function inViewport(r: RectLike, height: number): boolean {
  return r.top < height && r.bottom > 0;
}

/**
 * Marks every target that overlaps [0, height) as `.is-visible` with no transition, and returns them.
 * Self-contained on purpose: Base.astro inlines `revealInViewport.toString()` so it runs during parsing,
 * before the module bundle loads and before the first frame.
 */
export function revealInViewport<T extends RevealTarget>(targets: ArrayLike<T>, height: number): T[] {
  const shown: T[] = [];
  for (let i = 0; i < targets.length; i++) {
    const el = targets[i];
    if (el.classList.contains('is-visible')) continue;
    const r = el.getBoundingClientRect();
    if (r.top < height && r.bottom > 0) {
      el.style.transition = 'none';
      el.classList.add('is-visible');
      shown.push(el);
    }
  }
  return shown;
}
