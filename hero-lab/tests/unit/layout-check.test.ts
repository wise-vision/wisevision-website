import { describe, it, expect } from 'vitest';
import { rectOverlap, segmentHitsRect, checkComposition, rasterize, type Rect, type CompositionReport } from '../../../src/hero/layout-check';

const R = (x: number, y: number, w: number, h: number): Rect => ({ x, y, w, h });

describe('rectOverlap', () => {
  it('returns the intersection area, 0 when apart or only touching', () => {
    expect(rectOverlap(R(0, 0, 10, 10), R(5, 5, 10, 10))).toBe(25);
    expect(rectOverlap(R(0, 0, 10, 10), R(10, 0, 10, 10))).toBe(0);
    expect(rectOverlap(R(0, 0, 10, 10), R(20, 20, 1, 1))).toBe(0);
  });
});

describe('segmentHitsRect', () => {
  it('detects a segment crossing a rect, even with both ends outside', () => {
    expect(segmentHitsRect([-5, 5], [15, 5], R(0, 0, 10, 10))).toBe(true);
    expect(segmentHitsRect([-5, -5], [-1, 20], R(0, 0, 10, 10))).toBe(false);
    expect(segmentHitsRect([2, 2], [3, 3], R(0, 0, 10, 10))).toBe(true);
  });
});

function report(over: Partial<CompositionReport> = {}): CompositionReport {
  return {
    frame: { w: 390, h: 600 },
    units: {
      rover: R(60, 380, 180, 120),
      quadruped: R(260, 330, 80, 60),
      drone: R(250, 150, 70, 30),
      mast: R(170, 200, 20, 120),
    },
    label: R(40, 530, 80, 14),
    leader: [[150, 480], [60, 540], [120, 540]],
    arc: [[150, 380], [220, 300], [290, 350]],
    ...over,
  };
}

describe('checkComposition', () => {
  it('passes a clean composition', () => {
    expect(checkComposition(report())).toEqual([]);
  });
  it('flags a unit cropped by the frame', () => {
    const issues = checkComposition(report({ units: { ...report().units, rover: R(-40, 380, 180, 120) } }));
    expect(issues.some((i) => i.includes('rover') && i.includes('frame'))).toBe(true);
  });
  it('flags the label overlapping a unit', () => {
    const issues = checkComposition(report({ label: R(80, 400, 80, 14) }));
    expect(issues.some((i) => i.includes('label') && i.includes('rover'))).toBe(true);
  });
  it('flags the leader crossing a unit other than its origin (rover)', () => {
    const issues = checkComposition(report({ leader: [[150, 480], [300, 360], [330, 360]] }));
    expect(issues.some((i) => i.includes('leader') && i.includes('quadruped'))).toBe(true);
    expect(issues.some((i) => i.includes('leader') && i.includes('rover'))).toBe(false);
  });
  it('flags the arc crossing a unit that is not an endpoint', () => {
    const issues = checkComposition(report({ arc: [[150, 380], [180, 250], [290, 350]] }));
    expect(issues.some((i) => i.includes('arc') && i.includes('mast'))).toBe(true);
  });
  it('flags units overlapping each other', () => {
    const issues = checkComposition(report({ units: { ...report().units, quadruped: R(200, 400, 80, 60) } }));
    expect(issues.some((i) => i.includes('quadruped') && i.includes('rover'))).toBe(true);
  });
});

describe('occupancy (rasterised wires)', () => {
  const frame = { w: 390, h: 600 };
  // an L-shaped rover: its bbox covers the empty top-right corner where the mast stands
  const roverWires: [[number, number], [number, number]][] = [[[60, 300], [60, 500]], [[60, 500], [260, 500]]];
  const mastWires: [[number, number], [number, number]][] = [[[200, 300], [200, 420]]];
  const occ = { rover: rasterize(roverWires, frame), mast: rasterize(mastWires, frame), quadruped: rasterize([[[300, 380], [360, 380]]], frame), drone: rasterize([[[120, 150], [180, 150]]], frame) };
  const base = report({ units: { rover: R(60, 300, 200, 200), mast: R(200, 300, 2, 120), quadruped: R(300, 370, 60, 20), drone: R(120, 140, 60, 20) }, occupancy: occ, label: R(300, 540, 60, 14), leader: [[160, 500], [300, 550]], arc: [[60, 300], [180, 240], [330, 380]] });
  it('rasterize marks the cells a segment passes through', () => {
    const cells = rasterize([[[0, 0], [30, 0]]], frame, 6);
    expect(cells.size).toBeGreaterThanOrEqual(5);
  });
  it('uses wire occupancy, so a unit standing in another bbox empty corner is not an overlap', () => {
    expect(checkComposition(base)).toEqual([]);
  });
  it('still flags a label that lands on actual wires', () => {
    const issues = checkComposition({ ...base, label: R(100, 492, 60, 14) });
    expect(issues).toContain('label overlaps rover');
  });
  it('flags the arc crossing actual mast wires', () => {
    const issues = checkComposition({ ...base, arc: [[60, 300], [200, 360], [330, 380]] });
    expect(issues).toContain('arc crosses mast');
  });
});
