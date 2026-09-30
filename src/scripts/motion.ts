// Global motion bootstrap: Lenis is the ONLY scroll loop; reveal = IntersectionObserver + CSS.
// Everything is skipped under prefers-reduced-motion.
// First-viewport rule (launch audit F1): Base.astro already revealed everything on screen during parsing
// (inline revealInViewport, before the first frame); this re-runs it (idempotent) and only animates below the fold.
import Lenis from 'lenis';
import { revealInViewport } from '../lib/reveal';

const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

declare global {
  interface Window { __lenis?: Lenis }
}

if (!reduce && !window.__lenis) {
  const lenis = new Lenis({ autoRaf: true, anchors: true });
  window.__lenis = lenis;
}

const targets = document.querySelectorAll<HTMLElement>('[data-reveal]');
if (reduce || !('IntersectionObserver' in window)) {
  targets.forEach((el) => el.classList.add('is-visible'));
} else {
  revealInViewport(targets, window.innerHeight);
  const io = new IntersectionObserver(
    (entries) => {
      for (const e of entries) {
        if (e.isIntersecting) {
          e.target.classList.add('is-visible');
          io.unobserve(e.target);
        }
      }
    },
    { rootMargin: '0px 0px -10% 0px', threshold: 0.1 },
  );
  targets.forEach((el) => {
    if (!el.classList.contains('is-visible')) io.observe(el);
  });
  // Safety net for programmatic jumps (anchors, restored scroll position): reveal anything on screen after 1.2s.
  window.setTimeout(() => {
    for (const el of revealInViewport(targets, window.innerHeight)) io.unobserve(el);
  }, 1200);
}
