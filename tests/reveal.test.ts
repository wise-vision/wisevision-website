import { describe, it, expect } from 'vitest';
import { inViewport, revealInViewport } from '../src/lib/reveal';

type Fake = { top: number; bottom: number; classes: Set<string>; style: { transition: string } };
const fake = (top: number, bottom: number): Fake => ({ top, bottom, classes: new Set(), style: { transition: '' } });
const asEl = (f: Fake) => ({
  getBoundingClientRect: () => ({ top: f.top, bottom: f.bottom }),
  classList: { add: (c: string) => f.classes.add(c), contains: (c: string) => f.classes.has(c) },
  style: f.style,
});

describe('inViewport', () => {
  it('is true for any overlap with [0, height)', () => {
    expect(inViewport({ top: 0, bottom: 10 }, 800)).toBe(true);
    expect(inViewport({ top: 790, bottom: 900 }, 800)).toBe(true);
    expect(inViewport({ top: -50, bottom: 1 }, 800)).toBe(true);
  });
  it('is false fully below or above the fold', () => {
    expect(inViewport({ top: 800, bottom: 900 }, 800)).toBe(false);
    expect(inViewport({ top: -100, bottom: 0 }, 800)).toBe(false);
  });
});

describe('revealInViewport', () => {
  it('marks on-screen targets visible without a transition and returns them; leaves the rest for the observer', () => {
    const a = fake(100, 200); // first viewport
    const b = fake(1200, 1300); // below the fold
    const c = fake(790, 820); // straddles the fold (the old 10% rootMargin trap)
    const shown = revealInViewport([a, b, c].map(asEl), 800);
    expect(shown).toHaveLength(2);
    expect(a.classes.has('is-visible')).toBe(true);
    expect(a.style.transition).toBe('none');
    expect(c.classes.has('is-visible')).toBe(true);
    expect(b.classes.has('is-visible')).toBe(false);
    expect(b.style.transition).toBe('');
  });
  it('skips targets that are already visible', () => {
    const a = fake(0, 10);
    a.classes.add('is-visible');
    expect(revealInViewport([asEl(a)], 800)).toHaveLength(0);
    expect(a.style.transition).toBe('');
  });
});
