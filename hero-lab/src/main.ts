import './hero-copy.css';
import Lenis from 'lenis';
import { mountHero } from '@hero/index';

const q = new URLSearchParams(location.search);
const fixed = q.has('p') ? Number(q.get('p')) : null;
const hero = document.getElementById('hero')!;
const track = document.getElementById('track')!;

if (q.get('copy') === '0') document.querySelectorAll('.hero-copy, .hero-scrim').forEach((n) => n.remove());
if (q.get('poster') === '0') document.querySelector('[data-hero-poster]')?.remove();

const lenis = fixed === null && q.get('lenis') !== '0' ? new Lenis({ autoRaf: true }) : null;

function progress(): number {
  if (fixed !== null) return fixed;
  const range = track.offsetHeight - window.innerHeight;
  return range > 0 ? Math.min(1, Math.max(0, window.scrollY / range)) : 0;
}

const handle = mountHero(hero, {
  scrollProgress: progress,
  layout: (q.get('layout') as 'desktop' | 'mobile' | null) ?? 'auto',
  label: q.get('label') === 'base_link' ? 'base_link' : 'none',
  maxDpr: q.has('dpr') ? Number(q.get('dpr')) : undefined,
  parallax: q.get('parallax') !== '0',
  onReady: (i) => ((window as any).__heroReady = i),
  onFallback: (r) => ((window as any).__heroFallback = r),
});
lenis?.on('scroll', () => handle.invalidate());
(window as any).__heroHandle = handle;
