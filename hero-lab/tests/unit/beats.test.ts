import { describe, it, expect } from 'vitest';
import { beatState, UNIT_DISTANCES, BEATS } from '../../../src/hero/beats';

describe('beatState (progress → beat state, pure)', () => {
  it('exposes the 5 storyboard beats', () => {
    expect(BEATS).toEqual([0, 25, 50, 75, 100]);
  });

  it('beat 0 is the poster state: fleet visible, exactly one signal path, ring mid-sweep', () => {
    const s = beatState(0);
    expect(s.beat).toBe(0);
    expect(s.paths[0]).toBe(1);
    expect(s.paths.slice(1).every((v) => v === 0)).toBe(true);
    expect(s.paths.filter((v) => v > 0)).toHaveLength(1);
    expect(s.found[0]).toBe(1);
    expect(s.ringRadius).toBeGreaterThan(UNIT_DISTANCES[0]);
    expect(s.ringRadius).toBeLessThan(UNIT_DISTANCES[1]);
    expect(s.fleet).toBe(1); // no withheld reveal
    expect(s.wiseos).toBe(0);
    expect(s.collapse).toBe(0);
    expect(s.chip).toBe('none');
  });

  it('beat 25: ring expands and the chip asks the question', () => {
    const s = beatState(0.25);
    expect(s.beat).toBe(25);
    expect(s.ringRadius).toBeGreaterThan(beatState(0).ringRadius);
    expect(s.chip).toBe('question');
  });

  it('beat 50: the ring has found every unit (triad + line drawn)', () => {
    const s = beatState(0.5);
    expect(s.beat).toBe(50);
    expect(s.found.every((v) => v === 1)).toBe(true);
    expect(s.paths.every((v) => v === 1)).toBe(true);
    expect(s.chip).toBe('answer');
    expect(s.wiseos).toBe(0);
  });

  it('beat 75: dolly back and the WiseOS prism is fully revealed', () => {
    const s = beatState(0.75);
    expect(s.beat).toBe(75);
    expect(s.dolly).toBe(1);
    expect(s.wiseos).toBe(1);
    expect(s.collapse).toBe(0);
  });

  it('beat 100: everything resolves into the one horizontal accent line', () => {
    const s = beatState(1);
    expect(s.beat).toBe(100);
    expect(s.collapse).toBe(1);
    expect(s.accentLine).toBe(1);
    expect(s.fleet).toBe(0);
  });

  it('is monotonic in ring radius, dolly, wiseos and collapse', () => {
    let prev = beatState(0);
    for (let i = 1; i <= 200; i++) {
      const s = beatState(i / 200);
      expect(s.ringRadius).toBeGreaterThanOrEqual(prev.ringRadius);
      expect(s.dolly).toBeGreaterThanOrEqual(prev.dolly);
      expect(s.wiseos).toBeGreaterThanOrEqual(prev.wiseos);
      expect(s.collapse).toBeGreaterThanOrEqual(prev.collapse);
      prev = s;
    }
  });

  it('units are found in distance order by the sweep', () => {
    const s = beatState(0.3);
    expect(s.found[0]).toBeGreaterThanOrEqual(s.found[1]);
    expect(s.found[1]).toBeGreaterThanOrEqual(s.found[2]);
  });

  it('clamps out-of-range and non-finite input', () => {
    expect(beatState(-3)).toEqual(beatState(0));
    expect(beatState(7)).toEqual(beatState(1));
    expect(beatState(Number.NaN)).toEqual(beatState(0));
  });

  it('is pure (same input → deep-equal output, fresh objects)', () => {
    const a = beatState(0.42);
    const b = beatState(0.42);
    expect(a).toEqual(b);
    expect(a).not.toBe(b);
    a.found[0] = 99;
    expect(beatState(0.42).found[0]).not.toBe(99);
  });
});
