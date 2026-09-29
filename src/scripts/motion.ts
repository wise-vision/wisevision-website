// Global motion bootstrap: Lenis is the ONLY scroll loop; reveal = IntersectionObserver + CSS.
// Everything is skipped under prefers-reduced-motion.
import Lenis from 'lenis';

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
  targets.forEach((el) => io.observe(el));
}
