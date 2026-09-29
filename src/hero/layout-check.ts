/**
 * Pure screen-space composition check for the hero poster frame (no three.js).
 * The runtime projects each unit's bounding box, the base_link label, its leader line and the
 * poster signal arc into CSS pixels; this module says what collides. Used by the poster script and tests
 * to keep the parent's vision verdict ("arc, axes and label must not overlap any wireframe") enforceable.
 */

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}
export type Pt = [number, number];
export type UnitName = 'rover' | 'quadruped' | 'drone' | 'mast';

export interface CompositionReport {
  frame: { w: number; h: number };
  units: Record<UnitName, Rect>;
  label: Rect | null;
  /** leader polyline, starts at the rover's base_link origin */
  leader: Pt[] | null;
  /** poster signal arc polyline: rover lidar → one unit */
  arc: Pt[] | null;
  /** which unit the arc ends on (defaults to quadruped) */
  arcTarget?: UnitName;
  /** optional rasterised wire occupancy per unit (see rasterize); when present it replaces bbox tests */
  occupancy?: Record<UnitName, Set<number>>;
  cell?: number;
  /** projected bbox of the rover's base_link TF triad (all three axes) */
  baseLinkTriad?: Rect | null;
  /** projected bbox of each rover tyre; the base_link triad must clear every one (a frame "at a wheel" reads wrong to a ROS dev) */
  wheels?: Rect[];
  /** frame regions owned by the HTML headline + CTA: no unit (or its TF triad) may reach into them */
  reserved?: Rect[];
  /** projected bbox of each unit's always-on TF triad, checked against `reserved` */
  triads?: Partial<Record<UnitName, Rect>>;
}

/** Arc samples farther than `skip` px from its endpoint: the approach, which must not cut through the target's own wires. */
function approachCells(pts: Pt[], frame: { w: number; h: number }, cell: number, skip: number): Set<number> {
  const end = pts[pts.length - 1];
  const out = new Set<number>();
  const mx = Math.ceil(frame.w / cell), my = Math.ceil(frame.h / cell);
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1], b = pts[i];
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell / 2)));
    for (let k = 0; k <= n; k++) {
      const x = a[0] + ((b[0] - a[0]) * k) / n, y = a[1] + ((b[1] - a[1]) * k) / n;
      if (Math.hypot(x - end[0], y - end[1]) < skip) continue;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      if (cx >= 0 && cy >= 0 && cx < mx && cy < my) out.add(key(cx, cy));
    }
  }
  return out;
}
/** px around the arc endpoint where touching the target's wires is expected (the endpoint sits ON its frame origin) */
export const ARC_END_SKIP = 10;

const CELL = 6;
const key = (cx: number, cy: number) => cy * 4096 + cx;

/** Cells (size `cell` px) touched by a set of 2-D segments, clipped to the frame. */
export function rasterize(segs: [Pt, Pt][], frame: { w: number; h: number }, cell = CELL): Set<number> {
  const out = new Set<number>();
  const mx = Math.ceil(frame.w / cell), my = Math.ceil(frame.h / cell);
  for (const [a, b] of segs) {
    const n = Math.max(1, Math.ceil(Math.hypot(b[0] - a[0], b[1] - a[1]) / (cell / 2)));
    for (let i = 0; i <= n; i++) {
      const x = a[0] + ((b[0] - a[0]) * i) / n, y = a[1] + ((b[1] - a[1]) * i) / n;
      const cx = Math.floor(x / cell), cy = Math.floor(y / cell);
      if (cx >= 0 && cy >= 0 && cx < mx && cy < my) out.add(key(cx, cy));
    }
  }
  return out;
}

function rectCells(r: Rect, cell: number): Set<number> {
  const out = new Set<number>();
  for (let cy = Math.floor(r.y / cell); cy <= Math.floor((r.y + r.h) / cell); cy++)
    for (let cx = Math.floor(r.x / cell); cx <= Math.floor((r.x + r.w) / cell); cx++) out.add(key(cx, cy));
  return out;
}
const shared = (a: Set<number>, b: Set<number>) => {
  let n = 0;
  for (const k of a) if (b.has(k)) n++;
  return n;
};
const polySegs = (pts: Pt[]): [Pt, Pt][] => pts.slice(1).map((p, i) => [pts[i], p]);

export function rectOverlap(a: Rect, b: Rect): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

const inside = ([x, y]: Pt, r: Rect) => x > r.x && x < r.x + r.w && y > r.y && y < r.y + r.h;

function segsCross(p1: Pt, p2: Pt, p3: Pt, p4: Pt): boolean {
  const d = (a: Pt, b: Pt, c: Pt) => (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
  const d1 = d(p3, p4, p1), d2 = d(p3, p4, p2), d3 = d(p1, p2, p3), d4 = d(p1, p2, p4);
  return ((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) && ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0));
}

export function segmentHitsRect(a: Pt, b: Pt, r: Rect): boolean {
  if (inside(a, r) || inside(b, r)) return true;
  const c: Pt[] = [[r.x, r.y], [r.x + r.w, r.y], [r.x + r.w, r.y + r.h], [r.x, r.y + r.h]];
  for (let i = 0; i < 4; i++) if (segsCross(a, b, c[i], c[(i + 1) % 4])) return true;
  return false;
}

const polyHits = (pts: Pt[], r: Rect) => pts.some((p, i) => i > 0 && segmentHitsRect(pts[i - 1], p, r));

/** Returns human-readable issues; [] means the composition is clean. `margin` = min px a unit keeps from the frame edge. */
export function checkComposition(r: CompositionReport, margin = 4): string[] {
  const issues: string[] = [];
  const names = Object.keys(r.units) as UnitName[];
  if (r.baseLinkTriad && r.wheels)
    r.wheels.forEach((w, i) => {
      if (rectOverlap(r.baseLinkTriad!, w) > 0) issues.push(`base_link triad overlaps wheel ${i}`);
    });
  if (r.leader && r.wheels)
    r.wheels.forEach((w, i) => {
      if (polyHits(r.leader!, w)) issues.push(`leader crosses wheel ${i}`);
    });
  for (const z of r.reserved ?? []) {
    const zc = r.occupancy ? rectCells(z, r.cell ?? CELL) : null;
    for (const n of names) {
      const hit = zc && r.occupancy ? shared(zc, r.occupancy[n]) > 0 : rectOverlap(r.units[n], z) > 0;
      if (hit) issues.push(`${n} intrudes on the copy zone`);
    }
    for (const [n, t] of Object.entries(r.triads ?? {})) if (t && rectOverlap(t, z) > 0) issues.push(`${n} triad intrudes on the copy zone`);
  }
  for (const n of names) {
    const u = r.units[n];
    if (u.x < margin || u.y < margin || u.x + u.w > r.frame.w - margin || u.y + u.h > r.frame.h - margin)
      issues.push(`${n} is cropped by the frame`);
  }
  if (r.occupancy) {
    const occ = r.occupancy, cell = r.cell ?? CELL;
    for (let i = 0; i < names.length; i++)
      for (let j = i + 1; j < names.length; j++)
        // a few shared cells = two wires crossing in depth; flag real tangles (>8% of the smaller unit)
        if (shared(occ[names[i]], occ[names[j]]) > 0.08 * Math.min(occ[names[i]].size, occ[names[j]].size))
          issues.push(`${names[j]} overlaps ${names[i]}`);
    if (r.label) {
      const lc = rectCells(r.label, cell);
      for (const n of names) if (shared(lc, occ[n]) > 0) issues.push(`label overlaps ${n}`);
    }
    // the leader starts at base_link (inside the rover), so the rover is exempt
    if (r.leader) {
      const lc = rasterize(polySegs(r.leader), r.frame, cell);
      for (const n of names) if (n !== 'rover' && shared(lc, occ[n]) > 0) issues.push(`leader crosses ${n}`);
    }
    if (r.arc) {
      const target = r.arcTarget ?? 'quadruped';
      const ac = rasterize(polySegs(r.arc), r.frame, cell);
      for (const n of names) if (n !== 'rover' && n !== target && shared(ac, occ[n]) > 0) issues.push(`arc crosses ${n}`);
      if (r.arc.length > 1 && shared(approachCells(r.arc, r.frame, cell, ARC_END_SKIP), occ[target]) > 0)
        issues.push(`arc passes through ${target} before its endpoint`);
    }
    return issues;
  }
  for (let i = 0; i < names.length; i++)
    for (let j = i + 1; j < names.length; j++) {
      const a = r.units[names[i]], b = r.units[names[j]];
      // units may touch in depth; flag only a real overlap (>12% of the smaller box)
      if (rectOverlap(a, b) > 0.12 * Math.min(a.w * a.h, b.w * b.h)) issues.push(`${names[j]} overlaps ${names[i]}`);
    }
  if (r.label) for (const n of names) if (rectOverlap(r.label, r.units[n]) > 0) issues.push(`label overlaps ${n}`);
  if (r.leader) for (const n of names) if (n !== 'rover' && polyHits(r.leader, r.units[n])) issues.push(`leader crosses ${n}`);
  if (r.arc) {
    const target = r.arcTarget ?? 'quadruped';
    for (const n of names) if (n !== 'rover' && n !== target && polyHits(r.arc, r.units[n])) issues.push(`arc crosses ${n}`);
  }
  return issues;
}
